import { z } from "zod";

export const messageSchema = z.object({
  role: z.enum(["ai", "user"]),

  content: z
    .string()
    .min(1, "Message cannot be empty"),
});

export type Message = z.infer<typeof messageSchema>;