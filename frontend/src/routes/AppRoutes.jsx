import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '../constants';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import ProfilePage from '../pages/ProfilePage';
import AiChatPage from '../pages/AiChatPage';
import ResumeReviewPage from '../pages/ResumeReviewPage';
import CodeReviewPage from '../pages/CodeReviewPage';
import InterviewPage from '../pages/InterviewPage';
import PlannerPage from '../pages/PlannerPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
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
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        <Route path={ROUTES.AI_CHAT} element={<AiChatPage />} />
        <Route path={ROUTES.RESUME_REVIEW} element={<ResumeReviewPage />} />
        <Route path={ROUTES.CODE_REVIEW} element={<CodeReviewPage />} />
        <Route path={ROUTES.INTERVIEW} element={<InterviewPage />} />
        <Route path={ROUTES.PLANNER} element={<PlannerPage />} />
        <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
