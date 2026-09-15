import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { clerkMiddleware, getAuth } from '@clerk/express'
import { verifyWebhook } from "@clerk/express/webhooks";

import connectDB from "./db.ts";
import { createInterviewSchema } from "./schemas/interview.schem.ts";
import { messageSchema } from "./schemas/messaage.schema.ts";

import getUserRepositories from "./services/github.service.ts";
import upload from "./middleware/upload.ts";

import { parseResume } from "./services/gemini.service.ts";
import { createLiveToken } from "./services/gemini-live.service.ts";
import { evaluateInterview } from "./services/evaluate-interview.service.ts";

import Interview from "./models/Interview.model.ts";
import User from "./models/User.model.ts";

dotenv.config();

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(clerkMiddleware())

app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" })
);

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

connectDB();

/**
 * Rejects requests that do not have an authenticated Clerk user.
 *
 * Successful requests receive the Clerk user ID in `res.locals.clerkUserId`
 * before control passes to the next handler.
 */
const requireAuth = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated || !userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  res.locals.clerkUserId = userId;

  next();
};

/**
 * Finds the local user associated with the request's Clerk identity.
 *
 * @returns The matching user, or `null` when the request has no Clerk user ID
 * or that identity has not been synchronized locally.
 */
const getCurrentUser = async (req: express.Request) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return null;
  }

  return await User.findOne({
    clerkUserId: userId,
  });
};

app.post("/api/webhooks/clerk", async (req, res) => {
  try {
    const evt = await verifyWebhook(req);

    console.log("Clerk webhook received:", evt.type);

    // =====================================================
    // USER CREATED
    // =====================================================

    if (evt.type === "user.created") {
      const {
        id,
        username,
        first_name,
        last_name,
        image_url,
        email_addresses,
        primary_email_address_id,
      } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );

      if (!primaryEmail) {
        return res.status(400).json({
          message: "Primary email not found",
        });
      }

      await User.create({
        clerkUserId: id,
        username: username || primaryEmail.email_address,
        email: primaryEmail.email_address,

        ...(first_name ? { firstName: first_name } : {}),
        ...(last_name ? { lastName: last_name } : {}),
        ...(image_url ? { profileImage: image_url } : {}),
      });

      console.log("User created in MongoDB:", id);
    }

    // =====================================================
    // USER UPDATED
    // =====================================================

    if (evt.type === "user.updated") {
      const {
        id,
        username,
        first_name,
        last_name,
        image_url,
        email_addresses,
        primary_email_address_id,
      } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );

      await User.findOneAndUpdate(
        { clerkUserId: id },
        {
          ...(username ? { username } : {}),
          ...(primaryEmail?.email_address
            ? { email: primaryEmail.email_address }
            : {}),
          ...(first_name ? { firstName: first_name } : {}),
          ...(last_name ? { lastName: last_name } : {}),
          ...(image_url ? { profileImage: image_url } : {}),
        },
        {
          new: true,
        }
      );

      console.log("User updated in MongoDB:", id);
    }

    // =====================================================
    // USER DELETED
    // =====================================================

    if (evt.type === "user.deleted") {
      const clerkUserId = evt.data.id;

      if (!clerkUserId) {
        return res.status(400).json({
          message: "Clerk user ID is missing",
        });
      }

      await User.findOneAndDelete({
        clerkUserId: clerkUserId,
      });

      console.log("User deleted from MongoDB:", clerkUserId);
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Clerk webhook error:", error);

    return res.status(400).json({
      message: "Webhook verification failed",
    });
  }
});

app.get("/test", (req, res) => {
  res.json({
    message: "Test route working!",
  });
});

