import React, { useState, useEffect } from 'react';
import { Star, MessageCircle, TrendingUp, Filter, Search, Calendar, User, BookOpen, ThumbsUp, Flag } from 'lucide-react';

const InstructorReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    sort: '-createdAt',
    course: '',
    rating: ''
  });
  const [replyText, setReplyText] = useState({});
  const [replyLoading, setReplyLoading] = useState({});
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  const API_BASE_URL = 'http://localhost:5555/api';

  // FIXED: Get auth token from localStorage with correct key
  const getAuthToken = () => {
    // Try both possible keys for backward compatibility
    return localStorage.getItem('userToken') || localStorage.getItem('token');
  };

  // FIXED: Check if user is authenticated and has correct role
  const checkAuthentication = () => {
    const token = getAuthToken();
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('userData');

    console.log('Auth check:', { token: !!token, userRole, userData: !!userData });

    if (!token) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return false;
    }

    if (userRole !== 'instructor') {
      setError('Access denied. Instructor role required.');
      setLoading(false);
      return false;
    }

    return true;
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      // Check authentication first
      if (!checkAuthentication()) {
        return;
      }

      const token = getAuthToken();
      
      console.log('Fetching reviews with token:', !!token);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`${API_BASE_URL}/reviews/instructor/my-courses?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.success) {
        setReviews(data.data.reviews);
        setPagination(data.data.pagination);
        calculateStats(data.data.reviews);
      } else {
        // Handle different error scenarios
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          // Optionally clear localStorage and redirect to login
          localStorage.removeItem('userToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userData');
        } else if (response.status === 403) {
          setError('Access denied. Instructor role required.');
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
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
      return;
    }

    const totalReviews = reviewsData.length;
    const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / totalReviews;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsData.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    setStats({
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    });
  };

  const handleReply = async (reviewId) => {
    if (!replyText[reviewId]?.trim()) return;

    try {
      setReplyLoading(prev => ({ ...prev, [reviewId]: true }));
      const token = getAuthToken();

      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: replyText[reviewId] })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the review in state
        setReviews(prev => prev.map(review => 
          review._id === reviewId ? data.data.review : review
        ));
        setReplyText(prev => ({ ...prev, [reviewId]: '' }));
        setError(''); // Clear any previous errors
      } else {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
        } else {
          setError(data.message || 'Failed to add reply');
        }
      }
    } catch (err) {
      console.error('Reply error:', err);
      setError('Network error occurred while adding reply');
    } finally {
      setReplyLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`star ${index < rating ? 'filled' : 'empty'}`}
        size={16}
      />
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // FIXED: Add retry function for failed requests
  const retryFetch = () => {
    fetchReviews();
  };

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  // FIXED: Better loading state that shows authentication status
  if (loading && reviews.length === 0) {
    return (
      <div className="dashboard-container">
        <style jsx>{`
          .dashboard-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            min-height: 100vh;
          }
          .loading-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
            color: #64748b;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading instructor reviews...</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Verifying authentication and fetching data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <style jsx>{`
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
        }

        .header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 30px;
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
          margin: 0;
          color: #1e293b;
          font-size: 28px;
          font-weight: 700;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 15px;
          padding: 12px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 5px;
        }

        .stat-label {
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
        }

        .rating-distribution {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rating-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
        }

        .rating-bar-fill {
          flex: 1;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .rating-bar-progress {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s ease;
        }

        .filters-section {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          align-items: end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .filter-input, .filter-select {
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        .filter-input:focus, .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .reviews-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .reviews-header {
          padding: 25px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .reviews-title {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .review-card {
          padding: 25px;
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.2s ease;
        }

        .review-card:hover {
          background-color: #f8fafc;
        }

        .review-card:last-child {
          border-bottom: none;
        }

        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .review-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 18px;
        }

        .user-info h4 {
          margin: 0 0 4px 0;
          color: #1e293b;
          font-weight: 600;
        }

        .user-info p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .review-meta {
          text-align: right;
          color: #64748b;
          font-size: 12px;
        }

        .review-rating {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 15px;
        }

        .star {
          color: #d1d5db;
        }

        .star.filled {
          color: #fbbf24;
        }

        .rating-text {
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
        }

        .review-content {
          margin-bottom: 20px;
        }

        .review-title {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
          font-size: 16px;
        }

        .review-comment {
          color: #4b5563;
          line-height: 1.6;
          margin-bottom: 15px;
        }

        .review-pros-cons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .pros-cons-section h5 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .pros-cons-section.pros h5 {
          color: #059669;
        }

        .pros-cons-section.cons h5 {
          color: #dc2626;
        }

        .pros-cons-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .pros-cons-list li {
          padding: 4px 0;
          font-size: 14px;
          color: #4b5563;
        }

        .pros-cons-list li:before {
          content: "• ";
          font-weight: bold;
          margin-right: 8px;
        }

        .pros-cons-section.pros li:before {
          color: #059669;
        }

        .pros-cons-section.cons li:before {
          color: #dc2626;
        }

        .review-actions {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .action-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 12px;
        }

        .verified-badge {
          background: #dcfce7;
          color: #166534;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .replies-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
        }

        .reply-item {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 10px;
          border-left: 3px solid #3b82f6;
        }

        .reply-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .reply-author {
          font-weight: 600;
          color: #1e293b;
          font-size: 14px;
        }

        .reply-role {
          background: #3b82f6;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }

        .reply-date {
          color: #64748b;
          font-size: 12px;
        }

        .reply-message {
          color: #4b5563;
          line-height: 1.5;
          font-size: 14px;
        }

        .reply-form {
          margin-top: 15px;
        }

        .reply-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        .reply-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .reply-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #64748b;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          padding: 25px;
          border-top: 1px solid #e5e7eb;
        }

        .pagination-info {
          color: #64748b;
          font-size: 14px;
          margin: 0 20px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .empty-state h3 {
          margin: 0 0 10px 0;
          color: #374151;
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          border: 1px solid #fecaca;
        }

        .error-message button {
          margin-top: 10px;
          background: #dc2626;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .error-message button:hover {
          background: #b91c1c;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          color: #64748b;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 15px;
          }

          .header {
            padding: 20px;
          }

          .header h1 {
            font-size: 24px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .review-pros-cons {
            grid-template-columns: 1fr;
          }

          .review-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .pagination {
            flex-wrap: wrap;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <h1>Course Reviews Dashboard</h1>
      </div>

      {/* FIXED: Enhanced error display with retry option */}
      {error && (
        <div className="error-message">
          {error}
          {error.includes('Network error') && (
            <button onClick={retryFetch}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <MessageCircle size={24} />
          </div>
          <div className="stat-value">{stats.totalReviews}</div>
          <div className="stat-label">Total Reviews</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Star size={24} />
          </div>
          <div className="stat-value">{stats.averageRating}</div>
          <div className="stat-label">Average Rating</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-value">Rating Distribution</div>
          <div className="rating-distribution">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="rating-bar">
                <span>{rating}★</span>
                <div className="rating-bar-fill">
                  <div 
                    className="rating-bar-progress" 
                    style={{ 
                      width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[rating] / stats.totalReviews) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <span>{stats.ratingDistribution[rating]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-grid">
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
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Filter by Rating</label>
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

          <div className="filter-group">
            <label className="filter-label">Reviews per page</label>
            <select 
              className="filter-select"
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', e.target.value)}
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <div className="reviews-header">
          <h2 className="reviews-title">Course Reviews</h2>
          {pagination.totalReviews > 0 && (
            <span className="pagination-info">
              Showing {((pagination.currentPage - 1) * filters.limit) + 1} - {Math.min(pagination.currentPage * filters.limit, pagination.totalReviews)} of {pagination.totalReviews} reviews
            </span>
          )}
        </div>

        {reviews.length === 0 && !loading && !error ? (
          <div className="empty-state">
            <MessageCircle size={48} />
            <h3>No reviews yet</h3>
            <p>Your course reviews will appear here once students start reviewing your courses.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="review-card">
              <div className="review-header">
                <div className="review-user">
                  <div className="user-avatar">
                    {review.student.avatar ? (
                      <img src={review.student.avatar} alt="Avatar" style={{width: '100%', height: '100%', borderRadius: '50%'}} />
                    ) : (
                      `${review.student.firstName[0]}${review.student.lastName[0]}`
                    )}
                  </div>
                  <div className="user-info">
                    <h4>{review.student.firstName} {review.student.lastName}</h4>
                    <p>
                      <BookOpen size={12} style={{display: 'inline', marginRight: '4px'}} />
                      {review.course.title}
                    </p>
                  </div>
                </div>
                <div className="review-meta">
                  <Calendar size={12} style={{display: 'inline', marginRight: '4px'}} />
                  {formatDate(review.createdAt)}
                </div>
              </div>

              <div className="review-rating">
                {renderStars(review.rating)}
                <span className="rating-text">({review.rating}/5)</span>
                {review.isVerified && (
                  <span className="verified-badge">Verified Purchase</span>
                )}
              </div>

              <div className="review-content">
                {review.title && (
                  <div className="review-title">{review.title}</div>
                )}
                <div className="review-comment">{review.comment}</div>

                {(review.pros.length > 0 || review.cons.length > 0) && (
                  <div className="review-pros-cons">
                    {review.pros.length > 0 && (
                      <div className="pros-cons-section pros">
                        <h5>Pros:</h5>
                        <ul className="pros-cons-list">
                          {review.pros.map((pro, index) => (
                            <li key={index}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {review.cons.length > 0 && (
                      <div className="pros-cons-section cons">
                        <h5>Cons:</h5>
                        <ul className="pros-cons-list">
                          {review.cons.map((con, index) => (
                            <li key={index}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="review-actions">
                <div className="action-item">
                  <ThumbsUp size={12} />
                  {review.helpfulVotes} helpful
                </div>
                {review.reportCount > 0 && (
                  <div className="action-item">
                    <Flag size={12} />
                    {review.reportCount} reports
                  </div>
                )}
              </div>

              {/* Replies Section */}
              {review.replies && review.replies.length > 0 && (
                <div className="replies-section">
                  {review.replies.map((reply) => (
                    <div key={reply._id} className="reply-item">
                      <div className="reply-header">
                        <div>
                          <span className="reply-author">
                            {reply.user.firstName} {reply.user.lastName}
                          </span>
                          <span className="reply-role">{reply.user.role}</span>
                        </div>
                        <span className="reply-date">{formatDate(reply.createdAt)}</span>
                      </div>
                      <div className="reply-message">{reply.message}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              <div className="reply-form">
                <textarea
                  className="reply-textarea"
                  placeholder="Write a reply to this review..."
                  value={replyText[review._id] || ''}
                  onChange={(e) => setReplyText(prev => ({
                    ...prev,
                    [review._id]: e.target.value
                  }))}
                />
                <div className="reply-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setReplyText(prev => ({
                      ...prev,
                      [review._id]: ''
                    }))}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleReply(review._id)}
                    disabled={!replyText[review._id]?.trim() || replyLoading[review._id]}
                  >
                    {replyLoading[review._id] ? (
                      <>
                        <div className="spinner" style={{width: '16px', height: '16px', marginRight: '8px'}}></div>
                        Replying...
                      </>
                    ) : (
                      <>
                        <MessageCircle size={16} />
                        Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrev}
            >
              Previous
            </button>
            
            <span className="pagination-info">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            
            <button
              className="btn btn-secondary"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNext}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorReviews;