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
  Activity,
  TrendingUp,
  Calendar,
  User,
  Target,
  FileText,
  MessageCircle,
  Star,
  RefreshCw,
  BarChart3,
  PieChart,
  Timer,
  Zap,
  Users,
  ArrowRight,
  Flag,
  Eye,
  PlayCircle,
  HelpCircle,
  Download,
  Send
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Cell, LineChart, Line, Area, Pie, AreaChart } from 'recharts';

const API_BASE_URL = 'http://localhost:5555';

const Dashboard = () => {
  // State management
  const [enrollments, setEnrollments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [progressData, setProgressData] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);

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

  const getUserId = () => {
    try {
      const userData = localStorage.getItem('userData');
      if (!userData) return null;
      const parsedData = JSON.parse(userData);
      return parsedData._id || parsedData.id || parsedData.userId;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  // Fetch functions
  const fetchEnrollments = useCallback(async () => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/enrollments`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) {
        const enrollmentsData = data.data?.enrollments || [];
        setEnrollments(enrollmentsData);
        await fetchDetailedProgress(enrollmentsData);
        calculateEnhancedStats(enrollmentsData);
      }
    } catch (err) {
      console.error('Fetch enrollments error:', err);
      setError('Failed to fetch enrollments: ' + err.message);
    }
  }, []);

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

  const fetchQuizzes = useCallback(async () => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuizzes(data.data.quizzes || []);
        }
      }
    } catch (err) {
      console.error('Fetch quizzes error:', err);
    }
  }, []);

  const fetchAttempts = useCallback(async () => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const userId = getUserId();
      if (!userId) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/student/attempts/${userId}`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAttempts(data.data.attempts || []);
        }
      }
    } catch (err) {
      console.error('Fetch attempts error:', err);
    }
  }, []);

  const calculateEnhancedStats = (enrollmentsData) => {
    const enhancedStats = {
      totalCourses: enrollmentsData.length,
      activeCourses: enrollmentsData.filter(e => e.status === 'active').length,
      completedCourses: enrollmentsData.filter(e => e.status === 'completed').length,
      averageProgress: 0,
      totalTimeSpent: 0,
      certificatesEarned: enrollmentsData.filter(e => e.certificate?.isEarned).length,
      totalInvestment: enrollmentsData.reduce((sum, e) => sum + (e.payment?.amount || 0), 0),
      totalLessons: 0,
      completedLessons: 0,
      totalNotes: 0,
      totalBookmarks: 0
    };

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
        const progress = enrollment.progress?.completionPercentage || 0;
        totalProgress += progress;
        coursesWithProgress++;
      }
    });

    enhancedStats.averageProgress = coursesWithProgress > 0 
      ? Math.round(totalProgress / coursesWithProgress) 
      : 0;

    setStats(enhancedStats);
  };

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

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchEnrollments(), fetchQuizzes(), fetchAttempts()]);
    setRefreshing(false);
  };

  const startQuizAttempt = async (quizId) => {
    try {
      const headers = createAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/api/quizzes/${quizId}/attempt`, {
        method: 'POST',
        headers
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Quiz attempt started:', data.data.attemptId);
      }
    } catch (err) {
      console.error('Start quiz error:', err);
      setError('Failed to start quiz: ' + err.message);
    }
  };

  // Effects
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      await Promise.all([fetchEnrollments(), fetchQuizzes(), fetchAttempts()]);
      setLoading(false);
    };

    initializeDashboard();
  }, [fetchEnrollments, fetchQuizzes, fetchAttempts]);

  // Prepare chart data
  const courseProgressData = enrollments.map(enrollment => {
    const progress = getEnhancedProgressInfo(enrollment);
    return {
      name: enrollment.course.title.length > 12 
        ? enrollment.course.title.substring(0, 12) + '...' 
        : enrollment.course.title,
      progress: progress.completionPercentage,
      lessons: progress.completedLessons,
      totalLessons: progress.totalLessons,
      timeSpent: progress.totalTimeSpent / 3600,
      status: enrollment.status
    };
  });

  const statusDistributionData = [
    { name: 'Active', value: stats.activeCourses || 0, color: '#10b981' },
    { name: 'Completed', value: stats.completedCourses || 0, color: '#3b82f6' },
    { name: 'Suspended', value: (stats.totalCourses || 0) - (stats.activeCourses || 0) - (stats.completedCourses || 0), color: '#f59e0b' }
  ].filter(item => item.value > 0);

  const quizPerformanceData = attempts.slice(-5).map((attempt, index) => ({
    quiz: `Quiz ${index + 1}`,
    score: attempt.percentage,
    passed: attempt.isPassed
  }));

  const learningActivityData = enrollments.map(enrollment => {
    const progress = getEnhancedProgressInfo(enrollment);
    return {
      course: enrollment.course.title.length > 10 
        ? enrollment.course.title.substring(0, 10) + '...' 
        : enrollment.course.title,
      hours: Math.round((progress.totalTimeSpent / 3600) * 10) / 10,
      notes: progress.totalNotes,
      bookmarks: progress.totalBookmarks
    };
  }).slice(0, 6);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <RefreshCw className="spinning" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Learning Analytics</h1>
          <div className="header-stats">
            <span className="stat-item">{stats.totalCourses || 0} Courses</span>
            <span className="stat-item">{stats.averageProgress || 0}% Avg Progress</span>
            <span className="stat-item">{formatDuration(stats.totalTimeSpent || 0)} Learning Time</span>
            <span className="stat-item">{stats.certificatesEarned || 0} Certificates</span>
          </div>
        </div>
        <button 
          className="refresh-btn"
          onClick={refreshData}
          disabled={refreshing}
        >
          <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle className="icon" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="stats-overview">
        <div className="stat-card primary">
          <div className="stat-icon">
            <BookOpen />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalCourses || 0}</div>
            <div className="stat-label">Total Courses</div>
            <div className="stat-trend">
              {stats.activeCourses || 0} active
            </div>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">
            <TrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.averageProgress}%</div>
            <div className="stat-label">Avg Progress</div>
            <div className="stat-trend">
              {stats.completedCourses || 0} completed
            </div>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">
            <Clock />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatDuration(stats.totalTimeSpent || 0)}</div>
            <div className="stat-label">Learning Time</div>
            <div className="stat-trend">
              {Math.round((stats.totalTimeSpent || 0) / 3600)} hours
            </div>
          </div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon">
            <Award />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.certificatesEarned || 0}</div>
            <div className="stat-label">Certificates</div>
            <div className="stat-trend">
              {attempts.filter(a => a.isPassed).length} quiz passes
            </div>
          </div>
        </div>

        <div className="stat-card secondary">
          <div className="stat-icon">
            <FileText />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.completedLessons || 0}</div>
            <div className="stat-label">Lessons Done</div>
            <div className="stat-trend">
              of {stats.totalLessons || 0} total
            </div>
          </div>
        </div>

        <div className="stat-card accent">
          <div className="stat-icon">
            <MessageCircle />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalNotes || 0}</div>
            <div className="stat-label">Notes Taken</div>
            <div className="stat-trend">
              {stats.totalBookmarks || 0} bookmarks
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Course Progress Chart */}
        <div className="chart-card large">
          <div className="chart-header">
            <h3>Course Progress</h3>
            <BarChart3 className="chart-icon" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={courseProgressData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'progress' ? `${value}%` : value,
                  name === 'progress' ? 'Progress' : name
                ]}
                contentStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="progress" fill="#3b82f6" name="Progress %" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="chart-card small">
          <div className="chart-header">
            <h3>Status Overview</h3>
            <PieChart className="chart-icon" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPieChart>
              <Pie
                data={statusDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelStyle={{ fontSize: '11px' }}
              >
                {statusDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: '12px' }} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Learning Activity */}
        <div className="chart-card medium">
          <div className="chart-header">
            <h3>Learning Activity</h3>
            <Activity className="chart-icon" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={learningActivityData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="course" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: '12px' }} />
              <Area 
                type="monotone" 
                dataKey="hours" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.3}
                name="Hours"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quiz Performance */}
        {quizPerformanceData.length > 0 && (
          <div className="chart-card medium">
            <div className="chart-header">
              <h3>Quiz Performance</h3>
              <Target className="chart-icon" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={quizPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="quiz" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Score']}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 1, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Available Quizzes Section */}
      <div className="section">
        <div className="section-header">
          <h2>Available Quizzes</h2>
          <span className="count-badge">{quizzes.length}</span>
        </div>
        <div className="quizzes-grid">
          {quizzes.slice(0, 6).map(quiz => (
            <div key={quiz._id} className="quiz-card">
              <div className="quiz-header">
                <h3>{quiz.title}</h3>
                <div className="quiz-meta">
                  <span className="meta-item">
                    <HelpCircle className="icon" />
                    {quiz.questions?.length || 0}
                  </span>
                  <span className="meta-item">
                    <Clock className="icon" />
                    {quiz.settings?.timeLimit ? `${quiz.settings.timeLimit}m` : 'No limit'}
                  </span>
                  <span className="meta-item">
                    <Target className="icon" />
                    {quiz.settings?.passingScore || 70}%
                  </span>
                </div>
              </div>
              
              <div className="quiz-stats">
                <span className="stat">
                  <Award className="icon" />
                  {quiz.totalPoints || 0} pts
                </span>
                {quiz.dueDate && (
                  <span className="due-date">
                    <Calendar className="icon" />
                    {formatDate(quiz.dueDate)}
                  </span>
                )}
              </div>

              <button 
                className="quiz-action-btn"
                onClick={() => startQuizAttempt(quiz._id)}
              >
                <Play className="icon" />
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Quiz Attempts */}
      {attempts.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>Recent Attempts</h2>
            <span className="count-badge">{attempts.length}</span>
          </div>
          <div className="attempts-grid">
            {attempts.slice(0, 6).map(attempt => (
              <div key={attempt._id} className="attempt-card">
                <div className="attempt-header">
                  <h4>{attempt.quiz.title}</h4>
                  <div className={`score-badge ${attempt.isPassed ? 'passed' : 'failed'}`}>
                    {attempt.percentage}%
                  </div>
                </div>
                
                <div className="attempt-details">
                  <div className="detail-row">
                    <span className="label">Attempt #{attempt.attemptNumber}</span>
                    <span className="value">{formatTime(attempt.timeSpent)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{formatDate(attempt.submittedAt)}</span>
                    <span className={`status ${attempt.isPassed ? 'passed' : 'failed'}`}>
                      {attempt.isPassed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: #f8fafc;
          padding: 16px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .dashboard-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #64748b;
          font-size: 14px;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .header-content h1 {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px 0;
        }

        .header-stats {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .stat-item {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
          font-weight: 500;
        }

        .refresh-btn:hover {
          background: #e2e8f0;
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fee2e2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          border: 1px solid #fecaca;
          font-size: 13px;
        }

        .close-error {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
        }

        .stat-card.primary::before { background: #3b82f6; }
        .stat-card.success::before { background: #10b981; }
        .stat-card.warning::before { background: #f59e0b; }
        .stat-card.info::before { background: #8b5cf6; }
        .stat-card.secondary::before { background: #6b7280; }
        .stat-card.accent::before { background: #ec4899; }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .stat-card.primary .stat-icon { background: #3b82f6; }
        .stat-card.success .stat-icon { background: #10b981; }
        .stat-card.warning .stat-icon { background: #f59e0b; }
        .stat-card.info .stat-icon { background: #8b5cf6; }
        .stat-card.secondary .stat-icon { background: #6b7280; }
        .stat-card.accent .stat-icon { background: #ec4899; }

        .stat-icon svg {
          width: 18px;
          height: 18px;
        }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
          margin-bottom: 2px;
        }

        .stat-trend {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .chart-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .chart-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .chart-card.large { grid-column: span 6; }
        .chart-card.medium { grid-column: span 3; }
        .chart-card.small { grid-column: span 3; }

        @media (max-width: 1024px) {
          .chart-card.large { grid-column: span 8; }
          .chart-card.medium,
          .chart-card.small { grid-column: span 4; }
        }

        @media (max-width: 768px) {
          .chart-card.large,
          .chart-card.medium,
          .chart-card.small {
            grid-column: span 12;
          }
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .chart-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .chart-icon {
          width: 14px;
          height: 14px;
          color: #64748b;
        }

        .section {
          margin-bottom: 32px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .count-badge {
          background: #f1f5f9;
          color: #475569;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid #e2e8f0;
        }

        .quizzes-grid,
        .attempts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .quiz-card,
        .attempt-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .quiz-card:hover,
        .attempt-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .quiz-header {
          margin-bottom: 12px;
        }

        .quiz-header h3 {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .quiz-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
        }

        .meta-item .icon {
          width: 12px;
          height: 12px;
        }

        .quiz-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 12px 0;
          padding: 8px 0;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
        }

        .quiz-stats .stat {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
        }

        .quiz-stats .stat .icon {
          width: 12px;
          height: 12px;
        }

        .due-date {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #f59e0b;
          font-size: 12px;
          font-weight: 500;
        }

        .due-date .icon {
          width: 12px;
          height: 12px;
        }

        .quiz-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 10px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quiz-action-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .quiz-action-btn .icon {
          width: 14px;
          height: 14px;
        }

        .attempt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .attempt-header h4 {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          line-height: 1.3;
          flex: 1;
          margin-right: 8px;
        }

        .score-badge {
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .score-badge.passed {
          background: #d1fae5;
          color: #065f46;
        }

        .score-badge.failed {
          background: #fee2e2;
          color: #991b1b;
        }

        .attempt-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-row .label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .detail-row .value {
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
        }

        .detail-row .status.passed {
          color: #065f46;
          font-weight: 600;
          font-size: 12px;
        }

        .detail-row .status.failed {
          color: #991b1b;
          font-weight: 600;
          font-size: 12px;
        }

        .icon {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 768px) {
          .dashboard {
            padding: 12px;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            padding: 16px;
          }

          .header-content h1 {
            font-size: 20px;
          }

          .header-stats {
            gap: 16px;
          }

          .stat-item {
            font-size: 12px;
          }

          .charts-grid {
            gap: 12px;
            margin-bottom: 20px;
          }

          .chart-card {
            padding: 12px;
          }

          .quizzes-grid,
          .attempts-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .quiz-card,
          .attempt-card {
            padding: 12px;
          }

          .section {
            margin-bottom: 24px;
          }
        }

        @media (max-width: 480px) {
          .dashboard {
            padding: 8px;
          }

          .dashboard-header {
            padding: 12px;
          }

          .header-stats {
            flex-direction: column;
            gap: 8px;
          }

          .chart-card,
          .quiz-card,
          .attempt-card {
            padding: 10px;
          }

          .quiz-header h3 {
            font-size: 14px;
          }

          .attempt-header h4 {
            font-size: 13px;
          }
        }
           `}</style>
    </div>
  );
};

export default Dashboard;