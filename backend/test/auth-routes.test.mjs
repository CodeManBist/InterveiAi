import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

const routes = new Map();
const app = {
  use() {},
  get(path, ...handlers) {
    routes.set(`GET ${path}`, handlers);
  },
  post(path, ...handlers) {
    routes.set(`POST ${path}`, handlers);
  },
  patch(path, ...handlers) {
    routes.set(`PATCH ${path}`, handlers);
  },
  listen() {},
};

function express() {
  return app;
}
express.json = () => (_req, _res, next) => next();
express.raw = () => (_req, _res, next) => next();

let verifiedEvent;
let webhookError;
let liveToken = "live-token";
let liveTokenError;
let evaluation = { overall: 92 };
let evaluationError;
let repositories = [];
let parsedResume = {};
let currentUser;
let interviewFindOneResult;
let interviewFindOneAndUpdateResult;
let userCreateCalls;
let userFindOneCalls;
let userUpdateCalls;
let userDeleteCalls;
let interviewCreateCalls;
let interviewFindOneCalls;
let interviewFindOneAndUpdateCalls;
let interviewUpdateOneCalls;
let evaluationCalls;

const User = {
  async create(value) {
    userCreateCalls.push(value);
    return value;
  },
  async findOne(query) {
    userFindOneCalls.push(query);
    return currentUser;
  },
  async findOneAndUpdate(...args) {
    userUpdateCalls.push(args);
    return {};
  },
  async findOneAndDelete(query) {
    userDeleteCalls.push(query);
    return {};
  },
};

const Interview = {
  async create(value) {
    interviewCreateCalls.push(value);
    return { _id: "interview-new", ...value };
  },
  async findOne(query) {
    interviewFindOneCalls.push(query);
    return typeof interviewFindOneResult === "function"
      ? interviewFindOneResult(query)
      : interviewFindOneResult;
  },
  async findOneAndUpdate(...args) {
    interviewFindOneAndUpdateCalls.push(args);
    return interviewFindOneAndUpdateResult;
  },
  async updateOne(...args) {
    interviewUpdateOneCalls.push(args);
    return { acknowledged: true };
  },
};

mock.module("express", { defaultExport: express });
mock.module("cors", {
  defaultExport: () => (_req, _res, next) => next(),
});
mock.module("dotenv", { defaultExport: { config() {} } });
mock.module("@clerk/express", {
  namedExports: {
    clerkMiddleware: () => (_req, _res, next) => next(),
    getAuth: (req) =>
      req.auth ?? { isAuthenticated: true, userId: "clerk-user-1" },
  },
});
mock.module("@clerk/express/webhooks", {
  namedExports: {
    verifyWebhook: async () => {
      if (webhookError) throw webhookError;
      return verifiedEvent;
    },
  },
});
mock.module(new URL("../db.ts", import.meta.url), {
  defaultExport: () => {},
});
mock.module(new URL("../models/User.model.ts", import.meta.url), {
  defaultExport: User,
});
mock.module(new URL("../models/Interview.model.ts", import.meta.url), {
  defaultExport: Interview,
});
mock.module(new URL("../schemas/interview.schem.ts", import.meta.url), {
  namedExports: {
    createInterviewSchema: {
      safeParse: (body) =>
        body.invalid
          ? { success: false, error: { issues: ["invalid input"] } }
          : { success: true, data: body },
    },
  },
});
mock.module(new URL("../schemas/messaage.schema.ts", import.meta.url), {
  namedExports: {
    messageSchema: {
      safeParse: (body) =>
        body.invalid
          ? { success: false, error: { issues: ["invalid message"] } }
          : { success: true, data: body },
    },
  },
});
mock.module(new URL("../middleware/upload.ts", import.meta.url), {
  defaultExport: { single: () => (_req, _res, next) => next() },
});
mock.module(new URL("../services/github.service.ts", import.meta.url), {
  defaultExport: async () => repositories,
});
mock.module(new URL("../services/gemini.service.ts", import.meta.url), {
  namedExports: { parseResume: async () => parsedResume },
});
mock.module(new URL("../services/gemini-live.service.ts", import.meta.url), {
  namedExports: {
    createLiveToken: async () => {
      if (liveTokenError) throw liveTokenError;
      return liveToken;
    },
  },
});
mock.module(
  new URL("../services/evaluate-interview.service.ts", import.meta.url),
  {
    namedExports: {
      evaluateInterview: async (interview) => {
        evaluationCalls.push(interview);
        if (evaluationError) throw evaluationError;
        return evaluation;
      },
    },
  },
);

