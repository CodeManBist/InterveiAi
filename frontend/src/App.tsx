import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PreInterviewPage from "./pages/PreInterviewPage";
import Result from "./pages/Result";
import Interview from "./pages/Interview";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PreInterviewPage />} />
        <Route path="/result" element={<Result />} />
        <Route path="/interview" element={<Interview />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
