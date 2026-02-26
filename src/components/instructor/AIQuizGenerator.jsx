import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AIQuizGenerator({ moduleId, onComplete, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateQuiz = () => {
    setLoading(true);
    setError('');

    setTimeout(() => {
      const sampleQuestions = [
        {
          question_text: 'What is the main topic of this module?',
          option_a: 'Frontend Development',
          option_b: 'Backend Development',
          option_c: 'Database Management',
          option_d: 'DevOps',
          correct_answer: 'A',
          explanation: 'This module focuses on frontend development concepts and practices.',
        },
        {
          question_text: 'Which of the following is a key concept in this module?',
          option_a: 'Responsive Design',
          option_b: 'Server Configuration',
          option_c: 'Network Security',
          option_d: 'Data Mining',
          correct_answer: 'A',
          explanation: 'Responsive design is a fundamental concept covered in this module.',
        },
        {
          question_text: 'What tool is recommended for this topic?',
          option_a: 'React',
          option_b: 'Django',
          option_c: 'Docker',
          option_d: 'Jenkins',
          correct_answer: 'A',
          explanation: 'React is the recommended tool for building interactive user interfaces.',
        },
      ];

      setQuestions(sampleQuestions);
      setLoading(false);
    }, 1500);
  };

  const handleQuestionEdit = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        explanation: '',
      },
    ]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const saveQuiz = async () => {
    if (questions.length === 0) {
      setError('Please generate or add at least one question');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert([{ module_id: moduleId, ai_prompt: prompt }])
        .select()
        .single();

      if (quizError) throw quizError;

      const questionsToInsert = questions.map((q, index) => ({
        quiz_id: quizData.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        order_number: index,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      alert('Quiz saved successfully!');
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card quiz-generator">
      <div className="card-header">
        <h2>AI Quiz Generator</h2>
        <button onClick={onClose} className="btn-icon">×</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="prompt">AI Prompt</label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the type of questions you want to generate..."
          rows={3}
        />
      </div>

      <button
        onClick={generateQuiz}
        className="btn btn-primary"
        disabled={loading || !prompt.trim()}
      >
        {loading ? 'Generating...' : 'Generate Questions'}
      </button>

      {questions.length > 0 && (
        <div className="questions-list">
          <div className="questions-header">
            <h3>Quiz Questions</h3>
            <button onClick={addQuestion} className="btn btn-secondary btn-sm">
              + Add Question
            </button>
          </div>

          {questions.map((question, index) => (
            <div key={index} className="question-card">
              <div className="question-header">
                <span className="question-number">Question {index + 1}</span>
                <button
                  onClick={() => removeQuestion(index)}
                  className="btn-icon btn-danger"
                >
                  ×
                </button>
              </div>

              <div className="form-group">
                <label>Question Text</label>
                <input
                  type="text"
                  value={question.question_text}
                  onChange={(e) =>
                    handleQuestionEdit(index, 'question_text', e.target.value)
                  }
                  placeholder="Enter question"
                />
              </div>

              <div className="options-grid">
                {['a', 'b', 'c', 'd'].map((opt) => (
                  <div key={opt} className="form-group">
                    <label>Option {opt.toUpperCase()}</label>
                    <input
                      type="text"
                      value={question[`option_${opt}`]}
                      onChange={(e) =>
                        handleQuestionEdit(index, `option_${opt}`, e.target.value)
                      }
                      placeholder={`Option ${opt.toUpperCase()}`}
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Correct Answer</label>
                <select
                  value={question.correct_answer}
                  onChange={(e) =>
                    handleQuestionEdit(index, 'correct_answer', e.target.value)
                  }
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div className="form-group">
                <label>Explanation</label>
                <textarea
                  value={question.explanation}
                  onChange={(e) =>
                    handleQuestionEdit(index, 'explanation', e.target.value)
                  }
                  placeholder="Explain the correct answer"
                  rows={2}
                />
              </div>
            </div>
          ))}

          <button onClick={saveQuiz} className="btn btn-success" disabled={loading}>
            {loading ? 'Saving...' : 'Save Quiz & Publish Module'}
          </button>
        </div>
      )}
    </div>
  );
}
