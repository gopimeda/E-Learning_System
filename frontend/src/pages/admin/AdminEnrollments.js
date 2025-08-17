import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  UserPlus, 
  UserMinus,
  Eye,
  Edit3,
  Calendar,
  TrendingUp,
  DollarSign,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Send
} from 'lucide-react';
import './AdminEnrollments.css';

const AdminEnrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchFilters, setSearchFilters] = useState({
    studentEmail: '',
    studentName: '',
    courseTitle: '',
    status: 'all',
    paymentStatus: 'all',
    enrollmentDateFrom: '',
    enrollmentDateTo: '',
    completionMin: '',
    completionMax: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20
  });
  const [selectedEnrollments, setSelectedEnrollments] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showManualEnrollModal, setShowManualEnrollModal] = useState(false);
  const [sortBy, setSortBy] = useState('enrollmentDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const API_BASE_URL = 'http://localhost:5555/api';

  // Get authentication token
  const getAuthToken = () => localStorage.getItem('userToken');

  // Fetch enrollment overview/statistics
  const fetchOverview = async (timeframe = '30d') => {
    try {
      const response = await fetch(`${API_BASE_URL}/enrollments/admin/overview?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
    }
  };

  // Search enrollments with filters
  const searchEnrollments = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(searchFilters).filter(([_, value]) => value !== '' && value !== 'all')
        )
      });

      const response = await fetch(`${API_BASE_URL}/enrollments/admin/search?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setEnrollments(data.data.enrollments);
        setPagination(data.data.pagination);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Error fetching enrollments', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update enrollment status
  const updateEnrollmentStatus = async (enrollmentId, status, reason = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/enrollments/${enrollmentId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reason })
      });

      const data = await response.json();
      if (data.success) {
        showMessage('Enrollment status updated successfully', 'success');
        searchEnrollments(pagination.currentPage);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Error updating enrollment status', 'error');
    }
  };

  // Delete enrollment
  const deleteEnrollment = async (enrollmentId, reason = '') => {
    if (!window.confirm('Are you sure you want to unenroll this student?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason, notifyStudent: true })
      });

      const data = await response.json();
      if (data.success) {
        showMessage('Student unenrolled successfully', 'success');
        searchEnrollments(pagination.currentPage);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Error unenrolling student', 'error');
    }
  };

  // Show message
  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle search
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    searchEnrollments(1);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchFilters({
      studentEmail: '',
      studentName: '',
      courseTitle: '',
      status: 'all',
      paymentStatus: 'all',
      enrollmentDateFrom: '',
      enrollmentDateTo: '',
      completionMin: '',
      completionMax: ''
    });
  };

  // Export enrollments
  const exportEnrollments = async () => {
    try {
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(searchFilters).filter(([_, value]) => value !== '' && value !== 'all')
        )
      );

      const response = await fetch(`${API_BASE_URL}/enrollments/admin/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `enrollments-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showMessage('Export completed successfully', 'success');
      } else {
        showMessage('Export failed', 'error');
      }
    } catch (error) {
      showMessage('Error exporting enrollments', 'error');
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      active: { class: 'status-active', icon: CheckCircle, text: 'Active' },
      completed: { class: 'status-completed', icon: Award, text: 'Completed' },
      suspended: { class: 'status-suspended', icon: Ban, text: 'Suspended' },
      refunded: { class: 'status-refunded', icon: RefreshCcw, text: 'Refunded' }
    };

    const badge = badges[status] || badges.active;
    const IconComponent = badge.icon;

    return (
      <span className={`status-badge ${badge.class}`}>
        <IconComponent className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Initialize data
  useEffect(() => {
    fetchOverview();
    searchEnrollments();
  }, []);

  return (
    <div className="admin-enrollments">
      {/* Header */}
      <div className="admin-header">
        <div className="header-content">
          <div>
            <h1>Enrollment Management</h1>
            <p>Manage student enrollments, track progress, and analyze performance</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-secondary"
              onClick={exportEnrollments}
              disabled={loading}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setShowManualEnrollModal(true)}
            >
              <UserPlus className="w-4 h-4" />
              Manual Enroll
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`message ${messageType === 'success' ? 'message-success' : 'message-error'}`}>
          {messageType === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp className="w-4 h-4" />
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'enrollments' ? 'active' : ''}`}
          onClick={() => setActiveTab('enrollments')}
        >
          <Users className="w-4 h-4" />
          Enrollments
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="overview-content">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-blue">
                <Users className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <h3>Total Enrollments</h3>
                <p className="stat-number">{stats.total.totalEnrollments.toLocaleString()}</p>
                <span className="stat-change positive">
                  +{stats.recent.recentEnrollments} this month
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <h3>Active Enrollments</h3>
                <p className="stat-number">{stats.total.activeEnrollments.toLocaleString()}</p>
                <span className="stat-change">
                  {Math.round((stats.total.activeEnrollments / stats.total.totalEnrollments) * 100)}% of total
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-purple">
                <Award className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <h3>Completed</h3>
                <p className="stat-number">{stats.total.completedEnrollments.toLocaleString()}</p>
                <span className="stat-change">
                  {Math.round((stats.total.completedEnrollments / stats.total.totalEnrollments) * 100)}% completion rate
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-orange">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <h3>Total Revenue</h3>
                <p className="stat-number">{formatCurrency(stats.total.totalRevenue)}</p>
                <span className="stat-change positive">
                  +{formatCurrency(stats.recent.recentRevenue)} this month
                </span>
              </div>
            </div>
          </div>

          {/* Top Courses */}
          <div className="top-courses">
            <h3>Top Performing Courses</h3>
            <div className="course-list">
              {stats.topCourses.map((course, index) => (
                <div key={course.courseId} className="course-item">
                  <div className="course-rank">#{index + 1}</div>
                  <div className="course-info">
                    <h4>{course.courseTitle}</h4>
                    <div className="course-stats">
                      <span>{course.enrollmentCount} enrollments</span>
                      <span>•</span>
                      <span>{formatCurrency(course.revenue)} revenue</span>
                      <span>•</span>
                      <span>{course.avgCompletion}% avg completion</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enrollments Tab */}
      {activeTab === 'enrollments' && (
        <div className="enrollments-content">
          {/* Search and Filters */}
          <div className="search-section">
            <div className="search-header">
              <h3>Search & Filter Enrollments</h3>
              <button className="btn btn-secondary" onClick={resetFilters}>
                <RefreshCcw className="w-4 h-4" />
                Reset Filters
              </button>
            </div>

            <div className="search-grid">
              <div className="search-group">
                <label>Student Email</label>
                <input
                  type="email"
                  placeholder="Search by email..."
                  value={searchFilters.studentEmail}
                  onChange={(e) => handleFilterChange('studentEmail', e.target.value)}
                />
              </div>

              <div className="search-group">
                <label>Student Name</label>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchFilters.studentName}
                  onChange={(e) => handleFilterChange('studentName', e.target.value)}
                />
              </div>

              <div className="search-group">
                <label>Course Title</label>
                <input
                  type="text"
                  placeholder="Search by course..."
                  value={searchFilters.courseTitle}
                  onChange={(e) => handleFilterChange('courseTitle', e.target.value)}
                />
              </div>

              <div className="search-group">
                <label>Status</label>
                <select
                  value={searchFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="suspended">Suspended</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div className="search-group">
                <label>Payment Status</label>
                <select
                  value={searchFilters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                >
                  <option value="all">All Payment Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="search-group">
                <label>Enrollment Date From</label>
                <input
                  type="date"
                  value={searchFilters.enrollmentDateFrom}
                  onChange={(e) => handleFilterChange('enrollmentDateFrom', e.target.value)}
                />
              </div>

              <div className="search-group">
                <label>Enrollment Date To</label>
                <input
                  type="date"
                  value={searchFilters.enrollmentDateTo}
                  onChange={(e) => handleFilterChange('enrollmentDateTo', e.target.value)}
                />
              </div>

              <div className="search-group">
                <label>Min Completion %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={searchFilters.completionMin}
                  onChange={(e) => handleFilterChange('completionMin', e.target.value)}
                />
              </div>
            </div>

            <div className="search-actions">
              <button className="btn btn-primary" onClick={handleSearch}>
                <Search className="w-4 h-4" />
                Search Enrollments
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="results-section">
            <div className="results-header">
              <div className="results-info">
                <h3>Search Results</h3>
                <p>{pagination.totalItems} enrollments found</p>
              </div>
              <div className="results-actions">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                    searchEnrollments(1);
                  }}
                >
                  <option value="enrollmentDate-desc">Newest First</option>
                  <option value="enrollmentDate-asc">Oldest First</option>
                  <option value="progress.completionPercentage-desc">Highest Progress</option>
                  <option value="progress.completionPercentage-asc">Lowest Progress</option>
                  <option value="payment.amount-desc">Highest Payment</option>
                  <option value="payment.amount-asc">Lowest Payment</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading enrollments...</p>
              </div>
            ) : (
              <>
                {/* Enrollments Table */}
                <div className="enrollments-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Payment</th>
                        <th>Enrolled</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((enrollment) => (
                        <EnrollmentRow
                          key={enrollment._id}
                          enrollment={enrollment}
                          onStatusUpdate={updateEnrollmentStatus}
                          onDelete={deleteEnrollment}
                          getStatusBadge={getStatusBadge}
                          formatCurrency={formatCurrency}
                          formatDate={formatDate}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      disabled={!pagination.hasPrevPage}
                      onClick={() => searchEnrollments(pagination.currentPage - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      disabled={!pagination.hasNextPage}
                      onClick={() => searchEnrollments(pagination.currentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Enrollment Row Component
const EnrollmentRow = ({ 
  enrollment, 
  onStatusUpdate, 
  onDelete, 
  getStatusBadge, 
  formatCurrency, 
  formatDate 
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  return (
    <>
      <tr className="enrollment-row">
        <td>
          <div className="student-info">
            <div className="student-avatar">
              {enrollment.student.avatar ? (
                <img src={enrollment.student.avatar} alt="" />
              ) : (
                <div className="avatar-placeholder">
                  {enrollment.student.firstName?.[0]}{enrollment.student.lastName?.[0]}
                </div>
              )}
            </div>
            <div>
              <p className="student-name">
                {enrollment.student.firstName} {enrollment.student.lastName}
              </p>
              <p className="student-email">{enrollment.student.email}</p>
            </div>
          </div>
        </td>

        <td>
          <div className="course-info">
            <p className="course-title">{enrollment.course.title}</p>
            <p className="course-price">{formatCurrency(enrollment.course.price)}</p>
          </div>
        </td>

        <td>{getStatusBadge(enrollment.status)}</td>

        <td>
          <div className="progress-info">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${enrollment.progress?.completionPercentage || 0}%` }}
              />
            </div>
            <span className="progress-text">
              {enrollment.progress?.completionPercentage || 0}%
            </span>
          </div>
        </td>

        <td>
          <div className="payment-info">
            <p className="payment-amount">{formatCurrency(enrollment.payment?.amount)}</p>
            <p className="payment-status">{enrollment.payment?.paymentStatus}</p>
          </div>
        </td>

        <td>{formatDate(enrollment.enrollmentDate)}</td>

        <td>
          <div className="action-buttons">
            <button 
              className="btn-action"
              onClick={() => setShowStatusModal(true)}
              title="Change Status"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button 
              className="btn-action btn-danger"
              onClick={() => onDelete(enrollment._id)}
              title="Unenroll Student"
            >
              <UserMinus className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Status Modal */}
      {showStatusModal && (
        <StatusModal
          enrollment={enrollment}
          onStatusUpdate={onStatusUpdate}
          onClose={() => setShowStatusModal(false)}
        />
      )}
    </>
  );
};

// Status Modal Component
const StatusModal = ({ enrollment, onStatusUpdate, onClose }) => {
  const [newStatus, setNewStatus] = useState(enrollment.status);
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onStatusUpdate(enrollment._id, newStatus, reason);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Update Enrollment Status</h3>
          <button onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                required
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="suspended">Suspended</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {(newStatus === 'suspended' || newStatus === 'refunded') && (
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for status change..."
                  required
                />
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEnrollments;