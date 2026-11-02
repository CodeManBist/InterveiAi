import type { Request, Response } from "express";

import Interview from "../models/Interview.model.ts";
import { createInterviewSchema } from "../schemas/interview.schem.ts";
import { messageSchema } from "../schemas/messaage.schema.ts";
import { evaluateInterview } from "../services/evaluate-interview.service.ts";
import getUserRepositories from "../services/github.service.ts";
import { parseResume } from "../services/gemini.service.ts";
import { getCurrentUser } from "../middleware/auth.ts";

export const createInterview = async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

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
    console.log("Resume parsed");

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
};

export const getInterview = async (req: Request, res: Response) => {
  try {
    const { interviewId } = req.params;
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

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
      candidateProfile: interview.candidateProfile,
      githubRepositories: interview.githubRepositories,
      status: interview.status,
      messages: interview.messages,
      questionCount: interview.questionCount || 0,
      score: interview.score,
    });
  } catch (error) {
    console.error("GET INTERVIEW ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch interview",
    });
  }
};

export const startInterview = async (req: Request, res: Response) => {
  try {
    const { interviewId } = req.params;
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      userId: user._id,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (
      interview.status === "completed" ||
      interview.status === "in-progress"
    ) {
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
};

export const saveInterviewMessage = async (req: Request, res: Response) => {
  try {
    const { interviewId } = req.params;
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

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
      userId: user._id,
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
        userId: user._id,
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
        savedMessage.role === "ai" && savedMessage.type === "question"
    ).length;

    const isFinalAnswer =
      role === "user" && type === "answer" && questionCount === 10;

    if (isFinalAnswer) {
      const evaluation = await evaluateInterview(updatedInterview);

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

    const savedInterview = await Interview.findOne({
      _id: interviewId,
      userId: user._id,
    });

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
};

export const completeInterview = async (req: Request, res: Response) => {
  try {
    const { interviewId } = req.params;
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      userId: user._id,
    });

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

    const persistedQuestionCount = interview.messages.filter(
      (message) => message.role === "ai" && message.type === "question"
    ).length;

    if (interview.questionCount !== persistedQuestionCount) {
      interview.questionCount = persistedQuestionCount;
    }

    console.log("Manually completing interview:", {
      interviewId,
      messageCount: interview.messages.length,
      questionCount: persistedQuestionCount,
    });

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
};

export const listInterviews = async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const interviews = await Interview.find({
      userId: user._id,
    })
      .sort({ createdAt: -1 })
      .select("_id candidateProfile questionCount status score createdAt updatedAt");

    return res.status(200).json({
      interviews,
    });
  } catch (error) {
    console.error("Failed to fetch interviews:", error);

    return res.status(500).json({
      message: "Failed to fetch interviews",
    });
  }
};
