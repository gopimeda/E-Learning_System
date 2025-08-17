import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  thumbnail: {
    type: String,
    required: [true, 'Course thumbnail is required']
  },
  price: {
    type: Number,
    required: [true, 'Course price is required'],
    min: [0, 'Price cannot be negative']
  },
  discountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative'],
    validate: {
      validator: function(value) {
        return !value || value < this.price;
      },
      message: 'Discount price must be less than regular price'
    }
  },
  category: {
    type: String,
    required: [true, 'Course category is required'],
    enum: [
      'Web Development',
      'Mobile Development',
      'Data Science',
      'Machine Learning',
      'Artificial Intelligence',
      'DevOps',
      'Cloud Computing',
      'Cybersecurity',
      'UI/UX Design',
      'Digital Marketing',
      'Business',
      'Photography',
      'Music',
      'Language Learning',
      'Other'
    ]
  },
  level: {
    type: String,
    required: [true, 'Course level is required'],
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
  language: {
    type: String,
    required: [true, 'Course language is required'],
    default: 'English'
  },
  duration: {
    type: Number, // in hours
    required: [true, 'Course duration is required'],
    min: [0.5, 'Course duration must be at least 0.5 hours']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Course instructor is required']
  },
  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  requirements: [{
    type: String,
    maxlength: [200, 'Each requirement cannot exceed 200 characters']
  }],
  whatYouWillLearn: [{
    type: String,
    required: true,
    maxlength: [200, 'Each learning outcome cannot exceed 200 characters']
  }],
  tags: [{
    type: String,
    trim: true
  }],
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalEnrollments: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5']
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  certificate: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    template: String,
    criteria: {
      completionPercentage: {
        type: Number,
        default: 100,
        min: 50,
        max: 100
      },
      quizScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    }
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ averageRating: -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ instructor: 1 });

// Virtual for effective price (considering discount)
courseSchema.virtual('effectivePrice').get(function() {
  return this.discountPrice || this.price;
});

// Virtual for discount percentage
courseSchema.virtual('discountPercentage').get(function() {
  if (this.discountPrice && this.price > 0) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  return 0;
});

// Pre-save middleware to set publishedAt
courseSchema.pre('save', function(next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Ensure virtual fields are serialized
courseSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Course', courseSchema);