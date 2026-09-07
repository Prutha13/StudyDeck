import mongoose from 'mongoose';

const masterySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true, index: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    score: { type: Number, default: 0, min: 0, max: 100 }, // 0 to 100 percentage
    status: {
      type: String,
      enum: ['unseen', 'learning', 'struggling', 'improving', 'mastered'],
      default: 'unseen'
    },
    attempts: { type: Number, default: 0 },
    correctAttempts: { type: Number, default: 0 },
    incorrectAttempts: { type: Number, default: 0 },
    consecutiveCorrect: { type: Number, default: 0 },
    lastAttemptScore: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: Date.now },
    lastReviewedAt: { type: Date, default: Date.now },
    nextReviewDue: { type: Date, default: Date.now },
    difficultyFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 1 },
    history: [
      {
        attemptAt: { type: Date, default: Date.now },
        isCorrect: { type: Boolean, required: true },
        scoreDelta: Number,
        source: { type: String, enum: ['quiz', 'flashcard', 'viva', 'retest', 'fix_weakness'], default: 'quiz' }
      }
    ]
  },
  { timestamps: true }
);

masterySchema.index({ user: 1, concept: 1 }, { unique: true });
masterySchema.index({ user: 1, document: 1 });
masterySchema.index({ user: 1, status: 1 });
masterySchema.index({ user: 1, nextReviewDue: 1 });

export default mongoose.model('Mastery', masterySchema);

