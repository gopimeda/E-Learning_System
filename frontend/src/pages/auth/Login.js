import React, { useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const Login = ({ setCurrentPage, setIsAuthenticated, setUserRole }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'http://localhost:5555/api/auth';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user data and token - FIXED: Extract role from correct path
        localStorage.setItem('userToken', data.data.token);
        localStorage.setItem('userRole', data.data.user.role || 'student');
        localStorage.setItem('userData', JSON.stringify(data.data.user)); // Store full user data
        
        console.log('Login successful:', data.data);
        return { 
          success: true, 
          message: data.message, 
          data: data.data,
          role: data.data.user.role || 'student', // FIXED: Correct path to role
          user: data.data.user
        };
      } else {
        return { success: false, message: data.message };
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

    if (!formData.email || !formData.password) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    const result = await handleLogin(formData.email, formData.password);
    
    setMessage(result.message);
    setMessageType(result.success ? 'success' : 'error');

    if (result.success) {
      setFormData({ email: '', password: '' });
      
      // Set authentication state and user role
      setIsAuthenticated(true);
      if (setUserRole) {
        setUserRole(result.role);
      }
      
      // Redirect to home page after successful login
      setTimeout(() => {
        setCurrentPage('home');
      }, 1000); // Small delay to show success message
    }
  };

  return (
    <>
      <style jsx>{`
        .login-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06);
          padding: 48px 32px;
          position: relative;
          overflow: hidden;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-icon-wrapper {
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

        .login-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 8px 0;
          letter-spacing: -0.025em;
        }

        .login-subtitle {
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

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
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
          padding: 16px 16px 16px 48px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          color: #2d3748;
          background-color: #ffffff;
          transition: all 0.2s ease;
          box-sizing: border-box;
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

        .login-footer {
          margin-top: 32px;
          text-align: center;
        }

        .footer-text {
          color: #718096;
          font-size: 14px;
          margin: 0;
        }

        .signup-link {
          color: #667eea;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .signup-link:hover {
          color: #5a67d8;
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 24px;
            margin: 16px;
          }

          .login-title {
            font-size: 24px;
          }

          .login-icon-wrapper {
            width: 64px;
            height: 64px;
          }
        }
      `}</style>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon-wrapper">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Please sign in to your account</p>
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

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">
                Email Address
              </label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input password-input"
                  placeholder="Enter your password"
                  required
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

            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <p className="footer-text">
              Don't have an account?{' '}
              <span 
                onClick={() => setCurrentPage('register')}
                className="signup-link"
              >
                Sign up
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;