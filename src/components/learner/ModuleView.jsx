import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ModuleView() {
  const { moduleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    fetchModuleData();
  }, [moduleId, user]);

  const fetchModuleData = async () => {
    setLoading(true);

    const { data: moduleData } = await supabase
      .from('modules')
      .select('*, profiles(full_name)')
      .eq('id', moduleId)
      .single();

    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('*')
      .eq('learner_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle();

    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('module_id', moduleId)
      .maybeSingle();

    setModule(moduleData);
    setEnrolled(!!enrollmentData);
    setQuiz(quizData);
    setLoading(false);

    if (!enrollmentData) {
      alert('Please enroll in this module first');
      navigate('/learner/dashboard');
    }
  };

  const handleStartQuiz = () => {
    if (quiz) {
      navigate(`/learner/quiz/${quiz.id}`);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading module...</div>
      </div>
    );
  }

  if (!module || !enrolled) {
    return null;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{module.title}</h1>
          <p className="subtitle">by {module.profiles?.full_name || 'Unknown'}</p>
        </div>
        <button onClick={() => navigate('/learner/dashboard')} className="btn btn-secondary">
          Back to Modules
        </button>
      </div>

      <div className="module-content-layout">
        {module.video_url && (
          <div className="content-section">
            <h2>Video Lecture</h2>
            <div className="video-player">
              <video controls width="100%">
                <source src={module.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {module.pdf_url && (
          <div className="content-section">
            <h2>Course Material (PDF)</h2>
            <div className="pdf-viewer">
              <iframe
                src={module.pdf_url}
                width="100%"
                height="600px"
                title="Course PDF"
              />
            </div>
          </div>
        )}

        {module.animated_content_url && (
          <div className="content-section">
            <h2>Animated Content</h2>
            <div className="animated-content">
              <img
                src={module.animated_content_url}
                alt="Animated content"
                style={{ maxWidth: '100%' }}
              />
            </div>
          </div>
        )}

        <div className="content-section">
          <h2>Content Summary</h2>
          <div className="summary-box">
            <p>{module.content_summary || 'No summary available'}</p>
          </div>
        </div>

        {quiz && (
          <div className="content-section quiz-section">
            <h2>Quiz Assessment</h2>
            <p>Test your understanding of the module content</p>
            <button onClick={handleStartQuiz} className="btn btn-primary btn-lg">
              Start Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
