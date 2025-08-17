import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Play,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  MessageCircle,
  FileText,
  BarChart3,
  User,
  Layers,
  Target,
  Zap,
  Users,
  Activity,
  ArrowRight,
  Pause,
  PlayCircle
} from 'lucide-react';
import './MyCourses.css';

const API_BASE_URL = 'http://localhost:5555';

const MyCourses = ({ setCurrentPage }) => {
  // State management
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all');
  const [sortBy, setSortBy] = useState('enrollmentDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPageState] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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
      day: 'numeric'
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

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  // API functions
  const fetchEnrollments = useCallback(async (showRefreshing = false) => {
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
        `${API_BASE_URL}/api/enrollments?${queryParams}`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setEnrollments(data.data?.enrollments || []);
        setTotalItems(data.data?.pagination?.totalEnrollments || 0);
        calculateStats(data.data?.enrollments || []);
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
  }, [currentPage, itemsPerPage, statusFilter]);

  const calculateStats = (enrollmentsData) => {
    const stats = {
      totalCourses: enrollmentsData.length,
      activeCourses: enrollmentsData.filter(e => e.status === 'active').length,
      completedCourses: enrollmentsData.filter(e => e.status === 'completed').length,
      averageProgress: enrollmentsData.length > 0 
        ? Math.round(enrollmentsData.reduce((sum, e) => sum + (e.progress?.completionPercentage || 0), 0) / enrollmentsData.length)
        : 0,
      totalTimeSpent: enrollmentsData.reduce((sum, e) => sum + (e.progress?.totalTimeSpent || 0), 0),
      certificatesEarned: enrollmentsData.filter(e => e.certificate?.isEarned).length,
      totalInvestment: enrollmentsData.reduce((sum, e) => sum + (e.payment?.amount || 0), 0)
    };
    setStats(stats);
  };

  // Effects
  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  useEffect(() => {
    if (enrollments.length > 0) {
      setCurrentPageState(1); // Reset to first page when filters change
    }
  }, [statusFilter, progressFilter, searchTerm]);

  // Filter and sort enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    const course = enrollment.course;
    const matchesSearch = !searchTerm || 
      course?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course?.instructor?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course?.instructor?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProgress = progressFilter === 'all' || (() => {
      const progress = enrollment.progress?.completionPercentage || 0;
      switch (progressFilter) {
        case 'not-started': return progress === 0;
        case 'in-progress': return progress > 0 && progress < 100;
        case 'completed': return progress === 100;
        default: return true;
      }
    })();

    return matchesSearch && matchesProgress;
  });

  // Sort enrollments
  const sortedEnrollments = [...filteredEnrollments].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'title':
        aValue = a.course?.title?.toLowerCase() || '';
        bValue = b.course?.title?.toLowerCase() || '';
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
      case 'instructor':
        aValue = `${a.course?.instructor?.firstName} ${a.course?.instructor?.lastName}`.toLowerCase();
        bValue = `${b.course?.instructor?.firstName} ${b.course?.instructor?.lastName}`.toLowerCase();
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
      setCurrentPageState(newPage);
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
          Showing {startItem}-{endItem} of {totalItems} courses
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
          <BookOpen />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalCourses || 0}</div>
          <div className="stat-label">Enrolled Courses</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">
          <Activity />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.activeCourses || 0}</div>
          <div className="stat-label">Active Courses</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">
          <CheckCircle />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.completedCourses || 0}</div>
          <div className="stat-label">Completed</div>
          <div className="stat-percentage">
            {stats.totalCourses ? 
              Math.round((stats.completedCourses / stats.totalCourses) * 100) : 0}%
          </div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">
          <TrendingUp />
        </div>
        <div className="stat-content">
          <div className="stat-value">
            {stats.averageProgress ? `${stats.averageProgress}%` : '0%'}
          </div>
          <div className="stat-label">Avg Progress</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">
          <Award />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.certificatesEarned || 0}</div>
          <div className="stat-label">Certificates</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">
          <Clock />
        </div>
        <div className="stat-content">
          <div className="stat-value">
            {formatDuration(Math.floor((stats.totalTimeSpent || 0) / 60))}
          </div>
          <div className="stat-label">Total Time</div>
        </div>
      </div>
    </div>
  );

  const renderCourseCard = (enrollment) => {
    const course = enrollment.course;
    const progress = enrollment.progress;
    const StatusIcon = getStatusIcon(enrollment.status);

    return (
      <div key={enrollment._id} className="course-card">
        <div className="course-image">
          {course?.thumbnail ? (
            <img 
              src={course.thumbnail} 
              alt={course.title}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="placeholder-image" style={{ display: course?.thumbnail ? 'none' : 'flex' }}>
            <BookOpen />
          </div>
          
          <div className="course-overlay">
            <div 
              className="status-badge" 
              style={{backgroundColor: getStatusColor(enrollment.status)}}
            >
              <StatusIcon className="status-icon" />
              {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
            </div>
            {enrollment.certificate?.isEarned && (
              <div className="certificate-badge">
                <Award className="icon" />
                Certified
              </div>
            )}
          </div>
        </div>

        <div className="course-content">
          <div className="course-meta">
            <span className="course-category">{course?.category}</span>
            <span className="course-level">{course?.level}</span>
          </div>
          
          <h3 className="course-title">{course?.title}</h3>
          
          <div className="course-instructor">
            <User className="instructor-icon" />
            <span>{course?.instructor?.firstName} {course?.instructor?.lastName}</span>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">Progress</span>
              <span className="progress-percentage">
                {progress?.completionPercentage || 0}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{
                  width: `${progress?.completionPercentage || 0}%`,
                  backgroundColor: getProgressColor(progress?.completionPercentage || 0)
                }}
              ></div>
            </div>
            <div className="progress-details">
              <span>{progress?.completedLessons?.length || 0} / {progress?.totalLessons || 0} lessons</span>
              <span>•</span>
              <span>{formatDuration(Math.floor((progress?.totalTimeSpent || 0) / 60))} spent</span>
            </div>
          </div>

          <div className="course-stats">
            <div className="stat-item">
              <Calendar className="stat-icon" />
              <span>Enrolled {formatDate(enrollment.enrollmentDate)}</span>
            </div>
            {progress?.lastAccessedAt && (
              <div className="stat-item">
                <Clock className="stat-icon" />
                <span>Last access {formatDate(progress.lastAccessedAt)}</span>
              </div>
            )}
          </div>

          <div className="course-actions">
            <button 
              className="action-btn primary"
              onClick={() => {
                // Navigate to course learning page
                setCurrentPage(`course-learn-${course._id}`);
              }}
            >
              <PlayCircle className="icon" />
              {progress?.completionPercentage > 0 ? 'Continue Learning' : 'Start Learning'}
            </button>
            <button 
              className="action-btn secondary"
              onClick={() => {
                setSelectedEnrollment(enrollment);
                setShowDetailModal(true);
              }}
            >
              <Eye className="icon" />
              Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCourseList = (enrollment) => {
    const course = enrollment.course;
    const progress = enrollment.progress;
    const StatusIcon = getStatusIcon(enrollment.status);

    return (
      <div key={enrollment._id} className="course-list-item">
        <div className="course-list-image">
          {course?.thumbnail ? (
            <img 
              src={course.thumbnail} 
              alt={course.title}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="placeholder-image" style={{ display: course?.thumbnail ? 'none' : 'flex' }}>
            <BookOpen />
          </div>
        </div>

        <div className="course-list-content">
          <div className="course-header">
            <div className="course-title-section">
              <h3 className="course-title">{course?.title}</h3>
              <div className="course-meta">
                <span className="course-category">{course?.category}</span>
                <span className="course-level">{course?.level}</span>
                <div 
                  className="status-badge small" 
                  style={{backgroundColor: getStatusColor(enrollment.status)}}
                >
                  <StatusIcon className="status-icon" />
                  {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                </div>
              </div>
            </div>
            
            <div className="course-actions">
              <button 
                className="action-btn primary"
                onClick={() => {
                  setCurrentPage(`course-learn-${course._id}`);
                }}
              >
                <PlayCircle className="icon" />
                {progress?.completionPercentage > 0 ? 'Continue' : 'Start'}
              </button>
              <button 
                className="action-btn secondary"
                onClick={() => {
                  setSelectedEnrollment(enrollment);
                  setShowDetailModal(true);
                }}
              >
                <Eye className="icon" />
              </button>
            </div>
          </div>

          <div className="course-instructor">
            <User className="instructor-icon" />
            <span>{course?.instructor?.firstName} {course?.instructor?.lastName}</span>
          </div>

          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{
                  width: `${progress?.completionPercentage || 0}%`,
                  backgroundColor: getProgressColor(progress?.completionPercentage || 0)
                }}
              ></div>
            </div>
            <div className="progress-info">
              <span className="progress-percentage">
                {progress?.completionPercentage || 0}% complete
              </span>
              <span>•</span>
              <span>{progress?.completedLessons?.length || 0} / {progress?.totalLessons || 0} lessons</span>
              <span>•</span>
              <span>{formatDuration(Math.floor((progress?.totalTimeSpent || 0) / 60))} spent</span>
            </div>
          </div>

          <div className="course-stats">
            <div className="stat-item">
              <Calendar className="stat-icon" />
              <span>Enrolled {formatDate(enrollment.enrollmentDate)}</span>
            </div>
            {progress?.lastAccessedAt && (
              <div className="stat-item">
                <Clock className="stat-icon" />
                <span>Last access {formatDate(progress.lastAccessedAt)}</span>
              </div>
            )}
            {enrollment.certificate?.isEarned && (
              <div className="stat-item">
                <Award className="stat-icon" />
                <span>Certificate earned</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEnrollmentDetails = (enrollment) => {
    if (!enrollment) return null;

    const course = enrollment.course;
    const progress = enrollment.progress;
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
            <h2>Course Details</h2>
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
            {/* Course Header */}
            <div className="detail-section">
              <div className="course-header-detail">
                <div className="course-image-large">
                  {course?.thumbnail ? (
                    <img 
                      src={course.thumbnail} 
                      alt={course.title}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="placeholder-image" style={{ display: course?.thumbnail ? 'none' : 'flex' }}>
                    <BookOpen />
                  </div>
                </div>
                <div className="course-info-detail">
                  <h3>{course?.title}</h3>
                  <p className="course-description">{course?.description}</p>
                  <div className="course-meta-detail">
                    <span className="meta-item">
                      <Layers className="meta-icon" />
                      {course?.category}
                    </span>
                    <span className="meta-item">
                      <Target className="meta-icon" />
                      {course?.level}
                    </span>
                    <span className="meta-item">
                      <User className="meta-icon" />
                      {course?.instructor?.firstName} {course?.instructor?.lastName}
                    </span>
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
                  {progress?.lastAccessedAt && (
                    <div className="date-item">
                      <Clock className="date-icon" />
                      <span>Last Access: {formatDate(progress.lastAccessedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Learning Progress */}
            <div className="detail-section">
              <h3>Learning Progress</h3>
              <div className="progress-info">
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{
                        width: `${progress?.completionPercentage || 0}%`,
                        backgroundColor: getProgressColor(progress?.completionPercentage || 0)
                      }}
                    ></div>
                  </div>
                  <span className="progress-percentage">
                    {progress?.completionPercentage || 0}%
                  </span>
                </div>
                
                <div className="progress-stats">
                  <div className="progress-stat">
                    <BookOpen className="stat-icon" />
                    <span>
                      {progress?.completedLessons?.length || 0} / {progress?.totalLessons || 0} lessons completed
                    </span>
                  </div>
                  <div className="progress-stat">
                    <Clock className="stat-icon" />
                    <span>
                      {formatDuration(Math.floor((progress?.totalTimeSpent || 0) / 60))} total time spent
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
                <h3>Certificate of Completion</h3>
                <div className="certificate-info">
                  <Award className="certificate-icon" />
                  <div className="certificate-details">
                    <p>🎉 Congratulations! You've earned a certificate for completing this course.</p>
                    <p>Certificate earned on {formatDate(enrollment.certificate.earnedAt)}</p>
                    <p>Certificate ID: {enrollment.certificate.certificateId}</p>
                    {enrollment.certificate.certificateUrl && (
                      <a 
                        href={enrollment.certificate.certificateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="certificate-link"
                      >
                        <Download className="icon" />
                        Download Certificate
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Course Rating & Review */}
            {enrollment.rating?.score && (
              <div className="detail-section">
                <h3>Your Rating & Review</h3>
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

            {/* Action Buttons */}
            <div className="detail-actions">
              <button 
                className="action-btn primary large"
                onClick={() => {
                  setCurrentPage(`course-learn-${course._id}`);
                  setShowDetailModal(false);
                }}
              >
                <PlayCircle className="icon" />
                {progress?.completionPercentage > 0 ? 'Continue Learning' : 'Start Learning'}
              </button>
              
              {enrollment.certificate?.certificateUrl && (
                <a 
                  href={enrollment.certificate.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn secondary large"
                >
                  <Download className="icon" />
                  Download Certificate
                </a>
              )}
              
              {!enrollment.rating?.score && enrollment.status === 'completed' && (
                <button 
                  className="action-btn secondary large"
                  onClick={() => {
                    // Open rating modal
                    console.log('Open rating modal for course:', course._id);
                  }}
                >
                  <Star className="icon" />
                  Rate Course
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && enrollments.length === 0) {
    return (
      <div className="my-courses">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-courses">
      <div className="courses-header">
        <div className="header-content">
          <h1>My Courses</h1>
          <p>Track your learning progress and continue your journey</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={() => fetchEnrollments(true)}
            disabled={refreshing}
            title="Refresh courses"
          >
            <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} />
          </button>
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <BarChart3 className="icon" />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <Layers className="icon" />
            </button>
          </div>
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

      {/* Statistics Cards */}
      {renderStatsCards()}

      {/* Controls */}
      <div className="courses-controls">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search your courses..."
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
              </select>
            </div>
            
            <div className="filter-group">
              <label>Progress</label>
              <select 
                value={progressFilter} 
                onChange={(e) => setProgressFilter(e.target.value)}
              >
                <option value="all">All Progress</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
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
                <option value="enrollmentDate-desc">Recently Enrolled</option>
                <option value="enrollmentDate-asc">Oldest Enrollment</option>
                <option value="title-asc">Course Title (A-Z)</option>
                <option value="title-desc">Course Title (Z-A)</option>
                <option value="progress-desc">Progress (High to Low)</option>
                <option value="progress-asc">Progress (Low to High)</option>
                <option value="lastAccess-desc">Recently Accessed</option>
                <option value="instructor-asc">Instructor (A-Z)</option>
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
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Courses Content */}
      <div className="courses-content">
        {sortedEnrollments.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="courses-grid">
                {sortedEnrollments.map(enrollment => renderCourseCard(enrollment))}
              </div>
            ) : (
              <div className="courses-list">
                {sortedEnrollments.map(enrollment => renderCourseList(enrollment))}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && renderPagination()}
          </>
        ) : (
          <div className="empty-state">
            <BookOpen className="empty-icon" />
            <h3>No courses found</h3>
            <p>
              {searchTerm || statusFilter !== 'all' || progressFilter !== 'all'
                ? 'Try adjusting your search terms or filters' 
                : 'You haven\'t enrolled in any courses yet'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && progressFilter === 'all' && (
              <button 
                className="browse-courses-btn"
                onClick={() => setCurrentPage('courses')}
              >
                <ArrowRight className="icon" />
                Browse Available Courses
              </button>
            )}
          </div>
        )}
      </div>

      {/* Course Detail Modal */}
      {showDetailModal && selectedEnrollment && renderEnrollmentDetails(selectedEnrollment)}
    </div>
  );
};

export default MyCourses;