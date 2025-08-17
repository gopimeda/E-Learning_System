import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Edit3, 
  Trash2, 
  Plus, 
  Save, 
  X, 
  ThumbsUp, 
  MessageCircle,
  Calendar,
  BookOpen,
  Award,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('my-reviews');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingReview, setEditingReview] = useState(null);

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
    pros: [''],
    cons: ['']
  });

  const API_BASE_URL = 'http://localhost:5555/api';

  useEffect(() => {
    fetchUserReviews();
    fetchEnrolledCourses();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('userToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchUserReviews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/my-reviews`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to fetch your reviews');
    }
  };

  const fetchEnrolledCourses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/enrollments`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        const reviewableCourses = data.data.enrollments
          .filter(enrollment => 
            ['active', 'completed'].includes(enrollment.status) &&
            enrollment.course
          )
          .map(enrollment => enrollment.course);
        
        setEnrolledCourses(reviewableCourses);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      setError('Failed to fetch enrolled courses');
      setLoading(false);
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    
    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          courseId: selectedCourse._id,
          rating: reviewForm.rating,
          title: reviewForm.title.trim(),
          comment: reviewForm.comment.trim(),
          pros: reviewForm.pros.filter(pro => pro.trim().length > 0),
          cons: reviewForm.cons.filter(con => con.trim().length > 0)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setReviews([data.data.review, ...reviews]);
        setShowCreateModal(false);
        resetReviewForm();
        setError('');
      } else {
        setError(data.message || 'Failed to create review');
      }
    } catch (error) {
      console.error('Error creating review:', error);
      setError('Failed to create review');
    }
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();
    
    if (!editingReview) return;

    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${editingReview._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rating: reviewForm.rating,
          title: reviewForm.title.trim(),
          comment: reviewForm.comment.trim(),
          pros: reviewForm.pros.filter(pro => pro.trim().length > 0),
          cons: reviewForm.cons.filter(con => con.trim().length > 0)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedReviews = reviews.map(review =>
          review._id === editingReview._id ? data.data.review : review
        );
        setReviews(updatedReviews);
        setEditingReview(null);
        resetReviewForm();
        setError('');
      } else {
        setError(data.message || 'Failed to update review');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      setError('Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      
      if (data.success) {
        setReviews(reviews.filter(review => review._id !== reviewId));
        setError('');
      } else {
        setError(data.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      setError('Failed to delete review');
    }
  };

  const resetReviewForm = () => {
    setReviewForm({
      rating: 5,
      title: '',
      comment: '',
      pros: [''],
      cons: ['']
    });
    setSelectedCourse(null);
  };

  const startEdit = (review) => {
    setEditingReview(review);
    setReviewForm({
      rating: review.rating,
      title: review.title || '',
      comment: review.comment,
      pros: review.pros.length > 0 ? review.pros : [''],
      cons: review.cons.length > 0 ? review.cons : ['']
    });
  };

  const cancelEdit = () => {
    setEditingReview(null);
    resetReviewForm();
  };

  const updateProsCons = (type, index, value) => {
    const updatedArray = [...reviewForm[type]];
    updatedArray[index] = value;
    setReviewForm(prev => ({ ...prev, [type]: updatedArray }));
  };

  const addProsCons = (type) => {
    setReviewForm(prev => ({ 
      ...prev, 
      [type]: [...prev[type], ''] 
    }));
  };

  const removeProsCons = (type, index) => {
    if (reviewForm[type].length > 1) {
      const updatedArray = reviewForm[type].filter((_, i) => i !== index);
      setReviewForm(prev => ({ ...prev, [type]: updatedArray }));
    }
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`star-icon ${
              star <= rating 
                ? 'star-filled' 
                : 'star-empty'
            } ${interactive ? 'star-interactive' : ''}`}
            onClick={interactive ? () => onRatingChange(star) : undefined}
          />
        ))}
        <span className="star-rating-text">({rating}/5)</span>
      </div>
    );
  };

  const getCoursesAvailableForReview = () => {
    const reviewedCourseIds = reviews.map(review => review.course._id);
    return enrolledCourses.filter(course => !reviewedCourseIds.includes(course._id));
  };

  if (loading) {
    return (
      <div className="reviews-loading">
        <div className="loading-content">
          <div className="loading-pulse">
            <div className="loading-line-large"></div>
            <div className="loading-line-medium"></div>
            <div className="loading-boxes">
              <div className="loading-box"></div>
              <div className="loading-box"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .reviews-container {
          min-height: 100vh;
          background: #f8f9fa;
          padding: 32px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .reviews-content {
          max-width: 900px;
          margin: 0 auto;
        }

        .reviews-header {
          margin-bottom: 32px;
        }

        .reviews-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .reviews-header p {
          color: #666;
          font-size: 16px;
        }

        .error-message {
          margin-bottom: 24px;
          padding: 16px;
          background: #fff0f0;
          border: 1px solid #ffd6d6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-message span {
          color: #d32f2f;
        }

        .error-message button {
          margin-left: auto;
          color: #d32f2f;
        }

        .tabs-container {
          margin-bottom: 24px;
          border-bottom: 1px solid #e0e0e0;
        }

        .tabs-nav {
          display: flex;
          gap: 32px;
        }

        .tab-button {
          padding: 16px 8px;
          font-weight: 500;
          font-size: 14px;
          border-bottom: 2px solid transparent;
          color: #666;
          transition: all 0.2s ease;
        }

        .tab-button:hover {
          color: #333;
        }

        .tab-button.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .review-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid #eaeaea;
          padding: 24px;
          margin-bottom: 24px;
        }

        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .review-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .stars-container {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .star-icon {
          width: 20px;
          height: 20px;
        }

        .star-filled {
          color: #f59e0b;
          fill: currentColor;
        }

        .star-empty {
          color: #d1d5db;
        }

        .star-interactive {
          cursor: pointer;
        }

        .star-interactive:hover {
          color: #f59e0b;
        }

        .star-rating-text {
          margin-left: 8px;
          font-size: 14px;
          color: #666;
        }

        .review-actions {
          display: flex;
          gap: 8px;
        }

        .review-actions button {
          color: #9ca3af;
          transition: color 0.2s ease;
        }

        .review-actions button:hover {
          color: #2563eb;
        }

        .review-actions button.delete:hover {
          color: #dc2626;
        }

        .review-body {
          margin-bottom: 16px;
        }

        .review-comment {
          color: #333;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .pros-cons-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (min-width: 768px) {
          .pros-cons-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .pros-list, .cons-list {
          padding: 12px;
          border-radius: 8px;
        }

        .pros-list {
          background: #f0fdf4;
        }

        .cons-list {
          background: #fff7ed;
        }

        .pros-title {
          color: #166534;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .cons-title {
          color: #9a3412;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .pros-item, .cons-item {
          font-size: 14px;
          display: flex;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .pros-item {
          color: #166534;
        }

        .cons-item {
          color: #9a3412;
        }

        .review-meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          color: #666;
          border-top: 1px solid #eee;
          padding-top: 12px;
        }

        .meta-left {
          display: flex;
          gap: 16px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .meta-updated {
          font-size: 12px;
          color: #999;
        }

        .empty-state {
          text-align: center;
          padding: 48px 0;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          color: #d1d5db;
          margin: 0 auto 16px;
        }

        .empty-title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .empty-description {
          color: #666;
          margin-bottom: 16px;
        }

        .primary-button {
          background: #2563eb;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          transition: background 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .primary-button:hover {
          background: #1d4ed8;
        }

        .secondary-button {
          background: #f3f4f6;
          color: #333;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .secondary-button:hover {
          background: #e5e7eb;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-textarea {
          min-height: 120px;
          resize: vertical;
        }

        .char-count {
          text-align: right;
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .pros-cons-input-container {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .pros-cons-input {
          flex: 1;
        }

        .add-button {
          color: #2563eb;
          font-weight: 500;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        /* Loading styles */
        .reviews-loading {
          min-height: 100vh;
          background: #f8f9fa;
          padding: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-content {
          max-width: 900px;
          width: 100%;
        }

        .loading-pulse {
          width: 100%;
        }

        .loading-line-large {
          height: 32px;
          background: #e5e7eb;
          border-radius: 4px;
          width: 33%;
          margin-bottom: 16px;
        }

        .loading-line-medium {
          height: 16px;
          background: #e5e7eb;
          border-radius: 4px;
          width: 50%;
          margin-bottom: 32px;
        }

        .loading-boxes {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .loading-box {
          height: 128px;
          background: #e5e7eb;
          border-radius: 8px;
        }

        /* Verified badge */
        .verified-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          background: #dcfce7;
          color: #166534;
        }

        /* Select input */
        .form-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }
      `}</style>

      <div className="reviews-container">
        <div className="reviews-content">
          {/* Header */}
          <div className="reviews-header">
            <h1>My Reviews</h1>
            <p>Manage your course reviews and feedback</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button onClick={() => setError('')}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs-container">
            <nav className="tabs-nav">
              <button
                onClick={() => setActiveTab('my-reviews')}
                className={`tab-button ${activeTab === 'my-reviews' ? 'active' : ''}`}
              >
                My Reviews ({reviews.length})
              </button>
              <button
                onClick={() => setActiveTab('write-review')}
                className={`tab-button ${activeTab === 'write-review' ? 'active' : ''}`}
              >
                Write Review
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'my-reviews' && (
            <div>
              {reviews.length === 0 ? (
                <div className="empty-state">
                  <MessageCircle className="empty-icon" />
                  <h3 className="empty-title">No Reviews Yet</h3>
                  <p className="empty-description">You haven't written any course reviews yet.</p>
                  <button
                    onClick={() => setActiveTab('write-review')}
                    className="primary-button"
                  >
                    Write Your First Review
                  </button>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review._id} className="review-card">
                    {editingReview && editingReview._id === review._id ? (
                      /* Edit Form */
                      <form onSubmit={handleUpdateReview}>
                        <div className="review-header">
                          <h3 className="review-title">Edit Review</h3>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Rating</label>
                          {renderStars(reviewForm.rating, true, (rating) => 
                            setReviewForm(prev => ({ ...prev, rating }))
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Title (Optional)</label>
                          <input
                            type="text"
                            value={reviewForm.title}
                            onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                            className="form-input"
                            placeholder="Brief title for your review"
                            maxLength="100"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Review *</label>
                          <textarea
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                            className="form-input form-textarea"
                            rows="4"
                            placeholder="Share your experience with this course..."
                            maxLength="1000"
                            required
                          />
                          <div className="char-count">
                            {reviewForm.comment.length}/1000
                          </div>
                        </div>

                        {/* Pros */}
                        <div className="form-group">
                          <label className="form-label">What you liked (Pros)</label>
                          {reviewForm.pros.map((pro, index) => (
                            <div key={index} className="pros-cons-input-container">
                              <input
                                type="text"
                                value={pro}
                                onChange={(e) => updateProsCons('pros', index, e.target.value)}
                                className="form-input pros-cons-input"
                                placeholder="What did you like about this course?"
                                maxLength="200"
                              />
                              {reviewForm.pros.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeProsCons('pros', index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addProsCons('pros')}
                            className="add-button"
                          >
                            <Plus className="w-4 h-4" />
                            Add another pro
                          </button>
                        </div>

                        {/* Cons */}
                        <div className="form-group">
                          <label className="form-label">Areas for improvement (Cons)</label>
                          {reviewForm.cons.map((con, index) => (
                            <div key={index} className="pros-cons-input-container">
                              <input
                                type="text"
                                value={con}
                                onChange={(e) => updateProsCons('cons', index, e.target.value)}
                                className="form-input pros-cons-input"
                                placeholder="What could be improved?"
                                maxLength="200"
                              />
                              {reviewForm.cons.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeProsCons('cons', index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addProsCons('cons')}
                            className="add-button"
                          >
                            <Plus className="w-4 h-4" />
                            Add another con
                          </button>
                        </div>

                        <div className="form-actions">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="secondary-button"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="primary-button"
                          >
                            <Save className="w-4 h-4" />
                            Update Review
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Review Display */
                      <div>
                        <div className="review-header">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="review-title">
                                {review.course?.title}
                              </h3>
                              {review.isVerified && (
                                <span className="verified-badge">
                                  <Award className="w-3 h-3 mr-1" />
                                  Verified
                                </span>
                              )}
                            </div>
                            {renderStars(review.rating)}
                          </div>
                          <div className="review-actions">
                            <button
                              onClick={() => startEdit(review)}
                              title="Edit review"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteReview(review._id)}
                              className="delete"
                              title="Delete review"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {review.title && (
                          <h4 className="review-title text-md mb-2">
                            {review.title}
                          </h4>
                        )}

                        <p className="review-comment">
                          {review.comment}
                        </p>

                        {/* Pros and Cons */}
                        {(review.pros?.length > 0 || review.cons?.length > 0) && (
                          <div className="pros-cons-grid">
                            {review.pros?.length > 0 && (
                              <div className="pros-list">
                                <h5 className="pros-title">Pros:</h5>
                                <ul>
                                  {review.pros.map((pro, index) => (
                                    <li key={index} className="pros-item">
                                      <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                      {pro}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {review.cons?.length > 0 && (
                              <div className="cons-list">
                                <h5 className="cons-title">Cons:</h5>
                                <ul>
                                  {review.cons.map((con, index) => (
                                    <li key={index} className="cons-item">
                                      <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                      {con}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Review Meta */}
                        <div className="review-meta">
                          <div className="meta-left">
                            <span className="meta-item">
                              <Calendar className="w-4 h-4" />
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                            {review.helpfulVotes > 0 && (
                              <span className="meta-item">
                                <ThumbsUp className="w-4 h-4" />
                                {review.helpfulVotes} helpful
                              </span>
                            )}
                          </div>
                          {review.updatedAt !== review.createdAt && (
                            <span className="meta-updated">
                              Updated {new Date(review.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'write-review' && (
            <div>
              {getCoursesAvailableForReview().length === 0 ? (
                <div className="empty-state">
                  <BookOpen className="empty-icon" />
                  <h3 className="empty-title">No Courses to Review</h3>
                  <p className="empty-description">
                    You have already reviewed all your enrolled courses, or you don't have any completed courses yet.
                  </p>
                </div>
              ) : (
                <div className="review-card">
                  <h2 className="review-title">Write a New Review</h2>
                  
                  <form onSubmit={handleCreateReview}>
                    <div className="form-group">
                      <label className="form-label">Select Course *</label>
                      <select
                        value={selectedCourse?._id || ''}
                        onChange={(e) => {
                          const course = getCoursesAvailableForReview().find(c => c._id === e.target.value);
                          setSelectedCourse(course || null);
                        }}
                        className="form-input form-select"
                        required
                      >
                        <option value="">Choose a course to review...</option>
                        {getCoursesAvailableForReview().map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Rating *</label>
                      {renderStars(reviewForm.rating, true, (rating) => 
                        setReviewForm(prev => ({ ...prev, rating }))
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Title (Optional)</label>
                      <input
                        type="text"
                        value={reviewForm.title}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                        className="form-input"
                        placeholder="Brief title for your review"
                        maxLength="100"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Review *</label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                        className="form-input form-textarea"
                        rows="5"
                        placeholder="Share your experience with this course. What did you learn? How was the content quality? Would you recommend it to others?"
                        maxLength="1000"
                        required
                      />
                      <div className="char-count">
                        {reviewForm.comment.length}/1000
                      </div>
                    </div>

                    {/* Pros */}
                    <div className="form-group">
                      <label className="form-label">What you liked (Pros)</label>
                      {reviewForm.pros.map((pro, index) => (
                        <div key={index} className="pros-cons-input-container">
                          <input
                            type="text"
                            value={pro}
                            onChange={(e) => updateProsCons('pros', index, e.target.value)}
                            className="form-input pros-cons-input"
                            placeholder="What did you like about this course?"
                            maxLength="200"
                          />
                          {reviewForm.pros.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProsCons('pros', index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addProsCons('pros')}
                        className="add-button"
                      >
                        <Plus className="w-4 h-4" />
                        Add another pro
                      </button>
                    </div>

                    {/* Cons */}
                    <div className="form-group">
                      <label className="form-label">Areas for improvement (Cons)</label>
                      {reviewForm.cons.map((con, index) => (
                        <div key={index} className="pros-cons-input-container">
                          <input
                            type="text"
                            value={con}
                            onChange={(e) => updateProsCons('cons', index, e.target.value)}
                            className="form-input pros-cons-input"
                            placeholder="What could be improved?"
                            maxLength="200"
                          />
                          {reviewForm.cons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProsCons('cons', index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addProsCons('cons')}
                        className="add-button"
                      >
                        <Plus className="w-4 h-4" />
                        Add another con
                      </button>
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="primary-button"
                      >
                        <Save className="w-4 h-4" />
                        Submit Review
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Reviews;