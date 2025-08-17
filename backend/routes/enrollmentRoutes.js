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




// Additional Admin Enrollment Management APIs
// Add these routes to your existing enrollment router

// @route   DELETE /api/enrollments/:id
// @desc    Unenroll/Delete an enrollment (Admin only)
// @access  Private - Admin only
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { reason, notifyStudent = true } = req.body;

    const enrollment = await Enrollment.findById(req.params.id)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title instructor');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Remove student from course's enrolled students
    await Course.findByIdAndUpdate(enrollment.course._id, {
      $pull: { enrolledStudents: enrollment.student._id },
      $inc: { totalEnrollments: -1 }
    });

    // Remove course from user's enrolled courses
    await User.findByIdAndUpdate(enrollment.student._id, {
      $pull: { enrolledCourses: enrollment.course._id }
    });

    // Store enrollment data for audit before deletion
    const enrollmentData = {
      studentId: enrollment.student._id,
      studentEmail: enrollment.student.email,
      courseId: enrollment.course._id,
      courseTitle: enrollment.course.title,
      enrollmentDate: enrollment.enrollmentDate,
      deletedAt: new Date(),
      deletedBy: req.user._id,
      reason: reason || 'Admin unenrollment'
    };

    // TODO: Store in audit log collection if needed
    console.log('Enrollment deleted:', enrollmentData);

    await Enrollment.findByIdAndDelete(req.params.id);

    // TODO: Send notification email to student if notifyStudent is true
    if (notifyStudent) {
      console.log(`Should notify ${enrollment.student.email} about unenrollment`);
    }

    res.json({
      success: true,
      message: 'Student successfully unenrolled from course',
      data: { enrollmentData }
    });

  } catch (error) {
    console.error('Unenrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unenrolling student'
    });
  }
});

// @route   POST /api/enrollments/bulk-enroll
// @desc    Bulk enroll students in a course (Admin only)
// @access  Private - Admin only
router.post('/bulk-enroll', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { courseId, studentIds, paymentMethod = 'admin_enrolled', notifyStudents = true } = req.body;

    if (!courseId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and student IDs array are required'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const results = {
      successful: [],
      failed: [],
      alreadyEnrolled: []
    };

    for (const studentId of studentIds) {
      try {
        // Check if student exists
        const student = await User.findById(studentId).select('firstName lastName email role');
        if (!student) {
          results.failed.push({
            studentId,
            reason: 'Student not found'
          });
          continue;
        }

        if (student.role !== 'student') {
          results.failed.push({
            studentId,
            email: student.email,
            reason: 'User is not a student'
          });
          continue;
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
          student: studentId,
          course: courseId
        });

        if (existingEnrollment) {
          results.alreadyEnrolled.push({
            studentId,
            email: student.email,
            enrollmentId: existingEnrollment._id
          });
          continue;
        }

        // Create enrollment
        const enrollment = new Enrollment({
          student: studentId,
          course: courseId,
          payment: {
            amount: 0, // Admin enrolled, no payment required
            paymentMethod,
            paymentStatus: 'completed'
          },
          progress: {
            totalLessons: course.lessons ? course.lessons.length : 0
          }
        });

        await enrollment.save();

        // Update course enrollment count
        await Course.findByIdAndUpdate(courseId, {
          $push: { enrolledStudents: studentId },
          $inc: { totalEnrollments: 1 }
        });

        // Update user's enrolled courses
        await User.findByIdAndUpdate(studentId, {
          $push: { enrolledCourses: courseId }
        });

        results.successful.push({
          studentId,
          email: student.email,
          enrollmentId: enrollment._id
        });

        // TODO: Send notification email if notifyStudents is true
        if (notifyStudents) {
          console.log(`Should notify ${student.email} about enrollment in ${course.title}`);
        }

      } catch (error) {
        results.failed.push({
          studentId,
          reason: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Bulk enrollment completed',
      data: {
        summary: {
          total: studentIds.length,
          successful: results.successful.length,
          failed: results.failed.length,
          alreadyEnrolled: results.alreadyEnrolled.length
        },
        results
      }
    });

  } catch (error) {
    console.error('Bulk enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk enrollment'
    });
  }
});

