# InterviewAI - AI-Powered Technical Interview Platform

A full-stack web application that conducts real-time technical interviews using Google's Gemini Live API, analyzes resumes, evaluates performance, and provides detailed feedback.

## 🎯 Project Overview

InterviewAI is an automated technical interview platform that:
- Accepts resume uploads and GitHub profile integration
- Conducts real-time voice-based interviews using Gemini Live API
- Evaluates technical knowledge, communication skills, and problem-solving abilities
- Provides structured scoring and detailed feedback
- Delivers professional result analysis with strengths and improvement areas

---

## 🏗️ Project Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  React SPA (Vite)                                      │    │
│  │  ├── PreInterviewPage    (Resume & GitHub Upload)     │    │
│  │  ├── Interview          (Live Voice Interview)        │    │
│  │  └── Result             (Score & Feedback Display)    │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP/REST
                       │ WebSocket (Gemini Live)
                       ▼
        ┌──────────────────────────────┐
        │   EXPRESS BACKEND (Node.js)  │
        │                              │
        │  ├── API Routes             │
        │  ├── Resume Parser          │
        │  ├── GitHub Integration     │
        │  ├── Gemini Services        │
        │  └── Interview Evaluator    │
        │                              │
        └──────────────┬───────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
      ┌────────────────┐  ┌──────────────────┐
      │   MongoDB      │  │ Gemini Live API  │
      │   Database     │  │                  │
      │                │  │ - Live Q&A       │
      │ ├── Interviews │  │ - Audio I/O      │
      │ ├── Scores     │  │ - Streaming      │
      │ └── Messages   │  │                  │
      └────────────────┘  └──────────────────┘
                                  │
                                  │ Ephemeral Token
                                  │
                          ┌───────▼────────┐
                          │ Google Gemini  │
                          │ 3.1 Flash Live │
                          └────────────────┘
```

### Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    INTERVIEW WORKFLOW                        │
└──────────────────────────────────────────────────────────────┘

1. RESUME SUBMISSION (PreInterviewPage)
   ├── User uploads resume (PDF/DOC)
   ├── User enters GitHub username
   └── POST /pre-interview
       │
       ├─► Parse Resume (Gemini)
       │   └── Extract: name, skills, experience, education
       │
       └─► Fetch GitHub Repositories (GitHub API)
           └── Extract: repos, languages, topics, stars

2. INTERVIEW PREPARATION (Backend)
   └── Create Interview document
       ├── candidateProfile (from resume)
       ├── githubRepositories (from GitHub API)
       ├── messages: [] (empty initially)
       ├── status: "ready"
       └── questionCount: 0

3. INTERVIEW SESSION (Interview.tsx)
   ├── GET /live-token
   │   └── Backend returns ephemeral Gemini token
   │
   ├── Connect to Gemini Live WebSocket
   │   └── Send candidate context
   │
   ├── INTERVIEW LOOP (repeats up to 10 questions):
   │   ├── Gemini asks question (audio)
   │   ├── User speaks answer (microphone)
   │   ├── POST /interview/:id/messages (save AI question)
   │   │   └── questionCount++ 
   │   ├── POST /interview/:id/messages (save user answer)
   │   │   └── No increment
   │   └── Poll GET /interview/:id (every 2 seconds)
   │       └── Check if questionCount reached 10
   │
   └── POST /interview/:id/complete
       ├── Validate questionCount == 10
       ├── Evaluator analyzes interview
       │   └── Send all messages to Gemini 3.5 Flash
       │       └── Score: overall, technical, communication, problem-solving
       │       └── Feedback & strengths/weaknesses
       └── Update status: "completed"

4. RESULTS DISPLAY (Result.tsx)
   ├── GET /interview/:id
   ├── Display scores with progress bars
   ├── Show strengths and improvement areas
   └── Display detailed feedback
```

---

## 📋 Data Models

### Interview Model (MongoDB)

```typescript
{
  // Candidate Information from Resume
  candidateProfile: {
    name: string
    summary: string
    github: string
    skills: string[]
    technologies: string[]
    experience: {
      company: string
      role: string
      duration: string
      description: string
    }[]
    projects: {
      name: string
      description: string
      technologies: string[]
    }[]
    education: {
      degree: string
      institution: string
      duration: string
      details: string
    }[]
    certifications: string[]
  }

  // GitHub Repositories Data
  githubRepositories: {
    name: string
    description: string
    language: string
    topics: string[]
    stars: number
    url: string
  }[]

  // Interview Conversation
  messages: {
    role: "ai" | "user"
    type: "question" | "answer" | "greeting"
    content: string
    timestamp: Date
  }[]

  // Evaluation Scores (after completion)
  score: {
    overall: number (0-100)
    technical: number (0-100)
    communication: number (0-100)
    problemSolving: number (0-100)
    feedback: string
    strengths: string[]
    weaknesses: string[]
  }

  // Interview Status
  status: "processing" | "ready" | "in-progress" | "completed"
  questionCount: number (0-10)
  timestamps: {
    createdAt: Date
    updatedAt: Date
  }
}
```

