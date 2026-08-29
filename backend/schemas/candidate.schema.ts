import { z } from "zod";

const experienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  duration: z.string(),
  description: z.string(),
});

const projectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
});

export const candidateProfileSchema = z.object({
  name: z.string(),

  summary: z.string(),

  skills: z.array(z.string()),

  experience: z.array(experienceSchema),

  projects: z.array(projectSchema),

  education: z.array(z.string()),

  certifications: z.array(z.string()),
});

export type CandidateProfile = z.infer<
  typeof candidateProfileSchema
>;