// @route   POST /api/enrollments/manual-enroll
// @desc    Manually enroll a student (Admin only)
// @access  Private - Admin only
router.post('/manual-enroll', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { 
      studentId, 
      courseId, 
      paymentAmount = 0, 
      paymentMethod = 'admin_enrolled',
      notifyStudent = true,
      notes 
    } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Course ID are required'
      });
    }

    // Validate student
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'User is not a student'
      });
    }

    // Validate course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }

    // Create enrollment
    const enrollment = new Enrollment({
      student: studentId,
      course: courseId,
      payment: {
        amount: paymentAmount,
        paymentMethod,
        paymentStatus: 'completed'
      },
      progress: {
        totalLessons: course.lessons ? course.lessons.length : 0
      },
      ...(notes && { 
        notes: [{
          content: `Admin enrollment note: ${notes}`,
          createdAt: new Date()
        }]
      })
    });

    await enrollment.save();

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, {
      $push: { enrolledStudents: studentId },
      $inc: { totalEnrollments: 1 }
    });

    // Update user's enrolled courses
    await User.findByIdAndUpdate(studentId, {
      $push: { enrolledCourses: courseId }
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('course', 'title thumbnail instructor')
      .populate('student', 'firstName lastName email');

    // TODO: Send notification email if notifyStudent is true
    if (notifyStudent) {
      console.log(`Should notify ${student.email} about manual enrollment in ${course.title}`);
    }

    res.status(201).json({
      success: true,
      message: 'Student successfully enrolled by admin',
      data: { enrollment: populatedEnrollment }
    });

  } catch (error) {
    console.error('Manual enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during manual enrollment'
    });
  }
});

// @route   GET /api/enrollments/admin/overview
// @desc    Get enrollment overview/statistics (Admin only)
// @access  Private - Admin only
router.get('/admin/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateFilter = { enrollmentDate: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { enrollmentDate: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '90d':
        dateFilter = { enrollmentDate: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
        break;
      case '1y':
        dateFilter = { enrollmentDate: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        // All time - no filter
        break;
    }

    // Get overall statistics
    const totalStats = await Enrollment.aggregate([
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          activeEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completedEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          suspendedEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          refundedEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
          totalRevenue: { 
            $sum: { 
              $cond: [
                { $ne: ['$status', 'refunded'] }, 
                '$payment.amount', 
                0 
              ] 
            } 
          },
          avgCompletionRate: { $avg: '$progress.completionPercentage' }
        }
      }
    ]);

    // Get recent enrollments with time filter
    const recentStats = await Enrollment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          recentEnrollments: { $sum: 1 },
          recentRevenue: { 
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

    // Get enrollment trends by day for the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const enrollmentTrends = await Enrollment.aggregate([
      { $match: { enrollmentDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$enrollmentDate' },
            month: { $month: '$enrollmentDate' },
            day: { $dayOfMonth: '$enrollmentDate' }
          },
          count: { $sum: 1 },
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
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get top courses by enrollment
    const topCourses = await Enrollment.aggregate([
      {
        $group: {
          _id: '$course',
          enrollmentCount: { $sum: 1 },
          revenue: { 
            $sum: { 
              $cond: [
                { $ne: ['$status', 'refunded'] }, 
                '$payment.amount', 
                0 
              ] 
            } 
          },
          avgCompletion: { $avg: '$progress.completionPercentage' }
        }
      },
      { $sort: { enrollmentCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $project: {
          courseId: '$_id',
          courseTitle: '$course.title',
          enrollmentCount: 1,
          revenue: 1,
          avgCompletion: { $round: ['$avgCompletion', 1] }
        }
      }
    ]);

    const stats = {
      total: totalStats[0] || {
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        suspendedEnrollments: 0,
        refundedEnrollments: 0,
        totalRevenue: 0,
        avgCompletionRate: 0
      },
      recent: recentStats[0] || {
        recentEnrollments: 0,
        recentRevenue: 0
      },
      trends: enrollmentTrends,
      topCourses
    };

    res.json({
      success: true,
      data: {
        timeframe,
        stats
      }
    });

  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admin overview'
    });
  }
});

