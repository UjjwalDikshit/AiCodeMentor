import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '../constants';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import { ProtectedRoute, GuestRoute } from './ProtectedRoute';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import DashboardPage from '../pages/DashboardPage';
import ProgressPage from '../pages/ProgressPage';
import GoalsPage from '../pages/GoalsPage';
import ActivityPage from '../pages/ActivityPage';
import AchievementsPage from '../pages/AchievementsPage';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';
import AiChatPage from '../pages/AiChatPage';
import PromptLibraryPage from '../pages/PromptLibraryPage';
import ChatAnalyticsPage from '../pages/ChatAnalyticsPage';
import ResumeReviewPage from '../pages/ResumeReviewPage';
import CodeReviewPage from '../pages/CodeReviewPage';
import InterviewPage from '../pages/InterviewPage';
import GithubReviewPage from '../pages/GithubReviewPage';
import PlannerPage from '../pages/PlannerPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <GuestRoute>
            <AuthLayout />
          </GuestRoute>
        }
      >
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.PROGRESS} element={<ProgressPage />} />
        <Route path={ROUTES.GOALS} element={<GoalsPage />} />
        <Route path={ROUTES.ACTIVITY} element={<ActivityPage />} />
        <Route path={ROUTES.ACHIEVEMENTS} element={<AchievementsPage />} />
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        <Route path={ROUTES.PROMPT_LIBRARY} element={<PromptLibraryPage />} />
        <Route path={ROUTES.CHAT_ANALYTICS} element={<ChatAnalyticsPage />} />
        <Route path={ROUTES.RESUME_REVIEW} element={<ResumeReviewPage />} />
        <Route path="/resume/:id" element={<ResumeReviewPage />} />
        <Route path={ROUTES.CODE_REVIEW} element={<CodeReviewPage />} />
        <Route path={ROUTES.INTERVIEW} element={<InterviewPage />} />
        <Route path={ROUTES.GITHUB_REVIEW} element={<GithubReviewPage />} />
        <Route path={ROUTES.PLANNER} element={<PlannerPage />} />
        <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
      </Route>

      <Route
        path={ROUTES.AI_CHAT}
        element={
          <ProtectedRoute>
            <AiChatPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
