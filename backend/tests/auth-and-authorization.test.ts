import express, { type Express } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  verifyWebhook: vi.fn(),
  createLiveToken: vi.fn(),
  getUserRepositories: vi.fn(),
  parseResume: vi.fn(),
  evaluateInterview: vi.fn(),
  userCreate: vi.fn(),
  userFindOne: vi.fn(),
  userFindOneAndUpdate: vi.fn(),
  userFindOneAndDelete: vi.fn(),
  interviewCreate: vi.fn(),
  interviewFindOne: vi.fn(),
  interviewFindOneAndUpdate: vi.fn(),
  interviewUpdateOne: vi.fn(),
}));

vi.mock("../db.ts", () => ({ default: mocks.connectDB }));

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  getAuth: (req: express.Request) => {
    const authorization = req.headers.authorization;
    const userId = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;

    return { isAuthenticated: Boolean(userId), userId };
  },
}));

vi.mock("@clerk/express/webhooks", () => ({
  verifyWebhook: mocks.verifyWebhook,
}));

vi.mock("../services/github.service.ts", () => ({
  default: mocks.getUserRepositories,
}));
vi.mock("../services/gemini.service.ts", () => ({
  parseResume: mocks.parseResume,
}));
vi.mock("../services/gemini-live.service.ts", () => ({
  createLiveToken: mocks.createLiveToken,
}));
vi.mock("../services/evaluate-interview.service.ts", () => ({
  evaluateInterview: mocks.evaluateInterview,
}));

vi.mock("../models/User.model.ts", () => ({
  default: {
    create: mocks.userCreate,
    findOne: mocks.userFindOne,
    findOneAndUpdate: mocks.userFindOneAndUpdate,
    findOneAndDelete: mocks.userFindOneAndDelete,
  },
}));

vi.mock("../models/Interview.model.ts", () => ({
  default: {
    create: mocks.interviewCreate,
    findOne: mocks.interviewFindOne,
    findOneAndUpdate: mocks.interviewFindOneAndUpdate,
    updateOne: mocks.interviewUpdateOne,
  },
}));

let app: Express;

const auth = (userId = "clerk_user_1") => `Bearer ${userId}`;
const mongoUser = { _id: "mongo_user_1", clerkUserId: "clerk_user_1" };

const resume = {
  name: "Ada Lovelace",
  summary: "Engineer",
  skills: ["TypeScript"],
  technologies: ["Node.js"],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
};

beforeAll(async () => {
  vi.spyOn(express.application, "listen").mockImplementation(function () {
    app = this as Express;
    return {} as ReturnType<Express["listen"]>;
  });

  await import("../index.ts");
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authentication boundaries", () => {
  it.each([
    ["get", "/live-token"],
    ["get", "/interview/interview_1"],
    ["patch", "/interview/interview_1/start"],
    ["post", "/interview/interview_1/messages"],
    ["post", "/interview/interview_1/complete"],
  ] as const)("rejects unauthenticated %s %s requests", async (method, path) => {
    const response = await request(app)[method](path);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
    expect(mocks.userFindOne).not.toHaveBeenCalled();
  });

  it("returns a live token to an authenticated user", async () => {
    mocks.createLiveToken.mockResolvedValue("live-token");

    const response = await request(app)
      .get("/live-token")
      .set("Authorization", auth());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ token: "live-token" });
  });

  it("does not expose live-token provider failures", async () => {
    mocks.createLiveToken.mockRejectedValue(new Error("provider secret"));

    const response = await request(app)
      .get("/live-token")
      .set("Authorization", auth());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Failed to create live token" });
  });
});

