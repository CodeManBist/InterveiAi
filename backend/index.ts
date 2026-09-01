import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import connectDB from "./db.ts";
import { createInterviewSchema } from "./schemas/interview.schem.ts";
import { messageSchema } from "./schemas/messaage.schema.ts";

import getUserRepositories from "./services/github.service.ts";
import upload from "./middleware/upload.ts";

import { parseResume } from "./services/gemini.service.ts";
import { createLiveToken } from "./services/gemini-live.service.ts";
import { evaluateInterview } from "./services/evaluate-interview.service.ts";

import Interview from "./models/Interview.model.ts";

dotenv.config();

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

connectDB();

app.get("/test", (req, res) => {
  res.json({
    message: "Test route working!",
  });
});

app.get("/live-token", async (req, res) => {
  try {
    const token = await createLiveToken();

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Live Token Error:", error);

    return res.status(500).json({
      message: "Failed to create live token",
    });
  }
});


// =====================================================
// CREATE INTERVIEW
// =====================================================

app.post(
  "/pre-interview",
  upload.single("resume"),
  async (req, res) => {

    try {

      // -----------------------------------------------
      // Validate request
      // -----------------------------------------------

      const result = createInterviewSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: result.error.issues,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Resume is required",
        });
      }


      // -----------------------------------------------
      // Candidate information
      // -----------------------------------------------

      const { githubUsername } = result.data;

      console.log("Username:", githubUsername);
      console.log("Resume:", req.file.originalname);


      // -----------------------------------------------
      // Fetch GitHub repositories
      // -----------------------------------------------

      const github = await getUserRepositories(
        githubUsername
      );

      console.log("GitHub fetched");


      // -----------------------------------------------
      // Parse resume
      // -----------------------------------------------

      const resume = await parseResume(req.file);

      console.log("Resume parsed");


      // -----------------------------------------------
      // Create interview
      // -----------------------------------------------

      const interview = await Interview.create({

        candidateProfile: {

          name: resume.name,

          summary: resume.summary,

          github: githubUsername,

          skills: resume.skills,

          technologies: resume.technologies,

          experience: resume.experience,

          projects: resume.projects,

          education: resume.education,

          certifications: resume.certifications,
        },


        githubRepositories: github,

        messages: [],

        status: "ready",

        questionCount: 0,
      });

      console.log(
        "Interview created:",
        interview._id
      );


      return res.status(201).json({

        message: "Pre-interview data processed",

        interviewId: interview._id,
      });


    } catch (error) {

      console.error(
        "PRE-INTERVIEW ERROR:",
        error
      );

      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);


// =====================================================
// GET INTERVIEW
// =====================================================

app.get(
  "/interview/:interviewId",
  async (req, res) => {

    try {

      const { interviewId } = req.params;


      const interview =
        await Interview.findById(interviewId);


      if (!interview) {

        return res.status(404).json({
          message: "Interview not found",
        });
      }


      return res.status(200).json({

        interviewId: interview._id,

        candidateProfile:
          interview.candidateProfile,

        githubRepositories:
          interview.githubRepositories,

        status:
          interview.status,

        messages:
          interview.messages,

        questionCount:
          interview.questionCount || 0,

        score:
          interview.score,
      });
    }
    catch (error) {
      console.error("GET INTERVIEW ERROR:", error);
      return res.status(500).json({
        message: "Failed to fetch interview",
      });
    }
  }
);


// =====================================================
// START INTERVIEW
// =====================================================

app.patch(
  "/interview/:interviewId/start",
  async (req, res) => {
    try {
      const { interviewId } = req.params;
      const interview = await Interview.findById(interviewId);

      if (!interview) {
        return res.status(404).json({
          message: "Interview not found",
        });
      }

      if (interview.status === "completed" || interview.status === "in-progress") {
        return res.status(400).json({
          message: "Interview has already started or completed",
          status: interview.status,
        });
      }

      interview.status = "in-progress";
      await interview.save();

      return res.status(200).json({
        message: "Interview started",
        status: interview.status,
      });
    } catch (error) {
      console.error("START INTERVIEW ERROR:", error);
      return res.status(500).json({
        message: "Failed to start interview",
      });
    }
  }
);


