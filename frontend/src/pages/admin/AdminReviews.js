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
import './AdminReviews.css';

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
        className={`star ${index < rating ? 'filled' : 'empty'}`}
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
      return <span className="badge reported">Reported</span>;
    }
    if (!review.isApproved) {
      return <span className="badge pending">Pending</span>;
    }
    return <span className="badge approved">Approved</span>;
  };

  const retryFetch = () => {
    fetchReviews();
  };

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  if (loading && reviews.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading admin reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-reviews">
      <div className="container">
        {/* Header */}
        <div className="header-card">
          <div className="header-content">
            <div>
              <h1 className="header-title">Admin Reviews Dashboard</h1>
              <p className="header-subtitle">Manage and moderate all platform reviews</p>
            </div>
            <div className="header-icon">
              <Shield className="shield-icon" />
            </div>
          </div>
        </div>

        {error && (
          <div className="error-alert">
            <div className="error-content">
              <AlertTriangle className="error-icon" />
              {error}
              {error.includes('Network error') && (
                <button 
                  onClick={retryFetch}
                  className="retry-button"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon-container">
                <MessageCircle className="stat-icon blue" />
              </div>
              <div className="stat-details">
                <p className="stat-label">Total Reviews</p>
                <p className="stat-value">{stats.totalReviews}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon-container">
                <Clock className="stat-icon yellow" />
              </div>
              <div className="stat-details">
                <p className="stat-label">Pending Reviews</p>
                <p className="stat-value">{stats.pendingReviews}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon-container">
                <Flag className="stat-icon red" />
              </div>
              <div className="stat-details">
                <p className="stat-label">Reported Reviews</p>
                <p className="stat-value">{stats.reportedReviews}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon-container">
                <Star className="stat-icon yellow-star" />
              </div>
              <div className="stat-details">
                <p className="stat-label">Average Rating</p>
                <p className="stat-value">{stats.averageRating}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-card">
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Search</label>
              <form onSubmit={handleSearch} className="search-form">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  className="search-input"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </form>
            </div>

            <div className="filter-group">
              <label className="filter-label">Status</label>
              <select 
                className="filter-select"
                value={filters.approved}
                onChange={(e) => handleFilterChange('approved', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="true">Approved</option>
                <option value="false">Pending</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Reports</label>
              <select 
                className="filter-select"
                value={filters.reported}
                onChange={(e) => handleFilterChange('reported', e.target.value)}
              >
                <option value="">All Reviews</option>
                <option value="true">Reported Only</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Rating</label>
              <select 
                className="filter-select"
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

          <div className="filters-bottom">
            <div className="filter-group">
              <label className="filter-label">Sort by</label>
              <select 
                className="filter-select"
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

            <div className="filter-group">
              <label className="filter-label">Per Page</label>
              <select 
                className="filter-select"
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
        <div className="reviews-card">
          <div className="reviews-header">
            <h2 className="reviews-title">Reviews Management</h2>
            {pagination.totalReviews > 0 && (
              <p className="reviews-count">
                Showing {((pagination.currentPage - 1) * filters.limit) + 1} - {Math.min(pagination.currentPage * filters.limit, pagination.totalReviews)} of {pagination.totalReviews} reviews
              </p>
            )}
          </div>

          {reviews.length === 0 && !loading ? (
            <div className="empty-state">
              <MessageCircle className="empty-icon" />
              <h3 className="empty-title">No reviews found</h3>
              <p className="empty-description">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review._id} className="review-item">
                  <div className="review-content">
                    <div className="review-main">
                      <div className="review-header">
                        <div className="review-avatar">
                          {review.student?.firstName?.[0]}{review.student?.lastName?.[0]}
                        </div>
                        <div className="review-user-info">
                          <h4>
                            {review.student?.firstName} {review.student?.lastName}
                          </h4>
                          <p className="review-course">
                            <BookOpen className="review-course-icon" />
                            {review.course?.title}
                          </p>
                        </div>
                        <div className="review-badges">
                          {getStatusBadge(review)}
                          {review.isVerified && (
                            <span className="badge verified">
                              Verified
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="review-rating">
                        <div className="stars">
                          {renderStars(review.rating)}
                        </div>
                        <span className="rating-text">({review.rating}/5)</span>
                        <span className="rating-text">•</span>
                        <span className="rating-text">{formatDate(review.createdAt)}</span>
                      </div>

                      {review.title && (
                        <h5 className="review-title">{review.title}</h5>
                      )}
                      
                      <p className="review-comment">{review.comment}</p>

                      <div className="review-stats">
                        <div className="review-stat">
                          <ThumbsUp className="review-stat-icon" />
                          {review.helpfulVotes} helpful
                        </div>
                        {review.reportCount > 0 && (
                          <div className="review-stat reported">
                            <Flag className="review-stat-icon" />
                            {review.reportCount} reports
                          </div>
                        )}
                        {review.replies?.length > 0 && (
                          <div className="review-stat">
                            <MessageCircle className="review-stat-icon" />
                            {review.replies.length} replies
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="review-actions">
                      <button
                        onClick={() => openDetailModal(review)}
                        className="action-button view"
                      >
                        <Eye className="action-icon" />
                        View
                      </button>

                      {!review.isApproved ? (
                        <button
                          onClick={() => handleApproveReview(review._id, true)}
                          disabled={actionLoading[review._id] === 'approve'}
                          className="action-button approve"
                        >
                          {actionLoading[review._id] === 'approve' ? (
                            <div className="action-spinner"></div>
                          ) : (
                            <CheckCircle className="action-icon" />
                          )}
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveReview(review._id, false)}
                          disabled={actionLoading[review._id] === 'approve'}
                          className="action-button unapprove"
                        >
                          {actionLoading[review._id] === 'approve' ? (
                            <div className="action-spinner"></div>
                          ) : (
                            <XCircle className="action-icon" />
                          )}
                          Unapprove
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteReview(review._id)}
                        disabled={actionLoading[review._id] === 'delete'}
                        className="action-button delete"
                      >
                        {actionLoading[review._id] === 'delete' ? (
                          <div className="action-spinner"></div>
                        ) : (
                          <Trash2 className="action-icon" />
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
            <div className="pagination">
              <div className="pagination-content">
                <div className="pagination-mobile">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="pagination-button prev"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="pagination-button next"
                  >
                    Next
                  </button>
                </div>
                <div className="pagination-desktop">
                  <div>
                    <p className="pagination-info">
                      Showing page <span>{pagination.currentPage}</span> of{' '}
                      <span>{pagination.totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="pagination-controls">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="pagination-button prev"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="pagination-button next"
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
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Review Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="modal-close"
                >
                  <XCircle className="modal-close-icon" />
                </button>
              </div>

              <div className="modal-body">
                <div className="modal-user">
                  <div className="modal-avatar">
                    {selectedReview.student?.firstName?.[0]}{selectedReview.student?.lastName?.[0]}
                  </div>
                  <div className="modal-user-info">
                    <h4>
                      {selectedReview.student?.firstName} {selectedReview.student?.lastName}
                    </h4>
                    <p>{selectedReview.student?.email}</p>
                  </div>
                </div>

                <div className="modal-section">
                  <h5 className="modal-section-title">Course</h5>
                  <p className="modal-section-content">{selectedReview.course?.title}</p>
                </div>

                <div className="modal-rating">
                  <div className="stars">
                    {renderStars(selectedReview.rating)}
                    <span className="rating-text">({selectedReview.rating}/5)</span>
                  </div>
                  <span className="rating-text">{formatDate(selectedReview.createdAt)}</span>
                  {getStatusBadge(selectedReview)}
                </div>

                {selectedReview.title && (
                  <div className="modal-section">
                    <h5 className="modal-section-title">Title</h5>
                    <p className="modal-section-content">{selectedReview.title}</p>
                  </div>
                )}

                <div className="modal-section">
                  <h5 className="modal-section-title">Comment</h5>
                  <p className="modal-section-content">{selectedReview.comment}</p>
                </div>

                {(selectedReview.pros?.length > 0 || selectedReview.cons?.length > 0) && (
                  <div className="modal-pros-cons">
                    {selectedReview.pros?.length > 0 && (
                      <div className="pros-section">
                        <h5>Pros</h5>
                        <ul className="pros-list">
                          {selectedReview.pros.map((pro, index) => (
                            <li key={index} className="pros-item">
                              <span className="pros-bullet">•</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedReview.cons?.length > 0 && (
                      <div className="cons-section">
                        <h5>Cons</h5>
                        <ul className="cons-list">
                          {selectedReview.cons.map((con, index) => (
                            <li key={index} className="cons-item">
                              <span className="cons-bullet">•</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="modal-stats">
                  <div className="modal-stat">
                    <ThumbsUp className="review-stat-icon" />
                    {selectedReview.helpfulVotes} helpful votes
                  </div>
                  {selectedReview.reportCount > 0 && (
                    <div className="modal-stat reported">
                      <Flag className="review-stat-icon" />
                      {selectedReview.reportCount} reports
                    </div>
                  )}
                  {selectedReview.isVerified && (
                    <div className="modal-stat verified">
                      <CheckCircle className="review-stat-icon" />
                      Verified purchase
                    </div>
                  )}
                </div>

                {/* Replies Section */}
                {selectedReview.replies && selectedReview.replies.length > 0 && (
                  <div className="modal-replies">
                    <h5 className="modal-replies-title">Replies ({selectedReview.replies.length})</h5>
                    <div className="replies-list">
                      {selectedReview.replies.map((reply) => (
                        <div key={reply._id} className="reply-item">
                          <div className="reply-header">
                            <div className="reply-user">
                              <span className="reply-user-name">
                                {reply.user.firstName} {reply.user.lastName}
                              </span>
                              <span className="reply-role">
                                {reply.user.role}
                              </span>
                            </div>
                            <span className="reply-date">{formatDate(reply.createdAt)}</span>
                          </div>
                          <p className="reply-message">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="modal-actions">
                  {!selectedReview.isApproved ? (
                    <button
                      onClick={() => {
                        handleApproveReview(selectedReview._id, true);
                        setShowDetailModal(false);
                      }}
                      disabled={actionLoading[selectedReview._id] === 'approve'}
                      className="modal-action-button approve"
                    >
                      {actionLoading[selectedReview._id] === 'approve' ? (
                        <div className="modal-action-spinner"></div>
                      ) : (
                        <CheckCircle className="modal-action-icon" />
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
                      className="modal-action-button unapprove"
                    >
                      {actionLoading[selectedReview._id] === 'approve' ? (
                        <div className="modal-action-spinner"></div>
                      ) : (
                        <XCircle className="modal-action-icon" />
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
                    className="modal-action-button delete"
                  >
                    {actionLoading[selectedReview._id] === 'delete' ? (
                      <div className="modal-action-spinner"></div>
                    ) : (
                      <Trash2 className="modal-action-icon" />
                    )}
                    Delete Review
                  </button>

                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="modal-action-button close"
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