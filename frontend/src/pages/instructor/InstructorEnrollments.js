import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Mail,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  DollarSign,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pause,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  MessageCircle,
  FileText,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import './InstructorEnrollments.css';

const API_BASE_URL = 'http://localhost:5555';

const InstructorEnrollments = ({ courseId = null }) => {
  // State management
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('enrollmentDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

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

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#10b981',
      completed: '#3b82f6',
      suspended: '#f59e0b',
      refunded: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: Activity,
      completed: CheckCircle,
      suspended: Pause,
      refunded: XCircle
    };
    return icons[status] || AlertCircle;
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

  const fetchEnrollments = useCallback(async (showRefreshing = false) => {
    if (!selectedCourse) {
      setEnrollments([]);
      setStats({});
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

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(
        `${API_BASE_URL}/api/enrollments/course/${selectedCourse}?${queryParams}`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setEnrollments(data.data?.enrollments || []);
        setStats(data.data?.stats || {});
        setTotalItems(data.data?.pagination?.totalEnrollments || 0);
      } else {
        throw new Error(data.message || 'Failed to fetch enrollments');
      }
    } catch (err) {
      console.error('Fetch enrollments error:', err);
      setError(err.message || 'Failed to fetch enrollments');
      setEnrollments([]);
      setStats({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCourse, currentPage, itemsPerPage, statusFilter]);

  const exportEnrollments = async () => {
    if (!selectedCourse) return;

    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${API_BASE_URL}/api/enrollments/course/${selectedCourse}/export`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `enrollments-${selectedCourse}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export enrollments');
    }
  };

  // Effects
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (selectedCourse) {
      setCurrentPage(1); // Reset to first page when course changes
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedCourse) {
      fetchEnrollments();
    }
  }, [selectedCourse, currentPage, itemsPerPage, statusFilter, fetchEnrollments]);

  // Filter and sort enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    const student = enrollment.student;
    const matchesSearch = !searchTerm || 
      student?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = dateFilter === 'all' || (() => {
      const enrollDate = new Date(enrollment.enrollmentDate);
      const now = new Date();
      const daysDiff = (now - enrollDate) / (1000 * 60 * 60 * 24);
      
      switch (dateFilter) {
        case 'today': return daysDiff < 1;
        case 'week': return daysDiff < 7;
        case 'month': return daysDiff < 30;
        case 'quarter': return daysDiff < 90;
        default: return true;
      }
    })();

    return matchesSearch && matchesDate;
  });

  // Sort enrollments
  const sortedEnrollments = [...filteredEnrollments].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = `${a.student?.firstName} ${a.student?.lastName}`.toLowerCase();
        bValue = `${b.student?.firstName} ${b.student?.lastName}`.toLowerCase();
        break;
      case 'progress':
        aValue = a.progress?.completionPercentage || 0;
        bValue = b.progress?.completionPercentage || 0;
        break;
      case 'enrollmentDate':
        aValue = new Date(a.enrollmentDate);
        bValue = new Date(b.enrollmentDate);
        break;
      case 'lastAccess':
        aValue = new Date(a.progress?.lastAccessedAt || 0);
        bValue = new Date(b.progress?.lastAccessedAt || 0);
        break;
      case 'payment':
        aValue = a.payment?.amount || 0;
        bValue = b.payment?.amount || 0;
        break;
      default:
        aValue = a[sortBy];
        bValue = b[sortBy];
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`page-btn ${i === currentPage ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="pagination">
        <div className="pagination-info">
          Showing {startItem}-{endItem} of {totalItems} enrollments
        </div>
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="page-btn"
          >
            Previous
          </button>
          {startPage > 1 && (
            <>
              <button onClick={() => handlePageChange(1)} className="page-btn">1</button>
              {startPage > 2 && <span className="page-ellipsis">...</span>}
            </>
          )}
          {pages}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="page-ellipsis">...</span>}
              <button onClick={() => handlePageChange(totalPages)} className="page-btn">
                {totalPages}
              </button>
            </>
          )}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const renderStatsCards = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">
          <Users />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalEnrollments || 0}</div>
          <div className="stat-label">Total Enrollments</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">
          <CheckCircle />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.completedEnrollments || 0}</div>
          <div className="stat-label">Completed</div>
          <div className="stat-percentage">
            {stats.totalEnrollments ? 
              Math.round((stats.completedEnrollments / stats.totalEnrollments) * 100) : 0}%
          </div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">
          <TrendingUp />
        </div>
        <div className="stat-content">
          <div className="stat-value">
            {stats.averageProgress ? `${Math.round(stats.averageProgress)}%` : '0%'}
          </div>
          <div className="stat-label">Avg Progress</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">
          <DollarSign />
        </div>
        <div className="stat-content">
          <div className="stat-value">{formatCurrency(stats.totalRevenue || 0)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>
    </div>
  );

  const renderEnrollmentDetails = (enrollment) => {
    if (!enrollment) return null;

    const StatusIcon = getStatusIcon(enrollment.status);

    return (
      <div className="modal-overlay" onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowDetailModal(false);
          setSelectedEnrollment(null);
        }
      }}>
        <div className="modal-content enrollment-detail-modal">
          <div className="modal-header">
            <h2>Enrollment Details</h2>
            <button 
              className="close-modal"
              onClick={() => {
                setShowDetailModal(false);
                setSelectedEnrollment(null);
              }}
            >
              <X className="icon" />
            </button>
          </div>
          
          <div className="enrollment-detail-content">
            {/* Student Info */}
            <div className="detail-section">
              <h3>Student Information</h3>
              <div className="student-info">
                {enrollment.student?.avatar && (
                  <img 
                    src={enrollment.student.avatar} 
                    alt="Student"
                    className="student-avatar-large"
                  />
                )}
                <div className="student-details">
                  <h4>{enrollment.student?.firstName} {enrollment.student?.lastName}</h4>
                  <p className="student-email">{enrollment.student?.email}</p>
                  <div className="student-meta">
                    <span>Member since: {formatDate(enrollment.student?.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrollment Status */}
            <div className="detail-section">
              <h3>Enrollment Status</h3>
              <div className="status-info">
                <div className="status-badge-large" style={{backgroundColor: getStatusColor(enrollment.status)}}>
                  <StatusIcon className="status-icon" />
                  {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                </div>
                <div className="status-dates">
                  <div className="date-item">
                    <Calendar className="date-icon" />
                    <span>Enrolled: {formatDate(enrollment.enrollmentDate)}</span>
                  </div>
                  {enrollment.completedAt && (
                    <div className="date-item">
                      <CheckCircle className="date-icon" />
                      <span>Completed: {formatDate(enrollment.completedAt)}</span>
                    </div>
                  )}
                  {enrollment.progress?.lastAccessedAt && (
                    <div className="date-item">
                      <Clock className="date-icon" />
                      <span>Last Access: {formatDate(enrollment.progress.lastAccessedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Info */}
            <div className="detail-section">
              <h3>Learning Progress</h3>
              <div className="progress-info">
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${enrollment.progress?.completionPercentage || 0}%`}}
                    ></div>
                  </div>
                  <span className="progress-percentage">
                    {enrollment.progress?.completionPercentage || 0}%
                  </span>
                </div>
                
                <div className="progress-stats">
                  <div className="progress-stat">
                    <BookOpen className="stat-icon" />
                    <span>
                      {enrollment.progress?.completedLessons?.length || 0} / {enrollment.progress?.totalLessons || 0} lessons
                    </span>
                  </div>
                  <div className="progress-stat">
                    <Clock className="stat-icon" />
                    <span>
                      {formatDuration(Math.floor((enrollment.progress?.totalTimeSpent || 0) / 60))} total time
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="detail-section">
              <h3>Payment Information</h3>
              <div className="payment-info">
                <div className="payment-amount">
                  {formatCurrency(enrollment.payment?.amount || 0)}
                </div>
                <div className="payment-details">
                  <div className="payment-detail">
                    <span className="label">Method:</span>
                    <span className="value">{enrollment.payment?.paymentMethod || 'N/A'}</span>
                  </div>
                  <div className="payment-detail">
                    <span className="label">Transaction ID:</span>
                    <span className="value">{enrollment.payment?.transactionId || 'N/A'}</span>
                  </div>
                  <div className="payment-detail">
                    <span className="label">Payment Date:</span>
                    <span className="value">{formatDate(enrollment.payment?.paymentDate)}</span>
                  </div>
                  <div className="payment-detail">
                    <span className="label">Status:</span>
                    <span className={`payment-status ${enrollment.payment?.paymentStatus}`}>
                      {enrollment.payment?.paymentStatus || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificate Info */}
            {enrollment.certificate?.isEarned && (
              <div className="detail-section">
                <h3>Certificate</h3>
                <div className="certificate-info">
                  <Award className="certificate-icon" />
                  <div className="certificate-details">
                    <p>Certificate earned on {formatDate(enrollment.certificate.earnedAt)}</p>
                    <p>Certificate ID: {enrollment.certificate.certificateId}</p>
                    {enrollment.certificate.certificateUrl && (
                      <a 
                        href={enrollment.certificate.certificateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="certificate-link"
                      >
                        View Certificate
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rating & Review */}
            {enrollment.rating?.score && (
              <div className="detail-section">
                <h3>Rating & Review</h3>
                <div className="rating-info">
                  <div className="rating-score">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`star ${i < enrollment.rating.score ? 'filled' : ''}`}
                        />
                      ))}
                    </div>
                    <span className="score">{enrollment.rating.score}/5</span>
                  </div>
                  {enrollment.rating.review && (
                    <div className="review-text">
                      <MessageCircle className="review-icon" />
                      <p>"{enrollment.rating.review}"</p>
                      <small>Reviewed on {formatDate(enrollment.rating.ratedAt)}</small>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {enrollment.notes && enrollment.notes.length > 0 && (
              <div className="detail-section">
                <h3>Student Notes ({enrollment.notes.length})</h3>
                <div className="notes-list">
                  {enrollment.notes.slice(0, 3).map((note, index) => (
                    <div key={index} className="note-item">
                      <FileText className="note-icon" />
                      <div className="note-content">
                        <p>{note.content}</p>
                        <small>Created: {formatDate(note.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                  {enrollment.notes.length > 3 && (
                    <p className="more-notes">+{enrollment.notes.length - 3} more notes</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && enrollments.length === 0) {
    return (
      <div className="instructor-enrollments">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading enrollments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="instructor-enrollments">
      <div className="enrollments-header">
        <div className="header-content">
          <h1>Student Enrollments</h1>
          <p>Manage and track student progress across your courses</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={() => fetchEnrollments(true)}
            disabled={refreshing}
            title="Refresh enrollments"
          >
            <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} />
          </button>
          <button 
            className="export-btn"
            onClick={exportEnrollments}
            disabled={!selectedCourse || enrollments.length === 0}
            title="Export enrollments to CSV"
          >
            <Download className="icon" />
            Export CSV
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
              {course.title} ({course.totalEnrollments || 0} students)
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <>
          {/* Statistics Cards */}
          {renderStatsCards()}

          {/* Controls */}
          <div className="enrollments-controls">
            <div className="search-bar">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="control-buttons">
              <button 
                className={`filter-toggle ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="icon" />
                Filters
                {showFilters ? <ChevronUp className="icon" /> : <ChevronDown className="icon" />}
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="filters-panel">
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Status</label>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="suspended">Suspended</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Enrollment Date</label>
                  <select 
                    value={dateFilter} 
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">Last 3 Months</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Sort By</label>
                  <select 
                    value={`${sortBy}-${sortOrder}`} 
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order);
                    }}
                  >
                    <option value="enrollmentDate-desc">Enrollment Date (Newest)</option>
                    <option value="enrollmentDate-asc">Enrollment Date (Oldest)</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="progress-desc">Progress (High to Low)</option>
                    <option value="progress-asc">Progress (Low to High)</option>
                    <option value="lastAccess-desc">Last Access (Recent)</option>
                    <option value="payment-desc">Payment (High to Low)</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Items per page</label>
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Enrollments Table */}
          <div className="enrollments-content">
            {sortedEnrollments.length > 0 ? (
              <>
                <div className="enrollments-table">
                  <div className="table-header">
                    <div className="header-cell student">Student</div>
                    <div className="header-cell status">Status</div>
                    <div className="header-cell progress">Progress</div>
                    <div className="header-cell enrolled">Enrolled</div>
                    <div className="header-cell last-access">Last Access</div>
                    <div className="header-cell payment">Payment</div>
                    <div className="header-cell actions">Actions</div>
                  </div>
                  
                  <div className="table-body">
                    {sortedEnrollments.map(enrollment => {
                      const StatusIcon = getStatusIcon(enrollment.status);
                      return (
                        <div key={enrollment._id} className="table-row">
                          <div className="cell student">
                            <div className="student-info">
                              {enrollment.student?.avatar ? (
                                <img 
                                  src={enrollment.student.avatar} 
                                  alt="Student"
                                  className="student-avatar"
                                />
                              ) : (
                                <div className="student-avatar-placeholder">
                                  {enrollment.student?.firstName?.charAt(0)}
                                  {enrollment.student?.lastName?.charAt(0)}
                                </div>
                              )}
                              <div className="student-details">
                                <div className="student-name">
                                  {enrollment.student?.firstName} {enrollment.student?.lastName}
                                </div>
                                <div className="student-email">
                                  {enrollment.student?.email}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="cell status">
                            <div 
                              className="status-badge" 
                              style={{backgroundColor: getStatusColor(enrollment.status)}}
                            >
                              <StatusIcon className="status-icon" />
                              {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                            </div>
                          </div>
                          
                          <div className="cell progress">
                            <div className="progress-container">
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{width: `${enrollment.progress?.completionPercentage || 0}%`}}
                                ></div>
                              </div>
                              <span className="progress-text">
                                {enrollment.progress?.completionPercentage || 0}%
                              </span>
                            </div>
                            <div className="progress-details">
                              {enrollment.progress?.completedLessons?.length || 0} / {enrollment.progress?.totalLessons || 0} lessons
                            </div>
                          </div>
                          
                          <div className="cell enrolled">
                            <div className="date-info">
                              <Calendar className="date-icon" />
                              {formatDate(enrollment.enrollmentDate)}
                            </div>
                          </div>
                          
                          <div className="cell last-access">
                            <div className="date-info">
                              <Clock className="date-icon" />
                              {enrollment.progress?.lastAccessedAt ? 
                                formatDate(enrollment.progress.lastAccessedAt) : 
                                'Never'
                              }
                            </div>
                          </div>
                          
                          <div className="cell payment">
                            <div className="payment-info">
                              <div className="payment-amount">
                                {formatCurrency(enrollment.payment?.amount || 0)}
                              </div>
                              <div className={`payment-status ${enrollment.payment?.paymentStatus}`}>
                                {enrollment.payment?.paymentStatus || 'N/A'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="cell actions">
                            <div className="action-buttons">
                              <button 
                                className="action-btn view"
                                onClick={() => {
                                  setSelectedEnrollment(enrollment);
                                  setShowDetailModal(true);
                                }}
                                title="View Details"
                              >
                                <Eye className="icon" />
                              </button>
                              <button 
                                className="action-btn email"
                                onClick={() => window.open(`mailto:${enrollment.student?.email}`, '_blank')}
                                title="Send Email"
                              >
                                <Mail className="icon" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && renderPagination()}
              </>
            ) : (
              <div className="empty-state">
                <Users className="empty-icon" />
                <h3>No enrollments found</h3>
                <p>
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your search terms or filters' 
                    : 'No students have enrolled in this course yet'
                  }
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedCourse && (
        <div className="empty-state">
          <BookOpen className="empty-icon" />
          <h3>Select a course</h3>
          <p>Choose a course from the dropdown above to view student enrollments</p>
        </div>
      )}

      {/* Enrollment Detail Modal */}
      {showDetailModal && selectedEnrollment && renderEnrollmentDetails(selectedEnrollment)}
    </div>
  );
};

export default InstructorEnrollments;