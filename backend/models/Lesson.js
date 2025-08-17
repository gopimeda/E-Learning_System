import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true
  },
  order: {
    type: Number,
    required: [true, 'Lesson order is required'],
    min: [1, 'Order must be at least 1']
  },
  type: {
    type: String,
    required: [true, 'Lesson type is required'],
    enum: ['video', 'text', 'quiz', 'assignment', 'document']
  },
  content: {
    // For video lessons
    videoUrl: String,
    videoThumbnail: String,
    videoDuration: Number, // in seconds
    videoSize: Number, // in bytes
    
    // For text lessons
    textContent: String,
    
    // For document lessons
    documentUrl: String,
    documentType: String,
    documentSize: Number,
    
    // For assignments
    assignmentInstructions: String,
    assignmentDueDate: Date,
    maxScore: Number,
    
    // Common fields
    resources: [{
      title: String,
      url: String,
      type: {
        type: String,
        enum: ['pdf', 'doc', 'link', 'image', 'video', 'other']
      }
    }]
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  isFree: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  completionCriteria: {
    watchPercentage: {
      type: Number,
      default: 80,
      min: 50,
      max: 100
    },
    requireQuizPass: {
      type: Boolean,
      default: false
    },
    minQuizScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    }
  },
  notes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    timestamp: Number, // for video lessons
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  discussions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion'
  }]
}, {
  timestamps: true
});

// Indexes
lessonSchema.index({ course: 1, order: 1 });
lessonSchema.index({ course: 1, section: 1, order: 1 });

// Virtual for lesson duration in readable format
lessonSchema.virtual('formattedDuration').get(function() {
  if (this.content.videoDuration) {
    const minutes = Math.floor(this.content.videoDuration / 60);
    const seconds = this.content.videoDuration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return null;
});

// Ensure virtual fields are serialized
lessonSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Lesson', lessonSchema);