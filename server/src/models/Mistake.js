import mongoose from 'mongoose';

const mistakeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', index: true },
    conceptName: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', index: true },
    subjectName: { type: String, default: 'General Studies' },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', index: true },
    topicName: { type: String, default: 'Core Topics' },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
    question: { type: String, required: true },
    options: [{ type: String }],
    studentAnswer: { type: String, required: true },
    correctAnswer: { type: String, required: true },
    misconception: { type: String, required: true },
    whyChosen: { type: String, default: '' },
    conceptToRevise: { type: String, default: '' },
    miniFix: { type: String, default: '' },
    tryAgainQuestion: {
      question: String,
      options: [String],
      correctIndex: Number,
      explanation: String
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'advanced'],
      default: 'medium'
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'high'],
      default: 'moderate'
    },
    occurrences: { type: Number, default: 1 },
    lastOccurredAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['needs_revision', 'improving', 'fixed'],
      default: 'needs_revision'
    },
    retestHistory: [
      {
        retestAt: { type: Date, default: Date.now },
        isCorrect: Boolean,
        answer: String
      }
    ]
  },
  { timestamps: true }
);

mistakeSchema.index({ user: 1, status: 1 });
mistakeSchema.index({ user: 1, document: 1 });
mistakeSchema.index({ user: 1, conceptName: 1 });
mistakeSchema.index({ user: 1, lastOccurredAt: -1 });

export default mongoose.model('Mistake', mistakeSchema);

