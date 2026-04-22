import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const SourceDetailPage = lazy(() => import('@/pages/SourceDetailPage'));
const LibraryPage = lazy(() => import('@/pages/LibraryPage'));
const ReviewPage = lazy(() => import('@/pages/ReviewPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const DeckStudyPage = lazy(() => import('@/pages/DeckStudyPage'));
const QuizPage = lazy(() => import('@/pages/QuizPage'));
const CreateDeckPage = lazy(() => import('@/pages/CreateDeckPage'));
const SharedDeckPage = lazy(() => import('@/pages/SharedDeckPage'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireGuest({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? <>{children}</> : <Navigate to="/" replace />;
}

/** / is public: logged-in users see the app home, guests see the landing page. */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <HomePage /> : <LandingPage />;
}

export default function App() {
  useOfflineSync();
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route
          path="/login"
          element={
            <RequireGuest>
              <LoginPage />
            </RequireGuest>
          }
        />
        <Route
          path="/register"
          element={
            <RequireGuest>
              <RegisterPage />
            </RequireGuest>
          }
        />
        <Route
          path="/sources"
          element={
            <RequireAuth>
              <LibraryPage />
            </RequireAuth>
          }
        />
        <Route
          path="/sources/:id"
          element={
            <RequireAuth>
              <SourceDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/review"
          element={
            <RequireAuth>
              <ReviewPage />
            </RequireAuth>
          }
        />
        <Route
          path="/decks/new"
          element={
            <RequireAuth>
              <CreateDeckPage />
            </RequireAuth>
          }
        />
        <Route
          path="/deck/:deckId/study"
          element={
            <RequireAuth>
              <DeckStudyPage />
            </RequireAuth>
          }
        />
        <Route
          path="/deck/:deckId/quiz"
          element={
            <RequireAuth>
              <QuizPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route path="/s/:shareId" element={<SharedDeckPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
