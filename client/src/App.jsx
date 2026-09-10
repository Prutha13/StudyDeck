import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/AppShell';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import Dashboard from './pages/Dashboard';
import DocumentDetail from './pages/DocumentDetail';
import Quiz from './pages/Quiz';
import Flashcards from './pages/Flashcards';
import KnowledgeMap from './pages/KnowledgeMap';
import MistakeBook from './pages/MistakeBook';
import FixWeakness from './pages/FixWeakness';
import DailyReview from './pages/DailyReview';
import Pricing from './pages/Pricing';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import Billing from './pages/Billing';
import Profile from './pages/Profile';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route
              path="/payment/success"
              element={
                <PrivateRoute>
                  <PaymentSuccess />
                </PrivateRoute>
              }
            />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route
              element={
                <PrivateRoute>
                  <AppShell />
                </PrivateRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/knowledge-map" element={<KnowledgeMap />} />
              <Route path="/mistake-book" element={<MistakeBook />} />
              <Route path="/fix-weakness" element={<FixWeakness />} />
              <Route path="/daily-review" element={<DailyReview />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings/billing" element={<Billing />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/documents/:id" element={<DocumentDetail />} />
              <Route path="/documents/:id/quiz" element={<Quiz />} />
              <Route path="/documents/:id/flashcards" element={<Flashcards />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
