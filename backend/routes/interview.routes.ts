import { Router } from "express";

import { requireAuth } from "../middleware/auth.ts";
import upload from "../middleware/upload.ts";
import {
  completeInterview,
  createInterview,
  getInterview,
  listInterviews,
  saveInterviewMessage,
  startInterview,
} from "../controllers/interview.controller.ts";

const interviewRouter = Router();

interviewRouter.post(
  "/pre-interview",
  requireAuth,
  upload.single("resume"),
  createInterview
);
interviewRouter.get("/interview/:interviewId", requireAuth, getInterview);
interviewRouter.patch(
  "/interview/:interviewId/start",
  requireAuth,
  startInterview
);
interviewRouter.post(
  "/interview/:interviewId/messages",
  requireAuth,
  saveInterviewMessage
);
interviewRouter.post(
  "/interview/:interviewId/complete",
  requireAuth,
  completeInterview
);
interviewRouter.get("/interviews", requireAuth, listInterviews);

export default interviewRouter;
