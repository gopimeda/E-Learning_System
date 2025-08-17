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
    try {
      const token = localStorage.getItem('userToken');
      console.log('Retrieved token:', token ? 'Token exists' : 'No token found');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return null;
      }
      return token;
    } catch (error) {
      console.error('Error accessing localStorage token:', error);
      setError('Error accessing authentication data. Please log in again.');
      return null;
    }
  };

  const createAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) return null;
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const getUserData = () => {
    try {
      const userData = localStorage.getItem('userData');
      console.log('Retrieved userData from localStorage:', userData ? 'Data exists' : 'No data found');
      
      if (!userData) {
        console.warn('No userData found in localStorage');
        return null;
      }
      
      const parsedData = JSON.parse(userData);
      console.log('Parsed user data:', parsedData);
      return parsedData;
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      setError('Error accessing user data. Please log in again.');
      return null;
    }
  };

  const getUserId = () => {
    const userData = getUserData();
    if (!userData) {
      console.error('No user data available');
      return null;
    }
    
    // Try different possible property names for user ID
    const userId = userData._id || userData.id || userData.userId;
    console.log('Extracted user ID:', userId);
    
    if (!userId) {
      console.error('No user ID found in user data:', userData);
      setError('User ID not found. Please log in again.');
      return null;
    }
    
    return userId;
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

      console.log('Fetching courses...');
      const response = await fetch(`${API_BASE_URL}/api/enrollments`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Courses response:', data);
      
      if (data.success && data.data?.enrollments) {
        const uniqueCourses = data.data.enrollments
          .filter(enrollment => enrollment.status === 'active')
          .map(enrollment => enrollment.course)
          .filter((course, index, self) => 
            index === self.findIndex(c => c._id === course._id)
          );
        setCourses(uniqueCourses);
        console.log('Set courses:', uniqueCourses);
      }
    } catch (err) {
      console.error('Fetch courses error:', err);
      setError('Failed to fetch courses: ' + err.message);
    }
  }, []);

