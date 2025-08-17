import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageCircle, 
  TrendingUp, 
  Filter, 
  Search, 
  Calendar, 
  User, 
  BookOpen, 
  ThumbsUp, 
  Flag, 
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  AlertTriangle,
  BarChart3,
  Shield,
  Clock,
  Users
} from 'lucide-react';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    sort: '-createdAt',
    approved: '',
    reported: '',
    course: '',
    rating: '',
    search: ''
  });
  const [actionLoading, setActionLoading] = useState({});
  const [stats, setStats] = useState({
    totalReviews: 0,
    pendingReviews: 0,
    reportedReviews: 0,
    averageRating: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [selectedReview, setSelectedReview] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const API_BASE_URL = 'http://localhost:5555/api';

  const getAuthToken = () => {
    return localStorage.getItem('userToken') || localStorage.getItem('token');
  };

  const checkAuthentication = () => {
    const token = getAuthToken();
    const userRole = localStorage.getItem('userRole');

    if (!token) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return false;
    }

    if (userRole !== 'admin') {
      setError('Access denied. Admin role required.');
      setLoading(false);
      return false;
    }

    return true;
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!checkAuthentication()) {
        return;
      }

      const token = getAuthToken();
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '') queryParams.append(key, value);
      });

      const response = await fetch(`${API_BASE_URL}/reviews/admin/all?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReviews(data.data.reviews);
        setPagination(data.data.pagination);
        calculateStats(data.data.reviews);
      } else {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
        } else if (response.status === 403) {
          setError('Access denied. Admin role required.');
        } else {
          setError(data.message || 'Failed to fetch reviews');
        }
      }
    } catch (err) {
      console.error('Fetch reviews error:', err);
      setError('Network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData) => {
    if (reviewsData.length === 0) {
      setStats({
        totalReviews: 0,
        pendingReviews: 0,
        reportedReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
      return;
    }

    const totalReviews = reviewsData.length;
    const pendingReviews = reviewsData.filter(review => !review.isApproved).length;
    const reportedReviews = reviewsData.filter(review => review.reportCount > 0).length;
    const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / totalReviews;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsData.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    setStats({
      totalReviews,
      pendingReviews,
      reportedReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    });
  };

  const handleApproveReview = async (reviewId, approved) => {
    try {
      setActionLoading(prev => ({ ...prev, [reviewId]: 'approve' }));
      const token = getAuthToken();

      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReviews(prev => prev.map(review => 
          review._id === reviewId ? { ...review, isApproved: approved } : review
        ));
        setError('');
      } else {
        setError(data.message || 'Failed to update review approval');
      }
    } catch (err) {
      console.error('Approval error:', err);
      setError('Network error occurred while updating review');
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: null }));
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [reviewId]: 'delete' }));
      const token = getAuthToken();

      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReviews(prev => prev.filter(review => review._id !== reviewId));
        setError('');
      } else {
        setError(data.message || 'Failed to delete review');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Network error occurred while deleting review');
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: null }));
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReviews();
  };

  const openDetailModal = (review) => {
    setSelectedReview(review);
    setShowDetailModal(true);
  };

  const getStatusBadge = (review) => {
    if (review.reportCount > 0) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Reported</span>;
    }
    if (!review.isApproved) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Pending</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Approved</span>;
  };

  const retryFetch = () => {
    fetchReviews();
  };

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  if (loading && reviews.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Reviews Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage and moderate all platform reviews</p>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {error}
              {error.includes('Network error') && (
                <button 
                  onClick={retryFetch}
                  className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Reviews</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalReviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingReviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Flag className="w-8 h-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Reported Reviews</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.reportedReviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.averageRating}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </form>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.approved}
                onChange={(e) => handleFilterChange('approved', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="true">Approved</option>
                <option value="false">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reports</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.reported}
                onChange={(e) => handleFilterChange('reported', e.target.value)}
              >
                <option value="">All Reviews</option>
                <option value="true">Reported Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select 
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
              >
                <option value="-createdAt">Newest First</option>
                <option value="createdAt">Oldest First</option>
                <option value="-rating">Highest Rating</option>
                <option value="rating">Lowest Rating</option>
                <option value="-reportCount">Most Reported</option>
              </select>
            </div>

            <div className="mt-4 sm:mt-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
              <select 
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Reviews Management</h2>
            {pagination.totalReviews > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {((pagination.currentPage - 1) * filters.limit) + 1} - {Math.min(pagination.currentPage * filters.limit, pagination.totalReviews)} of {pagination.totalReviews} reviews
              </p>
            )}
          </div>

          {reviews.length === 0 && !loading ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reviews.map((review) => (
                <div key={review._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {review.student?.firstName?.[0]}{review.student?.lastName?.[0]}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {review.student?.firstName} {review.student?.lastName}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center">
                            <BookOpen className="w-4 h-4 mr-1" />
                            {review.course?.title}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(review)}
                          {review.isVerified && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm text-gray-600">({review.rating}/5)</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-600">{formatDate(review.createdAt)}</span>
                      </div>

                      {review.title && (
                        <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
                      )}
                      
                      <p className="text-gray-700 mb-3 line-clamp-3">{review.comment}</p>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {review.helpfulVotes} helpful
                        </div>
                        {review.reportCount > 0 && (
                          <div className="flex items-center text-red-600">
                            <Flag className="w-4 h-4 mr-1" />
                            {review.reportCount} reports
                          </div>
                        )}
                        {review.replies?.length > 0 && (
                          <div className="flex items-center">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {review.replies.length} replies
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => openDetailModal(review)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>

                      {!review.isApproved ? (
                        <button
                          onClick={() => handleApproveReview(review._id, true)}
                          disabled={actionLoading[review._id] === 'approve'}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading[review._id] === 'approve' ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveReview(review._id, false)}
                          disabled={actionLoading[review._id] === 'approve'}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                        >
                          {actionLoading[review._id] === 'approve' ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          ) : (
                            <XCircle className="w-4 h-4 mr-1" />
                          )}
                          Unapprove
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteReview(review._id)}
                        disabled={actionLoading[review._id] === 'delete'}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading[review._id] === 'delete' ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                        ) : (
                          <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                      <span className="font-medium">{pagination.totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Review Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedReview.student?.firstName?.[0]}{selectedReview.student?.lastName?.[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {selectedReview.student?.firstName} {selectedReview.student?.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">{selectedReview.student?.email}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Course</h5>
                  <p className="text-gray-700">{selectedReview.course?.title}</p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    {renderStars(selectedReview.rating)}
                    <span className="ml-2 text-sm text-gray-600">({selectedReview.rating}/5)</span>
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(selectedReview.createdAt)}</span>
                  {getStatusBadge(selectedReview)}
                </div>

                {selectedReview.title && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">Title</h5>
                    <p className="text-gray-700">{selectedReview.title}</p>
                  </div>
                )}

                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Comment</h5>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedReview.comment}</p>
                </div>

                {(selectedReview.pros?.length > 0 || selectedReview.cons?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedReview.pros?.length > 0 && (
                      <div>
                        <h5 className="font-medium text-green-700 mb-2">Pros</h5>
                        <ul className="space-y-1">
                          {selectedReview.pros.map((pro, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedReview.cons?.length > 0 && (
                      <div>
                        <h5 className="font-medium text-red-700 mb-2">Cons</h5>
                        <ul className="space-y-1">
                          {selectedReview.cons.map((con, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start">
                              <span className="text-red-500 mr-2">•</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    {selectedReview.helpfulVotes} helpful votes
                  </div>
                  {selectedReview.reportCount > 0 && (
                    <div className="flex items-center text-red-600">
                      <Flag className="w-4 h-4 mr-1" />
                      {selectedReview.reportCount} reports
                    </div>
                  )}
                  {selectedReview.isVerified && (
                    <div className="flex items-center text-blue-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verified purchase
                    </div>
                  )}
                </div>

                {/* Replies Section */}
                {selectedReview.replies && selectedReview.replies.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Replies ({selectedReview.replies.length})</h5>
                    <div className="space-y-3">
                      {selectedReview.replies.map((reply) => (
                        <div key={reply._id} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {reply.user.firstName} {reply.user.lastName}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {reply.user.role}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">{formatDate(reply.createdAt)}</span>
                          </div>
                          <p className="text-gray-700">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                  {!selectedReview.isApproved ? (
                    <button
                      onClick={() => {
                        handleApproveReview(selectedReview._id, true);
                        setShowDetailModal(false);
                      }}
                      disabled={actionLoading[selectedReview._id] === 'approve'}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading[selectedReview._id] === 'approve' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve Review
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleApproveReview(selectedReview._id, false);
                        setShowDetailModal(false);
                      }}
                      disabled={actionLoading[selectedReview._id] === 'approve'}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {actionLoading[selectedReview._id] === 'approve' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Unapprove Review
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleDeleteReview(selectedReview._id);
                      setShowDetailModal(false);
                    }}
                    disabled={actionLoading[selectedReview._id] === 'delete'}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading[selectedReview._id] === 'delete' ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete Review
                  </button>

                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;