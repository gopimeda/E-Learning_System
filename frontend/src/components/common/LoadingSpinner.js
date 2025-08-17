import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', className = '' }) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  };

  return (
    <div className={`loading-spinner ${className}`}>
      <div className="spinner-content">
        <Loader2 
          className={`spinner-icon ${sizeClasses[size]}`} 
        />
        {text && <p className="spinner-text">{text}</p>}
      </div>
    </div>
  );
};

// Make sure it ends with:
export default LoadingSpinner;