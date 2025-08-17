// ============================================
// quizRoutes.js
import express from 'express';
import { Quiz, QuizAttempt } from '../models/Quiz.js';
import Course from '../models/Course.js';
import { authenticate, authorizeInstructorOrAdmin } from '../middleware/auth.js';

const quizRouter = express.Router();

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private - Instructor/Admin only
quizRouter.post('/', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      lesson,
      questions,
      settings
    } = req.body;

    if (!title || !course || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, course, and at least one question'
      });
    }

    // Check if course exists and user has permission
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (courseDoc.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const quiz = new Quiz({
      title,
      description,
      course,
      lesson,
      instructor: req.user._id,
      questions,
      settings: settings || {}
    });

    await quiz.save();

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: { quiz }
    });
  } catch (error) {
    console.error('Quiz creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating quiz'
    });
  }
});

// @route   GET /api/quizzes/course/:courseId
// @desc    Get all quizzes for a course
// @access  Private
quizRouter.get('/course/:courseId', authenticate, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ course: req.params.courseId, isPublished: true })
      .populate('lesson', 'title')
      .select('-questions.correctAnswer -questions.explanation');

    res.json({
      success: true,
      data: { quizzes }
    });
  } catch (error) {
    console.error('Quizzes fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quizzes'
    });
  }
});

// @route   POST /api/quizzes/:id/attempt
// @desc    Start a quiz attempt
// @access  Private
quizRouter.post('/:id/attempt', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || !quiz.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check previous attempts
    const previousAttempts = await QuizAttempt.countDocuments({
      quiz: quiz._id,
      student: req.user._id
    });

    if (previousAttempts >= quiz.settings.attempts) {
      return res.status(400).json({
        success: false,
        message: 'Maximum attempts reached'
      });
    }

    const attempt = new QuizAttempt({
      quiz: quiz._id,
      student: req.user._id,
      attemptNumber: previousAttempts + 1
    });

    await attempt.save();

    // Return quiz without correct answers
    const quizForAttempt = {
      ...quiz.toObject(),
      questions: quiz.questions.map(q => ({
        _id: q._id,
        question: q.question,
        type: q.type,
        options: q.options.map(opt => ({ text: opt.text })),
        points: q.points
      }))
    };

    res.json({
      success: true,
      message: 'Quiz attempt started',
      data: { 
        quiz: quizForAttempt,
        attemptId: attempt._id
      }
    });
  } catch (error) {
    console.error('Quiz attempt start error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while starting quiz attempt'
    });
  }
});

// Fix: Change this line to use default export
export default quizRouter;