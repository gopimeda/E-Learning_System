import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  Play,
  Download,
  Award,
  User,
  Calendar,
  Target,
  Shield,
  AlertCircle,
  CreditCard,
  Loader,
  ArrowLeft,
  Heart,
  Share2
} from 'lucide-react';

const Enroll = ({ courseId: propCourseId, userData, onBack, setCurrentPage }) => {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    holderName: ''
  });

  // Mock API base URL - replace with your actual API base URL
  const API_BASE_URL = 'http://localhost:5555/api';

  // Get course ID from props, localStorage, or URL
  const getCourseId = () => {
    // Priority: props > localStorage > null
    if (propCourseId) return propCourseId;
    
    const storedCourseId = localStorage.getItem('selectedCourseId');
    if (storedCourseId) return storedCourseId;
    
    return null;
  };

  const currentCourseId = getCourseId();

  useEffect(() => {
    if (currentCourseId) {
      fetchCourseDetails();
    } else {
      setError('No course selected. Please go back and select a course.');
      setLoading(false);
    }
  }, [currentCourseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!currentCourseId) {
        throw new Error('Course ID is required');
      }

      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/courses/${currentCourseId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Course not found');
        }
        throw new Error('Failed to fetch course details');
      }

      const data = await response.json();
      
      if (data.success) {
        setCourse(data.data.course || data.data);
        setIsEnrolled(data.data.isEnrolled || false);
        setEnrollment(data.data.enrollment || null);
      } else {
        throw new Error(data.message || 'Failed to load course');
      }
    } catch (err) {
      setError(err.message || 'Failed to load course details. Please try again.');
      console.error('Course fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollment = async () => {
    try {
      setEnrolling(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to enroll in courses');
        return;
      }

      // If course is not free and payment method is selected, show payment form
      if (course.effectivePrice > 0 && !showPaymentForm) {
        setShowPaymentForm(true);
        setEnrolling(false);
        return;
      }

      const enrollmentData = {
        courseId: course._id || course.id || currentCourseId,
        paymentMethod: course.effectivePrice === 0 ? 'free' : paymentMethod,
        transactionId: course.effectivePrice > 0 ? `TXN-${Date.now()}` : null
      };

      const response = await fetch(`${API_BASE_URL}/enrollments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(enrollmentData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Enrollment failed');
      }

      setSuccess('Successfully enrolled in the course!');
      setIsEnrolled(true);
      setEnrollment(data.data.enrollment || data.data);
      setShowPaymentForm(false);
      
      // Clear the stored course ID since enrollment is complete
      localStorage.removeItem('selectedCourseId');
      
      // Refresh course details
      setTimeout(() => {
        fetchCourseDetails();
      }, 1000);

    } catch (err) {
      setError(err.message || 'Enrollment failed. Please try again.');
      console.error('Enrollment error:', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.holderName) {
      setError('Please fill in all payment details');
      return;
    }

    // In a real application, you would integrate with a payment processor here
    handleEnrollment();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDuration = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const handleBack = () => {
    // Clear stored course ID when going back
    localStorage.removeItem('selectedCourseId');
    
    if (onBack) {
      onBack();
    } else if (setCurrentPage) {
      setCurrentPage('courses');
    }
  };

  if (loading) {
    return (
      <div className="enroll-loading">
        <Loader className="loading-spinner" />
        <p>Loading course details...</p>
      </div>
    );
  }

  if (!currentCourseId || !course) {
    return (
      <div className="enroll-error">
        <AlertCircle className="error-icon" />
        <h2>Course Not Found</h2>
        <p>{error || "The course you're looking for doesn't exist or has been removed."}</p>
        <button onClick={handleBack} className="back-button">
          <ArrowLeft className="button-icon" />
          Go Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="enroll-container">
      <div className="enroll-header">
        <button onClick={handleBack} className="back-button">
          <ArrowLeft className="button-icon" />
          Back to Courses
        </button>
        <div className="header-actions">
          <button className="action-button">
            <Heart className="action-icon" />
            Save
          </button>
          <button className="action-button">
            <Share2 className="action-icon" />
            Share
          </button>
        </div>
      </div>

      <div className="enroll-content">
        {/* Course Overview */}
        <div className="course-overview">
          <div className="course-media">
            <img 
              src={course.thumbnail || '/api/placeholder/800/450'} 
              alt={course.title}
              className="course-thumbnail"
            />
            <div className="media-overlay">
              <button className="play-button">
                <Play className="play-icon" />
                Preview Course
              </button>
            </div>
          </div>

          <div className="course-info">
            <div className="course-header">
              <h1 className="course-title">{course.title}</h1>
              <p className="course-description">{course.shortDescription || course.description}</p>
            </div>

            <div className="course-meta">
              <div className="meta-item">
                <User className="meta-icon" />
                <span>{course.instructor?.firstName} {course.instructor?.lastName}</span>
              </div>
              <div className="meta-item">
                <Clock className="meta-icon" />
                <span>{formatDuration(course.duration)}</span>
              </div>
              <div className="meta-item">
                <Users className="meta-icon" />
                <span>{course.totalEnrollments || 0} students</span>
              </div>
              <div className="meta-item">
                <Star className="meta-icon" />
                <span>{course.averageRating || 0} ({course.totalRatings || 0} reviews)</span>
              </div>
              <div className="meta-item">
                <Target className="meta-icon" />
                <span className="level-badge">{course.level}</span>
              </div>
            </div>

            <div className="course-price">
              {course.discountPrice && course.discountPrice < course.price ? (
                <div className="price-with-discount">
                  <span className="original-price">{formatCurrency(course.price)}</span>
                  <span className="discount-price">{formatCurrency(course.discountPrice)}</span>
                  <span className="discount-badge">{course.discountPercentage || Math.round(((course.price - course.discountPrice) / course.price) * 100)}% OFF</span>
                </div>
              ) : (
                <span className="regular-price">
                  {course.price === 0 ? 'Free' : formatCurrency(course.effectivePrice || course.price)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Enrollment Section */}
        <div className="enrollment-section">
          {error && (
            <div className="alert alert-error">
              <XCircle className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircle className="alert-icon" />
              <span>{success}</span>
            </div>
          )}

          {isEnrolled ? (
            <div className="enrolled-status">
              <div className="enrolled-badge">
                <CheckCircle className="enrolled-icon" />
                <span>You're Enrolled!</span>
              </div>
              <p>You have access to all course materials and can start learning immediately.</p>
              <div className="enrolled-actions">
                <button className="primary-button">
                  <Play className="button-icon" />
                  Start Learning
                </button>
                <button className="secondary-button">
                  <Download className="button-icon" />
                  Download Materials
                </button>
              </div>
              {enrollment && enrollment.progress && (
                <div className="progress-info">
                  <div className="progress-header">
                    <span>Course Progress</span>
                    <span>{enrollment.progress.completionPercentage}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${enrollment.progress.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="enrollment-form">
              {!showPaymentForm ? (
                <div className="enrollment-details">
                  <h2>Enroll in this Course</h2>
                  <div className="enrollment-benefits">
                    <h3>What you'll get:</h3>
                    <ul className="benefits-list">
                      <li>
                        <CheckCircle className="benefit-icon" />
                        <span>Lifetime access to course materials</span>
                      </li>
                      <li>
                        <CheckCircle className="benefit-icon" />
                        <span>Certificate of completion</span>
                      </li>
                      <li>
                        <CheckCircle className="benefit-icon" />
                        <span>Access to course community</span>
                      </li>
                      <li>
                        <CheckCircle className="benefit-icon" />
                        <span>Mobile and desktop access</span>
                      </li>
                      <li>
                        <CheckCircle className="benefit-icon" />
                        <span>30-day money-back guarantee</span>
                      </li>
                    </ul>
                  </div>

                  {(course.effectivePrice > 0 || course.price > 0) && (
                    <div className="payment-methods">
                      <h3>Payment Method</h3>
                      <div className="payment-options">
                        <label className="payment-option">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="card"
                            checked={paymentMethod === 'card'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          />
                          <div className="payment-option-content">
                            <CreditCard className="payment-icon" />
                            <span>Credit/Debit Card</span>
                          </div>
                        </label>
                        <label className="payment-option">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="paypal"
                            checked={paymentMethod === 'paypal'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          />
                          <div className="payment-option-content">
                            <DollarSign className="payment-icon" />
                            <span>PayPal</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleEnrollment}
                    disabled={enrolling}
                    className="enroll-button"
                  >
                    {enrolling ? (
                      <>
                        <Loader className="button-icon spinning" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <BookOpen className="button-icon" />
                        {(course.effectivePrice === 0 || course.price === 0) ? 'Enroll for Free' : `Enroll Now - ${formatCurrency(course.effectivePrice || course.price)}`}
                      </>
                    )}
                  </button>

                  <div className="security-notice">
                    <Shield className="security-icon" />
                    <span>Secure checkout • SSL encrypted</span>
                  </div>
                </div>
              ) : (
                <div className="payment-form">
                  <h2>Payment Details</h2>
                  <form onSubmit={handlePaymentSubmit}>
                    <div className="form-group">
                      <label>Card Holder Name</label>
                      <input
                        type="text"
                        value={paymentData.holderName}
                        onChange={(e) => setPaymentData({...paymentData, holderName: e.target.value})}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Card Number</label>
                      <input
                        type="text"
                        value={paymentData.cardNumber}
                        onChange={(e) => setPaymentData({...paymentData, cardNumber: e.target.value})}
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                          type="text"
                          value={paymentData.expiryDate}
                          onChange={(e) => setPaymentData({...paymentData, expiryDate: e.target.value})}
                          placeholder="MM/YY"
                          maxLength="5"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>CVV</label>
                        <input
                          type="text"
                          value={paymentData.cvv}
                          onChange={(e) => setPaymentData({...paymentData, cvv: e.target.value})}
                          placeholder="123"
                          maxLength="4"
                          required
                        />
                      </div>
                    </div>
                    <div className="payment-summary">
                      <div className="summary-row">
                        <span>Course Price:</span>
                        <span>{formatCurrency(course.effectivePrice || course.price)}</span>
                      </div>
                      <div className="summary-row total">
                        <span>Total:</span>
                        <span>{formatCurrency(course.effectivePrice || course.price)}</span>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button 
                        type="button" 
                        onClick={() => setShowPaymentForm(false)}
                        className="secondary-button"
                      >
                        Back
                      </button>
                      <button 
                        type="submit" 
                        disabled={enrolling}
                        className="primary-button"
                      >
                        {enrolling ? (
                          <>
                            <Loader className="button-icon spinning" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="button-icon" />
                            Complete Payment
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Course Details */}
        <div className="course-details">
          <div className="details-tabs">
            <div className="tab-content">
              <div className="detail-section">
                <h2>About This Course</h2>
                <p>{course.description}</p>
              </div>

              <div className="detail-section">
                <h2>What You'll Learn</h2>
                <ul className="learning-outcomes">
                  {course.whatYouWillLearn?.map((outcome, index) => (
                    <li key={index}>
                      <CheckCircle className="outcome-icon" />
                      <span>{outcome}</span>
                    </li>
                  )) || (
                    <li>
                      <CheckCircle className="outcome-icon" />
                      <span>Complete understanding of the course material</span>
                    </li>
                  )}
                </ul>
              </div>

              {course.requirements && course.requirements.length > 0 && (
                <div className="detail-section">
                  <h2>Requirements</h2>
                  <ul className="requirements-list">
                    {course.requirements.map((requirement, index) => (
                      <li key={index}>
                        <AlertCircle className="requirement-icon" />
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="detail-section">
                <h2>Instructor</h2>
                <div className="instructor-info">
                  <img 
                    src={course.instructor?.avatar || '/api/placeholder/80/80'} 
                    alt={`${course.instructor?.firstName} ${course.instructor?.lastName}`}
                    className="instructor-avatar"
                  />
                  <div className="instructor-details">
                    <h3>{course.instructor?.firstName} {course.instructor?.lastName}</h3>
                    {course.instructor?.bio && <p>{course.instructor.bio}</p>}
                  </div>
                </div>
              </div>

              {course.certificate?.isEnabled && (
                <div className="detail-section">
                  <h2>Certificate</h2>
                  <div className="certificate-info">
                    <Award className="certificate-icon" />
                    <div>
                      <h3>Earn a Certificate</h3>
                      <p>Get a certificate of completion when you finish this course.</p>
                      <p>Requirements: {course.certificate.criteria.completionPercentage}% completion</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .enroll-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }

        .enroll-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          color: white;
          text-decoration: none;
          transition: all 0.2s;
          font-weight: 500;
          cursor: pointer;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          color: white;
          transition: all 0.2s;
          cursor: pointer;
        }

        .action-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .button-icon, .action-icon, .meta-icon {
          width: 1rem;
          height: 1rem;
        }

        .enroll-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        .course-overview {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .course-media {
          position: relative;
          width: 100%;
          height: 300px;
        }

        .course-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .media-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .course-media:hover .media-overlay {
          opacity: 1;
        }

        .play-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50px;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
        }

        .play-button:hover {
          background: white;
          transform: scale(1.05);
        }

        .play-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .course-info {
          padding: 2rem;
        }

        .course-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 0.5rem;
        }

        .course-description {
          color: #4a5568;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .course-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #4a5568;
          font-size: 0.9rem;
        }

        .level-badge {
          background: #edf2f7;
          color: #2d3748;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .course-price {
          margin-top: 1rem;
        }

        .price-with-discount {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .original-price {
          text-decoration: line-through;
          color: #a0aec0;
          font-size: 1.2rem;
        }

        .discount-price {
          font-size: 2rem;
          font-weight: 700;
          color: #e53e3e;
        }

        .regular-price {
          font-size: 2rem;
          font-weight: 700;
          color: #2d3748;
        }

        .discount-badge {
          background: #e53e3e;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 0.25rem;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .enrollment-section {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          height: fit-content;
          position: sticky;
          top: 2rem;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .alert-error {
          background: #fed7d7;
          color: #c53030;
          border: 1px solid #feb2b2;
        }

        .alert-success {
          background: #c6f6d5;
          color: #22543d;
          border: 1px solid #9ae6b4;
        }

        .alert-icon {
          width: 1.25rem;
          height: 1.25rem;
          flex-shrink: 0;
        }

        .enrolled-status {
          text-align: center;
        }

        .enrolled-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #c6f6d5;
          color: #22543d;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .enrolled-icon {
          width: 1.5rem;
          height: 1.5rem;
        }

        .enrolled-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .primary-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s;
          cursor: pointer;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .primary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .secondary-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 1rem;
          background: transparent;
          color: #4a5568;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s;
          cursor: pointer;
        }

        .secondary-button:hover {
          background: #f7fafc;
          border-color: #cbd5e0;
        }

        .progress-info {
          margin-top: 1.5rem;
          text-align: left;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #4a5568;
        }

        .progress-bar {
          width: 100%;
          height: 0.5rem;
          background: #e2e8f0;
          border-radius: 0.25rem;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #48bb78, #38a169);
          transition: width 0.3s ease;
        }

        .enrollment-details h2 {
          color: #1a202c;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        .enrollment-benefits {
          margin-bottom: 2rem;
        }

        .enrollment-benefits h3 {
          color: #2d3748;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .benefits-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .benefits-list li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f7fafc;
        }

        .benefit-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #48bb78;
          flex-shrink: 0;
        }

        .payment-methods {
          margin-bottom: 2rem;
        }

        .payment-methods h3 {
          color: #2d3748;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .payment-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .payment-option {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .payment-option:hover {
          border-color: #cbd5e0;
        }

        .payment-option input[type="radio"] {
          margin-right: 0.75rem;
        }

        .payment-option input[type="radio"]:checked + .payment-option-content {
          color: #667eea;
        }

        .payment-option-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .payment-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .enroll-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 1.25rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 700;
          font-size: 1.1rem;
          transition: all 0.2s;
          margin-bottom: 1rem;
          cursor: pointer;
        }

        .enroll-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .enroll-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .security-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #718096;
          font-size: 0.9rem;
        }

        .security-icon {
          width: 1rem;
          height: 1rem;
        }

        .payment-form {
          width: 100%;
        }

        .payment-form h2 {
          color: #1a202c;
          margin-bottom: 2rem;
          font-size: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #2d3748;
          font-weight: 600;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .payment-summary {
          background: #f7fafc;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin: 2rem 0;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .summary-row.total {
          border-bottom: none;
          font-weight: 700;
          font-size: 1.1rem;
          color: #1a202c;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .form-actions .secondary-button,
        .form-actions .primary-button {
          flex: 1;
        }

        .course-details {
          grid-column: 1 / -1;
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          margin-top: 2rem;
        }

        .detail-section {
          margin-bottom: 3rem;
        }

        .detail-section:last-child {
          margin-bottom: 0;
        }

        .detail-section h2 {
          color: #1a202c;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }

        .detail-section p {
          color: #4a5568;
          line-height: 1.7;
          font-size: 1rem;
        }

        .learning-outcomes {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 1rem;
        }

        .learning-outcomes li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: #f7fafc;
          border-radius: 0.5rem;
          border-left: 4px solid #48bb78;
        }

        .outcome-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #48bb78;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .requirements-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.75rem;
        }

        .requirements-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #fef5e7;
          border-radius: 0.5rem;
          border-left: 4px solid #ed8936;
        }

        .requirement-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #ed8936;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .instructor-info {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
          padding: 1.5rem;
          background: #f7fafc;
          border-radius: 0.75rem;
        }

        .instructor-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #e2e8f0;
        }

        .instructor-details h3 {
          color: #1a202c;
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .instructor-details p {
          color: #4a5568;
          line-height: 1.6;
        }

        .certificate-info {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
          padding: 1.5rem;
          background: linear-gradient(135deg, #fef5e7 0%, #fed7d7 100%);
          border-radius: 0.75rem;
          border: 2px solid #ed8936;
        }

        .certificate-icon {
          width: 3rem;
          height: 3rem;
          color: #ed8936;
          flex-shrink: 0;
        }

        .certificate-info h3 {
          color: #1a202c;
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .certificate-info p {
          color: #4a5568;
          line-height: 1.6;
          margin-bottom: 0.5rem;
        }

        .enroll-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          color: white;
          text-align: center;
        }

        .loading-spinner {
          width: 3rem;
          height: 3rem;
          margin-bottom: 1rem;
          animation: spin 1s linear infinite;
        }

        .enroll-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          color: white;
          text-align: center;
          background: white;
          border-radius: 1rem;
          padding: 3rem;
          margin: 2rem auto;
          max-width: 500px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .enroll-error h2 {
          color: #1a202c;
          margin: 1rem 0;
        }

        .enroll-error p {
          color: #4a5568;
          margin-bottom: 2rem;
        }

        .error-icon {
          width: 4rem;
          height: 4rem;
          color: #e53e3e;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .enroll-content {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .enrollment-section {
            position: static;
          }
        }

        @media (max-width: 768px) {
          .enroll-container {
            padding: 1rem;
          }

          .enroll-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .header-actions {
            justify-content: center;
          }

          .course-title {
            font-size: 1.5rem;
          }

          .course-meta {
            flex-direction: column;
            gap: 0.75rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .course-info {
            padding: 1.5rem;
          }

          .course-details {
            padding: 1.5rem;
          }

          .instructor-info {
            flex-direction: column;
            text-align: center;
          }

          .certificate-info {
            flex-direction: column;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .enroll-container {
            padding: 0.5rem;
          }

          .course-media {
            height: 200px;
          }

          .course-info {
            padding: 1rem;
          }

          .enrollment-section {
            padding: 1rem;
          }

          .course-details {
            padding: 1rem;
          }

          .benefits-list li {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .learning-outcomes li {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .requirements-list li {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Enroll;