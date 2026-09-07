import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  rawText: { type: String, required: true },      // extracted plain text, regardless of source format
  sourceType: { type: String, enum: ['pasted', 'pdf', 'docx', 'txt'], default: 'pasted' },
  originalFileName: String,
  quizCount: { type: Number, default: 5 },
  status: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
  error: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Document', documentSchema);
