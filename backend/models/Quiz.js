import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required']
  },
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'short-answer', 'essay'],
    required: [true, 'Question type is required']
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: String, // for short-answer and essay questions
  explanation: String,
  points: {
    type: Number,
    default: 1,
    min: [0, 'Points cannot be negative']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true
  },
  description: String,
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor reference is required']
  },
  questions: [questionSchema],
  settings: {
    timeLimit: {
      type: Number, // in minutes
      min: [1, 'Time limit must be at least 1 minute']
    },
    attempts: {
      type: Number,
      default: 1,
      min: [1, 'Must allow at least 1 attempt']
    },
    passingScore: {
      type: Number,
      default: 70,
      min: [0, 'Passing score cannot be negative'],
      max: [100, 'Passing score cannot exceed 100']
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    showResults: {
      type: String,
      enum: ['immediately', 'after-submission', 'after-due-date', 'never'],
      default: 'immediately'
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    questionsPerAttempt: Number // for randomized quizzes
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  dueDate: Date,
  availableFrom: Date,
  availableUntil: Date,
  totalPoints: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total points before saving
quizSchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((total, question) => total + question.points, 0);
  next();
});

const attemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, 'Quiz reference is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    answer: mongoose.Schema.Types.Mixed, // Can be string, array, or object
    isCorrect: Boolean,
    pointsEarned: {
      type: Number,
      default: 0
    },
    timeSpent: Number // in seconds
  }],
  score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: Date,
  timeSpent: Number, // in seconds
  attemptNumber: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'auto-submitted', 'abandoned'],
    default: 'in-progress'
  },
  feedback: String // instructor feedback
}, {
  timestamps: true
});

// Calculate score and percentage before saving attempt
attemptSchema.pre('save', function(next) {
  if (this.answers && this.answers.length > 0) {
    this.score = this.answers.reduce((total, answer) => total + (answer.pointsEarned || 0), 0);
    
    // Get total possible points from the quiz
    this.populate('quiz', 'totalPoints settings.passingScore')
      .then(() => {
        if (this.quiz.totalPoints > 0) {
          this.percentage = Math.round((this.score / this.quiz.totalPoints) * 100);
          this.isPassed = this.percentage >= this.quiz.settings.passingScore;
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

// Indexes
quizSchema.index({ course: 1 });
quizSchema.index({ lesson: 1 });
quizSchema.index({ instructor: 1 });

attemptSchema.index({ quiz: 1, student: 1 });
attemptSchema.index({ student: 1, submittedAt: -1 });

const Quiz = mongoose.model('Quiz', quizSchema);
const QuizAttempt = mongoose.model('QuizAttempt', attemptSchema);

export { Quiz, QuizAttempt };