// =====================================================
// SAVE INTERVIEW MESSAGE
// =====================================================

app.post(
  "/interview/:interviewId/messages",
  async (req, res) => {

    try {

      const { interviewId } = req.params;

      const result = messageSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Invalid message",
          errors: result.error.issues,
        });
      }

      const { role, type, content } = result.data;

      const interview = await Interview.findOne({
        _id: interviewId,
        status: "in-progress",
      });

      if (!interview) {
        return res.status(409).json({
          message: "Interview is not in progress or does not exist",
        });
      }

      const message = {
        role,
        type,
        content,
        timestamp: new Date(),
      };

      const updatedInterview = await Interview.findOneAndUpdate(
        {
          _id: interviewId,
          status: "in-progress",
          ...(role === "ai" && type === "question"
            ? { questionCount: { $lt: 10 } }
            : {}),
        },
        {
          $push: { messages: message },
          ...(role === "ai" && type === "question"
            ? { $inc: { questionCount: 1 } }
            : {}),
        },
        { new: true }
      );

      if (!updatedInterview) {
        return res.status(409).json({
          message: "Interview changed before the message could be saved",
        });
      }

      const questionCount = updatedInterview.messages.filter(
        (savedMessage) =>
          savedMessage.role === "ai" &&
          savedMessage.type === "question"
      ).length;

      const isFinalAnswer =
        role === "user" &&
        type === "answer" &&
        questionCount === 10;

      if (isFinalAnswer) {
        const evaluation = await evaluateInterview(updatedInterview);

        await Interview.updateOne(
          { _id: interviewId, status: "in-progress" },
          {
            $set: {
              score: evaluation,
              status: "completed",
              questionCount,
            },
          }
        );
      }

      const savedInterview = await Interview.findById(interviewId);

      return res.status(201).json({
        message: "Interview message saved",
        questionCount: savedInterview?.questionCount ?? questionCount,
        status: savedInterview?.status,
        score: savedInterview?.score,
      });
    } catch (error) {
      console.error("SAVE MESSAGE ERROR:", error);
      return res.status(500).json({
        message: "Failed to save message",
      });
    }
  }
);





// =====================================================
// COMPLETE INTERVIEW MANUALLY
// =====================================================

app.post(
  "/interview/:interviewId/complete",
  async (req, res) => {

    try {

      const { interviewId } = req.params;


      const interview =
        await Interview.findById(interviewId);


      if (!interview) {

        return res.status(404).json({
          message: "Interview not found",
        });
      }


      // Already completed

      if (
        interview.status === "completed"
      ) {

        return res.status(400).json({

          message:
            "Interview already completed",
        });
      }


      const persistedQuestionCount = interview.messages.filter(
        (message) => message.role === "ai" && message.type === "question"
      ).length;

      if (interview.questionCount !== persistedQuestionCount) {
        interview.questionCount = persistedQuestionCount;
      }

      console.log(
        "Manually completing interview:",
        {
          interviewId,
          messageCount: interview.messages.length,
          questionCount: persistedQuestionCount,
        }
      );


      // -----------------------------------------------
      // Evaluate
      // -----------------------------------------------

      const evaluation =
        await evaluateInterview(interview);


      console.log(
        "Evaluation:",
        evaluation
      );


      // -----------------------------------------------
      // Save score
      // -----------------------------------------------

      interview.score = evaluation;

      interview.status = "completed";


      await interview.save();


      return res.status(200).json({

        message:
          "Interview completed successfully",

        score:
          interview.score,

        status:
          interview.status,
      });


    } catch (error) {

      console.error(
        "COMPLETE INTERVIEW ERROR:",
        error
      );

      return res.status(500).json({

        message:
          "Failed to complete interview",
      });
    }
  }
);


// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 3000;


app.listen(PORT, () => {

  console.log(
    `server running on http://localhost:${PORT}`
  );
});