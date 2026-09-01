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

export const evaluateInterview = async (interview: any) => {
  const evaluationPrompt = `
You are a strict senior software engineering interviewer evaluating a completed technical interview.

You must evaluate the candidate ONLY using the information provided below.

========================
CANDIDATE PROFILE
========================

${JSON.stringify(interview.candidateProfile, null, 2)}

========================
GITHUB REPOSITORIES
========================

${JSON.stringify(interview.githubRepositories, null, 2)}

========================
INTERVIEW CONVERSATION
========================

${JSON.stringify(interview.messages, null, 2)}

========================
EVALUATION RULES
========================

Evaluate the candidate strictly.

Do NOT give points simply because the candidate attempted an answer.

Evaluate the quality of their ACTUAL answers.

Consider:

1. Technical correctness
2. Technical depth
3. Understanding of their own projects
4. Understanding of technologies they claim to use
5. Problem-solving ability
6. Reasoning
7. Engineering decision-making
8. Understanding of trade-offs
9. Debugging ability
10. Communication and clarity

Pay particular attention to whether the candidate can explain the projects and technologies they claim to have experience with.

A candidate who memorized definitions but cannot explain their own project implementation should receive a lower score.

A candidate who demonstrates strong technical reasoning, understands their implementation decisions, and handles follow-up questions well should receive a higher score.

Do NOT assume knowledge that the candidate did not demonstrate.

Do NOT use the candidate's resume claims as proof that they understand a technology.

The interview answers are the primary evidence of technical ability.

========================
SCORING
========================

Return scores from 0 to 100.

overall:
Overall assessment of the candidate's interview performance.

technical:
Technical knowledge, correctness, depth, and project understanding.

communication:
Clarity, structure, confidence, and ability to explain technical concepts.

problemSolving:
Reasoning, debugging, trade-offs, and ability to work through technical problems.

Be strict and objective.

Do not inflate scores.

========================
FEEDBACK
========================

Provide:

- strengths
- weaknesses
- detailed feedback
- areas the candidate should improve

Feedback must reference the candidate's actual interview performance.

Do not invent examples.

========================
IMPORTANT
========================

Return ONLY valid JSON.

Do not include markdown.

Use exactly this structure:

{
  "overall": 0,
  "technical": 0,
  "communication": 0,
  "problemSolving": 0,
  "feedback": "",
  "strengths": [],
  "weaknesses": []
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",

    contents: [
      {
        text: evaluationPrompt,
      },
    ],

    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned empty evaluation");
  }

  return JSON.parse(response.text);
};