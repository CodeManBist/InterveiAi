import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["ai", "user"],
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

const projectSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    technologies: [String],
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

      experience: [experienceSchema],

      projects: [projectSchema],

      education: [String],

      certifications: [String],
    },

    messages: [messageSchema],

    score: {
      overall: Number,
      technical: Number,
      communication: Number,
      problemSolving: Number,
      feedback: String,
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