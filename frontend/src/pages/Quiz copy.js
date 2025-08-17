import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Clock, 
  Award, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw,
  Eye,
  EyeOff,
  Timer,
  FileText,
  Target,
  TrendingUp,
  Calendar,
  User,
  ChevronRight,
  ChevronLeft,
  Flag,
  Save,
  Send,
  RefreshCw,
  HelpCircle,
  Star,
  MessageCircle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5555';

const Quiz = () => {
  // State management
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentAttempt, setCurrentAttempt] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState('list'); // 'list', 'taking', 'results', 'attempts'
  const [attempts, setAttempts] = useState([]);
  const [selectedAttemptResult, setSelectedAttemptResult] = useState(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [showReview, setShowReview] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Utility functions
  const getAuthToken = () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      setError('Authentication token not found. Please log in again.');
      return null;
    }
    return token;
  };

  const createAuthHeaders = () => {
    const token = getAuthToken();
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : null;
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch functions
  const fetchCourses = useCallback(async () => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/enrollments`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success && data.data?.enrollments) {
        const uniqueCourses = data.data.enrollments
          .filter(enrollment => enrollment.status === 'active')
          .map(enrollment => enrollment.course)
          .filter((course, index, self) => 
            index === self.findIndex(c => c._id === course._id)
          );
        setCourses(uniqueCourses);
      }
    } catch (err) {
      console.error('Fetch courses error:', err);
    }
  }, []);

  const fetchQuizzes = useCallback(async (courseId = null) => {
    try {
      setLoading(true);
      setError('');
      const headers = createAuthHeaders();
      if (!headers) return;

      const url = courseId 
        ? `${API_BASE_URL}/api/quizzes/course/${courseId}`
        : `${API_BASE_URL}/api/quizzes`;

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setQuizzes(data.data.quizzes || []);
      }
    } catch (err) {
      console.error('Fetch quizzes error:', err);
      setError('Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyAttempts = useCallback(async () => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      // Fixed: Use the correct endpoint
      const response = await fetch(`${API_BASE_URL}/api/quizzes/student/attempts`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setAttempts(data.data.attempts || []);
      }
    } catch (err) {
      console.error('Fetch attempts error:', err);
      setError('Failed to fetch attempts');
    }
  }, []);

  // Quiz attempt functions
  const startQuizAttempt = async (quizId) => {
    try {
      setSubmitting(true);
      setError('');
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/${quizId}/attempt`, {
        method: 'POST',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      if (data.success) {
        setQuizData(data.data.quiz);
        setCurrentAttempt({ _id: data.data.attemptId });
        setAnswers({});
        setCurrentQuestionIndex(0);
        setFlaggedQuestions(new Set());
        setMode('taking');
        
        // Start timer if quiz has time limit
        if (data.data.quiz.settings?.timeLimit) {
          const timeLimit = data.data.quiz.settings.timeLimit * 60; // Convert to seconds
          setTimeRemaining(timeLimit);
          startTimer(timeLimit);
        }
      }
    } catch (err) {
      console.error('Start quiz error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const saveAnswer = async (questionId, answer) => {
    try {
      if (!currentAttempt) return;

      const headers = createAuthHeaders();
      if (!headers) return;

      await fetch(`${API_BASE_URL}/api/quizzes/attempts/${currentAttempt._id}/answer`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          questionId,
          answer,
          timeSpent: 30 // You could track actual time spent per question
        })
      });

      // Update local answers state
      setAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }));
    } catch (err) {
      console.error('Save answer error:', err);
    }
  };

  const submitQuiz = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      if (!currentAttempt) {
        throw new Error('No active attempt found');
      }

      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/attempts/${currentAttempt._id}/submit`, {
        method: 'POST',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      if (data.success) {
        clearTimer();
        setSelectedAttemptResult(data.data);
        setMode('results');
        setSuccess('Quiz submitted successfully!');
        
        // Refresh attempts list
        await fetchMyAttempts();
      }
    } catch (err) {
      console.error('Submit quiz error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const viewAttemptResults = async (attemptId) => {
    try {
      setLoading(true);
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/attempts/${attemptId}/results`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setSelectedAttemptResult(data.data);
        setMode('results');
      }
    } catch (err) {
      console.error('Fetch results error:', err);
      setError('Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  // Timer functions
  const startTimer = (duration) => {
    clearTimer();
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearTimer();
          submitQuiz(); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerInterval(interval);
  };

  const clearTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // Navigation functions
  const goToQuestion = (index) => {
    if (index >= 0 && index < quizData.questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const toggleFlag = (questionId) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Effects
  useEffect(() => {
    fetchCourses();
    fetchQuizzes();
    fetchMyAttempts();
  }, [fetchCourses, fetchQuizzes, fetchMyAttempts]);

  useEffect(() => {
    if (selectedCourse) {
      fetchQuizzes(selectedCourse);
    } else if (selectedCourse === '') {
      fetchQuizzes();
    }
  }, [selectedCourse, fetchQuizzes]);

  useEffect(() => {
    return () => clearTimer(); // Cleanup timer on unmount
  }, []);

  // Filter quizzes based on search
  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render functions
  const renderQuizList = () => (
    <div className="quiz-list-container">
      <div className="quiz-header">
        <div className="header-content">
          <h1>Available Quizzes</h1>
          <p>Test your knowledge with these assessments</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setMode('attempts')}
          >
            <FileText className="icon" />
            My Attempts
          </button>
        </div>
      </div>

      <div className="quiz-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          value={selectedCourse} 
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="filter-select"
        >
          <option value="">All Courses</option>
          {courses.map(course => (
            <option key={course._id} value={course._id}>{course.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <RefreshCw className="spinning" />
          <p>Loading quizzes...</p>
        </div>
      ) : (
        <div className="quiz-grid">
          {filteredQuizzes.map(quiz => (
            <div key={quiz._id} className="quiz-card">
              <div className="quiz-card-header">
                <h3>{quiz.title}</h3>
                {quiz.description && <p className="quiz-description">{quiz.description}</p>}
              </div>
              
              <div className="quiz-meta">
                <div className="meta-item">
                  <HelpCircle className="icon" />
                  <span>{quiz.questions?.length || 0} questions</span>
                </div>
                <div className="meta-item">
                  <Clock className="icon" />
                  <span>{quiz.settings?.timeLimit ? `${quiz.settings.timeLimit} min` : 'No limit'}</span>
                </div>
                <div className="meta-item">
                  <Award className="icon" />
                  <span>{quiz.totalPoints || 0} points</span>
                </div>
                <div className="meta-item">
                  <Target className="icon" />
                  <span>{quiz.settings?.passingScore || 70}% to pass</span>
                </div>
              </div>

              {quiz.dueDate && (
                <div className="quiz-due-date">
                  <Calendar className="icon" />
                  <span>Due: {formatDate(quiz.dueDate)}</span>
                </div>
              )}

              <div className="quiz-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => startQuizAttempt(quiz._id)}
                  disabled={submitting}
                >
                  <Play className="icon" />
                  Start Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredQuizzes.length === 0 && !loading && (
        <div className="empty-state">
          <BookOpen className="empty-icon" />
          <h3>No quizzes available</h3>
          <p>There are no quizzes matching your criteria.</p>
        </div>
      )}
    </div>
  );

  const renderQuizTaking = () => {
    if (!quizData || !quizData.questions) return null;

    const currentQuestion = quizData.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

    return (
      <div className="quiz-taking-container">
        <div className="quiz-header">
          <div className="quiz-title">
            <h2>{quizData.title}</h2>
            {timeRemaining !== null && (
              <div className={`timer ${timeRemaining < 300 ? 'urgent' : ''}`}>
                <Timer className="icon" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          
          <div className="quiz-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">
              Question {currentQuestionIndex + 1} of {quizData.questions.length}
            </span>
          </div>
        </div>

        <div className="quiz-content">
          <div className="question-panel">
            <div className="question-header">
              <div className="question-info">
                <span className="question-number">Question {currentQuestionIndex + 1}</span>
                <span className="question-points">{currentQuestion.points} points</span>
              </div>
              <button 
                className={`flag-btn ${flaggedQuestions.has(currentQuestion._id) ? 'flagged' : ''}`}
                onClick={() => toggleFlag(currentQuestion._id)}
                title="Flag for review"
              >
                <Flag className="icon" />
              </button>
            </div>
            
            <div className="question-text">
              {currentQuestion.question}
            </div>

            <div className="answer-options">
              {currentQuestion.type === 'multiple-choice' && (
                <div className="multiple-choice">
                  {currentQuestion.options.map((option, index) => (
                    <label key={index} className="option-label">
                      <input
                        type="radio"
                        name={`question-${currentQuestion._id}`}
                        value={option.text}
                        checked={answers[currentQuestion._id] === option.text}
                        onChange={(e) => saveAnswer(currentQuestion._id, e.target.value)}
                      />
                      <span className="option-text">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'true-false' && (
                <div className="true-false">
                  {['True', 'False'].map(option => (
                    <label key={option} className="option-label">
                      <input
                        type="radio"
                        name={`question-${currentQuestion._id}`}
                        value={option}
                        checked={answers[currentQuestion._id] === option}
                        onChange={(e) => saveAnswer(currentQuestion._id, e.target.value)}
                      />
                      <span className="option-text">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {(currentQuestion.type === 'short-answer' || currentQuestion.type === 'essay') && (
                <textarea
                  value={answers[currentQuestion._id] || ''}
                  onChange={(e) => saveAnswer(currentQuestion._id, e.target.value)}
                  placeholder="Type your answer here..."
                  rows={currentQuestion.type === 'essay' ? 8 : 3}
                  className="answer-textarea"
                />
              )}
            </div>
          </div>

          <div className="navigation-panel">
            <div className="question-nav">
              <h4>Questions</h4>
              <div className="question-grid">
                {quizData.questions.map((q, index) => (
                  <button
                    key={q._id}
                    className={`question-nav-btn ${
                      index === currentQuestionIndex ? 'current' : ''
                    } ${
                      answers[q._id] ? 'answered' : ''
                    } ${
                      flaggedQuestions.has(q._id) ? 'flagged' : ''
                    }`}
                    onClick={() => goToQuestion(index)}
                  >
                    {index + 1}
                    {flaggedQuestions.has(q._id) && <Flag className="flag-icon" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="quiz-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowReview(true)}
              >
                <Eye className="icon" />
                Review
              </button>
              <button 
                className="btn btn-primary"
                onClick={submitQuiz}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="icon spinning" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="icon" />
                    Submit Quiz
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="quiz-navigation">
          <button 
            className="btn btn-secondary"
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="icon" />
            Previous
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            disabled={currentQuestionIndex === quizData.questions.length - 1}
          >
            Next
            <ChevronRight className="icon" />
          </button>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!selectedAttemptResult) return null;

    const { attempt, quiz, summary, answers: resultAnswers } = selectedAttemptResult;

    return (
      <div className="quiz-results-container">
        <div className="results-header">
          <div className="results-title">
            <h2>Quiz Results</h2>
            <p>{quiz.title}</p>
          </div>
          <div className="results-score">
            <div className={`score-circle ${attempt.isPassed ? 'passed' : 'failed'}`}>
              <span className="percentage">{attempt.percentage}%</span>
              <span className="label">{attempt.isPassed ? 'Passed' : 'Failed'}</span>
            </div>
          </div>
        </div>

        <div className="results-summary">
          <div className="summary-card">
            <div className="summary-item">
              <Award className="icon" />
              <div>
                <span className="value">{attempt.score}</span>
                <span className="label">Points Earned</span>
              </div>
            </div>
            <div className="summary-item">
              <Target className="icon" />
              <div>
                <span className="value">{summary.correctAnswers}</span>
                <span className="label">Correct Answers</span>
              </div>
            </div>
            <div className="summary-item">
              <Clock className="icon" />
              <div>
                <span className="value">{formatTime(attempt.timeSpent)}</span>
                <span className="label">Time Spent</span>
              </div>
            </div>
            <div className="summary-item">
              <CheckCircle className="icon" />
              <div>
                <span className="value">{attempt.attemptNumber}</span>
                <span className="label">Attempt Number</span>
              </div>
            </div>
          </div>
        </div>

        {resultAnswers && (
          <div className="detailed-results">
            <h3>Question Review</h3>
            {resultAnswers.map((answer, index) => (
              <div key={answer.questionId} className="answer-review">
                <div className="question-header">
                  <span className="question-number">Question {index + 1}</span>
                  <div className={`answer-status ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                    {answer.isCorrect ? (
                      <CheckCircle className="icon" />
                    ) : (
                      <XCircle className="icon" />
                    )}
                    <span>{answer.pointsEarned}/{answer.totalPoints} points</span>
                  </div>
                </div>
                
                <div className="question-text">{answer.question}</div>
                
                <div className="answer-details">
                  <div className="answer-item">
                    <strong>Your Answer:</strong>
                    <span className={answer.isCorrect ? 'correct' : 'incorrect'}>
                      {answer.yourAnswer || 'No answer provided'}
                    </span>
                  </div>
                  
                  {answer.correctAnswer && (
                    <div className="answer-item">
                      <strong>Correct Answer:</strong>
                      <span className="correct">{answer.correctAnswer}</span>
                    </div>
                  )}
                  
                  {answer.explanation && (
                    <div className="explanation">
                      <strong>Explanation:</strong>
                      <p>{answer.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {attempt.feedback && (
          <div className="instructor-feedback">
            <h3>Instructor Feedback</h3>
            <div className="feedback-content">
              <MessageCircle className="icon" />
              <p>{attempt.feedback}</p>
            </div>
          </div>
        )}

        <div className="results-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setMode('list')}
          >
            Back to Quizzes
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setMode('attempts')}
          >
            View All Attempts
          </button>
        </div>
      </div>
    );
  };

  const renderAttempts = () => (
    <div className="attempts-container">
      <div className="attempts-header">
        <h2>My Quiz Attempts</h2>
        <button 
          className="btn btn-secondary"
          onClick={() => setMode('list')}
        >
          Back to Quizzes
        </button>
      </div>

      <div className="attempts-list">
        {attempts.map(attempt => (
          <div key={attempt._id} className="attempt-card">
            <div className="attempt-header">
              <h3>{attempt.quiz.title}</h3>
              <div className={`status-badge ${attempt.isPassed ? 'passed' : 'failed'}`}>
                {attempt.isPassed ? 'Passed' : 'Failed'}
              </div>
            </div>
            
            <div className="attempt-details">
              <div className="detail-item">
                <span className="label">Score:</span>
                <span className="value">{attempt.percentage}%</span>
              </div>
              <div className="detail-item">
                <span className="label">Attempt:</span>
                <span className="value">#{attempt.attemptNumber}</span>
              </div>
              <div className="detail-item">
                <span className="label">Submitted:</span>
                <span className="value">{formatDate(attempt.submittedAt)}</span>
              </div>
            </div>
            
            <button 
              className="btn btn-primary"
              onClick={() => viewAttemptResults(attempt._id)}
            >
              View Results
            </button>
          </div>
        ))}
      </div>

      {attempts.length === 0 && (
        <div className="empty-state">
          <FileText className="empty-icon" />
          <h3>No attempts yet</h3>
          <p>You haven't taken any quizzes yet.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="quiz-component">
      {error && (
        <div className="error-banner">
          <AlertCircle className="icon" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      {success && (
        <div className="success-banner">
          <CheckCircle className="icon" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="close-btn">×</button>
        </div>
      )}

      {mode === 'list' && renderQuizList()}
      {mode === 'taking' && renderQuizTaking()}
      {mode === 'results' && renderResults()}
      {mode === 'attempts' && renderAttempts()}

      {showReview && mode === 'taking' && (
        <div className="modal-overlay" onClick={() => setShowReview(false)}>
          <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Review Answers</h3>
              <button onClick={() => setShowReview(false)} className="close-btn">×</button>
            </div>
            <div className="review-content">
              {quizData.questions.map((question, index) => (
                <div key={question._id} className="review-item">
                  <div className="review-question">
                    <span className="question-number">Q{index + 1}:</span>
                    <span className="question-text">{question.question}</span>
                  </div>
                  <div className="review-answer">
                    <span className={`answer-status ${answers[question._id] ? 'answered' : 'unanswered'}`}>
                      {answers[question._id] ? 'Answered' : 'Not answered'}
                    </span>
                    {flaggedQuestions.has(question._id) && (
                      <span className="flagged-indicator">
                        <Flag className="icon" />
                        Flagged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




export default Quiz;