// pages/Courses.js
import React, { useState, useEffect } from 'react';
import './Courses.css';

const Courses = ({ setCurrentPage, isAuthenticated, userRole = 'student' }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    level: '',
    search: '',
    sortBy: 'createdAt'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCourses: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Fetch courses from backend
  const fetchCourses = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(filters.category && { category: filters.category }),
        ...(filters.level && { level: filters.level }),
        ...(filters.search && { search: filters.search }),
        sortBy: filters.sortBy
      });

      const response = await fetch(`http://localhost:5555/api/courses?${queryParams}`, {
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
        // Handle both array response and paginated response
        if (Array.isArray(data.data)) {
          setCourses(data.data);
          setPagination({
            currentPage: 1,
            totalPages: 1,
            totalCourses: data.data.length,
            hasNextPage: false,
            hasPrevPage: false
          });
        } else {
          setCourses(data.data.courses || []);
          setPagination(data.data.pagination || {
            currentPage: page,
            totalPages: 1,
            totalCourses: data.data.courses?.length || 0,
            hasNextPage: false,
            hasPrevPage: false
          });
        }
      } else {
        throw new Error(data.message || 'Failed to load courses');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching courses:', err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle course enrollment
  const handleEnrollment = async () => {
    if (!selectedCourse) return;
    
    const token = localStorage.getItem('token');
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
          paymentMethod: selectedCourse.price === 0 ? 'free' : 'free',
          transactionId: selectedCourse.price === 0 ? null : `TXN-${Date.now()}`
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEnrollmentSuccess(true);
        setShowConfirmDialog(false);
        // Refresh courses to update enrollment status
        fetchCourses();
      } else {
        throw new Error(data.message || 'Enrollment failed');
      }
    } catch (err) {
      setError(err.message);
      console.error('Enrollment error:', err);
    } finally {
      setEnrolling(false);
    }
  };

  // Handle view course details
  const handleViewDetails = (course) => {
    setSelectedCourse(course);
    setShowCourseDetails(true);
    setEnrollmentSuccess(false);
    setError(null);
  };

  // Close course details popup
  const closeCourseDetails = () => {
    setShowCourseDetails(false);
    setSelectedCourse(null);
    setEnrollmentSuccess(false);
    setShowConfirmDialog(false);
    setError(null);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchCourses(1);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchCourses(newPage);
    }
  };

  // Format price
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

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading && courses.length === 0) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="courses-header">
        <h1>Available Courses</h1>
        <p className="courses-subtitle">Discover and enroll in courses that match your interests</p>
      </div>

      {/* Filters and Search */}
      <div className="courses-filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search courses..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        <div className="filter-controls">
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="Web Development">Web Development</option>
            <option value="Programming">Programming</option>
            <option value="Design">Design</option>
            <option value="Business">Business</option>
            <option value="Marketing">Marketing</option>
            <option value="Data Science">Data Science</option>
          </select>

          <select
            value={filters.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
            className="filter-select"
          >
            <option value="">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="filter-select"
          >
            <option value="createdAt">Newest</option>
            <option value="title">Title A-Z</option>
            <option value="price">Price Low-High</option>
            <option value="averageRating">Highest Rated</option>
            <option value="totalEnrollments">Most Popular</option>
          </select>

          <button onClick={() => fetchCourses(1)} className="apply-filters-btn">
            Apply Filters
          </button>
        </div>
      </div>

      {error && !showCourseDetails && (
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={() => fetchCourses()} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      {/* Results count */}
      {!loading && courses.length > 0 && (
        <div className="results-count">
          Showing {courses.length} of {pagination.totalCourses || courses.length} courses
        </div>
      )}

      {/* Courses Grid */}
      <div className="courses-grid">
        {courses.map(course => (
          <div key={course.id || course._id} className="course-card">
            <div className="course-image">
              {course.thumbnail ? (
                <img 
                  src={course.thumbnail} 
                  alt={course.title}
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

            <div className="course-content">
              <div className="course-meta">
                <span className="course-category">{course.category}</span>
                <span className="course-level">{course.level}</span>
              </div>
              
              <h3 className="course-title">{course.title}</h3>
              <p className="course-description">
                {course.shortDescription || course.description?.substring(0, 120) + '...'}
              </p>
              
              <div className="course-instructor">
                <span>By {course.instructor?.fullName || `${course.instructor?.firstName} ${course.instructor?.lastName}`}</span>
              </div>

              <div className="course-stats">
                <div className="rating">
                  <div className="stars">
                    {renderStars(course.averageRating)}
                  </div>
                  <span className="rating-text">
                    ({course.averageRating?.toFixed(1) || '0.0'})
                  </span>
                </div>
                <div className="enrollments">
                  {course.totalEnrollments || 0} students
                </div>
              </div>

              <div className="course-details">
                <span className="duration">⏱️ {formatDuration(course.duration)}</span>
                <span className="lessons">📚 {course.lessons?.length || 0} lessons</span>
                <span className="language">🌐 {course.language || 'English'}</span>
              </div>

              <div className="course-footer">
                <div className="course-price">
                  {formatPrice(course)}
                </div>
                <div className="course-actions">
                  <button 
                    className="course-btn secondary"
                    onClick={() => handleViewDetails(course)}
                  >
                    View Details
                  </button>
                  {isAuthenticated && userRole === 'student' && (
                    <button 
                      className="course-btn primary"
                      onClick={() => handleViewDetails(course)}
                    >
                      Enroll Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && !loading && (
        <div className="no-courses">
          <h3>No courses found</h3>
          <p>Try adjusting your search criteria or filters</p>
          <button onClick={() => {
            setFilters({
              category: '',
              level: '',
              search: '',
              sortBy: 'createdAt'
            });
            fetchCourses(1);
          }} className="reset-filters-btn">
            Reset Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="pagination-btn"
          >
            ← Previous
          </button>
          
          <div className="pagination-pages">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.currentPage <= 3) {
                pageNum = i + 1;
              } else if (pagination.currentPage >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`pagination-page ${pageNum === pagination.currentPage ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}

      <div className="pagination-info">
        {pagination.totalCourses > 0 && (
          <span>
            Showing page {pagination.currentPage} of {pagination.totalPages} 
            ({pagination.totalCourses} total courses)
          </span>
        )}
      </div>

      {loading && courses.length > 0 && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* Course Details Popup Modal */}
      {showCourseDetails && selectedCourse && (
        <div className="modal-overlay">
          <div className="course-details-modal">
            <div className="modal-header">
              <h2>Course Details</h2>
              <button className="close-btn" onClick={closeCourseDetails}>
                ×
              </button>
            </div>

            <div className="modal-content">
              {error && (
                <div className="error-message">
                  <p>Error: {error}</p>
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

                {/* Enrollment Section - Only show for students */}
                {isAuthenticated && userRole === 'student' && (
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
                )}

                {/* Message for instructors */}
                {isAuthenticated && userRole === 'instructor' && (
                  <div className="instructor-message">
                    <p>👨‍🏫 You are viewing this course as an instructor. Enrollment is only available for students.</p>
                  </div>
                )}

                {/* Message for non-authenticated users */}
                {!isAuthenticated && (
                  <div className="auth-message">
                    <p>Please <button onClick={() => setCurrentPage('login')} className="link-btn">login</button> to enroll in this course.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
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

export default Courses;