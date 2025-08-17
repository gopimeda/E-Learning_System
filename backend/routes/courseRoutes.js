import express from 'express';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import { authenticate, authorize, authorizeInstructorOrAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/courses
// @desc    Get all courses with filtering, sorting, and pagination
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      level,
      minPrice,
      maxPrice,
      rating,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured
    } = req.query;

    // Build filter object
    const filter = { isPublished: true };

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (rating) filter.averageRating = { $gte: Number(rating) };
    if (featured === 'true') filter.isFeatured = true;

    // Search functionality
    if (search) {
      filter.$text = { $search: search };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const courses = await Course.find(filter)
      .populate('instructor', 'firstName lastName avatar bio')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Get total count for pagination
    const totalCourses = await Course.countDocuments(filter);

    // enrollment status for authenticated users
    if (req.user) {
      const userEnrollments = await Enrollment.find({
        student: req.user._id,
        course: { $in: courses.map(c => c._id) }
      }).select('course');

      const enrolledCourseIds = new Set(userEnrollments.map(e => e.course.toString()));

      courses.forEach(course => {
        course.isEnrolled = enrolledCourseIds.has(course._id.toString());
      });
    }

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalCourses / limit),
          totalCourses,
          hasNextPage: page < Math.ceil(totalCourses / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses'
    });
  }
});

// @route   GET /api/courses/categories
// @desc    Get all course categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Course.distinct('category', { isPublished: true });
    
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

// @route   GET /api/courses/featured
// @desc    Get featured courses
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const courses = await Course.find({ 
      isPublished: true, 
      isFeatured: true 
    })
    .populate('instructor', 'firstName lastName avatar')
    .sort({ averageRating: -1, totalEnrollments: -1 })
    .limit(8)
    .lean();

    res.json({
      success: true,
      data: { courses }
    });
  } catch (error) {
    console.error('Get featured courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured courses'
    });
  }
});

// @route   GET /api/courses/popular
// @desc    Get popular courses
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate('instructor', 'firstName lastName avatar')
      .sort({ totalEnrollments: -1, averageRating: -1 })
      .limit(12)
      .lean();

    res.json({
      success: true,
      data: { courses }
    });
  } catch (error) {
    console.error('Get popular courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching popular courses'
    });
  }
});

// @route   GET /api/courses/my-courses
// @desc    Get courses created by the authenticated instructor
// @access  Private (Instructor/Admin)
router.get('/my-courses', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { instructor: req.user._id };
    if (status) {
      if (status === 'published') filter.isPublished = true;
      if (status === 'draft') filter.isPublished = false;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;
    const courses = await Course.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const totalCourses = await Course.countDocuments(filter);

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalCourses / limit),
          totalCourses
        }
      }
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your courses'
    });
  }
});

// @route   GET /api/courses/:id
// @desc    Get single course by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName avatar bio socialLinks')
      .populate({
        path: 'lessons',
        select: 'title description order section type isPreview isFree content.videoDuration',
        options: { sort: { order: 1 } }
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled (for authenticated users)
    let isEnrolled = false;
    let enrollment = null;

    if (req.user) {
      enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: course._id
      });
      isEnrolled = !!enrollment;
    }

    // Hide non-preview lessons for non-enrolled users
    if (!isEnrolled && req.user?._id.toString() !== course.instructor._id.toString()) {
      course.lessons = course.lessons.filter(lesson => lesson.isPreview || lesson.isFree);
    }

    res.json({
      success: true,
      data: {
        course,
        isEnrolled,
        enrollment: isEnrolled ? enrollment : null
      }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course'
    });
  }
});

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Instructor/Admin)
router.post('/', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      thumbnail,
      price,
      discountPrice,
      category,
      level,
      language = 'English',
      duration,
      requirements = [],
      whatYouWillLearn = [],
      tags = []
    } = req.body;

    // Validation
    if (!title || !description || !shortDescription || !thumbnail || price === undefined || !category || !level || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (whatYouWillLearn.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one learning outcome'
      });
    }

    const course = new Course({
      title,
      description,
      shortDescription,
      thumbnail,
      price,
      discountPrice,
      category,
      level,
      language,
      duration,
      requirements,
      whatYouWillLearn,
      tags,
      instructor: req.user._id
    });

    await course.save();

    // course to instructor's created courses
    await User.findByIdAndUpdate(req.user._id, {
      $push: { createdCourses: course._id }
    });

    const populatedCourse = await Course.findById(course._id)
      .populate('instructor', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course: populatedCourse }
    });
  } catch (error) {
    console.error('Create course error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating course'
    });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Course Instructor/Admin)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    const updateData = { ...req.body };
    delete updateData.instructor; // Prevent instructor change
    delete updateData.enrolledStudents; // Prevent manipulation of enrollments
    delete updateData.totalEnrollments;
    delete updateData.averageRating;
    delete updateData.totalRatings;

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('instructor', 'firstName lastName avatar');

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: { course: updatedCourse }
    });
  } catch (error) {
    console.error('Update course error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating course'
    });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Course Instructor/Admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    // Check if course has enrollments
    const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
    if (enrollmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with active enrollments'
      });
    }

    await Course.findByIdAndDelete(req.params.id);

    // Remove from instructor's created courses
    await User.findByIdAndUpdate(course.instructor, {
      $pull: { createdCourses: course._id }
    });

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting course'
    });
  }
});

// @route   PUT /api/courses/:id/publish
// @desc    Publish/unpublish course
// @access  Private (Course Instructor/Admin)
router.put('/:id/publish', authenticate, async (req, res) => {
  try {
    const { isPublished } = req.body;
    
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this course'
      });
    }

    // Validate course has necessary content before publishing
    if (isPublished && course.lessons.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish course without lessons'
      });
    }

    course.isPublished = isPublished;
    if (isPublished && !course.publishedAt) {
      course.publishedAt = new Date();
    }

    await course.save();

    res.json({
      success: true,
      message: `Course ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: { course }
    });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while publishing course'
    });
  }
});

// @route   GET /api/courses/:id/analytics
// @desc    Get course analytics
// @access  Private (Course Instructor/Admin)
router.get('/:id/analytics', authenticate, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view analytics for this course'
      });
    }

    // Get enrollment analytics
    const enrollments = await Enrollment.find({ course: course._id });
    const totalRevenue = enrollments.reduce((sum, enrollment) => sum + enrollment.payment.amount, 0);
    
    // Get enrollment trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEnrollments = await Enrollment.find({
      course: course._id,
      enrollmentDate: { $gte: thirtyDaysAgo }
    });

    // Calculate completion rates
    const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
    const completionRate = enrollments.length > 0 ? (completedEnrollments / enrollments.length) * 100 : 0;

    // Get rating distribution
    const ratingDistribution = await Enrollment.aggregate([
      { $match: { course: course._id, 'rating.score': { $exists: true } } },
      { $group: { _id: '$rating.score', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    const analytics = {
      totalEnrollments: enrollments.length,
      totalRevenue,
      recentEnrollments: recentEnrollments.length,
      completionRate: Math.round(completionRate),
      averageRating: course.averageRating,
      totalRatings: course.totalRatings,
      ratingDistribution,
      enrollmentTrend: recentEnrollments.map(e => ({
        date: e.enrollmentDate.toISOString().split('T')[0],
        count: 1
      }))
    };

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    console.error('Get course analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
});

// these routes to your existing course routes file (courseRoutes.js)
// Import the authorize middleware for admin-only access

// @route   GET /api/courses/admin/all
// @desc    Get all courses (published and unpublished) for admin
// @access  Private (Admin only)
router.get('/admin/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      level,
      status,
      instructor,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object (no restriction on published status for admin)
    const filter = {};

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (instructor) filter.instructor = instructor;
    
    // Status filter
    if (status) {
      if (status === 'published') filter.isPublished = true;
      if (status === 'draft') filter.isPublished = false;
      if (status === 'featured') filter.isFeatured = true;
    }

    // Search functionality
    if (search) {
      filter.$text = { $search: search };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const courses = await Course.find(filter)
      .populate('instructor', 'firstName lastName email avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Get total count for pagination
    const totalCourses = await Course.countDocuments(filter);

    // Get summary statistics
    const stats = await Course.aggregate([
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          publishedCourses: { $sum: { $cond: ['$isPublished', 1, 0] } },
          draftCourses: { $sum: { $cond: ['$isPublished', 0, 1] } },
          featuredCourses: { $sum: { $cond: ['$isFeatured', 1, 0] } },
          totalEnrollments: { $sum: '$totalEnrollments' },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        courses,
        statistics: stats[0] || {
          totalCourses: 0,
          publishedCourses: 0,
          draftCourses: 0,
          featuredCourses: 0,
          totalEnrollments: 0,
          averagePrice: 0
        },
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalCourses / limit),
          totalCourses,
          hasNextPage: page < Math.ceil(totalCourses / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Admin get all courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses'
    });
  }
});

// @route   GET /api/courses/admin/dashboard
// @desc    Get dashboard statistics for admin
// @access  Private (Admin only)
router.get('/admin/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Overall statistics
    const overallStats = await Course.aggregate([
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          publishedCourses: { $sum: { $cond: ['$isPublished', 1, 0] } },
          draftCourses: { $sum: { $cond: ['$isPublished', 0, 1] } },
          featuredCourses: { $sum: { $cond: ['$isFeatured', 1, 0] } },
          totalEnrollments: { $sum: '$totalEnrollments' },
          totalRevenue: { $sum: { $multiply: ['$totalEnrollments', '$price'] } },
          averageRating: { $avg: '$averageRating' }
        }
      }
    ]);

    // Recent activity (last 30 days)
    const recentActivity = await Course.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          newCourses: { $sum: 1 },
          newPublishedCourses: { $sum: { $cond: ['$isPublished', 1, 0] } }
        }
      }
    ]);

    // Category distribution
    const categoryStats = await Course.aggregate([
      {
        $match: { isPublished: true }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalEnrollments: { $sum: '$totalEnrollments' },
          averageRating: { $avg: '$averageRating' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Top performing courses
    const topCourses = await Course.find({ isPublished: true })
      .populate('instructor', 'firstName lastName')
      .sort({ totalEnrollments: -1, averageRating: -1 })
      .limit(10)
      .select('title totalEnrollments averageRating price instructor');

    // Recent courses needing review (unpublished)
    const coursesNeedingReview = await Course.find({ isPublished: false })
      .populate('instructor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title createdAt instructor');

    res.json({
      success: true,
      data: {
        overview: overallStats[0] || {},
        recentActivity: recentActivity[0] || { newCourses: 0, newPublishedCourses: 0 },
        categoryDistribution: categoryStats,
        topPerformingCourses: topCourses,
        coursesNeedingReview
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data'
    });
  }
});

// @route   PUT /api/courses/admin/:id/status
// @desc    Admin update course status (publish/unpublish/feature)
// @access  Private (Admin only)
router.put('/admin/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { isPublished, isFeatured, adminNote } = req.body;
    
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Update status fields
    if (typeof isPublished === 'boolean') {
      course.isPublished = isPublished;
      if (isPublished && !course.publishedAt) {
        course.publishedAt = new Date();
      }
    }

    if (typeof isFeatured === 'boolean') {
      course.isFeatured = isFeatured;
    }

    // admin note if provided (you might want to add this field to your schema)
    if (adminNote) {
      course.adminNote = adminNote;
    }

    await course.save();

    // Populate instructor info for response
    await course.populate('instructor', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Course status updated successfully',
      data: { course }
    });
  } catch (error) {
    console.error('Admin update course status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating course status'
    });
  }
});

// @route   DELETE /api/courses/admin/:id
// @desc    Admin force delete course (even with enrollments)
// @access  Private (Admin only)
router.delete('/admin/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { forceDelete = false } = req.body;
    
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check for enrollments
    const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
    
    if (enrollmentCount > 0 && !forceDelete) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete course with ${enrollmentCount} active enrollments. Use forceDelete: true to override.`,
        data: { enrollmentCount }
      });
    }

    // If force delete, handle enrollments appropriately
    if (forceDelete && enrollmentCount > 0) {
      // You might want to:
      // 1. Refund students
      // 2. Send notifications
      // 3. Archive enrollments instead of deleting
      
      // For now, we'll just delete the enrollments
      // In production, you should handle this more carefully
      await Enrollment.deleteMany({ course: course._id });
    }

    // Remove course from instructor's created courses
    await User.findByIdAndUpdate(course.instructor, {
      $pull: { createdCourses: course._id }
    });

    // Delete the course
    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Course deleted successfully${forceDelete ? ' (forced deletion)' : ''}`,
      data: { 
        deletedCourse: {
          id: course._id,
          title: course.title,
          enrollmentCount
        }
      }
    });
  } catch (error) {
    console.error('Admin delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting course'
    });
  }
});

// @route   GET /api/courses/admin/:id/analytics
// @desc    Admin get detailed course analytics
// @access  Private (Admin only)
router.get('/admin/:id/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get detailed enrollment analytics
    const enrollments = await Enrollment.find({ course: course._id })
      .populate('student', 'firstName lastName email');
    
    const totalRevenue = enrollments.reduce((sum, enrollment) => sum + enrollment.payment.amount, 0);
    
    // Time-based analytics
    const now = new Date();
    const periods = {
      '7days': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30days': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90days': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    };

    const periodStats = {};
    for (const [period, date] of Object.entries(periods)) {
      const periodEnrollments = enrollments.filter(e => e.enrollmentDate >= date);
      periodStats[period] = {
        enrollments: periodEnrollments.length,
        revenue: periodEnrollments.reduce((sum, e) => sum + e.payment.amount, 0)
      };
    }

    // Completion and engagement metrics
    const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
    const activeEnrollments = enrollments.filter(e => e.status === 'active').length;
    const completionRate = enrollments.length > 0 ? (completedEnrollments / enrollments.length) * 100 : 0;

    // Rating analytics
    const ratingsData = enrollments
      .filter(e => e.rating && e.rating.score)
      .map(e => e.rating);

    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = ratingsData.filter(r => r.score === i).length;
    }

    // Geographic distribution (if you have student location data)
    const studentLocations = await User.find({
      _id: { $in: enrollments.map(e => e.student) }
    }).select('address.country address.city');

    const locationStats = {};
    studentLocations.forEach(student => {
      const country = student.address?.country || 'Unknown';
      locationStats[country] = (locationStats[country] || 0) + 1;
    });

    // Monthly trend data
    const monthlyTrend = {};
    enrollments.forEach(enrollment => {
      const month = enrollment.enrollmentDate.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyTrend[month]) {
        monthlyTrend[month] = { enrollments: 0, revenue: 0 };
      }
      monthlyTrend[month].enrollments++;
      monthlyTrend[month].revenue += enrollment.payment.amount;
    });

    const analytics = {
      courseInfo: {
        id: course._id,
        title: course.title,
        instructor: course.instructor,
        createdAt: course.createdAt,
        publishedAt: course.publishedAt,
        isPublished: course.isPublished,
        isFeatured: course.isFeatured
      },
      summary: {
        totalEnrollments: enrollments.length,
        activeEnrollments,
        completedEnrollments,
        totalRevenue,
        completionRate: Math.round(completionRate * 100) / 100,
        averageRating: course.averageRating,
        totalRatings: course.totalRatings
      },
      periodStats,
      ratingDistribution,
      locationDistribution: locationStats,
      monthlyTrend: Object.entries(monthlyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
      recentEnrollments: enrollments
        .sort((a, b) => b.enrollmentDate - a.enrollmentDate)
        .slice(0, 10)
        .map(e => ({
          student: e.student,
          enrollmentDate: e.enrollmentDate,
          status: e.status,
          progress: e.progress,
          paymentAmount: e.payment.amount
        }))
    };

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    console.error('Admin course analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course analytics'
    });
  }
});

// @route   GET /api/courses/admin/instructors
// @desc    Get all instructors with their course statistics
// @access  Private (Admin only)
router.get('/admin/instructors', authenticate, authorize('admin'), async (req, res) => {
  try {
    const instructors = await User.find({ role: 'instructor' })
      .select('firstName lastName email avatar createdAt isActive')
      .lean();

    // Get course statistics for each instructor
    const instructorStats = await Promise.all(
      instructors.map(async (instructor) => {
        const courses = await Course.find({ instructor: instructor._id });
        const totalEnrollments = courses.reduce((sum, course) => sum + course.totalEnrollments, 0);
        const totalRevenue = courses.reduce((sum, course) => sum + (course.totalEnrollments * course.price), 0);
        const averageRating = courses.length > 0 
          ? courses.reduce((sum, course) => sum + course.averageRating, 0) / courses.length 
          : 0;

        return {
          ...instructor,
          statistics: {
            totalCourses: courses.length,
            publishedCourses: courses.filter(c => c.isPublished).length,
            draftCourses: courses.filter(c => !c.isPublished).length,
            totalEnrollments,
            totalRevenue,
            averageRating: Math.round(averageRating * 100) / 100
          }
        };
      })
    );

    res.json({
      success: true,
      data: { instructors: instructorStats }
    });
  } catch (error) {
    console.error('Admin get instructors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching instructor data'
    });
  }
});

// @route   PUT /api/courses/admin/bulk-action
// @desc    Perform bulk actions on multiple courses
// @access  Private (Admin only)
router.put('/admin/bulk-action', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { courseIds, action, actionData } = req.body;

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of course IDs'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Please specify an action'
      });
    }

    let updateData = {};
    let result = {};

    switch (action) {
      case 'publish':
        updateData = { isPublished: true };
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          { ...updateData, publishedAt: new Date() }
        );
        break;

      case 'unpublish':
        updateData = { isPublished: false };
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          updateData
        );
        break;

      case 'feature':
        updateData = { isFeatured: true };
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          updateData
        );
        break;

      case 'unfeature':
        updateData = { isFeatured: false };
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          updateData
        );
        break;

      case 'delete':
        // Check for enrollments across all courses
        const enrollmentCounts = await Enrollment.aggregate([
          { $match: { course: { $in: courseIds.map(id => mongoose.Types.ObjectId(id)) } } },
          { $group: { _id: '$course', count: { $sum: 1 } } }
        ]);

        if (enrollmentCounts.length > 0 && !actionData?.forceDelete) {
          return res.status(400).json({
            success: false,
            message: 'Some courses have active enrollments. Use forceDelete to override.',
            data: { coursesWithEnrollments: enrollmentCounts }
          });
        }

        if (actionData?.forceDelete) {
          await Enrollment.deleteMany({ course: { $in: courseIds } });
        }

        result = await Course.deleteMany({ _id: { $in: courseIds } });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action specified'
        });
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: {
        affected: result.modifiedCount || result.deletedCount || 0,
        action,
        courseIds
      }
    });
  } catch (error) {
    console.error('Admin bulk action error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while performing bulk action'
    });
  }
});







// Add this route to your courseRoutes.js file

// @route   GET /api/courses/instructor/dashboard-analytics
// @desc    Get comprehensive analytics for instructor dashboard
// @access  Private (Instructor/Admin)
router.get('/instructor/dashboard-analytics', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const { timeframe = '90d' } = req.query;
    const instructorId = req.user._id;
    
    // Get date range based on timeframe
    const now = new Date();
    let dateFilter = {};
    let groupByFormat = '%Y-%m-%d'; // Default to daily
    
    switch (timeframe) {
      case '7d':
        dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
      case '1y':
        dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
        groupByFormat = '%Y-%m'; // Monthly for yearly view
        break;
      default:
        // All time - no filter
        groupByFormat = '%Y-%m';
        break;
    }

    // Get instructor's courses
    const instructorCourses = await Course.find({ instructor: instructorId });
    const courseIds = instructorCourses.map(course => course._id);

    if (courseIds.length === 0) {
      return res.json({
        success: true,
        data: {
          overview: {
            totalCourses: 0,
            totalStudents: 0,
            totalRevenue: 0,
            avgRating: 0,
            completionRate: 0
          },
          coursePerformance: [],
          enrollmentTrends: [],
          revenueTrends: [],
          topCourses: [],
          recentActivity: []
        }
      });
    }

    // 1. Overview Statistics
    const overviewStats = await Course.aggregate([
      { $match: { instructor: instructorId } },
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          publishedCourses: { $sum: { $cond: ['$isPublished', 1, 0] } },
          totalStudents: { $sum: '$totalEnrollments' },
          totalRevenue: { $sum: { $multiply: ['$totalEnrollments', '$price'] } },
          avgRating: { $avg: '$averageRating' },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    // 2. Enrollment Trends Over Time
    const enrollmentTrends = await Enrollment.aggregate([
      { 
        $match: { 
          course: { $in: courseIds },
          ...(Object.keys(dateFilter).length > 0 && { enrollmentDate: dateFilter })
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$enrollmentDate' } },
          enrollments: { $sum: 1 },
          revenue: { 
            $sum: { 
              $cond: [
                { $ne: ['$status', 'refunded'] }, 
                '$payment.amount', 
                0 
              ] 
            } 
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 3. Course Performance Metrics
    const coursePerformance = await Course.aggregate([
      { $match: { instructor: instructorId } },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'course',
          as: 'enrollments'
        }
      },
      {
        $addFields: {
          completedEnrollments: {
            $size: {
              $filter: {
                input: '$enrollments',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          },
          activeEnrollments: {
            $size: {
              $filter: {
                input: '$enrollments',
                cond: { $eq: ['$$this.status', 'active'] }
              }
            }
          }
        }
      },
      {
        $project: {
          title: 1,
          totalEnrollments: 1,
          averageRating: 1,
          price: 1,
          isPublished: 1,
          revenue: { $multiply: ['$totalEnrollments', '$price'] },
          completionRate: {
            $cond: [
              { $gt: ['$totalEnrollments', 0] },
              { $multiply: [{ $divide: ['$completedEnrollments', '$totalEnrollments'] }, 100] },
              0
            ]
          },
          activeStudents: '$activeEnrollments'
        }
      },
      { $sort: { totalEnrollments: -1 } }
    ]);

    // 4. Monthly Revenue Trends (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const revenueTrends = await Enrollment.aggregate([
      { 
        $match: { 
          course: { $in: courseIds },
          enrollmentDate: { $gte: twelveMonthsAgo },
          status: { $ne: 'refunded' }
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: '$enrollmentDate' },
            month: { $month: '$enrollmentDate' }
          },
          revenue: { $sum: '$payment.amount' },
          enrollments: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1
            }
          },
          revenue: 1,
          enrollments: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    // 5. Top Performing Courses
    const topCourses = coursePerformance.slice(0, 5).map(course => ({
      id: course._id,
      title: course.title,
      enrollments: course.totalEnrollments,
      revenue: course.revenue,
      rating: course.averageRating || 0,
      completionRate: Math.round(course.completionRate),
      activeStudents: course.activeStudents
    }));

    // 6. Recent Activity (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentEnrollments = await Enrollment.aggregate([
      { 
        $match: { 
          course: { $in: courseIds },
          enrollmentDate: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$courseInfo' },
      { $unwind: '$studentInfo' },
      {
        $project: {
          courseName: '$courseInfo.title',
          studentName: {
            $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName']
          },
          enrollmentDate: 1,
          status: 1,
          paymentAmount: '$payment.amount'
        }
      },
      { $sort: { enrollmentDate: -1 } },
      { $limit: 10 }
    ]);

    // 7. Completion Rate Analysis
    const completionAnalysis = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedEnrollments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          activeEnrollments: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          completionRate: {
            $multiply: [
              { $divide: ['$completedEnrollments', '$totalEnrollments'] },
              100
            ]
          }
        }
      }
    ]);

    // 8. Student Progress Distribution
    const progressDistribution = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $bucket: {
          groupBy: '$progress.completionPercentage',
          boundaries: [0, 25, 50, 75, 100, 101],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    // Format response data
    const analytics = {
      overview: {
        totalCourses: overviewStats[0]?.totalCourses || 0,
        publishedCourses: overviewStats[0]?.publishedCourses || 0,
        totalStudents: overviewStats[0]?.totalStudents || 0,
        totalRevenue: overviewStats[0]?.totalRevenue || 0,
        avgRating: Math.round((overviewStats[0]?.avgRating || 0) * 100) / 100,
        avgPrice: Math.round((overviewStats[0]?.avgPrice || 0) * 100) / 100,
        completionRate: Math.round((completionAnalysis[0]?.completionRate || 0) * 100) / 100
      },
      coursePerformance,
      enrollmentTrends: enrollmentTrends.map(trend => ({
        date: trend._id,
        enrollments: trend.enrollments,
        revenue: trend.revenue
      })),
      revenueTrends: revenueTrends.map(trend => ({
        date: trend.date.toISOString().split('T')[0],
        revenue: trend.revenue,
        enrollments: trend.enrollments
      })),
      topCourses,
      recentActivity: recentEnrollments,
      progressDistribution: progressDistribution.map(bucket => ({
        range: bucket._id === 'Other' ? '100+' : 
               bucket._id === 0 ? '0-25%' :
               bucket._id === 25 ? '25-50%' :
               bucket._id === 50 ? '50-75%' :
               bucket._id === 75 ? '75-100%' : 'Complete',
        count: bucket.count
      })),
      timeframe
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Instructor analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching instructor analytics'
    });
  }
});

// @route   GET /api/courses/instructor/performance-comparison
// @desc    Get course performance comparison data
// @access  Private (Instructor/Admin)
router.get('/instructor/performance-comparison', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const instructorId = req.user._id;
    
    // Get instructor's courses with detailed metrics
    const courseAnalytics = await Course.aggregate([
      { $match: { instructor: instructorId } },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'course',
          as: 'enrollments'
        }
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'course',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          enrollmentHistory: {
            $map: {
              input: {
                $filter: {
                  input: '$enrollments',
                  cond: { $ne: ['$$this.status', 'refunded'] }
                }
              },
              as: 'enrollment',
              in: {
                date: '$$enrollment.enrollmentDate',
                revenue: '$$enrollment.payment.amount'
              }
            }
          },
          totalRevenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$enrollments',
                    cond: { $ne: ['$$this.status', 'refunded'] }
                  }
                },
                as: 'enrollment',
                in: '$$enrollment.payment.amount'
              }
            }
          },
          avgRating: { $avg: '$reviews.rating' },
          totalReviews: { $size: '$reviews' }
        }
      },
      {
        $project: {
          title: 1,
          price: 1,
          totalEnrollments: 1,
          totalRevenue: 1,
          avgRating: { $ifNull: ['$avgRating', 0] },
          totalReviews: 1,
          enrollmentHistory: 1,
          isPublished: 1,
          createdAt: 1
        }
      },
      { $sort: { totalEnrollments: -1 } }
    ]);

    // Generate monthly enrollment trends for each course (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const courseTrends = await Promise.all(
      courseAnalytics.map(async (course) => {
        const monthlyEnrollments = await Enrollment.aggregate([
          { 
            $match: { 
              course: course._id,
              enrollmentDate: { $gte: sixMonthsAgo },
              status: { $ne: 'refunded' }
            } 
          },
          {
            $group: {
              _id: {
                year: { $year: '$enrollmentDate' },
                month: { $month: '$enrollmentDate' }
              },
              enrollments: { $sum: 1 },
              revenue: { $sum: '$payment.amount' }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        return {
          courseId: course._id,
          courseTitle: course.title,
          totalEnrollments: course.totalEnrollments,
          totalRevenue: course.totalRevenue,
          avgRating: Math.round(course.avgRating * 100) / 100,
          monthlyData: monthlyEnrollments.map(data => ({
            month: `${data._id.year}-${String(data._id.month).padStart(2, '0')}`,
            enrollments: data.enrollments,
            revenue: data.revenue
          }))
        };
      })
    );

    res.json({
      success: true,
      data: {
        courses: courseTrends,
        summary: {
          totalCourses: courseAnalytics.length,
          totalRevenue: courseAnalytics.reduce((sum, course) => sum + course.totalRevenue, 0),
          totalEnrollments: courseAnalytics.reduce((sum, course) => sum + course.totalEnrollments, 0),
          avgRating: Math.round(
            (courseAnalytics.reduce((sum, course) => sum + course.avgRating, 0) / courseAnalytics.length) * 100
          ) / 100
        }
      }
    });

  } catch (error) {
    console.error('Performance comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching performance comparison data'
    });
  }
});

// @route   GET /api/courses/instructor/student-analytics
// @desc    Get student enrollment and progress analytics
// @access  Private (Instructor/Admin)
router.get('/instructor/student-analytics', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { courseId } = req.query;

    // Build course filter
    const courseFilter = { instructor: instructorId };
    if (courseId) {
      courseFilter._id = courseId;
    }

    const instructorCourses = await Course.find(courseFilter).select('_id');
    const courseIds = instructorCourses.map(course => course._id);

    // Student enrollment over time (daily for last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyEnrollments = await Enrollment.aggregate([
      { 
        $match: { 
          course: { $in: courseIds },
          enrollmentDate: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$enrollmentDate' } },
          newStudents: { $sum: 1 },
          revenue: { 
            $sum: { 
              $cond: [
                { $ne: ['$status', 'refunded'] }, 
                '$payment.amount', 
                0 
              ] 
            } 
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Fill in missing dates with zero values
    const filledDailyData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayData = dailyEnrollments.find(d => d._id === dateString);
      filledDailyData.push({
        date: dateString,
        newStudents: dayData?.newStudents || 0,
        revenue: dayData?.revenue || 0
      });
    }

    // Student progress distribution across all courses
    const progressStats = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          completedStudents: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          activeStudents: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          avgProgress: { $avg: '$progress.completionPercentage' },
          totalRevenue: { 
            $sum: { 
              $cond: [
                { $ne: ['$status', 'refunded'] }, 
                '$payment.amount', 
                0 
              ] 
            } 
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        dailyEnrollments: filledDailyData,
        studentStats: {
          totalStudents: progressStats[0]?.totalStudents || 0,
          completedStudents: progressStats[0]?.completedStudents || 0,
          activeStudents: progressStats[0]?.activeStudents || 0,
          avgProgress: Math.round((progressStats[0]?.avgProgress || 0) * 100) / 100,
          totalRevenue: progressStats[0]?.totalRevenue || 0,
          completionRate: progressStats[0]?.totalStudents > 0 
            ? Math.round((progressStats[0].completedStudents / progressStats[0].totalStudents) * 10000) / 100
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Student analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student analytics'
    });
  }
});

export default router;