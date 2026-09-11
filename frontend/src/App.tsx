import { BrowserRouter, Routes, Route } from "react-router-dom";
import InterviewPage from "./pages/InterviewPage";
import ResultPage from "./pages/ResultPage";
import NewInterviewPage from "./pages/NewInterViewPage";
import LandingPage from "./pages/LandingPage";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/new-interview" element={<NewInterviewPage />} />
        <Route path="/interview/:interviewId" element={<InterviewPage />} />
        <Route path="/result/:interviewId" element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
