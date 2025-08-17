import express from 'express';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/enrollments
// @desc    Enroll in a course
// @access  Private - Students only
router.post('/', authenticate, authorize('student'), async (req, res) => {
  try {
    const { courseId, paymentMethod = 'free', transactionId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Course is not published'
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    // Check if user is the instructor of this course
    if (course.instructor.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot enroll in your own course'
      });
    }

    // Determine payment amount
    const paymentAmount = course.discountPrice || course.price;

    // Create enrollment
    const enrollment = new Enrollment({
      student: req.user._id,
      course: courseId,
      payment: {
        amount: paymentAmount,
        paymentMethod,
        transactionId,
        paymentStatus: paymentAmount === 0 ? 'completed' : 'completed'
      },
      progress: {
        totalLessons: course.lessons ? course.lessons.length : 0
      }
    });

    await enrollment.save();

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, {
      $push: { enrolledStudents: req.user._id },
      $inc: { totalEnrollments: 1 }
    });

    // Update user's enrolled courses
    await User.findByIdAndUpdate(req.user._id, {
      $push: { enrolledCourses: courseId }
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('course', 'title thumbnail instructor')
      .populate('student', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      data: { enrollment: populatedEnrollment }
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during enrollment'
    });
  }
});

// @route   GET /api/enrollments
// @desc    Get user's enrollments
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { student: req.user._id };
    if (status && status !== 'all') filter.status = status;

    const enrollments = await Enrollment.find(filter)
      .populate({
        path: 'course',
        select: 'title thumbnail instructor price category level averageRating duration',
        populate: {
          path: 'instructor',
          select: 'firstName lastName'
        }
      })
      .sort({ enrollmentDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalEnrollments = await Enrollment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        enrollments,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalEnrollments / limit),
          totalEnrollments,
          hasNextPage: page < Math.ceil(totalEnrollments / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Enrollments fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrollments'
    });
  }
});

// @route   GET /api/enrollments/:id
// @desc    Get single enrollment details
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('course')
      .populate('student', 'firstName lastName email avatar')
      .populate('progress.completedLessons.lesson', 'title order');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    const isStudent = enrollment.student._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isInstructor = enrollment.course.instructor && 
                        enrollment.course.instructor.toString() === req.user._id.toString();

    if (!isStudent && !isAdmin && !isInstructor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { enrollment }
    });
  } catch (error) {
    console.error('Enrollment fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrollment'
    });
  }
});

// @route   PUT /api/enrollments/:id/progress
// @desc    Update course progress
// @access  Private - Student only
router.put('/:id/progress', authenticate, async (req, res) => {
  try {
    const { lessonId, timeSpent = 0, watchPercentage = 100 } = req.body;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Lesson ID is required'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await enrollment.completeLesson(lessonId, timeSpent, watchPercentage);

    const updatedEnrollment = await Enrollment.findById(req.params.id)
      .populate('course', 'title')
      .populate('progress.completedLessons.lesson', 'title order');

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: { enrollment: updatedEnrollment }
    });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating progress'
    });
  }
});

// @route   POST /api/enrollments/:id/certificate
// @desc    Generate course completion certificate
// @access  Private - Student only
router.post('/:id/certificate', authenticate, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('course', 'title certificate instructor')
      .populate('student', 'firstName lastName');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if course completion meets certificate criteria
    const course = enrollment.course;
    if (!course.certificate || !course.certificate.isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Certificate is not enabled for this course'
      });
    }

    const requiredCompletion = course.certificate.criteria ? 
                              course.certificate.criteria.completionPercentage : 100;
    
    if (enrollment.progress.completionPercentage < requiredCompletion) {
      return res.status(400).json({
        success: false,
        message: `You need to complete at least ${requiredCompletion}% of the course to earn a certificate`
      });
    }

    // Check if certificate already earned
    if (enrollment.certificate.isEarned) {
      return res.json({
        success: true,
        message: 'Certificate already earned',
        data: { 
          certificate: enrollment.certificate,
          certificateUrl: enrollment.certificate.certificateUrl 
        }
      });
    }

    // Generate certificate ID
    const certificateId = `CERT-${Date.now()}-${enrollment._id.toString().slice(-6).toUpperCase()}`;
    
    // In a real application, you would generate an actual certificate PDF here
    const certificateUrl = `${process.env.BASE_URL || 'http://localhost:5555'}/certificates/${certificateId}.pdf`;

    // Update enrollment with certificate info
    enrollment.certificate = {
      isEarned: true,
      earnedAt: new Date(),
      certificateId,
      certificateUrl
    };

    await enrollment.save();

    res.json({
      success: true,
      message: 'Certificate generated successfully',
      data: { 
        certificate: enrollment.certificate,
        certificateUrl 
      }
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating certificate'
    });
  }
});

