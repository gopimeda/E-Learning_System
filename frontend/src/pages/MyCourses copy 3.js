import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Play,
  Circle,
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
  PlayCircle,
  Edit,
  Settings,
  PieChart,
  LineChart,
  DollarSign,
  Bookmark,
  ThumbsUp,
  UserCheck,
  BookmarkIcon
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
  
  // New state for enhanced progress data
  const [progressData, setProgressData] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(false);

  // New state for analytics
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedCourseAnalytics, setSelectedCourseAnalytics] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({});
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [userRole, setUserRole] = useState('student'); // This should come from your auth context

  // Check user role and permissions
  useEffect(() => {
    const checkUserRole = () => {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role || 'student');
      }
    };
    checkUserRole();
  }, []);

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

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
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

  // Check if user can view analytics for a course
  const canViewAnalytics = (enrollment) => {
    if (!enrollment || !enrollment.course) return false;
    
    // Instructors can view analytics for their own courses
    if (userRole === 'instructor' || userRole === 'admin') {
      return true; // We'll check ownership in the API call
    }
    
    return false;
  };

  // Check if user can edit course
  const canEditCourse = (enrollment) => {
    if (!enrollment || !enrollment.course) return false;
    
    // Instructors can edit their own courses, admins can edit any
    if (userRole === 'instructor' || userRole === 'admin') {
      return true; // We'll check ownership in the navigation
    }
    
    return false;
  };

  // Fetch course analytics
  const fetchCourseAnalytics = async (courseId) => {
    try {
      setLoadingAnalytics(true);
      const headers = createAuthHeaders();
      if (!headers) return;

      // Try instructor analytics first, then general analytics
      let endpoint = '';
      if (userRole === 'instructor') {
        endpoint = `/api/courses/${courseId}/analytics`;
      } else if (userRole === 'admin') {
        endpoint = `/api/courses/admin/${courseId}/analytics`;
      } else {
        throw new Error('Unauthorized to view analytics');
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You are not authorized to view analytics for this course');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data.analytics);
      } else {
        throw new Error(data.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Fetch analytics error:', err);
      setError(err.message || 'Failed to fetch course analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Enhanced API functions
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

      let endpoint = '/api/enrollments';
      
      // If user is instructor, fetch their courses instead
      if (userRole === 'instructor' || userRole === 'admin') {
        endpoint = '/api/courses/my-courses';
      }

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(
        `${API_BASE_URL}${endpoint}?${queryParams}`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        let enrollmentsData = [];
        
        if (userRole === 'instructor' || userRole === 'admin') {
          // Transform courses to enrollment-like structure for instructors
          enrollmentsData = (data.data?.courses || []).map(course => ({
            _id: `course-${course._id}`,
            course: course,
            status: course.isPublished ? 'active' : 'draft',
            enrollmentDate: course.createdAt,
            progress: {
              completionPercentage: 100, // Instructors have "completed" their courses
              totalLessons: course.lessons?.length || 0,
              completedLessons: course.lessons?.length || 0
            },
            isInstructor: true
          }));
        } else {
          enrollmentsData = data.data?.enrollments || [];
        }
        
        setEnrollments(enrollmentsData);
        setTotalItems(data.data?.pagination?.totalEnrollments || data.data?.pagination?.totalCourses || 0);
        
        // Fetch detailed progress for students only
        if (userRole === 'student') {
          await fetchDetailedProgress(enrollmentsData);
        }
        calculateEnhancedStats(enrollmentsData);
      } else {
        throw new Error(data.message || 'Failed to fetch courses');
      }
    } catch (err) {
      console.error('Fetch enrollments error:', err);
      setError(err.message || 'Failed to fetch courses');
      setEnrollments([]);
      setStats({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, userRole]);

  // New function to fetch detailed progress using progress routes
  const fetchDetailedProgress = useCallback(async (enrollmentsData) => {
    try {
      setLoadingProgress(true);
      const headers = createAuthHeaders();
      if (!headers) return;

      const progressPromises = enrollmentsData.map(async (enrollment) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/progress/course/${enrollment.course._id}`,
            { headers }
          );
          
          if (response.ok) {
            const progressResponse = await response.json();
            if (progressResponse.success) {
              return {
                courseId: enrollment.course._id,
                progressData: progressResponse.data
              };
            }
          }
          return {
            courseId: enrollment.course._id,
            progressData: null
          };
        } catch (error) {
          console.error(`Failed to fetch progress for course ${enrollment.course._id}:`, error);
          return {
            courseId: enrollment.course._id,
            progressData: null
          };
        }
      });

      const progressResults = await Promise.all(progressPromises);
      const progressMap = {};
      
      progressResults.forEach(({ courseId, progressData }) => {
        if (progressData) {
          progressMap[courseId] = progressData;
        }
      });

      setProgressData(progressMap);
    } catch (error) {
      console.error('Error fetching detailed progress:', error);
    } finally {
      setLoadingProgress(false);
    }
  }, []);

  // Enhanced stats calculation using detailed progress data
  const calculateEnhancedStats = (enrollmentsData) => {
    const enhancedStats = {
      totalCourses: enrollmentsData.length,
      activeCourses: enrollmentsData.filter(e => e.status === 'active' || e.status === 'draft').length,
      completedCourses: enrollmentsData.filter(e => e.status === 'completed').length,
      averageProgress: 0,
      totalTimeSpent: 0,
      certificatesEarned: enrollmentsData.filter(e => e.certificate?.isEarned).length,
      totalInvestment: enrollmentsData.reduce((sum, e) => sum + (e.payment?.amount || 0), 0),
      totalLessons: 0,
      completedLessons: 0,
      totalNotes: 0,
      totalBookmarks: 0,
      studyStreak: 0
    };

    // For instructors, calculate different stats
    if (userRole === 'instructor' || userRole === 'admin') {
      enhancedStats.totalEnrollments = enrollmentsData.reduce((sum, e) => sum + (e.course.totalEnrollments || 0), 0);
      enhancedStats.totalRevenue = enrollmentsData.reduce((sum, e) => sum + ((e.course.totalEnrollments || 0) * (e.course.price || 0)), 0);
      enhancedStats.publishedCourses = enrollmentsData.filter(e => e.course.isPublished).length;
      enhancedStats.averageRating = enrollmentsData.length > 0 ? 
        enrollmentsData.reduce((sum, e) => sum + (e.course.averageRating || 0), 0) / enrollmentsData.length : 0;
    } else {
      // Calculate enhanced stats from progress data for students
      let totalProgress = 0;
      let coursesWithProgress = 0;

      enrollmentsData.forEach(enrollment => {
        const courseProgress = progressData[enrollment.course._id];
        if (courseProgress && courseProgress.stats) {
          const stats = courseProgress.stats;
          enhancedStats.totalTimeSpent += stats.totalTimeSpent || 0;
          enhancedStats.totalLessons += stats.totalLessons || 0;
          enhancedStats.completedLessons += stats.completedLessons || 0;
          enhancedStats.totalNotes += stats.totalNotes || 0;
          enhancedStats.totalBookmarks += stats.totalBookmarks || 0;
          
          if (stats.overallProgress !== undefined) {
            totalProgress += stats.overallProgress;
            coursesWithProgress++;
          }
        } else {
          // Fallback to enrollment progress if detailed progress not available
          const progress = enrollment.progress?.completionPercentage || 0;
          totalProgress += progress;
          coursesWithProgress++;
        }
      });

      enhancedStats.averageProgress = coursesWithProgress > 0 
        ? Math.round(totalProgress / coursesWithProgress) 
        : 0;
    }

    setStats(enhancedStats);
  };

  // Get enhanced progress info for a specific enrollment
  const getEnhancedProgressInfo = (enrollment) => {
    if (enrollment.isInstructor) {
      // For instructors, show course stats instead of progress
      return {
        completionPercentage: 100,
        completedLessons: enrollment.course.lessons?.length || 0,
        totalLessons: enrollment.course.lessons?.length || 0,
        totalTimeSpent: 0,
        lastAccessedAt: enrollment.course.updatedAt,
        totalNotes: 0,
        totalBookmarks: 0,
        progress: [],
        totalEnrollments: enrollment.course.totalEnrollments || 0,
        averageRating: enrollment.course.averageRating || 0
      };
    }

    const courseProgress = progressData[enrollment.course._id];
    
    if (courseProgress && courseProgress.stats) {
      return {
        completionPercentage: courseProgress.stats.overallProgress || 0,
        completedLessons: courseProgress.stats.completedLessons || 0,
        totalLessons: courseProgress.stats.totalLessons || 0,
        totalTimeSpent: courseProgress.stats.totalTimeSpent || 0,
        lastAccessedAt: courseProgress.stats.lastAccessedAt,
        totalNotes: courseProgress.stats.totalNotes || 0,
        totalBookmarks: courseProgress.stats.totalBookmarks || 0,
        progress: courseProgress.progress || []
      };
    }
    
    // Fallback to enrollment data
    return {
      completionPercentage: enrollment.progress?.completionPercentage || 0,
      completedLessons: enrollment.progress?.completedLessons?.length || 0,
      totalLessons: enrollment.progress?.totalLessons || 0,
      totalTimeSpent: enrollment.progress?.totalTimeSpent || 0,
      lastAccessedAt: enrollment.progress?.lastAccessedAt,
      totalNotes: 0,
      totalBookmarks: 0,
      progress: []
    };
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
    const enhancedProgress = getEnhancedProgressInfo(enrollment);
    
    const matchesSearch = !searchTerm || 
      course?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course?.instructor?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course?.instructor?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProgress = progressFilter === 'all' || (() => {
      if (enrollment.isInstructor) return true; // Show all courses for instructors
      
      const progress = enhancedProgress.completionPercentage;
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
        aValue = getEnhancedProgressInfo(a).completionPercentage;
        bValue = getEnhancedProgressInfo(b).completionPercentage;
        break;
      case 'enrollmentDate':
        aValue = new Date(a.enrollmentDate);
        bValue = new Date(b.enrollmentDate);
        break;
      case 'lastAccess':
        aValue = new Date(getEnhancedProgressInfo(a).lastAccessedAt || 0);
        bValue = new Date(getEnhancedProgressInfo(b).lastAccessedAt || 0);
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

  const renderStatsCards = () => {
    if (userRole === 'instructor' || userRole === 'admin') {
      return (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <BookOpen />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalCourses || 0}</div>
              <div className="stat-label">My Courses</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.publishedCourses || 0}</div>
              <div className="stat-label">Published</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Users />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalEnrollments || 0}</div>
              <div className="stat-label">Total Students</div>
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

          <div className="stat-card">
            <div className="stat-icon">
              <Star />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
              </div>
              <div className="stat-label">Avg Rating</div>
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
        </div>
      );
    }

    return (
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
              {formatDuration(stats.totalTimeSpent || 0)}
            </div>
            <div className="stat-label">Total Time</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FileText />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalLessons || 0}</div>
            <div className="stat-label">Total Lessons</div>
            <div className="stat-percentage">
              {stats.totalLessons ? 
                Math.round(((stats.completedLessons || 0) / stats.totalLessons) * 100) : 0}% completed
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <MessageCircle />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalNotes || 0}</div>
            <div className="stat-label">Notes Taken</div>
          </div>
        </div>
      </div>
    );
  };

  const renderCourseCard = (enrollment) => {
    const course = enrollment.course;
    const enhancedProgress = getEnhancedProgressInfo(enrollment);
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
            {enrollment.isInstructor && (
              <div className="instructor-badge">
                <Settings className="icon" />
                Instructor
              </div>
            )}
            {loadingProgress && (
              <div className="loading-badge">
                <RefreshCw className="icon spinning" />
                Loading...
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

          {enrollment.isInstructor ? (
            <div className="instructor-stats">
              <div className="stat-item">
                <Users className="stat-icon" />
                <span>{enhancedProgress.totalEnrollments} students</span>
              </div>
              <div className="stat-item">
                <Star className="stat-icon" />
                <span>{enhancedProgress.averageRating.toFixed(1)} rating</span>
              </div>
              <div className="stat-item">
                <FileText className="stat-icon" />
                <span>{enhancedProgress.totalLessons} lessons</span>
              </div>
            </div>
          ) : (
            <div className="progress-section">
              <div className="progress-header">
                <span className="progress-label">Progress</span>
                <span className="progress-percentage">
                  {enhancedProgress.completionPercentage}%
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{
                    width: `${enhancedProgress.completionPercentage}%`,
                    backgroundColor: getProgressColor(enhancedProgress.completionPercentage)
                  }}
                ></div>
              </div>
              <div className="progress-details">
                <span>{enhancedProgress.completedLessons} / {enhancedProgress.totalLessons} lessons</span>
                <span>•</span>
                <span>{formatDuration(enhancedProgress.totalTimeSpent)} spent</span>
                {enhancedProgress.totalNotes > 0 && (
                  <>
                    <span>•</span>
                    <span>{enhancedProgress.totalNotes} notes</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="course-stats">
            <div className="stat-item">
              <Calendar className="stat-icon" />
              <span>
                {enrollment.isInstructor ? 'Created' : 'Enrolled'} {formatDate(enrollment.enrollmentDate)}
              </span>
            </div>
            {enhancedProgress.lastAccessedAt && (
              <div className="stat-item">
                <Clock className="stat-icon" />
                <span>Last access {formatDate(enhancedProgress.lastAccessedAt)}</span>
              </div>
            )}
          </div>

          <div className="course-actions">
            {enrollment.isInstructor ? (
              <>
                <button 
                  className="action-btn primary"
                  onClick={() => {
                    // Navigate to course edit page
                    setCurrentPage(`course-edit-${course._id}`);
                  }}
                >
                  <Edit className="icon" />
                  Edit Course
                </button>
                {canViewAnalytics(enrollment) && (
                  <button 
                    className="action-btn secondary"
                    onClick={() => {
                      setSelectedCourseAnalytics(course);
                      fetchCourseAnalytics(course._id);
                      setShowAnalyticsModal(true);
                    }}
                  >
                    <BarChart3 className="icon" />
                    Analytics
                  </button>
                )}
              </>
            ) : (
              <>
                <button 
                  className="action-btn primary"
                  onClick={() => {
                    // Navigate to course learning page
                    setCurrentPage(`course-learn-${course._id}`);
                  }}
                >
                  <PlayCircle className="icon" />
                  {enhancedProgress.completionPercentage > 0 ? 'Continue Learning' : 'Start Learning'}
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
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCourseList = (enrollment) => {
    const course = enrollment.course;
    const enhancedProgress = getEnhancedProgressInfo(enrollment);
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
                {enrollment.isInstructor && (
                  <div className="instructor-badge small">
                    <Settings className="icon" />
                    Instructor
                  </div>
                )}
              </div>
            </div>
            
            <div className="course-actions">
              {enrollment.isInstructor ? (
                <>
                  <button 
                    className="action-btn primary"
                    onClick={() => {
                      setCurrentPage(`course-edit-${course._id}`);
                    }}
                  >
                    <Edit className="icon" />
                    Edit
                  </button>
                  {canViewAnalytics(enrollment) && (
                    <button 
                      className="action-btn secondary"
                      onClick={() => {
                        setSelectedCourseAnalytics(course);
                        fetchCourseAnalytics(course._id);
                        setShowAnalyticsModal(true);
                      }}
                    >
                      <BarChart3 className="icon" />
                      Analytics
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button 
                    className="action-btn primary"
                    onClick={() => {
                      setCurrentPage(`course-learn-${course._id}`);
                    }}
                  >
                    <PlayCircle className="icon" />
                    {enhancedProgress.completionPercentage > 0 ? 'Continue' : 'Start'}
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
                </>
              )}
            </div>
          </div>

          <div className="course-instructor">
            <User className="instructor-icon" />
            <span>{course?.instructor?.firstName} {course?.instructor?.lastName}</span>
          </div>

          {enrollment.isInstructor ? (
            <div className="instructor-stats-list">
              <div className="stat-item">
                <Users className="stat-icon" />
                <span>{enhancedProgress.totalEnrollments} students enrolled</span>
              </div>
              <div className="stat-item">
                <Star className="stat-icon" />
                <span>{enhancedProgress.averageRating.toFixed(1)} average rating</span>
              </div>
              <div className="stat-item">
                <FileText className="stat-icon" />
                <span>{enhancedProgress.totalLessons} lessons</span>
              </div>
              <div className="stat-item">
                <DollarSign className="stat-icon" />
                <span>{formatCurrency((enhancedProgress.totalEnrollments || 0) * (course.price || 0))} revenue</span>
              </div>
            </div>
          ) : (
            <div className="progress-section">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{
                    width: `${enhancedProgress.completionPercentage}%`,
                    backgroundColor: getProgressColor(enhancedProgress.completionPercentage)
                  }}
                ></div>
              </div>
              <div className="progress-info">
                <span className="progress-percentage">
                  {enhancedProgress.completionPercentage}% complete
                </span>
                <span>•</span>
                <span>{enhancedProgress.completedLessons} / {enhancedProgress.totalLessons} lessons</span>
                <span>•</span>
                <span>{formatDuration(enhancedProgress.totalTimeSpent)} spent</span>
                {enhancedProgress.totalNotes > 0 && (
                  <>
                    <span>•</span>
                    <span>{enhancedProgress.totalNotes} notes</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="course-stats">
            <div className="stat-item">
              <Calendar className="stat-icon" />
              <span>
                {enrollment.isInstructor ? 'Created' : 'Enrolled'} {formatDate(enrollment.enrollmentDate)}
              </span>
            </div>
            {enhancedProgress.lastAccessedAt && (
              <div className="stat-item">
                <Clock className="stat-icon" />
                <span>Last access {formatDate(enhancedProgress.lastAccessedAt)}</span>
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

  // Analytics Modal Component
  const renderAnalyticsModal = () => {
    if (!showAnalyticsModal || !selectedCourseAnalytics) return null;

    return (
      <div className="modal-overlay" onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowAnalyticsModal(false);
          setSelectedCourseAnalytics(null);
          setAnalyticsData({});
        }
      }}>
        <div className="modal-content analytics-modal">
          <div className="modal-header">
            <h2>Course Analytics - {selectedCourseAnalytics.title}</h2>
            <button 
              className="close-modal"
              onClick={() => {
                setShowAnalyticsModal(false);
                setSelectedCourseAnalytics(null);
                setAnalyticsData({});
              }}
            >
              <X className="icon" />
            </button>
          </div>
          
          <div className="analytics-content">
            {loadingAnalytics ? (
              <div className="loading-section">
                <div className="spinner"></div>
                <p>Loading analytics...</p>
              </div>
            ) : Object.keys(analyticsData).length > 0 ? (
              <>
                {/* Overview Stats */}
                <div className="analytics-section">
                  <h3>Overview</h3>
                  <div className="analytics-stats-grid">
                    <div className="analytics-stat-card">
                      <div className="stat-icon">
                        <Users />
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analyticsData.totalEnrollments || 0}</div>
                        <div className="stat-label">Total Enrollments</div>
                      </div>
                    </div>
                    
                    <div className="analytics-stat-card">
                      <div className="stat-icon">
                        <DollarSign />
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{formatCurrency(analyticsData.totalRevenue || 0)}</div>
                        <div className="stat-label">Total Revenue</div>
                      </div>
                    </div>
                    
                    <div className="analytics-stat-card">
                      <div className="stat-icon">
                        <TrendingUp />
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analyticsData.recentEnrollments || 0}</div>
                        <div className="stat-label">Recent Enrollments (30d)</div>
                      </div>
                    </div>
                    
                    <div className="analytics-stat-card">
                      <div className="stat-icon">
                        <CheckCircle />
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analyticsData.completionRate || 0}%</div>
                        <div className="stat-label">Completion Rate</div>
                      </div>
                    </div>
                    
                    <div className="analytics-stat-card">
                      <div className="stat-icon">
                        <Star />
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">
                          {analyticsData.averageRating ? analyticsData.averageRating.toFixed(1) : '0.0'}
                        </div>
                        <div className="stat-label">Average Rating</div>
                      </div>
                    </div>
                    
                    <div className="analytics-stat-card">
                      <div className="stat-icon">
                        <MessageCircle />
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analyticsData.totalRatings || 0}</div>
                        <div className="stat-label">Total Reviews</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rating Distribution */}
                {analyticsData.ratingDistribution && analyticsData.ratingDistribution.length > 0 && (
                  <div className="analytics-section">
                    <h3>Rating Distribution</h3>
                    <div className="rating-distribution">
                      {analyticsData.ratingDistribution.map((rating, index) => (
                        <div key={index} className="rating-bar">
                          <div className="rating-label">
                            {[...Array(rating._id)].map((_, i) => (
                              <Star key={i} className="star filled" />
                            ))}
                          </div>
                          <div className="rating-progress">
                            <div 
                              className="rating-fill"
                              style={{
                                width: `${analyticsData.totalRatings > 0 ? 
                                  (rating.count / analyticsData.totalRatings) * 100 : 0}%`
                              }}
                            ></div>
                          </div>
                          <div className="rating-count">{rating.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enrollment Trend */}
                {analyticsData.enrollmentTrend && analyticsData.enrollmentTrend.length > 0 && (
                  <div className="analytics-section">
                    <h3>Enrollment Trend (Last 30 Days)</h3>
                    <div className="trend-chart">
                      {analyticsData.enrollmentTrend.map((trend, index) => (
                        <div key={index} className="trend-item">
                          <div className="trend-date">{formatDate(trend.date)}</div>
                          <div className="trend-value">{trend.count} enrollments</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Analytics for Admin */}
                {userRole === 'admin' && analyticsData.summary && (
                  <div className="analytics-section">
                    <h3>Detailed Analytics</h3>
                    <div className="detailed-analytics">
                      <div className="analytics-row">
                        <span className="label">Active Enrollments:</span>
                        <span className="value">{analyticsData.summary.activeEnrollments || 0}</span>
                      </div>
                      <div className="analytics-row">
                        <span className="label">Completed Enrollments:</span>
                        <span className="value">{analyticsData.summary.completedEnrollments || 0}</span>
                      </div>
                      <div className="analytics-row">
                        <span className="label">Average Progress:</span>
                        <span className="value">{analyticsData.summary.completionRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {analyticsData.recentEnrollments && Array.isArray(analyticsData.recentEnrollments) && (
                  <div className="analytics-section">
                    <h3>Recent Activity</h3>
                    <div className="recent-activity">
                      {analyticsData.recentEnrollments.slice(0, 5).map((activity, index) => (
                        <div key={index} className="activity-item">
                          <div className="activity-info">
                            <UserCheck className="activity-icon" />
                            <div className="activity-details">
                              <div className="activity-text">
                                {activity.student?.firstName} {activity.student?.lastName} enrolled
                              </div>
                              <div className="activity-date">{formatDate(activity.enrollmentDate)}</div>
                            </div>
                          </div>
                          <div className="activity-amount">
                            {formatCurrency(activity.paymentAmount || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-analytics">
                <BarChart3 className="no-analytics-icon" />
                <h3>No Analytics Available</h3>
                <p>Analytics data is not available for this course yet.</p>
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
    const enhancedProgress = getEnhancedProgressInfo(enrollment);
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
                  {enhancedProgress.lastAccessedAt && (
                    <div className="date-item">
                      <Clock className="date-icon" />
                      <span>Last Access: {formatDate(enhancedProgress.lastAccessedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Learning Progress */}
            <div className="detail-section">
              <h3>Learning Progress</h3>
              <div className="progress-info">
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{
                        width: `${enhancedProgress.completionPercentage}%`,
                        backgroundColor: getProgressColor(enhancedProgress.completionPercentage)
                      }}
                    ></div>
                  </div>
                  <span className="progress-percentage">
                    {enhancedProgress.completionPercentage}%
                  </span>
                </div>
                
                <div className="progress-stats">
                  <div className="progress-stat">
                    <BookOpen className="stat-icon" />
                    <span>
                      {enhancedProgress.completedLessons} / {enhancedProgress.totalLessons} lessons completed
                    </span>
                  </div>
                  <div className="progress-stat">
                    <Clock className="stat-icon" />
                    <span>
                      {formatDuration(enhancedProgress.totalTimeSpent)} total time spent
                    </span>
                  </div>
                  {enhancedProgress.totalNotes > 0 && (
                    <div className="progress-stat">
                      <MessageCircle className="stat-icon" />
                      <span>
                        {enhancedProgress.totalNotes} notes taken
                      </span>
                    </div>
                  )}
                  {enhancedProgress.totalBookmarks > 0 && (
                    <div className="progress-stat">
                      <BookmarkIcon className="stat-icon" />
                      <span>
                        {enhancedProgress.totalBookmarks} bookmarks saved
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Lesson Progress */}
            {enhancedProgress.progress && enhancedProgress.progress.length > 0 && (
              <div className="detail-section">
                <h3>Lesson Progress</h3>
                <div className="lesson-progress-list">
                  {enhancedProgress.progress.map((lessonProgress, index) => (
                    <div key={index} className="lesson-progress-item">
                      <div className="lesson-info">
                        <div className="lesson-status">
                          {lessonProgress.status === 'completed' ? (
                            <CheckCircle className="status-icon completed" />
                          ) : lessonProgress.completionPercentage > 0 ? (
                            <PlayCircle className="status-icon in-progress" />
                          ) : (
                            <Circle className="status-icon not-started" />
                          )}
                        </div>
                        <div className="lesson-details">
                          <h4>{lessonProgress.lesson?.title || `Lesson ${index + 1}`}</h4>
                          <div className="lesson-meta">
                            <span>{lessonProgress.completionPercentage}% complete</span>
                            <span>•</span>
                            <span>{formatDuration(lessonProgress.timeSpent)}</span>
                            {lessonProgress.notes?.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{lessonProgress.notes.length} notes</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="lesson-progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{
                            width: `${lessonProgress.completionPercentage}%`,
                            backgroundColor: getProgressColor(lessonProgress.completionPercentage)
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Info */}
            {enrollment.payment && (
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
            )}

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
                {enhancedProgress.completionPercentage > 0 ? 'Continue Learning' : 'Start Learning'}
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
          <h1>
            {userRole === 'instructor' || userRole === 'admin' ? 
              'Manage and track the performance of your created courses' : 
              'Track your learning progress and manage your enrolled courses'
            }
          </h1>
        </div>
        
        <div className="header-actions">
          <button
            onClick={() => fetchEnrollments(true)}
            disabled={refreshing}
            className="refresh-btn"
          >
            <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          {(userRole === 'instructor' || userRole === 'admin') && (
            <button
              onClick={() => setCurrentPage('course-create')}
              className="create-course-btn"
            >
              <BookOpen className="icon" />
              Create Course
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <AlertCircle className="error-icon" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="close-error">
            <X className="icon" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Controls */}
      <div className="courses-controls">
        <div className="controls-left">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
          >
            <Filter className="icon" />
            Filters
            {showFilters ? <ChevronUp className="chevron" /> : <ChevronDown className="chevron" />}
          </button>
        </div>

        <div className="controls-right">
          <div className="view-controls">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            >
              <div className="grid-icon"></div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            >
              <div className="list-icon"></div>
            </button>
          </div>

          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="items-per-page"
          >
            <option value={12}>12 per page</option>
            <option value={24}>24 per page</option>
            <option value={48}>48 per page</option>
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              {userRole === 'instructor' || userRole === 'admin' ? (
                <>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </>
              ) : (
                <>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="suspended">Suspended</option>
                  <option value="refunded">Refunded</option>
                </>
              )}
            </select>
          </div>

          {userRole === 'student' && (
            <div className="filter-group">
              <label>Progress</label>
              <select
                value={progressFilter}
                onChange={(e) => setProgressFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Progress</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="enrollmentDate">Date {userRole === 'instructor' ? 'Created' : 'Enrolled'}</option>
              <option value="title">Title</option>
              {userRole === 'student' && (
                <>
                  <option value="progress">Progress</option>
                  <option value="lastAccess">Last Access</option>
                </>
              )}
              <option value="instructor">Instructor</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="filter-select"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setProgressFilter('all');
              setSortBy('enrollmentDate');
              setSortOrder('desc');
            }}
            className="clear-filters-btn"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Courses Display */}
      <div className="courses-content">
        {sortedEnrollments.length === 0 ? (
          <div className="empty-state">
            <BookOpen className="empty-icon" />
            <h3>
              {searchTerm || statusFilter !== 'all' || progressFilter !== 'all'
                ? 'No courses match your filters'
                : userRole === 'instructor' || userRole === 'admin'
                ? 'No courses created yet'
                : 'No courses enrolled yet'
              }
            </h3>
            <p>
              {searchTerm || statusFilter !== 'all' || progressFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : userRole === 'instructor' || userRole === 'admin'
                ? 'Start by creating your first course'
                : 'Explore our course catalog to start learning'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && progressFilter === 'all' && (
              <button
                onClick={() => setCurrentPage(userRole === 'instructor' || userRole === 'admin' ? 'course-create' : 'courses')}
                className="action-btn primary"
              >
                {userRole === 'instructor' || userRole === 'admin' ? (
                  <>
                    <BookOpen className="icon" />
                    Create Your First Course
                  </>
                ) : (
                  <>
                    <Search className="icon" />
                    Browse Courses
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={`courses-grid ${viewMode}`}>
              {sortedEnrollments.map((enrollment) =>
                viewMode === 'grid' ? renderCourseCard(enrollment) : renderCourseList(enrollment)
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && renderPagination()}
          </>
        )}
      </div>

      {/* Loading Progress Overlay */}
      {loadingProgress && (
        <div className="progress-loading-overlay">
          <div className="progress-loading-content">
            <RefreshCw className="spinning" />
            <p>Loading detailed progress...</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showDetailModal && selectedEnrollment && renderEnrollmentDetails(selectedEnrollment)}
      {renderAnalyticsModal()}
    </div>
  );
};

export default MyCourses;