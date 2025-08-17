// pages/CourseDetail.js
import React, { useState, useEffect } from 'react';
import './CourseDetail.css';

const CourseDetail = ({ courseId, setCurrentPage }) => {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [enrolling, setEnrolling] = useState(false);

  // Fetch course details using the actual API structure
  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!courseId) {
        throw new Error('Course ID is required');
      }

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
        if (response.status === 404) {
          throw new Error('Course not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCourse(data.data.course);
        setIsEnrolled(data.data.isEnrolled || false);
        setEnrollment(data.data.enrollment || null);
      } else {
        throw new Error('Failed to load course');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle course enrollment
  const handleEnrollment = async () => {
    try {
      setEnrolling(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login to enroll in courses');
        setCurrentPage('login');
        return;
      }

      const response = await fetch('http://localhost:5555/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: course.id,
          paymentMethod: course.effectivePrice === 0 ? 'free' : 'stripe'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Successfully enrolled in course!');
        setIsEnrolled(true);
        setEnrollment(data.data.enrollment);
      } else {
        alert(data.message || 'Enrollment failed');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      alert('Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  // Format price display
  const formatPrice = (price, discountPrice) => {
    if (price === 0) return 'Free';
    if (discountPrice && discountPrice < price) {
      return {
        original: price,
        discount: discountPrice,
        hasDiscount: true
      };
    }
    return {
      original: price,
      hasDiscount: false
    };
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

  // Calculate total lesson duration
  const getTotalLessonDuration = () => {
    if (!course?.lessons) return 0;
    return course.lessons.reduce((total, lesson) => {
      return total + (lesson.content?.videoDuration || 0);
    }, 0);
  };

  // Group lessons by section
  const getLessonsBySection = () => {
    if (!course?.lessons) return {};
    
    const sections = {};
    course.lessons.forEach(lesson => {
      const section = lesson.section || 'General';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(lesson);
    });

    // Sort lessons within each section by order
    Object.keys(sections).forEach(section => {
      sections[section].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return sections;
  };

  // Handle start course
  const handleStartCourse = () => {
    if (isEnrolled) {
      setCurrentPage('course-player', { courseId: course.id });
    } else {
      handleEnrollment();
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourseDetail();
    }
  }, [courseId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-container">
          <h2>Error Loading Course</h2>
          <p>{error}</p>
          <button onClick={() => setCurrentPage('courses')} className="btn-primary">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page-container">
        <div className="error-container">
          <h2>Course Not Found</h2>
          <p>The course you're looking for doesn't exist.</p>
          <button onClick={() => setCurrentPage('courses')} className="btn-primary">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const priceInfo = formatPrice(course.price, course.discountPrice);
  const lessonsBySection = getLessonsBySection();
  const totalLessonDuration = getTotalLessonDuration();

  return (
    <div className="course-detail-container">
      {/* Header Section */}
      <div className="course-header">
        <button 
          onClick={() => setCurrentPage('courses')} 
          className="back-button"
        >
          ← Back to Courses
        </button>
        
        <div className="course-header-content">
          <div className="course-header-left">
            <div className="course-breadcrumb">
              <span>{course.category}</span> / <span>{course.level}</span>
            </div>
            
            <h1 className="course-title">{course.title}</h1>
            <p className="course-short-description">
              {course.shortDescription || course.description}
            </p>
            
            <div className="course-meta">
              <div className="instructor-info">
                <img 
                  src={course.instructor?.avatar || '/default-avatar.png'} 
                  alt={course.instructor?.fullName}
                  className="instructor-avatar"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmMGYwZjAiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjOTk5Ii8+CjxwYXRoIGQ9Ik0xMiAxNEM5LjMzIDE0IDQgMTUuMzQgNCAxOFYyMEgyMFYxOEMyMCAxNS4zNCAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IiM5OTkiLz4KPC9zdmc+Cjwvc3ZnPgo=';
                  }}
                />
                <div>
                  <p className="instructor-name">
                    {course.instructor?.fullName}
                  </p>
                  <p className="instructor-title">Course Instructor</p>
                </div>
              </div>
              
              <div className="course-stats">
                <div className="stat">
                  <span className="stat-value">{course.totalEnrollments || 0}</span>
                  <span className="stat-label">Students</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{course.lessons?.length || 0}</span>
                  <span className="stat-label">Lessons</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{formatDuration(course.duration || totalLessonDuration)}</span>
                  <span className="stat-label">Duration</span>
                </div>
                <div className="stat">
                  <div className="rating">
                    {renderStars(course.averageRating || 0)}
                    <span className="rating-text">
                      ({course.averageRating?.toFixed(1) || '0.0'})
                    </span>
                  </div>
                  <span className="stat-label">{course.totalRatings || 0} Reviews</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="course-header-right">
            <img 
              src={course.thumbnail} 
              alt={course.title}
              className="course-thumbnail"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="course-thumbnail-placeholder" style={{ display: 'none' }}>
              <span>📚</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="course-main">
        <div className="course-content">
          {/* Navigation Tabs */}
          <div className="course-tabs">
            <button 
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab ${activeTab === 'curriculum' ? 'active' : ''}`}
              onClick={() => setActiveTab('curriculum')}
            >
              Curriculum
            </button>
            <button 
              className={`tab ${activeTab === 'instructor' ? 'active' : ''}`}
              onClick={() => setActiveTab('instructor')}
            >
              Instructor
            </button>
            <button 
              className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="section">
                  <h3>About This Course</h3>
                  <p className="course-description">{course.description}</p>
                </div>

                {course.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
                  <div className="section">
                    <h3>What You'll Learn</h3>
                    <ul className="learning-objectives">
                      {course.whatYouWillLearn.map((objective, index) => (
                        <li key={index}>✓ {objective}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {course.requirements && course.requirements.length > 0 && (
                  <div className="section">
                    <h3>Requirements</h3>
                    <ul className="requirements-list">
                      {course.requirements.map((requirement, index) => (
                        <li key={index}>• {requirement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {course.tags && course.tags.length > 0 && (
                  <div className="section">
                    <h3>Tags</h3>
                    <div className="course-tags">
                      {course.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'curriculum' && (
              <div className="curriculum-tab">
                <div className="curriculum-header">
                  <h3>Course Curriculum</h3>
                  <p>{course.lessons?.length || 0} lessons • {formatDuration(course.duration || totalLessonDuration)}</p>
                </div>
                
                {course.lessons && course.lessons.length > 0 ? (
                  <div className="curriculum-content">
                    {Object.keys(lessonsBySection).map((sectionName, sectionIndex) => (
                      <div key={sectionIndex} className="curriculum-section">
                        <div className="section-header">
                          <h4 className="section-title">{sectionName}</h4>
                          <span className="section-info">
                            {lessonsBySection[sectionName].length} lessons
                          </span>
                        </div>
                        
                        <div className="lessons-list">
                          {lessonsBySection[sectionName].map((lesson, lessonIndex) => (
                            <div key={lesson.id} className="lesson-item">
                              <div className="lesson-number">
                                {lesson.order || (lessonIndex + 1)}
                              </div>
                              <div className="lesson-content">
                                <div className="lesson-header">
                                  <h5 className="lesson-title">
                                    {lesson.title}
                                  </h5>
                                  <div className="lesson-badges">
                                    {lesson.isPreview && <span className="preview-badge">Preview</span>}
                                    {lesson.isFree && <span className="free-badge">Free</span>}
                                  </div>
                                </div>
                                {lesson.description && (
                                  <p className="lesson-description">{lesson.description}</p>
                                )}
                                <div className="lesson-meta">
                                  <span className="lesson-type">
                                    {lesson.type === 'video' ? '📹' : '📄'} {lesson.type || 'Text'}
                                  </span>
                                  {lesson.content?.videoDuration && (
                                    <span className="lesson-duration">
                                      ⏱️ {formatDuration(lesson.content.videoDuration)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="lesson-status">
                                {isEnrolled || lesson.isPreview || lesson.isFree ? (
                                  <button className="lesson-play-btn">▶️</button>
                                ) : (
                                  <div className="lesson-locked">🔒</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-lessons">
                    <p>No lessons available yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'instructor' && (
              <div className="instructor-tab">
                <div className="instructor-profile">
                  <div className="instructor-header">
                    <img 
                      src={course.instructor?.avatar || '/default-avatar.png'} 
                      alt={course.instructor?.fullName}
                      className="instructor-photo"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjZjBmMGYwIi8+CjxwYXRoIGQ9Ik01MCA1MEMNMy4zMTM3IDUwIDU2IDQ3LjMxMzcgNTYgNDRDNTYgNDAuNjg2MyA1My4zMTM3IDM4IDUwIDM4QzQ2LjY4NjMgMzggNDQgNDAuNjg2MyA0NCA0NEM0NCA0Ny4zMTM3IDQ2LjY4NjMgNTAgNTAgNTBaIiBmaWxsPSIjOTk5Ii8+CjxwYXRoIGQ9Ik01MCA1NEMzOC45NTQzIDU0IDMwIDU2Ljk1NDMgMzAgNjBWNjRINzBWNjBDNzAgNTYuOTU0MyA2MS4wNDU3IDU0IDUwIDU0WiIgZmlsbD0iIzk5OSIvPgo8L3N2Zz4=';
                      }}
                    />
                    <div className="instructor-details">
                      <h3>{course.instructor?.fullName}</h3>
                      <p className="instructor-role">Course Instructor</p>
                    </div>
                  </div>
                  
                  {course.instructor?.bio && (
                    <div className="instructor-bio">
                      <h4>About the Instructor</h4>
                      <p>{course.instructor.bio}</p>
                    </div>
                  )}
                  
                  {course.instructor?.socialLinks && (
                    <div className="social-links">
                      <h4>Connect with the Instructor</h4>
                      <div className="social-links-grid">
                        {Object.entries(course.instructor.socialLinks).map(([platform, url]) => (
                          url && (
                            <a 
                              key={platform} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="social-link"
                            >
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </a>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="reviews-tab">
                <div className="reviews-summary">
                  <div className="rating-overview">
                    <div className="average-rating">
                      <span className="rating-number">{course.averageRating?.toFixed(1) || '0.0'}</span>
                      <div className="rating-stars">
                        {renderStars(course.averageRating || 0)}
                      </div>
                      <p>{course.totalRatings || 0} reviews</p>
                    </div>
                    
                    {course.totalRatings > 0 && (
                      <div className="rating-breakdown">
                        {[5, 4, 3, 2, 1].map(rating => (
                          <div key={rating} className="rating-bar">
                            <span className="rating-label">{rating} stars</span>
                            <div className="bar">
                              <div className="bar-fill" style={{ width: '0%' }}></div>
                            </div>
                            <span className="rating-count">0</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="reviews-list">
                  {course.totalRatings === 0 ? (
                    <div className="no-reviews">
                      <p>No reviews yet. Be the first to review this course!</p>
                    </div>
                  ) : (
                    <div className="reviews-placeholder">
                      <p>Reviews will be displayed here when available.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="course-sidebar">
          <div className="enrollment-card">
            <div className="price-section">
              {course.discountPrice && course.discountPrice < course.price ? (
                <div className="price-with-discount">
                  <span className="original-price">${course.price}</span>
                  <span className="current-price">${course.discountPrice}</span>
                  <div className="discount-badge">
                    {course.discountPercentage}% OFF
                  </div>
                </div>
              ) : (
                <div className="current-price">
                  {course.price === 0 ? 'Free' : `$${course.effectivePrice || course.price}`}
                </div>
              )}
            </div>

            <div className="enrollment-actions">
              {isEnrolled ? (
                <div className="enrolled-status">
                  <div className="enrolled-badge">
                    ✅ You're enrolled in this course
                  </div>
                  <button 
                    className="btn-continue"
                    onClick={handleStartCourse}
                  >
                    Continue Learning
                  </button>
                </div>
              ) : (
                <button 
                  className="btn-enroll"
                  onClick={handleEnrollment}
                  disabled={enrolling}
                >
                  {enrolling ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Enrolling...
                    </>
                  ) : (
                    <>
                      {course.price === 0 ? 'Enroll for Free' : 'Enroll Now'}
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="course-includes">
              <h4>This course includes:</h4>
              <ul>
                <li>📹 {course.lessons?.length || 0} lessons</li>
                <li>⏰ {formatDuration(course.duration || totalLessonDuration)} total duration</li>
                <li>📱 Mobile and desktop access</li>
                <li>🎓 Certificate of completion</li>
                <li>♾️ Lifetime access</li>
                <li>🌐 {course.language || 'English'} language</li>
                {course.level && <li>📊 {course.level} level</li>}
              </ul>
            </div>

            {/* Course Progress (if enrolled) */}
            {isEnrolled && enrollment && (
              <div className="course-progress">
                <h4>Your Progress</h4>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${enrollment.progress || 0}%` }}
                  ></div>
                </div>
                <p>{enrollment.progress || 0}% Complete</p>
              </div>
            )}

            {/* Additional Course Info */}
            <div className="course-additional-info">
              <div className="info-item">
                <span className="info-label">Created:</span>
                <span className="info-value">
                  {new Date(course.createdAt).toLocaleDateString()}
                </span>
              </div>
              {course.updatedAt !== course.createdAt && (
                <div className="info-item">
                  <span className="info-label">Last Updated:</span>
                  <span className="info-value">
                    {new Date(course.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Students Enrolled:</span>
                <span className="info-value">{course.totalEnrollments || 0}</span>
              </div>
              {course.publishedAt && (
                <div className="info-item">
                  <span className="info-label">Published:</span>
                  <span className="info-value">
                    {new Date(course.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;