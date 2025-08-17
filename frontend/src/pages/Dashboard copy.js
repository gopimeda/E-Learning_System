import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  TrendingUp, 
  Award, 
  Clock, 
  Calendar,
  Play,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Target,
  User,
  Bell,
  Search,
  Filter,
  ArrowRight,
  Star,
  FileText,
  MessageCircle,
  Activity,
  Users,
  Zap,
  X,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Eye,
  ChevronRight,
  Bookmark,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  BarChart2,
  PieChart,
  Bookmark as BookmarkIcon,
  Layers,
  Clock as ClockIcon2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Flag,
  Check,
  AlertTriangle,
  Loader
} from 'lucide-react';
import './Dashboard.css';

const API_BASE_URL = 'http://localhost:5555';

const Dashboard = ({ setCurrentPage }) => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    recentCourses: [],
    quizAttempts: [],
    notifications: [],
    weeklyProgress: [],
    upcomingDeadlines: []
  });
  const [enrollments, setEnrollments] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('week');
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);

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

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    return `${formatDate(dateString)} at ${formatTime(dateString)}`;
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

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
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
      suspended: PauseCircle,
      refunded: X
    };
    return icons[status] || AlertCircle;
  };

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError('');
      const headers = createAuthHeaders();
      if (!headers) return;

      // Fetch enrollments
      const enrollmentsResponse = await fetch(
        `${API_BASE_URL}/api/enrollments?page=1&limit=10`,
        { method: 'GET', headers }
      );

      if (!enrollmentsResponse.ok) {
        throw new Error(`HTTP ${enrollmentsResponse.status}`);
      }

      const enrollmentsData = await enrollmentsResponse.json();
      if (enrollmentsData.success) {
        const enrollmentsList = enrollmentsData.data?.enrollments || [];
        setEnrollments(enrollmentsList);

        // Fetch detailed progress for each enrollment
        await fetchDetailedProgress(enrollmentsList);

        // Fetch quiz attempts
        await fetchQuizAttempts();

        // Fetch notifications
        await fetchNotifications();

        // Fetch upcoming deadlines
        await fetchUpcomingDeadlines();

        // Calculate dashboard statistics
        calculateDashboardStats(enrollmentsList);
      }
    } catch (err) {
      console.error('Fetch dashboard data error:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch detailed progress data
  const fetchDetailedProgress = useCallback(async (enrollmentsList) => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const progressPromises = enrollmentsList.map(async (enrollment) => {
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
    }
  }, []);

  // Fetch quiz attempts
  const fetchQuizAttempts = useCallback(async () => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${API_BASE_URL}/api/quizzes/student/attempts?page=1&limit=5`,
        { method: 'GET', headers }
      );

      if (response.ok) {
        const quizData = await response.json();
        if (quizData.success) {
          setDashboardData(prev => ({
            ...prev,
            quizAttempts: quizData.data.attempts || []
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${API_BASE_URL}/api/notifications?limit=5`,
        { method: 'GET', headers }
      );

      if (response.ok) {
        const notificationsData = await response.json();
        if (notificationsData.success) {
          setDashboardData(prev => ({
            ...prev,
            notifications: notificationsData.data.notifications || []
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Fetch upcoming deadlines
  const fetchUpcomingDeadlines = useCallback(async () => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${API_BASE_URL}/api/quizzes/upcoming-deadlines`,
        { method: 'GET', headers }
      );

      if (response.ok) {
        const deadlinesData = await response.json();
        if (deadlinesData.success) {
          setDashboardData(prev => ({
            ...prev,
            upcomingDeadlines: deadlinesData.data.deadlines || []
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching upcoming deadlines:', error);
    }
  }, []);

  // Calculate dashboard statistics
  const calculateDashboardStats = (enrollmentsList) => {
    const stats = {
      totalCourses: enrollmentsList.length,
      activeCourses: enrollmentsList.filter(e => e.status === 'active').length,
      completedCourses: enrollmentsList.filter(e => e.status === 'completed').length,
      certificatesEarned: enrollmentsList.filter(e => e.certificate?.isEarned).length,
      totalTimeSpent: 0,
      averageProgress: 0,
      totalLessons: 0,
      completedLessons: 0,
      totalNotes: 0,
      totalBookmarks: 0,
      studyStreak: 0,
      totalQuizzesTaken: 0,
      quizPassRate: 0
    };

    let totalProgress = 0;
    let coursesWithProgress = 0;

    enrollmentsList.forEach(enrollment => {
      const courseProgress = progressData[enrollment.course._id];
      if (courseProgress && courseProgress.stats) {
        const progressStats = courseProgress.stats;
        stats.totalTimeSpent += progressStats.totalTimeSpent || 0;
        stats.totalLessons += progressStats.totalLessons || 0;
        stats.completedLessons += progressStats.completedLessons || 0;
        stats.totalNotes += progressStats.totalNotes || 0;
        stats.totalBookmarks += progressStats.totalBookmarks || 0;
        
        if (progressStats.overallProgress !== undefined) {
          totalProgress += progressStats.overallProgress;
          coursesWithProgress++;
        }
      } else {
        const progress = enrollment.progress?.completionPercentage || 0;
        totalProgress += progress;
        coursesWithProgress++;
      }
    });

    stats.averageProgress = coursesWithProgress > 0 
      ? Math.round(totalProgress / coursesWithProgress) 
      : 0;

    // Calculate quiz stats
    const quizAttempts = dashboardData.quizAttempts;
    stats.totalQuizzesTaken = quizAttempts.length;
    if (quizAttempts.length > 0) {
      const passedQuizzes = quizAttempts.filter(attempt => attempt.isPassed).length;
      stats.quizPassRate = Math.round((passedQuizzes / quizAttempts.length) * 100);
    }

    // Generate weekly progress data
    stats.weeklyProgress = generateWeeklyProgress();

    setDashboardData(prev => ({
      ...prev,
      stats,
      recentCourses: enrollmentsList.slice(0, 6)
    }));
  };

  // Generate weekly progress data
  const generateWeeklyProgress = () => {
    const weeklyData = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      weeklyData.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        timeSpent: Math.floor(Math.random() * 180) + 30, // 30-210 minutes
        lessonsCompleted: Math.floor(Math.random() * 5),
        dateString: date.toDateString()
      });
    }
    
    return weeklyData;
  };

  // Get enhanced progress info
  const getEnhancedProgressInfo = (enrollment) => {
    const courseProgress = progressData[enrollment.course._id];
    
    if (courseProgress && courseProgress.stats) {
      return {
        completionPercentage: courseProgress.stats.overallProgress || 0,
        completedLessons: courseProgress.stats.completedLessons || 0,
        totalLessons: courseProgress.stats.totalLessons || 0,
        totalTimeSpent: courseProgress.stats.totalTimeSpent || 0,
        lastAccessedAt: courseProgress.stats.lastAccessedAt,
        totalNotes: courseProgress.stats.totalNotes || 0,
        totalBookmarks: courseProgress.stats.totalBookmarks || 0
      };
    }
    
    return {
      completionPercentage: enrollment.progress?.completionPercentage || 0,
      completedLessons: enrollment.progress?.completedLessons?.length || 0,
      totalLessons: enrollment.progress?.totalLessons || 0,
      totalTimeSpent: enrollment.progress?.totalTimeSpent || 0,
      lastAccessedAt: enrollment.progress?.lastAccessedAt,
      totalNotes: 0,
      totalBookmarks: 0
    };
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        { method: 'PUT', headers }
      );

      if (response.ok) {
        // Update local state to mark as read
        setDashboardData(prev => ({
          ...prev,
          notifications: prev.notifications.map(notification => 
            notification._id === notificationId 
              ? { ...notification, isRead: true } 
              : notification
          )
        }));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Loading state
  if (loading && !dashboardData.stats.totalCourses) {
    return (
      <div className="dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back!</h1>
          <p>Track your learning progress and stay updated</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            title="Refresh dashboard"
          >
            <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} />
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

      {/* Dashboard Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
        <button 
          className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Quick Stats */}
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">
                <BookOpen />
              </div>
              <div className="stat-content">
                <div className="stat-value">{dashboardData.stats.totalCourses || 0}</div>
                <div className="stat-label">Enrolled Courses</div>
                <div className="stat-trend">
                  <span className="trend-positive">
                    +{dashboardData.stats.activeCourses || 0} active
                  </span>
                </div>
              </div>
            </div>
            
            <div className="stat-card success">
              <div className="stat-icon">
                <TrendingUp />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {dashboardData.stats.averageProgress || 0}%
                </div>
                <div className="stat-label">Average Progress</div>
                <div className="stat-trend">
                  <span className="trend-positive">
                    {dashboardData.stats.completedLessons || 0} lessons completed
                  </span>
                </div>
              </div>
            </div>
            
            <div className="stat-card warning">
              <div className="stat-icon">
                <Clock />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {formatDuration(dashboardData.stats.totalTimeSpent || 0)}
                </div>
                <div className="stat-label">Total Study Time</div>
                <div className="stat-trend">
                  <span className="trend-neutral">
                    This week
                  </span>
                </div>
              </div>
            </div>
            
            <div className="stat-card info">
              <div className="stat-icon">
                <Award />
              </div>
              <div className="stat-content">
                <div className="stat-value">{dashboardData.stats.certificatesEarned || 0}</div>
                <div className="stat-label">Certificates</div>
                <div className="stat-trend">
                  <span className="trend-positive">
                    {dashboardData.stats.completedCourses || 0} completed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="dashboard-grid">
            {/* Continue Learning */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Continue Learning</h3>
                <button 
                  className="view-all-btn"
                  onClick={() => setCurrentPage('my-courses')}
                >
                  View All <ArrowRight className="icon" />
                </button>
              </div>
              <div className="card-content">
                {dashboardData.recentCourses?.length > 0 ? (
                  <div className="recent-courses">
                    {(showAllCourses ? dashboardData.recentCourses : dashboardData.recentCourses.slice(0, 3)).map(enrollment => {
                      const course = enrollment.course;
                      const progress = getEnhancedProgressInfo(enrollment);
                      const StatusIcon = getStatusIcon(enrollment.status);
                      
                      return (
                        <div key={enrollment._id} className="course-item">
                          <div className="course-thumbnail">
                            {course?.thumbnail ? (
                              <img src={course.thumbnail} alt={course.title} />
                            ) : (
                              <div className="placeholder-thumbnail">
                                <BookOpen />
                              </div>
                            )}
                            <div className="play-overlay">
                              <PlayCircle className="play-icon" />
                            </div>
                            <div className="course-status" style={{ backgroundColor: getStatusColor(enrollment.status) }}>
                              <StatusIcon className="icon" />
                            </div>
                          </div>
                          <div className="course-info">
                            <h4>{course?.title}</h4>
                            <div className="course-meta">
                              <span className="category">{course?.category}</span>
                              <span className="instructor">
                                {course?.instructor?.firstName} {course?.instructor?.lastName}
                              </span>
                            </div>
                            <div className="progress-section">
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{
                                    width: `${progress.completionPercentage}%`,
                                    backgroundColor: getProgressColor(progress.completionPercentage)
                                  }}
                                ></div>
                              </div>
                              <div className="progress-info">
                                <span>{progress.completionPercentage}% complete</span>
                                <span>{progress.completedLessons}/{progress.totalLessons} lessons</span>
                              </div>
                            </div>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    backgroundColor: progress.completionPercentage > 0 ? '#ffc107' : '#6c757d', // yellow for in progress, gray for pending
                                    color: '#fff',
                                    borderRadius: '4px',
                                    padding: '6px 12px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'default',
                                    userSelect: 'none'
                                  }}
                                >
                                  {progress.completionPercentage > 0 ? 'In Progress' : 'Pending'}
                                </span>


                          </div>
                        </div>
                      );
                    })}
                    {dashboardData.recentCourses.length > 3 && (
                      <button 
                        className="toggle-courses-btn"
                        onClick={() => setShowAllCourses(!showAllCourses)}
                      >
                        {showAllCourses ? 'Show Less' : 'Show All'}
                        {showAllCourses ? <ChevronUp className="icon" /> : <ChevronDown className="icon" />}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <BookOpen className="empty-icon" />
                    <p>No courses enrolled yet</p>
                    <button 
                      className="browse-btn"
                      onClick={() => setCurrentPage('courses')}
                    >
                      Browse Courses
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Quiz Attempts */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Recent Quiz Results</h3>
                <button 
                  className="view-all-btn"
                  onClick={() => setCurrentPage('quiz-results')}
                >
                  View All <ArrowRight className="icon" />
                </button>
              </div>
              <div className="card-content">
                {dashboardData.quizAttempts?.length > 0 ? (
                  <div className="quiz-attempts">
                    {(showAllQuizzes ? dashboardData.quizAttempts : dashboardData.quizAttempts.slice(0, 3)).map(attempt => (
                      <div key={attempt._id} className="quiz-item">
                        <div className="quiz-info">
                          <h4>{attempt.quiz?.title}</h4>
                          <div className="quiz-meta">
                            <span className="course-name">{attempt.quiz?.course?.title}</span>
                            <span className="attempt-date">{formatDate(attempt.submittedAt)}</span>
                          </div>
                        </div>
                        <div className="quiz-result">
                          <div className={`score ${attempt.isPassed ? 'passed' : 'failed'}`}>
                            {attempt.percentage}%
                          </div>
                          <div className="status">
                            {attempt.isPassed ? (
                              <CheckCircle className="icon success" />
                            ) : (
                              <AlertCircle className="icon warning" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {dashboardData.quizAttempts.length > 3 && (
                      <button 
                        className="toggle-quizzes-btn"
                        onClick={() => setShowAllQuizzes(!showAllQuizzes)}
                      >
                        {showAllQuizzes ? 'Show Less' : 'Show All'}
                        {showAllQuizzes ? <ChevronUp className="icon" /> : <ChevronDown className="icon" />}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Target className="empty-icon" />
                    <p>No quiz attempts yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Recent Notifications</h3>
                <button 
                  className="view-all-btn"
                  onClick={() => setCurrentPage('notifications')}
                >
                  View All <ArrowRight className="icon" />
                </button>
              </div>
              <div className="card-content">
                {dashboardData.notifications?.length > 0 ? (
                  <div className="notifications-list">
                    {dashboardData.notifications.map(notification => (
                      <div 
                        key={notification._id} 
                        className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                        onClick={() => markNotificationAsRead(notification._id)}
                      >
                        <div className="notification-icon">
                          <Bell className="icon" />
                        </div>
                        <div className="notification-content">
                          <h4>{notification.title}</h4>
                          <p>{notification.message}</p>
                          <div className="notification-meta">
                            <span>{formatDateTime(notification.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Bell className="empty-icon" />
                    <p>No notifications</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Upcoming Deadlines</h3>
                <button 
                  className="view-all-btn"
                  onClick={() => setCurrentPage('calendar')}
                >
                  View All <ArrowRight className="icon" />
                </button>
              </div>
              <div className="card-content">
                {dashboardData.upcomingDeadlines?.length > 0 ? (
                  <div className="deadlines-list">
                    {dashboardData.upcomingDeadlines.map(deadline => (
                      <div key={deadline._id} className="deadline-item">
                        <div className="deadline-icon">
                          <Flag className="icon" />
                        </div>
                        <div className="deadline-content">
                          <h4>{deadline.quiz?.title}</h4>
                          <p>{deadline.quiz?.course?.title}</p>
                          <div className="deadline-meta">
                            <CalendarIcon className="icon" />
                            <span>Due {formatDate(deadline.quiz?.dueDate)}</span>
                          </div>
                        </div>
                        <div className="deadline-actions">
                          <button 
                            className="action-btn"
                            onClick={() => setCurrentPage(`quiz-attempt-${deadline.quiz._id}`)}
                          >
                            Take Quiz
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Calendar className="empty-icon" />
                    <p>No upcoming deadlines</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="progress-tab">
          {/* Time Range Selector */}
          <div className="time-range-selector">
            <button 
              className={`time-range-btn ${timeRange === 'week' ? 'active' : ''}`}
              onClick={() => setTimeRange('week')}
            >
              This Week
            </button>
            <button 
              className={`time-range-btn ${timeRange === 'month' ? 'active' : ''}`}
              onClick={() => setTimeRange('month')}
            >
              This Month
            </button>
            <button 
              className={`time-range-btn ${timeRange === 'all' ? 'active' : ''}`}
              onClick={() => setTimeRange('all')}
            >
              All Time
            </button>
          </div>

          {/* Progress Charts */}
          <div className="progress-charts">
            <div className="chart-card">
              <div className="chart-header">
                <h3>Learning Activity</h3>
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
                    <span>Study Time</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
                    <span>Lessons Completed</span>
                  </div>
                </div>
              </div>
              <div className="chart-container">
                <div className="weekly-chart">
                  {dashboardData.stats.weeklyProgress?.map((day, index) => (
                    <div key={index} className="chart-bar">
                      <div 
                        className="bar time-spent" 
                        style={{ 
                          height: `${Math.max(10, (day.timeSpent / 240) * 100)}%`,
                          backgroundColor: index === 6 ? '#3b82f6' : '#93c5fd'
                        }}
                        title={`${day.timeSpent} minutes on ${day.date}`}
                      ></div>
                      <div 
                        className="bar lessons-completed" 
                        style={{ 
                          height: `${Math.max(10, (day.lessonsCompleted / 5) * 100)}%`,
                          backgroundColor: index === 6 ? '#10b981' : '#6ee7b7'
                        }}
                        title={`${day.lessonsCompleted} lessons on ${day.date}`}
                      ></div>
                      <div className="bar-label">{day.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3>Course Progress</h3>
              </div>
              <div className="courses-progress">
                {dashboardData.recentCourses?.map(enrollment => {
                  const course = enrollment.course;
                  const progress = getEnhancedProgressInfo(enrollment);
                  
                  return (
                    <div key={enrollment._id} className="course-progress-item">
                      <div className="course-info">
                        <h4>{course?.title}</h4>
                        <span>{progress.completionPercentage}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{
                            width: `${progress.completionPercentage}%`,
                            backgroundColor: getProgressColor(progress.completionPercentage)
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Progress */}
          <div className="detailed-progress">
            <h3>Detailed Course Progress</h3>
            <div className="progress-table">
              <div className="table-header">
                <div className="header-item">Course</div>
                <div className="header-item">Progress</div>
                <div className="header-item">Lessons</div>
                <div className="header-item">Time Spent</div>
                <div className="header-item">Last Accessed</div>
              
              </div>
              <div className="table-body">
                {dashboardData.recentCourses?.map(enrollment => {
                  const course = enrollment.course;
                  const progress = getEnhancedProgressInfo(enrollment);
                  
                  return (
                    <div key={enrollment._id} className="table-row">
                      <div className="table-cell course-cell">
                        <div className="course-thumbnail">
                          {course?.thumbnail ? (
                            <img src={course.thumbnail} alt={course.title} />
                          ) : (
                            <div className="placeholder-thumbnail">
                              <BookOpen />
                            </div>
                          )}
                        </div>
                        <div className="course-details">
                          <h4>{course?.title}</h4>
                          <p>{course?.category}</p>
                        </div>
                      </div>
                      <div className="table-cell">
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{
                                width: `${progress.completionPercentage}%`,
                                backgroundColor: getProgressColor(progress.completionPercentage)
                              }}
                            ></div>
                          </div>
                          <span>{progress.completionPercentage}%</span>
                        </div>
                      </div>
                      <div className="table-cell">
                        {progress.completedLessons}/{progress.totalLessons}
                      </div>
                      <div className="table-cell">
                        {formatDuration(progress.totalTimeSpent)}
                      </div>
                      <div className="table-cell">
                        {progress.lastAccessedAt ? formatDate(progress.lastAccessedAt) : 'N/A'}
                      </div>
                     
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="performance-tab">
          {/* Performance Overview */}
          <div className="performance-overview">
            <div className="performance-card">
              <div className="performance-icon">
                <Trophy />
              </div>
              <div className="performance-content">
                <h3>Quiz Performance</h3>
                <div className="performance-stats">
                  <div className="stat-item">
                    <span className="stat-value">{dashboardData.stats.totalQuizzesTaken || 0}</span>
                    <span className="stat-label">Quizzes Taken</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{dashboardData.stats.quizPassRate || 0}%</span>
                    <span className="stat-label">Pass Rate</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {dashboardData.quizAttempts.filter(a => a.isPassed).length || 0}
                    </span>
                    <span className="stat-label">Passed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="performance-card">
              <div className="performance-icon">
                <TrendingUp />
              </div>
              <div className="performance-content">
                <h3>Learning Efficiency</h3>
                <div className="performance-stats">
                  <div className="stat-item">
                    <span className="stat-value">
                      {dashboardData.stats.averageProgress || 0}%
                    </span>
                    <span className="stat-label">Avg Progress</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {formatDuration(dashboardData.stats.totalTimeSpent || 0)}
                    </span>
                    <span className="stat-label">Time Spent</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {dashboardData.stats.studyStreak || 0} days
                    </span>
                    <span className="stat-label">Study Streak</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quiz Performance */}
          <div className="quiz-performance">
            <h3>Recent Quiz Results</h3>
            <div className="quiz-results">
              {dashboardData.quizAttempts?.length > 0 ? (
                dashboardData.quizAttempts.map(attempt => (
                  <div key={attempt._id} className="quiz-result-item">
                    <div className="quiz-info">
                      <h4>{attempt.quiz?.title}</h4>
                      <p>{attempt.quiz?.course?.title}</p>
                      <div className="quiz-meta">
                        <span>{formatDate(attempt.submittedAt)}</span>
                        <span>Attempt #{attempt.attemptNumber}</span>
                      </div>
                    </div>
                    <div className="quiz-score">
                      <div className={`score-circle ${attempt.isPassed ? 'passed' : 'failed'}`}>
                        <div className="score-value">{attempt.percentage}%</div>
                        <svg className="score-ring" viewBox="0 0 36 36">
                          <path
                            className="circle-bg"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="circle-fill"
                            strokeDasharray={`${attempt.percentage}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                      </div>
                      <div className="quiz-status">
                        {attempt.isPassed ? (
                          <Check className="icon success" />
                        ) : (
                          <AlertTriangle className="icon warning" />
                        )}
                        <span>{attempt.isPassed ? 'Passed' : 'Failed'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Target className="empty-icon" />
                  <p>No quiz attempts yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Course Performance */}
          <div className="course-performance">
            <h3>Course Performance</h3>
            <div className="course-performance-grid">
              {dashboardData.recentCourses?.map(enrollment => {
                const course = enrollment.course;
                const progress = getEnhancedProgressInfo(enrollment);
                
                return (
                  <div key={enrollment._id} className="course-performance-item">
                    <div className="course-header">
                      <div className="course-thumbnail">
                        {course?.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} />
                        ) : (
                          <div className="placeholder-thumbnail">
                            <BookOpen />
                          </div>
                        )}
                      </div>
                      <div className="course-details">
                        <h4>{course?.title}</h4>
                        <p>{course?.category}</p>
                      </div>
                    </div>
                    <div className="performance-metrics">
                      <div className="metric">
                        <span className="metric-label">Progress</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{
                              width: `${progress.completionPercentage}%`,
                              backgroundColor: getProgressColor(progress.completionPercentage)
                            }}
                          ></div>
                        </div>
                        <span className="metric-value">{progress.completionPercentage}%</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Lessons</span>
                        <span className="metric-value">
                          {progress.completedLessons}/{progress.totalLessons}
                        </span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Time Spent</span>
                        <span className="metric-value">
                          {formatDuration(progress.totalTimeSpent)}
                        </span>
                      </div>
                    </div>
                  
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;