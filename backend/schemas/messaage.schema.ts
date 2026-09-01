import { z } from "zod";

export const messageSchema = z.object({
  role: z.enum(["ai", "user"]),

  type: z.enum(["question", "answer", "greeting"]),

  content: z
    .string()
    .min(1, "Message cannot be empty"),
});

export type Message = z.infer<typeof messageSchema>;