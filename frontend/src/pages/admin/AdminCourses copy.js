import React, { useState, useEffect } from 'react';
import './AdminCourses.css';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Star, 
  StarOff,
  Users,
  DollarSign,
  BookOpen,
  Calendar,
  AlertTriangle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Settings,
  BarChart3
} from 'lucide-react';

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [currentCourse, setCurrentCourse] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [pagination, setPagination] = useState({});
  
  // Filters and search
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    category: '',
    level: '',
    status: '',
    instructor: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [categories] = useState([
    'Programming', 'Design', 'Business', 'Marketing', 
    'Photography', 'Music', 'Language', 'Health & Fitness'
  ]);

  const [levels] = useState(['Beginner', 'Intermediate', 'Advanced']);

  const API_BASE_URL = 'http://localhost:5555/api';

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('userToken');
  };

  // API call helper
  const apiCall = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    
    return data;
  };

  // Fetch all courses
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const data = await apiCall(`/courses/admin/all?${queryParams}`);
      
      if (data.success) {
        setCourses(data.data.courses);
        setStatistics(data.data.statistics);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update course status
  const updateCourseStatus = async (courseId, statusData) => {
    try {
      const data = await apiCall(`/courses/admin/${courseId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusData)
      });

      if (data.success) {
        fetchCourses(); // Refresh the list
        return { success: true, message: data.message };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Delete course
  const deleteCourse = async (courseId, forceDelete = false) => {
    try {
      const data = await apiCall(`/courses/admin/${courseId}`, {
        method: 'DELETE',
        body: JSON.stringify({ forceDelete })
      });

      if (data.success) {
        fetchCourses(); // Refresh the list
        return { success: true, message: data.message };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Bulk actions
  const performBulkAction = async (action, actionData = {}) => {
    if (selectedCourses.length === 0) {
      setError('Please select courses first');
      return;
    }

    try {
      const data = await apiCall('/courses/admin/bulk-action', {
        method: 'PUT',
        body: JSON.stringify({
          courseIds: selectedCourses,
          action,
          actionData
        })
      });

      if (data.success) {
        setSelectedCourses([]);
        fetchCourses();
        return { success: true, message: data.message };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  // Handle course selection
  const handleCourseSelect = (courseId) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(courses.map(course => course._id));
    }
  };

  // Modal handlers
  const openModal = (type, course = null) => {
    setModalType(type);
    setCurrentCourse(course);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setCurrentCourse(null);
  };

  // Load courses on component mount and filter changes
  useEffect(() => {
    fetchCourses();
  }, [filters]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && courses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading courses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
              <p className="text-gray-600 mt-1">Manage all courses in the platform</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchCourses}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalCourses || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.publishedCourses || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalEnrollments || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(statistics.averagePrice || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="featured">Featured</option>
              </select>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Search
              </button>
            </form>
          </div>

          {/* Bulk Actions */}
          {selectedCourses.length > 0 && (
            <div className="p-4 bg-blue-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800 font-medium">
                  {selectedCourses.length} course(s) selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => performBulkAction('publish')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => performBulkAction('unpublish')}
                    className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                  >
                    Unpublish
                  </button>
                  <button
                    onClick={() => performBulkAction('feature')}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    Feature
                  </button>
                  <button
                    onClick={() => openModal('bulkDelete')}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Courses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCourses.length === courses.length && courses.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course._id)}
                        onChange={() => handleCourseSelect(course._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img
                          src={course.thumbnail || '/api/placeholder/64/64'}
                          alt={course.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {course.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {course.category} • {course.level}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img
                          src={course.instructor?.avatar || '/api/placeholder/32/32'}
                          alt={`${course.instructor?.firstName} ${course.instructor?.lastName}`}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {course.instructor?.firstName} {course.instructor?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {course.instructor?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          course.isPublished 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {course.isPublished ? 'Published' : 'Draft'}
                        </span>
                        {course.isFeatured && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(course.price)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {course.totalEnrollments || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(course.averageRating || 0)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          {course.averageRating?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(course.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal('view', course)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('analytics', course)}
                          className="text-purple-600 hover:text-purple-800"
                          title="View Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', course)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit Course"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('delete', course)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                      <span className="font-medium">{pagination.totalPages}</span> ({pagination.totalCourses} courses)
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                        disabled={!pagination.hasPrevPage}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <Modal
          type={modalType}
          course={currentCourse}
          onClose={closeModal}
          onAction={async (action, data) => {
            let result;
            switch (action) {
              case 'updateStatus':
                result = await updateCourseStatus(currentCourse._id, data);
                break;
              case 'delete':
                result = await deleteCourse(currentCourse._id, data.forceDelete);
                break;
              case 'bulkDelete':
                result = await performBulkAction('delete', data);
                break;
            }
            
            if (result?.success) {
              closeModal();
            }
            
            return result;
          }}
          selectedCount={selectedCourses.length}
        />
      )}
    </div>
  );
};

// Modal Component
const Modal = ({ type, course, onClose, onAction, selectedCount }) => {
  const [loading, setLoading] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const handleAction = async (actionType, data = {}) => {
    setLoading(true);
    try {
      const result = await onAction(actionType, data);
      if (result?.success) {
        onClose();
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (type === 'analytics' && course) {
      try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`http://localhost:5555/api/courses/admin/${course._id}/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.data.analytics);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [type, course]);

  const renderModalContent = () => {
    switch (type) {
      case 'view':
        return (
          <div className="space-y-4">
            <img
              src={course.thumbnail || '/api/placeholder/400/200'}
              alt={course.title}
              className="w-full h-48 object-cover rounded-lg"
            />
            <div>
              <h3 className="text-lg font-semibold">{course.title}</h3>
              <p className="text-gray-600 mt-2">{course.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Category:</span>
                <p className="text-sm text-gray-900">{course.category}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Level:</span>
                <p className="text-sm text-gray-900">{course.level}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Price:</span>
                <p className="text-sm text-gray-900">${course.price}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Enrollments:</span>
                <p className="text-sm text-gray-900">{course.totalEnrollments || 0}</p>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            {analytics ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{analytics.summary.totalEnrollments}</div>
                    <div className="text-sm text-blue-600">Total Enrollments</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">${analytics.summary.totalRevenue}</div>
                    <div className="text-sm text-green-600">Total Revenue</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-900">{analytics.summary.completionRate}%</div>
                    <div className="text-sm text-purple-600">Completion Rate</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-900">{analytics.summary.averageRating}</div>
                    <div className="text-sm text-yellow-600">Average Rating</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-3">Rating Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(analytics.ratingDistribution).map(([rating, count]) => (
                      <div key={rating} className="flex items-center space-x-3">
                        <span className="w-8 text-sm">{rating} ★</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full" 
                            style={{ width: `${(count / analytics.summary.totalRatings) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-3">Recent Enrollments</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {analytics.recentEnrollments.map((enrollment, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <span className="font-medium">
                            {enrollment.student.firstName} {enrollment.student.lastName}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className={`px-2 py-1 rounded-full ${
                            enrollment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {enrollment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span>Loading analytics...</span>
              </div>
            )}
          </div>
        );

      case 'edit':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleAction('updateStatus', { isPublished: !course.isPublished })}
                disabled={loading}
                className={`flex items-center px-4 py-2 rounded-lg text-white ${
                  course.isPublished 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {course.isPublished ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {loading ? 'Processing...' : (course.isPublished ? 'Unpublish' : 'Publish')}
              </button>
              
              <button
                onClick={() => handleAction('updateStatus', { isFeatured: !course.isFeatured })}
                disabled={loading}
                className={`flex items-center px-4 py-2 rounded-lg text-white ${
                  course.isFeatured 
                    ? 'bg-gray-600 hover:bg-gray-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                } disabled:opacity-50`}
              >
                {course.isFeatured ? <StarOff className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2" />}
                {course.isFeatured ? 'Unfeature' : 'Feature'}
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Course Details</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Title:</strong> {course.title}</div>
                <div><strong>Category:</strong> {course.category}</div>
                <div><strong>Level:</strong> {course.level}</div>
                <div><strong>Price:</strong> ${course.price}</div>
                <div><strong>Status:</strong> {course.isPublished ? 'Published' : 'Draft'}</div>
                <div><strong>Featured:</strong> {course.isFeatured ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        );

      case 'delete':
        return (
          <div className="space-y-4">
            <div className="flex items-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <span className="font-medium">Delete Course</span>
            </div>
            
            <p className="text-gray-700">
              Are you sure you want to delete "{course.title}"? This action cannot be undone.
            </p>
            
            {course.totalEnrollments > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-yellow-800 font-medium">
                    Warning: This course has {course.totalEnrollments} active enrollments
                  </span>
                </div>
                <div className="mt-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={forceDelete}
                      onChange={(e) => setForceDelete(e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500 mr-2"
                    />
                    <span className="text-sm text-yellow-700">
                      Force delete (this will also delete all enrollments)
                    </span>
                  </label>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('delete', { forceDelete })}
                disabled={loading || (course.totalEnrollments > 0 && !forceDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Course'}
              </button>
            </div>
          </div>
        );

      case 'bulkDelete':
        return (
          <div className="space-y-4">
            <div className="flex items-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <span className="font-medium">Bulk Delete Courses</span>
            </div>
            
            <p className="text-gray-700">
              Are you sure you want to delete {selectedCount} selected courses? This action cannot be undone.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500 mr-2"
                />
                <span className="text-sm text-yellow-700">
                  Force delete (this will also delete any enrollments)
                </span>
              </label>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('bulkDelete', { forceDelete })}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : `Delete ${selectedCount} Courses`}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {type === 'view' && 'Course Details'}
            {type === 'analytics' && 'Course Analytics'}
            {type === 'edit' && 'Edit Course'}
            {type === 'delete' && 'Delete Course'}
            {type === 'bulkDelete' && 'Bulk Delete Courses'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          {renderModalContent()}
        </div>
        
        {(type === 'view' || type === 'analytics') && (
          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;