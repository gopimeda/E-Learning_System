import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Eye,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalUsers: 0,
      totalCourses: 0,
      totalEnrollments: 0,
      totalRevenue: 0,
      activeUsers: 0,
      publishedCourses: 0
    },
    recentUsers: [],
    recentCourses: [],
    recentEnrollments: [],
    loading: true
  });

  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const API_BASE_URL = 'http://localhost:5555/api';

  // Get token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('userToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
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
        const totalUsers = usersData.data.pagination.totalUsers;
        const activeUsers = usersData.data.users.filter(user => user.isActive).length;
        const totalCourses = coursesData.data.pagination.totalCourses;
        const publishedCourses = coursesData.data.courses.filter(course => course.isPublished).length;
        
        // Calculate total enrollments and revenue from courses
        const totalEnrollments = coursesData.data.courses.reduce((sum, course) => sum + (course.totalEnrollments || 0), 0);
        const totalRevenue = coursesData.data.courses.reduce((sum, course) => {
          const price = course.discountPrice || course.price || 0;
          return sum + (price * (course.totalEnrollments || 0));
        }, 0);

        setDashboardData(prev => ({
          ...prev,
          stats: {
            totalUsers,
            totalCourses,
            totalEnrollments,
            totalRevenue,
            activeUsers,
            publishedCourses
          },
          recentUsers: usersData.data.users.slice(0, 5),
          recentCourses: coursesData.data.courses.slice(0, 5),
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch(`${API_BASE_URL}/users?limit=100&search=${searchTerm}&role=${filterRole}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch all courses
  const fetchCourses = async () => {
    try {
      setCoursesLoading(true);
      const response = await fetch(`${API_BASE_URL}/courses?limit=100`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setCourses(data.data.courses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Toggle user status
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchUsers(); // Refresh users list
        fetchDashboardStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'courses') {
      fetchCourses();
    }
  }, [activeTab, searchTerm, filterRole]);

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, trendValue, color = 'blue' }) => (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-card-content">
        <div className="stat-card-header">
          <div className={`stat-card-icon stat-card-icon-${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`stat-card-trend ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="stat-card-body">
          <h3 className="stat-card-value">{value}</h3>
          <p className="stat-card-title">{title}</p>
          {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (dashboardData.loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Admin Dashboard</h1>
          <p>Manage your learning platform</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-outline">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          Courses
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="dashboard-content">
          {/* Stats Grid */}
          <div className="stats-grid">
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
              title="Total Enrollments"
              value={dashboardData.stats.totalEnrollments.toLocaleString()}
              color="purple"
              trend="up"
              trendValue="24%"
            />
            <StatCard
              icon={DollarSign}
              title="Total Revenue"
              value={formatCurrency(dashboardData.stats.totalRevenue)}
              color="orange"
              trend="up"
              trendValue="18%"
            />
          </div>

          {/* Recent Activity */}
          <div className="dashboard-grid">
            {/* Recent Users */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Recent Users</h3>
                <button className="btn btn-sm btn-outline">View All</button>
              </div>
              <div className="card-content">
                {dashboardData.recentUsers.map(user => (
                  <div key={user._id} className="recent-item">
                    <div className="recent-item-avatar">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.firstName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                      )}
                    </div>
                    <div className="recent-item-info">
                      <h4>{user.firstName} {user.lastName}</h4>
                      <p>{user.email}</p>
                      <span className={`role-badge role-${user.role}`}>{user.role}</span>
                    </div>
                    <div className="recent-item-meta">
                      <div className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                        {user.isActive ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {user.isActive ? 'Active' : 'Inactive'}
                      </div>
                      <p>{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Courses */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Recent Courses</h3>
                <button className="btn btn-sm btn-outline">View All</button>
              </div>
              <div className="card-content">
                {dashboardData.recentCourses.map(course => (
                  <div key={course._id} className="recent-item">
                    <div className="recent-item-thumbnail">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <BookOpen className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="recent-item-info">
                      <h4>{course.title}</h4>
                      <p>{course.instructor?.firstName} {course.instructor?.lastName}</p>
                      <div className="course-meta">
                        <span className="price">{formatCurrency(course.discountPrice || course.price)}</span>
                        {course.averageRating > 0 && (
                          <div className="rating">
                            <Star className="w-3 h-3 filled" />
                            <span>{course.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="recent-item-meta">
                      <div className={`status-badge ${course.isPublished ? 'status-published' : 'status-draft'}`}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </div>
                      <p>{course.totalEnrollments || 0} enrolled</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="dashboard-content">
          <div className="content-header">
            <div className="search-filters">
              <div className="search-box">
                <Search className="w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="filter-select"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="student">Students</option>
                <option value="instructor">Instructors</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          <div className="data-table-container">
            {usersLoading ? (
              <div className="table-loading">
                <div className="loading-spinner"></div>
                <p>Loading users...</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Courses</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.firstName} />
                            ) : (
                              <div className="avatar-placeholder">
                                {user.firstName[0]}{user.lastName[0]}
                              </div>
                            )}
                          </div>
                          <div className="user-info">
                            <h4>{user.firstName} {user.lastName}</h4>
                            <p>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <div className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                          {user.isActive ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="courses-count">
                          {user.role === 'instructor' ? (
                            <span>{user.createdCourses?.length || 0} created</span>
                          ) : (
                            <span>{user.enrolledCourses?.length || 0} enrolled</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => toggleUserStatus(user._id, user.isActive)}
                          >
                            {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="btn btn-sm btn-outline">
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="dashboard-content">
          <div className="content-header">
            <div className="search-filters">
              <div className="search-box">
                <Search className="w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="data-table-container">
            {coursesLoading ? (
              <div className="table-loading">
                <div className="loading-spinner"></div>
                <p>Loading courses...</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Instructor</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Enrollments</th>
                    <th>Rating</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course._id}>
                      <td>
                        <div className="course-cell">
                          <div className="course-thumbnail">
                            {course.thumbnail ? (
                              <img src={course.thumbnail} alt={course.title} />
                            ) : (
                              <div className="thumbnail-placeholder">
                                <BookOpen className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="course-info">
                            <h4>{course.title}</h4>
                            <p>{course.category} • {course.level}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="instructor-info">
                          <h5>{course.instructor?.firstName} {course.instructor?.lastName}</h5>
                        </div>
                      </td>
                      <td>
                        <div className="price-info">
                          <span className="current-price">{formatCurrency(course.discountPrice || course.price)}</span>
                          {course.discountPrice && course.price !== course.discountPrice && (
                            <span className="original-price">{formatCurrency(course.price)}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={`status-badge ${course.isPublished ? 'status-published' : 'status-draft'}`}>
                          {course.isPublished ? 'Published' : 'Draft'}
                        </div>
                      </td>
                      <td>
                        <span className="enrollment-count">{course.totalEnrollments || 0}</span>
                      </td>
                      <td>
                        {course.averageRating > 0 ? (
                          <div className="rating">
                            <Star className="w-4 h-4 filled" />
                            <span>{course.averageRating.toFixed(1)} ({course.totalRatings})</span>
                          </div>
                        ) : (
                          <span className="no-rating">No ratings</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn btn-sm btn-outline">
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button className="btn btn-sm btn-outline">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;