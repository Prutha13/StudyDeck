import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Document from '../models/Document.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { sendOtpEmail } from '../services/email.service.js';

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function sanitizeUser(user) {
  return {
    id: user._id,
    email: user.email,
    isVerified: Boolean(user.isVerified),
    fullName: user.fullName || '',
    dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
    educationLevel: user.educationLevel || '',
    institution: user.institution || '',
    plan: user.plan,
    subscription: {
      plan: user.subscription?.plan || 'free',
      status: user.subscription?.status || 'none',
      billingInterval: user.subscription?.billingInterval || null,
      currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(user.subscription?.cancelAtPeriodEnd),
      isPremium: user.isPremium?.() ?? false
    },
    usage: user.usage
  };
}

export async function register(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP and hash it
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      isVerified: false,
      otpHash,
      otpExpiresAt,
      otpLastSentAt: new Date()
    });

    // Send verification email
    await sendOtpEmail({ to: user.email, otp });

    res.status(201).json({
      message: 'Registration successful. A 6-digit verification code has been sent to your email.',
      requiresVerification: true,
      email: user.email
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email. Please click "Create one" below to register.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Gating check for unverified email
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email
      });
    }

    res.json({
      token: signToken(user._id),
      user: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
}

export async function sendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Account is already verified.', isVerified: true });
    }

    // Rate-limiting: 60s cooldown
    if (user.otpLastSentAt) {
      const elapsed = Date.now() - new Date(user.otpLastSentAt).getTime();
      if (elapsed < 60 * 1000) {
        const retryAfter = Math.ceil((60 * 1000 - elapsed) / 1000);
        return res.status(429).json({
          error: `Please wait ${retryAfter} seconds before requesting a new code.`,
          retryAfter
        });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpHash = await bcrypt.hash(otp, 10);
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otpLastSentAt = new Date();
    await user.save();

    await sendOtpEmail({ to: user.email, otp });

    res.json({
      message: 'Verification code sent to your email.',
      email: user.email,
      expiresIn: 600
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to send verification code' });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.json({
        message: 'Email already verified.',
        token: signToken(user._id),
        user: sanitizeUser(user)
      });
    }

    if (!user.otpHash || !user.otpExpiresAt || new Date(user.otpExpiresAt) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), user.otpHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    user.isVerified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({
      message: 'Email verified successfully!',
      token: signToken(user._id),
      user: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to verify code' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { fullName, dob, educationLevel, institution } = req.body;

    // 1. fullName validation (required, 2-60 chars, reject purely numeric)
    if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 60) {
      return res.status(400).json({ error: 'Full name must be between 2 and 60 characters' });
    }
    if (/^\d+$/.test(fullName.trim())) {
      return res.status(400).json({ error: 'Full name cannot be purely numeric' });
    }

    // 2. dob validation (valid past date, age >= 13, age <= 120)
    if (!dob) {
      return res.status(400).json({ error: 'Date of birth is required' });
    }
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: 'Please enter a valid date of birth' });
    }
    const today = new Date();
    if (birthDate >= today) {
      return res.status(400).json({ error: 'Date of birth must be in the past' });
    }
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 13) {
      return res.status(400).json({ error: 'You must be at least 13 years old to use StudyDeck' });
    }
    if (age > 120) {
      return res.status(400).json({ error: 'Please enter a valid date of birth' });
    }

    // 3. educationLevel validation (enum)
    const ALLOWED_EDUCATION = ['High School', 'Undergraduate', 'Graduate', 'Postgraduate', 'Other'];
    if (!educationLevel || !ALLOWED_EDUCATION.includes(educationLevel)) {
      return res.status(400).json({
        error: `Education level must be one of: ${ALLOWED_EDUCATION.join(', ')}`
      });
    }

    // 4. institution validation (optional, max 120 chars)
    if (institution && (typeof institution !== 'string' || institution.trim().length > 120)) {
      return res.status(400).json({ error: 'Institution name cannot exceed 120 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.fullName = fullName.trim();
    user.dob = birthDate;
    user.educationLevel = educationLevel;
    user.institution = (institution || '').trim();
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function computeStreak(completedAtDates) {
  const days = new Set(completedAtDates.map(dayKey));
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  // Streak can still count if the latest session was yesterday.
  if (!days.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });

    user.checkAndResetUsage();
    await user.save();

    const [documents, attempts] = await Promise.all([
      Document.countDocuments({ owner: req.user.id }),
      QuizAttempt.find({ user: req.user.id }).select('completedAt').lean()
    ]);

    res.json({
      user: sanitizeUser(user),
      stats: {
        documents,
        completedSessions: attempts.length,
        streak: computeStreak(attempts.map((a) => a.completedAt))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load profile' });
  }
}
