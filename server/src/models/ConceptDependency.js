import mongoose from 'mongoose';

const conceptDependencySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true, index: true },
    prerequisite: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true, index: true },
    relationshipType: {
      type: String,
      enum: ['requires', 'extends', 'applies', 'related_to'],
      default: 'requires'
    },
    strength: { type: Number, min: 0, max: 1, default: 0.8 }
  },
  { timestamps: true }
);

conceptDependencySchema.index({ owner: 1, concept: 1, prerequisite: 1 }, { unique: true });

export default mongoose.model('ConceptDependency', conceptDependencySchema);

