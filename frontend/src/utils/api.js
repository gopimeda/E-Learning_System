// utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Get token from localStorage if it exists
  const token = localStorage.getItem('token');
  if (token) {
    defaultOptions.headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Course API functions
export const courseAPI = {
  // Get all courses with optional filters
  getAllCourses: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/courses${queryString ? `?${queryString}` : ''}`;
    return await apiRequest(endpoint);
  },

  // Get a specific course by ID
  getCourseById: async (courseId) => {
    return await apiRequest(`/courses/${courseId}`);
  },

  // Create a new course (instructor only)
  createCourse: async (courseData) => {
    return await apiRequest('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // Update a course (instructor only)
  updateCourse: async (courseId, courseData) => {
    return await apiRequest(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // Delete a course (instructor only)
  deleteCourse: async (courseId) => {
    return await apiRequest(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  // Get courses by category
  getCoursesByCategory: async (category) => {
    return await apiRequest(`/courses?category=${encodeURIComponent(category)}`);
  },

  // Search courses
  searchCourses: async (searchTerm) => {
    return await apiRequest(`/courses?search=${encodeURIComponent(searchTerm)}`);
  },

  // Get featured courses
  getFeaturedCourses: async (limit = 6) => {
    return await apiRequest(`/courses?featured=true&limit=${limit}`);
  },

  // Get instructor's courses
  getInstructorCourses: async () => {
    return await apiRequest('/courses/instructor/my-courses');
  },
};

// Auth API functions
export const authAPI = {
  login: async (credentials) => {
    return await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  register: async (userData) => {
    return await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout: async () => {
    return await apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  refreshToken: async () => {
    return await apiRequest('/auth/refresh', {
      method: 'POST',
    });
  },

  forgotPassword: async (email) => {
    return await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token, newPassword) => {
    return await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
};

// User API functions
export const userAPI = {
  getProfile: async () => {
    return await apiRequest('/users/profile');
  },

  updateProfile: async (userData) => {
    return await apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  uploadAvatar: async (formData) => {
    return await apiRequest('/users/upload-avatar', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },

  changePassword: async (passwordData) => {
    return await apiRequest('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  },
};

// Enrollment API functions
export const enrollmentAPI = {
  enrollInCourse: async (courseId) => {
    return await apiRequest('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    });
  },

  getUserEnrollments: async () => {
    return await apiRequest('/enrollments/my-enrollments');
  },

  getEnrollmentById: async (enrollmentId) => {
    return await apiRequest(`/enrollments/${enrollmentId}`);
  },

  unenrollFromCourse: async (enrollmentId) => {
    return await apiRequest(`/enrollments/${enrollmentId}`, {
      method: 'DELETE',
    });
  },
};

// Progress API functions
export const progressAPI = {
  getProgress: async (courseId) => {
    return await apiRequest(`/progress/course/${courseId}`);
  },

  updateProgress: async (lessonId, progressData) => {
    return await apiRequest(`/progress/lesson/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(progressData),
    });
  },

  markLessonComplete: async (lessonId) => {
    return await apiRequest(`/progress/lesson/${lessonId}/complete`, {
      method: 'POST',
    });
  },
};

// Reviews API functions
export const reviewAPI = {
  getCourseReviews: async (courseId) => {
    return await apiRequest(`/reviews/course/${courseId}`);
  },

  createReview: async (reviewData) => {
    return await apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  },

  updateReview: async (reviewId, reviewData) => {
    return await apiRequest(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  },

  deleteReview: async (reviewId) => {
    return await apiRequest(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  },
};

// Quiz API functions
export const quizAPI = {
  getQuiz: async (quizId) => {
    return await apiRequest(`/quizzes/${quizId}`);
  },

  submitQuizAttempt: async (quizId, answers) => {
    return await apiRequest(`/quizzes/${quizId}/attempt`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  getQuizAttempts: async (quizId) => {
    return await apiRequest(`/quizzes/${quizId}/attempts`);
  },
};

// Statistics API (for home page)
export const statsAPI = {
  getHomeStats: async () => {
    return await apiRequest('/stats/home');
  },

  getDashboardStats: async () => {
    return await apiRequest('/stats/dashboard');
  },
};

// Default export with all APIs
const api = {
  courseAPI,
  authAPI,
  userAPI,
  enrollmentAPI,
  progressAPI,
  reviewAPI,
  quizAPI,
  statsAPI,
};

export default api;