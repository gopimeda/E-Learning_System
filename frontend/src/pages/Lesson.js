// pages/Lesson.js
import React from 'react';

const Lesson = ({ setCurrentPage }) => {
  return (
    <div className="page-container">
      <div className="lesson-header">
        <button className="back-btn" onClick={() => setCurrentPage('course-detail')}>
          ← Back to Course
        </button>
        <h1>Lesson 1: Introduction to React</h1>
      </div>
      <div className="lesson-content">
        <div className="video-section">
          <div className="video-placeholder">
            <p>Video Player Placeholder</p>
          </div>
        </div>
        <div className="lesson-text">
          <h3>What is React?</h3>
          <p>React is a JavaScript library for building user interfaces. It allows you to create reusable UI components and manage application state efficiently.</p>
          <h3>Key Concepts</h3>
          <ul>
            <li>Components</li>
            <li>JSX</li>
            <li>Props</li>
            <li>State</li>
          </ul>
        </div>
        <div className="lesson-actions">
          <button className="quiz-btn" onClick={() => setCurrentPage('quiz')}>
            Take Quiz
          </button>
          <button className="next-btn">Next Lesson</button>
        </div>
      </div>
    </div>
  );
};

export default Lesson;

