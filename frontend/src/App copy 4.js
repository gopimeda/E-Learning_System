import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import Courses from './pages/Courses';
import MyCourses from './pages/MyCourses'; // New component for student's enrolled courses
import CourseDetail from './pages/CourseDetail';
import Lesson from './pages/Lesson';
import Profile from './pages/Profile';
import Quiz from './pages/Quiz';
import Score from './pages/Score';
import Reviews from './pages/Reviews';
import Enrollments from './pages/Enrollments';
import InstructorCourses from './pages/InstructorCourses';
import InstructorLessons from './pages/InstructorLessons';
import InstructorReviews from './pages/InstructorReviews';
import InstructorEnrollments from './pages/InstructorEnrollments';
import InstructorQuizzes from './pages/InstructorQuizzes'; // New Quiz Management component
import Enroll from './pages/Enroll'; //ed Enroll component
import NotFound from './pages/NotFound';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('student'); // 'student' or 'instructor'
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
        return isAuthenticated && userRole === 'instructor' ? (
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
          // If already authenticated, redirect to home
          (() => {
            setCurrentPage('home');
            return <Home />;
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
          // If already authenticated, redirect to home
          (() => {
            setCurrentPage('home');
            return <Home />;
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