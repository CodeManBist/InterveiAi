export const candidate = {
    name: "Alex Morgan",
    email: "alex.morgan@hey.com",
    github: "alexmorgan",
    role: "Full Stack Developer",
    skills: ["React", "Node.js", "TypeScript", "MongoDB", "REST APIs"],
    bio: "Full stack engineer focused on product velocity, API design and pragmatic system architecture.",
  };
  
  export type InterviewRow = {
    id: string;
    role: string;
    date: string;
    questions: number;
    score: number | null;
    status: "Completed" | "In review" | "Abandoned";
  };
  
  export const interviews: InterviewRow[] = [
    { id: "iv-2841", role: "Full Stack Developer", date: "Sep 9, 2026", questions: 10, score: 82, status: "Completed" },
    { id: "iv-2790", role: "Backend Engineer", date: "Sep 4, 2026", questions: 8, score: 76, status: "Completed" },
    { id: "iv-2744", role: "Frontend Engineer", date: "Aug 28, 2026", questions: 10, score: 88, status: "Completed" },
    { id: "iv-2701", role: "Full Stack Developer", date: "Aug 21, 2026", questions: 10, score: 71, status: "Completed" },
    { id: "iv-2666", role: "Node.js Engineer", date: "Aug 14, 2026", questions: 6, score: null, status: "Abandoned" },
    { id: "iv-2610", role: "Frontend Engineer", date: "Aug 6, 2026", questions: 8, score: 79, status: "In review" },
  ];
  
  export const progress = [
    { label: "May", score: 58 },
    { label: "Jun", score: 64 },
    { label: "Jul", score: 69 },
    { label: "Aug", score: 74 },
    { label: "Sep", score: 82 },
  ];
  
  export const questions = [
    "Explain how the Node.js event loop works.",
    "How would you design a scalable REST API?",
    "How would you optimize a slow MongoDB query?",
    "Explain the difference between authentication and authorization.",
    "When would you reach for a message queue instead of a direct call?",
    "How do you prevent unnecessary re-renders in a large React tree?",
    "Describe your approach to database indexing strategy.",
    "How would you version a public API without breaking clients?",
    "Walk me through debugging a memory leak in production.",
    "How do you decide between SQL and document storage?",
  ];
  
  export const focusAreas = [
    { label: "System Design", value: 62 },
    { label: "Communication", value: 76 },
    { label: "Problem Solving", value: 88 },
  ];
  
  export const questionReview = questions.map((q, i) => ({
    index: i + 1,
    question: q,
    score: [84, 78, 90, 86, 72, 88, 80, 74, 82, 85][i],
    answer:
      "Walked through the model end to end, named the trade-offs, then grounded the answer in a production example from a recent project.",
    feedback:
      "Clear structure and correct fundamentals. Tighten the opening — lead with the conclusion before the detail.",
  }));
  