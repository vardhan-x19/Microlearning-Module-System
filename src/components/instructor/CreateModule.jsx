import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AIQuizGenerator from './AIQuizGenerator';

export default function CreateModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [moduleData, setModuleData] = useState({
    title: '',
    videoUrl: '',
    pdfUrl: '',
    animatedContentUrl: '',
    contentSummary: '',
  });
  const [currentModuleId, setCurrentModuleId] = useState(null);
  const [showQuizGenerator, setShowQuizGenerator] = useState(false);

  const handleInputChange = (field, value) => {
    setModuleData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'video') {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        if (duration > 600) {
          setError('Video must be 10 minutes or less');
          return;
        }
      };
      video.src = URL.createObjectURL(file);
    }

    const url = URL.createObjectURL(file);
    const field = type === 'video' ? 'videoUrl' : type === 'pdf' ? 'pdfUrl' : 'animatedContentUrl';
    handleInputChange(field, url);
  };

  const handleSaveDraft = async () => {
    if (!moduleData.title.trim()) {
      setError('Please enter a module title');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (currentModuleId) {
        const { error: updateError } = await supabase
          .from('modules')
          .update({
            title: moduleData.title,
            video_url: moduleData.videoUrl,
            pdf_url: moduleData.pdfUrl,
            animated_content_url: moduleData.animatedContentUrl,
            content_summary: moduleData.contentSummary,
          })
          .eq('id', currentModuleId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('modules')
          .insert([
            {
              instructor_id: user.id,
              title: moduleData.title,
              video_url: moduleData.videoUrl,
              pdf_url: moduleData.pdfUrl,
              animated_content_url: moduleData.animatedContentUrl,
              content_summary: moduleData.contentSummary,
              published: false,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        setCurrentModuleId(data.id);
      }

      alert('Module saved as draft');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!currentModuleId) {
      setError('Please save the module first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('modules')
        .update({ published: true })
        .eq('id', currentModuleId);

      if (updateError) throw updateError;

      alert('Module published successfully!');
      navigate('/instructor/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Create New Module</h1>
        <button onClick={() => navigate('/instructor/dashboard')} className="btn btn-secondary">
          Back to Dashboard
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="create-module-layout">
        <div className="module-form-section">
          <div className="card">
            <h2>Module Details</h2>

            <div className="form-group">
              <label htmlFor="title">Module Title *</label>
              <input
                id="title"
                type="text"
                value={moduleData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter module title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="video">Upload Video (Max 10 minutes)</label>
              <input
                id="video"
                type="file"
                accept="video/*"
                onChange={(e) => handleFileUpload(e, 'video')}
              />
              {moduleData.videoUrl && (
                <div className="file-preview">
                  <span>Video uploaded</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="pdf">Upload PDF</label>
              <input
                id="pdf"
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileUpload(e, 'pdf')}
              />
              {moduleData.pdfUrl && (
                <div className="file-preview">
                  <span>PDF uploaded</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="animated">Upload Animated Content</label>
              <input
                id="animated"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(e, 'animated')}
              />
              {moduleData.animatedContentUrl && (
                <div className="file-preview">
                  <span>Animated content uploaded</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="summary">Content Summary</label>
              <textarea
                id="summary"
                value={moduleData.contentSummary}
                onChange={(e) => handleInputChange('contentSummary', e.target.value)}
                placeholder="Brief summary of the module content"
                rows={4}
              />
            </div>

            <div className="form-actions">
              <button
                onClick={handleSaveDraft}
                className="btn btn-secondary"
                disabled={loading}
              >
                Save Draft
              </button>
              <button
                onClick={() => setShowQuizGenerator(true)}
                className="btn btn-primary"
                disabled={!currentModuleId}
              >
                Generate AI Quiz
              </button>
            </div>
          </div>
        </div>

        {showQuizGenerator && currentModuleId && (
          <div className="quiz-generator-section">
            <AIQuizGenerator
              moduleId={currentModuleId}
              onComplete={handlePublish}
              onClose={() => setShowQuizGenerator(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