---

## 📁 Project Structure

```
InterviewAi/
├── backend/                          # Express.js Server
│   ├── index.ts                      # Main server & API routes
│   ├── db.ts                         # MongoDB connection
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                          # Environment variables
│   │
│   ├── models/
│   │   └── Interview.model.ts        # Interview MongoDB schema
│   │
│   ├── schemas/
│   │   ├── interview.schem.ts        # Zod validation schema
│   │   ├── candidate.schema.ts
│   │   └── messaage.schema.ts        # Message validation
│   │
│   ├── services/
│   │   ├── gemini.service.ts         # Resume parsing & evaluation
│   │   ├── gemini-live.service.ts    # Ephemeral token generation
│   │   ├── github.service.ts         # GitHub API integration
│   │   └── evaluate-interview.service.ts  # Final interview scoring
│   │
│   └── middleware/
│       └── upload.ts                 # Multer file upload config
│
└── frontend/                         # React SPA with Vite
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── components.json
    │
    ├── src/
    │   ├── App.tsx                   # Main app with routing
    │   ├── main.tsx                  # Entry point
    │   ├── index.css                 # Global styles
    │   │
    │   ├── pages/
    │   │   ├── PreInterviewPage.tsx  # Resume upload & GitHub username
    │   │   ├── Interview.tsx         # Live interview interface
    │   │   └── Result.tsx            # Results & score display
    │   │
    │   ├── components/
    │   │   ├── Form.tsx
    │   │   ├── common/               # Common components
    │   │   └── ui/                   # UI primitives (Button, Card, Input)
    │   │
    │   ├── lib/
    │   │   └── utils.ts              # Utility functions
    │   │
    │   └── utils/
    │       ├── geminiWebSocket.ts    # WebSocket connection to Gemini Live
    │       └── mediaUtils.ts         # Audio streaming (AudioStreamer, AudioPlayer)
    │
    └── public/
        └── audio-processors/
            ├── capture.worklet.js    # Microphone audio worklet
            └── playback.worklet.js   # Speaker audio worklet
```

---

## 🔌 API Endpoints

### 1. **Create Pre-Interview Session**
```http
POST /pre-interview
Content-Type: multipart/form-data

Parameters:
- resume: File (PDF/DOC) - Resume document
- githubUsername: string - GitHub username

Response (201):
{
  "message": "Pre-interview data processed",
  "interviewId": "507f1f77bcf86cd799439011"
}
```

### 2. **Get Interview Data**
```http
GET /interview/:interviewId

Response (200):
{
  "interviewId": "507f1f77bcf86cd799439011",
  "candidateProfile": { ... },
  "githubRepositories": [ ... ],
  "status": "ready" | "in-progress" | "completed",
  "messages": [ ... ],
  "questionCount": 0
}
```

### 3. **Start Interview**
```http
PATCH /interview/:interviewId/start

Response (200):
{
  "message": "Interview started",
  "status": "in-progress"
}
```

### 4. **Save Interview Message**
```http
POST /interview/:interviewId/messages
Content-Type: application/json

Body:
{
  "role": "ai" | "user",
  "type": "question" | "answer" | "greeting",
  "content": "message text"
}

Response (201):
{
  "message": "Interview message saved",
  "questionCount": 1
}
```

### 5. **Complete Interview & Get Evaluation**
```http
POST /interview/:interviewId/complete

Validations:
- Interview status must not be "completed"
- questionCount must equal 10

Response (200):
{
  "message": "Interview completed successfully",
  "score": {
    "overall": 78,
    "technical": 82,
    "communication": 75,
    "problemSolving": 76,
    "feedback": "Strong technical foundation with room for improvement in communication...",
    "strengths": ["Quick problem solver", "Good code structure"],
    "weaknesses": ["Could explain solutions better", "Limited system design knowledge"]
  },
  "status": "completed"
}
```

