import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  BarChart3,
  Users,
  Clock,
  HelpCircle,
  BookOpen,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
  XCircle,
  Award,
  Calendar,
  Settings,
  Copy,
  PlayCircle
} from 'lucide-react';
import './InstructorQuizzes.css';

const API_BASE_URL = 'http://localhost:5555';

const InstructorQuizzes = () => {
  // State management
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedQuizAnalytics, setSelectedQuizAnalytics] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '',
    lesson: '',
    questions: [{
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
    }],
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
    isPublished: false,
    dueDate: '',
    availableFrom: '',
    availableUntil: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Constants
  const questionTypes = [
    { value: 'multiple-choice', label: 'Multiple Choice' },
    { value: 'true-false', label: 'True/False' },
    { value: 'short-answer', label: 'Short Answer' },
    { value: 'essay', label: 'Essay' }
  ];

  const difficulties = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const resultOptions = [
    { value: 'immediately', label: 'Immediately' },
    { value: 'after-submission', label: 'After Submission' },
    { value: 'after-due-date', label: 'After Due Date' },
    { value: 'never', label: 'Never' }
  ];

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

  const formatDuration = (minutes) => {
    if (!minutes) return 'No limit';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // API functions
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
      setLessons([]);
    }
  }, []);

  const fetchQuizzes = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError('');
      const headers = createAuthHeaders();
      if (!headers) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
        ...(selectedCourse && { course: selectedCourse }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      // Since there's no specific instructor quizzes route, we'll need to add one
      // For now, we'll use a general approach
      const response = await fetch(`${API_BASE_URL}/api/quizzes/instructor?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      if (data.success) {
        setQuizzes(data.data?.quizzes || []);
        setPagination(data.data?.pagination || {});
      } else {
        throw new Error(data.message || 'Failed to fetch quizzes');
      }
    } catch (err) {
      console.error('Fetch quizzes error:', err);
      setError(err.message || 'Failed to fetch quizzes. Please try again.');
      setQuizzes([]);
      setPagination({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, selectedCourse, statusFilter, sortBy, sortOrder]);

  const fetchQuizAnalytics = useCallback(async (quizId) => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/${quizId}/analytics`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      if (data.success) {
        setQuizAttempts(data.data?.attempts || []);
        setSelectedQuizAnalytics(data.data?.analytics || null);
      }
    } catch (err) {
      console.error('Fetch quiz analytics error:', err);
      setError('Failed to fetch quiz analytics');
    }
  }, []);

  // Effects
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(selectedCourse);
    }
  }, [selectedCourse, fetchLessons]);

  // Form handlers
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
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleQuestionChange = (questionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, index) => 
        index === questionIndex ? { ...question, [field]: value } : question
      )
    }));
  };

  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, qIndex) => 
        qIndex === questionIndex ? {
          ...question,
          options: question.options.map((option, oIndex) => 
            oIndex === optionIndex ? { ...option, [field]: value } : option
          )
        } : question
      )
    }));
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, {
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
      }]
    }));
  };

  const removeQuestion = (index) => {
    if (formData.questions.length > 1) {
      setFormData(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
    }
  };

  const addOption = (questionIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, index) => 
        index === questionIndex ? {
          ...question,
          options: [...question.options, { text: '', isCorrect: false }]
        } : question
      )
    }));
  };

  const removeOption = (questionIndex, optionIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, qIndex) => 
        qIndex === questionIndex ? {
          ...question,
          options: question.options.filter((_, oIndex) => oIndex !== optionIndex)
        } : question
      )
    }));
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title?.trim()) {
      errors.title = 'Quiz title is required';
    } else if (formData.title.trim().length > 100) {
      errors.title = 'Title cannot exceed 100 characters';
    }
    
    if (!formData.course) {
      errors.course = 'Course selection is required';
    }
    
    if (formData.questions.length === 0) {
      errors.questions = 'At least one question is required';
    }

    // Validate each question
    formData.questions.forEach((question, index) => {
      if (!question.question?.trim()) {
        errors[`question_${index}`] = `Question ${index + 1} text is required`;
      }

      if (question.type === 'multiple-choice' || question.type === 'true-false') {
        const hasCorrectAnswer = question.options.some(option => option.isCorrect);
        if (!hasCorrectAnswer) {
          errors[`question_${index}_options`] = `Question ${index + 1} must have at least one correct answer`;
        }

        question.options.forEach((option, optionIndex) => {
          if (!option.text?.trim()) {
            errors[`question_${index}_option_${optionIndex}`] = `Question ${index + 1}, option ${optionIndex + 1} text is required`;
          }
        });
      }

      if ((question.type === 'short-answer' || question.type === 'essay') && !question.correctAnswer?.trim()) {
        errors[`question_${index}_answer`] = `Question ${index + 1} correct answer is required`;
      }

      if (question.points < 0 || question.points > 100) {
        errors[`question_${index}_points`] = `Question ${index + 1} points must be between 0-100`;
      }
    });

    // Settings validation
    if (formData.settings.timeLimit && (formData.settings.timeLimit < 1 || formData.settings.timeLimit > 300)) {
      errors['settings.timeLimit'] = 'Time limit must be between 1-300 minutes';
    }

    if (formData.settings.attempts < 1 || formData.settings.attempts > 10) {
      errors['settings.attempts'] = 'Attempts must be between 1-10';
    }

    if (formData.settings.passingScore < 0 || formData.settings.passingScore > 100) {
      errors['settings.passingScore'] = 'Passing score must be between 0-100%';
    }

    // Date validation
    if (formData.availableFrom && formData.availableUntil) {
      if (new Date(formData.availableFrom) >= new Date(formData.availableUntil)) {
        errors.availableUntil = 'Available until date must be after available from date';
      }
    }

    if (formData.dueDate && formData.availableUntil) {
      if (new Date(formData.dueDate) > new Date(formData.availableUntil)) {
        errors.dueDate = 'Due date must be before or equal to available until date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // CRUD operations
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      setFormErrors({});
      
      const headers = createAuthHeaders();
      if (!headers) return;
      
      const quizData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        course: formData.course,
        lesson: formData.lesson || undefined,
        questions: formData.questions.map(q => ({
          question: q.question.trim(),
          type: q.type,
          options: q.type === 'multiple-choice' || q.type === 'true-false' 
            ? q.options.filter(opt => opt.text.trim()).map(opt => ({
                text: opt.text.trim(),
                isCorrect: opt.isCorrect
              }))
            : undefined,
          correctAnswer: (q.type === 'short-answer' || q.type === 'essay') 
            ? q.correctAnswer.trim() 
            : undefined,
          explanation: q.explanation?.trim() || '',
          points: parseInt(q.points) || 1,
          difficulty: q.difficulty
        })),
        settings: {
          timeLimit: formData.settings.timeLimit ? parseInt(formData.settings.timeLimit) : undefined,
          attempts: parseInt(formData.settings.attempts) || 1,
          passingScore: parseInt(formData.settings.passingScore) || 70,
          shuffleQuestions: formData.settings.shuffleQuestions,
          shuffleOptions: formData.settings.shuffleOptions,
          showResults: formData.settings.showResults,
          showCorrectAnswers: formData.settings.showCorrectAnswers,
          randomizeQuestions: formData.settings.randomizeQuestions,
          questionsPerAttempt: formData.settings.questionsPerAttempt 
            ? parseInt(formData.settings.questionsPerAttempt) 
            : undefined
        },
        isPublished: formData.isPublished,
        dueDate: formData.dueDate || undefined,
        availableFrom: formData.availableFrom || undefined,
        availableUntil: formData.availableUntil || undefined
      };

      const url = editingQuiz 
        ? `${API_BASE_URL}/api/quizzes/${editingQuiz._id}`
        : `${API_BASE_URL}/api/quizzes`;
      
      const method = editingQuiz ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(quizData)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}`);
      }
      
      if (responseData.success) {
        setShowAddModal(false);
        setEditingQuiz(null);
        resetForm();
        await fetchQuizzes(true);
        alert(`Quiz ${editingQuiz ? 'updated' : 'created'} successfully!`);
      } else {
        throw new Error(responseData.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Submit quiz error:', err);
      setFormErrors({ general: err.message || 'Failed to save quiz' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      title: quiz.title || '',
      description: quiz.description || '',
      course: quiz.course?._id || quiz.course || '',
      lesson: quiz.lesson?._id || quiz.lesson || '',
      questions: quiz.questions || [{
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
      }],
      settings: {
        timeLimit: quiz.settings?.timeLimit || '',
        attempts: quiz.settings?.attempts || 1,
        passingScore: quiz.settings?.passingScore || 70,
        shuffleQuestions: quiz.settings?.shuffleQuestions || false,
        shuffleOptions: quiz.settings?.shuffleOptions || false,
        showResults: quiz.settings?.showResults || 'immediately',
        showCorrectAnswers: quiz.settings?.showCorrectAnswers !== false,
        randomizeQuestions: quiz.settings?.randomizeQuestions || false,
        questionsPerAttempt: quiz.settings?.questionsPerAttempt || ''
      },
      isPublished: quiz.isPublished || false,
      dueDate: quiz.dueDate ? new Date(quiz.dueDate).toISOString().slice(0, 16) : '',
      availableFrom: quiz.availableFrom ? new Date(quiz.availableFrom).toISOString().slice(0, 16) : '',
      availableUntil: quiz.availableUntil ? new Date(quiz.availableUntil).toISOString().slice(0, 16) : ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      if (data.success) {
        await fetchQuizzes(true);
        alert('Quiz deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete quiz');
      }
    } catch (err) {
      console.error('Delete quiz error:', err);
      setError(err.message || 'Failed to delete quiz');
    }
  };

  const togglePublishStatus = async (quizId, currentStatus) => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/${quizId}/publish`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isPublished: !currentStatus })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      if (data.success) {
        await fetchQuizzes(true);
      } else {
        throw new Error(data.message || 'Failed to update quiz status');
      }
    } catch (err) {
      console.error('Toggle publish error:', err);
      setError(err.message || 'Failed to update quiz status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      course: '',
      lesson: '',
      questions: [{
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
      }],
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
      isPublished: false,
      dueDate: '',
      availableFrom: '',
      availableUntil: ''
    });
    setFormErrors({});
  };

  const handleViewAnalytics = (quiz) => {
    setSelectedQuizAnalytics(quiz);
    setShowAnalytics(true);
    fetchQuizAnalytics(quiz._id);
  };

  // Filter quizzes based on search term
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Loading state
  if (loading && quizzes.length === 0) {
    return (
      <div className="instructor-quizzes">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="instructor-quizzes">
      <div className="quizzes-header">
        <div className="header-content">
          <h1>Manage Quizzes</h1>
          <p>Create and manage quizzes for your courses</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={() => fetchQuizzes(true)}
            disabled={refreshing}
            title="Refresh quizzes"
          >
            <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} />
          </button>
          <button 
            className="add-quiz-btn"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="icon" />
            Create New Quiz
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle className="icon" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="close-error">
            <X className="icon" />
          </button>
        </div>
      )}

      <div className="quizzes-controls">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filters">
          <select 
            value={selectedCourse} 
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>{course.title}</option>
            ))}
          </select>
          
          <select 
            value={statusFilter} 
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          
          <select 
            value={`${sortBy}-${sortOrder}`} 
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
              setCurrentPage(1);
            }}
            className="sort-select"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="dueDate-asc">Due Date</option>
          </select>
        </div>
      </div>

      <div className="quizzes-grid">
        {filteredQuizzes.map(quiz => (
          <div key={quiz._id} className="quiz-card">
            <div className="quiz-header">
              <div className="quiz-info">
                <h3 className="quiz-title">{quiz.title}</h3>
                <p className="quiz-course">{quiz.course?.title || 'Unknown Course'}</p>
                {quiz.lesson && <p className="quiz-lesson">Lesson: {quiz.lesson.title}</p>}
                {quiz.description && <p className="quiz-description">{quiz.description}</p>}
              </div>
              <div className="quiz-status">
                <span className={`status-badge ${quiz.isPublished ? 'published' : 'draft'}`}>
                  {quiz.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
            
            <div className="quiz-meta">
              <div className="meta-item">
                <HelpCircle className="icon" />
                <span>{quiz.questions?.length || 0} questions</span>
              </div>
              <div className="meta-item">
                <Award className="icon" />
                <span>{quiz.totalPoints || 0} points</span>
              </div>
              <div className="meta-item">
                <Clock className="icon" />
                <span>{formatDuration(quiz.settings?.timeLimit)}</span>
              </div>
              <div className="meta-item">
                <Users className="icon" />
                <span>{quiz.attemptCount || 0} attempts</span>
              </div>
            </div>

            {quiz.dueDate && (
              <div className="quiz-dates">
                <div className="date-item">
                  <Calendar className="icon" />
                  <span>Due: {formatDate(quiz.dueDate)}</span>
                </div>
              </div>
            )}
            
            <div className="quiz-actions">
              <button 
                className="action-btn edit"
                onClick={() => handleEdit(quiz)}
                title="Edit Quiz"
              >
                <Edit className="icon" />
              </button>
              <button 
                className={`action-btn ${quiz.isPublished ? 'unpublish' : 'publish'}`}
                onClick={() => togglePublishStatus(quiz._id, quiz.isPublished)}
                title={quiz.isPublished ? 'Unpublish' : 'Publish'}
              >
                {quiz.isPublished ? <EyeOff className="icon" /> : <Eye className="icon" />}
              </button>
              <button 
                className="action-btn analytics"
                onClick={() => handleViewAnalytics(quiz)}
                title="View Analytics"
              >
                <BarChart3 className="icon" />
              </button>
              <button 
                className="action-btn delete"
                onClick={() => handleDelete(quiz._id)}
                title="Delete Quiz"
              >
                <Trash2 className="icon" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredQuizzes.length === 0 && !loading && (
        <div className="empty-state">
          <HelpCircle className="empty-icon" />
          <h3>No quizzes found</h3>
          <p>
            {searchTerm 
              ? 'Try adjusting your search terms or filters' 
              : 'Create your first quiz to get started'
            }
          </p>
          {!searchTerm && (
            <button 
              className="create-first-quiz-btn"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="icon" />
              Create Your First Quiz
            </button>
          )}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={!pagination.hasPrevPage || loading}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="page-btn"
          >
            Previous
          </button>
          <span className="page-info">
            Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
          </span>
          <button 
            disabled={!pagination.hasNextPage || loading}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="page-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit Quiz Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddModal(false);
            setEditingQuiz(null);
            resetForm();
          }
        }}>
          <div className="modal-content quiz-modal">
            <div className="modal-header">
              <h2>{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
              <button 
                className="close-modal"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingQuiz(null);
                  resetForm();
                }}
              >
                <X className="icon" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="quiz-form">
              {/* Basic Information */}
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="title">Quiz Title *</label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={formErrors.title ? 'error' : ''}
                      maxLength="100"
                      placeholder="Enter quiz title"
                    />
                    {formErrors.title && <span className="error-text">{formErrors.title}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="course">Course *</label>
                    <select
                      id="course"
                      name="course"
                      value={formData.course}
                      onChange={(e) => {
                        handleInputChange(e);
                        fetchLessons(e.target.value);
                      }}
                      className={formErrors.course ? 'error' : ''}
                    >
                      <option value="">Select Course</option>
                      {courses.map(course => (
                        <option key={course._id} value={course._id}>{course.title}</option>
                      ))}
                    </select>
                    {formErrors.course && <span className="error-text">{formErrors.course}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="lesson">Lesson (Optional)</label>
                    <select
                      id="lesson"
                      name="lesson"
                      value={formData.lesson}
                      onChange={handleInputChange}
                      disabled={!formData.course}
                    >
                      <option value="">Select Lesson (Optional)</option>
                      {lessons.map(lesson => (
                        <option key={lesson._id} value={lesson._id}>{lesson.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    maxLength="500"
                    rows="3"
                    placeholder="Optional quiz description"
                  />
                  <div className="char-count">{formData.description.length}/500</div>
                </div>
              </div>

              {/* Questions Section */}
              <div className="form-section">
                <div className="section-header">
                  <h3>Questions</h3>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="add-question-btn"
                  >
                    <Plus className="icon" />
                    Add Question
                  </button>
                </div>

                {formData.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="question-card">
                    <div className="question-header">
                      <h4>Question {questionIndex + 1}</h4>
                      {formData.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(questionIndex)}
                          className="remove-question-btn"
                        >
                          <X className="icon" />
                        </button>
                      )}
                    </div>

                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label htmlFor={`question_${questionIndex}`}>Question Text *</label>
                        <textarea
                          id={`question_${questionIndex}`}
                          value={question.question}
                          onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                          className={formErrors[`question_${questionIndex}`] ? 'error' : ''}
                          rows="3"
                          placeholder="Enter your question"
                        />
                        {formErrors[`question_${questionIndex}`] && 
                          <span className="error-text">{formErrors[`question_${questionIndex}`]}</span>}
                      </div>

                      <div className="form-group">
                        <label htmlFor={`type_${questionIndex}`}>Question Type</label>
                        <select
                          id={`type_${questionIndex}`}
                          value={question.type}
                          onChange={(e) => handleQuestionChange(questionIndex, 'type', e.target.value)}
                        >
                          {questionTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor={`points_${questionIndex}`}>Points</label>
                        <input
                          type="number"
                          id={`points_${questionIndex}`}
                          value={question.points}
                          onChange={(e) => handleQuestionChange(questionIndex, 'points', e.target.value)}
                          min="0"
                          max="100"
                          className={formErrors[`question_${questionIndex}_points`] ? 'error' : ''}
                        />
                        {formErrors[`question_${questionIndex}_points`] && 
                          <span className="error-text">{formErrors[`question_${questionIndex}_points`]}</span>}
                      </div>

                      <div className="form-group">
                        <label htmlFor={`difficulty_${questionIndex}`}>Difficulty</label>
                        <select
                          id={`difficulty_${questionIndex}`}
                          value={question.difficulty}
                          onChange={(e) => handleQuestionChange(questionIndex, 'difficulty', e.target.value)}
                        >
                          {difficulties.map(diff => (
                            <option key={diff.value} value={diff.value}>{diff.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Options for multiple choice and true/false */}
                    {(question.type === 'multiple-choice' || question.type === 'true-false') && (
                      <div className="options-section">
                        <div className="options-header">
                          <label>Answer Options</label>
                          {question.type === 'multiple-choice' && (
                            <button
                              type="button"
                              onClick={() => addOption(questionIndex)}
                              className="add-option-btn"
                            >
                              <Plus className="icon" />
                              Add Option
                            </button>
                          )}
                        </div>
                        
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="option-item">
                            <div className="option-input">
                              <input
                                type="text"
                                value={option.text}
                                onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'text', e.target.value)}
                                placeholder={`Option ${optionIndex + 1}`}
                                className={formErrors[`question_${questionIndex}_option_${optionIndex}`] ? 'error' : ''}
                              />
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={option.isCorrect}
                                  onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'isCorrect', e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                Correct
                              </label>
                            </div>
                            {question.type === 'multiple-choice' && question.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(questionIndex, optionIndex)}
                                className="remove-option-btn"
                              >
                                <X className="icon" />
                              </button>
                            )}
                            {formErrors[`question_${questionIndex}_option_${optionIndex}`] && 
                              <span className="error-text">{formErrors[`question_${questionIndex}_option_${optionIndex}`]}</span>}
                          </div>
                        ))}
                        
                        {formErrors[`question_${questionIndex}_options`] && 
                          <span className="error-text">{formErrors[`question_${questionIndex}_options`]}</span>}
                      </div>
                    )}

                    {/* Correct answer for short answer and essay */}
                    {(question.type === 'short-answer' || question.type === 'essay') && (
                      <div className="form-group full-width">
                        <label htmlFor={`correctAnswer_${questionIndex}`}>
                          {question.type === 'essay' ? 'Sample Answer/Rubric' : 'Correct Answer'} *
                        </label>
                        <textarea
                          id={`correctAnswer_${questionIndex}`}
                          value={question.correctAnswer}
                          onChange={(e) => handleQuestionChange(questionIndex, 'correctAnswer', e.target.value)}
                          className={formErrors[`question_${questionIndex}_answer`] ? 'error' : ''}
                          rows={question.type === 'essay' ? "5" : "2"}
                          placeholder={question.type === 'essay' 
                            ? "Provide a sample answer or grading rubric" 
                            : "Enter the correct answer"
                          }
                        />
                        {formErrors[`question_${questionIndex}_answer`] && 
                          <span className="error-text">{formErrors[`question_${questionIndex}_answer`]}</span>}
                      </div>
                    )}

                    <div className="form-group full-width">
                      <label htmlFor={`explanation_${questionIndex}`}>Explanation (Optional)</label>
                      <textarea
                        id={`explanation_${questionIndex}`}
                        value={question.explanation}
                        onChange={(e) => handleQuestionChange(questionIndex, 'explanation', e.target.value)}
                        rows="2"
                        placeholder="Explain why this is the correct answer"
                      />
                    </div>
                  </div>
                ))}

                {formErrors.questions && (
                  <div className="form-error">
                    <AlertCircle className="icon" />
                    {formErrors.questions}
                  </div>
                )}
              </div>

              {/* Quiz Settings */}
              <div className="form-section">
                <h3>Quiz Settings</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="settings.timeLimit">Time Limit (minutes)</label>
                    <input
                      type="number"
                      id="settings.timeLimit"
                      name="settings.timeLimit"
                      value={formData.settings.timeLimit}
                      onChange={handleInputChange}
                      min="1"
                      max="300"
                      placeholder="No limit"
                      className={formErrors['settings.timeLimit'] ? 'error' : ''}
                    />
                    {formErrors['settings.timeLimit'] && 
                      <span className="error-text">{formErrors['settings.timeLimit']}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="settings.attempts">Max Attempts</label>
                    <input
                      type="number"
                      id="settings.attempts"
                      name="settings.attempts"
                      value={formData.settings.attempts}
                      onChange={handleInputChange}
                      min="1"
                      max="10"
                      className={formErrors['settings.attempts'] ? 'error' : ''}
                    />
                    {formErrors['settings.attempts'] && 
                      <span className="error-text">{formErrors['settings.attempts']}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="settings.passingScore">Passing Score (%)</label>
                    <input
                      type="number"
                      id="settings.passingScore"
                      name="settings.passingScore"
                      value={formData.settings.passingScore}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      className={formErrors['settings.passingScore'] ? 'error' : ''}
                    />
                    {formErrors['settings.passingScore'] && 
                      <span className="error-text">{formErrors['settings.passingScore']}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="settings.showResults">Show Results</label>
                    <select
                      id="settings.showResults"
                      name="settings.showResults"
                      value={formData.settings.showResults}
                      onChange={handleInputChange}
                    >
                      {resultOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="settings.questionsPerAttempt">Questions Per Attempt</label>
                    <input
                      type="number"
                      id="settings.questionsPerAttempt"
                      name="settings.questionsPerAttempt"
                      value={formData.settings.questionsPerAttempt}
                      onChange={handleInputChange}
                      min="1"
                      placeholder="All questions"
                    />
                    <small className="help-text">Leave empty to show all questions</small>
                  </div>
                </div>

                <div className="form-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="settings.shuffleQuestions"
                      checked={formData.settings.shuffleQuestions}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    Shuffle Questions
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="settings.shuffleOptions"
                      checked={formData.settings.shuffleOptions}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    Shuffle Answer Options
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="settings.showCorrectAnswers"
                      checked={formData.settings.showCorrectAnswers}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    Show Correct Answers After Submission
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="settings.randomizeQuestions"
                      checked={formData.settings.randomizeQuestions}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    Randomize Question Selection
                  </label>
                </div>
              </div>

              {/* Scheduling */}
              <div className="form-section">
                <h3>Availability & Scheduling</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="availableFrom">Available From</label>
                    <input
                      type="datetime-local"
                      id="availableFrom"
                      name="availableFrom"
                      value={formData.availableFrom}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="availableUntil">Available Until</label>
                    <input
                      type="datetime-local"
                      id="availableUntil"
                      name="availableUntil"
                      value={formData.availableUntil}
                      onChange={handleInputChange}
                      className={formErrors.availableUntil ? 'error' : ''}
                    />
                    {formErrors.availableUntil && 
                      <span className="error-text">{formErrors.availableUntil}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="dueDate">Due Date</label>
                    <input
                      type="datetime-local"
                      id="dueDate"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      className={formErrors.dueDate ? 'error' : ''}
                    />
                    {formErrors.dueDate && 
                      <span className="error-text">{formErrors.dueDate}</span>}
                  </div>
                </div>

                <div className="form-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isPublished"
                      checked={formData.isPublished}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    Publish quiz immediately
                  </label>
                </div>
              </div>

              {formErrors.general && (
                <div className="form-error">
                  <AlertCircle className="icon" />
                  {formErrors.general}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingQuiz(null);
                    resetForm();
                  }}
                  className="cancel-btn"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="submit-btn"
                >
                  {submitting ? (
                    <>
                      <div className="spinner small"></div>
                      {editingQuiz ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="icon" />
                      {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Analytics Modal */}
      {showAnalytics && selectedQuizAnalytics && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAnalytics(false);
            setSelectedQuizAnalytics(null);
            setQuizAttempts([]);
          }
        }}>
          <div className="modal-content analytics-modal">
            <div className="modal-header">
              <h2>Quiz Analytics: {selectedQuizAnalytics.title}</h2>
              <button 
                className="close-modal"
                onClick={() => {
                  setShowAnalytics(false);
                  setSelectedQuizAnalytics(null);
                  setQuizAttempts([]);
                }}
              >
                <X className="icon" />
              </button>
            </div>
            
            <div className="analytics-content">
              <div className="analytics-summary">
                <div className="summary-card">
                  <div className="summary-icon">
                    <Users className="icon" />
                  </div>
                  <div className="summary-info">
                    <h3>{quizAttempts.length}</h3>
                    <p>Total Attempts</p>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-icon">
                    <Award className="icon" />
                  </div>
                  <div className="summary-info">
                    <h3>
                      {quizAttempts.length > 0 
                        ? Math.round(quizAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / quizAttempts.length)
                        : 0
                      }%
                    </h3>
                    <p>Average Score</p>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-icon">
                    <CheckCircle className="icon" />
                  </div>
                  <div className="summary-info">
                    <h3>{quizAttempts.filter(attempt => attempt.isPassed).length}</h3>
                    <p>Passed</p>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-icon">
                    <XCircle className="icon" />
                  </div>
                  <div className="summary-info">
                    <h3>{quizAttempts.filter(attempt => !attempt.isPassed).length}</h3>
                    <p>Failed</p>
                  </div>
                </div>
              </div>

              <div className="attempts-list">
                <h3>Student Attempts</h3>
                {quizAttempts.length > 0 ? (
                  <div className="attempts-table">
                    <div className="table-header">
                      <div className="header-cell">Student</div>
                      <div className="header-cell">Attempt</div>
                      <div className="header-cell">Score</div>
                      <div className="header-cell">Percentage</div>
                      <div className="header-cell">Status</div>
                      <div className="header-cell">Submitted</div>
                    </div>
                    {quizAttempts.map((attempt, index) => (
                      <div key={attempt._id} className="table-row">
                        <div className="table-cell">
                          {attempt.student?.firstName} {attempt.student?.lastName}
                        </div>
                        <div className="table-cell">#{attempt.attemptNumber}</div>
                        <div className="table-cell">{attempt.score}/{selectedQuizAnalytics.totalPoints}</div>
                        <div className="table-cell">{attempt.percentage}%</div>
                        <div className="table-cell">
                          <span className={`status-badge ${attempt.isPassed ? 'passed' : 'failed'}`}>
                            {attempt.isPassed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        <div className="table-cell">
                          {attempt.submittedAt ? formatDate(attempt.submittedAt) : 'In Progress'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-attempts">
                    <HelpCircle className="empty-icon" />
                    <p>No attempts yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorQuizzes;