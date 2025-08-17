// userRoutes.js
import express from 'express';
import User from '../models/User.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const userRouter = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private - Admin only
userRouter.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalUsers = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNextPage: page < Math.ceil(totalUsers / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
userRouter.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('enrolledCourses', 'title thumbnail')
      .populate('createdCourses', 'title thumbnail');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

export { userRouter as default };

// ============================================
// lessonRoutes.js
import express from 'express';
import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';
import { authenticate, authorizeInstructorOrAdmin } from '../middleware/auth.js';

const lessonRouter = express.Router();

// @route   POST /api/lessons
// @desc    Create a new lesson
// @access  Private - Instructor/Admin only
lessonRouter.post('/', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      section,
      order,
      type,
      content,
      isPreview = false,
      isFree = false
    } = req.body;

    // Validate required fields
    if (!title || !course || !section || !order || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
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
        message: 'Access denied. You can only add lessons to your own courses.'
      });
    }

    const lesson = new Lesson({
      title,
      description,
      course,
      section,
      order,
      type,
      content,
      isPreview,
      isFree
    });

    await lesson.save();

    // lesson to course
    await Course.findByIdAndUpdate(course, {
      $push: { lessons: lesson._id }
    });

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: { lesson }
    });
  } catch (error) {
    console.error('Lesson creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating lesson'
    });
  }
});

// @route   GET /api/lessons/course/:courseId
// @desc    Get all lessons for a course
// @access  Private
lessonRouter.get('/course/:courseId', authenticate, async (req, res) => {
  try {
    const lessons = await Lesson.find({ course: req.params.courseId })
      .sort({ section: 1, order: 1 });

    res.json({
      success: true,
      data: { lessons }
    });
  } catch (error) {
    console.error('Lessons fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lessons'
    });
  }
});

export { lessonRouter as lessonRoutes };

// ============================================
// progressRoutes.js
import express from 'express';
import Progress from '../models/Progress.js';
import { authenticate } from '../middleware/auth.js';

const progressRouter = express.Router();

// @route   POST /api/progress
// @desc    Update lesson progress
// @access  Private
progressRouter.post('/', authenticate, async (req, res) => {
  try {
    const { courseId, lessonId, timeSpent = 0, lastPosition = 0, completionPercentage = 0 } = req.body;

    if (!courseId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and Lesson ID are required'
      });
    }

    let progress = await Progress.findOneAndUpdate(
      {
        student: req.user._id,
        course: courseId,
        lesson: lessonId
      },
      {
        $set: {
          completionPercentage,
          lastPosition,
          lastAccessAt: new Date()
        },
        $inc: { timeSpent, watchCount: 1 },
        $setOnInsert: {
          student: req.user._id,
          course: courseId,
          lesson: lessonId,
          firstAccessAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: { progress }
    });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating progress'
    });
  }
});

// @route   GET /api/progress/course/:courseId
// @desc    Get course progress for current user
// @access  Private
progressRouter.get('/course/:courseId', authenticate, async (req, res) => {
  try {
    const progressData = await Progress.getCourseProgress(req.user._id, req.params.courseId);

    res.json({
      success: true,
      data: progressData
    });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching progress'
    });
  }
});

export { progressRouter as progressRoutes };

// ============================================
// reviewRoutes.js
import express from 'express';
import Review from '../models/Review.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { authenticate } from '../middleware/auth.js';

const reviewRouter = express.Router();

// @route   POST /api/reviews
// @desc    Create a course review
// @access  Private
reviewRouter.post('/', authenticate, async (req, res) => {
  try {
    const { courseId, rating, title, comment, pros = [], cons = [] } = req.body;

    if (!courseId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, rating, and comment are required'
      });
    }

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'You must be enrolled in the course to leave a review'
      });
    }

    const review = new Review({
      course: courseId,
      student: req.user._id,
      rating,
      title,
      comment,
      pros,
      cons,
      isVerified: enrollment.status === 'completed'
    });

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('student', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review: populatedReview }
    });
  } catch (error) {
    console.error('Review creation error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating review'
    });
  }
});

// @route   GET /api/reviews/course/:courseId
// @desc    Get all reviews for a course
// @access  Public
reviewRouter.get('/course/:courseId', async (req, res) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;
    const skip = (page - 1) * limit;

    const filter = { course: req.params.courseId, isApproved: true };
    if (rating) filter.rating = Number(rating);

    const reviews = await Review.find(filter)
      .populate('student', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalReviews = await Review.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
          hasNextPage: page < Math.ceil(totalReviews / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
});

export { reviewRouter as reviewRoutes };

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

export { quizRouter as quizRoutes };