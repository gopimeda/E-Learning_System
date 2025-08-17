// pages/NotFound.js
import React from 'react';

const NotFound = ({ setCurrentPage }) => {
  return (
    <div className="page-container">
      <div className="not-found">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist.</p>
        <button className="home-btn" onClick={() => setCurrentPage('home')}>
          Go Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
