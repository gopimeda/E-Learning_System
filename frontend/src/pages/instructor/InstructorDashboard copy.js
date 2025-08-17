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
import './InstructorDashboard.css';

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
    <div className="stat-card compact">
      <div className="stat-card-content">
        <div className="stat-card-info">
          <p className="stat-title">{title}</p>
          <p className="stat-value compact">{value}</p>
          {change && (
            <div className={`stat-change ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'trend-neutral'}`}>
              {trend === 'up' ? <TrendingUp className="trend-icon small" /> : 
               trend === 'down' ? <TrendingDown className="trend-icon small" /> : null}
              {change}
            </div>
          )}
        </div>
        <div className={`stat-icon-container ${color} compact`}>
          <Icon className="stat-icon small" />
        </div>
      </div>
    </div>
  );

  const CourseCard = ({ course }) => (
    <div className="course-card compact">
      <div className="course-card-header">
        <h3 className="course-title small">{course.title}</h3>
        <button className="more-button">
          <MoreVertical className="more-icon small" />
        </button>
      </div>
      
      <div className="course-stats">
        <div className="course-stat">
          <p className="course-stat-label small">Students</p>
          <p className="course-stat-value small">{course.totalEnrollments}</p>
        </div>
        <div className="course-stat">
          <p className="course-stat-label small">Revenue</p>
          <p className="course-stat-value small">{formatCurrency(course.revenue)}</p>
        </div>
      </div>
      
      <div className="course-footer">
        <div className="course-rating">
          <Star className="star-icon small" />
          <span className="rating-text small">{course.averageRating?.toFixed(1) || 'N/A'}</span>
        </div>
        <div className="course-completion">
          <p className="completion-label small">Completion</p>
          <p className="completion-value small">{course.completionRate}%</p>
        </div>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
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
    <div className="dashboard compact">
      {/* Header */}
      <div className="dashboard-header compact">
        <div className="header-content">
          <div className="header-info">
            <h1 className="dashboard-title">Instructor Dashboard</h1>
            <p className="dashboard-subtitle">Complete overview of your course performance and student engagement</p>
          </div>
          
          <div className="header-controls">
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="timeframe-select"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
            
            <button className="export-button">
              <Download className="export-icon" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content compact">
        {/* Key Metrics Grid - 4 columns */}
        <div className="metrics-grid four-columns">
          <StatCard
            title="Total Courses"
            value={overview.totalCourses}
            change={`${overview.publishedCourses} published`}
            icon={BookOpen}
            color="blue"
          />
          <StatCard
            title="Total Students"
            value={formatNumber(overview.totalStudents)}
            change={`${overview.completionRate}% completion rate`}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(overview.totalRevenue)}
            change={`${formatCurrency(overview.avgPrice)} avg price`}
            icon={DollarSign}
            color="yellow"
          />
          <StatCard
            title="Average Rating"
            value={overview.avgRating?.toFixed(1) || 'N/A'}
            change="Across all courses"
            icon={Star}
            color="purple"
          />
        </div>

        {/* Student Statistics Grid - 4 columns */}
        <div className="metrics-grid four-columns">
          <StatCard
            title="Active Students"
            value={studentStats.activeStudents || 0}
            icon={PlayCircle}
            color="green"
          />
          <StatCard
            title="Completed"
            value={studentStats.completedStudents || 0}
            icon={CheckCircle}
            color="purple"
          />
          <StatCard
            title="Completion Rate"
            value={`${studentStats.completionRate || 0}%`}
            icon={Target}
            color="blue"
          />
          <StatCard
            title="Daily Average"
            value={Math.round((dailyEnrollments.reduce((acc, day) => acc + (day.newStudents || 0), 0)) / Math.max(dailyEnrollments.length, 1))}
            change="new enrollments"
            icon={TrendingUp}
            color="yellow"
          />
        </div>

        {/* Charts Row 1 - 3 columns */}
        <div className="charts-grid three-columns">
          {/* Enrollment Trends */}
          <div className="chart-container thin">
            <h3 className="chart-title small">Enrollment Trends</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={enrollmentTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(label) => `Date: ${label}`}
                  formatter={(value, name) => [value, name === 'enrollments' ? 'Enrollments' : 'Revenue']}
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

          {/* Revenue Trends */}
          <div className="chart-container thin">
            <h3 className="chart-title small">Revenue Trends</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={revenueTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
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

          {/* Student Progress Distribution */}
          <div className="chart-container thin">
            <h3 className="chart-title small">Progress Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={progressDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ range, count }) => `${range}: ${count}`}
                >
                  {progressDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 - 2 columns */}
        <div className="charts-grid two-columns">
          {/* Course Performance */}
          <div className="chart-container medium">
            <h3 className="chart-title small">Course Performance</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCourses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="title" 
                  tick={{ fontSize: 9 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 10 }} />
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

          {/* Daily Enrollments */}
          <div className="chart-container medium">
            <h3 className="chart-title small">Daily Enrollments</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyEnrollments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(label) => `Date: ${label}`}
                  formatter={(value, name) => [
                    name === 'newStudents' ? value : formatCurrency(value),
                    name === 'newStudents' ? 'New Students' : 'Revenue'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="newStudents" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Section - Course Cards and Activity */}
        <div className="bottom-section">
          {/* Course Cards Grid */}
          <div className="courses-section">
            <h3 className="section-title">Top Performing Courses</h3>
            <div className="courses-grid compact">
              {coursePerformance.slice(0, 6).map((course, index) => (
                <CourseCard key={course._id || index} course={course} />
              ))}
            </div>
          </div>

          {/* Side Panel - Recent Activity and Insights */}
          <div className="side-panel">
            {/* Recent Activity */}
            <div className="activity-section">
              <h3 className="section-title small">Recent Activity</h3>
              <div className="activity-list compact">
                {recentActivity.length > 0 ? recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="activity-item compact">
                    <div className="activity-icon">
                      <Users className="user-icon small" />
                    </div>
                    <div className="activity-info">
                      <p className="activity-student small">{activity.studentName}</p>
                      <p className="activity-course small">Enrolled in {activity.courseName}</p>
                    </div>
                    <div className="activity-date small">
                      {new Date(activity.enrollmentDate).toLocaleDateString()}
                    </div>
                  </div>
                )) : (
                  <p className="no-activity">No recent activity</p>
                )}
              </div>
            </div>

            {/* Key Insights */}
            <div className="insights-section">
              <h3 className="section-title small">Key Insights</h3>
              <div className="insights-list compact">
                <div className="insight-item">
                  <TrendingUp className="insight-icon green small" />
                  <div className="insight-content">
                    <p className="insight-title small">Top Performing Course</p>
                    <p className="insight-text small">
                      {topCourses[0]?.title || 'No data available'} with {topCourses[0]?.enrollments || 0} students
                    </p>
                  </div>
                </div>
                
                <div className="insight-item">
                  <DollarSign className="insight-icon yellow small" />
                  <div className="insight-content">
                    <p className="insight-title small">Revenue Leader</p>
                    <p className="insight-text small">
                      Generated {formatCurrency(overview.totalRevenue)} total revenue
                    </p>
                  </div>
                </div>
                
                <div className="insight-item">
                  <Star className="insight-icon purple small" />
                  <div className="insight-content">
                    <p className="insight-title small">Student Satisfaction</p>
                    <p className="insight-text small">
                      Average rating of {overview.avgRating?.toFixed(1) || 'N/A'} stars
                    </p>
                  </div>
                </div>
                
                <div className="insight-item">
                  <Target className="insight-icon blue small" />
                  <div className="insight-content">
                    <p className="insight-title small">Completion Rate</p>
                    <p className="insight-text small">
                      {overview.completionRate}% average completion rate
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;