// ============================================
// progressRoutes.js - Enhanced Progress Routes
// ============================================
import express from 'express';
import Progress from '../models/Progress.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
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

    // Validate enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
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
          completionPercentage: Math.min(100, Math.max(0, completionPercentage)),
          lastPosition,
          lastAccessAt: new Date()
        },
        $inc: { 
          timeSpent: Math.max(0, timeSpent),
          watchCount: 1 
        },
        $setOnInsert: {
          student: req.user._id,
          course: courseId,
          lesson: lessonId,
          firstAccessAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Update progress status based on completion percentage
    if (completionPercentage >= 80 && progress.status !== 'completed') {
      progress.status = 'completed';
      progress.completedAt = new Date();
      await progress.save();

      // Update enrollment progress
      await updateEnrollmentProgress(req.user._id, courseId);
    } else if (completionPercentage > 0 && progress.status === 'not-started') {
      progress.status = 'in-progress';
      progress.firstAccessAt = progress.firstAccessAt || new Date();
      await progress.save();
    }

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
    const { courseId } = req.params;

    // Validate enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    const progressData = await Progress.getCourseProgress(req.user._id, courseId);

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

// @route   GET /api/progress/lesson/:lessonId
// @desc    Get specific lesson progress
// @access  Private
progressRouter.get('/lesson/:lessonId', authenticate, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const progress = await Progress.findOne({
      student: req.user._id,
      lesson: lessonId
    }).populate('lesson', 'title course')
      .populate('course', 'title');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress not found for this lesson'
      });
    }

    res.json({
      success: true,
      data: { progress }
    });
  } catch (error) {
    console.error('Lesson progress fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lesson progress'
    });
  }
});

// @route   POST /api/progress/:lessonId/notes
// @desc    Add note to lesson progress
// @access  Private
progressRouter.post('/:lessonId/notes', authenticate, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { content, timestamp = 0 } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Note content cannot exceed 1000 characters'
      });
    }

    let progress = await Progress.findOne({
      student: req.user._id,
      lesson: lessonId
    });

    if (!progress) {
      // Create progress record if it doesn't exist
      const lesson = await require('../models/Lesson.js').default.findById(lessonId);
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      progress = new Progress({
        student: req.user._id,
        course: lesson.course,
        lesson: lessonId,
        firstAccessAt: new Date(),
        lastAccessAt: new Date()
      });
    }

    const note = {
      content: content.trim(),
      timestamp: Math.max(0, timestamp),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    progress.notes.push(note);
    progress.lastAccessAt = new Date();
    
    await progress.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { note: progress.notes[progress.notes.length - 1] }
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

// @route   PUT /api/progress/:lessonId/notes/:noteId
// @desc    Update note in lesson progress
// @access  Private
progressRouter.put('/:lessonId/notes/:noteId', authenticate, async (req, res) => {
  try {
    const { lessonId, noteId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Note content cannot exceed 1000 characters'
      });
    }

    const progress = await Progress.findOne({
      student: req.user._id,
      lesson: lessonId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress not found'
      });
    }

    const note = progress.notes.id(noteId);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    note.content = content.trim();
    note.updatedAt = new Date();
    progress.lastAccessAt = new Date();

    await progress.save();

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note }
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating note'
    });
  }
});

// @route   DELETE /api/progress/:lessonId/notes/:noteId
// @desc    Delete note from lesson progress
// @access  Private
progressRouter.delete('/:lessonId/notes/:noteId', authenticate, async (req, res) => {
  try {
    const { lessonId, noteId } = req.params;

    const progress = await Progress.findOne({
      student: req.user._id,
      lesson: lessonId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress not found'
      });
    }

    const noteIndex = progress.notes.findIndex(note => note._id.toString() === noteId);
    if (noteIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    progress.notes.splice(noteIndex, 1);
    progress.lastAccessAt = new Date();

    await progress.save();

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting note'
    });
  }
});

// @route   POST /api/progress/:lessonId/bookmarks
// @desc    Add bookmark to lesson progress
// @access  Private
progressRouter.post('/:lessonId/bookmarks', authenticate, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { name, timestamp } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bookmark name is required'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Bookmark name cannot exceed 100 characters'
      });
    }

    if (timestamp === undefined || timestamp < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid timestamp is required'
      });
    }

    let progress = await Progress.findOne({
      student: req.user._id,
      lesson: lessonId
    });

    if (!progress) {
      // Create progress record if it doesn't exist
      const lesson = await require('../models/Lesson.js').default.findById(lessonId);
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      progress = new Progress({
        student: req.user._id,
        course: lesson.course,
        lesson: lessonId,
        firstAccessAt: new Date(),
        lastAccessAt: new Date()
      });
    }

    // Check if bookmark already exists at similar timestamp (within 5 seconds)
    const existingBookmark = progress.bookmarks.find(
      bookmark => Math.abs(bookmark.timestamp - timestamp) < 5
    );

    if (existingBookmark) {
      return res.status(400).json({
        success: false,
        message: 'A bookmark already exists near this timestamp'
      });
    }

    const bookmark = {
      name: name.trim(),
      timestamp: Math.max(0, timestamp),
      createdAt: new Date()
    };

    progress.bookmarks.push(bookmark);
    progress.lastAccessAt = new Date();

    await progress.save();

    res.json({
      success: true,
      message: 'Bookmark added successfully',
      data: { bookmark: progress.bookmarks[progress.bookmarks.length - 1] }
    });
  } catch (error) {
    console.error('Add bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding bookmark'
    });
  }
});

// @route   DELETE /api/progress/:lessonId/bookmarks/:bookmarkId
// @desc    Delete bookmark from lesson progress
// @access  Private
progressRouter.delete('/:lessonId/bookmarks/:bookmarkId', authenticate, async (req, res) => {
  try {
    const { lessonId, bookmarkId } = req.params;

    const progress = await Progress.findOne({
      student: req.user._id,
      lesson: lessonId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress not found'
      });
    }

    const bookmarkIndex = progress.bookmarks.findIndex(
      bookmark => bookmark._id.toString() === bookmarkId
    );
    
    if (bookmarkIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Bookmark not found'
      });
    }

    progress.bookmarks.splice(bookmarkIndex, 1);
    progress.lastAccessAt = new Date();

    await progress.save();

    res.json({
      success: true,
      message: 'Bookmark deleted successfully'
    });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting bookmark'
    });
  }
});

// @route   POST /api/progress/:lessonId/interaction
// @desc    Record lesson interaction
// @access  Private
progressRouter.post('/:lessonId/interaction', authenticate, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { type, timestamp = 0, value = null } = req.body;

    const validInteractionTypes = [
      'play', 'pause', 'seek', 'speed-change', 'fullscreen', 'note-add', 'bookmark-add'
    ];

    if (!type || !validInteractionTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid interaction type is required'
      });
    }

    let progress = await Progress.findOne({
      student: req.user._id,
      lesson: lessonId
    });

    if (!progress) {
      // Create progress record if it doesn't exist
      const lesson = await require('../models/Lesson.js').default.findById(lessonId);
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      progress = new Progress({
        student: req.user._id,
        course: lesson.course,
        lesson: lessonId,
        firstAccessAt: new Date(),
        lastAccessAt: new Date()
      });
    }

    progress.interactions.push({
      type,
      timestamp: Math.max(0, timestamp),
      value,
      createdAt: new Date()
    });

    // Keep only last 100 interactions to prevent document from growing too large
    if (progress.interactions.length > 100) {
      progress.interactions = progress.interactions.slice(-100);
    }

    progress.lastAccessAt = new Date();
    await progress.save();

    res.json({
      success: true,
      message: 'Interaction recorded successfully'
    });
  } catch (error) {
    console.error('Record interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording interaction'
    });
  }
});

// @route   GET /api/progress/analytics/:courseId
// @desc    Get student's learning analytics for a course
// @access  Private
progressRouter.get('/analytics/:courseId', authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    const progressData = await Progress.getCourseProgress(req.user._id, courseId);
    const progressRecords = progressData.progress;

    // Calculate analytics
    const analytics = {
      courseProgress: progressData.stats,
      studyHabits: {
        totalStudyTime: progressRecords.reduce((total, p) => total + p.timeSpent, 0),
        averageSessionLength: progressRecords.length > 0 
          ? Math.round(progressRecords.reduce((total, p) => total + p.timeSpent, 0) / progressRecords.length)
          : 0,
        totalNotes: progressRecords.reduce((total, p) => total + p.notes.length, 0),
        totalBookmarks: progressRecords.reduce((total, p) => total + p.bookmarks.length, 0),
        mostActiveDay: getMostActiveDay(progressRecords),
        studyStreak: calculateStudyStreak(progressRecords)
      },
      lessonProgress: progressRecords.map(p => ({
        lessonId: p.lesson._id,
        lessonTitle: p.lesson.title,
        status: p.status,
        completionPercentage: p.completionPercentage,
        timeSpent: p.timeSpent,
        watchCount: p.watchCount,
        notesCount: p.notes.length,
        bookmarksCount: p.bookmarks.length,
        lastAccessAt: p.lastAccessAt,
        completedAt: p.completedAt
      })),
      weeklyProgress: getWeeklyProgress(progressRecords)
    };

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
});

// Helper Functions
async function updateEnrollmentProgress(studentId, courseId) {
  try {
    const progressData = await Progress.getCourseProgress(studentId, courseId);
    const { stats } = progressData;

    await Enrollment.findOneAndUpdate(
      { student: studentId, course: courseId },
      {
        $set: {
          'progress.completionPercentage': stats.overallProgress,
          'progress.completedLessons': stats.completedLessons,
          'progress.totalLessons': stats.totalLessons,
          'progress.totalTimeSpent': stats.totalTimeSpent,
          'progress.lastAccessedAt': new Date()
        }
      }
    );

    // Mark enrollment as completed if all lessons are completed
    if (stats.overallProgress === 100) {
      await Enrollment.findOneAndUpdate(
        { student: studentId, course: courseId },
        {
          $set: {
            status: 'completed',
            completedAt: new Date()
          }
        }
      );
    }
  } catch (error) {
    console.error('Update enrollment progress error:', error);
  }
}

function getMostActiveDay(progressRecords) {
  const dayCount = {};
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  progressRecords.forEach(progress => {
    if (progress.lastAccessAt) {
      const day = new Date(progress.lastAccessAt).getDay();
      dayCount[days[day]] = (dayCount[days[day]] || 0) + 1;
    }
  });
  
  return Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b, 'Monday');
}

function calculateStudyStreak(progressRecords) {
  if (progressRecords.length === 0) return 0;
  
  const uniqueDates = [...new Set(
    progressRecords
      .filter(p => p.lastAccessAt)
      .map(p => new Date(p.lastAccessAt).toDateString())
  )].sort((a, b) => new Date(b) - new Date(a));
  
  if (uniqueDates.length === 0) return 0;
  
  let streak = 1;
  const today = new Date().toDateString();
  
  // Check if studied today or yesterday
  if (uniqueDates[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (uniqueDates[0] !== yesterday.toDateString()) {
      return 0;
    }
  }
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const current = new Date(uniqueDates[i - 1]);
    const previous = new Date(uniqueDates[i]);
    const diffDays = Math.ceil((current - previous) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function getWeeklyProgress(progressRecords) {
  const weeklyData = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toDateString();
    
    const dayProgress = progressRecords.filter(p => 
      p.lastAccessAt && new Date(p.lastAccessAt).toDateString() === dateString
    );
    
    weeklyData.push({
      date: dateString,
      lessonsAccessed: dayProgress.length,
      totalTimeSpent: dayProgress.reduce((total, p) => total + p.timeSpent, 0),
      notesAdded: dayProgress.reduce((total, p) => total + p.notes.filter(n => 
        new Date(n.createdAt).toDateString() === dateString
      ).length, 0)
    });
  }
  
  return weeklyData;
}

export default progressRouter;