app.get("/live-token", requireAuth, async (req, res) => {
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
  "/pre-interview", requireAuth,
  upload.single("resume"),
  async (req, res) => {

    try {

      const user = await getCurrentUser(req);

      if(!user) {
        return res.status(401).json({
          message: "User not found",
        });
      }

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
        userId: user._id,
      
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
  requireAuth,
  async (req, res) => {
    try {
      const { interviewId } = req.params;

      // Get the currently authenticated MongoDB user
      const user = await getCurrentUser(req);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // Only allow the user to access their own interview
      const interview = await Interview.findOne({
        _id: interviewId,
        userId: user._id,
      });

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
    } catch (error) {
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
  requireAuth,
  async (req, res) => {
    try {
      const { interviewId } = req.params;

      // -----------------------------------------------
      // Get currently authenticated MongoDB user
      // -----------------------------------------------

      const user = await getCurrentUser(req);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // -----------------------------------------------
      // Find interview belonging to this user
      // -----------------------------------------------

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: user._id,
      });

      if (!interview) {
        return res.status(404).json({
          message: "Interview not found",
        });
      }

      // -----------------------------------------------
      // Check interview status
      // -----------------------------------------------

      if (
        interview.status === "completed" ||
        interview.status === "in-progress"
      ) {
        return res.status(400).json({
          message: "Interview has already started or completed",
          status: interview.status,
        });
      }

      // -----------------------------------------------
      // Start interview
      // -----------------------------------------------

      interview.status = "in-progress";

      await interview.save();

      // -----------------------------------------------
      // Response
      // -----------------------------------------------

      return res.status(200).json({
        message: "Interview started",
        status: interview.status,
      });

    } catch (error) {
      console.error(
        "START INTERVIEW ERROR:",
        error
      );

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
  requireAuth,
  async (req, res) => {
    try {
      const { interviewId } = req.params;

      // -----------------------------------------------
      // Get currently authenticated MongoDB user
      // -----------------------------------------------

      const user = await getCurrentUser(req);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // -----------------------------------------------
      // Validate message
      // -----------------------------------------------

      const result = messageSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Invalid message",
          errors: result.error.issues,
        });
      }

      const { role, type, content } = result.data;

      // -----------------------------------------------
      // Find user's interview
      // -----------------------------------------------

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: user._id,
        status: "in-progress",
      });

      if (!interview) {
        return res.status(409).json({
          message: "Interview is not in progress or does not exist",
        });
      }

      // -----------------------------------------------
      // Create message
      // -----------------------------------------------

      const message = {
        role,
        type,
        content,
        timestamp: new Date(),
      };

      // -----------------------------------------------
      // Save message
      // -----------------------------------------------

      const updatedInterview = await Interview.findOneAndUpdate(
        {
          _id: interviewId,
          userId: user._id,
          status: "in-progress",

          ...(role === "ai" && type === "question"
            ? { questionCount: { $lt: 10 } }
            : {}),
        },
        {
          $push: {
            messages: message,
          },

          ...(role === "ai" && type === "question"
            ? {
                $inc: {
                  questionCount: 1,
                },
              }
            : {}),
        },
        {
          new: true,
        }
      );

      if (!updatedInterview) {
        return res.status(409).json({
          message:
            "Interview changed before the message could be saved",
        });
      }

      // -----------------------------------------------
      // Calculate question count
      // -----------------------------------------------

      const questionCount = updatedInterview.messages.filter(
        (savedMessage) =>
          savedMessage.role === "ai" &&
          savedMessage.type === "question"
      ).length;

      // -----------------------------------------------
      // Check final answer
      // -----------------------------------------------

      const isFinalAnswer =
        role === "user" &&
        type === "answer" &&
        questionCount === 10;

      // -----------------------------------------------
      // Automatically complete after final answer
      // -----------------------------------------------

      if (isFinalAnswer) {
        const evaluation =
          await evaluateInterview(updatedInterview);

        await Interview.updateOne(
          {
            _id: interviewId,
            userId: user._id,
            status: "in-progress",
          },
          {
            $set: {
              score: evaluation,
              status: "completed",
              questionCount,
            },
          }
        );
      }

      // -----------------------------------------------
      // Get latest interview
      // -----------------------------------------------

      const savedInterview =
        await Interview.findOne({
          _id: interviewId,
          userId: user._id,
        });

      // -----------------------------------------------
      // Response
      // -----------------------------------------------

      return res.status(201).json({
        message: "Interview message saved",
        questionCount:
          savedInterview?.questionCount ?? questionCount,
        status: savedInterview?.status,
        score: savedInterview?.score,
      });

    } catch (error) {
      console.error(
        "SAVE MESSAGE ERROR:",
        error
      );

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
  requireAuth,
  async (req, res) => {
    try {
      const { interviewId } = req.params;

      // -----------------------------------------------
      // Get currently authenticated MongoDB user
      // -----------------------------------------------

      const user = await getCurrentUser(req);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // -----------------------------------------------
      // Find interview belonging to this user
      // -----------------------------------------------

      const interview = await Interview.findOne({
        _id: interviewId,
        userId: user._id,
      });

      if (!interview) {
        return res.status(404).json({
          message: "Interview not found",
        });
      }

      // -----------------------------------------------
      // Already completed
      // -----------------------------------------------

      if (interview.status === "completed") {
        return res.status(400).json({
          message: "Interview already completed",
        });
      }

      // -----------------------------------------------
      // Calculate persisted question count
      // -----------------------------------------------

      const persistedQuestionCount =
        interview.messages.filter(
          (message) =>
            message.role === "ai" &&
            message.type === "question"
        ).length;

      if (
        interview.questionCount !==
        persistedQuestionCount
      ) {
        interview.questionCount =
          persistedQuestionCount;
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
      // Evaluate interview
      // -----------------------------------------------

      const evaluation =
        await evaluateInterview(interview);

      console.log(
        "Evaluation:",
        evaluation
      );

      // -----------------------------------------------
      // Save score and status
      // -----------------------------------------------

      interview.score = evaluation;
      interview.status = "completed";

      await interview.save();

      // -----------------------------------------------
      // Response
      // -----------------------------------------------

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