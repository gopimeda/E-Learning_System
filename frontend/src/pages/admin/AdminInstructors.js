import React, { useState, useEffect } from 'react';
import './AdminInstructors.css';

const AdminInstructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [instructorCourses, setInstructorCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch all instructors
  const fetchInstructors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users?role=instructor&page=${currentPage}&search=${searchTerm}&sort=${sortBy}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInstructors(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        setError('Failed to fetch instructors');
      }
    } catch (err) {
      setError('Error fetching instructors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch instructor's courses
  const fetchInstructorCourses = async (instructorId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/courses?instructor=${instructorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInstructorCourses(data.data.courses);
      }
    } catch (err) {
      console.error('Error fetching instructor courses:', err);
    }
  };

  // Fetch course enrollments
  const fetchCourseEnrollments = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/enrollments/course/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCourseEnrollments(data.data.enrollments);
      }
    } catch (err) {
      console.error('Error fetching course enrollments:', err);
    }
  };

  // Get instructor analytics
  const getInstructorAnalytics = (instructor) => {
    const totalCourses = instructor.createdCourses?.length || 0;
    const totalStudents = instructor.totalStudents || 0;
    const totalRevenue = instructor.totalRevenue || 0;
    const averageRating = instructor.averageRating || 0;
    
    return {
      totalCourses,
      totalStudents,
      totalRevenue,
      averageRating,
      joinDate: new Date(instructor.createdAt).toLocaleDateString(),
      lastLogin: instructor.lastLoginAt ? new Date(instructor.lastLoginAt).toLocaleDateString() : 'Never',
      isActive: instructor.isActive
    };
  };

  useEffect(() => {
    fetchInstructors();
  }, [currentPage, searchTerm, sortBy]);

  const handleInstructorSelect = (instructor) => {
    setSelectedInstructor(instructor);
    setSelectedCourse(null);
    setCourseEnrollments([]);
    setActiveTab('overview');
    fetchInstructorCourses(instructor._id);
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setActiveTab('enrollments');
    fetchCourseEnrollments(course._id);
  };

  const handleStatusToggle = async (instructorId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${instructorId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        fetchInstructors();
        if (selectedInstructor && selectedInstructor._id === instructorId) {
          setSelectedInstructor(prev => ({ ...prev, isActive: !currentStatus }));
        }
      }
    } catch (err) {
      console.error('Error updating instructor status:', err);
    }
  };

  const filteredInstructors = instructors.filter(instructor => {
    const matchesSearch = 
      instructor.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && instructor.isActive) ||
      (statusFilter === 'inactive' && !instructor.isActive);
    
    return matchesSearch && matchesStatus;
  });

  if (loading && instructors.length === 0) {
    return <div className="admin-instructors-loading">Loading instructors...</div>;
  }

  return (
    <div className="admin-instructors">
      <div className="admin-instructors-header">
        <h1>Instructor Management</h1>
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-number">{instructors.length}</span>
            <span className="stat-label">Total Instructors</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{instructors.filter(i => i.isActive).length}</span>
            <span className="stat-label">Active Instructors</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{instructors.reduce((sum, i) => sum + (i.createdCourses?.length || 0), 0)}</span>
            <span className="stat-label">Total Courses</span>
          </div>
        </div>
      </div>

      <div className="admin-instructors-content">
        <div className="instructors-panel">
          <div className="panel-header">
            <h2>Instructors List</h2>
            <div className="panel-controls">
              <input
                type="text"
                placeholder="Search instructors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="courses">Most Courses</option>
              </select>
            </div>
          </div>

          <div className="instructors-list">
            {filteredInstructors.map(instructor => {
              const analytics = getInstructorAnalytics(instructor);
              return (
                <div
                  key={instructor._id}
                  className={`instructor-card ${selectedInstructor?._id === instructor._id ? 'selected' : ''}`}
                  onClick={() => handleInstructorSelect(instructor)}
                >
                  <div className="instructor-avatar">
                    {instructor.avatar ? (
                      <img src={instructor.avatar} alt={instructor.firstName} />
                    ) : (
                      <div className="avatar-placeholder">
                        {instructor.firstName.charAt(0)}{instructor.lastName.charAt(0)}
                      </div>
                    )}
                    <span className={`status-indicator ${instructor.isActive ? 'active' : 'inactive'}`}></span>
                  </div>
                  
                  <div className="instructor-info">
                    <h3>{instructor.firstName} {instructor.lastName}</h3>
                    <p className="instructor-email">{instructor.email}</p>
                    <div className="instructor-stats">
                      <span>{analytics.totalCourses} courses</span>
                      <span>{analytics.totalStudents} students</span>
                      <span>★ {analytics.averageRating.toFixed(1)}</span>
                    </div>
                    <div className="instructor-meta">
                      <span>Joined: {analytics.joinDate}</span>
                      <span className={`status ${instructor.isActive ? 'active' : 'inactive'}`}>
                        {instructor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="instructor-actions">
                    <button
                      className={`toggle-status ${instructor.isActive ? 'deactivate' : 'activate'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusToggle(instructor._id, instructor.isActive);
                      }}
                    >
                      {instructor.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="details-panel">
          {selectedInstructor ? (
            <>
              <div className="panel-header">
                <h2>{selectedInstructor.firstName} {selectedInstructor.lastName}</h2>
                <div className="tab-navigation">
                  <button
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                  >
                    Overview
                  </button>
                  <button
                    className={activeTab === 'courses' ? 'active' : ''}
                    onClick={() => setActiveTab('courses')}
                  >
                    Courses ({instructorCourses.length})
                  </button>
                  <button
                    className={activeTab === 'analytics' ? 'active' : ''}
                    onClick={() => setActiveTab('analytics')}
                  >
                    Analytics
                  </button>
                  {selectedCourse && (
                    <button
                      className={activeTab === 'enrollments' ? 'active' : ''}
                      onClick={() => setActiveTab('enrollments')}
                    >
                      Enrollments
                    </button>
                  )}
                </div>
              </div>

              <div className="panel-content">
                {activeTab === 'overview' && (
                  <div className="overview-content">
                    <div className="instructor-profile">
                      <div className="profile-header">
                        <div className="profile-avatar">
                          {selectedInstructor.avatar ? (
                            <img src={selectedInstructor.avatar} alt={selectedInstructor.firstName} />
                          ) : (
                            <div className="avatar-placeholder large">
                              {selectedInstructor.firstName.charAt(0)}{selectedInstructor.lastName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="profile-info">
                          <h3>{selectedInstructor.firstName} {selectedInstructor.lastName}</h3>
                          <p>{selectedInstructor.email}</p>
                          <p>{selectedInstructor.phone || 'No phone provided'}</p>
                          <span className={`status-badge ${selectedInstructor.isActive ? 'active' : 'inactive'}`}>
                            {selectedInstructor.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      {selectedInstructor.bio && (
                        <div className="profile-bio">
                          <h4>Bio</h4>
                          <p>{selectedInstructor.bio}</p>
                        </div>
                      )}

                      <div className="profile-details">
                        <div className="detail-item">
                          <label>Join Date:</label>
                          <span>{new Date(selectedInstructor.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="detail-item">
                          <label>Last Login:</label>
                          <span>{selectedInstructor.lastLoginAt ? new Date(selectedInstructor.lastLoginAt).toLocaleDateString() : 'Never'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Date of Birth:</label>
                          <span>{selectedInstructor.dateOfBirth ? new Date(selectedInstructor.dateOfBirth).toLocaleDateString() : 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="quick-stats">
                      <div className="stat-grid">
                        <div className="stat-item">
                          <span className="stat-value">{instructorCourses.length}</span>
                          <span className="stat-label">Total Courses</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{instructorCourses.filter(c => c.isPublished).length}</span>
                          <span className="stat-label">Published Courses</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{instructorCourses.reduce((sum, c) => sum + (c.totalEnrollments || 0), 0)}</span>
                          <span className="stat-label">Total Enrollments</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{instructorCourses.reduce((sum, c) => sum + (c.averageRating || 0), 0) / instructorCourses.length || 0}</span>
                          <span className="stat-label">Avg Rating</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'courses' && (
                  <div className="courses-content">
                    <div className="courses-grid">
                      {instructorCourses.map(course => (
                        <div
                          key={course._id}
                          className="course-card"
                          onClick={() => handleCourseSelect(course)}
                        >
                          <div className="course-thumbnail">
                            {course.thumbnail ? (
                              <img src={course.thumbnail} alt={course.title} />
                            ) : (
                              <div className="thumbnail-placeholder">No Image</div>
                            )}
                            <span className={`course-status ${course.isPublished ? 'published' : 'draft'}`}>
                              {course.isPublished ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <div className="course-info">
                            <h4>{course.title}</h4>
                            <p className="course-description">{course.shortDescription}</p>
                            <div className="course-stats">
                              <span>${course.price}</span>
                              <span>{course.totalEnrollments || 0} students</span>
                              <span>★ {course.averageRating || 0}</span>
                            </div>
                            <div className="course-meta">
                              <span>Level: {course.level}</span>
                              <span>Category: {course.category}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="analytics-content">
                    <div className="analytics-grid">
                      <div className="analytics-card">
                        <h4>Course Performance</h4>
                        <div className="performance-list">
                          {instructorCourses.slice(0, 5).map(course => (
                            <div key={course._id} className="performance-item">
                              <span className="course-name">{course.title}</span>
                              <div className="performance-stats">
                                <span>{course.totalEnrollments || 0} enrollments</span>
                                <span>★ {course.averageRating || 0}</span>
                                <span>${course.price}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="analytics-card">
                        <h4>Revenue Overview</h4>
                        <div className="revenue-stats">
                          <div className="revenue-item">
                            <label>Total Revenue:</label>
                            <span>${instructorCourses.reduce((sum, c) => sum + ((c.price || 0) * (c.totalEnrollments || 0)), 0).toFixed(2)}</span>
                          </div>
                          <div className="revenue-item">
                            <label>Average Course Price:</label>
                            <span>${(instructorCourses.reduce((sum, c) => sum + (c.price || 0), 0) / instructorCourses.length || 0).toFixed(2)}</span>
                          </div>
                          <div className="revenue-item">
                            <label>Best Selling Course:</label>
                            <span>{instructorCourses.sort((a, b) => (b.totalEnrollments || 0) - (a.totalEnrollments || 0))[0]?.title || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="analytics-card">
                        <h4>Student Engagement</h4>
                        <div className="engagement-stats">
                          <div className="engagement-item">
                            <label>Total Students:</label>
                            <span>{instructorCourses.reduce((sum, c) => sum + (c.totalEnrollments || 0), 0)}</span>
                          </div>
                          <div className="engagement-item">
                            <label>Average Rating:</label>
                            <span>★ {(instructorCourses.reduce((sum, c) => sum + (c.averageRating || 0), 0) / instructorCourses.length || 0).toFixed(1)}</span>
                          </div>
                          <div className="engagement-item">
                            <label>Total Reviews:</label>
                            <span>{instructorCourses.reduce((sum, c) => sum + (c.totalRatings || 0), 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'enrollments' && selectedCourse && (
                  <div className="enrollments-content">
                    <div className="enrollments-header">
                      <h4>Enrollments for "{selectedCourse.title}"</h4>
                      <span className="enrollments-count">{courseEnrollments.length} total enrollments</span>
                    </div>
                    <div className="enrollments-list">
                      {courseEnrollments.map(enrollment => (
                        <div key={enrollment._id} className="enrollment-item">
                          <div className="student-info">
                            <div className="student-avatar">
                              {enrollment.student.avatar ? (
                                <img src={enrollment.student.avatar} alt={enrollment.student.firstName} />
                              ) : (
                                <div className="avatar-placeholder small">
                                  {enrollment.student.firstName.charAt(0)}{enrollment.student.lastName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="student-details">
                              <h5>{enrollment.student.firstName} {enrollment.student.lastName}</h5>
                              <p>{enrollment.student.email}</p>
                            </div>
                          </div>
                          <div className="enrollment-stats">
                            <div className="stat">
                              <label>Enrolled:</label>
                              <span>{new Date(enrollment.enrollmentDate).toLocaleDateString()}</span>
                            </div>
                            <div className="stat">
                              <label>Progress:</label>
                              <span>{enrollment.progress?.completionPercentage || 0}%</span>
                            </div>
                            <div className="stat">
                              <label>Status:</label>
                              <span className={`status ${enrollment.status}`}>{enrollment.status}</span>
                            </div>
                            <div className="stat">
                              <label>Payment:</label>
                              <span>${enrollment.payment?.amount || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <h3>Select an instructor to view details</h3>
              <p>Click on any instructor from the list to see their profile, courses, and analytics.</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default AdminInstructors;