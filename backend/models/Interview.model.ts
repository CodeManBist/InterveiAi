import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["ai", "user"],
    required: true,
  },

  type: {
    type: String,
    enum: ["question", "answer", "greeting"],
    required: true,
  },

  content: {
    type: String,
    required: true,
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const experienceSchema = new mongoose.Schema(
  {
    company: String,
    role: String,
    duration: String,
    description: String,
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    degree: String,
    institution: String,
    duration: String,
    details: String,
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    technologies: [String],
  },
  { _id: false }
);

const githubRepositorySchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    language: String,
    topics: [String],
    stars: Number,
    url: String,
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    candidateProfile: {
      name: String,

      summary: String,

      github: String,

      skills: [String],

      technologies: [String],

      experience: [experienceSchema],

      projects: [projectSchema],

      education: [educationSchema],

      certifications: [String],
    },

    githubRepositories: [githubRepositorySchema],

    messages: [messageSchema],

    score: {
      overall: Number,
      technical: Number,
      communication: Number,
      problemSolving: Number,
      feedback: String,
      strengths: [String],
      weaknesses: [String],
    },

    status: {
      type: String,
      enum: [
        "processing",
        "ready",
        "in-progress",
        "completed",
      ],
      default: "processing",
    },

    questionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Interview = mongoose.model(
  "Interview",
  interviewSchema
);

export default Interview;