describe("Clerk user synchronization", () => {
  it("creates a user from the primary email and optional profile fields", async () => {
    mocks.verifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        id: "clerk_1",
        username: null,
        first_name: "Ada",
        last_name: "Lovelace",
        image_url: "https://example.test/ada.png",
        primary_email_address_id: "email_primary",
        email_addresses: [
          { id: "email_other", email_address: "other@example.test" },
          { id: "email_primary", email_address: "ada@example.test" },
        ],
      },
    });

    const response = await request(app)
      .post("/api/webhooks/clerk")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ event: "signed" }));

    expect(response.status).toBe(200);
    expect(mocks.userCreate).toHaveBeenCalledWith({
      clerkUserId: "clerk_1",
      username: "ada@example.test",
      email: "ada@example.test",
      firstName: "Ada",
      lastName: "Lovelace",
      profileImage: "https://example.test/ada.png",
    });
  });

  it("rejects user creation when the declared primary email is absent", async () => {
    mocks.verifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        id: "clerk_1",
        username: "ada",
        first_name: null,
        last_name: null,
        image_url: null,
        primary_email_address_id: "missing",
        email_addresses: [],
      },
    });

    const response = await request(app)
      .post("/api/webhooks/clerk")
      .set("Content-Type", "application/json")
      .send("{}");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Primary email not found" });
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("updates only fields supplied by Clerk", async () => {
    mocks.verifyWebhook.mockResolvedValue({
      type: "user.updated",
      data: {
        id: "clerk_1",
        username: "ada",
        first_name: null,
        last_name: "Lovelace",
        image_url: null,
        primary_email_address_id: "primary",
        email_addresses: [
          { id: "primary", email_address: "ada@example.test" },
        ],
      },
    });

    const response = await request(app)
      .post("/api/webhooks/clerk")
      .set("Content-Type", "application/json")
      .send("{}");

    expect(response.status).toBe(200);
    expect(mocks.userFindOneAndUpdate).toHaveBeenCalledWith(
      { clerkUserId: "clerk_1" },
      { username: "ada", email: "ada@example.test", lastName: "Lovelace" },
      { new: true },
    );
  });

  it("deletes the synchronized user and rejects malformed delete events", async () => {
    mocks.verifyWebhook
      .mockResolvedValueOnce({ type: "user.deleted", data: { id: "clerk_1" } })
      .mockResolvedValueOnce({ type: "user.deleted", data: {} });

    const deleted = await request(app)
      .post("/api/webhooks/clerk")
      .set("Content-Type", "application/json")
      .send("{}");
    const malformed = await request(app)
      .post("/api/webhooks/clerk")
      .set("Content-Type", "application/json")
      .send("{}");

    expect(deleted.status).toBe(200);
    expect(mocks.userFindOneAndDelete).toHaveBeenCalledWith({
      clerkUserId: "clerk_1",
    });
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ message: "Clerk user ID is missing" });
  });

  it("returns a stable error when webhook verification fails", async () => {
    mocks.verifyWebhook.mockRejectedValue(new Error("invalid signature"));

    const response = await request(app)
      .post("/api/webhooks/clerk")
      .set("Content-Type", "application/json")
      .send("{}");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Webhook verification failed" });
  });
});

describe("interview ownership", () => {
  it("creates an interview owned by the authenticated database user", async () => {
    mocks.userFindOne.mockResolvedValue(mongoUser);
    mocks.getUserRepositories.mockResolvedValue([{ name: "interveiai" }]);
    mocks.parseResume.mockResolvedValue(resume);
    mocks.interviewCreate.mockResolvedValue({ _id: "interview_1" });

    const response = await request(app)
      .post("/pre-interview")
      .set("Authorization", auth())
      .field("githubUsername", "ada")
      .attach("resume", Buffer.from("resume"), "resume.pdf");

    expect(response.status).toBe(201);
    expect(response.body.interviewId).toBe("interview_1");
    expect(mocks.interviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mongoUser._id,
        candidateProfile: expect.objectContaining({ github: "ada" }),
      }),
    );
  });

  it("rejects interview creation when the Clerk user has not synchronized", async () => {
    mocks.userFindOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/pre-interview")
      .set("Authorization", auth())
      .field("githubUsername", "ada")
      .attach("resume", Buffer.from("resume"), "resume.pdf");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "User not found" });
    expect(mocks.parseResume).not.toHaveBeenCalled();
  });

  it("queries an interview by both id and owner", async () => {
    mocks.userFindOne.mockResolvedValue(mongoUser);
    mocks.interviewFindOne.mockResolvedValue({
      _id: "interview_1",
      candidateProfile: resume,
      githubRepositories: [],
      status: "ready",
      messages: [],
      questionCount: 0,
      score: undefined,
    });

    const response = await request(app)
      .get("/interview/interview_1")
      .set("Authorization", auth());

    expect(response.status).toBe(200);
    expect(mocks.interviewFindOne).toHaveBeenCalledWith({
      _id: "interview_1",
      userId: mongoUser._id,
    });
  });

  it("does not reveal whether another user's interview exists", async () => {
    mocks.userFindOne.mockResolvedValue(mongoUser);
    mocks.interviewFindOne.mockResolvedValue(null);

    const response = await request(app)
      .get("/interview/not-owned")
      .set("Authorization", auth());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Interview not found" });
  });

  it("starts only an owned, ready interview", async () => {
    const save = vi.fn();
    const interview = { status: "ready", save };
    save.mockResolvedValue(interview);
    mocks.userFindOne.mockResolvedValue(mongoUser);
    mocks.interviewFindOne.mockResolvedValue(interview);

    const response = await request(app)
      .patch("/interview/interview_1/start")
      .set("Authorization", auth());

    expect(mocks.interviewFindOne).toHaveBeenCalledWith({
      _id: "interview_1",
      userId: mongoUser._id,
    });
    expect(save).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("in-progress");
  });

  it.each(["in-progress", "completed"])(
    "refuses to restart an interview in %s status",
    async (status) => {
      mocks.userFindOne.mockResolvedValue(mongoUser);
      mocks.interviewFindOne.mockResolvedValue({ status, save: vi.fn() });

      const response = await request(app)
        .patch("/interview/interview_1/start")
        .set("Authorization", auth());

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Interview has already started or completed",
        status,
      });
    },
  );
});