await import("../index.ts");

function makeResponse() {
  return {
    locals: {},
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function invoke(method, path, request = {}) {
  const handlers = routes.get(`${method} ${path}`);
  assert.ok(handlers, `Missing route ${method} ${path}`);

  const req = {
    auth: { isAuthenticated: true, userId: "clerk-user-1" },
    body: {},
    params: {},
    ...request,
  };
  const res = makeResponse();

  for (const handler of handlers) {
    let calledNext = false;
    await handler(req, res, () => {
      calledNext = true;
    });
    if (!calledNext) break;
  }

  return res;
}

beforeEach(() => {
  verifiedEvent = { type: "session.created", data: {} };
  webhookError = undefined;
  liveToken = "live-token";
  liveTokenError = undefined;
  evaluation = { overall: 92 };
  evaluationError = undefined;
  repositories = [];
  parsedResume = {};
  currentUser = { _id: "mongo-user-1" };
  interviewFindOneResult = undefined;
  interviewFindOneAndUpdateResult = undefined;
  userCreateCalls = [];
  userFindOneCalls = [];
  userUpdateCalls = [];
  userDeleteCalls = [];
  interviewCreateCalls = [];
  interviewFindOneCalls = [];
  interviewFindOneAndUpdateCalls = [];
  interviewUpdateOneCalls = [];
  evaluationCalls = [];
});

test("every newly protected endpoint rejects missing authentication", async () => {
  const protectedRoutes = [
    ["GET", "/live-token"],
    ["POST", "/pre-interview"],
    ["GET", "/interview/:interviewId"],
    ["PATCH", "/interview/:interviewId/start"],
    ["POST", "/interview/:interviewId/messages"],
    ["POST", "/interview/:interviewId/complete"],
  ];

  for (const [method, path] of protectedRoutes) {
    const response = await invoke(method, path, {
      auth: { isAuthenticated: false, userId: null },
    });
    assert.equal(response.statusCode, 401, `${method} ${path}`);
    assert.deepEqual(response.body, { message: "Unauthorized" });
  }

  assert.equal(userFindOneCalls.length, 0);
  assert.equal(interviewFindOneCalls.length, 0);
});

test("authenticated requests receive a live token and expose the Clerk user id", async () => {
  const response = await invoke("GET", "/live-token");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { token: "live-token" });
  assert.equal(response.locals.clerkUserId, "clerk-user-1");
});

test("live-token failures do not leak provider errors", async () => {
  liveTokenError = new Error("provider secret");

  const response = await invoke("GET", "/live-token");

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: "Failed to create live token" });
});

test("user.created webhook selects the primary email and falls back to it as username", async () => {
  verifiedEvent = {
    type: "user.created",
    data: {
      id: "clerk-new",
      username: null,
      first_name: " Ada ",
      last_name: null,
      image_url: "https://example.test/avatar.png",
      primary_email_address_id: "email-primary",
      email_addresses: [
        { id: "email-other", email_address: "other@example.test" },
        { id: "email-primary", email_address: "ada@example.test" },
      ],
    },
  };

  const response = await invoke("POST", "/api/webhooks/clerk");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { success: true });
  assert.deepEqual(userCreateCalls, [
    {
      clerkUserId: "clerk-new",
      username: "ada@example.test",
      email: "ada@example.test",
      firstName: " Ada ",
      profileImage: "https://example.test/avatar.png",
    },
  ]);
});

test("user.created webhook rejects an event without its declared primary email", async () => {
  verifiedEvent = {
    type: "user.created",
    data: {
      id: "clerk-new",
      username: "ada",
      primary_email_address_id: "missing",
      email_addresses: [{ id: "other", email_address: "ada@example.test" }],
    },
  };

  const response = await invoke("POST", "/api/webhooks/clerk");

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: "Primary email not found" });
  assert.equal(userCreateCalls.length, 0);
});

test("user.updated webhook scopes the update by Clerk id and omits absent fields", async () => {
  verifiedEvent = {
    type: "user.updated",
    data: {
      id: "clerk-existing",
      username: "ada-l",
      first_name: null,
      last_name: "Lovelace",
      image_url: null,
      primary_email_address_id: "primary",
      email_addresses: [
        { id: "primary", email_address: "ada@new.example.test" },
      ],
    },
  };

  const response = await invoke("POST", "/api/webhooks/clerk");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(userUpdateCalls, [
    [
      { clerkUserId: "clerk-existing" },
      {
        username: "ada-l",
        email: "ada@new.example.test",
        lastName: "Lovelace",
      },
      { new: true },
    ],
  ]);
});

