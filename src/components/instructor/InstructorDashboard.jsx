import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function InstructorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalEnrolled: 0,
    averageScore: 0,
    passRate: 0,
    completionPercentage: 0,
  });
  const [studentScores, setStudentScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);

    const { data: modulesData } = await supabase
      .from('modules')
      .select('*')
      .eq('instructor_id', user.id)
      .order('created_at', { ascending: false });

    setModules(modulesData || []);

    if (modulesData && modulesData.length > 0) {
      const moduleIds = modulesData.map((m) => m.id);

      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('*, profiles(full_name, email)')
        .in('module_id', moduleIds);

      const { data: attemptsData } = await supabase
        .from('quiz_attempts')
        .select('*, profiles(full_name, email), modules(title)')
        .in('module_id', moduleIds);

      const totalEnrolled = enrollmentsData?.length || 0;

      let totalScore = 0;
      let passCount = 0;
      let completionCount = 0;

      const scoresMap = new Map();

      if (attemptsData && attemptsData.length > 0) {
        attemptsData.forEach((attempt) => {
          const percentage = (attempt.score / attempt.total_questions) * 100;
          totalScore += percentage;
          if (percentage >= 60) passCount++;
          completionCount++;

          const key = `${attempt.learner_id}-${attempt.module_id}`;
          if (!scoresMap.has(key) || scoresMap.get(key).score < attempt.score) {
            scoresMap.set(key, {
              studentName: attempt.profiles?.full_name || 'Unknown',
              studentEmail: attempt.profiles?.email || '',
              moduleName: attempt.modules?.title || 'Unknown Module',
              score: attempt.score,
              totalQuestions: attempt.total_questions,
              percentage: percentage.toFixed(1),
              completedAt: new Date(attempt.completed_at).toLocaleDateString(),
            });
          }
        });
      }

      setStudentScores(Array.from(scoresMap.values()));

      setAnalytics({
        totalEnrolled,
        averageScore: attemptsData?.length > 0 ? (totalScore / attemptsData.length).toFixed(1) : 0,
        passRate: attemptsData?.length > 0 ? ((passCount / attemptsData.length) * 100).toFixed(1) : 0,
        completionPercentage: totalEnrolled > 0 ? ((completionCount / totalEnrolled) * 100).toFixed(1) : 0,
      });
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Instructor Dashboard</h1>
          <p className="subtitle">Manage your modules and track student progress</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/instructor/create')} className="btn btn-primary">
            + Create Module
          </button>
          <button onClick={handleSignOut} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{analytics.totalEnrolled}</div>
            <div className="stat-label">Total Enrolled Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{analytics.averageScore}%</div>
            <div className="stat-label">Average Score</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{analytics.passRate}%</div>
            <div className="stat-label">Pass Rate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{analytics.completionPercentage}%</div>
            <div className="stat-label">Completion Percentage</div>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Your Modules</h2>
        {modules.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any modules yet.</p>
            <button onClick={() => navigate('/instructor/create')} className="btn btn-primary">
              Create Your First Module
            </button>
          </div>
        ) : (
          <div className="modules-grid">
            {modules.map((module) => (
              <div key={module.id} className="module-card">
                <h3>{module.title}</h3>
                <p className="module-summary">{module.content_summary || 'No summary available'}</p>
                <div className="module-meta">
                  <span className={`status-badge ${module.published ? 'published' : 'draft'}`}>
                    {module.published ? 'Published' : 'Draft'}
                  </span>
                  <span className="date">
                    {new Date(module.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {studentScores.length > 0 && (
        <div className="dashboard-section">
          <h2>Student Scores</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Module</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {studentScores.map((score, index) => (
                  <tr key={index}>
                    <td>{score.studentName}</td>
                    <td>{score.studentEmail}</td>
                    <td>{score.moduleName}</td>
                    <td>{score.score}/{score.totalQuestions}</td>
                    <td>
                      <span className={`score-badge ${parseFloat(score.percentage) >= 60 ? 'pass' : 'fail'}`}>
                        {score.percentage}%
                      </span>
                    </td>
                    <td>{score.completedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
