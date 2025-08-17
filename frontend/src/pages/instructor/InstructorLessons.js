import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Play,
  FileText,
  HelpCircle,
  FileImage,
  BookOpen,
  Clock,
  Users,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Video,
  File,
  List,
  Gift,
  Lock
} from 'lucide-react';
import './InstructorLessons.css';

const API_BASE_URL = 'http://localhost:5555';

const InstructorLessons = ({ courseId = null }) => {
  // State management
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('order');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '',
    section: '',
    order: 1,
    type: 'video',
    isPreview: false,
    isFree: false,
    isPublished: false,
    content: {
      videoUrl: '',
      videoThumbnail: '',
      videoDuration: '',
      videoSize: '',
      textContent: '',
      documentUrl: '',
      documentType: '',
      documentSize: '',
      assignmentInstructions: '',
      assignmentDueDate: '',
      maxScore: 100,
      resources: []
    },
    completionCriteria: {
      watchPercentage: 80,
      requireQuizPass: false,
      minQuizScore: 70
    }
  });
  const [formErrors, setFormErrors] = useState({});

  // Constants
  const lessonTypes = [
    { value: 'video', label: 'Video Lesson', icon: Video },
    { value: 'text', label: 'Text Content', icon: FileText },
    { value: 'quiz', label: 'Quiz', icon: HelpCircle },
    { value: 'assignment', label: 'Assignment', icon: Edit },
    { value: 'document', label: 'Document', icon: File }
  ];

  const documentTypes = [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'other'
  ];

  const resourceTypes = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'doc', label: 'Word Document' },
    { value: 'link', label: 'External Link' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video' },
    { value: 'other', label: 'Other' }
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

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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
        if (!selectedCourse && data.data?.courses?.length > 0) {
          setSelectedCourse(data.data.courses[0]._id);
        }
      }
    } catch (err) {
      console.error('Fetch courses error:', err);
      setError('Failed to fetch courses');
    }
  }, [selectedCourse]);

  const fetchLessons = useCallback(async (showRefreshing = false) => {
    if (!selectedCourse) {
      setLessons([]);
      setLoading(false);
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError('');
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/lessons/course/${selectedCourse}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setLessons(data.data?.lessons || []);
      } else {
        throw new Error(data.message || 'Failed to fetch lessons');
      }
    } catch (err) {
      console.error('Fetch lessons error:', err);
      setError(err.message || 'Failed to fetch lessons');
      setLessons([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCourse]);

  // Effects
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons();
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

  const handleResourceChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        resources: prev.content.resources.map((resource, i) => 
          i === index ? { ...resource, [field]: value } : resource
        )
      }
    }));
  };

  const addResource = () => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        resources: [...prev.content.resources, { title: '', url: '', type: 'link' }]
      }
    }));
  };

  const removeResource = (index) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        resources: prev.content.resources.filter((_, i) => i !== index)
      }
    }));
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title?.trim()) {
      errors.title = 'Lesson title is required';
    } else if (formData.title.trim().length > 100) {
      errors.title = 'Title cannot exceed 100 characters';
    }
    
    if (!formData.course) {
      errors.course = 'Course selection is required';
    }
    
    if (!formData.section?.trim()) {
      errors.section = 'Section is required';
    }
    
    if (!formData.order || formData.order < 1) {
      errors.order = 'Valid order is required (minimum 1)';
    }
    
    if (!formData.type) {
      errors.type = 'Lesson type is required';
    }

    // Type-specific validation
    if (formData.type === 'video') {
      if (!formData.content.videoUrl?.trim()) {
        errors['content.videoUrl'] = 'Video URL is required for video lessons';
      }
    } else if (formData.type === 'text') {
      if (!formData.content.textContent?.trim()) {
        errors['content.textContent'] = 'Text content is required for text lessons';
      }
    } else if (formData.type === 'document') {
      if (!formData.content.documentUrl?.trim()) {
        errors['content.documentUrl'] = 'Document URL is required for document lessons';
      }
    } else if (formData.type === 'assignment') {
      if (!formData.content.assignmentInstructions?.trim()) {
        errors['content.assignmentInstructions'] = 'Assignment instructions are required';
      }
    }

    // Completion criteria validation
    if (formData.completionCriteria.watchPercentage < 50 || formData.completionCriteria.watchPercentage > 100) {
      errors['completionCriteria.watchPercentage'] = 'Watch percentage must be between 50-100%';
    }

    if (formData.completionCriteria.requireQuizPass && 
        (formData.completionCriteria.minQuizScore < 0 || formData.completionCriteria.minQuizScore > 100)) {
      errors['completionCriteria.minQuizScore'] = 'Quiz score must be between 0-100%';
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
      
      const lessonData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        course: formData.course || selectedCourse,
        section: formData.section.trim(),
        order: parseInt(formData.order),
        type: formData.type,
        isPreview: formData.isPreview,
        isFree: formData.isFree,
        isPublished: formData.isPublished,
        content: {
          ...formData.content,
          resources: formData.content.resources.filter(r => r.title && r.url)
        },
        completionCriteria: formData.completionCriteria
      };

      const url = editingLesson 
        ? `${API_BASE_URL}/api/lessons/${editingLesson._id}`
        : `${API_BASE_URL}/api/lessons`;
      
      const method = editingLesson ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(lessonData)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}`);
      }
      
      if (responseData.success) {
        setShowAddModal(false);
        setEditingLesson(null);
        resetForm();
        await fetchLessons(true);
        alert(`Lesson ${editingLesson ? 'updated' : 'created'} successfully!`);
      } else {
        throw new Error(responseData.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Submit lesson error:', err);
      setFormErrors({ general: err.message || 'Failed to save lesson' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title || '',
      description: lesson.description || '',
      course: lesson.course || '',
      section: lesson.section || '',
      order: lesson.order || 1,
      type: lesson.type || 'video',
      isPreview: lesson.isPreview || false,
      isFree: lesson.isFree || false,
      isPublished: lesson.isPublished || false,
      content: {
        videoUrl: lesson.content?.videoUrl || '',
        videoThumbnail: lesson.content?.videoThumbnail || '',
        videoDuration: lesson.content?.videoDuration || '',
        videoSize: lesson.content?.videoSize || '',
        textContent: lesson.content?.textContent || '',
        documentUrl: lesson.content?.documentUrl || '',
        documentType: lesson.content?.documentType || '',
        documentSize: lesson.content?.documentSize || '',
        assignmentInstructions: lesson.content?.assignmentInstructions || '',
        assignmentDueDate: lesson.content?.assignmentDueDate || '',
        maxScore: lesson.content?.maxScore || 100,
        resources: lesson.content?.resources || []
      },
      completionCriteria: {
        watchPercentage: lesson.completionCriteria?.watchPercentage || 80,
        requireQuizPass: lesson.completionCriteria?.requireQuizPass || false,
        minQuizScore: lesson.completionCriteria?.minQuizScore || 70
      }
    });
    setShowAddModal(true);
  };

  const handleDelete = async (lessonId) => {
    if (!window.confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
      return;
    }

    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/lessons/${lessonId}`, {
        method: 'DELETE',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      if (data.success) {
        await fetchLessons(true);
        alert('Lesson deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete lesson');
      }
    } catch (err) {
      console.error('Delete lesson error:', err);
      setError(err.message || 'Failed to delete lesson');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      course: selectedCourse || '',
      section: '',
      order: 1,
      type: 'video',
      isPreview: false,
      isFree: false,
      isPublished: false,
      content: {
        videoUrl: '',
        videoThumbnail: '',
        videoDuration: '',
        videoSize: '',
        textContent: '',
        documentUrl: '',
        documentType: '',
        documentSize: '',
        assignmentInstructions: '',
        assignmentDueDate: '',
        maxScore: 100,
        resources: []
      },
      completionCriteria: {
        watchPercentage: 80,
        requireQuizPass: false,
        minQuizScore: 70
      }
    });
    setFormErrors({});
  };

  // Data processing
  const getUniqueSections = () => {
    const sections = [...new Set(lessons.map(lesson => lesson.section))];
    return sections.sort();
  };

  const groupLessonsBySection = (filteredLessons) => {
    const grouped = {};
    filteredLessons.forEach(lesson => {
      if (!grouped[lesson.section]) {
        grouped[lesson.section] = [];
      }
      grouped[lesson.section].push(lesson);
    });
    
    // Sort lessons within each section
    Object.keys(grouped).forEach(section => {
      grouped[section].sort((a, b) => {
        if (sortBy === 'order') {
          return sortOrder === 'asc' ? a.order - b.order : b.order - a.order;
        } else if (sortBy === 'title') {
          return sortOrder === 'asc' 
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        } else if (sortBy === 'createdAt') {
          return sortOrder === 'asc' 
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.createdAt) - new Date(a.createdAt);
        }
        return 0;
      });
    });
    
    return grouped;
  };

  // Filter and sort lessons
  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lesson.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'all' || lesson.section === sectionFilter;
    const matchesType = typeFilter === 'all' || lesson.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'published' && lesson.isPublished) ||
                         (statusFilter === 'draft' && !lesson.isPublished);
    
    return matchesSearch && matchesSection && matchesType && matchesStatus;
  });

  const groupedLessons = groupLessonsBySection(filteredLessons);
  const sectionNames = Object.keys(groupedLessons).sort();

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  // Get lesson type icon
  const getLessonTypeIcon = (type) => {
    const typeConfig = lessonTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : BookOpen;
  };

  // Loading state
  if (loading && lessons.length === 0) {
    return (
      <div className="instructor-lessons">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading lessons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="instructor-lessons">
      <div className="lessons-header">
        <div className="header-content">
          <h1>Manage Lessons</h1>
          <p>Create and organize lessons for your courses</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={() => fetchLessons(true)}
            disabled={refreshing}
            title="Refresh lessons"
          >
            <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} />
          </button>
          <button 
            className="add-lesson-btn"
            onClick={() => setShowAddModal(true)}
            disabled={!selectedCourse}
          >
            <Plus className="icon" />
            Add New Lesson
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

      {/* Course Selection */}
      <div className="course-selection">
        <label htmlFor="courseSelect">Select Course:</label>
        <select
          id="courseSelect"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="course-select"
        >
          <option value="">Choose a course...</option>
          {courses.map(course => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      <div className="lessons-controls">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filters">
          <select 
            value={sectionFilter} 
            onChange={(e) => setSectionFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Sections</option>
            {getUniqueSections().map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
          
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            {lessonTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
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
            }}
            className="sort-select"
          >
            <option value="order-asc">Order (1-9)</option>
            <option value="order-desc">Order (9-1)</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
          </select>
        </div>
      </div>

      {selectedCourse && (
        <div className="lessons-content">
          {sectionNames.length > 0 ? (
            sectionNames.map(sectionName => (
              <div key={sectionName} className="section-group">
                <div 
                  className="section-header"
                  onClick={() => toggleSection(sectionName)}
                >
                  <h3 className="section-title">
                    {sectionName}
                    <span className="lesson-count">
                      ({groupedLessons[sectionName].length} lessons)
                    </span>
                  </h3>
                  {expandedSections.has(sectionName) ? 
                    <ChevronUp className="expand-icon" /> : 
                    <ChevronDown className="expand-icon" />
                  }
                </div>
                
                {expandedSections.has(sectionName) && (
                  <div className="section-lessons">
                    {groupedLessons[sectionName].map(lesson => {
                      const TypeIcon = getLessonTypeIcon(lesson.type);
                      return (
                        <div key={lesson._id} className="lesson-card">
                          <div className="lesson-info">
                            <div className="lesson-meta">
                              <div className="lesson-type">
                                <TypeIcon className="type-icon" />
                                <span className="type-label">
                                  {lessonTypes.find(t => t.value === lesson.type)?.label || lesson.type}
                                </span>
                              </div>
                              <div className="lesson-order">#{lesson.order}</div>
                            </div>
                            
                            <h4 className="lesson-title">{lesson.title}</h4>
                            {lesson.description && (
                              <p className="lesson-description">{lesson.description}</p>
                            )}
                            
                            <div className="lesson-details">
                              {lesson.type === 'video' && lesson.content?.videoDuration && (
                                <div className="detail-item">
                                  <Clock className="detail-icon" />
                                  <span>{formatDuration(lesson.content.videoDuration)}</span>
                                </div>
                              )}
                              
                              {lesson.content?.videoSize && (
                                <div className="detail-item">
                                  <File className="detail-icon" />
                                  <span>{formatFileSize(lesson.content.videoSize)}</span>
                                </div>
                              )}
                              
                              {lesson.content?.resources?.length > 0 && (
                                <div className="detail-item">
                                  <List className="detail-icon" />
                                  <span>{lesson.content.resources.length} resources</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="lesson-badges">
                              <span className={`status-badge ${lesson.isPublished ? 'published' : 'draft'}`}>
                                {lesson.isPublished ? 'Published' : 'Draft'}
                              </span>
                              {lesson.isPreview && (
                                <span className="preview-badge">
                                  <Eye className="badge-icon" />
                                  Preview
                                </span>
                              )}
                              {lesson.isFree && (
                                <span className="free-badge">
                                  <Gift className="badge-icon" />
                                  Free
                                </span>
                              )}
                              {!lesson.isFree && !lesson.isPreview && (
                                <span className="premium-badge">
                                  <Lock className="badge-icon" />
                                  Premium
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="lesson-actions">
                            <button 
                              className="action-btn edit"
                              onClick={() => handleEdit(lesson)}
                              title="Edit Lesson"
                            >
                              <Edit className="icon" />
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => handleDelete(lesson._id)}
                              title="Delete Lesson"
                            >
                              <Trash2 className="icon" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <BookOpen className="empty-icon" />
              <h3>No lessons found</h3>
              <p>
                {searchTerm || sectionFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search terms or filters' 
                  : 'Create your first lesson to get started'
                }
              </p>
              {!searchTerm && sectionFilter === 'all' && typeFilter === 'all' && statusFilter === 'all' && (
                <button 
                  className="create-first-lesson-btn"
                  onClick={() => setShowAddModal(true)}
                  disabled={!selectedCourse}
                >
                  <Plus className="icon" />
                  Create Your First Lesson
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedCourse && (
        <div className="empty-state">
          <BookOpen className="empty-icon" />
          <h3>Select a course</h3>
          <p>Choose a course from the dropdown above to manage its lessons</p>
        </div>
      )}

      {/* Add/Edit Lesson Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddModal(false);
            setEditingLesson(null);
            resetForm();
          }
        }}>
          <div className="modal-content lesson-modal">
            <div className="modal-header">
              <h2>{editingLesson ? 'Edit Lesson' : 'Create New Lesson'}</h2>
              <button 
                className="close-modal"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLesson(null);
                  resetForm();
                }}
              >
                <X className="icon" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="lesson-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="title">Lesson Title *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={formErrors.title ? 'error' : ''}
                    maxLength="100"
                    placeholder="Enter lesson title"
                  />
                  {formErrors.title && <span className="error-text">{formErrors.title}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="course">Course *</label>
                  <select
                    id="course"
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
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
                  <label htmlFor="section">Section *</label>
                  <input
                    type="text"
                    id="section"
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    className={formErrors.section ? 'error' : ''}
                    placeholder="e.g., Introduction, Chapter 1"
                  />
                  {formErrors.section && <span className="error-text">{formErrors.section}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="order">Lesson Order *</label>
                  <input
                    type="number"
                    id="order"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    min="1"
                    className={formErrors.order ? 'error' : ''}
                    placeholder="1"
                  />
                  {formErrors.order && <span className="error-text">{formErrors.order}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="type">Lesson Type *</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className={formErrors.type ? 'error' : ''}
                  >
                    {lessonTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      );
                    })}
                  </select>
                  {formErrors.type && <span className="error-text">{formErrors.type}</span>}
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength="1000"
                  rows="3"
                  placeholder="Optional lesson description"
                />
                <div className="char-count">{formData.description.length}/1000</div>
              </div>

              {/* Type-specific content fields */}
              {formData.type === 'video' && (
                <div className="content-section">
                  <h3>Video Content</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="content.videoUrl">Video URL *</label>
                      <input
                        type="url"
                        id="content.videoUrl"
                        name="content.videoUrl"
                        value={formData.content.videoUrl}
                        onChange={handleInputChange}
                        className={formErrors['content.videoUrl'] ? 'error' : ''}
                        placeholder="https://example.com/video.mp4"
                      />
                      {formErrors['content.videoUrl'] && <span className="error-text">{formErrors['content.videoUrl']}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="content.videoThumbnail">Video Thumbnail</label>
                      <input
                        type="url"
                        id="content.videoThumbnail"
                        name="content.videoThumbnail"
                        value={formData.content.videoThumbnail}
                        onChange={handleInputChange}
                        placeholder="https://example.com/thumbnail.jpg"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="content.videoDuration">Duration (seconds)</label>
                      <input
                        type="number"
                        id="content.videoDuration"
                        name="content.videoDuration"
                        value={formData.content.videoDuration}
                        onChange={handleInputChange}
                        min="1"
                        placeholder="3600"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="content.videoSize">File Size (bytes)</label>
                      <input
                        type="number"
                        id="content.videoSize"
                        name="content.videoSize"
                        value={formData.content.videoSize}
                        onChange={handleInputChange}
                        min="1"
                        placeholder="104857600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'text' && (
                <div className="content-section">
                  <h3>Text Content</h3>
                  <div className="form-group full-width">
                    <label htmlFor="content.textContent">Text Content *</label>
                    <textarea
                      id="content.textContent"
                      name="content.textContent"
                      value={formData.content.textContent}
                      onChange={handleInputChange}
                      className={formErrors['content.textContent'] ? 'error' : ''}
                      rows="8"
                      placeholder="Enter your lesson content here..."
                    />
                    {formErrors['content.textContent'] && <span className="error-text">{formErrors['content.textContent']}</span>}
                  </div>
                </div>
              )}

              {formData.type === 'document' && (
                <div className="content-section">
                  <h3>Document Content</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="content.documentUrl">Document URL *</label>
                      <input
                        type="url"
                        id="content.documentUrl"
                        name="content.documentUrl"
                        value={formData.content.documentUrl}
                        onChange={handleInputChange}
                        className={formErrors['content.documentUrl'] ? 'error' : ''}
                        placeholder="https://example.com/document.pdf"
                      />
                      {formErrors['content.documentUrl'] && <span className="error-text">{formErrors['content.documentUrl']}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="content.documentType">Document Type</label>
                      <select
                        id="content.documentType"
                        name="content.documentType"
                        value={formData.content.documentType}
                        onChange={handleInputChange}
                      >
                        <option value="">Select type</option>
                        {documentTypes.map(type => (
                          <option key={type} value={type}>{type.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="content.documentSize">File Size (bytes)</label>
                      <input
                        type="number"
                        id="content.documentSize"
                        name="content.documentSize"
                        value={formData.content.documentSize}
                        onChange={handleInputChange}
                        min="1"
                        placeholder="1048576"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'assignment' && (
                <div className="content-section">
                  <h3>Assignment Content</h3>
                  <div className="form-group full-width">
                    <label htmlFor="content.assignmentInstructions">Instructions *</label>
                    <textarea
                      id="content.assignmentInstructions"
                      name="content.assignmentInstructions"
                      value={formData.content.assignmentInstructions}
                      onChange={handleInputChange}
                      className={formErrors['content.assignmentInstructions'] ? 'error' : ''}
                      rows="6"
                      placeholder="Provide detailed assignment instructions..."
                    />
                    {formErrors['content.assignmentInstructions'] && <span className="error-text">{formErrors['content.assignmentInstructions']}</span>}
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="content.assignmentDueDate">Due Date</label>
                      <input
                        type="datetime-local"
                        id="content.assignmentDueDate"
                        name="content.assignmentDueDate"
                        value={formData.content.assignmentDueDate}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="content.maxScore">Maximum Score</label>
                      <input
                        type="number"
                        id="content.maxScore"
                        name="content.maxScore"
                        value={formData.content.maxScore}
                        onChange={handleInputChange}
                        min="1"
                        max="1000"
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Resources Section */}
              <div className="content-section">
                <h3>Additional Resources</h3>
                {formData.content.resources.map((resource, index) => (
                  <div key={index} className="resource-item">
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Resource Title</label>
                        <input
                          type="text"
                          value={resource.title}
                          onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                          placeholder="Resource title"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Resource URL</label>
                        <input
                          type="url"
                          value={resource.url}
                          onChange={(e) => handleResourceChange(index, 'url', e.target.value)}
                          placeholder="https://example.com/resource"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Resource Type</label>
                        <select
                          value={resource.type}
                          onChange={(e) => handleResourceChange(index, 'type', e.target.value)}
                        >
                          {resourceTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeResource(index)}
                      className="remove-resource-btn"
                    >
                      <X className="icon" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addResource}
                  className="add-resource-btn"
                >
                  <Plus className="icon" />
                  Add Resource
                </button>
              </div>

              {/* Completion Criteria */}
              <div className="content-section">
                <h3>Completion Criteria</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="completionCriteria.watchPercentage">Required Watch Percentage (%)</label>
                    <input
                      type="number"
                      id="completionCriteria.watchPercentage"
                      name="completionCriteria.watchPercentage"
                      value={formData.completionCriteria.watchPercentage}
                      onChange={handleInputChange}
                      min="50"
                      max="100"
                      className={formErrors['completionCriteria.watchPercentage'] ? 'error' : ''}
                    />
                    {formErrors['completionCriteria.watchPercentage'] && <span className="error-text">{formErrors['completionCriteria.watchPercentage']}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="completionCriteria.minQuizScore">Minimum Quiz Score (%)</label>
                    <input
                      type="number"
                      id="completionCriteria.minQuizScore"
                      name="completionCriteria.minQuizScore"
                      value={formData.completionCriteria.minQuizScore}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      disabled={!formData.completionCriteria.requireQuizPass}
                      className={formErrors['completionCriteria.minQuizScore'] ? 'error' : ''}
                    />
                    {formErrors['completionCriteria.minQuizScore'] && <span className="error-text">{formErrors['completionCriteria.minQuizScore']}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="completionCriteria.requireQuizPass"
                      checked={formData.completionCriteria.requireQuizPass}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    Require quiz pass for completion
                  </label>
                </div>
              </div>

              {/* Lesson Settings */}
              <div className="content-section">
                <h3>Lesson Settings</h3>
                <div className="form-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isPreview"
                      checked={formData.isPreview}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    Allow preview (visible to non-enrolled users)
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isFree"
                      checked={formData.isFree}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    Free lesson (accessible without enrollment)
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isPublished"
                      checked={formData.isPublished}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    Publish lesson immediately
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
                    setEditingLesson(null);
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
                      {editingLesson ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="icon" />
                      {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorLessons;