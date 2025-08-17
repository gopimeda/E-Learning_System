import React, { useState } from 'react';
import { 
  Home, 
  BookOpen, 
  Users, 
  User, 

  LogOut, 
  Menu, 
  X, 
  GraduationCap, 
  Award, 
  Star, 
  UserCheck, 
  BookMarked, 
  UserPlus, 
  ClipboardList, 
  FileText,
  Shield,
  BarChart3,
  Database,
  UserCog
} from 'lucide-react';
import './Navbar.css';

const Navbar = ({ 
  currentPage, 
  setCurrentPage, 
  isAuthenticated, 
  setIsAuthenticated, 
  userRole = 'student',
  userData = null,
  onLogout,
  setSelectedCourseId
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigation = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
    
    // Clear selected course when navigating to certain pages
    if (['home', 'courses', 'dashboard', 'instructor-dashboard', 'admin-dashboard'].includes(page)) {
      if (setSelectedCourseId) {
        setSelectedCourseId(null);
      }
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      setIsAuthenticated(false);
      setCurrentPage('home');
      // Note: localStorage usage removed as per Claude.ai artifact restrictions
    }
    setIsMenuOpen(false);
  };

  const getNavigationItems = () => {
    const universalItems = [
      { key: 'home', label: 'Home', icon: Home },
      { key: 'courses', label: 'All Courses', icon: BookOpen }
    ];

    if (!isAuthenticated) {
      return universalItems;
    }

    // For admin users, don't include universal items - show only admin-specific items
    if (userRole === 'admin') {
      return [
        { key: 'admin-dashboard', label: 'Dashboard', icon: Shield },
        { key: 'admin-users', label: 'Users', icon: Users },
        //{ key: 'admin-instructors', label: 'Instructors', icon: UserCog },
        { key: 'admin-courses', label: 'Courses', icon: BookOpen },
        { key: 'admin-enrollments', label: 'Enrollments', icon: UserCheck },
        //{ key: 'admin-analytics', label: 'Analytics', icon: BarChart3 },
        { key: 'admin-reviews', label: 'Reviews', icon: Star }
      ];
    }

    // For students and instructors, include universal items
    const authenticatedItems = [...universalItems];

    if (userRole === 'student') {
      authenticatedItems.push(
        { key: 'dashboard', label: 'Dashboard', icon: GraduationCap },
        { key: 'my-courses', label: 'My Courses', icon: BookMarked },
        { key: 'enroll', label: 'Enroll', icon: UserPlus },
        { key: 'test', label: 'Test', icon: FileText },
        { key: 'reviews', label: 'Reviews', icon: Star }
        
      );
    } else if (userRole === 'instructor') {
      authenticatedItems.push(
        { key: 'instructor-dashboard', label: 'Dashboard', icon: GraduationCap },
        { key: 'instructor-courses', label: 'My Courses', icon: BookMarked },
        { key: 'instructor-lessons', label: 'Lessons', icon: BookOpen },
        { key: 'instructor-quizzes', label: 'Quizzes', icon: ClipboardList },
        { key: 'instructor-reviews', label: 'Reviews', icon: Star },
        { key: 'instructor-enrollments', label: 'Enrollments', icon: UserCheck }
      );
    }

    return authenticatedItems;
  };

  
  const navigationItems = getNavigationItems();

  const getUserDisplayName = () => {
    if (!userData) return 'User';
    return userData.firstName || userData.fullName || 'User';
  };

  const getRoleBadgeColor = () => {
    switch (userRole) {
      case 'instructor':
        return 'role-badge-instructor';
      case 'student':
        return 'role-badge-student';
      case 'admin':
        return 'role-badge-admin';
      default:
        return 'role-badge-default';
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          <div className="navbar-brand" onClick={() => handleNavigation('home')}>
            <div className="brand-icon">
              <GraduationCap className="brand-icon-svg" />
            </div>
            <span className="brand-text">EduPlatform</span>
          </div>

          <div className="navbar-nav-desktop">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavigation(item.key)}
                  className={`nav-item ${currentPage === item.key ? 'nav-item-active' : ''}`}
                >
                  <Icon className="nav-icon" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="navbar-auth-desktop">
            {isAuthenticated ? (
              <div className="auth-section">
                <div className="user-info">
                  <div className="user-avatar">
                    <span className="user-initial">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="user-details">
                    <span className="user-name">
                      {getUserDisplayName()}
                    </span>
                    <span className={`user-role ${getRoleBadgeColor()}`}>
                      {userRole}
                    </span>
                  </div>
                </div>

                {/* Hide Profile button for admin users */}
                {userRole !== 'admin' && (
                  <button
                    onClick={() => handleNavigation('profile')}
                    className={`nav-item ${currentPage === 'profile' ? 'nav-item-active' : ''}`}
                  >
                    <User className="nav-icon" />
                    <span>Profile</span>
                  </button>
                )}
                
                <button
                  onClick={handleLogout}
                  className="logout-btn"
                >
                  <LogOut className="nav-icon" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button
                  onClick={() => handleNavigation('login')}
                  className={`login-btn ${currentPage === 'login' ? 'login-btn-active' : ''}`}
                >
                  Login
                </button>
                <button
                  onClick={() => handleNavigation('register')}
                  className={`signup-btn ${currentPage === 'register' ? 'signup-btn-active' : ''}`}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          <div className="mobile-menu-button">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="menu-toggle"
            >
              {isMenuOpen ? <X className="menu-icon" /> : <Menu className="menu-icon" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="mobile-menu">
            <div className="mobile-menu-content">
              {isAuthenticated && (
                <div className="mobile-user-info">
                  <div className="mobile-user-avatar">
                    <span className="mobile-user-initial">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="mobile-user-details">
                    <span className="mobile-user-name">
                      {getUserDisplayName()}
                    </span>
                    <span className={`mobile-user-role ${getRoleBadgeColor()}`}>
                      {userRole}
                    </span>
                  </div>
                </div>
              )}

              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavigation(item.key)}
                    className={`mobile-nav-item ${currentPage === item.key ? 'mobile-nav-item-active' : ''}`}
                  >
                    <Icon className="mobile-nav-icon" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              <div className="mobile-auth-section">
                {isAuthenticated ? (
                  <>
                    {/* Hide Profile button for admin users in mobile menu */}
                    {userRole !== 'admin' && (
                      <button
                        onClick={() => handleNavigation('profile')}
                        className={`mobile-nav-item ${currentPage === 'profile' ? 'mobile-nav-item-active' : ''}`}
                      >
                        <User className="mobile-nav-icon" />
                        <span>Profile</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="mobile-logout-btn"
                    >
                      <LogOut className="mobile-nav-icon" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleNavigation('login')}
                      className={`mobile-login-btn ${currentPage === 'login' ? 'mobile-login-btn-active' : ''}`}
                    >
                      Login
                    </button>
                    <button
                      onClick={() => handleNavigation('register')}
                      className={`mobile-signup-btn ${currentPage === 'register' ? 'mobile-signup-btn-active' : ''}`}
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;