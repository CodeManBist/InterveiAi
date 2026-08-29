import { z } from "zod";

export const createInterviewSchema = z.object({
  githubUsername: z
    .string()
    .min(1, "GitHub username is required"),
});

export type CreateInterviewInput = z.infer<
  typeof createInterviewSchema
>;