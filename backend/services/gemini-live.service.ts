import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const createLiveToken = async () => {
  const expireTime = new Date(
    Date.now() + 30 * 60 * 1000
  ).toISOString();

  const token = await client.authTokens.create({
    config: {
      uses: 1,

      expireTime,

      newSessionExpireTime: new Date(
        Date.now() + 60 * 1000
      ),

      liveConnectConstraints: {
        model: "gemini-3.1-flash-live-preview",

        config: {
          responseModalities: ["AUDIO"],

          sessionResumption: {},
        },
      },
    },
  });

  return token.name;
};