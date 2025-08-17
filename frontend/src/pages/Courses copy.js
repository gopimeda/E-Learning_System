// pages/Courses.js
import React, { useState, useEffect } from 'react';
import './Courses.css';

const Courses = ({ setCurrentPage }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
          // Include auth token if required
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
  const handleEnrollment = async (courseId) => {
    try {
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
          courseId,
          paymentMethod: 'free' // or handle payment logic
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Successfully enrolled in course!');
        // Refresh courses to update enrollment status
        fetchCourses(pagination.currentPage);
      } else {
        alert(data.message || 'Enrollment failed');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      alert('Failed to enroll in course');
    }
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
  const formatPrice = (price, discountPrice) => {
    if (price === 0) return 'Free';
    if (discountPrice && discountPrice < price) {
      return (
        <>
          <span className="original-price">${price}</span>
          <span className="discount-price">${discountPrice}</span>
        </>
      );
    }
    return `$${price}`;
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

  // Handle view course details
  const handleViewDetails = (courseId) => {
    setCurrentPage('course-detail', courseId);
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

      {error && (
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
          <div key={course._id || course.id} className="course-card">
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
                  {Math.round(((course.price - course.discountPrice) / course.price) * 100)}% OFF
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
                <span>By {course.instructor?.firstName} {course.instructor?.lastName}</span>
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
                  {formatPrice(course.price, course.discountPrice)}
                </div>
                <div className="course-actions">
                  <button 
                    className="course-btn secondary"
                    onClick={() => handleViewDetails(course._id || course.id)}
                  >
                    View Details
                  </button>
                  <button 
                    className="course-btn primary"
                    onClick={() => handleEnrollment(course._id || course.id)}
                  >
                    Enroll Now
                  </button>
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
    </div>
  );
};

export default Courses;