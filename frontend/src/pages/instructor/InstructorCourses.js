import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  BarChart3,
  Users,
  Star,
  DollarSign,
  Calendar,
  BookOpen,
  X,
  Upload,
  Save,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import './InstructorCourses.css';

const API_BASE_URL = 'http://localhost:5555';

const InstructorCourses = () => {
  // State management
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    thumbnail: '',
    price: '',
    discountPrice: '',
    category: '',
    level: '',
    language: 'English',
    duration: '',
    requirements: [''],
    whatYouWillLearn: [''],
    tags: []
  });
  const [formErrors, setFormErrors] = useState({});

  // Constants
  const categories = [
    'Web Development',
    'Mobile Development', 
    'Data Science',
    'Machine Learning',
    'Artificial Intelligence',
    'DevOps',
    'Cloud Computing',
    'Cybersecurity',
    'UI/UX Design',
    'Digital Marketing',
    'Business',
    'Photography',
    'Music',
    'Language Learning',
    'Other'
  ];

  const levels = ['Beginner', 'Intermediate', 'Advanced'];

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

  // API functions
  const fetchCourses = useCallback(async (showRefreshing = false) => {
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
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`${API_BASE_URL}/api/courses/my-courses?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCourses(data.data?.courses || []);
        setPagination(data.data?.pagination || {});
      } else {
        throw new Error(data.message || 'Failed to fetch courses');
      }
    } catch (err) {
      console.error('Fetch courses error:', err);
      setError(err.message || 'Failed to fetch courses. Please try again.');
      setCourses([]);
      setPagination({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, statusFilter, sortBy, sortOrder]);

  // Effects
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleArrayInputChange = (index, value, arrayName) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (arrayName) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], '']
    }));
  };

  const removeArrayItem = (index, arrayName) => {
    if (formData[arrayName].length > 1) {
      setFormData(prev => ({
        ...prev,
        [arrayName]: prev[arrayName].filter((_, i) => i !== index)
      }));
    }
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag)
      .slice(0, 10); // Limit to 10 tags
    
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    // Title validation
    if (!formData.title?.trim()) {
      errors.title = 'Course title is required';
    } else if (formData.title.trim().length > 100) {
      errors.title = 'Title cannot exceed 100 characters';
    }
    
    // Description validation
    if (!formData.description?.trim()) {
      errors.description = 'Course description is required';
    } else if (formData.description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters';
    }
    
    // Short description validation
    if (!formData.shortDescription?.trim()) {
      errors.shortDescription = 'Short description is required';
    } else if (formData.shortDescription.trim().length > 200) {
      errors.shortDescription = 'Short description cannot exceed 200 characters';
    }
    
    // Thumbnail validation
    if (!formData.thumbnail?.trim()) {
      errors.thumbnail = 'Course thumbnail is required';
    } else {
      try {
        new URL(formData.thumbnail);
      } catch {
        errors.thumbnail = 'Please enter a valid URL for the thumbnail';
      }
    }
    
    // Price validation
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price < 0) {
      errors.price = 'Valid price is required (minimum 0)';
    }
    
    // Discount price validation
    if (formData.discountPrice) {
      const discountPrice = parseFloat(formData.discountPrice);
      if (isNaN(discountPrice) || discountPrice < 0) {
        errors.discountPrice = 'Discount price must be a valid number (minimum 0)';
      } else if (discountPrice >= price) {
        errors.discountPrice = 'Discount price must be less than regular price';
      }
    }
    
    // Category and level validation
    if (!formData.category) {
      errors.category = 'Course category is required';
    }
    
    if (!formData.level) {
      errors.level = 'Course level is required';
    }
    
    // Duration validation
    const duration = parseFloat(formData.duration);
    if (!formData.duration || isNaN(duration) || duration < 0.5) {
      errors.duration = 'Valid duration is required (minimum 0.5 hours)';
    }
    
    // Learning outcomes validation
    const learningOutcomes = formData.whatYouWillLearn.filter(item => item?.trim());
    if (learningOutcomes.length === 0) {
      errors.whatYouWillLearn = 'At least one learning outcome is required';
    } else {
      for (let outcome of learningOutcomes) {
        if (outcome.trim().length > 200) {
          errors.whatYouWillLearn = 'Each learning outcome cannot exceed 200 characters';
          break;
        }
      }
    }
    
    // Requirements validation
    const requirements = formData.requirements.filter(req => req?.trim());
    for (let req of requirements) {
      if (req.trim().length > 200) {
        errors.requirements = 'Each requirement cannot exceed 200 characters';
        break;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      setFormErrors({});
      
      const headers = createAuthHeaders();
      if (!headers) return;
      
      // Prepare course data
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim(),
        thumbnail: formData.thumbnail.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        level: formData.level,
        language: formData.language || 'English',
        duration: parseFloat(formData.duration),
        requirements: formData.requirements
          .filter(req => req?.trim())
          .map(req => req.trim()),
        whatYouWillLearn: formData.whatYouWillLearn
          .filter(item => item?.trim())
          .map(item => item.trim()),
        tags: formData.tags
          .filter(tag => tag?.trim())
          .map(tag => tag.trim())
      };

      // discount price if provided
      if (formData.discountPrice && parseFloat(formData.discountPrice) > 0) {
        courseData.discountPrice = parseFloat(formData.discountPrice);
      }

      console.log('Creating course with data:', courseData);

      const response = await fetch(`${API_BASE_URL}/api/courses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(courseData)
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (responseData.success) {
        setShowAddModal(false);
        resetForm();
        await fetchCourses(true); // Refresh the courses list
        setError(''); // Clear any previous errors
        
        // Show success message
        alert('Course created successfully!');
      } else {
        throw new Error(responseData.message || 'Failed to create course');
      }
    } catch (err) {
      console.error('Create course error:', err);
      
      // Handle different types of errors
      if (err.message.includes('validation') || err.message.includes('required')) {
        setFormErrors({ general: err.message });
      } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
        setFormErrors({ general: 'Authentication failed. Please log in again.' });
      } else if (err.message.includes('400')) {
        setFormErrors({ general: 'Invalid course data. Please check all fields.' });
      } else {
        setFormErrors({ general: err.message || 'Network error. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      shortDescription: '',
      thumbnail: '',
      price: '',
      discountPrice: '',
      category: '',
      level: '',
      language: 'English',
      duration: '',
      requirements: [''],
      whatYouWillLearn: [''],
      tags: []
    });
    setFormErrors({});
  };

  // Course actions
  const togglePublishStatus = async (courseId, currentStatus) => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}/publish`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isPublished: !currentStatus })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (data.success) {
        await fetchCourses(true);
      } else {
        throw new Error(data.message || 'Failed to update course status');
      }
    } catch (err) {
      console.error('Toggle publish error:', err);
      setError(err.message || 'Failed to update course status');
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (data.success) {
        await fetchCourses(true);
        alert('Course deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete course');
      }
    } catch (err) {
      console.error('Delete course error:', err);
      setError(err.message || 'Failed to delete course');
    }
  };

  // Filter courses based on search term
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.shortDescription?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Loading state
  if (loading && courses.length === 0) {
    return (
      <div className="instructor-courses">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="instructor-courses">
      <div className="courses-header">
        <div className="header-content">
          <h1>My Courses</h1>
          <p>Manage your courses and track their performance</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={() => fetchCourses(true)}
            disabled={refreshing}
            title="Refresh courses"
          >
            <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} />
          </button>
          <button 
            className="add-course-btn"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="icon" />
            Add New Course
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

      <div className="courses-controls">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filters">
          <select 
            value={statusFilter} 
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1); // Reset to first page
            }}
            className="filter-select"
          >
            <option value="all">All Courses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          
          <select 
            value={`${sortBy}-${sortOrder}`} 
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
              setCurrentPage(1); // Reset to first page
            }}
            className="sort-select"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="totalEnrollments-desc">Most Popular</option>
            <option value="averageRating-desc">Highest Rated</option>
          </select>
        </div>
      </div>

      <div className="courses-grid">
        {filteredCourses.map(course => (
          <div key={course._id} className="course-card">
            <div className="course-thumbnail">
              <img 
                src={course.thumbnail} 
                alt={course.title}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/800x400/cccccc/666666?text=No+Image';
                }}
              />
              <div className="course-status">
                <span className={`status-badge ${course.isPublished ? 'published' : 'draft'}`}>
                  {course.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
            
            <div className="course-content">
              <h3 className="course-title">{course.title}</h3>
              <p className="course-description">{course.shortDescription}</p>
              
              <div className="course-meta">
                <div className="meta-item">
                  <Users className="icon" />
                  <span>{course.totalEnrollments || 0} students</span>
                </div>
                <div className="meta-item">
                  <Star className="icon" />
                  <span>{(course.averageRating || 0).toFixed(1)}/5</span>
                </div>
                <div className="meta-item">
                  <DollarSign className="icon" />
                  <span>${course.effectivePrice || course.price}</span>
                </div>
              </div>
              
              <div className="course-actions">
                <button 
                  className="action-btn edit"
                  onClick={() => {/* Handle edit */}}
                  title="Edit Course"
                >
                  <Edit className="icon" />
                </button>
                <button 
                  className={`action-btn ${course.isPublished ? 'unpublish' : 'publish'}`}
                  onClick={() => togglePublishStatus(course._id, course.isPublished)}
                  title={course.isPublished ? 'Unpublish' : 'Publish'}
                >
                  {course.isPublished ? <EyeOff className="icon" /> : <Eye className="icon" />}
                </button>
                <button 
                  className="action-btn analytics"
                  onClick={() => {/* Handle analytics */}}
                  title="View Analytics"
                >
                  <BarChart3 className="icon" />
                </button>
                <button 
                  className="action-btn delete"
                  onClick={() => deleteCourse(course._id)}
                  title="Delete Course"
                >
                  <Trash2 className="icon" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCourses.length === 0 && !loading && (
        <div className="empty-state">
          <BookOpen className="empty-icon" />
          <h3>No courses found</h3>
          <p>
            {searchTerm 
              ? 'Try adjusting your search terms or filters' 
              : 'Create your first course to get started'
            }
          </p>
          {!searchTerm && (
            <button 
              className="create-first-course-btn"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="icon" />
              Create Your First Course
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

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddModal(false);
            resetForm();
          }
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Course</h2>
              <button 
                className="close-modal"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <X className="icon" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="course-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="title">Course Title *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={formErrors.title ? 'error' : ''}
                    maxLength="100"
                    placeholder="Enter course title"
                  />
                  {formErrors.title && <span className="error-text">{formErrors.title}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={formErrors.category ? 'error' : ''}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {formErrors.category && <span className="error-text">{formErrors.category}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="level">Level *</label>
                  <select
                    id="level"
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className={formErrors.level ? 'error' : ''}
                  >
                    <option value="">Select Level</option>
                    {levels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  {formErrors.level && <span className="error-text">{formErrors.level}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="language">Language</label>
                  <input
                    type="text"
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    placeholder="English"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="price">Price ($) *</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={formErrors.price ? 'error' : ''}
                    placeholder="0.00"
                  />
                  {formErrors.price && <span className="error-text">{formErrors.price}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="discountPrice">Discount Price ($)</label>
                  <input
                    type="number"
                    id="discountPrice"
                    name="discountPrice"
                    value={formData.discountPrice}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={formErrors.discountPrice ? 'error' : ''}
                    placeholder="Optional"
                  />
                  {formErrors.discountPrice && <span className="error-text">{formErrors.discountPrice}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="duration">Duration (hours) *</label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="0.5"
                    step="0.5"
                    className={formErrors.duration ? 'error' : ''}
                    placeholder="1.0"
                  />
                  {formErrors.duration && <span className="error-text">{formErrors.duration}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="thumbnail">Thumbnail URL *</label>
                  <input
                    type="url"
                    id="thumbnail"
                    name="thumbnail"
                    value={formData.thumbnail}
                    onChange={handleInputChange}
                    className={formErrors.thumbnail ? 'error' : ''}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formErrors.thumbnail && <span className="error-text">{formErrors.thumbnail}</span>}
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="shortDescription">Short Description *</label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  maxLength="200"
                  className={formErrors.shortDescription ? 'error' : ''}
                  rows="3"
                  placeholder="Brief description of your course"
                />
                <div className="char-count">{formData.shortDescription.length}/200</div>
                {formErrors.shortDescription && <span className="error-text">{formErrors.shortDescription}</span>}
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Full Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength="2000"
                  className={formErrors.description ? 'error' : ''}
                  rows="6"
                  placeholder="Detailed description of your course content"
                />
                <div className="char-count">{formData.description.length}/2000</div>
                {formErrors.description && <span className="error-text">{formErrors.description}</span>}
              </div>

              <div className="form-group full-width">
                <label>What You Will Learn *</label>
                {formData.whatYouWillLearn.map((item, index) => (
                  <div key={index} className="array-input">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleArrayInputChange(index, e.target.value, 'whatYouWillLearn')}
                      placeholder="Learning outcome"
                      maxLength="200"
                    />
                    {formData.whatYouWillLearn.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem(index, 'whatYouWillLearn')}
                        className="remove-item-btn"
                      >
                        <X className="icon" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('whatYouWillLearn')}
                  className="add-item-btn"
                >
                  <Plus className="icon" />
                  Add Learning Outcome
                </button>
                {formErrors.whatYouWillLearn && <span className="error-text">{formErrors.whatYouWillLearn}</span>}
              </div>

              <div className="form-group full-width">
                <label>Requirements</label>
                {formData.requirements.map((item, index) => (
                  <div key={index} className="array-input">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleArrayInputChange(index, e.target.value, 'requirements')}
                      placeholder="Course requirement"
                      maxLength="200"
                    />
                    {formData.requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem(index, 'requirements')}
                        className="remove-item-btn"
                      >
                        <X className="icon" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('requirements')}
                  className="add-item-btn"
                >
                  <Plus className="icon" />
                  Add Requirement
                </button>
                {formErrors.requirements && <span className="error-text">{formErrors.requirements}</span>}
              </div>

              <div className="form-group full-width">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  value={formData.tags.join(', ')}
                  onChange={handleTagsChange}
                  placeholder="react, javascript, web development"
                />
                <small className="help-text">Add up to 10 tags to help students find your course</small>
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="icon" />
                      Create Course
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

export default InstructorCourses;