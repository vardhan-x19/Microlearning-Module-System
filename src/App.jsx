import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import InstructorDashboard from './components/instructor/InstructorDashboard';
import CreateModule from './components/instructor/CreateModule';
import LearnerDashboard from './components/learner/LearnerDashboard';
import ModuleView from './components/learner/ModuleView';
import Quiz from './components/learner/Quiz';
import Progress from './components/learner/Progress';
import './App.css';

function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
}

function Home() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (profile?.role === 'instructor') {
    return <Navigate to="/instructor/dashboard" />;
  }

  if (profile?.role === 'learner') {
    return <Navigate to="/learner/dashboard" />;
  }

  return <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Home />} />

          <Route
            path="/instructor/dashboard"
            element={
              <ProtectedRoute requiredRole="instructor">
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/create"
            element={
              <ProtectedRoute requiredRole="instructor">
                <CreateModule />
              </ProtectedRoute>
            }
          />

          <Route
            path="/learner/dashboard"
            element={
              <ProtectedRoute requiredRole="learner">
                <LearnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learner/module/:moduleId"
            element={
              <ProtectedRoute requiredRole="learner">
                <ModuleView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learner/quiz/:quizId"
            element={
              <ProtectedRoute requiredRole="learner">
                <Quiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learner/progress"
            element={
              <ProtectedRoute requiredRole="learner">
                <Progress />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
