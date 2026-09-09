import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  subscription: {
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid', 'none'],
      default: 'none'
    },
    stripeCustomerId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null, index: true },
    stripePriceId: { type: String, default: null },
    billingInterval: { type: String, enum: ['monthly', 'yearly', null], default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false }
  },
  usage: {
    documentsThisMonth: { type: Number, default: 0 },
    aiCoachRequestsThisMonth: { type: Number, default: 0 },
    lastUsageReset: { type: Date, default: Date.now }
  },
  isVerified: { type: Boolean, default: false },

  // OTP Verification Fields
  otpHash: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  otpLastSentAt: { type: Date, default: null },

  // Extended Profile Fields
  fullName: { type: String, default: '', trim: true },
  dob: { type: Date, default: null },
  educationLevel: {
    type: String,
    enum: ['High School', 'Undergraduate', 'Graduate', 'Postgraduate', 'Other', ''],
    default: ''
  },
  institution: { type: String, default: '', trim: true },

  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('plan').get(function () {
  if (this.isPremium()) return 'pro';
  return 'free';
}).set(function (val) {
  if (!this.subscription) this.subscription = {};
  if (val === 'pro' || val === 'premium') {
    this.subscription.plan = 'premium';
    this.subscription.status = 'active';
  } else {
    this.subscription.plan = 'free';
  }
});


userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.isPremium = function () {
  const plan = this.subscription?.plan;
  if (plan !== 'premium' && plan !== 'pro') return false;
  const status = this.subscription?.status;
  if (!['active', 'trialing'].includes(status)) return false;

  // If period end is recorded, ensure it hasn't expired with a 24h grace window
  if (this.subscription.currentPeriodEnd) {
    const expiresAt = new Date(this.subscription.currentPeriodEnd).getTime();
    if (expiresAt + 24 * 60 * 60 * 1000 < Date.now()) {
      return false;
    }
  }
  return true;
};

userSchema.methods.checkAndResetUsage = function () {
  const now = new Date();
  const lastReset = this.usage?.lastUsageReset ? new Date(this.usage.lastUsageReset) : new Date(0);

  const isDifferentMonth =
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth();

  if (isDifferentMonth) {
    this.usage = {
      documentsThisMonth: 0,
      aiCoachRequestsThisMonth: 0,
      lastUsageReset: now
    };
  }
};

export default mongoose.model('User', userSchema);
