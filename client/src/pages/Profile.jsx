import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  GraduationCap,
  Building2,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Crown,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

const EDUCATION_LEVELS = [
  'High School',
  'Undergraduate',
  'Graduate',
  'Postgraduate',
  'Other'
];

export default function Profile() {
  const { user, token, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [dob, setDob] = useState(user?.dob || '');
  const [educationLevel, setEducationLevel] = useState(user?.educationLevel || 'Undergraduate');
  const [institution, setInstitution] = useState(user?.institution || '');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync state if user updates
  useEffect(() => {
    if (user) {
      if (user.fullName !== undefined) setFullName(user.fullName);
      if (user.dob !== undefined) setDob(user.dob || '');
      if (user.educationLevel !== undefined) setEducationLevel(user.educationLevel || 'Undergraduate');
      if (user.institution !== undefined) setInstitution(user.institution || '');
    }
  }, [user]);

  function validate() {
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      return 'Full name must be between 2 and 60 characters';
    }
    if (/^\d+$/.test(trimmedName)) {
      return 'Full name cannot be purely numeric';
    }

    if (!dob) {
      return 'Date of birth is required';
    }
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      return 'Please enter a valid date of birth';
    }
    const today = new Date();
    if (birthDate >= today) {
      return 'Date of birth must be in the past';
    }
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 13) {
      return 'You must be at least 13 years old to use StudyDeck';
    }
    if (age > 120) {
      return 'Please enter a valid date of birth';
    }

    if (!EDUCATION_LEVELS.includes(educationLevel)) {
      return 'Please select a valid education level';
    }

    if (institution && institution.trim().length > 120) {
      return 'Institution name cannot exceed 120 characters';
    }

    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await api.updateProfile(token, {
        fullName: fullName.trim(),
        dob,
        educationLevel,
        institution: institution.trim()
      });
      await refreshUser();
      setSuccessMsg('Profile details saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  const isPro = user?.subscription?.isPremium || user?.subscription?.plan === 'premium';

  return (
    <div className="max-w-3xl mx-auto py-4 px-2">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <User className="text-amber-400" size={24} /> Account Profile
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Manage your personal student details and academic background.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck size={14} /> Verified
            </span>
            {isPro && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Crown size={14} /> PRO
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profile Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel rounded-2xl p-7 border border-white/10 shadow-2xl space-y-6"
      >
        {/* Account Info Banner */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shrink-0">
            <div className="w-full h-full bg-[#0d1017] rounded-full flex items-center justify-center text-amber-300 font-bold text-base">
              {(fullName || user?.email || 'U').slice(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="truncate">
            <div className="text-sm font-semibold text-slate-200 truncate">
              {fullName || 'Student Profile'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <Mail size={12} className="text-amber-400/80" />
              <span>{user?.email}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User size={13} className="text-amber-400" /> Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={60}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">Between 2 and 60 characters, non-numeric.</p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-amber-400" /> Date of Birth <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none [color-scheme:dark]"
            />
            <p className="text-[11px] text-slate-500 mt-1">Must be at least 13 years old.</p>
          </div>

          {/* Education Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <GraduationCap size={13} className="text-amber-400" /> Education Level <span className="text-rose-400">*</span>
            </label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-[#0e121a] text-slate-200"
            >
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level} className="bg-[#0e121a] text-slate-200">
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Institution */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 size={13} className="text-amber-400" /> Institution / University / School (Optional)
            </label>
            <input
              type="text"
              maxLength={120}
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Stanford University or Lincoln High School"
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">Maximum 120 characters.</p>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-gold px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
            >
              <Save size={15} />
              {loading ? 'Saving Changes…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

