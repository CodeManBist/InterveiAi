import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing");
}

const ai = new GoogleGenAI({
  apiKey,
});

export async function parseResume(file: Express.Multer.File) {
  const base64Data = file.buffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",

    contents: [
      {
        text: `
          Analyze this resume and extract only information
          useful for conducting a technical interview.

          Return JSON:

          {
            "summary": "",
            "skills": [],
            "technologies": [],
            "experience": [],
            "projects": []
          }
        `,
      },
      {
        inlineData: {
          mimeType: file.mimetype,
          data: base64Data,
        },
      },
    ],

    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text);
}