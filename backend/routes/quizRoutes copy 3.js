// ============================================
// quizRoutes.js - Complete Quiz Routes
// ============================================
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
      settings,
      dueDate,
      availableFrom,
      availableUntil
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
      settings: settings || {},
      dueDate: dueDate || null,
      availableFrom: availableFrom || null,
      availableUntil: availableUntil || null
    });

    await quiz.save();
    await quiz.populate('course', 'title');
    await quiz.populate('lesson', 'title');

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

// @route   GET /api/quizzes/instructor
// @desc    Get all quizzes for instructor with pagination and filters
// @access  Private - Instructor/Admin only
quizRouter.get('/instructor', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      course,
      status
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { instructor: req.user._id };
    
    if (course) {
      query.course = course;
    }
    
    if (status === 'published') {
      query.isPublished = true;
    } else if (status === 'draft') {
      query.isPublished = false;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get quizzes with pagination
    const quizzes = await Quiz.find(query)
      .populate('course', 'title')
      .populate('lesson', 'title')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get attempt counts for each quiz
    const quizzesWithStats = await Promise.all(
      quizzes.map(async (quiz) => {
        const attemptCount = await QuizAttempt.countDocuments({ quiz: quiz._id });
        return {
          ...quiz,
          attemptCount
        };
      })
    );

    // Get total count for pagination
    const total = await Quiz.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    const pagination = {
      currentPage: parseInt(page),
      totalPages,
      totalItems: total,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    };

    res.json({
      success: true,
      data: {
        quizzes: quizzesWithStats,
        pagination
      }
    });
  } catch (error) {
    console.error('Get instructor quizzes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quizzes'
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

// @route   GET /api/quizzes/:id
// @desc    Get a single quiz
// @access  Private
quizRouter.get('/:id', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('course', 'title')
      .populate('lesson', 'title')
      .populate('instructor', 'firstName lastName');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // If user is not instructor/admin, hide answers for published quizzes
    if (req.user.role !== 'admin' && 
        quiz.instructor._id.toString() !== req.user._id.toString() && 
        quiz.isPublished) {
      quiz.questions = quiz.questions.map(q => ({
        ...q.toObject(),
        correctAnswer: undefined,
        explanation: undefined,
        options: q.options.map(opt => ({ text: opt.text }))
      }));
    }

    res.json({
      success: true,
      data: { quiz }
    });
  } catch (error) {
    console.error('Quiz fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quiz'
    });
  }
});

// @route   PUT /api/quizzes/:id
// @desc    Update a quiz
// @access  Private - Instructor/Admin only
quizRouter.put('/:id', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permission
    if (quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      title,
      description,
      course,
      lesson,
      questions,
      settings,
      isPublished,
      dueDate,
      availableFrom,
      availableUntil
    } = req.body;

    // Validate required fields
    if (!title || !course || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, course, and at least one question'
      });
    }

    // Update quiz
    quiz.title = title;
    quiz.description = description || '';
    quiz.course = course;
    quiz.lesson = lesson || null;
    quiz.questions = questions;
    quiz.settings = { ...quiz.settings, ...settings };
    quiz.isPublished = isPublished || false;
    quiz.dueDate = dueDate || null;
    quiz.availableFrom = availableFrom || null;
    quiz.availableUntil = availableUntil || null;

    await quiz.save();

    // Populate references for response
    await quiz.populate('course', 'title');
    await quiz.populate('lesson', 'title');

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data: { quiz }
    });
  } catch (error) {
    console.error('Quiz update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating quiz'
    });
  }
});

// @route   DELETE /api/quizzes/:id
// @desc    Delete a quiz
// @access  Private - Instructor/Admin only
quizRouter.delete('/:id', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permission
    if (quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if quiz has attempts
    const attemptCount = await QuizAttempt.countDocuments({ quiz: quiz._id });
    if (attemptCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete quiz with existing attempts'
      });
    }

    await Quiz.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Quiz deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting quiz'
    });
  }
});

// @route   PUT /api/quizzes/:id/publish
// @desc    Toggle quiz publish status
// @access  Private - Instructor/Admin only
quizRouter.put('/:id/publish', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permission
    if (quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { isPublished } = req.body;
    quiz.isPublished = isPublished;
    await quiz.save();

    res.json({
      success: true,
      message: `Quiz ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: { quiz }
    });
  } catch (error) {
    console.error('Quiz publish toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating quiz status'
    });
  }
});

// @route   POST /api/quizzes/:id/duplicate
// @desc    Duplicate a quiz
// @access  Private - Instructor/Admin only
quizRouter.post('/:id/duplicate', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const originalQuiz = await Quiz.findById(req.params.id);
    
    if (!originalQuiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permission
    if (originalQuiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Create duplicate quiz
    const duplicateQuiz = new Quiz({
      title: `${originalQuiz.title} (Copy)`,
      description: originalQuiz.description,
      course: originalQuiz.course,
      lesson: originalQuiz.lesson,
      instructor: req.user._id,
      questions: originalQuiz.questions.map(q => ({
        question: q.question,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points,
        difficulty: q.difficulty
      })),
      settings: { ...originalQuiz.settings },
      isPublished: false, // Always start as draft
      dueDate: null,
      availableFrom: null,
      availableUntil: null
    });

    await duplicateQuiz.save();
    await duplicateQuiz.populate('course', 'title');
    await duplicateQuiz.populate('lesson', 'title');

    res.status(201).json({
      success: true,
      message: 'Quiz duplicated successfully',
      data: { quiz: duplicateQuiz }
    });
  } catch (error) {
    console.error('Quiz duplication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while duplicating quiz'
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
        message: 'Quiz not found or not published'
      });
    }

    // Check if quiz is available
    const now = new Date();
    if (quiz.availableFrom && now < quiz.availableFrom) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not yet available'
      });
    }

    if (quiz.availableUntil && now > quiz.availableUntil) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is no longer available'
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

    // Check for existing in-progress attempt
    const existingAttempt = await QuizAttempt.findOne({
      quiz: quiz._id,
      student: req.user._id,
      status: 'in-progress'
    });

    if (existingAttempt) {
      return res.status(400).json({
        success: false,
        message: 'You have an existing attempt in progress',
        data: { attemptId: existingAttempt._id }
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

// @route   PUT /api/quizzes/attempts/:attemptId/answer
// @desc    Submit answer for a question
// @access  Private
quizRouter.put('/attempts/:attemptId/answer', authenticate, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate('quiz');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'This attempt has already been submitted'
      });
    }

    const { questionId, answer, timeSpent } = req.body;

    // Find the question in the quiz
    const question = attempt.quiz.questions.id(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if answer already exists and update or add
    const existingAnswerIndex = attempt.answers.findIndex(
      a => a.question.toString() === questionId
    );

    let isCorrect = false;
    let pointsEarned = 0;

    // Evaluate answer based on question type
    switch (question.type) {
      case 'multiple-choice':
        const selectedOption = question.options.find(opt => opt.text === answer);
        isCorrect = selectedOption && selectedOption.isCorrect;
        pointsEarned = isCorrect ? question.points : 0;
        break;
      
      case 'true-false':
        isCorrect = answer === question.correctAnswer;
        pointsEarned = isCorrect ? question.points : 0;
        break;
      
      case 'short-answer':
        isCorrect = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
        pointsEarned = isCorrect ? question.points : 0;
        break;
      
      case 'essay':
        // Essays need manual grading
        pointsEarned = 0;
        isCorrect = false;
        break;
    }

    const answerObj = {
      question: questionId,
      answer,
      isCorrect,
      pointsEarned,
      timeSpent
    };

    if (existingAnswerIndex > -1) {
      attempt.answers[existingAnswerIndex] = answerObj;
    } else {
      attempt.answers.push(answerObj);
    }

    await attempt.save();

    res.json({
      success: true,
      message: 'Answer saved successfully',
      data: { 
        isCorrect,
        pointsEarned
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving answer'
    });
  }
});

// @route   POST /api/quizzes/attempts/:attemptId/submit
// @desc    Submit quiz attempt
// @access  Private
quizRouter.post('/attempts/:attemptId/submit', authenticate, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate('quiz');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'This attempt has already been submitted'
      });
    }

    // Update attempt status and submission time
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.timeSpent = Math.floor((attempt.submittedAt - attempt.startedAt) / 1000); // in seconds

    await attempt.save();

    // Return results if allowed
    let results = null;
    if (attempt.quiz.settings.showResults === 'immediately' || 
        attempt.quiz.settings.showResults === 'after-submission') {
      results = {
        score: attempt.score,
        percentage: attempt.percentage,
        isPassed: attempt.isPassed,
        totalQuestions: attempt.quiz.questions.length,
        answeredQuestions: attempt.answers.length,
        correctAnswers: attempt.answers.filter(a => a.isCorrect).length
      };

      if (attempt.quiz.settings.showCorrectAnswers) {
        results.answers = attempt.answers.map(answer => {
          const question = attempt.quiz.questions.id(answer.question);
          return {
            question: question.question,
            yourAnswer: answer.answer,
            correctAnswer: question.correctAnswer || 
                          question.options.find(opt => opt.isCorrect)?.text,
            isCorrect: answer.isCorrect,
            pointsEarned: answer.pointsEarned,
            explanation: question.explanation
          };
        });
      }
    }

    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      data: { 
        attempt: {
          _id: attempt._id,
          score: attempt.score,
          percentage: attempt.percentage,
          isPassed: attempt.isPassed,
          timeSpent: attempt.timeSpent
        },
        results
      }
    });
  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting quiz'
    });
  }
});

// @route   GET /api/quizzes/:id/analytics
// @desc    Get quiz analytics and student attempts
// @access  Private - Instructor/Admin only
quizRouter.get('/:id/analytics', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permission
    if (quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get all attempts for this quiz
    const attempts = await QuizAttempt.find({ quiz: quiz._id })
      .populate('student', 'firstName lastName email')
      .sort({ submittedAt: -1 })
      .lean();

    // Calculate analytics
    const analytics = {
      totalAttempts: attempts.length,
      uniqueStudents: [...new Set(attempts.map(a => a.student._id.toString()))].length,
      averageScore: attempts.length > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
        : 0,
      passRate: attempts.length > 0 
        ? Math.round((attempts.filter(a => a.isPassed).length / attempts.length) * 100)
        : 0,
      completionRate: attempts.length > 0 
        ? Math.round((attempts.filter(a => a.status === 'submitted').length / attempts.length) * 100)
        : 0,
      averageTimeSpent: attempts.length > 0 
        ? Math.round(attempts.filter(a => a.timeSpent).reduce((sum, a) => sum + a.timeSpent, 0) / attempts.filter(a => a.timeSpent).length)
        : 0
    };

    // Question-level analytics
    const questionAnalytics = quiz.questions.map((question, index) => {
      const questionAttempts = attempts.flatMap(attempt => 
        attempt.answers.filter(answer => answer.question.toString() === question._id.toString())
      );
      
      const correctAnswers = questionAttempts.filter(answer => answer.isCorrect).length;
      const totalAnswers = questionAttempts.length;
      
      return {
        questionIndex: index + 1,
        questionText: question.question,
        difficulty: question.difficulty,
        points: question.points,
        correctAnswers,
        totalAnswers,
        correctPercentage: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
        averageTimeSpent: totalAnswers > 0 
          ? Math.round(questionAttempts.filter(a => a.timeSpent).reduce((sum, a) => sum + a.timeSpent, 0) / questionAttempts.filter(a => a.timeSpent).length)
          : 0
      };
    });

    res.json({
      success: true,
      data: {
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          totalPoints: quiz.totalPoints,
          totalQuestions: quiz.questions.length
        },
        analytics,
        questionAnalytics,
        attempts
      }
    });
  } catch (error) {
    console.error('Quiz analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quiz analytics'
    });
  }
});

// @route   GET /api/quizzes/:id/attempts
// @desc    Get all attempts for a specific quiz with student progress
// @access  Private - Instructor/Admin only
quizRouter.get('/:id/attempts', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permission
    if (quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { page = 1, limit = 20, status, student } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { quiz: quiz._id };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (student) {
      query.student = student;
    }

    // Get attempts with student info and progress
    const attempts = await QuizAttempt.find(query)
      .populate('student', 'firstName lastName email avatar')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // progress information for each attempt
    const attemptsWithProgress = attempts.map(attempt => {
      const progress = {
        questionsAnswered: attempt.answers.length,
        totalQuestions: quiz.questions.length,
        progressPercentage: Math.round((attempt.answers.length / quiz.questions.length) * 100),
        timeSpent: attempt.timeSpent || 0,
        averageTimePerQuestion: attempt.answers.length > 0 && attempt.timeSpent 
          ? Math.round(attempt.timeSpent / attempt.answers.length)
          : 0
      };

      return {
        ...attempt,
        progress
      };
    });

    // Get total count for pagination
    const total = await QuizAttempt.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    const pagination = {
      currentPage: parseInt(page),
      totalPages,
      totalItems: total,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    };

    res.json({
      success: true,
      data: {
        attempts: attemptsWithProgress,
        pagination,
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          totalPoints: quiz.totalPoints,
          totalQuestions: quiz.questions.length
        }
      }
    });
  } catch (error) {
    console.error('Quiz attempts fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quiz attempts'
    });
  }
});

// @route   PUT /api/quizzes/attempts/:attemptId/feedback
// @desc    Add instructor feedback to a quiz attempt
// @access  Private - Instructor/Admin only
quizRouter.put('/attempts/:attemptId/feedback', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate('quiz', 'instructor');
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Check permission
    if (attempt.quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { feedback } = req.body;
    
    attempt.feedback = feedback;
    await attempt.save();

    res.json({
      success: true,
      message: 'Feedback added successfully',
      data: { attempt }
    });
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding feedback'
    });
  }
});

// @route   GET /api/quizzes/stats/overview
// @desc    Get instructor's quiz overview statistics
// @access  Private - Instructor/Admin only
quizRouter.get('/stats/overview', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const instructorId = req.user._id;

    // Get all quizzes by instructor
    const quizzes = await Quiz.find({ instructor: instructorId });
    const quizIds = quizzes.map(q => q._id);

    // Get all attempts for instructor's quizzes
    const attempts = await QuizAttempt.find({ quiz: { $in: quizIds } });

    // Calculate statistics
    const stats = {
      totalQuizzes: quizzes.length,
      publishedQuizzes: quizzes.filter(q => q.isPublished).length,
      draftQuizzes: quizzes.filter(q => !q.isPublished).length,
      totalAttempts: attempts.length,
      uniqueStudents: [...new Set(attempts.map(a => a.student.toString()))].length,
      averageScore: attempts.length > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
        : 0,
      passRate: attempts.length > 0 
        ? Math.round((attempts.filter(a => a.isPassed).length / attempts.length) * 100)
        : 0,
      recentAttempts: await QuizAttempt.find({ quiz: { $in: quizIds } })
        .populate('student', 'firstName lastName')
        .populate('quiz', 'title')
        .sort({ submittedAt: -1 })
        .limit(5)
        .lean()
    };

    // Get quiz performance data
    const quizPerformance = await Promise.all(
      quizzes.slice(0, 10).map(async (quiz) => {
        const quizAttempts = attempts.filter(a => a.quiz.toString() === quiz._id.toString());
        return {
          _id: quiz._id,
          title: quiz.title,
          totalAttempts: quizAttempts.length,
          averageScore: quizAttempts.length > 0 
            ? Math.round(quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length)
            : 0,
          passRate: quizAttempts.length > 0 
            ? Math.round((quizAttempts.filter(a => a.isPassed).length / quizAttempts.length) * 100)
            : 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        stats,
        quizPerformance
      }
    });
  } catch (error) {
    console.error('Quiz stats overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quiz statistics'
    });
  }
});
// @route   GET /api/quizzes/student/attempts
// @desc    Get student's quiz attempts
// @access  Private - Student only
// @route   GET /api/quizzes/student/attempts
// @desc    Get student's quiz attempts with improved error handling
// @access  Private - Student only
quizRouter.get('/student/attempts', authenticate, async (req, res) => {
  try {
    console.log('=== DEBUG: Student Attempts Route ===');
    console.log('User:', req.user);
    console.log('Query params:', req.query);

    const { page = 1, limit = 10, course, status } = req.query;
    
    // Validate pagination parameters first
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skipNum = (pageNum - 1) * limitNum;

    console.log('Pagination:', { pageNum, limitNum, skipNum });

    // Build base query
    const query = { student: req.user._id };
    console.log('Base query:', query);

    // Handle course filter
    if (course) {
      try {
        console.log('Filtering by course:', course);
        
        // Validate course ObjectId format
        if (!mongoose.Types.ObjectId.isValid(course)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid course ID format'
          });
        }

        const courseQuizzes = await Quiz.find({ course }).select('_id').lean();
        console.log('Found quizzes for course:', courseQuizzes.length);
        
        const quizIds = courseQuizzes.map(q => q._id);
        if (quizIds.length > 0) {
          query.quiz = { $in: quizIds };
        } else {
          // No quizzes found for the course, return empty result
          console.log('No quizzes found for course, returning empty');
          return res.json({
            success: true,
            data: {
              attempts: [],
              pagination: {
                currentPage: pageNum,
                totalPages: 0,
                totalItems: 0,
                hasNextPage: false,
                hasPrevPage: false
              }
            }
          });
        }
      } catch (courseError) {
        console.error('Course filter error:', courseError);
        return res.status(400).json({
          success: false,
          message: 'Error processing course filter: ' + courseError.message
        });
      }
    }

    // Handle status filter
    if (status && status !== 'all') {
      const validStatuses = ['in-progress', 'submitted', 'auto-submitted', 'abandoned'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter. Valid values: ${validStatuses.join(', ')}`
        });
      }
      query.status = status;
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    // Get total count first (simpler query)
    let total;
    try {
      total = await QuizAttempt.countDocuments(query);
      console.log('Total attempts found:', total);
    } catch (countError) {
      console.error('Count error:', countError);
      throw new Error('Failed to count attempts: ' + countError.message);
    }

    // Get attempts with populated data
    let attempts;
    try {
      console.log('Fetching attempts with population...');
      
      attempts = await QuizAttempt.find(query)
        .populate({
          path: 'quiz',
          select: 'title totalPoints settings.passingScore course',
          populate: {
            path: 'course',
            select: 'title',
            options: { strictPopulate: false }
          },
          options: { strictPopulate: false }
        })
        .sort({ submittedAt: -1, startedAt: -1 })
        .skip(skipNum)
        .limit(limitNum)
        .lean()
        .exec();

      console.log('Raw attempts found:', attempts.length);
      
      // Filter out attempts with null quiz references
      const validAttempts = attempts.filter(attempt => {
        if (!attempt.quiz) {
          console.warn('Found attempt with null quiz:', attempt._id);
          return false;
        }
        return true;
      });

      console.log('Valid attempts after filtering:', validAttempts.length);

      // Calculate pagination
      const totalPages = Math.ceil(total / limitNum);
      const pagination = {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      };

      console.log('Pagination:', pagination);

      res.json({
        success: true,
        data: {
          attempts: validAttempts,
          pagination
        }
      });

    } catch (fetchError) {
      console.error('Fetch attempts error:', fetchError);
      throw new Error('Failed to fetch attempts: ' + fetchError.message);
    }

  } catch (error) {
    console.error('=== Student attempts route error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide specific error responses
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format in request',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message,
        debug: process.env.NODE_ENV === 'development' ? error.errors : undefined
      });
    }

    if (error.message.includes('Failed to')) {
      return res.status(500).json({
        success: false,
        message: error.message,
        debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attempts',
      debug: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack
      } : undefined
    });
  }
});
// @route   GET /api/quizzes/attempts/:attemptId/results
// @desc    Get detailed results for a quiz attempt
// @access  Private
quizRouter.get('/attempts/:attemptId/results', authenticate, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate({
        path: 'quiz',
        populate: {
          path: 'course',
          select: 'title'
        }
      })
      .populate('student', 'firstName lastName email');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Check permission - students can only see their own attempts, instructors can see all
    if (attempt.student._id.toString() !== req.user._id.toString() && 
        attempt.quiz.instructor.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if results should be shown based on quiz settings
    const showResults = attempt.quiz.settings.showResults;
    const now = new Date();
    
    let canViewResults = false;
    
    if (showResults === 'immediately' || showResults === 'after-submission') {
      canViewResults = attempt.status === 'submitted';
    } else if (showResults === 'after-due-date') {
      canViewResults = attempt.quiz.dueDate && now > attempt.quiz.dueDate;
    } else if (showResults === 'never') {
      canViewResults = req.user.role === 'admin' || 
                     attempt.quiz.instructor.toString() === req.user._id.toString();
    }

    if (!canViewResults) {
      return res.status(403).json({
        success: false,
        message: 'Results are not available yet'
      });
    }

    // Prepare detailed results
    const results = {
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        timeSpent: attempt.timeSpent,
        status: attempt.status,
        score: attempt.score,
        percentage: attempt.percentage,
        isPassed: attempt.isPassed,
        feedback: attempt.feedback
      },
      quiz: {
        _id: attempt.quiz._id,
        title: attempt.quiz.title,
        totalPoints: attempt.quiz.totalPoints,
        passingScore: attempt.quiz.settings.passingScore,
        course: attempt.quiz.course
      },
      summary: {
        totalQuestions: attempt.quiz.questions.length,
        answeredQuestions: attempt.answers.length,
        correctAnswers: attempt.answers.filter(a => a.isCorrect).length,
        pointsEarned: attempt.score,
        totalPoints: attempt.quiz.totalPoints
      }
    };

    // detailed answers if allowed
    if (attempt.quiz.settings.showCorrectAnswers || 
        req.user.role === 'admin' || 
        attempt.quiz.instructor.toString() === req.user._id.toString()) {
      
      results.answers = attempt.answers.map(answer => {
        const question = attempt.quiz.questions.id(answer.question);
        return {
          questionId: answer.question,
          question: question.question,
          type: question.type,
          yourAnswer: answer.answer,
          correctAnswer: question.correctAnswer || 
                        question.options.find(opt => opt.isCorrect)?.text,
          isCorrect: answer.isCorrect,
          pointsEarned: answer.pointsEarned,
          totalPoints: question.points,
          explanation: question.explanation,
          timeSpent: answer.timeSpent
        };
      });
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get attempt results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching results'
    });
  }
});

// @route   DELETE /api/quizzes/attempts/:attemptId
// @desc    Delete a quiz attempt (admin/instructor only)
// @access  Private - Instructor/Admin only
quizRouter.delete('/attempts/:attemptId', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate('quiz', 'instructor');
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Check permission
    if (attempt.quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await QuizAttempt.findByIdAndDelete(req.params.attemptId);

    res.json({
      success: true,
      message: 'Quiz attempt deleted successfully'
    });
  } catch (error) {
    console.error('Delete attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting attempt'
    });
  }
});

// @route   PUT /api/quizzes/attempts/:attemptId/grade
// @desc    Manual grading for essay questions
// @access  Private - Instructor/Admin only
quizRouter.put('/attempts/:attemptId/grade', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate('quiz');
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Check permission
    if (attempt.quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { questionId, pointsEarned, feedback } = req.body;

    // Find the answer to grade
    const answerIndex = attempt.answers.findIndex(
      a => a.question.toString() === questionId
    );

    if (answerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Find the question to get max points
    const question = attempt.quiz.questions.id(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Validate points
    if (pointsEarned < 0 || pointsEarned > question.points) {
      return res.status(400).json({
        success: false,
        message: `Points must be between 0 and ${question.points}`
      });
    }

    // Update the answer
    attempt.answers[answerIndex].pointsEarned = pointsEarned;
    attempt.answers[answerIndex].isCorrect = pointsEarned === question.points;
    
    if (feedback) {
      attempt.answers[answerIndex].feedback = feedback;
    }

    await attempt.save();

    res.json({
      success: true,
      message: 'Answer graded successfully',
      data: { 
        answer: attempt.answers[answerIndex],
        newScore: attempt.score,
        newPercentage: attempt.percentage
      }
    });
  } catch (error) {
    console.error('Manual grading error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while grading answer'
    });
  }
});

export default quizRouter;