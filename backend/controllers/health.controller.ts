import type { Request, Response } from "express";

import { createLiveToken } from "../services/gemini-live.service.ts";

export const test = (_req: Request, res: Response) => {
  res.json({
    message: "Test route working!",
  });
};

export const getLiveToken = async (_req: Request, res: Response) => {
  try {
    const token = await createLiveToken();

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Live Token Error:", error);

    return res.status(500).json({
      message: "Failed to create live token",
    });
  }
};
