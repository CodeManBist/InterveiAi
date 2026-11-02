import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { clerkMiddleware } from "@clerk/express";

import healthRouter from "./routes/health.routes.ts";
import interviewRouter from "./routes/interview.routes.ts";
import userRouter from "./routes/user.routes.ts";
import webhookRouter from "./routes/webhook.routes.ts";

dotenv.config();

const app = express();

const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(
    (origin) =>
      origin.length > 0 &&
      !origin.includes("YOUR-FRONTEND"),
  );

const allowedOrigins = new Set([
  ...configuredOrigins,
  ...(configuredOrigins.length === 0
    ? ["http://localhost:5173", "http://127.0.0.1:5173"]
    : []),
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(clerkMiddleware());

app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" })
);

app.use(express.json());

app.use("/api/users", userRouter);
app.use("/api/webhooks/clerk", webhookRouter);
app.use("/", healthRouter);
app.use("/", interviewRouter);

export default app;
