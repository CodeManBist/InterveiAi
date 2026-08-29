import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import connectDB from "./db.ts";
import { createInterviewSchema } from "./schemas/interview.schem.ts";
import getUserRepositories from "./services/github.service.ts";
import upload from "./middleware/upload.ts";
import { parseResume } from "./services/gemini.service.js";
import { createLiveToken } from "./services/gemini-live.service.ts";

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

      console.log("Before parse");

      const resume = await parseResume(req.file);

      console.log("After parse");

      console.log("GitHub:", github);
      console.log("Resume:", resume);

      return res.json({
        message: "Pre-interview data processed",
        github,
        resume,
      });

    } catch (error) {
      console.error("PRE-INTERVIEW ERROR:", error);

      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});