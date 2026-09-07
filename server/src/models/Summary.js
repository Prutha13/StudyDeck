import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema(
  {
    // unique: true guarantees at most one Summary per Document at the DB level,
    // so a race between the background job and any other writer can no longer
    // produce duplicate/competing summaries for the same document.
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, unique: true },
    summary: String,
    actionItems: [{ task: String, owner: String, dueDate: String }],
    quiz: [{ question: String, options: [String], correctIndex: Number }],
    flashcards: [{ front: String, back: String }],
    modelUsed: String,
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true } // adds real createdAt/updatedAt so sort-by-recency actually works
);

export default mongoose.model('Summary', summarySchema);