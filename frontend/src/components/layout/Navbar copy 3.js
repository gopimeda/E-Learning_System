import React, { useState } from 'react';
import { 
  Home, BookOpen, Users, User, Settings, LogOut, Menu, X, GraduationCap, 
  Award, Star, UserCheck, BookMarked, UserPlus, ClipboardList, FileText,
  Shield, Database, BarChart3, UserCog, BookOpenCheck, UserX, Activity,
  Crown, Settings2, TrendingUp
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
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  const handleNavigation = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
    setIsAdminMenuOpen(false);
    
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
    }
    setIsMenuOpen(false);
    setIsAdminMenuOpen(false);
  };

  const getNavigationItems = () => {
    const universalItems = [
      { key: 'home', label: 'Home', icon: Home, category: 'universal' }
    ];

    if (!isAuthenticated) {
      universalItems.push({ key: 'courses', label: 'Browse Courses', icon: BookOpen, category: 'universal' });
      return universalItems;
    }

    const authenticatedItems = [...universalItems];

    if (userRole === 'admin') {
      // Admin-specific navigation
      authenticatedItems.push(
        { key: 'admin-dashboard', label: 'Admin Dashboard', icon: Shield, category: 'admin', primary: true },
        { key: 'admin-analytics', label: 'Analytics', icon: BarChart3, category: 'admin' },
        { key: 'admin-users', label: 'User Management', icon: UserCog, category: 'admin' },
        { key: 'admin-instructors', label: 'Instructors', icon: GraduationCap, category: 'admin' },
        { key: 'admin-students', label: 'Students', icon: Users, category: 'admin' },
        { key: 'admin-courses', label: 'Course Management', icon: BookOpenCheck, category: 'admin' },
        { key: 'admin-enrollments', label: 'Enrollments', icon: UserCheck, category: 'admin' },
        { key: 'admin-reviews', label: 'Reviews', icon: Star, category: 'admin' },
        { key: 'admin-reports', label: 'Reports', icon: FileText, category: 'admin' },
        { key: 'admin-settings', label: 'System Settings', icon: Settings2, category: 'admin' }
      );
    } else if (userRole === 'student') {
      authenticatedItems.push(
        { key: 'courses', label: 'All Courses', icon: BookOpen, category: 'universal' },
        { key: 'dashboard', label: 'Dashboard', icon: GraduationCap, category: 'student', primary: true },
        { key: 'my-courses', label: 'My Courses', icon: BookMarked, category: 'student' },
        { key: 'enroll', label: 'Enroll', icon: UserPlus, category: 'student' },
        { key: 'test', label: 'Tests', icon: FileText, category: 'student' },
        { key: 'reviews', label: 'My Reviews', icon: Star, category: 'student' }
      );
    } else if (userRole === 'instructor') {
      authenticatedItems.push(
        { key: 'courses', label: 'All Courses', icon: BookOpen, category: 'universal' },
        { key: 'instructor-dashboard', label: 'Dashboard', icon: GraduationCap, category: 'instructor', primary: true },
        { key: 'instructor-courses', label: 'My Courses', icon: BookMarked, category: 'instructor' },
        { key: 'instructor-lessons', label: 'Lessons', icon: BookOpen, category: 'instructor' },
        { key: 'instructor-quizzes', label: 'Quizzes', icon: ClipboardList, category: 'instructor' },
        { key: 'instructor-reviews', label: 'Reviews', icon: Star, category: 'instructor' },
        { key: 'instructor-enrollments', label: 'Enrollments', icon: UserCheck, category: 'instructor' }
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
      case 'admin':
        return 'role-badge-admin';
      case 'instructor':
        return 'role-badge-instructor';
      case 'student':
        return 'role-badge-student';
      default:
        return 'role-badge-default';
    }
  };

  const getRoleIcon = () => {
    switch (userRole) {
      case 'admin':
        return Crown;
      case 'instructor':
        return GraduationCap;
      case 'student':
        return User;
      default:
        return User;
    }
  };

  // Group navigation items for admin
  const getGroupedAdminItems = () => {
    const items = navigationItems.filter(item => item.category === 'admin');
    return {
      management: items.filter(item => ['admin-users', 'admin-instructors', 'admin-students', 'admin-courses'].includes(item.key)),
      operations: items.filter(item => ['admin-enrollments', 'admin-reviews', 'admin-reports'].includes(item.key)),
      system: items.filter(item => ['admin-analytics', 'admin-settings'].includes(item.key))
    };
  };

  const RoleIcon = getRoleIcon();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          {/* Brand */}
          <div className="navbar-brand" onClick={() => handleNavigation('home')}>
            <div className="brand-icon">
              <GraduationCap className="brand-icon-svg" />
            </div>
            <span className="brand-text">EduPlatform</span>
          </div>

          {/* Desktop Navigation */}
          <div className="navbar-nav-desktop">
            {/* Universal Items */}
            {navigationItems.filter(item => item.category === 'universal' || item.primary).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavigation(item.key)}
                  className={`nav-item ${currentPage === item.key ? 'nav-item-active' : ''} ${item.primary ? 'nav-item-primary' : ''}`}
                >
                  <Icon className="nav-icon" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Admin Dropdown Menu */}
            {isAuthenticated && userRole === 'admin' && (
              <div className="admin-dropdown">
                <button
                  onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                  className={`nav-item admin-menu-trigger ${isAdminMenuOpen ? 'nav-item-active' : ''}`}
                >
                  <Settings className="nav-icon" />
                  <span>Admin Tools</span>
                  <div className={`dropdown-arrow ${isAdminMenuOpen ? 'dropdown-arrow-up' : ''}`}>
                    ▼
                  </div>
                </button>

                {isAdminMenuOpen && (
                  <div className="admin-dropdown-menu">
                    <div className="admin-menu-section">
                      <h4 className="admin-menu-title">Management</h4>
                      {getGroupedAdminItems().management.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            onClick={() => handleNavigation(item.key)}
                            className={`admin-menu-item ${currentPage === item.key ? 'admin-menu-item-active' : ''}`}
                          >
                            <Icon className="admin-menu-icon" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="admin-menu-section">
                      <h4 className="admin-menu-title">Operations</h4>
                      {getGroupedAdminItems().operations.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            onClick={() => handleNavigation(item.key)}
                            className={`admin-menu-item ${currentPage === item.key ? 'admin-menu-item-active' : ''}`}
                          >
                            <Icon className="admin-menu-icon" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="admin-menu-section">
                      <h4 className="admin-menu-title">System</h4>
                      {getGroupedAdminItems().system.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            onClick={() => handleNavigation(item.key)}
                            className={`admin-menu-item ${currentPage === item.key ? 'admin-menu-item-active' : ''}`}
                          >
                            <Icon className="admin-menu-icon" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Regular Navigation Items (for non-admin users) */}
            {isAuthenticated && userRole !== 'admin' && 
              navigationItems.filter(item => !item.primary && item.category !== 'universal').map((item) => {
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
              })
            }
          </div>

          {/* Desktop Auth Section */}
          <div className="navbar-auth-desktop">
            {isAuthenticated ? (
              <div className="auth-section">
                <div className="user-info">
                  <div className={`user-avatar ${userRole === 'admin' ? 'user-avatar-admin' : ''}`}>
                    {userRole === 'admin' && <Crown className="admin-crown-icon" />}
                    <span className="user-initial">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="user-details">
                    <span className="user-name">
                      {getUserDisplayName()}
                    </span>
                    <span className={`user-role ${getRoleBadgeColor()}`}>
                      <RoleIcon className="role-icon" />
                      {userRole}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleNavigation('profile')}
                  className={`nav-item ${currentPage === 'profile' ? 'nav-item-active' : ''}`}
                >
                  <User className="nav-icon" />
                  <span>Profile</span>
                </button>
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

          {/* Mobile Menu Button */}
          <div className="mobile-menu-button">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="menu-toggle"
            >
              {isMenuOpen ? <X className="menu-icon" /> : <Menu className="menu-icon" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="mobile-menu">
            <div className="mobile-menu-content">
              {isAuthenticated && (
                <div className="mobile-user-info">
                  <div className={`mobile-user-avatar ${userRole === 'admin' ? 'mobile-user-avatar-admin' : ''}`}>
                    {userRole === 'admin' && <Crown className="mobile-admin-crown-icon" />}
                    <span className="mobile-user-initial">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="mobile-user-details">
                    <span className="mobile-user-name">
                      {getUserDisplayName()}
                    </span>
                    <span className={`mobile-user-role ${getRoleBadgeColor()}`}>
                      <RoleIcon className="mobile-role-icon" />
                      {userRole}
                    </span>
                  </div>
                </div>
              )}

              {/* Mobile Navigation Items */}
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavigation(item.key)}
                    className={`mobile-nav-item ${currentPage === item.key ? 'mobile-nav-item-active' : ''} ${item.primary ? 'mobile-nav-item-primary' : ''}`}
                  >
                    <Icon className="mobile-nav-icon" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              <div className="mobile-auth-section">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => handleNavigation('profile')}
                      className={`mobile-nav-item ${currentPage === 'profile' ? 'mobile-nav-item-active' : ''}`}
                    >
                      <User className="mobile-nav-icon" />
                      <span>Profile</span>
                    </button>
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