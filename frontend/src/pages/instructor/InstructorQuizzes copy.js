import React, { useState, useEffect, useCallback } from 'react';
import './InstructorQuizzes.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555';

const InstructorQuizzes = () => {
  // State management
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [showQuestions, setShowQuestions] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '',
    lesson: '',
    settings: {
      timeLimit: '',
      attempts: 1,
      passingScore: 70,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: 'immediately',
      showCorrectAnswers: true,
      randomizeQuestions: false,
      questionsPerAttempt: ''
    },
    questions: [],
    dueDate: '',
    availableFrom: '',
    availableUntil: '',
    isPublished: false
  });

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    question: '',
    type: 'multiple-choice',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    correctAnswer: '',
    explanation: '',
    points: 1,
    difficulty: 'medium'
  });

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Helper function to create auth headers
  const createAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required. Please login.');
      return null;
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/courses/my-courses?limit=100`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setCourses(data.data?.courses || []);
      }
    } catch (err) {
      console.error('Fetch courses error:', err);
      setError('Failed to fetch courses');
    }
  }, []);

  // Fetch lessons for selected course
  const fetchLessons = useCallback(async (courseId) => {
    if (!courseId) {
      setLessons([]);
      return;
    }

    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/lessons/course/${courseId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setLessons(data.data?.lessons || []);
      }
    } catch (err) {
      console.error('Fetch lessons error:', err);
      setError('Failed to fetch lessons');
    }
  }, []);

  // Fetch quizzes
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const headers = createAuthHeaders();
      if (!headers) return;

      let url = `${API_BASE_URL}/api/quizzes`;
      const params = new URLSearchParams();
      
      if (selectedCourse) params.append('course', selectedCourse);
      if (selectedLesson) params.append('lesson', selectedLesson);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setQuizzes(data.data?.quizzes || []);
      }
    } catch (err) {
      console.error('Fetch quizzes error:', err);
      setError('Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedLesson]);

  // Initialize data on component mount
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Fetch lessons when course changes
  useEffect(() => {
    fetchLessons(selectedCourse);
  }, [selectedCourse, fetchLessons]);

  // Fetch quizzes when filters change
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Handle question form changes
  const handleQuestionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuestionForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle option changes
  const handleOptionChange = (index, field, value) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, [field]: value } : option
      )
    }));
  };

  // option for multiple choice questions
  const addOption = () => {
    setQuestionForm(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }));
  };

  // Remove option
  const removeOption = (index) => {
    if (questionForm.options.length > 2) {
      setQuestionForm(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  // Reset question form
  const resetQuestionForm = () => {
    setQuestionForm({
      question: '',
      type: 'multiple-choice',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      correctAnswer: '',
      explanation: '',
      points: 1,
      difficulty: 'medium'
    });
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  // or update question
  const saveQuestion = () => {
    if (!questionForm.question.trim()) {
      setError('Question text is required');
      return;
    }

    if (questionForm.type === 'multiple-choice' || questionForm.type === 'true-false') {
      const hasCorrectAnswer = questionForm.options.some(opt => opt.isCorrect);
      if (!hasCorrectAnswer) {
        setError('Please mark at least one option as correct');
        return;
      }
    }

    const question = { ...questionForm };
    
    if (editingQuestion !== null) {
      // Update existing question
      setFormData(prev => ({
        ...prev,
        questions: prev.questions.map((q, i) => 
          i === editingQuestion ? question : q
        )
      }));
    } else {
      // new question
      setFormData(prev => ({
        ...prev,
        questions: [...prev.questions, question]
      }));
    }

    resetQuestionForm();
    setSuccess('Question saved successfully');
  };

  // Edit question
  const editQuestion = (index) => {
    setQuestionForm(formData.questions[index]);
    setEditingQuestion(index);
    setShowQuestionForm(true);
  };

  // Delete question
  const deleteQuestion = (index) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      setFormData(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
      setSuccess('Question deleted successfully');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      course: selectedCourse || '',
      lesson: selectedLesson || '',
      settings: {
        timeLimit: '',
        attempts: 1,
        passingScore: 70,
        shuffleQuestions: false,
        shuffleOptions: false,
        showResults: 'immediately',
        showCorrectAnswers: true,
        randomizeQuestions: false,
        questionsPerAttempt: ''
      },
      questions: [],
      dueDate: '',
      availableFrom: '',
      availableUntil: '',
      isPublished: false
    });
    setEditingQuiz(null);
    setShowForm(false);
    resetQuestionForm();
  };

  // Create or update quiz
  const saveQuiz = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Quiz title is required');
      return;
    }

    if (!formData.course) {
      setError('Please select a course');
      return;
    }

    if (formData.questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    try {
      setLoading(true);
      const headers = createAuthHeaders();
      if (!headers) return;

      const quizData = {
        ...formData,
        settings: {
          ...formData.settings,
          timeLimit: formData.settings.timeLimit ? parseInt(formData.settings.timeLimit) : null,
          questionsPerAttempt: formData.settings.questionsPerAttempt ? 
            parseInt(formData.settings.questionsPerAttempt) : null
        }
      };

      const url = editingQuiz 
        ? `${API_BASE_URL}/api/quizzes/${editingQuiz}`
        : `${API_BASE_URL}/api/quizzes`;
      
      const method = editingQuiz ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(quizData)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setSuccess(editingQuiz ? 'Quiz updated successfully' : 'Quiz created successfully');
        resetForm();
        fetchQuizzes();
      } else {
        throw new Error(data.message || 'Failed to save quiz');
      }
    } catch (err) {
      console.error('Save quiz error:', err);
      setError(err.message || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  // Edit quiz
  const editQuiz = (quiz) => {
    setFormData({
      title: quiz.title || '',
      description: quiz.description || '',
      course: quiz.course || '',
      lesson: quiz.lesson || '',
      settings: {
        timeLimit: quiz.settings?.timeLimit || '',
        attempts: quiz.settings?.attempts || 1,
        passingScore: quiz.settings?.passingScore || 70,
        shuffleQuestions: quiz.settings?.shuffleQuestions || false,
        shuffleOptions: quiz.settings?.shuffleOptions || false,
        showResults: quiz.settings?.showResults || 'immediately',
        showCorrectAnswers: quiz.settings?.showCorrectAnswers || true,
        randomizeQuestions: quiz.settings?.randomizeQuestions || false,
        questionsPerAttempt: quiz.settings?.questionsPerAttempt || ''
      },
      questions: quiz.questions || [],
      dueDate: quiz.dueDate ? new Date(quiz.dueDate).toISOString().slice(0, 16) : '',
      availableFrom: quiz.availableFrom ? new Date(quiz.availableFrom).toISOString().slice(0, 16) : '',
      availableUntil: quiz.availableUntil ? new Date(quiz.availableUntil).toISOString().slice(0, 16) : '',
      isPublished: quiz.isPublished || false
    });
    setEditingQuiz(quiz._id);
    setShowForm(true);
  };

  // Delete quiz
  const deleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setSuccess('Quiz deleted successfully');
        fetchQuizzes();
      } else {
        throw new Error(data.message || 'Failed to delete quiz');
      }
    } catch (err) {
      console.error('Delete quiz error:', err);
      setError(err.message || 'Failed to delete quiz');
    } finally {
      setLoading(false);
    }
  };

  // Toggle quiz publication status
  const togglePublishStatus = async (quizId, currentStatus) => {
    try {
      setLoading(true);
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/${quizId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isPublished: !currentStatus })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setSuccess(`Quiz ${!currentStatus ? 'published' : 'unpublished'} successfully`);
        fetchQuizzes();
      } else {
        throw new Error(data.message || 'Failed to update quiz');
      }
    } catch (err) {
      console.error('Toggle publish error:', err);
      setError(err.message || 'Failed to update quiz status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="instructor-quizzes">
      <div className="quizzes-header">
        <h1>Quiz Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          Create New Quiz
        </button>
      </div>

      {/* Messages */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by Course:</label>
          <select 
            value={selectedCourse} 
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="form-select"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Filter by Lesson:</label>
          <select 
            value={selectedLesson} 
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="form-select"
            disabled={!selectedCourse}
          >
            <option value="">All Lessons</option>
            {lessons.map(lesson => (
              <option key={lesson._id} value={lesson._id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quiz List */}
      <div className="quizzes-list">
        {loading && <div className="loading">Loading quizzes...</div>}
        
        {!loading && quizzes.length === 0 && (
          <div className="empty-state">
            <p>No quizzes found. Create your first quiz to get started!</p>
          </div>
        )}

        {!loading && quizzes.map(quiz => (
          <div key={quiz._id} className="quiz-card">
            <div className="quiz-header">
              <h3>{quiz.title}</h3>
              <div className="quiz-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowQuestions(showQuestions === quiz._id ? null : quiz._id)}
                >
                  {showQuestions === quiz._id ? 'Hide' : 'View'} Questions ({quiz.questions?.length || 0})
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => editQuiz(quiz)}
                >
                  Edit
                </button>
                <button 
                  className={`btn btn-sm ${quiz.isPublished ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => togglePublishStatus(quiz._id, quiz.isPublished)}
                >
                  {quiz.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteQuiz(quiz._id)}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="quiz-info">
              {quiz.description && <p className="quiz-description">{quiz.description}</p>}
              
              <div className="quiz-meta">
                <span className={`status ${quiz.isPublished ? 'published' : 'draft'}`}>
                  {quiz.isPublished ? 'Published' : 'Draft'}
                </span>
                <span>Questions: {quiz.questions?.length || 0}</span>
                <span>Total Points: {quiz.totalPoints || 0}</span>
                {quiz.settings?.timeLimit && <span>Time Limit: {quiz.settings.timeLimit} min</span>}
                <span>Passing Score: {quiz.settings?.passingScore || 70}%</span>
              </div>

              {quiz.dueDate && (
                <div className="quiz-dates">
                  <span>Due: {new Date(quiz.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Questions Preview */}
            {showQuestions === quiz._id && (
              <div className="questions-preview">
                <h4>Questions:</h4>
                {quiz.questions?.length > 0 ? (
                  <ol className="questions-list">
                    {quiz.questions.map((question, index) => (
                      <li key={index} className="question-item">
                        <div className="question-text">{question.question}</div>
                        <div className="question-meta">
                          <span className="question-type">{question.type}</span>
                          <span className="question-points">{question.points} pts</span>
                          <span className="question-difficulty">{question.difficulty}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="no-questions">No questions added yet.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quiz Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={saveQuiz} className="quiz-form">
              <div className="form-section">
                <h3>Basic Information</h3>
                
                <div className="form-group">
                  <label>Quiz Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter quiz title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter quiz description"
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Course *</label>
                    <select
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Course</option>
                      {courses.map(course => (
                        <option key={course._id} value={course._id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Lesson (Optional)</label>
                    <select
                      name="lesson"
                      value={formData.lesson}
                      onChange={handleInputChange}
                      disabled={!formData.course}
                    >
                      <option value="">Select Lesson</option>
                      {lessons.map(lesson => (
                        <option key={lesson._id} value={lesson._id}>
                          {lesson.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Quiz Settings</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Time Limit (minutes)</label>
                    <input
                      type="number"
                      name="settings.timeLimit"
                      value={formData.settings.timeLimit}
                      onChange={handleInputChange}
                      placeholder="Leave empty for no limit"
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Number of Attempts</label>
                    <input
                      type="number"
                      name="settings.attempts"
                      value={formData.settings.attempts}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Passing Score (%)</label>
                    <input
                      type="number"
                      name="settings.passingScore"
                      value={formData.settings.passingScore}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Show Results</label>
                    <select
                      name="settings.showResults"
                      value={formData.settings.showResults}
                      onChange={handleInputChange}
                    >
                      <option value="immediately">Immediately</option>
                      <option value="after-submission">After Submission</option>
                      <option value="after-due-date">After Due Date</option>
                      <option value="never">Never</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Questions Per Attempt</label>
                    <input
                      type="number"
                      name="settings.questionsPerAttempt"
                      value={formData.settings.questionsPerAttempt}
                      onChange={handleInputChange}
                      placeholder="Leave empty to show all"
                      min="1"
                    />
                  </div>
                </div>

                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="settings.shuffleQuestions"
                      checked={formData.settings.shuffleQuestions}
                      onChange={handleInputChange}
                    />
                    Shuffle Questions
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="settings.shuffleOptions"
                      checked={formData.settings.shuffleOptions}
                      onChange={handleInputChange}
                    />
                    Shuffle Answer Options
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="settings.showCorrectAnswers"
                      checked={formData.settings.showCorrectAnswers}
                      onChange={handleInputChange}
                    />
                    Show Correct Answers
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="settings.randomizeQuestions"
                      checked={formData.settings.randomizeQuestions}
                      onChange={handleInputChange}
                    />
                    Randomize Questions
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3>Availability</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Available From</label>
                    <input
                      type="datetime-local"
                      name="availableFrom"
                      value={formData.availableFrom}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Available Until</label>
                    <input
                      type="datetime-local"
                      name="availableUntil"
                      value={formData.availableUntil}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="datetime-local"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isPublished"
                      checked={formData.isPublished}
                      onChange={handleInputChange}
                    />
                    Publish Quiz Immediately
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>Questions ({formData.questions.length})</h3>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowQuestionForm(true)}
                  >
                    Add Question
                  </button>
                </div>

                {formData.questions.length > 0 ? (
                  <div className="questions-list">
                    {formData.questions.map((question, index) => (
                      <div key={index} className="question-card">
                        <div className="question-header">
                          <span className="question-number">Q{index + 1}</span>
                          <span className="question-type">{question.type}</span>
                          <span className="question-points">{question.points} pts</span>
                          <div className="question-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => editQuestion(index)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteQuestion(index)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="question-content">
                          <p>{question.question}</p>
                          {question.type === 'multiple-choice' && (
                            <ul className="options-list">
                              {question.options.map((option, optIndex) => (
                                <li key={optIndex} className={option.isCorrect ? 'correct' : ''}>
                                  {option.text} {option.isCorrect && '✓'}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-questions">
                    <p>No questions added yet. Add your first question to get started!</p>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Form Modal */}
      {showQuestionForm && (
        <div className="modal-overlay">
          <div className="modal question-modal">
            <div className="modal-header">
              <h2>{editingQuestion !== null ? 'Edit Question' : 'Add New Question'}</h2>
              <button className="modal-close" onClick={resetQuestionForm}>×</button>
            </div>

            <div className="question-form">
              <div className="form-group">
                <label>Question Text *</label>
                <textarea
                  name="question"
                  value={questionForm.question}
                  onChange={handleQuestionChange}
                  placeholder="Enter your question"
                  rows="3"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Question Type</label>
                  <select
                    name="type"
                    value={questionForm.type}
                    onChange={handleQuestionChange}
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True/False</option>
                    <option value="short-answer">Short Answer</option>
                    <option value="essay">Essay</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Points</label>
                  <input
                    type="number"
                    name="points"
                    value={questionForm.points}
                    onChange={handleQuestionChange}
                    min="0.5"
                    step="0.5"
                  />
                </div>

                <div className="form-group">
                  <label>Difficulty</label>
                  <select
                    name="difficulty"
                    value={questionForm.difficulty}
                    onChange={handleQuestionChange}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Multiple Choice Options */}
              {(questionForm.type === 'multiple-choice' || questionForm.type === 'true-false') && (
                <div className="options-section">
                  <div className="section-header">
                    <h4>Answer Options</h4>
                    {questionForm.type === 'multiple-choice' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={addOption}
                      >
                        Add Option
                      </button>
                    )}
                  </div>

                  {questionForm.type === 'true-false' ? (
                    <div className="true-false-options">
                      <label className="option-label">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={questionForm.options[0]?.isCorrect}
                          onChange={() => {
                            handleOptionChange(0, 'isCorrect', true);
                            handleOptionChange(1, 'isCorrect', false);
                          }}
                        />
                        <span>True</span>
                      </label>
                      <label className="option-label">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={questionForm.options[1]?.isCorrect}
                          onChange={() => {
                            handleOptionChange(0, 'isCorrect', false);
                            handleOptionChange(1, 'isCorrect', true);
                          }}
                        />
                        <span>False</span>
                      </label>
                    </div>
                  ) : (
                    <div className="options-list">
                      {questionForm.options.map((option, index) => (
                        <div key={index} className="option-item">
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                            placeholder={`Option ${index + 1}`}
                          />
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={option.isCorrect}
                              onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                            />
                            Correct
                          </label>
                          {questionForm.options.length > 2 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => removeOption(index)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Short Answer/Essay Correct Answer */}
              {(questionForm.type === 'short-answer' || questionForm.type === 'essay') && (
                <div className="form-group">
                  <label>Correct Answer/Sample Answer</label>
                  <textarea
                    name="correctAnswer"
                    value={questionForm.correctAnswer}
                    onChange={handleQuestionChange}
                    placeholder="Enter the correct answer or a sample answer"
                    rows={questionForm.type === 'essay' ? 5 : 2}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Explanation (Optional)</label>
                <textarea
                  name="explanation"
                  value={questionForm.explanation}
                  onChange={handleQuestionChange}
                  placeholder="Provide an explanation for the correct answer"
                  rows="2"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetQuestionForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveQuestion}
                >
                  {editingQuestion !== null ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorQuizzes;