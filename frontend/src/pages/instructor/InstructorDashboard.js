import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  BookOpen, Users, DollarSign, Star, TrendingUp, TrendingDown, 
  Calendar, Clock, Award, Eye, MoreVertical, Download, Filter,
  Target, PlayCircle, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';

const InstructorDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [coursePerformance, setCoursePerformance] = useState([]);
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('90d');

  const API_BASE_URL = 'http://localhost:5555/api/courses';
  const token = localStorage.getItem('userToken');

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    fetchAllData();
  }, [selectedTimeframe]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAnalytics(),
        fetchStudentAnalytics()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/instructor/dashboard-analytics?timeframe=${selectedTimeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
        setCoursePerformance(data.data.coursePerformance);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchStudentAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/instructor/student-analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setStudentAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching student analytics:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue', trend }) => (
    <div className="stat-card-mini">
      <div className="stat-card-content-mini">
        <div className="stat-card-info-mini">
          <p className="stat-title-mini">{title}</p>
          <p className="stat-value-mini">{value}</p>
          {change && (
            <div className={`stat-change-mini ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'trend-neutral'}`}>
              {trend === 'up' ? <TrendingUp className="trend-icon-mini" /> : 
               trend === 'down' ? <TrendingDown className="trend-icon-mini" /> : null}
              {change}
            </div>
          )}
        </div>
        <div className={`stat-icon-container-mini ${color}`}>
          <Icon className="stat-icon-mini" />
        </div>
      </div>
    </div>
  );

  const CourseCard = ({ course }) => (
    <div className="course-card-mini">
      <div className="course-card-header-mini">
        <h3 className="course-title-mini">{course.title}</h3>
        <button className="more-button-mini">
          <MoreVertical className="more-icon-mini" />
        </button>
      </div>
      
      <div className="course-stats-mini">
        <div className="course-stat-mini">
          <p className="course-stat-label-mini">Students</p>
          <p className="course-stat-value-mini">{course.totalEnrollments}</p>
        </div>
        <div className="course-stat-mini">
          <p className="course-stat-label-mini">Revenue</p>
          <p className="course-stat-value-mini">{formatCurrency(course.revenue)}</p>
        </div>
      </div>
      
      <div className="course-footer-mini">
        <div className="course-rating-mini">
          <Star className="star-icon-mini" />
          <span className="rating-text-mini">{course.averageRating?.toFixed(1) || 'N/A'}</span>
        </div>
        <div className="course-completion-mini">
          <p className="completion-value-mini">{course.completionRate}%</p>
        </div>
      </div>
      
      <div className="progress-bar-container-mini">
        <div 
          className="progress-bar-mini" 
          style={{ width: `${course.completionRate}%` }}
        ></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <RefreshCw className="loading-spinner" />
          <span className="loading-text">Loading analytics...</span>
        </div>
      </div>
    );
  }

  const overview = analytics?.overview || {};
  const enrollmentTrends = analytics?.enrollmentTrends || [];
  const revenueTrends = analytics?.revenueTrends || [];
  const topCourses = analytics?.topCourses || [];
  const recentActivity = analytics?.recentActivity || [];
  const progressDistribution = analytics?.progressDistribution || [];
  const studentStats = studentAnalytics?.studentStats || {};
  const dailyEnrollments = studentAnalytics?.dailyEnrollments || [];

  return (
    <div className="dashboard-mini">
      {/* Header */}
      <div className="dashboard-header-mini">
        <div className="header-content-mini">
          <div className="header-info-mini">
            <h1 className="dashboard-title-mini">Instructor Dashboard</h1>
            <p className="dashboard-subtitle-mini">Course performance and student engagement overview</p>
          </div>
          
          <div className="header-controls-mini">
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="timeframe-select-mini"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
            
            <button className="export-button-mini">
              <Download className="export-icon-mini" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content-mini">
        {/* Key Metrics Grid - 6 columns for thinner cards */}
        <div className="metrics-grid-mini">
          <StatCard
            title="Courses"
            value={overview.totalCourses}
            change={`${overview.publishedCourses} live`}
            icon={BookOpen}
            color="blue"
          />
          <StatCard
            title="Students"
            value={formatNumber(overview.totalStudents)}
            change={`${overview.completionRate}% complete`}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(overview.totalRevenue)}
            change={`${formatCurrency(overview.avgPrice)} avg`}
            icon={DollarSign}
            color="yellow"
          />
          <StatCard
            title="Rating"
            value={overview.avgRating?.toFixed(1) || 'N/A'}
            change="Average"
            icon={Star}
            color="purple"
          />
          <StatCard
            title="Active"
            value={formatNumber(studentStats.activeStudents || 0)}
            change="Learning"
            icon={PlayCircle}
            color="green"
          />
          <StatCard
            title="Completed"
            value={formatNumber(studentStats.completedStudents || 0)}
            change="Finished"
            icon={CheckCircle}
            color="purple"
          />
        </div>

        {/* Main Content Grid */}
        <div className="main-content-grid">
          {/* Charts Section */}
          <div className="charts-section">
            {/* Enrollment vs Revenue - Side by Side */}
            <div className="enrollment-revenue-grid">
              <div className="chart-container-mini">
                <h3 className="chart-title-mini">Enrollment Trends</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={enrollmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip 
                      labelFormatter={(label) => `Date: ${label}`}
                      formatter={(value) => [value, 'Enrollments']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="enrollments" 
                      stroke="#3B82F6" 
                      fill="#3B82F6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container-mini">
                <h3 className="chart-title-mini">Revenue Trends</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Revenue']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Course Performance Chart */}
            <div className="chart-container-mini performance-chart">
              <h3 className="chart-title-mini">Course Performance</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topCourses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="title" 
                    tick={{ fontSize: 8 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'enrollments' ? value : formatCurrency(value),
                      name === 'enrollments' ? 'Students' : 'Revenue'
                    ]}
                  />
                  <Bar dataKey="enrollments" fill="#3B82F6" name="enrollments" />
                  <Bar dataKey="rating" fill="#10B981" name="rating" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Course Cards */}
            <div className="courses-section-mini">
              <h3 className="section-title-mini">Top Courses</h3>
              <div className="courses-grid-mini">
                {coursePerformance.slice(0, 4).map((course, index) => (
                  <CourseCard key={course._id || index} course={course} />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Progress Distribution & Key Insights */}
          <div className="sidebar-section">
            {/* Progress Distribution */}
            <div className="chart-container-mini">
              <h3 className="chart-title-mini">Progress Distribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={progressDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ range, count }) => `${range}`}
                  >
                    {progressDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Students']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Activity */}
            <div className="activity-section-mini">
              <h3 className="section-title-mini">Recent Activity</h3>
              <div className="activity-list-mini">
                {recentActivity.length > 0 ? recentActivity.slice(0, 4).map((activity, index) => (
                  <div key={index} className="activity-item-mini">
                    <div className="activity-icon-mini">
                      <Users className="user-icon-mini" />
                    </div>
                    <div className="activity-info-mini">
                      <p className="activity-student-mini">{activity.studentName}</p>
                      <p className="activity-course-mini">Enrolled in {activity.courseName}</p>
                    </div>
                    <div className="activity-date-mini">
                      {new Date(activity.enrollmentDate).toLocaleDateString()}
                    </div>
                  </div>
                )) : (
                  <p className="no-activity">No recent activity</p>
                )}
              </div>
            </div>

            {/* Key Insights */}
            <div className="insights-section-mini">
              <h3 className="section-title-mini">Key Insights</h3>
              <div className="insights-list-mini">
                <div className="insight-item-mini">
                  <TrendingUp className="insight-icon-mini green" />
                  <div className="insight-content-mini">
                    <p className="insight-title-mini">Top Course</p>
                    <p className="insight-text-mini">
                      {topCourses[0]?.title || 'N/A'} with {topCourses[0]?.enrollments || 0} students
                    </p>
                  </div>
                </div>
                
                <div className="insight-item-mini">
                  <DollarSign className="insight-icon-mini yellow" />
                  <div className="insight-content-mini">
                    <p className="insight-title-mini">Revenue Leader</p>
                    <p className="insight-text-mini">
                      Generated {formatCurrency(overview.totalRevenue)} total revenue
                    </p>
                  </div>
                </div>
                
                <div className="insight-item-mini">
                  <Star className="insight-icon-mini purple" />
                  <div className="insight-content-mini">
                    <p className="insight-title-mini">Student Satisfaction</p>
                    <p className="insight-text-mini">
                      Average rating of {overview.avgRating?.toFixed(1) || 'N/A'} stars
                    </p>
                  </div>
                </div>
                
                <div className="insight-item-mini">
                  <Target className="insight-icon-mini blue" />
                  <div className="insight-content-mini">
                    <p className="insight-title-mini">Completion Rate</p>
                    <p className="insight-text-mini">
                      {overview.completionRate}% average completion rate
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-mini {
          padding: 0.5rem;
          background: #f8fafc;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dashboard-header-mini {
          background: white;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-content-mini {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .dashboard-title-mini {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .dashboard-subtitle-mini {
          color: #6b7280;
          font-size: 0.8rem;
          margin: 0;
        }

        .header-controls-mini {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .timeframe-select-mini {
          padding: 0.4rem 0.6rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          font-size: 0.8rem;
          color: #374151;
          min-width: 120px;
        }

        .export-button-mini {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .export-button-mini:hover {
          background: #2563eb;
        }

        .export-icon-mini {
          width: 14px;
          height: 14px;
        }

        .dashboard-content-mini {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        /* Ultra-compact stat cards */
        .metrics-grid-mini {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.5rem;
        }

        .stat-card-mini {
          background: white;
          border-radius: 6px;
          padding: 0.6rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          transition: transform 0.2s, box-shadow 0.2s;
          min-height: 60px;
        }

        .stat-card-mini:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stat-card-content-mini {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 100%;
        }

        .stat-card-info-mini {
          flex: 1;
          min-width: 0;
        }

        .stat-title-mini {
          font-size: 0.65rem;
          font-weight: 500;
          color: #6b7280;
          margin: 0 0 0.2rem 0;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .stat-value-mini {
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.2rem 0;
          line-height: 1.1;
        }

        .stat-change-mini {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          font-size: 0.6rem;
          font-weight: 500;
        }

        .stat-change-mini.trend-up { color: #10b981; }
        .stat-change-mini.trend-down { color: #ef4444; }
        .stat-change-mini.trend-neutral { color: #6b7280; }

        .trend-icon-mini {
          width: 10px;
          height: 10px;
        }

        .stat-icon-container-mini {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .stat-icon-container-mini.blue { background: #dbeafe; }
        .stat-icon-container-mini.green { background: #d1fae5; }
        .stat-icon-container-mini.yellow { background: #fef3c7; }
        .stat-icon-container-mini.purple { background: #e9d5ff; }

        .stat-icon-mini {
          width: 16px;
          height: 16px;
        }

        .stat-icon-container-mini.blue .stat-icon-mini { color: #3b82f6; }
        .stat-icon-container-mini.green .stat-icon-mini { color: #10b981; }
        .stat-icon-container-mini.yellow .stat-icon-mini { color: #f59e0b; }
        .stat-icon-container-mini.purple .stat-icon-mini { color: #8b5cf6; }

        /* Main content layout */
        .main-content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 0.75rem;
          align-items: start;
        }

        .charts-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .enrollment-revenue-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .chart-container-mini {
          background: white;
          border-radius: 6px;
          padding: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .performance-chart {
          margin-top: 0;
        }

        .chart-title-mini {
          font-size: 0.8rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .section-title-mini {
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        /* Course cards */
        .courses-section-mini {
          background: white;
          border-radius: 6px;
          padding: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .courses-grid-mini {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }

        .course-card-mini {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 0.6rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .course-card-mini:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          background: white;
        }

        .course-card-header-mini {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .course-title-mini {
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .more-button-mini {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.2rem;
          border-radius: 4px;
          color: #9ca3af;
        }

        .more-button-mini:hover { background: #e5e7eb; }

        .more-icon-mini {
          width: 12px;
          height: 12px;
        }

        .course-stats-mini {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.4rem;
          margin-bottom: 0.5rem;
        }

        .course-stat-label-mini {
          font-size: 0.65rem;
          color: #6b7280;
          margin: 0;
          text-transform: uppercase;
        }

        .course-stat-value-mini {
          font-size: 0.8rem;
          font-weight: 600;
          color: #111827;
          margin: 0.1rem 0 0 0;
        }

        .course-footer-mini {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .course-rating-mini {
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }

        .star-icon-mini {
          width: 10px;
          height: 10px;
          color: #f59e0b;
        }

        .rating-text-mini {
          font-size: 0.7rem;
          font-weight: 500;
          color: #374151;
        }

        .completion-value-mini {
          font-size: 0.7rem;
          font-weight: 600;
          color: #111827;
        }

        .progress-bar-container-mini {
          width: 100%;
          height: 2px;
          background: #e5e7eb;
          border-radius: 1px;
          overflow: hidden;
        }

        .progress-bar-mini {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          border-radius: 1px;
          transition: width 0.3s ease;
        }

        /* Sidebar */
        .sidebar-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-section-mini {
          background: white;
          border-radius: 6px;
          padding: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .activity-list-mini {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .activity-item-mini {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .activity-item-mini:last-child {
          border-bottom: none;
        }

        .activity-icon-mini {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #f3f4f6;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .user-icon-mini {
          width: 12px;
          height: 12px;
          color: #6b7280;
        }

        .activity-info-mini {
          flex: 1;
          min-width: 0;
        }

        .activity-student-mini {
          font-size: 0.7rem;
          font-weight: 500;
          color: #374151;
          margin: 0;
        }

        .activity-course-mini {
          font-size: 0.65rem;
          color: #6b7280;
          margin: 0.1rem 0 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activity-date-mini {
          font-size: 0.65rem;
          color: #9ca3af;
          flex-shrink: 0;
        }

        .no-activity {
          font-size: 0.8rem;
          color: #9ca3af;
          text-align: center;
          padding: 1rem;
        }

      

        /* Insights */
        .insights-section-mini {
          background: white;
          border-radius: 6px;
          padding: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .insights-list-mini {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .insight-item-mini {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .insight-icon-mini {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .insight-icon-mini.green { color: #10b981; }
        .insight-icon-mini.yellow { color: #f59e0b; }
        .insight-icon-mini.purple { color: #8b5cf6; }
        .insight-icon-mini.blue { color: #3b82f6; }

        .insight-content-mini {
          flex: 1;
        }

        .insight-title-mini {
          font-size: 0.7rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.2rem 0;
        }

        .insight-text-mini {
          font-size: 0.65rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.3;
        }

        /* Loading */
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 50vh;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          color: #3b82f6;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          font-size: 0.875rem;
          color: #6b7280;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 1400px) {
          .metrics-grid-mini {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .stat-card-mini {
            min-height: 65px;
          }
        }

        @media (max-width: 1200px) {
          .main-content-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .sidebar-section {
            grid-template-columns: repeat(3, 1fr);
            display: grid;
            gap: 0.75rem;
          }
          
          .enrollment-revenue-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
        }

        @media (max-width: 768px) {
          .metrics-grid-mini {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.4rem;
          }
          
          .stat-card-mini {
            padding: 0.5rem;
            min-height: 55px;
          }
          
          .stat-value-mini {
            font-size: 1rem;
          }
          
          .courses-grid-mini {
            grid-template-columns: 1fr;
          }
          
          .sidebar-section {
            grid-template-columns: 1fr;
            display: flex;
            flex-direction: column;
          }
          
          .header-content-mini {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .header-controls-mini {
            width: 100%;
            justify-content: flex-start;
          }
        }

        @media (max-width: 480px) {
          .dashboard-mini {
            padding: 0.25rem;
          }
          
          .metrics-grid-mini {
            grid-template-columns: 1fr;
          }
          
          .dashboard-header-mini {
            padding: 0.75rem;
          }
          
          .dashboard-title-mini {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default InstructorDashboard;