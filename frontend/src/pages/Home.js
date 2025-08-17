import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Award, Play, Star, ChevronRight, Globe, Clock, Target, TrendingUp, User, Eye } from 'lucide-react';
import './Home.css'; // Import the CSS file

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for dynamic data from backend
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalInstructors: 0,
    totalCourses: 0,
    successRate: 95
  });
  
  const [popularCourses, setPopularCourses] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);

  const API_BASE_URL = 'http://localhost:5555/api';

  useEffect(() => {
    setIsVisible(true);
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (testimonials.length > 0) {
      const interval = setInterval(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [testimonials]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch multiple endpoints concurrently
      const [coursesRes, usersRes, reviewsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/courses`),
        fetch(`${API_BASE_URL}/users`),
        fetch(`${API_BASE_URL}/reviews`)
      ]);

      const coursesData = await coursesRes.json();
      const usersData = await usersRes.json();
      const reviewsData = await reviewsRes.json();

      if (coursesData.success && usersData.success) {
        // Process courses data
        const courses = coursesData.data || [];
        const users = usersData.data || [];
        const reviews = reviewsData.success ? reviewsData.data || [] : [];

        // Calculate stats
        const students = users.filter(user => user.role === 'student');
        const instructors = users.filter(user => user.role === 'instructor');

        setStats({
          totalStudents: students.length,
          totalInstructors: instructors.length,
          totalCourses: courses.length,
          successRate: 95 // This could be calculated from progress data
        });

        // Get popular courses (sorted by enrollment count or rating)
        const sortedCourses = courses
          .sort((a, b) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0))
          .slice(0, 6);
        
        setPopularCourses(sortedCourses);
        
        // Get recent courses
        const recentCourses = courses
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);
        
        setRecentCourses(recentCourses);

        // Process reviews for testimonials
        const approvedReviews = reviews
          .filter(review => review.isApproved && review.rating >= 4)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5);

        if (approvedReviews.length > 0) {
          const testimonialsData = await Promise.all(
            approvedReviews.map(async (review) => {
              try {
                const userRes = await fetch(`${API_BASE_URL}/users/${review.student}`);
                const userData = await userRes.json();
                const user = userData.success ? userData.data : null;
                
                return {
                  name: user ? user.fullName : 'Anonymous Student',
                  role: user ? (user.role === 'student' ? 'Student' : user.role) : 'Student',
                  content: review.comment,
                  rating: review.rating
                };
              } catch (err) {
                return {
                  name: 'Anonymous Student',
                  role: 'Student',
                  content: review.comment,
                  rating: review.rating
                };
              }
            })
          );
          setTestimonials(testimonialsData);
        } else {
          // Fallback testimonials if no reviews
          setTestimonials([
            {
              name: "Sarah Johnson",
              role: "Software Developer",
              content: "This platform transformed my career. The courses are comprehensive and the instructors are amazing!",
              rating: 5
            },
            {
              name: "Michael Chen",
              role: "Data Scientist",
              content: "The interactive projects and real-world applications made learning engaging and practical.",
              rating: 5
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load data');
      
      // Set fallback data
      setStats({
        totalStudents: 1250,
        totalInstructors: 89,
        totalCourses: 156,
        successRate: 95
      });
      
      setTestimonials([
        {
          name: "Sarah Johnson",
          role: "Software Developer",
          content: "This platform transformed my career. The courses are comprehensive and the instructors are amazing!",
          rating: 5
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getCourseImage = (course) => {
    if (course.thumbnail) return course.thumbnail;
    
    // Default images based on category or title
    const category = course.category?.toLowerCase() || course.title?.toLowerCase() || '';
    if (category.includes('web') || category.includes('development')) {
      return "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=250&fit=crop";
    }
    if (category.includes('data') || category.includes('science')) {
      return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop";
    }
    if (category.includes('marketing') || category.includes('business')) {
      return "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop";
    }
    return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop";
  };

  const features = [
    {
      icon: BookOpen,
      title: "Expert-Led Courses",
      description: "Learn from industry professionals with years of real-world experience",
      iconClass: "feature-icon-blue"
    },
    {
      icon: Users,
      title: "Interactive Community",
      description: "Connect with peers, collaborate on projects, and grow together",
      iconClass: "feature-icon-purple"
    },
    {
      icon: Award,
      title: "Certified Learning",
      description: "Earn recognized certificates that boost your career prospects",
      iconClass: "feature-icon-green"
    },
    {
      icon: Clock,
      title: "Flexible Schedule",
      description: "Study at your own pace with 24/7 access to all course materials",
      iconClass: "feature-icon-orange"
    },
    {
      icon: Target,
      title: "Personalized Path",
      description: "AI-powered recommendations tailored to your learning goals",
      iconClass: "feature-icon-teal"
    },
    {
      icon: Globe,
      title: "Global Access",
      description: "Learn from anywhere in the world with our mobile-friendly platform",
      iconClass: "feature-icon-indigo"
    }
  ];

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-pattern" />
        </div>

        <div className="hero-content">
          <div className={`hero-content ${isVisible ? 'visible' : ''}`}>
            <h1 className="hero-title">
              Transform Your
              <span className="hero-title-gradient">
                Future Today
              </span>
            </h1>
            <p className="hero-subtitle">
              Join thousands of learners worldwide and unlock your potential with our comprehensive online courses, expert instructors, and cutting-edge learning technology.
            </p>
     
          </div>
        </div>

        <div className="floating-element-1">
          <div className="floating-circle-1"></div>
        </div>
        <div className="floating-element-2">
          <div className="floating-circle-2"></div>
        </div>
        <div className="floating-element-3">
          <div className="floating-circle-3"></div>
        </div>
      </section>



      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">
              Why Choose Our Platform?
            </h2>
            <p className="section-subtitle">
              Experience learning like never before with our innovative approach to online education
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className={`feature-icon ${feature.iconClass}`}>
                  <feature.icon color="white" size={32} />
                </div>
                <h3 className="feature-title">
                  {feature.title}
                </h3>
                <p className="feature-description">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses Section */}
      <section className="courses-section">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">
              Popular Courses
            </h2>
            <p className="section-subtitle">
              Join thousands of students in our most loved courses
            </p>
          </div>

          <div className="courses-grid">
            {popularCourses.slice(0, 6).map((course, index) => (
              <div key={course._id || index} className="course-card">
                <div className="course-image-container">
                  <img
                    src={getCourseImage(course)}
                    alt={course.title}
                    className="course-image"
                  />
                  <div className="course-overlay"></div>
                  {course.price === 0 && (
                    <div className="course-badge">
                      Free
                    </div>
                  )}
                </div>
                <div className="course-content">
                  <h3 className="course-title">
                    {course.title}
                  </h3>
                  <p className="course-instructor">
                    by {course.instructor?.firstName ? `${course.instructor.firstName} ${course.instructor.lastName}` : 'Expert Instructor'}
                  </p>
                  <div className="course-meta">
                    <div className="course-rating">
                      <div className="stars">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            fill={i < Math.floor(course.averageRating || 0) ? "currentColor" : "none"} 
                          />
                        ))}
                      </div>
                      <span className="rating-text">
                        {course.averageRating ? course.averageRating.toFixed(1) : '4.8'}
                      </span>
                    </div>
                    <div className="course-students">
                      <Users size={16} style={{ marginRight: '4px' }} />
                      <span>{formatNumber(course.enrollmentCount || 0)}</span>
                    </div>
                  </div>
                  {course.price > 0 && (
                    <div className="course-price">
                      ${course.price}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

       
        </div>
      </section>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="testimonials-section">
          <div className="features-container">
            <div className="section-header">
              <h2 className="section-title">
                What Our Students Say
              </h2>
              <p className="section-subtitle">
                Real stories from real people who transformed their careers
              </p>
            </div>

            <div className="testimonial-container">
              <div className="testimonial-card">
                <div className="testimonial-stars">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} size={24} fill="currentColor" color="#fbbf24" />
                  ))}
                </div>
                <blockquote className="testimonial-quote">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>
                <div>
                  <div className="testimonial-author">{testimonials[currentTestimonial].name}</div>
                  <div className="testimonial-role">{testimonials[currentTestimonial].role}</div>
                </div>
              </div>

              <div className="testimonial-indicators">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`indicator ${currentTestimonial === index ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recent Courses Section */}
      {recentCourses.length > 0 && (
        <section className="stats-section">
          <div className="features-container">
            <div className="section-header">
              <h2 className="section-title">
                Latest Additions
              </h2>
              <p className="section-subtitle">
                Discover our newest courses and stay ahead of the curve
              </p>
            </div>

            <div className="courses-grid">
              {recentCourses.map((course, index) => (
                <div key={course._id || index} className="course-card">
                  <div className="course-image-container">
                    <img
                      src={getCourseImage(course)}
                      alt={course.title}
                      className="course-image"
                    />
                    <div className="course-badge-new">
                      New
                    </div>
                  </div>
                  <div className="course-content">
                    <h3 className="course-title">
                      {course.title}
                    </h3>
                    <p className="course-instructor line-clamp-2">
                      {course.description}
                    </p>
                    <div className="course-meta">
                      <span className="rating-text">Added {new Date(course.createdAt).toLocaleDateString()}</span>
                      <div className="course-students">
                        <Eye size={16} style={{ marginRight: '4px' }} />
                        <span>{course.enrollmentCount || 0} enrolled</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="cta-subtitle">
            Join our community of {formatNumber(stats.totalStudents)} learners and unlock your potential with world-class education
          </p>
        
        </div>
      </section>

      {error && (
        <div className="error-notification">
          {error}
        </div>
      )}
    </div>
  );
};

export default Home;