// @route   POST /api/enrollments/:id/review
// @desc    Add course review and rating
// @access  Private - Student only
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const { score, review } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating score must be between 1 and 5'
      });
    }

    if (!review || review.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Review text is required'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if review already exists
    if (enrollment.rating && enrollment.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course'
      });
    }

    // Update enrollment with review
    enrollment.rating = {
      score,
      review: review.trim(),
      ratedAt: new Date()
    };

    await enrollment.save();

    res.json({
      success: true,
      message: 'Review added successfully',
      data: { rating: enrollment.rating }
    });
  } catch (error) {
    console.error('Review add error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding review'
    });
  }
});

// @route   GET /api/enrollments/course/:courseId
// @desc    Get all enrollments for a course (Instructor/Admin only)
// @access  Private - Instructor/Admin
router.get('/course/:courseId', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Check if user is instructor of this course or admin
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const isInstructor = course.instructor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be the course instructor or admin.'
      });
    }

    const filter = { course: req.params.courseId };
    if (status && status !== 'all') filter.status = status;

    const enrollments = await Enrollment.find(filter)
      .populate('student', 'firstName lastName email avatar createdAt')
      .populate('course', 'title')
      .sort({ enrollmentDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalEnrollments = await Enrollment.countDocuments(filter);

    // Get enrollment statistics using proper ObjectId conversion
    const courseObjectId = new mongoose.Types.ObjectId(req.params.courseId);
    
    const stats = await Enrollment.aggregate([
      { $match: { course: courseObjectId } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedEnrollments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          activeEnrollments: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          suspendedEnrollments: {
            $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
          },
          refundedEnrollments: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
          },
          averageProgress: { $avg: '$progress.completionPercentage' },
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

    const enrollmentStats = stats[0] || {
      totalEnrollments: 0,
      completedEnrollments: 0,
      activeEnrollments: 0,
      suspendedEnrollments: 0,
      refundedEnrollments: 0,
      averageProgress: 0,
      totalRevenue: 0
    };

    res.json({
      success: true,
      data: {
        enrollments,
        stats: enrollmentStats,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalEnrollments / limit),
          totalEnrollments,
          hasNextPage: page < Math.ceil(totalEnrollments / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Course enrollments fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course enrollments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/enrollments/course/:courseId/export
// @desc    Export course enrollments to CSV
// @access  Private - Instructor/Admin
router.get('/course/:courseId/export', authenticate, async (req, res) => {
  try {
    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Check if user is instructor of this course or admin
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const isInstructor = course.instructor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const enrollments = await Enrollment.find({ course: req.params.courseId })
      .populate('student', 'firstName lastName email')
      .sort({ enrollmentDate: -1 });

    // Create CSV content
    const csvHeaders = [
      'Student Name',
      'Email',
      'Status',
      'Progress (%)',
      'Enrollment Date',
      'Last Access',
      'Payment Amount',
      'Payment Status',
      'Completed Lessons',
      'Total Lessons',
      'Certificate Earned',
      'Rating'
    ];

    const csvRows = enrollments.map(enrollment => [
      `${enrollment.student?.firstName || ''} ${enrollment.student?.lastName || ''}`.trim(),
      enrollment.student?.email || '',
      enrollment.status,
      enrollment.progress?.completionPercentage || 0,
      enrollment.enrollmentDate ? new Date(enrollment.enrollmentDate).toLocaleDateString() : '',
      enrollment.progress?.lastAccessedAt ? new Date(enrollment.progress.lastAccessedAt).toLocaleDateString() : 'Never',
      enrollment.payment?.amount || 0,
      enrollment.payment?.paymentStatus || '',
      enrollment.progress?.completedLessons?.length || 0,
      enrollment.progress?.totalLessons || 0,
      enrollment.certificate?.isEarned ? 'Yes' : 'No',
      enrollment.rating?.score || ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="enrollments-${req.params.courseId}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting enrollments'
    });
  }
});

// @route   PUT /api/enrollments/:id/status
// @desc    Update enrollment status (Instructor/Admin only)
// @access  Private - Instructor/Admin
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!['active', 'completed', 'suspended', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id)
      .populate('course', 'instructor');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const isInstructor = enrollment.course.instructor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    enrollment.status = status;
    
    if (status === 'refunded') {
      enrollment.refundReason = reason;
      enrollment.refundedAt = new Date();
    }

    if (status === 'completed' && !enrollment.completedAt) {
      enrollment.completedAt = new Date();
    }

    await enrollment.save();

    res.json({
      success: true,
      message: 'Enrollment status updated successfully',
      data: { enrollment }
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating enrollment status'
    });
  }
});

export default router;