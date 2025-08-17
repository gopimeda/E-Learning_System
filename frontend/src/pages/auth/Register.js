import React, { useState } from 'react';
import { Eye, EyeOff, UserCheck, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const Register = ({ setCurrentPage }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'http://localhost:5555/api/auth';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (userData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        // Handle successful registration - you can store user data and token here
        console.log('Registration successful:', data.data);
        return { success: true, message: data.message, data: data.data };
      } else {
        return { success: false, message: data.message, errors: data.errors };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrors([]);

    // Client-side validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('error');
      return;
    }

    const result = await handleRegister({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      role: formData.role
    });
    
    setMessage(result.message);
    setMessageType(result.success ? 'success' : 'error');
    
    if (result.errors) {
      setErrors(result.errors);
    }

    if (result.success) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student'
      });
      // You can redirect or update app state here
      // For example: window.location.href = '/dashboard';
    }
  };

  return (
    <>
      <style jsx>{`
        .register-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .register-card {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06);
          padding: 48px 32px;
          position: relative;
          overflow: hidden;
          max-height: 90vh;
          overflow-y: auto;
        }

        .register-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }

        .register-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .register-icon-wrapper {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px auto;
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
        }

        .register-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 8px 0;
          letter-spacing: -0.025em;
        }

        .register-subtitle {
          color: #718096;
          font-size: 16px;
          margin: 0;
          font-weight: 400;
        }

        .message-alert {
          margin-bottom: 24px;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        }

        .message-success {
          background-color: #f0fff4;
          color: #38a169;
          border: 1px solid #9ae6b4;
        }

        .message-error {
          background-color: #fed7d7;
          color: #e53e3e;
          border: 1px solid #feb2b2;
        }

        .errors-list {
          margin-bottom: 24px;
          padding: 16px;
          border-radius: 12px;
          background-color: #fed7d7;
          border: 1px solid #feb2b2;
          animation: slideIn 0.3s ease-out;
        }

        .errors-list ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .errors-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #e53e3e;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .errors-list li:last-child {
          margin-bottom: 0;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #4a5568;
          margin-bottom: 8px;
          letter-spacing: 0.025em;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #a0aec0;
          width: 18px;
          height: 18px;
          pointer-events: none;
        }

        .form-input {
          width: 100%;
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          color: #2d3748;
          background-color: #ffffff;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input-with-icon {
          padding-left: 48px;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input::placeholder {
          color: #a0aec0;
        }

        .password-input {
          padding-right: 48px;
        }

        .password-toggle {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #a0aec0;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s ease;
        }

        .password-toggle:hover {
          color: #718096;
        }

        .form-select {
          width: 100%;
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          color: #2d3748;
          background-color: #ffffff;
          transition: all 0.2s ease;
          box-sizing: border-box;
          cursor: pointer;
        }

        .form-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .submit-button {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.025em;
          position: relative;
          overflow: hidden;
          margin-top: 8px;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .register-footer {
          margin-top: 32px;
          text-align: center;
        }

        .footer-text {
          color: #718096;
          font-size: 14px;
          margin: 0;
        }

        .signin-link {
          color: #667eea;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .signin-link:hover {
          color: #5a67d8;
          text-decoration: underline;
        }

        @media (max-width: 640px) {
          .register-card {
            padding: 32px 24px;
            margin: 16px;
            max-width: calc(100vw - 32px);
          }

          .register-title {
            font-size: 24px;
          }

          .register-icon-wrapper {
            width: 64px;
            height: 64px;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        @media (max-width: 480px) {
          .register-container {
            padding: 8px;
          }
          
          .register-card {
            padding: 24px 20px;
            margin: 8px;
          }
        }
      `}</style>

      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <div className="register-icon-wrapper">
              <UserCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="register-title">Create Account</h2>
            <p className="register-subtitle">Join us today and start learning</p>
          </div>

          {message && (
            <div className={`message-alert ${messageType === 'success' ? 'message-success' : 'message-error'}`}>
              {messageType === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message}</span>
            </div>
          )}

          {errors.length > 0 && (
            <div className="errors-list">
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="register-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="John"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Email Address *
              </label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input form-input-with-icon"
                  placeholder="john.doe@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-select"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Password *
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input form-input-with-icon password-input"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Confirm Password *
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input form-input-with-icon password-input"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="submit-button"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="register-footer">
            <p className="footer-text">
              Already have an account?{' '}
              <span 
                onClick={() => setCurrentPage('login')}
                className="signin-link"
              >
                Sign in
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;