test("user.deleted webhook rejects a missing id and never issues an unscoped delete", async () => {
  verifiedEvent = { type: "user.deleted", data: { id: null } };

  const response = await invoke("POST", "/api/webhooks/clerk");

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: "Clerk user ID is missing" });
  assert.equal(userDeleteCalls.length, 0);
});

test("user.deleted webhook deletes only the matching Clerk account", async () => {
  verifiedEvent = { type: "user.deleted", data: { id: "clerk-deleted" } };

  const response = await invoke("POST", "/api/webhooks/clerk");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(userDeleteCalls, [{ clerkUserId: "clerk-deleted" }]);
});

test("invalid webhook signatures return a generic error and perform no writes", async () => {
  webhookError = new Error("bad signature");

  const response = await invoke("POST", "/api/webhooks/clerk");

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: "Webhook verification failed" });
  assert.equal(userCreateCalls.length, 0);
  assert.equal(userUpdateCalls.length, 0);
  assert.equal(userDeleteCalls.length, 0);
});

test("pre-interview creation associates the new interview with the authenticated user", async () => {
  repositories = [{ name: "compiler" }];
  parsedResume = {
    name: "Ada Lovelace",
    summary: "Engineer",
    skills: ["Algorithms"],
    technologies: ["TypeScript"],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  };

  const response = await invoke("POST", "/pre-interview", {
    body: { githubUsername: "ada" },
    file: { originalname: "resume.pdf" },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(userFindOneCalls, [{ clerkUserId: "clerk-user-1" }]);
  assert.equal(interviewCreateCalls[0].userId, "mongo-user-1");
  assert.deepEqual(interviewCreateCalls[0].githubRepositories, repositories);
  assert.equal(interviewCreateCalls[0].candidateProfile.github, "ada");
  assert.deepEqual(response.body, {
    message: "Pre-interview data processed",
    interviewId: "interview-new",
  });
});

test("pre-interview creation stops when no synchronized MongoDB user exists", async () => {
  currentUser = null;

  const response = await invoke("POST", "/pre-interview", {
    body: { githubUsername: "ada" },
    file: { originalname: "resume.pdf" },
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { message: "User not found" });
  assert.equal(interviewCreateCalls.length, 0);
});

test("fetching an interview includes ownership in the database query", async () => {
  interviewFindOneResult = {
    _id: "interview-1",
    candidateProfile: { name: "Ada" },
    githubRepositories: [],
    status: "ready",
    messages: [],
    questionCount: 0,
    score: undefined,
  };

  const response = await invoke("GET", "/interview/:interviewId", {
    params: { interviewId: "interview-1" },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(interviewFindOneCalls, [
    { _id: "interview-1", userId: "mongo-user-1" },
  ]);
  assert.equal(response.body.interviewId, "interview-1");
  assert.equal(response.body.questionCount, 0);
});

test("another user's interview is indistinguishable from a missing interview", async () => {
  interviewFindOneResult = null;

  const response = await invoke("GET", "/interview/:interviewId", {
    params: { interviewId: "interview-owned-elsewhere" },
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: "Interview not found" });
  assert.deepEqual(interviewFindOneCalls[0], {
    _id: "interview-owned-elsewhere",
    userId: "mongo-user-1",
  });
});

test("starting an interview verifies ownership and persists the status transition", async () => {
  let saves = 0;
  interviewFindOneResult = {
    status: "ready",
    async save() {
      saves += 1;
    },
  };

  const response = await invoke("PATCH", "/interview/:interviewId/start", {
    params: { interviewId: "interview-1" },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(interviewFindOneResult.status, "in-progress");
  assert.equal(saves, 1);
  assert.deepEqual(interviewFindOneCalls[0], {
    _id: "interview-1",
    userId: "mongo-user-1",
  });
});

test("starting an already active interview leaves it unchanged", async () => {
  let saves = 0;
  interviewFindOneResult = {
    status: "in-progress",
    async save() {
      saves += 1;
    },
  };

  const response = await invoke("PATCH", "/interview/:interviewId/start", {
    params: { interviewId: "interview-1" },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.status, "in-progress");
  assert.equal(saves, 0);
});

test("saving an AI question atomically scopes ownership and enforces the ten-question cap", async () => {
  interviewFindOneResult = { status: "in-progress" };
  interviewFindOneAndUpdateResult = {
    messages: [{ role: "ai", type: "question", content: "Q1" }],
  };

  const response = await invoke("POST", "/interview/:interviewId/messages", {
    params: { interviewId: "interview-1" },
    body: { role: "ai", type: "question", content: "Q1" },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(interviewFindOneCalls[0], {
    _id: "interview-1",
    userId: "mongo-user-1",
    status: "in-progress",
  });
  const [filter, update, options] = interviewFindOneAndUpdateCalls[0];
  assert.deepEqual(filter, {
    _id: "interview-1",
    userId: "mongo-user-1",
    status: "in-progress",
    questionCount: { $lt: 10 },
  });
  assert.deepEqual(update.$inc, { questionCount: 1 });
  assert.equal(update.$push.messages.content, "Q1");
  assert.ok(update.$push.messages.timestamp instanceof Date);
  assert.deepEqual(options, { new: true });
  assert.equal(response.body.questionCount, 1);
});

test("the question cap race returns a conflict instead of recording an eleventh question", async () => {
  interviewFindOneResult = { status: "in-progress" };
  interviewFindOneAndUpdateResult = null;

  const response = await invoke("POST", "/interview/:interviewId/messages", {
    params: { interviewId: "interview-1" },
    body: { role: "ai", type: "question", content: "Q11" },
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, {
    message: "Interview changed before the message could be saved",
  });
  assert.equal(evaluationCalls.length, 0);
});

test("the answer after question ten completes and evaluates only the owner's interview", async () => {
  const messages = Array.from({ length: 10 }, (_, index) => ({
    role: "ai",
    type: "question",
    content: `Q${index + 1}`,
  }));
  interviewFindOneAndUpdateResult = { messages };
  let findCalls = 0;
  interviewFindOneResult = () => {
    findCalls += 1;
    return findCalls === 1
      ? { status: "in-progress" }
      : { status: "completed", questionCount: 10, score: evaluation };
  };

  const response = await invoke("POST", "/interview/:interviewId/messages", {
    params: { interviewId: "interview-1" },
    body: { role: "user", type: "answer", content: "Final answer" },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(evaluationCalls, [interviewFindOneAndUpdateResult]);
  assert.deepEqual(interviewUpdateOneCalls, [
    [
      {
        _id: "interview-1",
        userId: "mongo-user-1",
        status: "in-progress",
      },
      {
        $set: {
          score: evaluation,
          status: "completed",
          questionCount: 10,
        },
      },
    ],
  ]);
  assert.equal(response.body.status, "completed");
});

test("invalid messages are rejected before any interview mutation", async () => {
  const response = await invoke("POST", "/interview/:interviewId/messages", {
    params: { interviewId: "interview-1" },
    body: { invalid: true },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(interviewFindOneCalls.length, 0);
  assert.equal(interviewFindOneAndUpdateCalls.length, 0);
});

test("manual completion recalculates persisted questions and saves the evaluation", async () => {
  let saves = 0;
  interviewFindOneResult = {
    status: "in-progress",
    questionCount: 99,
    messages: [
      { role: "ai", type: "greeting" },
      { role: "ai", type: "question" },
      { role: "user", type: "answer" },
      { role: "ai", type: "question" },
    ],
    async save() {
      saves += 1;
    },
  };

  const response = await invoke("POST", "/interview/:interviewId/complete", {
    params: { interviewId: "interview-1" },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(interviewFindOneCalls[0], {
    _id: "interview-1",
    userId: "mongo-user-1",
  });
  assert.equal(interviewFindOneResult.questionCount, 2);
  assert.equal(interviewFindOneResult.status, "completed");
  assert.deepEqual(interviewFindOneResult.score, evaluation);
  assert.equal(saves, 1);
});

test("manual completion refuses to re-evaluate an already completed interview", async () => {
  interviewFindOneResult = {
    status: "completed",
    messages: [],
    async save() {
      assert.fail("completed interview must not be saved again");
    },
  };

  const response = await invoke("POST", "/interview/:interviewId/complete", {
    params: { interviewId: "interview-1" },
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: "Interview already completed" });
  assert.equal(evaluationCalls.length, 0);
});
