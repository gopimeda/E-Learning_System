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