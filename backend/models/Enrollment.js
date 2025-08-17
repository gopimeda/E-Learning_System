import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
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
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'suspended', 'refunded'],
    default: 'active'
  },
  progress: {
    completedLessons: [{
      lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
      },
      completedAt: {
        type: Date,
        default: Date.now
      },
      timeSpent: Number, // in seconds
      watchPercentage: Number // for video lessons
    }],
    totalLessons: {
      type: Number,
      default: 0
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAccessedLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    },
    totalTimeSpent: {
      type: Number,
      default: 0 // in seconds
    }
  },
  certificate: {
    isEarned: {
      type: Boolean,
      default: false
    },
    earnedAt: Date,
    certificateId: String,
    certificateUrl: String
  },
  payment: {
    amount: {
      type: Number,
      required: [true, 'Payment amount is required']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    paymentMethod: String,
    transactionId: String,
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed'
    }
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    ratedAt: Date
  },
  notes: [{
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    content: String,
    timestamp: Number, // for video notes
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  completedAt: Date,
  expiresAt: Date, // for time-limited courses
  refundReason: String,
  refundedAt: Date
}, {
  timestamps: true
});

// Compound indexes
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, status: 1 });
enrollmentSchema.index({ course: 1, enrollmentDate: -1 });

// Virtual for formatted completion percentage
enrollmentSchema.virtual('formattedProgress').get(function() {
  return `${this.progress.completionPercentage.toFixed(1)}%`;
});

// Method to update progress
enrollmentSchema.methods.updateProgress = function() {
  const completedCount = this.progress.completedLessons.length;
  const totalCount = this.progress.totalLessons;
  
  if (totalCount > 0) {
    this.progress.completionPercentage = Math.round((completedCount / totalCount) * 100);
    
    // Check if course is completed
    if (this.progress.completionPercentage === 100 && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
  
  return this.save();
};

// Method to add completed lesson
enrollmentSchema.methods.completeLesson = function(lessonId, timeSpent = 0, watchPercentage = 100) {
  const existingIndex = this.progress.completedLessons.findIndex(
    cl => cl.lesson.toString() === lessonId.toString()
  );
  
  if (existingIndex === -1) {
    this.progress.completedLessons.push({
      lesson: lessonId,
      timeSpent,
      watchPercentage,
      completedAt: new Date()
    });
  } else {
    // Update existing completion
    this.progress.completedLessons[existingIndex].timeSpent = timeSpent;
    this.progress.completedLessons[existingIndex].watchPercentage = watchPercentage;
    this.progress.completedLessons[existingIndex].completedAt = new Date();
  }
  
  this.progress.totalTimeSpent += timeSpent;
  this.progress.lastAccessedLesson = lessonId;
  this.progress.lastAccessedAt = new Date();
  
  return this.updateProgress();
};

// Ensure virtual fields are serialized
enrollmentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Enrollment', enrollmentSchema);