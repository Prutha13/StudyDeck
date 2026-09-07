import mongoose from 'mongoose';

const stripeEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  type: { type: String, required: true },
  processedAt: { type: Date, default: Date.now, expires: '30d' } // Automatically clean up after 30 days
});

export default mongoose.model('StripeEvent', stripeEventSchema);