const fetchQuizzes = useCallback(async (courseId = null) => {
  try {
    setLoading(true);
    // Remove the setError('') line to avoid clearing previous errors
    const headers = createAuthHeaders();
    if (!headers) return;

    const url = courseId 
      ? `${API_BASE_URL}/api/quizzes/course/${courseId}`
      : `${API_BASE_URL}/api/quizzes`;

    console.log('Fetching quizzes from:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quizzes: HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('Quizzes response:', data);
    
    if (data.success) {
      setQuizzes(data.data.quizzes || []);
    } else {
      // Don't set error message - just log it
      console.warn('API returned unsuccessful response:', data.message);
    }
  } catch (err) {
    console.error('Fetch quizzes error:', err);
    // Remove the setError call to avoid showing error to user
  } finally {
    setLoading(false);
  }
}, []);

  // Updated function to fetch student attempts with better error handling
  const fetchMyAttempts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const headers = createAuthHeaders();
      if (!headers) {
        console.error('No auth headers available');
        return;
      }

      const userId = getUserId();
      if (!userId) {
        console.error('No user ID available');
        return;
      }

      console.log('Fetching attempts for user ID:', userId);
      const url = `${API_BASE_URL}/api/quizzes/student/attempts/${userId}`;
      console.log('Fetch URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      console.log('Attempts response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Attempts fetch error response:', errorText);
        throw new Error(`Failed to fetch attempts: HTTP ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Attempts response data:', data);
      
      if (data.success) {
        setAttempts(data.data.attempts || []);
        console.log('Set attempts:', data.data.attempts || []);
      } else {
        console.error('Attempts fetch failed:', data.message);
        setError(data.message || 'Failed to fetch attempts');
      }
    } catch (err) {
      console.error('Fetch attempts error:', err);
      setError('Failed to fetch attempts: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to fetch detailed attempt results
  const fetchAttemptDetails = useCallback(async (attemptId) => {
    try {
      setLoading(true);
      const headers = createAuthHeaders();
      if (!headers) return null;

      console.log('Fetching attempt details for ID:', attemptId);
      const response = await fetch(`${API_BASE_URL}/api/quizzes/attempts/${attemptId}/results`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch attempt details: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Attempt details response:', data);
      
      if (data.success) {
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('Fetch attempt details error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Quiz attempt functions
  const startQuizAttempt = async (quizId) => {
    try {
      setSubmitting(true);
      setError('');
      const headers = createAuthHeaders();
      if (!headers) return;

      console.log('Starting quiz attempt for quiz ID:', quizId);
      const response = await fetch(`${API_BASE_URL}/api/quizzes/${quizId}/attempt`, {
        method: 'POST',
        headers
      });

      const data = await response.json();
      console.log('Start quiz response:', data);
      
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
      const attemptData = await fetchAttemptDetails(attemptId);
      if (attemptData) {
        setSelectedAttemptResult(attemptData);
        setMode('results');
      }
    } catch (err) {
      setError('Failed to fetch attempt results: ' + err.message);
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

  // Debug function to check localStorage contents
  const debugLocalStorage = () => {
    console.log('=== Debug localStorage ===');
    console.log('userToken:', localStorage.getItem('userToken'));
    console.log('userData:', localStorage.getItem('userData'));
    console.log('userRole:', localStorage.getItem('userRole'));
    console.log('========================');
  };

  // Effects
  useEffect(() => {
    debugLocalStorage(); // Debug localStorage on component mount
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
            My Attempts ({attempts.length})
          </button>
          <button 
            className="btn btn-secondary"
            onClick={debugLocalStorage}
            title="Debug localStorage (check console)"
          >
            Debug
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
            <p>{quiz?.title || attempt?.quiz?.title}</p>
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
                <span className="value">{summary?.correctAnswers || 'N/A'}</span>
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
        <div className="attempts-actions">
          <button 
            className="btn btn-secondary"
            onClick={fetchMyAttempts}
            disabled={loading}
          >
            <RefreshCw className={`icon ${loading ? 'spinning' : ''}`} />
            Refresh
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setMode('list')}
          >
            Back to Quizzes
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <RefreshCw className="spinning" />
          <p>Loading attempts...</p>
        </div>
      ) : (
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
                <div className="detail-item">
                  <span className="label">Course:</span>
                  <span className="value">{attempt.quiz.course?.title || 'N/A'}</span>
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
      )}

      {attempts.length === 0 && !loading && (
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

      <style jsx>{`
        .quiz-component {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .error-banner, .success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: 8px;
          font-weight: 500;
        }

        .error-banner {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .success-banner {
          background-color: #dcfce7;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          margin-left: auto;
          opacity: 0.7;
        }

        .close-btn:hover {
          opacity: 1;
        }

        .quiz-list-container, .attempts-container, .quiz-taking-container, .quiz-results-container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .quiz-header, .attempts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f3f4f6;
        }

        .header-content h1, .attempts-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .header-content p {
          color: #6b7280;
          margin: 4px 0 0 0;
        }

        .header-actions, .attempts-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .icon {
          width: 16px;
          height: 16px;
        }

        .quiz-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-bar {
          flex: 1;
          min-width: 250px;
        }

        .search-bar input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
        }

        .filter-select {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          min-width: 150px;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #6b7280;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .quiz-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .quiz-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .quiz-card:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .quiz-card-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .quiz-description {
          color: #6b7280;
          font-size: 14px;
          margin: 8px 0;
        }

        .quiz-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 16px 0;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #6b7280;
        }

        .quiz-due-date {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #dc2626;
          font-size: 14px;
          font-weight: 500;
          margin: 12px 0;
        }

        .quiz-actions {
          margin-top: 16px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #6b7280;
          text-align: center;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .attempts-list {
          display: grid;
          gap: 16px;
        }

        .attempt-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .attempt-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .attempt-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.passed {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-badge.failed {
          background: #fee2e2;
          color: #dc2626;
        }

        .attempt-details {
          display: flex;
          gap: 20px;
          flex: 1;
          margin: 0 20px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .detail-item .label {
          font-size: 12px;
          color: #6b7280;
        }

        .detail-item .value {
          font-weight: 500;
          color: #1f2937;
        }

        .quiz-taking-container {
          max-width: 1400px;
        }

        .quiz-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .quiz-title h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }

        .timer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #3b82f6;
          color: white;
          border-radius: 6px;
          font-weight: 500;
        }

        .timer.urgent {
          background: #dc2626;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .quiz-progress {
          margin-bottom: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          transition: width 0.3s;
        }

        .progress-text {
          font-size: 14px;
          color: #6b7280;
        }

        .quiz-content {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 24px;
          margin-bottom: 20px;
        }

        .question-panel {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
        }

        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .question-info {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .question-number {
          font-weight: 600;
          color: #3b82f6;
        }

        .question-points {
          background: #e0e7ff;
          color: #3730a3;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .flag-btn {
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 6px;
          cursor: pointer;
          color: #6b7280;
        }

        .flag-btn.flagged {
          background: #fef3c7;
          color: #d97706;
          border-color: #f59e0b;
        }

        .question-text {
          font-size: 16px;
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .answer-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .option-label {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .option-label:hover {
          background: #f3f4f6;
          border-color: #3b82f6;
        }

        .option-label input {
          margin: 0;
        }

        .option-text {
          flex: 1;
        }

        .answer-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          resize: vertical;
          font-family: inherit;
        }

        .navigation-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .question-nav h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .question-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }

        .question-nav-btn {
          position: relative;
          padding: 8px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .question-nav-btn.current {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .question-nav-btn.answered {
          background: #dcfce7;
          color: #16a34a;
          border-color: #16a34a;
        }

        .question-nav-btn.flagged {
          border-color: #f59e0b;
        }

        .flag-icon {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 10px;
          height: 10px;
          color: #f59e0b;
        }

        .quiz-navigation {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .results-title h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }

        .results-title p {
          margin: 4px 0 0 0;
          color: #6b7280;
        }

        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
        }

        .score-circle.passed {
          background: linear-gradient(135deg, #10b981, #059669);
        }

        .score-circle.failed {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .percentage {
          font-size: 24px;
        }

        .label {
          font-size: 12px;
          opacity: 0.9;
        }

        .results-summary {
          margin-bottom: 32px;
        }

        .summary-card {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .summary-item .icon {
          width: 20px;
          height: 20px;
          color: #3b82f6;
        }

        .summary-item > div {
          display: flex;
          flex-direction: column;
        }

        .summary-item .value {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .summary-item .label {
          font-size: 12px;
          color: #6b7280;
        }

        .detailed-results {
          margin-bottom: 32px;
        }

        .detailed-results h3 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .answer-review {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .answer-review .question-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .answer-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
        }

        .answer-status.correct {
          color: #16a34a;
        }

        .answer-status.incorrect {
          color: #dc2626;
        }

        .answer-details {
          margin-top: 12px;
        }

        .answer-item {
          margin: 8px 0;
        }

        .answer-item strong {
          display: inline-block;
          width: 120px;
          font-weight: 600;
        }

        .answer-item .correct {
          color: #16a34a;
        }

        .answer-item .incorrect {
          color: #dc2626;
        }

        .explanation {
          background: #e0f2fe;
          padding: 12px;
          border-radius: 6px;
          margin-top: 8px;
        }

        .instructor-feedback {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .instructor-feedback h3 {
          margin: 0 0 12px 0;
          color: #0369a1;
        }

        .feedback-content {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .feedback-content .icon {
          color: #0369a1;
          margin-top: 2px;
        }

        .results-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
        }

        .review-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .review-item {
          background: #f9fafb;
          padding: 12px;
          border-radius: 6px;
        }

        .review-question {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .review-answer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .answer-status.answered {
          color: #16a34a;
        }

        .answer-status.unanswered {
          color: #dc2626;
        }

        .flagged-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #d97706;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .quiz-component {
            padding: 12px;
          }

          .quiz-content {
            grid-template-columns: 1fr;
          }

          .navigation-panel {
            order: -1;
          }

          .question-grid {
            grid-template-columns: repeat(6, 1fr);
          }

          .quiz-filters {
            flex-direction: column;
          }

          .search-bar {
            min-width: auto;
          }

          .quiz-grid {
            grid-template-columns: 1fr;
          }

          .attempt-card {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .attempt-details {
            margin: 0;
            flex-wrap: wrap;
          }

          .results-header {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .summary-card {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Quiz;