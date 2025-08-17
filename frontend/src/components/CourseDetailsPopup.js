// components/CourseDetailsPopup.js
import React, { useState, useEffect } from 'react';
import './CourseDetailsPopup.css';

const CourseDetailsPopup = ({ courseId, isOpen, onClose, onEnroll, setCurrentPage }) => {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch course details
  const fetchCourseDetails = async () => {
    if (!courseId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5555/api/courses/${courseId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCourse(data.data.course);
      } else {
        throw new Error(data.message || 'Failed to load course details');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching course details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle enrollment
  const handleEnrollment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to enroll in courses');
        setCurrentPage('login');
        onClose();
        return;
      }

      const response = await fetch('http://localhost:5555/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          paymentMethod: 'free'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Successfully enrolled in course!');
        onClose();
        if (onEnroll) onEnroll(courseId);
      } else {
        alert(data.message || 'Enrollment failed');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      alert('Failed to enroll in course');
    }
  };

  // Format price
  const formatPrice = (course) => {
    if (!course) return '';
    if (course.price === 0) return 'Free';
    if (course.discountPrice && course.discountPrice < course.price) {
      return (
        <>
          <span className="original-price">${course.price}</span>
          <span className="discount-price">${course.discountPrice}</span>
        </>
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

  useEffect(() => {
    if (isOpen && courseId) {
      fetchCourseDetails();
    }
  }, [isOpen, courseId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>
          <span>&times;</span>
        </button>

        {loading && (
          <div className="popup-loading">
            <div className="spinner"></div>
            <p>Loading course details...</p>
          </div>
        )}

        {error && (
          <div className="popup-error">
            <p>Error: {error}</p>
            <button onClick={fetchCourseDetails} className="retry-btn">
              Try Again
            </button>
          </div>
        )}

        {course && (
          <div className="course-details">
            {/* Course Header */}
            <div className="course-header">
              <div className="course-image-container">
                {course.thumbnail ? (
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="course-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="placeholder-image" style={{ display: course.thumbnail ? 'none' : 'flex' }}>
                  <span>📚</span>
                </div>
                {course.discountPrice && course.discountPrice < course.price && (
                  <div className="discount-badge">
                    {course.discountPercentage || Math.round(((course.price - course.discountPrice) / course.price) * 100)}% OFF
                  </div>
                )}
                {course.isFeatured && (
                  <div className="featured-badge">Featured</div>
                )}
              </div>

              <div className="course-info">
                <div className="course-meta">
                  <span className="course-category">{course.category}</span>
                  <span className="course-level">{course.level}</span>
                </div>
                
                <h2 className="course-title">{course.title}</h2>
                
                <div className="course-instructor">
                  <div className="instructor-info">
                    <h4>Instructor: {course.instructor?.fullName || `${course.instructor?.firstName} ${course.instructor?.lastName}`}</h4>
                    {course.instructor?.bio && (
                      <p className="instructor-bio">{course.instructor.bio.substring(0, 200)}...</p>
                    )}
                  </div>
                </div>

                <div className="course-stats">
                  <div className="rating">
                    <div className="stars">
                      {renderStars(course.averageRating)}
                    </div>
                    <span className="rating-text">
                      ({course.averageRating?.toFixed(1) || '0.0'}) • {course.totalRatings || 0} reviews
                    </span>
                  </div>
                  <div className="enrollments">
                    👥 {course.totalEnrollments || 0} students enrolled
                  </div>
                </div>

                <div className="course-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">⏱️ Duration:</span>
                    <span className="detail-value">{formatDuration(course.duration)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📚 Lessons:</span>
                    <span className="detail-value">{course.lessons?.length || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">🌐 Language:</span>
                    <span className="detail-value">{course.language || 'English'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📊 Level:</span>
                    <span className="detail-value">{course.level}</span>
                  </div>
                </div>

                <div className="course-price-section">
                  <div className="course-price">
                    {formatPrice(course)}
                  </div>
                  <button 
                    className="enroll-btn"
                    onClick={handleEnrollment}
                  >
                    Enroll Now
                  </button>
                </div>
              </div>
            </div>

            {/* Course Content */}
            <div className="course-content-section">
              <div className="content-tabs">
                <div className="tab-content">
                  <div className="section">
                    <h3>📖 Course Description</h3>
                    <p className="course-description">{course.description}</p>
                    {course.shortDescription && course.shortDescription !== course.description && (
                      <p className="course-short-description"><strong>Summary:</strong> {course.shortDescription}</p>
                    )}
                  </div>

                  {course.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
                    <div className="section">
                      <h3>🎯 What You'll Learn</h3>
                      <ul className="learning-objectives">
                        {course.whatYouWillLearn.map((item, index) => (
                          <li key={index}>✅ {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {course.requirements && course.requirements.length > 0 && (
                    <div className="section">
                      <h3>📋 Requirements</h3>
                      <ul className="requirements-list">
                        {course.requirements.map((requirement, index) => (
                          <li key={index}>• {requirement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {course.lessons && course.lessons.length > 0 && (
                    <div className="section">
                      <h3>📚 Course Content</h3>
                      <div className="lessons-list">
                        {course.lessons.map((lesson, index) => (
                          <div key={lesson.id} className="lesson-item">
                            <div className="lesson-header">
                              <span className="lesson-number">{lesson.order || index + 1}</span>
                              <div className="lesson-info">
                                <h4 className="lesson-title">{lesson.title}</h4>
                                <p className="lesson-section">{lesson.section}</p>
                              </div>
                              <div className="lesson-meta">
                                <span className="lesson-type">{lesson.type}</span>
                                {lesson.formattedDuration && (
                                  <span className="lesson-duration">{lesson.formattedDuration}</span>
                                )}
                                {lesson.isFree && <span className="free-badge">Free</span>}
                                {lesson.isPreview && <span className="preview-badge">Preview</span>}
                              </div>
                            </div>
                            {lesson.description && (
                              <p className="lesson-description">{lesson.description.substring(0, 150)}...</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {course.tags && course.tags.length > 0 && (
                    <div className="section">
                      <h3>🏷️ Tags</h3>
                      <div className="tags-container">
                        {course.tags.map((tag, index) => (
                          <span key={index} className="tag">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetailsPopup;