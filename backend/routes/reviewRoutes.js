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







//itional routes to add to your reviewRoutes.js file

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
  next();
};

// Middleware to check if user is admin or instructor
const requireAdminOrInstructor = (req, res, next) => {
  if (!['admin', 'instructor'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or instructor role required.'
    });
  }
  next();
};

// @route   GET /api/reviews/course/:courseId
// @desc    Get all reviews for a specific course
// @access  Public
reviewRouter.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      rating,
      verified
    } = req.query;

    // Build query
    const query = { 
      course: courseId,
      isApproved: true 
    };

    if (rating) {
      query.rating = parseInt(rating);
    }

    if (verified !== undefined) {
      query.isVerified = verified === 'true';
    }

    const reviews = await Review.find(query)
      .populate('student', 'firstName lastName avatar')
      .populate('replies.user', 'firstName lastName avatar role')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get course reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
});

// @route   GET /api/reviews/:reviewId
// @desc    Get single review by ID
// @access  Public
reviewRouter.get('/:reviewId', async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId)
      .populate('student', 'firstName lastName avatar')
      .populate('course', 'title')
      .populate('replies.user', 'firstName lastName avatar role');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (!review.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: { review }
    });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching review'
    });
  }
});

// @route   PUT /api/reviews/:reviewId
// @desc    Update a review (only by review author)
// @access  Private
reviewRouter.put('/:reviewId', authenticate, async (req, res) => {
  try {
    const { rating, title, comment, pros, cons } = req.body;

    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the review author
    if (review.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews'
      });
    }

    // Update fields if provided
    if (rating) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment) review.comment = comment;
    if (pros) review.pros = pros;
    if (cons) review.cons = cons;

    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate('student', 'firstName lastName avatar');

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: { review: updatedReview }
    });
  } catch (error) {
    console.error('Review update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating review'
    });
  }
});

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete a review (Admin only)
// @access  Private (Admin only)
reviewRouter.delete('/:reviewId', authenticate, requireAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await Review.findByIdAndDelete(req.params.reviewId);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Review deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting review'
    });
  }
});

// @route   POST /api/reviews/:reviewId/reply
// @desc    Reply to a review (Admin or Instructor only)
// @access  Private (Admin/Instructor only)
reviewRouter.post('/:reviewId/reply', authenticate, requireAdminOrInstructor, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required'
      });
    }

    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // If instructor, check if they own the course
    if (req.user.role === 'instructor') {
      const course = await Course.findById(review.course);
      if (!course || course.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only reply to reviews for your own courses'
        });
      }
    }

    review.replies.push({
      user: req.user._id,
      message: message.trim()
    });

    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate('student', 'firstName lastName avatar')
      .populate('replies.user', 'firstName lastName avatar role');

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: { review: updatedReview }
    });
  } catch (error) {
    console.error('Reply creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding reply'
    });
  }
});

// @route   DELETE /api/reviews/:reviewId/reply/:replyId
// @desc    Delete a reply (Admin or reply author only)
// @access  Private
reviewRouter.delete('/:reviewId/reply/:replyId', authenticate, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const reply = review.replies.id(req.params.replyId);

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      });
    }

    // Check permissions: admin or reply author
    if (req.user.role !== 'admin' && reply.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own replies or be an admin'
      });
    }

    reply.remove();
    await review.save();

    res.json({
      success: true,
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    console.error('Reply deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting reply'
    });
  }
});

// @route   PUT /api/reviews/:reviewId/helpful
// @desc    Mark review as helpful
// @access  Private
reviewRouter.put('/:reviewId/helpful', authenticate, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.helpfulVotes += 1;
    await review.save();

    res.json({
      success: true,
      message: 'Review marked as helpful',
      data: { 
        helpfulVotes: review.helpfulVotes,
        helpfulPercentage: review.helpfulPercentage
      }
    });
  } catch (error) {
    console.error('Helpful vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking review as helpful'
    });
  }
});

// @route   PUT /api/reviews/:reviewId/report
// @desc    Report a review
// @access  Private
reviewRouter.put('/:reviewId/report', authenticate, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.reportCount += 1;
    await review.save();

    res.json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reporting review'
    });
  }
});

// @route   GET /api/reviews/admin/all
// @desc    Get all reviews for admin management
// @access  Private (Admin only)
reviewRouter.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      approved,
      reported,
      course,
      rating
    } = req.query;

    const query = {};

    if (approved !== undefined) {
      query.isApproved = approved === 'true';
    }

    if (reported === 'true') {
      query.reportCount = { $gt: 0 };
    }

    if (course) {
      query.course = course;
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    const reviews = await Review.find(query)
      .populate('student', 'firstName lastName email avatar')
      .populate('course', 'title instructor')
      .populate('course.instructor', 'firstName lastName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Admin get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
});

// @route   PUT /api/reviews/:reviewId/approve
// @desc    Approve/disapprove a review (Admin only)
// @access  Private (Admin only)
reviewRouter.put('/:reviewId/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { approved } = req.body;

    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.isApproved = approved;
    await review.save();

    res.json({
      success: true,
      message: `Review ${approved ? 'approved' : 'disapproved'} successfully`,
      data: { review }
    });
  } catch (error) {
    console.error('Review approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating review approval'
    });
  }
});

// @route   GET /api/reviews/instructor/my-courses
// @desc    Get reviews for instructor's courses
// @access  Private (Instructor only)
reviewRouter.get('/instructor/my-courses', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Instructor role required.'
      });
    }

    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      course,
      rating
    } = req.query;

    // Get instructor's courses
    const instructorCourses = await Course.find({ instructor: req.user._id }).select('_id');
    const courseIds = instructorCourses.map(course => course._id);

    const query = {
      course: { $in: courseIds },
      isApproved: true
    };

    if (course) {
      query.course = course;
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    const reviews = await Review.find(query)
      .populate('student', 'firstName lastName avatar')
      .populate('course', 'title thumbnail')
      .populate('replies.user', 'firstName lastName avatar role')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Instructor reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching instructor reviews'
    });
  }
});

export default reviewRouter;