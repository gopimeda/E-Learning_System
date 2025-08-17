import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Lesson from './pages/Lesson';
import Profile from './pages/Profile';
import Quiz from './pages/Quiz';
import NotFound from './pages/NotFound';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('student'); // 'student' or 'instructor'

  // Check for existing authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');
    
    if (token) {
      setIsAuthenticated(true);
      setUserRole(role || 'student');
    }
  }, []);

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return <Home />;
        
      case 'dashboard':
        return isAuthenticated ? (
          <Dashboard userRole={userRole} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated} 
            setUserRole={setUserRole}
          />
        );
        
      case 'courses':
        return <Courses setCurrentPage={setCurrentPage} />;
        
      case 'my-courses':
        return isAuthenticated && userRole === 'student' ? (
          <Courses setCurrentPage={setCurrentPage} userCourses={true} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
          />
        );
        
      case 'manage-courses':
        return isAuthenticated && userRole === 'instructor' ? (
          <Courses setCurrentPage={setCurrentPage} manageCourses={true} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
          />
        );
        
      case 'students':
        return isAuthenticated && userRole === 'instructor' ? (
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Students Management</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Students management page - Coming soon!</p>
            </div>
          </div>
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
          />
        );
        
      case 'course-detail':
        return <CourseDetail setCurrentPage={setCurrentPage} />;
        
      case 'lesson':
        return <Lesson setCurrentPage={setCurrentPage} />;
        
      case 'profile':
        return isAuthenticated ? (
          <Profile userRole={userRole} />
        ) : (
          <Login 
            setCurrentPage={setCurrentPage} 
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
          />
        );
        
      case 'quiz':
        return <Quiz setCurrentPage={setCurrentPage} />;
        
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
      />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;