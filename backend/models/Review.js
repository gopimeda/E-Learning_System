import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Review title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [1000, 'Review comment cannot exceed 1000 characters']
  },
  pros: [{
    type: String,
    maxlength: [200, 'Each pro cannot exceed 200 characters']
  }],
  cons: [{
    type: String,
    maxlength: [200, 'Each con cannot exceed 200 characters']
  }],
  isVerified: {
    type: Boolean,
    default: false // Verified if student actually completed the course
  },
  isApproved: {
    type: Boolean,
    default: true // For moderation purposes
  },
  helpfulVotes: {
    type: Number,
    default: 0
  },
  reportCount: {
    type: Number,
    default: 0
  },
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Reply cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound index to ensure one review per student per course
reviewSchema.index({ course: 1, student: 1 }, { unique: true });
reviewSchema.index({ course: 1, rating: -1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ isApproved: 1, isVerified: 1 });

// Virtual for helpful percentage
reviewSchema.virtual('helpfulPercentage').get(function() {
  const totalVotes = this.helpfulVotes + this.reportCount;
  if (totalVotes === 0) return 0;
  return Math.round((this.helpfulVotes / totalVotes) * 100);
});

// Method to update course average rating
reviewSchema.statics.updateCourseRating = async function(courseId) {
  const stats = await this.aggregate([
    { $match: { course: courseId, isApproved: true } },
    {
      $group: {
        _id: '$course',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('Course').findByIdAndUpdate(courseId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalRatings: stats[0].totalRatings
    });
  }
};

// Post-save middleware to update course rating
reviewSchema.post('save', async function() {
  await this.constructor.updateCourseRating(this.course);
});

// Post-remove middleware to update course rating
reviewSchema.post('remove', async function() {
  await this.constructor.updateCourseRating(this.course);
});

// Ensure virtual fields are serialized
reviewSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Review', reviewSchema);
