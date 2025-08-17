import express from 'express';
import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';
import { authenticate, authorizeInstructorOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/lessons
// @desc    Create a new lesson
// @access  Private - Instructor/Admin only
router.post('/', authenticate, authorizeInstructorOrAdmin, async (req, res) => {
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
router.get('/course/:courseId', authenticate, async (req, res) => {
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

// @route   GET /api/lessons/:id
// @desc    Get single lesson
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('course', 'title instructor');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    res.json({
      success: true,
      data: { lesson }
    });
  } catch (error) {
    console.error('Lesson fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lesson'
    });
  }
});

// @route   PUT /api/lessons/:id
// @desc    Update a lesson
// @access  Private - Course instructor or Admin
router.put('/:id', authenticate, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('course');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check authorization
    if (lesson.course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update lessons in your own courses.'
      });
    }

    const {
      title,
      description,
      section,
      order,
      type,
      content,
      isPreview,
      isFree,
      isPublished
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (section) updateData.section = section;
    if (order) updateData.order = order;
    if (type) updateData.type = type;
    if (content) updateData.content = content;
    if (isPreview !== undefined) updateData.isPreview = isPreview;
    if (isFree !== undefined) updateData.isFree = isFree;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      data: { lesson: updatedLesson }
    });
  } catch (error) {
    console.error('Lesson update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating lesson'
    });
  }
});

// @route   DELETE /api/lessons/:id
// @desc    Delete a lesson
// @access  Private - Course instructor or Admin
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('course');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check authorization
    if (lesson.course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete lessons from your own courses.'
      });
    }

    await Lesson.findByIdAndDelete(req.params.id);

    // Remove lesson from course
    await Course.findByIdAndUpdate(lesson.course._id, {
      $pull: { lessons: lesson._id }
    });

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Lesson deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting lesson'
    });
  }
});

export default router;