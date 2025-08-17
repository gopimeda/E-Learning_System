import React, { createContext, useContext, useReducer } from 'react';
import { courseAPI, enrollmentAPI, progressAPI } from '../utils/api';
import toast from 'react-hot-toast';

// Course Context
const CourseContext = createContext();

// Course Actions
const COURSE_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  FETCH_COURSES_SUCCESS: 'FETCH_COURSES_SUCCESS',
  FETCH_COURSE_SUCCESS: 'FETCH_COURSE_SUCCESS',
  CREATE_COURSE_SUCCESS: 'CREATE_COURSE_SUCCESS',
  UPDATE_COURSE_SUCCESS: 'UPDATE_COURSE_SUCCESS',
  DELETE_COURSE_SUCCESS: 'DELETE_COURSE_SUCCESS',
  ENROLL_SUCCESS: 'ENROLL_SUCCESS',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial State
const initialState = {
  courses: [],
  currentCourse: null,
  enrolledCourses: [],
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCourses: 0
  }
};

// Course Reducer
const courseReducer = (state, action) => {
  switch (action.type) {
    case COURSE_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    
    case COURSE_ACTIONS.FETCH_COURSES_SUCCESS:
      return {
        ...state,
        courses: action.payload.courses,
        pagination: action.payload.pagination,
        loading: false,
        error: null
      };
    
    case COURSE_ACTIONS.FETCH_COURSE_SUCCESS:
      return {
        ...state,
        currentCourse: action.payload,
        loading: false,
        error: null
      };
    
    case COURSE_ACTIONS.CREATE_COURSE_SUCCESS:
      return {
        ...state,
        courses: [action.payload, ...state.courses],
        loading: false,
        error: null
      };
    
    case COURSE_ACTIONS.UPDATE_COURSE_SUCCESS:
      return {
        ...state,
        courses: state.courses.map(course =>
          course._id === action.payload._id ? action.payload : course
        ),
        currentCourse: state.currentCourse?._id === action.payload._id 
          ? action.payload 
          : state.currentCourse,
        loading: false,
        error: null
      };
    
    case COURSE_ACTIONS.DELETE_COURSE_SUCCESS:
      return {
        ...state,
        courses: state.courses.filter(course => course._id !== action.payload),
        currentCourse: state.currentCourse?._id === action.payload 
          ? null 
          : state.currentCourse,
        loading: false,
        error: null
      };
    
    case COURSE_ACTIONS.ENROLL_SUCCESS:
      return {
        ...state,
        enrolledCourses: [...state.enrolledCourses, action.payload],
        loading: false,
        error: null
      };
    
    case COURSE_ACTIONS.UPDATE_PROGRESS:
      return {
        ...state,
        enrolledCourses: state.enrolledCourses.map(enrollment =>
          enrollment._id === action.payload.enrollmentId
            ? { ...enrollment, progress: action.payload.progress }
            : enrollment
        ),
        error: null
      };
    
    case COURSE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    
    case COURSE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Course Provider Component
export const CourseProvider = ({ children }) => {
  const [state, dispatch] = useReducer(courseReducer, initialState);

  // Fetch all courses
  const fetchCourses = async (filters = {}) => {
    try {
      dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });
      const response = await courseAPI.getAllCourses(filters);
      
      dispatch({
        type: COURSE_ACTIONS.FETCH_COURSES_SUCCESS,
        payload: {
          courses: response.data.courses,
          pagination: response.data.pagination
        }
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch courses';
      dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  // Fetch single course
  const fetchCourse = async (courseId) => {
    try {
      dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });
      const response = await courseAPI.getCourseById(courseId);
      
      dispatch({
        type: COURSE_ACTIONS.FETCH_COURSE_SUCCESS,
        payload: response.data.course
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch course';
      dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  // Create new course
  const createCourse = async (courseData) => {
    try {
      dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });
      const response = await courseAPI.createCourse(courseData);
      
      dispatch({
        type: COURSE_ACTIONS.CREATE_COURSE_SUCCESS,
        payload: response.data.course
      });
      
      toast.success('Course created successfully!');
      return { success: true, course: response.data.course };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create course';
      dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update course
  const updateCourse = async (courseId, courseData) => {
    try {
      dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });
      const response = await courseAPI.updateCourse(courseId, courseData);
      
      dispatch({
        type: COURSE_ACTIONS.UPDATE_COURSE_SUCCESS,
        payload: response.data.course
      });
      
      toast.success('Course updated successfully!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update course';
      dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Delete course
  const deleteCourse = async (courseId) => {
    try {
      dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });
      await courseAPI.deleteCourse(courseId);
      
      dispatch({
        type: COURSE_ACTIONS.DELETE_COURSE_SUCCESS,
        payload: courseId
      });
      
      toast.success('Course deleted successfully!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete course';
      dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Enroll in course
  const enrollInCourse = async (courseId) => {
    try {
      dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });
      const response = await enrollmentAPI.enrollInCourse(courseId);
      
      dispatch({
        type: COURSE_ACTIONS.ENROLL_SUCCESS,
        payload: response.data.enrollment
      });
      
      toast.success('Successfully enrolled in course!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to enroll in course';
      dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update progress
  const updateProgress = async (enrollmentId, lessonId, completed = true) => {
    try {
      const response = await progressAPI.updateProgress({
        enrollmentId,
        lessonId,
        completed
      });
      
      dispatch({
        type: COURSE_ACTIONS.UPDATE_PROGRESS,
        payload: {
          enrollmentId,
          progress: response.data.progress
        }
      });
      
      if (completed) {
        toast.success('Lesson completed!');
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update progress';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: COURSE_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    fetchCourses,
    fetchCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollInCourse,
    updateProgress,
    clearError
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};

// Custom hook to use course context
export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};