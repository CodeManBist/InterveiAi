import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock authentication and provide a test user.
vi.mock("../middleware/auth.ts", () => ({
    requireAuth: (_req: any, _res: any, next: any) => next(),
    getCurrentUser: vi.fn().mockResolvedValue({
        _id: "test-user-id",
    }),
}));

// Mock external services.
vi.mock("../services/gemini-live.service.ts", () => ({
    createLiveToken: vi.fn(),
}));

vi.mock("../services/gemini.service.ts", () => ({
    parseResume: vi.fn(),
}));

vi.mock("../services/evaluate-interview.service.ts", () => ({
    evaluateInterview: vi.fn(),
}));

vi.mock("../services/github.service.ts", () => ({
    default: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
    clerkMiddleware: () => (
        _req: any,
        _res: any,
        next: any
    ) => next(),
    getAuth: vi.fn(),
}));

vi.mock("@clerk/express/webhooks", () => ({
    verifyWebhook: vi.fn(),
}));

import app from "../app.ts";

describe("Interview API - Create Interview", () => {
    it("should return 400 when githubUsername is missing", async () => {
      const response = await request(app)
        .post("/pre-interview")
        .send({});
  
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid input");
      expect(response.body.errors).toBeDefined();
    });
  
    it("should return 400 when githubUsername is empty", async () => {
      const response = await request(app)
        .post("/pre-interview")
        .send({
          githubUsername: "",
        });
  
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid input");
  
      expect(response.body.errors[0].message).toBe(
        "GitHub username is required"
      );
    });
  
    it("should return 400 when resume is missing", async () => {
      const response = await request(app)
        .post("/pre-interview")
        .send({
          githubUsername: "CodeManBist",
        });
  
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Resume is required",
      });
    });
  });