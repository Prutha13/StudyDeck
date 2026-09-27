import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Document from '../models/Document.js';
import QuizAttempt from '../models/QuizAttempt.js';

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
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      isVerified: true
    });

    res.status(201).json({
      message: 'Registration successful',
      token: signToken(user._id),
      user: sanitizeUser(user)
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

    res.json({
      token: signToken(user._id),
      user: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed' });
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
