import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import Interview from "../models/Interview.model.ts";
import User from "../models/User.model.ts";
import { candidateProfileSchema } from "../schemas/candidate.schema.ts";

const candidate = {
  name: "Ada Lovelace",
  summary: "Engineer",
  skills: ["TypeScript"],
  technologies: ["Node.js"],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
};

describe("candidateProfileSchema GitHub field", () => {
  it("accepts both an omitted and a populated GitHub profile", () => {
    expect(candidateProfileSchema.safeParse(candidate).success).toBe(true);
    expect(
      candidateProfileSchema.safeParse({ ...candidate, github: "ada" }).success,
    ).toBe(true);
  });

  it("rejects a non-string GitHub profile", () => {
    const result = candidateProfileSchema.safeParse({ ...candidate, github: 42 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["github"]);
    }
  });
});

describe("User model", () => {
  it("normalizes email and trims user-entered identity fields", () => {
    const user = new User({
      clerkUserId: "clerk_1",
      username: "  ada  ",
      email: "  ADA@EXAMPLE.TEST  ",
      firstName: "  Ada  ",
      lastName: "  Lovelace  ",
    });

    expect(user.validateSync()).toBeUndefined();
    expect(user.toObject()).toMatchObject({
      username: "ada",
      email: "ada@example.test",
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it.each(["clerkUserId", "username", "email"])(
    "requires %s",
    (field) => {
      const values: Record<string, string> = {
        clerkUserId: "clerk_1",
        username: "ada",
        email: "ada@example.test",
      };
      delete values[field];

      const error = new User(values).validateSync();

      expect(error?.errors[field]?.kind).toBe("required");
    },
  );

  it("declares unique indexes for every external identity key", () => {
    const indexes = User.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ clerkUserId: 1 }, expect.objectContaining({ unique: true })],
        [{ username: 1 }, expect.objectContaining({ unique: true })],
        [{ email: 1 }, expect.objectContaining({ unique: true })],
      ]),
    );
  });
});

describe("Interview ownership model", () => {
  it("requires a valid owner reference", () => {
    const withoutOwner = new Interview({ candidateProfile: candidate });
    const invalidOwner = new Interview({ userId: "not-an-object-id" });

    expect(withoutOwner.validateSync()?.errors.userId?.kind).toBe("required");
    expect(invalidOwner.validateSync()?.errors.userId?.name).toBe("CastError");
  });

  it("stores the owner as an indexed User ObjectId reference", () => {
    const path = Interview.schema.path("userId") as mongoose.SchemaType & {
      options: { ref?: string; index?: boolean };
    };

    expect(path.instance).toBe("ObjectId");
    expect(path.options.ref).toBe("User");
    expect(path.options.index).toBe(true);
  });
});
