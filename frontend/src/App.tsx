import { BrowserRouter, Routes, Route } from "react-router-dom";
import PreInterviewPage from "./pages/PreInterviewPage";
import Result from "./pages/Result";
import Interview from "./pages/Interview";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PreInterviewPage />} />
        <Route path="/interview/:interviewId" element={<Interview />} />
        <Route path="/result/:interviewId" element={<Result />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
