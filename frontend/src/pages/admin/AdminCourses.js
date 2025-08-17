import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Star, 
  StarOff,
  Users,
  DollarSign,
  BookOpen,
  Calendar,
  AlertTriangle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Settings,
  BarChart3
} from 'lucide-react';
import './AdminCourses.css';

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [currentCourse, setCurrentCourse] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [pagination, setPagination] = useState({});
  
  // Filters and search
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    category: '',
    level: '',
    status: '',
    instructor: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [categories] = useState([
    'Programming', 'Design', 'Business', 'Marketing', 
    'Photography', 'Music', 'Language', 'Health & Fitness'
  ]);

  const [levels] = useState(['Beginner', 'Intermediate', 'Advanced']);

  const API_BASE_URL = 'http://localhost:5555/api';

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('userToken');
  };

  // API call helper
  const apiCall = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    
    return data;
  };

  // Fetch all courses
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const data = await apiCall(`/courses/admin/all?${queryParams}`);
      
      if (data.success) {
        setCourses(data.data.courses);
        setStatistics(data.data.statistics);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update course status
  const updateCourseStatus = async (courseId, statusData) => {
    try {
      const data = await apiCall(`/courses/admin/${courseId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusData)
      });

      if (data.success) {
        fetchCourses(); // Refresh the list
        return { success: true, message: data.message };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Delete course
  const deleteCourse = async (courseId, forceDelete = false) => {
    try {
      const data = await apiCall(`/courses/admin/${courseId}`, {
        method: 'DELETE',
        body: JSON.stringify({ forceDelete })
      });

      if (data.success) {
        fetchCourses(); // Refresh the list
        return { success: true, message: data.message };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Bulk actions
  const performBulkAction = async (action, actionData = {}) => {
    if (selectedCourses.length === 0) {
      setError('Please select courses first');
      return;
    }

    try {
      const data = await apiCall('/courses/admin/bulk-action', {
        method: 'PUT',
        body: JSON.stringify({
          courseIds: selectedCourses,
          action,
          actionData
        })
      });

      if (data.success) {
        setSelectedCourses([]);
        fetchCourses();
        return { success: true, message: data.message };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  // Handle course selection
  const handleCourseSelect = (courseId) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(courses.map(course => course._id));
    }
  };

  // Modal handlers
  const openModal = (type, course = null) => {
    setModalType(type);
    setCurrentCourse(course);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setCurrentCourse(null);
  };

  // Load courses on component mount and filter changes
  useEffect(() => {
    fetchCourses();
  }, [filters]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && courses.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <RefreshCw className="loading-spinner" />
          <span className="loading-text">Loading courses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-courses">
      {/* Header */}
      <div className="admin-courses-header">
        <div className="admin-courses-header-container">
          <div className="admin-courses-header-content">
            <div>
              <h1 className="admin-courses-title">Course Management</h1>
              <p className="admin-courses-subtitle">Manage all courses in the platform</p>
            </div>
            <div className="admin-courses-header-buttons">
              <button
                onClick={fetchCourses}
                className="header-button"
              >
                <RefreshCw />
                Refresh
              </button>
              <button className="header-button">
                <Download />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-courses-main">
        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-card-content">
              <BookOpen className="stats-card-icon blue" />
              <div className="stats-card-info">
                <p className="stats-card-label">Total Courses</p>
                <p className="stats-card-value">{statistics.totalCourses || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="stats-card-content">
              <CheckCircle className="stats-card-icon green" />
              <div className="stats-card-info">
                <p className="stats-card-label">Published</p>
                <p className="stats-card-value">{statistics.publishedCourses || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="stats-card-content">
              <Users className="stats-card-icon purple" />
              <div className="stats-card-info">
                <p className="stats-card-label">Total Enrollments</p>
                <p className="stats-card-value">{statistics.totalEnrollments || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="stats-card-content">
              <DollarSign className="stats-card-icon yellow" />
              <div className="stats-card-info">
                <p className="stats-card-label">Avg. Price</p>
                <p className="stats-card-value">
                  {formatCurrency(statistics.averagePrice || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="filters-container">
          <div className="filters-form-container">
            <form onSubmit={handleSearch} className="filters-form">
              <div className="search-input-container">
                <div className="search-input-wrapper">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="filter-select"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="filter-select"
              >
                <option value="">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="featured">Featured</option>
              </select>
              
              <button
                type="submit"
                className="search-button"
              >
                Search
              </button>
            </form>
          </div>

          {/* Bulk Actions */}
          {selectedCourses.length > 0 && (
            <div className="bulk-actions">
              <div className="bulk-actions-content">
                <span className="bulk-actions-text">
                  {selectedCourses.length} course(s) selected
                </span>
                <div className="bulk-actions-buttons">
                  <button
                    onClick={() => performBulkAction('publish')}
                    className="bulk-action-button publish"
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => performBulkAction('unpublish')}
                    className="bulk-action-button unpublish"
                  >
                    Unpublish
                  </button>
                  <button
                    onClick={() => performBulkAction('feature')}
                    className="bulk-action-button feature"
                  >
                    Feature
                  </button>
                  <button
                    onClick={() => openModal('bulkDelete')}
                    className="bulk-action-button delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <div className="error-message-content">
              <AlertTriangle className="error-icon" />
              <span className="error-text">{error}</span>
            </div>
          </div>
        )}

        {/* Courses Table */}
        <div className="table-container">
          <div className="table-wrapper">
            <table className="courses-table">
              <thead className="table-header">
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedCourses.length === courses.length && courses.length > 0}
                      onChange={handleSelectAll}
                      className="checkbox"
                    />
                  </th>
                  <th>Course</th>
                  <th>Instructor</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Enrollments</th>
                  <th>Rating</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {courses.map((course) => (
                  <tr key={course._id} className="table-row">
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course._id)}
                        onChange={() => handleCourseSelect(course._id)}
                        className="checkbox"
                      />
                    </td>
                    <td className="table-cell">
                      <div className="course-info">
                        <img
                          src={course.thumbnail || '/api/placeholder/64/64'}
                          alt={course.title}
                          className="course-thumbnail"
                        />
                        <div className="course-details">
                          <div className="course-title">
                            {course.title}
                          </div>
                          <div className="course-meta">
                            {course.category} • {course.level}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="instructor-info">
                        <img
                          src={course.instructor?.avatar || '/api/placeholder/32/32'}
                          alt={`${course.instructor?.firstName} ${course.instructor?.lastName}`}
                          className="instructor-avatar"
                        />
                        <div className="instructor-details">
                          <div className="instructor-name">
                            {course.instructor?.firstName} {course.instructor?.lastName}
                          </div>
                          <div className="instructor-email">
                            {course.instructor?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="status-badges">
                        <span className={`status-badge ${course.isPublished ? 'published' : 'draft'}`}>
                          {course.isPublished ? 'Published' : 'Draft'}
                        </span>
                        {course.isFeatured && (
                          <span className="status-badge featured">
                            <Star />
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="price-text">{formatCurrency(course.price)}</span>
                    </td>
                    <td className="table-cell">
                      <span className="enrollments-text">{course.totalEnrollments || 0}</span>
                    </td>
                    <td className="table-cell">
                      <div className="rating-container">
                        <div className="rating-stars">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`rating-star ${
                                i < Math.floor(course.averageRating || 0) ? 'filled' : 'empty'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="rating-value">
                          {course.averageRating?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="date-text">{formatDate(course.createdAt)}</span>
                    </td>
                    <td className="table-cell">
                      <div className="actions-container">
                        <button
                          onClick={() => openModal('view', course)}
                          className="action-button view"
                          title="View Details"
                        >
                          <Eye />
                        </button>
                        <button
                          onClick={() => openModal('analytics', course)}
                          className="action-button analytics"
                          title="View Analytics"
                        >
                          <BarChart3 />
                        </button>
                        <button
                          onClick={() => openModal('edit', course)}
                          className="action-button edit"
                          title="Edit Course"
                        >
                          <Edit />
                        </button>
                        <button
                          onClick={() => openModal('delete', course)}
                          className="action-button delete"
                          title="Delete Course"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-mobile">
                <button
                  onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="pagination-button"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="pagination-button"
                >
                  Next
                </button>
              </div>
              <div className="pagination-desktop">
                <div>
                  <p className="pagination-info">
                    Showing page <span>{pagination.currentPage}</span> of{' '}
                    <span>{pagination.totalPages}</span> ({pagination.totalCourses} courses)
                  </p>
                </div>
                <div>
                  <nav className="pagination-nav">
                    <button
                      onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="pagination-nav-button"
                    >
                      <ChevronLeft />
                    </button>
                    <button
                      onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      className="pagination-nav-button"
                    >
                      <ChevronRight />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <Modal
          type={modalType}
          course={currentCourse}
          onClose={closeModal}
          onAction={async (action, data) => {
            let result;
            switch (action) {
              case 'updateStatus':
                result = await updateCourseStatus(currentCourse._id, data);
                break;
              case 'delete':
                result = await deleteCourse(currentCourse._id, data.forceDelete);
                break;
              case 'bulkDelete':
                result = await performBulkAction('delete', data);
                break;
            }
            
            if (result?.success) {
              closeModal();
            }
            
            return result;
          }}
          selectedCount={selectedCourses.length}
        />
      )}
    </div>
  );
};

// Modal Component
const Modal = ({ type, course, onClose, onAction, selectedCount }) => {
  const [loading, setLoading] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const handleAction = async (actionType, data = {}) => {
    setLoading(true);
    try {
      const result = await onAction(actionType, data);
      if (result?.success) {
        onClose();
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (type === 'analytics' && course) {
      try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`http://localhost:5555/api/courses/admin/${course._id}/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.data.analytics);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [type, course]);

  const renderModalContent = () => {
    switch (type) {
      case 'view':
        return (
          <div>
            <img
              src={course.thumbnail || '/api/placeholder/400/200'}
              alt={course.title}
              className="modal-course-image"
            />
            <div style={{marginTop: '1rem'}}>
              <h3 className="modal-course-title">{course.title}</h3>
              <p className="modal-course-description">{course.description}</p>
            </div>
            <div className="modal-grid" style={{marginTop: '1rem'}}>
              <div className="modal-field">
                <p className="modal-field-label">Category:</p>
                <p className="modal-field-value">{course.category}</p>
              </div>
              <div className="modal-field">
                <p className="modal-field-label">Level:</p>
                <p className="modal-field-value">{course.level}</p>
              </div>
              <div className="modal-field">
                <p className="modal-field-label">Price:</p>
                <p className="modal-field-value">${course.price}</p>
              </div>
              <div className="modal-field">
                <p className="modal-field-label">Enrollments:</p>
                <p className="modal-field-value">{course.totalEnrollments || 0}</p>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div>
            {analytics ? (
              <>
                <div className="analytics-grid">
                  <div className="analytics-card blue">
                    <div className="analytics-value blue">{analytics.summary.totalEnrollments}</div>
                    <div className="analytics-label blue">Total Enrollments</div>
                  </div>
                  <div className="analytics-card green">
                    <div className="analytics-value green">${analytics.summary.totalRevenue}</div>
                    <div className="analytics-label green">Total Revenue</div>
                  </div>
                  <div className="analytics-card purple">
                    <div className="analytics-value purple">{analytics.summary.completionRate}%</div>
                    <div className="analytics-label purple">Completion Rate</div>
                  </div>
                  <div className="analytics-card yellow">
                    <div className="analytics-value yellow">{analytics.summary.averageRating}</div>
                    <div className="analytics-label yellow">Average Rating</div>
                  </div>
                </div>
                
                <div className="rating-distribution">
                  <h4 className="rating-distribution-title">Rating Distribution</h4>
                  <div>
                    {Object.entries(analytics.ratingDistribution).map(([rating, count]) => (
                      <div key={rating} className="rating-item">
                        <span className="rating-label">{rating} ★</span>
                        <div className="rating-bar-container">
                          <div 
                            className="rating-bar" 
                            style={{ width: `${(count / analytics.summary.totalRatings) * 100}%` }}
                          ></div>
                        </div>
                        <span className="rating-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="recent-enrollments">
                  <h4 className="recent-enrollments-title">Recent Enrollments</h4>
                  <div className="enrollments-list">
                    {analytics.recentEnrollments.map((enrollment, index) => (
                      <div key={index} className="enrollment-item">
                        <div>
                          <span className="enrollment-student">
                            {enrollment.student.firstName} {enrollment.student.lastName}
                          </span>
                          <span className="enrollment-date">
                            {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className={`enrollment-status ${enrollment.status}`}>
                            {enrollment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0'}}>
                <RefreshCw className="loading-spinner" style={{marginRight: '0.5rem'}} />
                <span>Loading analytics...</span>
              </div>
            )}
          </div>
        );

      case 'edit':
        return (
          <div>
            <div className="modal-actions">
              <button
                onClick={() => handleAction('updateStatus', { isPublished: !course.isPublished })}
                disabled={loading}
                className={`modal-action-button ${course.isPublished ? 'unpublish' : 'publish'}`}
              >
                {course.isPublished ? <XCircle /> : <CheckCircle />}
                {loading ? 'Processing...' : (course.isPublished ? 'Unpublish' : 'Publish')}
              </button>
              
              <button
                onClick={() => handleAction('updateStatus', { isFeatured: !course.isFeatured })}
                disabled={loading}
                className={`modal-action-button ${course.isFeatured ? 'unfeature' : 'feature'}`}
              >
                {course.isFeatured ? <StarOff /> : <Star />}
                {course.isFeatured ? 'Unfeature' : 'Feature'}
              </button>
            </div>
            
            <div className="modal-info-box">
              <h4 className="modal-info-title">Course Details</h4>
              <div className="modal-info-content">
                <div className="modal-info-item"><strong>Title:</strong> {course.title}</div>
                <div className="modal-info-item"><strong>Category:</strong> {course.category}</div>
                <div className="modal-info-item"><strong>Level:</strong> {course.level}</div>
                <div className="modal-info-item"><strong>Price:</strong> ${course.price}</div>
                <div className="modal-info-item"><strong>Status:</strong> {course.isPublished ? 'Published' : 'Draft'}</div>
                <div className="modal-info-item"><strong>Featured:</strong> {course.isFeatured ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        );

      case 'delete':
        return (
          <div>
            <div className="delete-warning">
              <AlertTriangle />
              <span className="delete-warning-title">Delete Course</span>
            </div>
            
            <p className="delete-description">
              Are you sure you want to delete "{course.title}"? This action cannot be undone.
            </p>
            
            {course.totalEnrollments > 0 && (
              <div className="delete-enrollments-warning">
                <div className="delete-enrollments-header">
                  <AlertTriangle />
                  <span className="delete-enrollments-text">
                    Warning: This course has {course.totalEnrollments} active enrollments
                  </span>
                </div>
                <div className="delete-checkbox-container">
                  <input
                    type="checkbox"
                    checked={forceDelete}
                    onChange={(e) => setForceDelete(e.target.checked)}
                    className="delete-checkbox"
                  />
                  <span className="delete-checkbox-label">
                    Force delete (this will also delete all enrollments)
                  </span>
                </div>
              </div>
            )}
            
            <div className="modal-button-group">
              <button
                onClick={onClose}
                className="modal-button cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('delete', { forceDelete })}
                disabled={loading || (course.totalEnrollments > 0 && !forceDelete)}
                className="modal-button delete"
              >
                {loading ? 'Deleting...' : 'Delete Course'}
              </button>
            </div>
          </div>
        );

      case 'bulkDelete':
        return (
          <div>
            <div className="delete-warning">
              <AlertTriangle />
              <span className="delete-warning-title">Bulk Delete Courses</span>
            </div>
            
            <p className="delete-description">
              Are you sure you want to delete {selectedCount} selected courses? This action cannot be undone.
            </p>
            

            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500 mr-2"
                />
                <span className="text-sm text-yellow-700">
                  Force delete (this will also delete any enrollments)
                </span>
              </label>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('bulkDelete', { forceDelete })}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : `Delete ${selectedCount} Courses`}
              </button>
            </div>
          </div>
        );

     default:
        return null;
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">
            {type === 'view' && 'Course Details'}
            {type === 'analytics' && 'Course Analytics'}
            {type === 'edit' && 'Edit Course'}
            {type === 'delete' && 'Delete Course'}
            {type === 'bulkDelete' && 'Bulk Delete Courses'}
          </h2>
          <button
            onClick={onClose}
            className="modal-close-button"
          >
            <XCircle />
          </button>
        </div>
        
        <div className="modal-content">
          {renderModalContent()}
        </div>
        
        {(type === 'view' || type === 'analytics') && (
          <div className="modal-footer">
            <button
              onClick={onClose}
              className="modal-button close"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;