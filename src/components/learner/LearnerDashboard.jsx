import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function LearnerDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [enrolledModules, setEnrolledModules] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, [user]);

  const fetchModules = async () => {
    setLoading(true);

    const { data: modulesData } = await supabase
      .from('modules')
      .select('*, profiles(full_name)')
      .eq('published', true)
      .order('created_at', { ascending: false });

    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('module_id')
      .eq('learner_id', user.id);

    setModules(modulesData || []);
    setEnrolledModules(new Set(enrollmentsData?.map((e) => e.module_id) || []));
    setLoading(false);
  };

  const handleEnroll = async (moduleId) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert([{ learner_id: user.id, module_id: moduleId }]);

      if (error) throw error;

      setEnrolledModules(new Set([...enrolledModules, moduleId]));
      alert('Successfully enrolled!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading modules...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Available Modules</h1>
          <p className="subtitle">Explore and enroll in learning modules</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/learner/progress')} className="btn btn-secondary">
            My Progress
          </button>
          <button onClick={handleSignOut} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="empty-state">
          <p>No modules available at the moment. Check back later!</p>
        </div>
      ) : (
        <div className="modules-grid">
          {modules.map((module) => {
            const isEnrolled = enrolledModules.has(module.id);
            return (
              <div key={module.id} className="module-card learner-card">
                <div className="module-card-header">
                  <h3>{module.title}</h3>
                  <span className="instructor-name">
                    by {module.profiles?.full_name || 'Unknown'}
                  </span>
                </div>
                <p className="module-summary">
                  {module.content_summary || 'No summary available'}
                </p>
                <div className="module-actions">
                  {isEnrolled ? (
                    <button
                      onClick={() => navigate(`/learner/module/${module.id}`)}
                      className="btn btn-primary"
                    >
                      View Module
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnroll(module.id)}
                      className="btn btn-outline"
                    >
                      Enroll Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
