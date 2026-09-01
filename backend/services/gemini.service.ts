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
You are a resume parser for a technical interview platform.

Analyze the provided resume and extract information useful for conducting a software engineering interview.

IMPORTANT:
- Every candidate's resume can have a different format.
- Do not assume the candidate has experience, projects, certifications, education, or GitHub.
- Extract only information actually present in the resume.
- Do not invent information.
- If information is missing, return an empty array.
- Follow the JSON structure exactly.

Return ONLY valid JSON in this structure:

{
  "name": "",
  "summary": "",
  "skills": [],
  "technologies": [],
  "experience": [
    {
      "company": "",
      "role": "",
      "duration": "",
      "description": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": []
    }
  ],
  "education": [
    {
      "degree": "",
      "institution": "",
      "duration": "",
      "details": ""
    }
  ],
  "certifications": []
}

Rules for education:
- education MUST be an array of objects.
- Each education object must contain:
  degree
  institution
  duration
  details
- If some field is not available, use an empty string.
- Never return education as strings.

Rules for experience:
- experience MUST be an array of objects.
- Do not create experience if none exists.

Rules for projects:
- projects MUST be an array of objects.
- Include technologies mentioned for each project.

Rules for skills and technologies:
- They MUST be arrays of strings.

Return nothing except the JSON object.
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

  if (!response.text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(response.text);
}