describe("owned interview messages and completion", () => {
  const question = { role: "ai", type: "question", content: "Why?" };

  it("atomically scopes question writes to the owner and ten-question cap", async () => {
    mocks.userFindOne.mockResolvedValue(mongoUser);
    mocks.interviewFindOne
      .mockResolvedValueOnce({ status: "in-progress" })
      .mockResolvedValueOnce({ status: "in-progress", questionCount: 1 });
    mocks.interviewFindOneAndUpdate.mockResolvedValue({
      messages: [question],
      questionCount: 1,
    });

    const response = await request(app)
      .post("/interview/interview_1/messages")
      .set("Authorization", auth())
      .send(question);

    expect(response.status).toBe(201);
    expect(mocks.interviewFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: "interview_1",
        userId: mongoUser._id,
        status: "in-progress",
        questionCount: { $lt: 10 },
      },
      expect.objectContaining({
        $push: { messages: expect.objectContaining(question) },
        $inc: { questionCount: 1 },
      }),
      { new: true },
    );
  });

  it("rejects a question when the atomic cap check loses the race", async () => {
    mocks.userFindOne.mockResolvedValue(mongoUser);
    mocks.interviewFindOne.mockResolvedValue({ status: "in-progress" });
    mocks.interviewFindOneAndUpdate.mockResolvedValue(null);

    const response = await request(app)
      .post("/interview/interview_1/messages")
      .set("Authorization", auth())
      .send(question);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("changed before");
    expect(mocks.interviewUpdateOne).not.toHaveBeenCalled();
  });

  it("evaluates and completes after the answer to the tenth persisted question", async () => {
    const tenQuestions = Array.from({ length: 10 }, (_, index) => ({
      role: "ai",
      type: "question",
      content: `Question ${index + 1}`,
    }));
    const answer = { role: "user", type: "answer", content: "Final answer" };
    const updatedInterview = { messages: [...tenQuestions, answer] };
    const evaluation = { overall: 90 };

    mocks.userFindOne.mockResolvedValue(mongoUser);
    mocks.interviewFindOne
      .mockResolvedValueOnce({ status: "in-progress" })
      .mockResolvedValueOnce({ status: "completed", questionCount: 10, score: evaluation });
    mocks.interviewFindOneAndUpdate.mockResolvedValue(updatedInterview);
    mocks.evaluateInterview.mockResolvedValue(evaluation);
    mocks.interviewUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    const response = await request(app)
      .post("/interview/interview_1/messages")
      .set("Authorization", auth())
      .send(answer);

    expect(mocks.evaluateInterview).toHaveBeenCalledWith(updatedInterview);
    expect(mocks.interviewUpdateOne).toHaveBeenCalledWith(
      {
        _id: "interview_1",
        userId: mongoUser._id,
        status: "in-progress",
      },
      { $set: { score: evaluation, status: "completed", questionCount: 10 } },
    );
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ status: "completed", questionCount: 10 });
  });

  it("validates a message before attempting the owned write", async () => {
    mocks.userFindOne.mockResolvedValue(mongoUser);

    const response = await request(app)
      .post("/interview/interview_1/messages")
      .set("Authorization", auth())
      .send({ role: "system", type: "question", content: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid message");
    expect(mocks.interviewFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("manually completes only the owner's interview and repairs stale questionCount", async () => {
    const messages = [
      question,
      { role: "user", type: "answer", content: "Because" },
      question,
    ];
    const evaluation = { overall: 80 };
    const save = vi.fn();
    const interview = { status: "in-progress", messages, questionCount: 0, save, score: undefined };
    save.mockResolvedValue(interview);
    mocks.userFindOne.mockResolvedValue(mongoUser);
    mocks.interviewFindOne.mockResolvedValue(interview);
    mocks.evaluateInterview.mockResolvedValue(evaluation);

    const response = await request(app)
      .post("/interview/interview_1/complete")
      .set("Authorization", auth());

    expect(mocks.interviewFindOne).toHaveBeenCalledWith({
      _id: "interview_1",
      userId: mongoUser._id,
    });
    expect(interview.questionCount).toBe(2);
    expect(interview.status).toBe("completed");
    expect(interview.score).toBe(evaluation);
    expect(save).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });
});
