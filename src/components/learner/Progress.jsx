import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Progress() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [myAttempts, setMyAttempts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [stats, setStats] = useState({
    completionPercentage: 0,
    averageScore: 0,
    totalModules: 0,
    completedModules: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
  }, [user]);

  const fetchProgressData = async () => {
    setLoading(true);

    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('module_id')
      .eq('learner_id', user.id);

    const totalModules = enrollmentsData?.length || 0;

    const { data: attemptsData } = await supabase
      .from('quiz_attempts')
      .select('*, modules(title)')
      .eq('learner_id', user.id)
      .order('completed_at', { ascending: false });

    setMyAttempts(attemptsData || []);

    const completedModulesSet = new Set(attemptsData?.map((a) => a.module_id) || []);
    const completedModules = completedModulesSet.size;

    let totalScore = 0;
    if (attemptsData && attemptsData.length > 0) {
      attemptsData.forEach((attempt) => {
        totalScore += (attempt.score / attempt.total_questions) * 100;
      });
    }

    const averageScore = attemptsData?.length > 0 ? totalScore / attemptsData.length : 0;

    setStats({
      completionPercentage: totalModules > 0 ? (completedModules / totalModules) * 100 : 0,
      averageScore: averageScore,
      totalModules: totalModules,
      completedModules: completedModules,
    });

    const { data: allAttemptsData } = await supabase
      .from('quiz_attempts')
      .select('learner_id, score, total_questions, profiles(full_name)');

    if (allAttemptsData) {
      const learnerScores = {};

      allAttemptsData.forEach((attempt) => {
        const percentage = (attempt.score / attempt.total_questions) * 100;
        if (!learnerScores[attempt.learner_id]) {
          learnerScores[attempt.learner_id] = {
            learnerId: attempt.learner_id,
            learnerName: attempt.profiles?.full_name || 'Unknown',
            totalScore: 0,
            attemptCount: 0,
          };
        }
        learnerScores[attempt.learner_id].totalScore += percentage;
        learnerScores[attempt.learner_id].attemptCount += 1;
      });

      const leaderboardData = Object.values(learnerScores)
        .map((learner) => ({
          ...learner,
          averageScore: learner.totalScore / learner.attemptCount,
        }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 10);

      setLeaderboard(leaderboardData);

      const userRankIndex = leaderboardData.findIndex(
        (l) => l.learnerId === user.id
      );
      if (userRankIndex !== -1) {
        setMyRank(userRankIndex + 1);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading progress...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Progress</h1>
          <p className="subtitle">Track your learning journey</p>
        </div>
        <button onClick={() => navigate('/learner/dashboard')} className="btn btn-secondary">
          Back to Modules
        </button>
      </div>

      <div className="analytics-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completionPercentage.toFixed(0)}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{stats.averageScore.toFixed(1)}%</div>
            <div className="stat-label">Average Score</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <div className="stat-value">
              {stats.completedModules}/{stats.totalModules}
            </div>
            <div className="stat-label">Modules Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">
              {myRank ? `#${myRank}` : 'N/A'}
            </div>
            <div className="stat-label">Leaderboard Rank</div>
          </div>
        </div>
      </div>

      <div className="progress-layout">
        <div className="progress-section">
          <h2>Recent Quiz Attempts</h2>
          {myAttempts.length === 0 ? (
            <div className="empty-state">
              <p>No quiz attempts yet. Start learning!</p>
            </div>
          ) : (
            <div className="attempts-list">
              {myAttempts.map((attempt) => {
                const percentage = (attempt.score / attempt.total_questions) * 100;
                const passed = percentage >= 60;

                return (
                  <div key={attempt.id} className="attempt-card">
                    <div className="attempt-header">
                      <h3>{attempt.modules?.title || 'Unknown Module'}</h3>
                      <span className={`score-badge ${passed ? 'pass' : 'fail'}`}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="attempt-details">
                      <span>
                        Score: {attempt.score}/{attempt.total_questions}
                      </span>
                      <span>
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="progress-section leaderboard-section">
          <h2>Top 10 Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <div className="empty-state">
              <p>No leaderboard data yet.</p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((learner, index) => {
                const isCurrentUser = learner.learnerId === user.id;
                return (
                  <div
                    key={learner.learnerId}
                    className={`leaderboard-item ${isCurrentUser ? 'current-user' : ''}`}
                  >
                    <div className="rank">
                      {index === 0 && <span className="medal">🥇</span>}
                      {index === 1 && <span className="medal">🥈</span>}
                      {index === 2 && <span className="medal">🥉</span>}
                      {index > 2 && <span className="rank-number">#{index + 1}</span>}
                    </div>
                    <div className="learner-info">
                      <span className="learner-name">
                        {learner.learnerName}
                        {isCurrentUser && <span className="you-badge">You</span>}
                      </span>
                      <span className="attempt-count">
                        {learner.attemptCount} {learner.attemptCount === 1 ? 'quiz' : 'quizzes'}
                      </span>
                    </div>
                    <div className="leaderboard-score">
                      {learner.averageScore.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
