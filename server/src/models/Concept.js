import mongoose from 'mongoose';

const conceptSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    description: { type: String, default: '' },
    definition: { type: String, default: '' },
    keyTakeaway: { type: String, default: '' },
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concept' }],
    prerequisiteNames: [{ type: String, trim: true }],
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'advanced'],
      default: 'medium'
    },
    importance: {
      type: String,
      enum: ['core', 'supporting', 'advanced'],
      default: 'core'
    }
  },
  { timestamps: true }
);

conceptSchema.index({ owner: 1, topic: 1, name: 1 }, { unique: true });

export default mongoose.model('Concept', conceptSchema);