// @route   GET /api/enrollments/admin/search
// @desc    Advanced search enrollments (Admin only)
// @access  Private - Admin only
router.get('/admin/search', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      studentEmail,
      studentName,
      courseTitle,
      status,
      paymentStatus,
      enrollmentDateFrom,
      enrollmentDateTo,
      completionMin,
      completionMax,
      page = 1,
      limit = 20,
      sortBy = 'enrollmentDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    // Build aggregation pipeline for complex search
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' }
    ];

    // Add match conditions
    const matchConditions = {};

    if (status && status !== 'all') {
      matchConditions.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      matchConditions['payment.paymentStatus'] = paymentStatus;
    }

    if (studentEmail) {
      matchConditions['studentInfo.email'] = { $regex: studentEmail, $options: 'i' };
    }

    if (studentName) {
      matchConditions.$or = [
        { 'studentInfo.firstName': { $regex: studentName, $options: 'i' } },
        { 'studentInfo.lastName': { $regex: studentName, $options: 'i' } }
      ];
    }

    if (courseTitle) {
      matchConditions['courseInfo.title'] = { $regex: courseTitle, $options: 'i' };
    }

    if (enrollmentDateFrom || enrollmentDateTo) {
      matchConditions.enrollmentDate = {};
      if (enrollmentDateFrom) {
        matchConditions.enrollmentDate.$gte = new Date(enrollmentDateFrom);
      }
      if (enrollmentDateTo) {
        matchConditions.enrollmentDate.$lte = new Date(enrollmentDateTo);
      }
    }

    if (completionMin !== undefined || completionMax !== undefined) {
      matchConditions['progress.completionPercentage'] = {};
      if (completionMin !== undefined) {
        matchConditions['progress.completionPercentage'].$gte = Number(completionMin);
      }
      if (completionMax !== undefined) {
        matchConditions['progress.completionPercentage'].$lte = Number(completionMax);
      }
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add sorting
    const sortStage = {};
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortStage });

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    // Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        status: 1,
        enrollmentDate: 1,
        progress: 1,
        payment: 1,
        certificate: 1,
        rating: 1,
        completedAt: 1,
        student: {
          _id: '$studentInfo._id',
          firstName: '$studentInfo.firstName',
          lastName: '$studentInfo.lastName',
          email: '$studentInfo.email',
          avatar: '$studentInfo.avatar'
        },
        course: {
          _id: '$courseInfo._id',
          title: '$courseInfo.title',
          thumbnail: '$courseInfo.thumbnail',
          price: '$courseInfo.price'
        }
      }
    });

    const enrollments = await Enrollment.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = pipeline.slice(0, -2); // Remove skip and limit
    countPipeline.push({ $count: 'total' });
    const countResult = await Enrollment.aggregate(countPipeline);
    const totalEnrollments = countResult[0]?.total || 0;

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
    console.error('Admin search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching enrollments'
    });
  }
});

// @route   PUT /api/enrollments/:id/admin-notes
// @desc    Add admin notes to enrollment (Admin only)
// @access  Private - Admin only
router.put('/:id/admin-notes', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id);
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Add admin note
    enrollment.notes.push({
      content: `[ADMIN NOTE] ${content.trim()}`,
      createdAt: new Date()
    });

    await enrollment.save();

    res.json({
      success: true,
      message: 'Admin note added successfully',
      data: { 
        noteId: enrollment.notes[enrollment.notes.length - 1]._id,
        note: enrollment.notes[enrollment.notes.length - 1]
      }
    });

  } catch (error) {
    console.error('Admin note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding admin note'
    });
  }
});

// @route   PUT /api/enrollments/:id/extend
// @desc    Extend course access (Admin only)
// @access  Private - Admin only
router.put('/:id/extend', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { extensionDays, reason } = req.body;

    if (!extensionDays || extensionDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid extension days are required'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Extend expiration date
    const currentExpiry = enrollment.expiresAt || new Date();
    const newExpiry = new Date(currentExpiry.getTime() + (extensionDays * 24 * 60 * 60 * 1000));
    
    enrollment.expiresAt = newExpiry;

    // Add note about extension
    enrollment.notes.push({
      content: `[ADMIN] Course access extended by ${extensionDays} days. Reason: ${reason || 'No reason provided'}`,
      createdAt: new Date()
    });

    await enrollment.save();

    res.json({
      success: true,
      message: `Course access extended by ${extensionDays} days`,
      data: { 
        newExpiryDate: newExpiry,
        enrollment 
      }
    });

  } catch (error) {
    console.error('Extension error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while extending course access'
    });
  }
});


export default router;