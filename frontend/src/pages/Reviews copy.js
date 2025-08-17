import React, { useState, useEffect } from 'react';
import './Reviews.css'; 
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
        // Filter courses that can be reviewed (completed or active enrollments)
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
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive ? () => onRatingChange(star) : undefined}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  const getCoursesAvailableForReview = () => {
    const reviewedCourseIds = reviews.map(review => review.course._id);
    return enrolledCourses.filter(course => !reviewedCourseIds.includes(course._id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="space-y-3">
              <div className="h-32 bg-gray-300 rounded"></div>
              <div className="h-32 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reviews</h1>
          <p className="text-gray-600">Manage your course reviews and feedback</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('my-reviews')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-reviews'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              My Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('write-review')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'write-review'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Write Review
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'my-reviews' && (
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Reviews Yet</h3>
                <p className="text-gray-600 mb-4">You haven't written any course reviews yet.</p>
                <button
                  onClick={() => setActiveTab('write-review')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Write Your First Review
                </button>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-lg shadow-sm border p-6">
                  {editingReview && editingReview._id === review._id ? (
                    /* Edit Form */
                    <form onSubmit={handleUpdateReview} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Edit Review</h3>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rating
                        </label>
                        {renderStars(reviewForm.rating, true, (rating) => 
                          setReviewForm(prev => ({ ...prev, rating }))
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={reviewForm.title}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Brief title for your review"
                          maxLength="100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Review *
                        </label>
                        <textarea
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows="4"
                          placeholder="Share your experience with this course..."
                          maxLength="1000"
                          required
                        />
                        <div className="text-right text-sm text-gray-500 mt-1">
                          {reviewForm.comment.length}/1000
                        </div>
                      </div>

                      {/* Pros */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          What you liked (Pros)
                        </label>
                        {reviewForm.pros.map((pro, index) => (
                          <div key={index} className="flex items-center space-x-2 mb-2">
                            <input
                              type="text"
                              value={pro}
                              onChange={(e) => updateProsCons('pros', index, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <Plus className="w-4 h-4 inline mr-1" />
                          Add another pro
                        </button>
                      </div>

                      {/* Cons */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Areas for improvement (Cons)
                        </label>
                        {reviewForm.cons.map((con, index) => (
                          <div key={index} className="flex items-center space-x-2 mb-2">
                            <input
                              type="text"
                              value={con}
                              onChange={(e) => updateProsCons('cons', index, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <Plus className="w-4 h-4 inline mr-1" />
                          Add another con
                        </button>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Update Review
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Review Display */
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {review.course?.title}
                            </h3>
                            {review.isVerified && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Award className="w-3 h-3 mr-1" />
                                Verified
                              </span>
                            )}
                          </div>
                          {renderStars(review.rating)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEdit(review)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit review"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review._id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {review.title && (
                        <h4 className="text-md font-medium text-gray-900 mb-2">
                          {review.title}
                        </h4>
                      )}

                      <p className="text-gray-700 mb-4 leading-relaxed">
                        {review.comment}
                      </p>

                      {/* Pros and Cons */}
                      {(review.pros?.length > 0 || review.cons?.length > 0) && (
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          {review.pros?.length > 0 && (
                            <div>
                              <h5 className="font-medium text-green-700 mb-2">Pros:</h5>
                              <ul className="space-y-1">
                                {review.pros.map((pro, index) => (
                                  <li key={index} className="text-sm text-green-600 flex items-start">
                                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                    {pro}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {review.cons?.length > 0 && (
                            <div>
                              <h5 className="font-medium text-orange-700 mb-2">Cons:</h5>
                              <ul className="space-y-1">
                                {review.cons.map((con, index) => (
                                  <li key={index} className="text-sm text-orange-600 flex items-start">
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
                      <div className="flex flex-wrap items-center justify-between text-sm text-gray-500 border-t pt-3">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                          {review.helpfulVotes > 0 && (
                            <span className="flex items-center">
                              <ThumbsUp className="w-4 h-4 mr-1" />
                              {review.helpfulVotes} helpful
                            </span>
                          )}
                        </div>
                        {review.updatedAt !== review.createdAt && (
                          <span className="text-xs text-gray-400">
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
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Courses to Review</h3>
                <p className="text-gray-600">
                  You have already reviewed all your enrolled courses, or you don't have any completed courses yet.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Write a New Review</h2>
                
                <form onSubmit={handleCreateReview} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Course *
                    </label>
                    <select
                      value={selectedCourse?._id || ''}
                      onChange={(e) => {
                        const course = getCoursesAvailableForReview().find(c => c._id === e.target.value);
                        setSelectedCourse(course || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating *
                    </label>
                    {renderStars(reviewForm.rating, true, (rating) => 
                      setReviewForm(prev => ({ ...prev, rating }))
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief title for your review"
                      maxLength="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review *
                    </label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="5"
                      placeholder="Share your experience with this course. What did you learn? How was the content quality? Would you recommend it to others?"
                      maxLength="1000"
                      required
                    />
                    <div className="text-right text-sm text-gray-500 mt-1">
                      {reviewForm.comment.length}/1000
                    </div>
                  </div>

                  {/* Pros */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What you liked (Pros)
                    </label>
                    {reviewForm.pros.map((pro, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={pro}
                          onChange={(e) => updateProsCons('pros', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add another pro
                    </button>
                  </div>

                  {/* Cons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Areas for improvement (Cons)
                    </label>
                    {reviewForm.cons.map((con, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={con}
                          onChange={(e) => updateProsCons('cons', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add another con
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
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
  );
};

export default Reviews;