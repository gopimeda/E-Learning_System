// pages/Enroll.js
import React, { useState, useEffect } from 'react';
import './Enroll.css';

const Enroll = ({ setCurrentPage, courseId: initialCourseId }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Helper function to get token consistently
  const getAuthToken = () => {
    return localStorage.getItem('userToken') || localStorage.getItem('token');
  };

  // Fetch all available courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      
      const response = await fetch('http://localhost:5555/api/courses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && {
            'Authorization': `Bearer ${token}`
          })
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const coursesList = Array.isArray(data.data) ? data.data : data.data.courses || [];
        setCourses(coursesList);
        
        // If initialCourseId is provided, select that course
        if (initialCourseId) {
          const course = coursesList.find(c => c._id === initialCourseId || c.id === initialCourseId);
          if (course) {
            setSelectedCourse(course);
          }
        }
      } else {
        throw new Error(data.message || 'Failed to load courses');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle course selection from dropdown
  const handleCourseSelect = (courseId) => {
    if (!courseId) {
      setSelectedCourse(null);
      return;
    }
    
    const course = courses.find(c => c._id === courseId || c.id === courseId);
    setSelectedCourse(course);
    setEnrollmentSuccess(false);
  };

  // Handle enrollment process
  const handleEnrollment = async () => {
    if (!selectedCourse) return;
    
    const token = getAuthToken();
    if (!token) {
      alert('Please login to enroll in courses');
      setCurrentPage('login');
      return;
    }

    try {
      setEnrolling(true);
      setError(null);

      const response = await fetch('http://localhost:5555/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: selectedCourse._id || selectedCourse.id,
          paymentMethod: selectedCourse.price === 0 ? 'free' : 'free', // In real app, this would handle payment
          transactionId: selectedCourse.price === 0 ? null : `TXN-${Date.now()}`
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEnrollmentSuccess(true);
        setShowConfirmDialog(false);
        // Optionally refresh courses to update enrollment status
        fetchCourses();
      } else {
        // Check if the error is related to authentication
        if (response.status === 401 || response.status === 403) {
          alert('Your session has expired. Please login again.');
          setCurrentPage('login');
          return;
        }
        throw new Error(data.message || 'Enrollment failed');
      }
    } catch (err) {
      setError(err.message);
      console.error('Enrollment error:', err);
    } finally {
      setEnrolling(false);
    }
  };

  // Format price display
  const formatPrice = (course) => {
    if (course.price === 0) return 'Free';
    if (course.discountPrice && course.discountPrice < course.price) {
      return (
        <div className="price-container">
          <span className="original-price">${course.price}</span>
          <span className="discount-price">${course.discountPrice}</span>
          <span className="discount-badge">
            {Math.round(((course.price - course.discountPrice) / course.price) * 100)}% OFF
          </span>
        </div>
      );
    }
    return `$${course.effectivePrice || course.price}`;
  };

  // Format duration
  const formatDuration = (duration) => {
    if (!duration) return '0m';
    if (duration >= 60) {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
    }
    return `${duration}m`;
  };

  // Generate star rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star filled">★</span>);
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">★</span>);
    }
    
    const emptyStars = 5 - Math.ceil(rating || 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star">☆</span>);
    }
    
    return stars;
  };

  // Check authentication status
  const isAuthenticated = () => {
    const token = getAuthToken();
    const userData = localStorage.getItem('userData');
    return !!(token && userData);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated()) {
    return (
      <div className="page-container">
        <div className="auth-required">
          <h2>Login Required</h2>
          <p>You need to be logged in to enroll in courses.</p>
          <button 
            onClick={() => setCurrentPage('login')}
            className="login-prompt-btn"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="enroll-header">
        <h1>Course Enrollment</h1>
        <p className="enroll-subtitle">Select a course to view details and enroll</p>
      </div>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={fetchCourses} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      {enrollmentSuccess && (
        <div className="success-message">
          <h3>🎉 Enrollment Successful!</h3>
          <p>You have successfully enrolled in "{selectedCourse?.title}"</p>
          <button 
            onClick={() => setCurrentPage('dashboard')} 
            className="go-to-dashboard-btn"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {/* Course Selection Dropdown */}
      <div className="course-selection">
        <label htmlFor="course-select" className="selection-label">
          Choose a Course:
        </label>
        <select
          id="course-select"
          value={selectedCourse?._id || selectedCourse?.id || ''}
          onChange={(e) => handleCourseSelect(e.target.value)}
          className="course-select"
        >
          <option value="">-- Select a Course --</option>
          {courses.map(course => (
            <option key={course._id || course.id} value={course._id || course.id}>
              {course.title} - {formatPrice(course)}
            </option>
          ))}
        </select>
      </div>

      {/* Course Details */}
      {selectedCourse && (
        <div className="course-details-container">
          <div className="course-details-card">
            {/* Course Header */}
            <div className="course-header">
              <div className="course-image-container">
                {selectedCourse.thumbnail ? (
                  <img 
                    src={selectedCourse.thumbnail} 
                    alt={selectedCourse.title}
                    className="course-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="placeholder-image" style={{ display: selectedCourse.thumbnail ? 'none' : 'flex' }}>
                  <span>📚</span>
                </div>
                
                {selectedCourse.discountPrice && selectedCourse.discountPrice < selectedCourse.price && (
                  <div className="discount-badge">
                    {Math.round(((selectedCourse.price - selectedCourse.discountPrice) / selectedCourse.price) * 100)}% OFF
                  </div>
                )}
                {selectedCourse.isFeatured && (
                  <div className="featured-badge">Featured</div>
                )}
              </div>

              <div className="course-info">
                <div className="course-meta">
                  <span className="course-category">{selectedCourse.category}</span>
                  <span className="course-level">{selectedCourse.level}</span>
                  <span className="course-language">🌐 {selectedCourse.language || 'English'}</span>
                </div>

                <h2 className="course-title">{selectedCourse.title}</h2>
                
                <div className="course-instructor">
                  <strong>Instructor:</strong> {selectedCourse.instructor?.fullName || 
                    `${selectedCourse.instructor?.firstName} ${selectedCourse.instructor?.lastName}`}
                </div>

                <div className="course-stats">
                  <div className="rating">
                    <div className="stars">
                      {renderStars(selectedCourse.averageRating)}
                    </div>
                    <span className="rating-text">
                      ({selectedCourse.averageRating?.toFixed(1) || '0.0'}) • {selectedCourse.totalEnrollments || 0} students
                    </span>
                  </div>
                </div>

                <div className="course-quick-stats">
                  <span className="stat">⏱️ {formatDuration(selectedCourse.duration)}</span>
                  <span className="stat">📚 {selectedCourse.lessons?.length || 0} lessons</span>
                  <span className="stat">💰 {formatPrice(selectedCourse)}</span>
                </div>
              </div>
            </div>

            {/* Course Description */}
            <div className="course-section">
              <h3>Course Description</h3>
              <p className="course-description">
                {selectedCourse.description || selectedCourse.shortDescription}
              </p>
            </div>

            {/* Requirements */}
            {selectedCourse.requirements && selectedCourse.requirements.length > 0 && (
              <div className="course-section">
                <h3>Requirements</h3>
                <ul className="requirements-list">
                  {selectedCourse.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* What You'll Learn */}
            {selectedCourse.whatYouWillLearn && selectedCourse.whatYouWillLearn.length > 0 && (
              <div className="course-section">
                <h3>What You'll Learn</h3>
                <ul className="learning-outcomes">
                  {selectedCourse.whatYouWillLearn.map((item, index) => (
                    <li key={index}>✓ {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Course Tags */}
            {selectedCourse.tags && selectedCourse.tags.length > 0 && (
              <div className="course-section">
                <h3>Tags</h3>
                <div className="course-tags">
                  {selectedCourse.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructor Bio */}
            {selectedCourse.instructor?.bio && (
              <div className="course-section">
                <h3>About the Instructor</h3>
                <div className="instructor-bio">
                  {selectedCourse.instructor.avatar && (
                    <img 
                      src={selectedCourse.instructor.avatar} 
                      alt="Instructor"
                      className="instructor-avatar"
                    />
                  )}
                  <div className="instructor-info">
                    <h4>{selectedCourse.instructor?.fullName || 
                      `${selectedCourse.instructor?.firstName} ${selectedCourse.instructor?.lastName}`}</h4>
                    <p>{selectedCourse.instructor.bio}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enrollment Section */}
            <div className="enrollment-section">
              <div className="enrollment-card">
                <div className="enrollment-price">
                  <h3>Enroll Now</h3>
                  <div className="price-display">
                    {formatPrice(selectedCourse)}
                  </div>
                </div>
                
                <button 
                  className="enroll-btn"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={enrolling}
                >
                  {enrolling ? 'Enrolling...' : 'Enroll in Course'}
                </button>

                <div className="enrollment-features">
                  <p>✓ Lifetime access</p>
                  <p>✓ {selectedCourse.lessons?.length || 0} lessons</p>
                  <p>✓ Mobile and desktop access</p>
                  {selectedCourse.certificate?.isEnabled && <p>✓ Certificate of completion</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {courses.length === 0 && !loading && (
        <div className="no-courses">
          <h3>No courses available</h3>
          <p>There are currently no courses available for enrollment.</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedCourse && (
        <div className="modal-overlay">
          <div className="confirmation-dialog">
            <h3>Confirm Enrollment</h3>
            <p>Are you sure you want to enroll in:</p>
            <div className="course-summary">
              <h4>"{selectedCourse.title}"</h4>
              <p>Price: {formatPrice(selectedCourse)}</p>
              <p>Duration: {formatDuration(selectedCourse.duration)}</p>
              <p>Lessons: {selectedCourse.lessons?.length || 0}</p>
            </div>
            
            <div className="dialog-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowConfirmDialog(false)}
                disabled={enrolling}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn"
                onClick={handleEnrollment}
                disabled={enrolling}
              >
                {enrolling ? 'Enrolling...' : 'Yes, Enroll Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Enroll;