### 6. **Get Gemini Live Token**
```http
GET /live-token

Response (200):
{
  "token": "auroral-ephemeral-session-token-xyz..."
}
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | Latest | Runtime environment |
| **Express.js** | 5.2.1 | Web framework |
| **TypeScript** | 7.0.2 | Type safety |
| **MongoDB** | Cloud | Database |
| **Mongoose** | 9.9.4 | ODM |
| **Gemini API** | 2.19.0 | AI capabilities |
| **Multer** | 2.3.0 | File uploads |
| **Axios** | 1.20.0 | HTTP client |
| **Zod** | 4.5.2 | Validation |
| **CORS** | 2.8.6 | Cross-origin requests |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2.8 | UI framework |
| **TypeScript** | 7.0.2 | Type safety |
| **Vite** | 4.x | Build tool |
| **React Router** | 7.18.3 | Navigation |
| **TailwindCSS** | 4.3.3 | Styling |
| **Axios** | 1.20.0 | HTTP requests |
| **Lucide React** | 1.37.0 | Icons |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account (free tier)
- Google Gemini API key
- GitHub personal access token (optional)

### Backend Setup

1. **Clone and navigate to backend**
```bash
cd backend
npm install
```

2. **Create `.env` file**
```env
PORT=3000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
GEMINI_API_KEY=your_gemini_api_key_here
```

3. **Build TypeScript**
```bash
npm run build
```

4. **Start development server**
```bash
npm run dev
```

Server runs at `http://localhost:3000`

### Frontend Setup

1. **Navigate to frontend**
```bash
cd frontend
npm install
```

2. **Start development server**
```bash
npm run dev
```

App runs at `http://localhost:5173`

---

## ▶️ Running the Application

### Terminal 1 - Backend Server
```bash
cd backend
npm run dev
```
Output: `server running on http://localhost:3000`

### Terminal 2 - Frontend Server
```bash
cd frontend
npm run dev
```
Output: `VITE v4.x.x ready in XXX ms`

### Access Application
Open browser to: `http://localhost:5173`

---

## ✨ Features Implemented

### ✅ Pre-Interview Phase
- Resume upload with file validation
- GitHub username integration
- Resume parsing using Gemini AI
  - Extract skills, experience, projects, education
- GitHub repository fetching
  - Retrieve user's public repositories with metadata
- Beautiful onboarding UI with gradient backgrounds

### ✅ Interview Phase
- Real-time audio streaming with Gemini Live API
- Microphone capture with AudioWorklet (16kHz PCM)
- Speaker output with AudioWorklet (24kHz PCM)
- Live connection status indicator
- Microphone recording status display
- Question counter (0-10)
- Automatic interview flow management
- Real-time question count polling (every 2 seconds)
- Start/End interview controls
- Professional dark-themed interface

### ✅ Evaluation Phase
- Interview validation (must reach 10 questions)
- Intelligent evaluation using Gemini 3.5 Flash Lite
- Multi-dimensional scoring:
  - Overall score (0-100)
  - Technical knowledge (0-100)
  - Communication skills (0-100)
  - Problem-solving ability (0-100)
- Detailed feedback generation
- Strengths identification (3-5 points)
- Improvement areas identification (3-5 points)

### ✅ Results Display
- Overall score with animated progress bar
- Individual skill score breakdown
- Color-coded scores (green ≥80, yellow ≥60, red <60)
- Strengths list with checkmark icons
- Improvement areas with alert icons
- Detailed feedback with preserved formatting
- Responsive design matching interview UI

### ✅ Technical Implementation
- Full TypeScript type safety (zero compilation errors)
- REST API with comprehensive error handling
- MongoDB schema with nested subdocuments
- WebSocket integration with Gemini Live
- Audio worklet processing for real-time streaming
- Responsive design using TailwindCSS
- Component-based React architecture

---

## 🎨 UI/UX Features

- **Consistent Design**: Dark theme with violet accents across all pages
- **Professional Styling**: Glass-morphism cards, gradient backgrounds
- **Responsive Layout**: Works on desktop and tablet devices
- **Smooth Animations**: Transitions and loading states
- **Accessibility**: Proper button states, error messages
- **Real-time Feedback**: Connection status, mic indicators, progress display

---

## 🔮 Future Improvements & Enhancements

### Phase 1: Core Features Enhancement
- [ ] **Multiple Interview Types**
  - Behavioral interviews
  - System design interviews
  - Algorithm-focused sessions
  - Role-specific question sets

- [ ] **Difficulty Levels**
  - Beginner, Intermediate, Advanced
  - Adaptive difficulty based on performance
  - Custom difficulty selection

- [ ] **Language Support**
  - Multi-language interviews
  - Interview in candidate's preferred language
  - Question translation capability

### Phase 2: Advanced Scoring & Analytics
- [ ] **Detailed Analytics Dashboard**
  - Performance metrics over time
  - Comparison with other candidates
  - Skill-wise performance breakdown
  - Improvement trajectory

- [ ] **Advanced Evaluation Metrics**
  - Response time analysis
  - Speaking pace and clarity metrics
  - Confidence level detection
  - Code writing evaluation (for coding rounds)

