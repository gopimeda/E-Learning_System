import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Star,
  Award,
  Activity,
  Calendar
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';

const AnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalUsers: 0,
      totalCourses: 0,
      totalEnrollments: 0,
      totalRevenue: 0,
      activeUsers: 0,
      publishedCourses: 0
    },
    analytics: {
      userRoleDistribution: [],
      courseStatusDistribution: [],
      revenueByMonth: [],
      enrollmentTrends: [],
      topCourses: [],
      instructorPerformance: []
    },
    loading: true
  });

  const API_BASE_URL = 'http://localhost:5555/api';

  // Get token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('userToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch and process analytics data
  const fetchAnalyticsData = async () => {
    try {
      const [usersRes, coursesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users?limit=1000`, {
          headers: getAuthHeaders()
        }),
        fetch(`${API_BASE_URL}/courses?limit=1000`, {
          headers: getAuthHeaders()
        })
      ]);

      const usersData = await usersRes.json();
      const coursesData = await coursesRes.json();

      if (usersData.success && coursesData.success) {
        const users = usersData.data.users;
        const courses = coursesData.data.courses;

        // Calculate basic stats
        const totalUsers = usersData.data.pagination.totalUsers;
        const activeUsers = users.filter(user => user.isActive).length;
        const totalCourses = coursesData.data.pagination.totalCourses;
        const publishedCourses = courses.filter(course => course.isPublished).length;
        
        const totalEnrollments = courses.reduce((sum, course) => sum + (course.totalEnrollments || 0), 0);
        const totalRevenue = courses.reduce((sum, course) => {
          const price = course.discountPrice || course.price || 0;
          return sum + (price * (course.totalEnrollments || 0));
        }, 0);

        // Process user role distribution
        const roleDistribution = users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});

        const userRoleDistribution = Object.entries(roleDistribution).map(([role, count]) => ({
          name: role.charAt(0).toUpperCase() + role.slice(1),
          value: count,
          percentage: ((count / totalUsers) * 100).toFixed(1)
        }));

        // Process course status distribution
        const statusDistribution = courses.reduce((acc, course) => {
          const status = course.isPublished ? 'Published' : 'Draft';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        const courseStatusDistribution = Object.entries(statusDistribution).map(([status, count]) => ({
          name: status,
          value: count,
          percentage: ((count / totalCourses) * 100).toFixed(1)
        }));

        // Generate mock monthly data (since we don't have historical data)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const revenueByMonth = months.map((month, index) => ({
          month,
          revenue: Math.floor(totalRevenue * (0.1 + Math.random() * 0.2)),
          enrollments: Math.floor(totalEnrollments * (0.1 + Math.random() * 0.2))
        }));

        const enrollmentTrends = months.map((month, index) => ({
          month,
          enrollments: Math.floor(totalEnrollments * (0.1 + Math.random() * 0.3)),
          users: Math.floor(totalUsers * (0.1 + Math.random() * 0.2))
        }));

        // Get top courses by enrollments
        const topCourses = courses
          .filter(course => course.totalEnrollments > 0)
          .sort((a, b) => (b.totalEnrollments || 0) - (a.totalEnrollments || 0))
          .slice(0, 5)
          .map(course => ({
            name: course.title.length > 30 ? course.title.substring(0, 30) + '...' : course.title,
            enrollments: course.totalEnrollments || 0,
            revenue: (course.discountPrice || course.price || 0) * (course.totalEnrollments || 0),
            rating: course.averageRating || 0
          }));

        // Get instructor performance data
        const instructorStats = courses.reduce((acc, course) => {
          if (course.instructor) {
            const instructorId = course.instructor._id || course.instructor.id;
            const instructorName = `${course.instructor.firstName} ${course.instructor.lastName}`;
            
            if (!acc[instructorId]) {
              acc[instructorId] = {
                name: instructorName,
                courses: 0,
                totalEnrollments: 0,
                totalRevenue: 0,
                avgRating: 0,
                ratings: []
              };
            }
            
            acc[instructorId].courses += 1;
            acc[instructorId].totalEnrollments += course.totalEnrollments || 0;
            acc[instructorId].totalRevenue += (course.discountPrice || course.price || 0) * (course.totalEnrollments || 0);
            
            if (course.averageRating) {
              acc[instructorId].ratings.push(course.averageRating);
            }
          }
          return acc;
        }, {});

        const instructorPerformance = Object.values(instructorStats)
          .map(instructor => ({
            ...instructor,
            avgRating: instructor.ratings.length > 0 
              ? (instructor.ratings.reduce((sum, rating) => sum + rating, 0) / instructor.ratings.length).toFixed(1)
              : 0
          }))
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5);

        setDashboardData({
          stats: {
            totalUsers,
            totalCourses,
            totalEnrollments,
            totalRevenue,
            activeUsers,
            publishedCourses
          },
          analytics: {
            userRoleDistribution,
            courseStatusDistribution,
            revenueByMonth,
            enrollmentTrends,
            topCourses,
            instructorPerformance
          },
          loading: false
        });
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, trendValue, color = 'blue' }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <h3>{value}</h3>
        <p>{title}</p>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
      {trend && (
        <div className={`stat-trend ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
          {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  if (dashboardData.loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Comprehensive insights into your learning platform</p>
        </div>
        <div className="header-actions">
          <button className="export-btn">Export Report</button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <StatCard
          icon={Users}
          title="Total Users"
          value={dashboardData.stats.totalUsers.toLocaleString()}
          subtitle={`${dashboardData.stats.activeUsers} active`}
          color="blue"
          trend="up"
          trendValue="12%"
        />
        <StatCard
          icon={BookOpen}
          title="Total Courses"
          value={dashboardData.stats.totalCourses.toLocaleString()}
          subtitle={`${dashboardData.stats.publishedCourses} published`}
          color="green"
          trend="up"
          trendValue="8%"
        />
        <StatCard
          icon={GraduationCap}
          title="Enrollments"
          value={dashboardData.stats.totalEnrollments.toLocaleString()}
          color="purple"
          trend="up"
          trendValue="24%"
        />
        <StatCard
          icon={DollarSign}
          title="Revenue"
          value={formatCurrency(dashboardData.stats.totalRevenue)}
          color="orange"
          trend="up"
          trendValue="18%"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Top Row - Revenue & User Distribution */}
        <div className="charts-row">
          <div className="chart-card revenue-chart">
            <div className="chart-header">
              <h3>Revenue Trend</h3>
              <div className="chart-period">
                <span className="period-active">6M</span>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={dashboardData.analytics.revenueByMonth}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card user-distribution">
            <div className="chart-header">
              <h3>User Distribution</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={dashboardData.analytics.userRoleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dashboardData.analytics.userRoleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {dashboardData.analytics.userRoleDistribution.map((entry, index) => (
                  <div key={entry.name} className="legend-item">
                    <div 
                      className="legend-color" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span>{entry.name}: {entry.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Enrollment Trends & Top Courses */}
        <div className="charts-row">
          <div className="chart-card enrollment-chart">
            <div className="chart-header">
              <h3>Enrollment & User Growth</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={dashboardData.analytics.enrollmentTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="enrollments" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    name="Enrollments"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#F59E0B" 
                    strokeWidth={3}
                    name="New Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card courses-chart">
            <div className="chart-header">
              <h3>Top Performing Courses</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dashboardData.analytics.topCourses} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" />
                  <YAxis dataKey="name" type="category" stroke="#6B7280" width={50} />
                  <Tooltip />
                  <Bar dataKey="enrollments" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Compact Layout */}
      <div className="bottom-section">
        {/* Top Instructors */}
        <div className="instructors-card">
          <div className="section-header">
            <h3>Top Instructors</h3>
            <span className="view-all">View All</span>
          </div>
          <div className="instructors-grid">
            {dashboardData.analytics.instructorPerformance.slice(0, 6).map((instructor, index) => (
              <div key={instructor.name} className="instructor-item">
                <div className="instructor-rank">#{index + 1}</div>
                <div className="instructor-detail">
                  <h4>{instructor.name}</h4>
                  <div className="instructor-metrics">
                    <span className="metric">
                      <GraduationCap size={12} />
                      {instructor.totalEnrollments}
                    </span>
                    <span className="metric">
                      <DollarSign size={12} />
                      {formatCurrency(instructor.totalRevenue)}
                    </span>
                    <span className="metric">
                      <Star size={12} />
                      {instructor.avgRating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Course Status & Quick Stats */}
        <div className="status-section">
          <div className="section-header">
            <h3>Course Status</h3>
          </div>
          <div className="status-overview">
            {dashboardData.analytics.courseStatusDistribution.map((status, index) => (
              <div key={status.name} className="status-item">
                <div className="status-indicator" style={{ backgroundColor: COLORS[index] }}>
                  <BookOpen size={16} />
                </div>
                <div className="status-details">
                  <div className="status-number">{status.value}</div>
                  <div className="status-label">{status.name}</div>
                  <div className="status-percentage">{status.percentage}%</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Insights */}
          <div className="quick-insights">
            <div className="insight-item">
              <div className="insight-icon green">
                <TrendingUp size={14} />
              </div>
              <div className="insight-text">
                <span>Revenue Growth</span>
                <strong>+18% this month</strong>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon blue">
                <Activity size={14} />
              </div>
              <div className="insight-text">
                <span>Active Learning</span>
                <strong>{dashboardData.stats.activeUsers} users online</strong>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon purple">
                <Award size={14} />
              </div>
              <div className="insight-text">
                <span>Top Performance</span>
                <strong>4.8★ avg rating</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          padding: 12px;
          background: #F9FAFB;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .dashboard-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .dashboard-header p {
          color: #6B7280;
          margin: 4px 0 0 0;
          font-size: 16px;
        }

        .export-btn {
          background: #3B82F6;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-btn:hover {
          background: #2563EB;
          transform: translateY(-1px);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-card {
          background: white;
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stat-card.blue { border-left: 2px solid #3B82F6; }
        .stat-card.green { border-left: 2px solid #10B981; }
        .stat-card.purple { border-left: 2px solid #8B5CF6; }
        .stat-card.orange { border-left: 2px solid #F59E0B; }

        .stat-icon {
          padding: 6px;
          border-radius: 6px;
          background: #F3F4F6;
          color: #374151;
        }

        .stat-content h3 {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .stat-content p {
          color: #6B7280;
          margin: 4px 0 0 0;
          font-weight: 500;
        }

        .stat-subtitle {
          font-size: 12px;
          color: #9CA3AF;
        }

        .stat-trend {
          position: absolute;
          top: 6px;
          right: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .trend-up { color: #10B981; }
        .trend-down { color: #EF4444; }

        .charts-section {
          margin-bottom: 16px;
        }

        .charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .charts-row:last-child {
          margin-bottom: 0;
        }

        .chart-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .chart-header {
          padding: 10px 12px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chart-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .chart-period {
          display: flex;
          gap: 8px;
        }

        .period-active {
          background: #EBF8FF;
          color: #3B82F6;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .chart-container {
          padding: 10px 12px 12px;
        }

        .pie-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .legend-color {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }

        .bottom-section {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 12px;
        }

        .instructors-card, .status-section {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 12px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .section-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .view-all {
          color: #3B82F6;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .instructors-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .instructor-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          background: #F9FAFB;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .instructor-item:hover {
          background: #F3F4F6;
          transform: translateY(-1px);
        }

        .instructor-rank {
          font-size: 14px;
          font-weight: 700;
          color: #6B7280;
          min-width: 20px;
        }

        .instructor-detail h4 {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 2px 0;
        }

        .instructor-metrics {
          display: flex;
          gap: 4px;
        }

        .metric {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          color: #6B7280;
          background: white;
          padding: 1px 3px;
          border-radius: 3px;
        }

        .status-overview {
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: #F9FAFB;
          border-radius: 6px;
        }

        .status-indicator {
          padding: 6px;
          border-radius: 6px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-details {
          flex: 1;
        }

        .status-number {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .status-label {
          font-size: 14px;
          color: #6B7280;
          margin: 4px 0 2px 0;
        }

        .status-percentage {
          font-size: 12px;
          color: #9CA3AF;
        }

        .quick-insights {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .insight-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          background: #F9FAFB;
          border-radius: 6px;
        }

        .insight-icon {
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .insight-icon.green { background: #DCFCE7; color: #16A34A; }
        .insight-icon.blue { background: #DBEAFE; color: #2563EB; }
        .insight-icon.purple { background: #EDE9FE; color: #7C3AED; }

        .insight-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .insight-text span {
          font-size: 12px;
          color: #6B7280;
        }

        .insight-text strong {
          font-size: 14px;
          color: #111827;
          font-weight: 600;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          gap: 8px;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #E5E7EB;
          border-top: 2px solid #3B82F6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 1200px) {
          .charts-row {
            grid-template-columns: 1fr;
          }
          
          .bottom-section {
            grid-template-columns: 1fr;
          }
          
          .instructors-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 8px;
          }
          
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          
          .dashboard-header {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
          
          .instructors-card, .status-section {
            padding: 8px;
          }
          
          .chart-container {
            padding: 8px;
          }
        }

        @media (max-width: 640px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          
          .stat-card {
            padding: 8px;
          }
          
          .insight-item {
            padding: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsDashboard;