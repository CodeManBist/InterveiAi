import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import connectDB from "./db.ts";
import { createInterviewSchema } from "./schemas/interview.schem.ts";
import getUserRepositories from "./services/github.service.ts";
import upload from "./middleware/upload.ts";
import { parseResume } from "./services/gemini.service.ts";
import { createLiveToken } from "./services/gemini-live.service.ts";
import Interview from "./models/Interview.model.ts";
import { messageSchema } from "./schemas/messaage.schema.ts";
import { evaluateInterview } from "./services/evaluate-interview.service.ts";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173"
}));

connectDB();

app.get("/test", (req, res) => {
  res.json({
    message: "Test route working!",
  });
});

app.get("/live-token", async (req, res) => {
  try {
    const token = await createLiveToken();

    res.json({
      token
    });
    
  } catch(error) {
    console.error("Live Token Error:", error);

    res.status(500).json({
      message: "Failed to create live token"
    });
  }
});

app.post(
  "/pre-interview",
  upload.single("resume"),
  async (req, res) => {
    try {
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

      const { githubUsername } = result.data;

      console.log("Username:", githubUsername);
      console.log("Resume:", req.file.originalname);

      const github = await getUserRepositories(githubUsername);

      console.log("GitHub fetched");

      const resume = await parseResume(req.file);

      console.log("Resume parse");

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

      console.log("Interview created:", interview._id);

      return res.status(201).json({
        message: "Pre-interview data processed",
        interviewId: interview._id,
      });

    } catch (error) {
      console.error("PRE-INTERVIEW ERROR:", error);

      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

app.get("/interview/:interviewId", async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    return res.status(200).json({
      interviewId: interview._id,
      candidateProfile: interview.candidateProfile,
      githubRepositories: interview.githubRepositories,
      status: interview.status,
      messages: interview.messages,
      questionCount: interview.questionCount || 0,
    });

  } catch (error) {
    console.error("GET INTERVIEW ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch interview",
    });
  }
});

app.patch("/interview/:interviewId/start", async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId);

    if(!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if(interview.status === "completed") {
      return res.status(400).json({
        message: "Interview is alreay completed",
      });
    }

    interview.status = "in-progress";

    await interview.save();

    return res.status(200).json({
      message: "Interview started",
      status: interview.status,
    });
  } catch(error) {
    console.log("Start interview error: ", error);
    return res.status(500).json({
      message: "Failed to start interview",
    });
  }
});

app.post("/interview/:interviewId/messages", async (req, res) => {
  try {
    const { interviewId } = req.params;

    // Validate request
    const result = messageSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid message",
        errors: result.error.issues,
      });
    }

    const { role, type, content } = result.data;

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.status !== "in-progress") {
      return res.status(400).json({
        message: "Interview is not in progress",
      });
    }

    // Don't allow more than 7 questions
    if (
      role === "ai" &&
      type === "question" &&
      interview.questionCount >= 10
    ) {
      return res.status(400).json({
        message: "Maximum 10 interview questions reached",
      });
    }

    // Save message
    interview.messages.push({
      role,
      type,
      content,
      timestamp: new Date(),
    });

    // Increment only for actual AI questions
    if (role === "ai" && type === "question") {
      interview.questionCount += 1;
    }

    await interview.save();

    return res.status(201).json({
      message: "Interview message saved",
      questionCount: interview.questionCount,
    });

  } catch (error) {
    console.error("SAVE MESSAGE ERROR:", error);

    return res.status(500).json({
      message: "Failed to save message",
    });
  }
});

app.post("/interview/:interviewId/complete", async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        message: "Interview already completed",
      });
    }

    if (interview.questionCount < 10) {
      return res.status(400).json({
        message: "Interview has not reached 10 questions",
      });
    }

    console.log("Evaluating interview...");

    const evaluation = await evaluateInterview(interview);

    console.log("Evaluation:", evaluation);

    interview.score = evaluation;
    interview.status = "completed";

    await interview.save();

    return res.status(200).json({
      message: "Interview completed successfully",
      score: interview.score,
      status: interview.status,
    });

  } catch (error) {
    console.error("COMPLETE INTERVIEW ERROR:", error);

    return res.status(500).json({
      message: "Failed to complete interview",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});