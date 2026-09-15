import { BrowserRouter, Routes, Route } from "react-router-dom";

import InterviewPage from "./pages/InterviewPage";
import ResultPage from "./pages/ResultPage";
import NewInterviewPage from "./pages/NewInterViewPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import InterviewsPage from "./pages/InterviewsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import SSOCallbackPage from "./pages/SSOCallbackPage";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/sso-callback"
          element={<SSOCallbackPage />}
        />

        <Route path="/interviews" element={<InterviewsPage />} />

        <Route path="/dashboard" element={<DashboardPage />} />

        <Route
          path="/new-interview"
          element={<NewInterviewPage />}
        />

        <Route
          path="/interview/:interviewId"
          element={<InterviewPage />}
        />

        <Route
          path="/result/:interviewId"
          element={<ResultPage />}
        />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;