import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';

import Courses from './pages/Courses';
import MyCourses from './pages/MyCourses'; 
import CourseDetail from './pages/CourseDetail';
import CourseLearning from './pages/CourseLearning'; 
import Lesson from './pages/Lesson';
import Profile from './pages/Profile';
import Quiz from './pages/Quiz';
import Score from './pages/Score';
import Reviews from './pages/Reviews';
import Enrollments from './pages/Enrollments';

import Enroll from './pages/Enroll'; 
import NotFound from './pages/NotFound';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorCourses from './pages/instructor/InstructorCourses';
import InstructorLessons from './pages/instructor/InstructorLessons';
import InstructorReviews from './pages/instructor/InstructorReviews';
import InstructorEnrollments from './pages/instructor/InstructorEnrollments';
import InstructorQuizzes from './pages/instructor/InstructorQuizzes'; 



import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminInstructors from './pages/admin/AdminInstructors';
import AdminCourses from './pages/admin/AdminCourses';
import AdminEnrollments from './pages/admin/AdminEnrollments';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminReviews from './pages/admin/AdminReviews';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('student'); // 'student', 'instructor', or 'admin'
  const [userData, setUserData] = useState(null); // Store full user data
  const [selectedCourseId, setSelectedCourseId] = useState(null); // For course-specific pages

  // Check for existing authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');
    const storedUserData = localStorage.getItem('userData');
    
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
      
      // Parse and set user data if available
      if (storedUserData) {
        try {
          setUserData(JSON.parse(storedUserData));
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      }
    }
  }, []);

  // Handle logout - clear all user data
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('student');
    setUserData(null);
    setCurrentPage('home');
    setSelectedCourseId(null);
    
    // Clear localStorage
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
  };

  const renderPage = () => {
    // Handle dynamic course learning routes
    if (currentPage.startsWith('course-learn-')) {
      const courseId = currentPage.replace('course-learn-', '');
      return isAuthenticated && userRole === 'student' ? (
        <CourseLearning 
          setCurrentPage={setCurrentPage} 
          userData={userData} 
          courseId={courseId}
          setSelectedCourseId={setSelectedCourseId}
        />
      ) : (
        <Login 
          setCurrentPage={setCurrentPage} 
          setIsAuthenticated={setIsAuthenticated}
          setUserRole={setUserRole}
          setUserData={setUserData}
        />
      );
    }

    switch(currentPage) {
      case 'home':
        return <Home />;
        
      case 'dashboard':
        return isAuthenticated ? (
          <Dashboard userRole={userRole} userData={userData} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated} 
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'instructor-dashboard':
        return isAuthenticated && userRole === 'instructor' ? (
          <InstructorDashboard userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      // Admin Dashboard Routes
      case 'admin-dashboard':
        return isAuthenticated && userRole === 'admin' ? (
          <AdminDashboard userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'admin-users':
        return isAuthenticated && userRole === 'admin' ? (
          <AdminUsers userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'admin-instructors':
        return isAuthenticated && userRole === 'admin' ? (
          <AdminInstructors userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'admin-courses':
        return isAuthenticated && userRole === 'admin' ? (
          <AdminCourses userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'admin-enrollments':
        return isAuthenticated && userRole === 'admin' ? (
          <AdminEnrollments userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'admin-analytics':
        return isAuthenticated && userRole === 'admin' ? (
          <AdminAnalytics userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'admin-reviews':
        return isAuthenticated && userRole === 'admin' ? (
          <AdminReviews userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );
        
      case 'courses':
        // Universal courses page - shows all available courses
        return <Courses setCurrentPage={setCurrentPage} setSelectedCourseId={setSelectedCourseId} />;
        
      case 'my-courses':
        // Student's enrolled courses - separate component
        return isAuthenticated && userRole === 'student' ? (
          <MyCourses setCurrentPage={setCurrentPage} userData={userData} setSelectedCourseId={setSelectedCourseId} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'course-learning':
        // Generic course learning page for enrolled students
        return isAuthenticated && userRole === 'student' ? (
          <CourseLearning 
            setCurrentPage={setCurrentPage} 
            userData={userData} 
            courseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
          />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'enroll':
        // Course enrollment page
        return (
          <Enroll 
            setCurrentPage={setCurrentPage} 
            userData={userData} 
            courseId={selectedCourseId}
            isAuthenticated={isAuthenticated}
          />
        );

      case 'test': //ed Test route for students
        return isAuthenticated && userRole === 'student' ? (
          <Quiz 
            setCurrentPage={setCurrentPage} 
            courseId={selectedCourseId}
            userData={userData}
          />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'score':
        return isAuthenticated && userRole === 'student' ? (
          <Score userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'reviews':
        return isAuthenticated && userRole === 'student' ? (
          <Reviews userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'enrollments':
        return isAuthenticated && userRole === 'instructor' ? (
          <Enrollments userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'instructor-courses':
        return isAuthenticated && userRole === 'instructor' ? (
          <InstructorCourses userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'instructor-lessons':
        return isAuthenticated && userRole === 'instructor' ? (
          <InstructorLessons userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'instructor-quizzes': // New quiz management case
        return isAuthenticated && userRole === 'instructor' ? (
          <InstructorQuizzes userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'instructor-reviews':
        return isAuthenticated && userRole === 'instructor' ? (
          <InstructorReviews userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );

      case 'instructor-enrollments':
        return isAuthenticated && userRole === 'instructor' ? (
          <InstructorEnrollments userData={userData} setCurrentPage={setCurrentPage} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );
        
      case 'course-detail':
        return (
          <CourseDetail 
            setCurrentPage={setCurrentPage} 
            courseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            isAuthenticated={isAuthenticated}
            userData={userData}
          />
        );
        
      case 'lesson':
        return (
          <Lesson 
            setCurrentPage={setCurrentPage} 
            courseId={selectedCourseId}
            userData={userData}
          />
        );
        
      case 'profile':
        return isAuthenticated ? (
          <Profile userRole={userRole} userData={userData} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );
        
      case 'quiz':
        return (
          <Quiz 
            setCurrentPage={setCurrentPage} 
            courseId={selectedCourseId}
            userData={userData}
          />
        );
        
      case 'login':
        return isAuthenticated ? (
          // If already authenticated, redirect to appropriate dashboard
          (() => {
            if (userRole === 'admin') {
              setCurrentPage('admin-dashboard');
              return <AdminDashboard userData={userData} setCurrentPage={setCurrentPage} />;
            } else if (userRole === 'instructor') {
              setCurrentPage('instructor-dashboard');
              return <InstructorDashboard userData={userData} setCurrentPage={setCurrentPage} />;
            } else {
              setCurrentPage('dashboard');
              return <Dashboard userRole={userRole} userData={userData} />;
            }
          })()
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );
        
      case 'register':
        return isAuthenticated ? (
          // If already authenticated, redirect to appropriate dashboard
          (() => {
            if (userRole === 'admin') {
              setCurrentPage('admin-dashboard');
              return <AdminDashboard userData={userData} setCurrentPage={setCurrentPage} />;
            } else if (userRole === 'instructor') {
              setCurrentPage('instructor-dashboard');
              return <InstructorDashboard userData={userData} setCurrentPage={setCurrentPage} />;
            } else {
              setCurrentPage('dashboard');
              return <Dashboard userRole={userRole} userData={userData} />;
            }
          })()
        ) : (
          <Register 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
            setUserData={setUserData}
          />
        );
        
      default:
        return <NotFound setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="App min-h-screen bg-gray-50">
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userRole={userRole}
        userData={userData}
        onLogout={handleLogout}
        setSelectedCourseId={setSelectedCourseId}
      />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;