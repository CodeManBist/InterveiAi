
import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock Clerk authentication
vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (
    _req: any,
    _res: any,
    next: any
  ) => next(),

  getAuth: vi.fn(() => ({
    isAuthenticated: false,
    userId: null,
  })),
}));

// Mock external services imported by controllers
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

vi.mock("@clerk/express/webhooks", () => ({
  verifyWebhook: vi.fn(),
}));

import app from "../app.ts";

describe("Health API", () => {
  it("GET /api/v1/test should return 200", async () => {
    const response = await request(app).get("/api/v1/test");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "Test route working!",
    });
  });

  describe("Authentication", () => {
    it("GET /api/v1/live-token should return 401 when unauthenticated", async () => {
        const response = await request(app).get("/api/v1/live-token");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Unauthorized" });
    });
  });

  it("GET /api/users/me should return 401 when unauthenticated", async () => {
    const response = await request(app).get("/api/v1/users/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });


  it("GET /api/v1/interviews should return 401 when unauthenticated", async () => {
    const response = await request(app).get("/api/v1/interviews");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });
});
