import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

import User from "../models/User.model.ts";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
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

export const getCurrentUser = async (req: Request) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return null;
  }

  return User.findOne({
    clerkUserId: userId,
  });
};
