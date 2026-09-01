import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const client = new GoogleGenAI({
  apiKey,
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
      ).toISOString(),

      liveConnectConstraints: {
        model: "gemini-3.1-flash-live-preview",

        config: {
          responseModalities: [Modality.AUDIO],

          sessionResumption: {},
        },
      },
    },
  });

  return token.name;
};