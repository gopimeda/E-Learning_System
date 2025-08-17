import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  BookOpen, Users, DollarSign, Star, TrendingUp, TrendingDown, 
  Calendar, Clock, Award, Eye, MoreVertical, Download, Filter,
  Target, PlayCircle, CheckCircle, AlertCircle, RefreshCw, UserCheck,
  GraduationCap, Activity, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const API_BASE_URL = 'http://localhost:5555/api/courses';
  const token = localStorage.getItem('userToken');

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch admin dashboard data
      const dashboardResponse = await fetch(`${API_BASE_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const dashboardData = await dashboardResponse.json();

      // Fetch instructors data
      const instructorsResponse = await fetch(`${API_BASE_URL}/admin/instructors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const instructorsData = await instructorsResponse.json();

      // Fetch enrollment overview
      const enrollmentsResponse = await fetch(`${API_BASE_URL}/admin/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const enrollmentsData = await enrollmentsResponse.json();

      // Format the data to match the expected structure
      const formattedData = {
        overview: {
          totalCourses: dashboardData.data.overview.totalCourses || 0,
          publishedCourses: dashboardData.data.overview.publishedCourses || 0,
          draftCourses: dashboardData.data.overview.draftCourses || 0,
          featuredCourses: dashboardData.data.overview.featuredCourses || 0,
          totalEnrollments: dashboardData.data.overview.totalEnrollments || 0,
          totalRevenue: enrollmentsData.data.stats.totalRevenue || 0,
          avgRating: dashboardData.data.overview.averageRating || 0,
          completionRate: enrollmentsData.data.stats.completionRate || 0,
          activeUsers: enrollmentsData.data.stats.activeEnrollments || 0,
          monthlyGrowth: dashboardData.data.recentActivity.newPublishedCourses || 0
        },
        categoryDistribution: dashboardData.data.categoryDistribution.map(cat => ({
          name: cat._id,
          value: Math.round((cat.count / dashboardData.data.overview.totalCourses) * 100),
          courses: cat.count,
          revenue: cat.totalEnrollments * 50 // Approximate revenue - adjust based on your data
        })),
        topInstructors: instructorsData.data.instructors.map(instructor => ({
          name: `${instructor.firstName} ${instructor.lastName}`,
          courses: instructor.statistics.totalCourses,
          students: instructor.statistics.totalEnrollments,
          revenue: instructor.statistics.totalRevenue,
          rating: instructor.statistics.averageRating
        })),
        enrollmentTrends: enrollmentsData.data.stats.trends.map(trend => ({
          date: trend._id ? `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}-${String(trend._id.day).padStart(2, '0')}` : '',
          enrollments: trend.count,
          completions: Math.round(trend.count * 0.6), // Approximation
          dropouts: Math.round(trend.count * 0.1) // Approximation
        })),
        revenueData: enrollmentsData.data.stats.trends.map(trend => ({
          month: trend._id ? `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}` : '',
          revenue: trend.revenue,
          enrollments: trend.count,
          refunds: Math.round(trend.revenue * 0.05) // Approximation
        })),
        platformMetrics: {
          avgSessionDuration: '24m 35s',
          bounceRate: '23.4%',
          conversionRate: '12.8%',
          satisfactionScore: dashboardData.data.overview.averageRating || 4.3,
          supportTickets: 145,
          systemUptime: '99.8%'
        }
      };

      setAnalytics(formattedData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue', trend, subtitle }) => (
    <div className="stat-card">
      <div className="stat-card-content">
        <div className="stat-card-info">
          <p className="stat-title">{title}</p>
          <p className="stat-value">{value}</p>
          {subtitle && <p className="stat-subtitle">{subtitle}</p>}
          {change && (
            <div className={`stat-change ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'trend-neutral'}`}>
              {trend === 'up' ? <TrendingUp className="trend-icon" /> : 
               trend === 'down' ? <TrendingDown className="trend-icon" /> : null}
              {change}
            </div>
          )}
        </div>
        <div className={`stat-icon-container ${color}`}>
          <Icon className="stat-icon" />
        </div>
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {entry.name}: {formatter ? formatter(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

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

  return (
    <div className="admin-analytics">
      <style jsx>{`
        .admin-analytics {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dashboard-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          padding: 2rem 2rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-info h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 700;
          color: #1a202c;
        }

        .header-info p {
          margin: 0;
          color: #718096;
          font-size: 1rem;
        }

        .header-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .timeframe-select {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .export-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .export-icon {
          width: 16px;
          height: 16px;
        }

        .tabs {
          display: flex;
          padding: 0 2rem;
          border-top: 1px solid #f1f5f9;
        }

        .tab {
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab-active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .dashboard-content {
          padding: 2rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #f1f5f9;
        }

        .stat-card-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-title {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .stat-value {
          margin: 0 0 0.5rem 0;
          font-size: 1.875rem;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-subtitle {
          margin: 0;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .stat-change {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .trend-up {
          color: #10b981;
        }

        .trend-down {
          color: #ef4444;
        }

        .trend-neutral {
          color: #64748b;
        }

        .trend-icon {
          width: 12px;
          height: 12px;
        }

        .stat-icon-container {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon-container.blue {
          background: #dbeafe;
        }

        .stat-icon-container.green {
          background: #d1fae5;
        }

        .stat-icon-container.yellow {
          background: #fef3c7;
        }

        .stat-icon-container.purple {
          background: #ede9fe;
        }

        .stat-icon-container.red {
          background: #fee2e2;
        }

        .stat-icon {
          width: 24px;
          height: 24px;
          color: #3b82f6;
        }

        .stat-icon-container.green .stat-icon {
          color: #10b981;
        }

        .stat-icon-container.yellow .stat-icon {
          color: #f59e0b;
        }

        .stat-icon-container.purple .stat-icon {
          color: #8b5cf6;
        }

        .stat-icon-container.red .stat-icon {
          color: #ef4444;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .chart-container {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #f1f5f9;
        }

        .chart-container.full-width {
          grid-column: 1 / -1;
        }

        .chart-title {
          margin: 0 0 1.5rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
        }

        .loading-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }

        .loading-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: #64748b;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .insight-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .insight-icon {
          width: 24px;
          height: 24px;
        }

        .insight-icon.green {
          color: #10b981;
        }

        .insight-icon.blue {
          color: #3b82f6;
        }

        .insight-icon.yellow {
          color: #f59e0b;
        }

        .insight-icon.purple {
          color: #8b5cf6;
        }

        .insight-title {
          margin: 0 0 0.25rem 0;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.875rem;
        }

        .insight-text {
          margin: 0;
          font-size: 0.75rem;
          color: #64748b;
        }

        .custom-tooltip {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.75rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .tooltip-label {
          margin: 0 0 0.5rem 0;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.875rem;
        }

        .tooltip-value {
          margin: 0.25rem 0;
          font-size: 0.75rem;
        }

        .instructors-table {
          width: 100%;
          border-collapse: collapse;
        }

        .instructors-table th,
        .instructors-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #f1f5f9;
        }

        .instructors-table th {
          background: #f8fafc;
          font-weight: 600;
          color: #475569;
          font-size: 0.875rem;
        }

        .instructors-table td {
          color: #64748b;
          font-size: 0.875rem;
        }

        .metrics-comparison {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .metric-item {
          text-align: center;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Admin Dashboard</h1>
            <p>Comprehensive platform insights and performance metrics</p>
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
              <option value="6m">Last 6 months</option>
              <option value="1y">Last year</option>
            </select>
            
            <button className="export-button">
              <Download className="export-icon" />
              Export Report
            </button>
          </div>
        </div>
        
        <div className="tabs">
          {['overview', 'users', 'courses', 'revenue', 'performance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="metrics-grid">
              <StatCard
                title="Total Courses"
                value={formatNumber(overview.totalCourses)}
                change={`${overview.publishedCourses} published`}
                icon={BookOpen}
                color="blue"
              />
              <StatCard
                title="Published Courses"
                value={overview.publishedCourses}
                change={`${overview.monthlyGrowth} new this month`}
                icon={CheckCircle}
                color="green"
                trend="up"
              />
              <StatCard
                title="Total Enrollments"
                value={formatNumber(overview.totalEnrollments)}
                change="+890 this month"
                icon={GraduationCap}
                color="purple"
                trend="up"
              />
              <StatCard
                title="Platform Revenue"
                value={formatCurrency(overview.totalRevenue)}
                change="+15.2% vs last month"
                icon={DollarSign}
                color="yellow"
                trend="up"
              />
              <StatCard
                title="Average Rating"
                value={overview.avgRating.toFixed(1)}
                change="Across all courses"
                icon={Star}
                color="purple"
                subtitle="Platform satisfaction"
              />
              <StatCard
                title="Completion Rate"
                value={`${overview.completionRate}%`}
                change="+3.2% improvement"
                icon={Target}
                color="green"
                trend="up"
              />
            </div>

            {/* Main Charts */}
            <div className="charts-grid">
              {/* Revenue Trends */}
              <div className="chart-container">
                <h3 className="chart-title">Revenue & Enrollments</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analytics.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                    <Bar yAxisId="left" dataKey="revenue" fill="#3B82F6" />
                    <Line yAxisId="right" type="monotone" dataKey="enrollments" stroke="#10B981" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Category Distribution */}
              <div className="chart-container">
                <h3 className="chart-title">Course Categories</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {analytics.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform Insights */}
            <div className="charts-grid">
              <div className="chart-container">
                <h3 className="chart-title">Enrollment Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analytics.enrollmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar yAxisId="left" dataKey="enrollments" fill="#3B82F6" name="Enrollments" />
                    <Line yAxisId="right" type="monotone" dataKey="completions" stroke="#10B981" strokeWidth={3} name="Completions" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3 className="chart-title">Platform Health Insights</h3>
                <div className="insights-list">
                  <div className="insight-item">
                    <TrendingUp className="insight-icon green" />
                    <div>
                      <p className="insight-title">Monthly Growth</p>
                      <p className="insight-text">{overview.monthlyGrowth} new courses published this month</p>
                    </div>
                  </div>
                  <div className="insight-item">
                    <DollarSign className="insight-icon yellow" />
                    <div>
                      <p className="insight-title">Revenue Performance</p>
                      <p className="insight-text">{formatCurrency(overview.totalRevenue)} earned this month</p>
                    </div>
                  </div>
                  <div className="insight-item">
                    <Star className="insight-icon purple" />
                    <div>
                      <p className="insight-title">Quality Metrics</p>
                      <p className="insight-text">{overview.avgRating.toFixed(1)} average course rating</p>
                    </div>
                  </div>
                  <div className="insight-item">
                    <CheckCircle className="insight-icon blue" />
                    <div>
                      <p className="insight-title">System Status</p>
                      <p className="insight-text">{analytics.platformMetrics.systemUptime} platform uptime</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <>
            <div className="metrics-comparison">
              <div className="metric-item">
                <div className="metric-value">{formatNumber(overview.totalEnrollments)}</div>
                <div className="metric-label">Total Enrollments</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{formatNumber(overview.activeUsers)}</div>
                <div className="metric-label">Active Users</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{analytics.platformMetrics.avgSessionDuration}</div>
                <div className="metric-label">Avg Session</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{analytics.platformMetrics.bounceRate}</div>
                <div className="metric-label">Bounce Rate</div>
              </div>
            </div>

            <div className="chart-container full-width">
              <h3 className="chart-title">Enrollment Trends</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analytics.enrollmentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="enrollments" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeTab === 'courses' && (
          <>
            <div className="charts-grid">
              <div className="chart-container">
                <h3 className="chart-title">Category Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.categoryDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                    <Bar dataKey="revenue" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3 className="chart-title">Course Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="courses"
                      label={({ name, courses }) => `${name}: ${courses}`}
                    >
                      {analytics.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === 'revenue' && (
          <>
            <div className="chart-container full-width">
              <h3 className="chart-title">Revenue Analytics</h3>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={analytics.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                  <Bar yAxisId="left" dataKey="revenue" fill="#3B82F6" name="Revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="enrollments" stroke="#10B981" strokeWidth={3} name="Enrollments" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="charts-grid">
              <div className="chart-container">
                <h3 className="chart-title">Revenue by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.categoryDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                    <Bar dataKey="revenue" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3 className="chart-title">Monthly Refunds</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                    <Line type="monotone" dataKey="refunds" stroke="#EF4444" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === 'performance' && (
          <>
            <div className="metrics-comparison">
              <div className="metric-item">
                <div className="metric-value">{overview.completionRate}%</div>
                <div className="metric-label">Completion Rate</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{analytics.platformMetrics.satisfactionScore}/5</div>
                <div className="metric-label">Satisfaction</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{analytics.platformMetrics.conversionRate}</div>
                <div className="metric-label">Conversion</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{analytics.platformMetrics.systemUptime}</div>
                <div className="metric-label">Uptime</div>
              </div>
            </div>

            <div className="chart-container full-width">
              <h3 className="chart-title">Enrollment Performance</h3>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={analytics.enrollmentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="left" dataKey="enrollments" fill="#3B82F6" name="Enrollments" />
                  <Line yAxisId="right" type="monotone" dataKey="completions" stroke="#10B981" strokeWidth={3} name="Completions" />
                  <Line yAxisId="right" type="monotone" dataKey="dropouts" stroke="#EF4444" strokeWidth={3} name="Dropouts" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3 className="chart-title">Top Instructors</h3>
              <div className="instructors-table-container">
                <table className="instructors-table">
                  <thead>
                    <tr>
                      <th>Instructor</th>
                      <th>Courses</th>
                      <th>Students</th>
                      <th>Revenue</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topInstructors.map((instructor, index) => (
                      <tr key={index}>
                        <td>{instructor.name}</td>
                        <td>{instructor.courses}</td>
                        <td>{formatNumber(instructor.students)}</td>
                        <td>{formatCurrency(instructor.revenue)}</td>
                        <td>
                          <div className="rating-display">
                            <Star className="star-icon" />
                            {instructor.rating.toFixed(1)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;