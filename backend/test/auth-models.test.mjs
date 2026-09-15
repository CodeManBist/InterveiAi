import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import Interview from "../models/Interview.model.ts";
import User from "../models/User.model.ts";
import { candidateProfileSchema } from "../schemas/candidate.schema.ts";

test("User normalizes identity fields and keeps optional profile fields optional", async () => {
  const user = new User({
    clerkUserId: "clerk-1",
    username: "  ada  ",
    email: "  ADA@EXAMPLE.TEST  ",
    firstName: "  Ada  ",
  });

  assert.equal(user.username, "ada");
  assert.equal(user.email, "ada@example.test");
  assert.equal(user.firstName, "Ada");
  assert.equal(user.lastName, undefined);
  await user.validate();
});

test("User requires all synchronized Clerk identity fields", async () => {
  await assert.rejects(
    new User({}).validate(),
    (error) => {
      assert.deepEqual(
        Object.keys(error.errors).sort(),
        ["clerkUserId", "email", "username"],
      );
      return true;
    },
  );
});

test("User schema declares unique indexes for external id, username, and email", () => {
  const indexes = User.schema.indexes();

  for (const field of ["clerkUserId", "username", "email"]) {
    const index = indexes.find(([keys]) => keys[field] === 1);
    assert.ok(index, `missing ${field} index`);
    assert.equal(index[1].unique, true, `${field} must be unique`);
  }
});

test("Interview requires an owning user", async () => {
  await assert.rejects(
    new Interview({}).validate(),
    (error) => error.errors.userId?.kind === "required",
  );
});

test("Interview accepts a valid owner and exposes the expected User reference index", async () => {
  const userId = new mongoose.Types.ObjectId();
  const interview = new Interview({ userId });
  const userPath = Interview.schema.path("userId");

  await interview.validate();
  assert.equal(interview.userId.toString(), userId.toString());
  assert.equal(userPath.options.ref, "User");
  assert.equal(userPath.options.index, true);
});

test("candidate profiles support an omitted GitHub handle", () => {
  const result = candidateProfileSchema.safeParse({
    name: "Ada Lovelace",
    summary: "Engineer",
    skills: ["Algorithms"],
    technologies: ["TypeScript"],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.github, undefined);
});

test("candidate profiles still reject a non-string GitHub handle", () => {
  const result = candidateProfileSchema.safeParse({
    name: "Ada Lovelace",
    summary: "Engineer",
    github: 42,
    skills: [],
    technologies: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  });

  assert.equal(result.success, false);
  if (!result.success) assert.deepEqual(result.error.issues[0].path, ["github"]);
});
