import { Router } from "express";

import { requireAuth } from "../middleware/auth.ts";
import upload from "../middleware/upload.ts";
import {
  getCurrentUserProfile,
  updateProfileImage,
} from "../controllers/user.controller.ts";

const userRouter = Router();

userRouter.patch(
  "/profile-image",
  requireAuth,
  upload.single("image"),
  updateProfileImage
);
userRouter.get("/me", requireAuth, getCurrentUserProfile);

export default userRouter;