- [ ] **AI-Powered Insights**
  - Personalized improvement recommendations
  - Learning resource suggestions
  - Peer benchmarking
  - Career guidance based on strengths/weaknesses

### Phase 3: Recording & Playback
- [ ] **Interview Recording**
  - Full video/audio recording of interview
  - Cloud storage integration (AWS S3, Google Cloud)
  - Interview replay capability
  - Highlight key moments

- [ ] **Sharing & Reporting**
  - PDF report generation
  - Share results with recruiters
  - Interview statistics export
  - Email integration for score delivery

### Phase 4: Admin & Recruiter Portal
- [ ] **Recruiter Dashboard**
  - Candidate management
  - Interview scheduling
  - Batch interview creation
  - Candidate pool analysis

- [ ] **Interview Management**
  - Custom question templates
  - Interview configuration per role
  - Bulk operations
  - Reporting and analytics

- [ ] **Integration with ATS**
  - LinkedIn integration
  - Job board APIs
  - Applicant tracking system sync

### Phase 5: User Experience Enhancements
- [ ] **Practice Mode**
  - Mock interviews without evaluation
  - Practice with sample questions
  - Feedback on practice sessions

- [ ] **Improvements**
  - Video interview mode (webcam)
  - Screen sharing for coding interviews
  - Code editor integration
  - Real-time code compilation

- [ ] **Notifications & Reminders**
  - Email notifications for scheduled interviews
  - Interview completion reminders
  - Result delivery notifications

### Phase 6: Performance & Scalability
- [ ] **Performance Optimization**
  - WebSocket connection pooling
  - Message compression
  - Cache layer (Redis)
  - CDN for static assets

- [ ] **Scalability**
  - Horizontal scaling for API servers
  - Load balancing
  - Database optimization and indexing
  - Rate limiting and throttling

- [ ] **Mobile Application**
  - Native mobile app (iOS/Android)
  - Mobile-optimized interview experience
  - Offline support

### Phase 7: Security & Compliance
- [ ] **Enhanced Security**
  - End-to-end encryption for recordings
  - Data encryption at rest and in transit
  - Role-based access control (RBAC)
  - Audit logging

- [ ] **Compliance**
  - GDPR compliance
  - Data retention policies
  - Interview data anonymization
  - Compliance reporting

### Phase 8: Advanced AI Features
- [ ] **Natural Language Processing**
  - Sentiment analysis of responses
  - Emotion detection
  - Technical terminology usage analysis

- [ ] **Machine Learning**
  - Predictive performance scoring
  - Pattern recognition in answers
  - Anomaly detection
  - Interview difficulty optimization

- [ ] **Integration with Multiple AI Models**
  - OpenAI GPT integration
  - Claude AI support
  - Model selection based on interview type
  - Fallback mechanisms

---

## 🧪 Testing (TODO)

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test

# E2E tests
npm run test:e2e
```

---

## 📝 Environment Variables

### Backend (.env)
```env
PORT=3000
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/?appName=Cluster0
GEMINI_API_KEY=your_api_key_here
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

---

## 🐛 Known Limitations

1. **Interview Duration**: Fixed to exactly 10 questions
2. **Audio Format**: Limited to PCM16 16kHz (microphone) and 24kHz (Gemini output)
3. **Resume Formats**: Currently supports PDF and DOC files
4. **GitHub Integration**: Public repositories only
5. **Concurrent Interviews**: Single interview per session
6. **Recording**: No built-in recording (future enhancement)

---

## 📚 Additional Documentation

- **Backend Architecture**: See `backend/` folder structure
- **Frontend Components**: See `frontend/src/` folder structure
- **Database Schema**: See models in `backend/models/`
- **API Routes**: See endpoints in `backend/index.ts`

---

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Build and test locally
4. Submit pull request with clear description

---

## 📄 License

ISC License

---

## 👨‍💻 Development Notes

### Build Commands

**Backend:**
```bash
npm run build    # Compile TypeScript
npm run dev      # Development with watch mode
npm start        # Run compiled JavaScript
```

**Frontend:**
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

### Debugging

**Backend Logs**: Check terminal where `npm run dev` is running
**Frontend Console**: Open browser DevTools (F12) and check Console tab
**Network Tab**: Use DevTools Network tab to inspect API calls

---

## 🔗 Related Resources

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Gemini Live API](https://ai.google.dev/docs/gemini_api_guide)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)
- [React 19 Documentation](https://react.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

---

## 📞 Support

For issues or questions:
1. Check existing documentation
2. Review error messages carefully
3. Check backend logs at port 3000
4. Check frontend console (F12)

---

**Last Updated**: September 2026  
**Project Status**: ✅ Fully Functional (Version 1.0)