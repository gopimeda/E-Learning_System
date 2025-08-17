import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  UserCheck, 
  UserX, 
  Shield, 
  BookOpen, 
  Calendar,
  Mail,
  Phone,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
  Save,
  User
} from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const API_BASE_URL = 'http://localhost:5555/api';
  const limit = 10;

  // Get token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('userToken');
  };

  // Fetch users from backend
  const fetchUsers = async (page = 1, search = '', role = '') => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(role && { role })
      });

      const response = await fetch(`${API_BASE_URL}/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
        setTotalUsers(data.data.pagination.totalUsers);
        setCurrentPage(data.data.pagination.currentPage);
      } else {
        showMessage('Failed to fetch users', 'error');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showMessage('Network error while fetching users', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update user status (activate/deactivate)
  const updateUserStatus = async (userId, isActive) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage(data.message, 'success');
        fetchUsers(currentPage, searchTerm, roleFilter);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      showMessage('Network error while updating user status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Update user role
  const updateUserRole = async (userId, role) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage(data.message, 'success');
        fetchUsers(currentPage, searchTerm, roleFilter);
        setShowEditModal(false);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      showMessage('Network error while updating user role', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage(data.message, 'success');
        fetchUsers(currentPage, searchTerm, roleFilter);
        setShowDeleteModal(false);
        setSelectedUser(null);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('Network error while deleting user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Show message helper
  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // Handle search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
    // Debounce search
    setTimeout(() => {
      fetchUsers(1, value, roleFilter);
    }, 500);
  };

  // Handle role filter
  const handleRoleFilter = (role) => {
    setRoleFilter(role);
    setCurrentPage(1);
    fetchUsers(1, searchTerm, role);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchUsers(page, searchTerm, roleFilter);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'instructor':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="admin-users">
      <div className="admin-users__header">
        <div className="admin-users__title">
          <Users className="admin-users__title-icon" />
          <div>
            <h1 className="admin-users__title-text">User Management</h1>
            <p className="admin-users__title-subtitle">
              Manage and monitor all platform users
            </p>
          </div>
        </div>
        
        <div className="admin-users__stats">
          <div className="admin-users__stat-card">
            <span className="admin-users__stat-number">{totalUsers}</span>
            <span className="admin-users__stat-label">Total Users</span>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`admin-users__message admin-users__message--${messageType}`}>
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="admin-users__filters">
        <div className="admin-users__search">
          <Search className="admin-users__search-icon" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={handleSearch}
            className="admin-users__search-input"
          />
        </div>
        
        <div className="admin-users__filter-buttons">
          <button
            onClick={() => handleRoleFilter('')}
            className={`admin-users__filter-btn ${roleFilter === '' ? 'admin-users__filter-btn--active' : ''}`}
          >
            All Roles
          </button>
          <button
            onClick={() => handleRoleFilter('student')}
            className={`admin-users__filter-btn ${roleFilter === 'student' ? 'admin-users__filter-btn--active' : ''}`}
          >
            Students
          </button>
          <button
            onClick={() => handleRoleFilter('instructor')}
            className={`admin-users__filter-btn ${roleFilter === 'instructor' ? 'admin-users__filter-btn--active' : ''}`}
          >
            Instructors
          </button>
          <button
            onClick={() => handleRoleFilter('admin')}
            className={`admin-users__filter-btn ${roleFilter === 'admin' ? 'admin-users__filter-btn--active' : ''}`}
          >
            Admins
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-users__table-container">
        {loading ? (
          <div className="admin-users__loading">
            <div className="admin-users__spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : (
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Courses</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="admin-users__table-row">
                  <td className="admin-users__user-info">
                    <div className="admin-users__user-avatar">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.firstName} />
                      ) : (
                        <User className="admin-users__default-avatar" />
                      )}
                    </div>
                    <div className="admin-users__user-details">
                      <span className="admin-users__user-name">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="admin-users__user-email">{user.email}</span>
                      {user.phone && (
                        <span className="admin-users__user-phone">{user.phone}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`admin-users__badge ${getRoleBadgeColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-users__badge ${getStatusBadgeColor(user.isActive)}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="admin-users__courses">
                    <div className="admin-users__course-stats">
                      {user.role === 'instructor' ? (
                        <span>{user.createdCourses?.length || 0} Created</span>
                      ) : (
                        <span>{user.enrolledCourses?.length || 0} Enrolled</span>
                      )}
                    </div>
                  </td>
                  <td className="admin-users__date">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="admin-users__actions">
                    <div className="admin-users__action-buttons">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="admin-users__action-btn admin-users__action-btn--edit"
                        title="Edit User"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => updateUserStatus(user._id, !user.isActive)}
                        className={`admin-users__action-btn ${
                          user.isActive 
                            ? 'admin-users__action-btn--deactivate' 
                            : 'admin-users__action-btn--activate'
                        }`}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                        disabled={actionLoading}
                      >
                        {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                        className="admin-users__action-btn admin-users__action-btn--delete"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-users__pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="admin-users__pagination-btn"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <div className="admin-users__pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="admin-users__pagination-btn"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="admin-users__modal-overlay">
          <div className="admin-users__modal">
            <div className="admin-users__modal-header">
              <h3>Edit User Role</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="admin-users__modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="admin-users__modal-content">
              <div className="admin-users__modal-user-info">
                <div className="admin-users__modal-avatar">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.firstName} />
                  ) : (
                    <User size={40} />
                  )}
                </div>
                <div>
                  <h4>{selectedUser.firstName} {selectedUser.lastName}</h4>
                  <p>{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="admin-users__role-selection">
                <label>Select Role:</label>
                <div className="admin-users__role-options">
                  {['student', 'instructor', 'admin'].map((role) => (
                    <button
                      key={role}
                      onClick={() => updateUserRole(selectedUser._id, role)}
                      className={`admin-users__role-option ${
                        selectedUser.role === role ? 'admin-users__role-option--active' : ''
                      }`}
                      disabled={actionLoading}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="admin-users__modal-overlay">
          <div className="admin-users__modal admin-users__modal--danger">
            <div className="admin-users__modal-header">
              <AlertTriangle className="admin-users__danger-icon" />
              <h3>Delete User</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="admin-users__modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="admin-users__modal-content">
              <p>
                Are you sure you want to delete <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>? 
                This action cannot be undone.
              </p>
              <div className="admin-users__modal-actions">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="admin-users__btn admin-users__btn--secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUser(selectedUser._id)}
                  className="admin-users__btn admin-users__btn--danger"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-users {
          padding: 24px;
          background-color: #f8fafc;
          min-height: 100vh;
        }

        .admin-users__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .admin-users__title {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .admin-users__title-icon {
          width: 48px;
          height: 48px;
          color: #3b82f6;
          background-color: #dbeafe;
          padding: 12px;
          border-radius: 12px;
        }

        .admin-users__title-text {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .admin-users__title-subtitle {
          font-size: 16px;
          color: #6b7280;
          margin: 4px 0 0 0;
        }

        .admin-users__stats {
          display: flex;
          gap: 16px;
        }

        .admin-users__stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: center;
          min-width: 120px;
        }

        .admin-users__stat-number {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #3b82f6;
        }

        .admin-users__stat-label {
          display: block;
          font-size: 14px;
          color: #6b7280;
          margin-top: 4px;
        }

        .admin-users__message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-weight: 500;
        }

        .admin-users__message--success {
          background-color: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .admin-users__message--error {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .admin-users__filters {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .admin-users__search {
          position: relative;
          max-width: 400px;
        }

        .admin-users__search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          width: 20px;
          height: 20px;
        }

        .admin-users__search-input {
          width: 100%;
          padding: 12px 12px 12px 44px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .admin-users__search-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .admin-users__filter-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .admin-users__filter-btn {
          padding: 8px 16px;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .admin-users__filter-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .admin-users__filter-btn--active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .admin-users__table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .admin-users__loading {
          padding: 60px;
          text-align: center;
          color: #6b7280;
        }

        .admin-users__spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-left-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .admin-users__table {
          width: 100%;
          border-collapse: collapse;
        }

        .admin-users__table th {
          background: #f9fafb;
          padding: 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .admin-users__table-row {
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s;
        }

        .admin-users__table-row:hover {
          background-color: #f9fafb;
        }

        .admin-users__table td {
          padding: 16px;
          vertical-align: middle;
        }

        .admin-users__user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-users__user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-users__user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .admin-users__default-avatar {
          color: #9ca3af;
          width: 24px;
          height: 24px;
        }

        .admin-users__user-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .admin-users__user-name {
          font-weight: 600;
          color: #111827;
        }

        .admin-users__user-email {
          font-size: 14px;
          color: #6b7280;
        }

        .admin-users__user-phone {
          font-size: 12px;
          color: #9ca3af;
        }

        .admin-users__badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .admin-users__courses {
          font-size: 14px;
          color: #6b7280;
        }

        .admin-users__date {
          font-size: 14px;
          color: #6b7280;
        }

        .admin-users__actions {
          width: 140px;
        }

        .admin-users__action-buttons {
          display: flex;
          gap: 8px;
        }

        .admin-users__action-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .admin-users__action-btn--edit {
          background: #dbeafe;
          color: #3b82f6;
        }

        .admin-users__action-btn--edit:hover {
          background: #bfdbfe;
        }

        .admin-users__action-btn--activate {
          background: #d1fae5;
          color: #059669;
        }

        .admin-users__action-btn--activate:hover {
          background: #a7f3d0;
        }

        .admin-users__action-btn--deactivate {
          background: #fef3c7;
          color: #d97706;
        }

        .admin-users__action-btn--deactivate:hover {
          background: #fde68a;
        }

        .admin-users__action-btn--delete {
          background: #fee2e2;
          color: #dc2626;
        }

        .admin-users__action-btn--delete:hover {
          background: #fecaca;
        }

        .admin-users__action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .admin-users__pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          padding: 20px;
        }

        .admin-users__pagination-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .admin-users__pagination-btn:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .admin-users__pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .admin-users__pagination-info {
          font-weight: 500;
          color: #6b7280;
        }

        .admin-users__modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .admin-users__modal {
          background: white;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .admin-users__modal--danger {
          border-top: 4px solid #dc2626;
        }

        .admin-users__modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 24px 0;
        }

        .admin-users__modal-header h3 {
          flex: 1;
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .admin-users__danger-icon {
          color: #dc2626;
          width: 24px;
          height: 24px;
        }

        .admin-users__modal-close {
          padding: 8px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 6px;
          color: #6b7280;
        }

        .admin-users__modal-close:hover {
          background: #f3f4f6;
        }

        .admin-users__modal-content {
          padding: 24px;
        }

        .admin-users__modal-user-info {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .admin-users__modal-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-users__modal-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .admin-users__modal-user-info h4 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .admin-users__modal-user-info p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .admin-users__role-selection {
          margin-bottom: 24px;
        }

        .admin-users__role-selection label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
        }

        .admin-users__role-options {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .admin-users__role-option {
          padding: 10px 20px;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
          text-align: center;
        }

        .admin-users__role-option:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .admin-users__role-option--active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .admin-users__role-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .admin-users__modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .admin-users__btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
        }

        .admin-users__btn--secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .admin-users__btn--secondary:hover {
          background: #e5e7eb;
        }

        .admin-users__btn--danger {
          background: #dc2626;
          color: white;
        }

        .admin-users__btn--danger:hover:not(:disabled) {
          background: #b91c1c;
        }

        .admin-users__btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .admin-users {
            padding: 16px;
          }

          .admin-users__header {
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
          }

          .admin-users__title-text {
            font-size: 24px;
          }

          .admin-users__filters {
            padding: 16px;
          }

          .admin-users__filter-buttons {
            flex-direction: column;
            align-items: flex-start;
          }

          .admin-users__table-container {
            overflow-x: auto;
          }

          .admin-users__table {
            min-width: 800px;
          }

          .admin-users__modal {
            width: 95%;
            margin: 20px;
          }

          .admin-users__modal-content {
            padding: 16px;
          }

          .admin-users__role-options {
            flex-direction: column;
          }

          .admin-users__modal-actions {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .admin-users__action-buttons {
            flex-direction: column;
            gap: 4px;
          }

          .admin-users__action-btn {
            width: 32px;
            height: 32px;
          }

          .admin-users__pagination {
            flex-direction: column;
            gap: 12px;
          }

          .admin-users__pagination-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminUsers;