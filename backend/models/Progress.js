import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: [true, 'Lesson reference is required']
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Completion percentage cannot be negative'],
    max: [100, 'Completion percentage cannot exceed 100']
  },
  timeSpent: {
    type: Number,
    default: 0 // in seconds
  },
  lastPosition: {
    type: Number,
    default: 0 // for video lessons - last watched position in seconds
  },
  watchCount: {
    type: Number,
    default: 0
  },
  firstAccessAt: Date,
  lastAccessAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    timestamp: {
      type: Number, // for video lessons
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookmarks: [{
    name: {
      type: String,
      required: true,
      maxlength: [100, 'Bookmark name cannot exceed 100 characters']
    },
    timestamp: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  interactions: [{
    type: {
      type: String,
      enum: ['play', 'pause', 'seek', 'speed-change', 'fullscreen', 'note-add', 'bookmark-add'],
      required: true
    },
    timestamp: Number,
    value: mongoose.Schema.Types.Mixed, // for storing additional data like speed value
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  quizScores: [{
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    score: Number,
    percentage: Number,
    attempts: Number,
    bestScore: Number,
    lastAttemptAt: Date
  }]
}, {
  timestamps: true
});

// Compound indexes
progressSchema.index({ student: 1, course: 1, lesson: 1 }, { unique: true });
progressSchema.index({ student: 1, course: 1 });
progressSchema.index({ course: 1, lesson: 1 });
progressSchema.index({ student: 1, lastAccessAt: -1 });

// Virtual for formatted time spent
progressSchema.virtual('formattedTimeSpent').get(function() {
  const hours = Math.floor(this.timeSpent / 3600);
  const minutes = Math.floor((this.timeSpent % 3600) / 60);
  const seconds = this.timeSpent % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

// Method to update progress
progressSchema.methods.updateProgress = function(watchedDuration, totalDuration) {
  if (totalDuration > 0) {
    this.completionPercentage = Math.min(100, Math.round((watchedDuration / totalDuration) * 100));
    
    // Mark as completed if watched more than 80%
    if (this.completionPercentage >= 80 && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = new Date();
    } else if (this.completionPercentage > 0 && this.status === 'not-started') {
      this.status = 'in-progress';
      this.firstAccessAt = this.firstAccessAt || new Date();
    }
  }
  
  this.lastAccessAt = new Date();
  return this.save();
};

// Method to add note
progressSchema.methods.addNote = function(content, timestamp = 0) {
  this.notes.push({
    content,
    timestamp,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return this.save();
};

// Method to add bookmark
progressSchema.methods.addBookmark = function(name, timestamp) {
  // Check if bookmark already exists at this timestamp
  const existingBookmark = this.bookmarks.find(b => Math.abs(b.timestamp - timestamp) < 5);
  
  if (!existingBookmark) {
    this.bookmarks.push({
      name,
      timestamp,
      createdAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to record interaction
progressSchema.methods.recordInteraction = function(type, timestamp = 0, value = null) {
  this.interactions.push({
    type,
    timestamp,
    value,
    createdAt: new Date()
  });
  
  // Keep only last 100 interactions to prevent document from growing too large
  if (this.interactions.length > 100) {
    this.interactions = this.interactions.slice(-100);
  }
  
  return this.save();
};

// Static method to get course progress for a student
progressSchema.statics.getCourseProgress = async function(studentId, courseId) {
  const progress = await this.find({ student: studentId, course: courseId })
    .populate('lesson', 'title order section type')
    .sort({ 'lesson.order': 1 });
  
  const totalLessons = progress.length;
  const completedLessons = progress.filter(p => p.status === 'completed').length;
  const totalTimeSpent = progress.reduce((total, p) => total + p.timeSpent, 0);
  
  return {
    progress,
    stats: {
      totalLessons,
      completedLessons,
      overallProgress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      totalTimeSpent
    }
  };
};

// Ensure virtual fields are serialized
progressSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Progress', progressSchema);