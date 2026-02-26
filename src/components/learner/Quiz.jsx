import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Quiz() {
  const { quizId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [moduleId, setModuleId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    setLoading(true);

    const { data: quizData } = await supabase
      .from('quizzes')
      .select('module_id')
      .eq('id', quizId)
      .single();

    setModuleId(quizData?.module_id);

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_number');

    setQuestions(questionsData || []);
    setLoading(false);
  };

  const handleAnswerSelect = (answer) => {
    setAnswers({ ...answers, [currentIndex]: answer });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    let correctCount = 0;
    questions.forEach((question, index) => {
      if (answers[index] === question.correct_answer) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setShowResults(true);

    try {
      await supabase.from('quiz_attempts').insert([
        {
          learner_id: user.id,
          quiz_id: quizId,
          module_id: moduleId,
          score: correctCount,
          total_questions: questions.length,
          answers: answers,
        },
      ]);
    } catch (err) {
      console.error('Error saving quiz attempt:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading quiz...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>No questions available for this quiz.</p>
          <button onClick={() => navigate('/learner/dashboard')} className="btn btn-primary">
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 60;

    return (
      <div className="page-container">
        <div className="quiz-results">
          <div className={`results-card ${passed ? 'pass' : 'fail'}`}>
            <div className="results-icon">{passed ? '🎉' : '📚'}</div>
            <h1>{passed ? 'Congratulations!' : 'Keep Learning!'}</h1>
            <div className="results-score">
              <div className="score-circle">
                <span className="score-number">{percentage.toFixed(0)}%</span>
              </div>
              <p className="score-text">
                You scored {score} out of {questions.length}
              </p>
            </div>

            <div className="results-details">
              {questions.map((question, index) => {
                const userAnswer = answers[index];
                const isCorrect = userAnswer === question.correct_answer;

                return (
                  <div key={index} className={`result-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                    <div className="result-header">
                      <span className="result-number">Question {index + 1}</span>
                      <span className={`result-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="result-question">{question.question_text}</p>
                    <div className="result-answers">
                      <p>
                        <strong>Your answer:</strong> {userAnswer || 'Not answered'} - {question[`option_${userAnswer?.toLowerCase()}`]}
                      </p>
                      {!isCorrect && (
                        <p>
                          <strong>Correct answer:</strong> {question.correct_answer} - {question[`option_${question.correct_answer.toLowerCase()}`]}
                        </p>
                      )}
                      {question.explanation && (
                        <p className="explanation">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="results-actions">
              <button onClick={() => navigate('/learner/progress')} className="btn btn-primary">
                View Progress
              </button>
              <button onClick={() => navigate('/learner/dashboard')} className="btn btn-secondary">
                Back to Modules
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="page-container">
      <div className="quiz-header">
        <div>
          <h1>Quiz</h1>
          <p className="subtitle">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="quiz-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="quiz-content">
        <div className="question-card">
          <h2 className="question-text">{currentQuestion.question_text}</h2>

          <div className="options-list">
            {['A', 'B', 'C', 'D'].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                className={`option-button ${
                  answers[currentIndex] === option ? 'selected' : ''
                }`}
              >
                <span className="option-label">{option}</span>
                <span className="option-text">
                  {currentQuestion[`option_${option.toLowerCase()}`]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-navigation">
          <button
            onClick={handlePrevious}
            className="btn btn-secondary"
            disabled={currentIndex === 0}
          >
            Previous
          </button>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="btn btn-success"
              disabled={Object.keys(answers).length !== questions.length}
            >
              Submit Quiz
            </button>
          ) : (
            <button onClick={handleNext} className="btn btn-primary">
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
