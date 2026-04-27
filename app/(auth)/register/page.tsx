'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Stethoscope,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
  Heart,
  Shield,
  CheckCircle,
} from 'lucide-react';

type RegisterStep = 'form' | 'otp' | 'success';
type RoleType = 'patient' | 'caregiver';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const { sendOTP, verifyOTP, signUpCaregiver } = useAuth();

  // Validate role from URL
  const role: RoleType | null =
    roleParam === 'patient' || roleParam === 'caregiver' ? roleParam : null;

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP state
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // UI state
  const [step, setStep] = useState<RegisterStep>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if invalid role
  useEffect(() => {
    if (!role) {
      router.push('/login');
    }
  }, [role]);

  // OTP countdown timer
  useEffect(() => {
    if (step !== 'otp') return;
    if (canResend) return;
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, canResend, step]);

  // Auto redirect after success
  useEffect(() => {
    if (step !== 'success') return;
    const timer = setTimeout(() => {
      router.push(role === 'patient' ? '/patient/dashboard' : '/caregiver/dashboard');
    }, 2000);
    return () => clearTimeout(timer);
  }, [step, role]);

  // Validation helpers — same pattern as login page
  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const isValidPhone = (val: string) =>
    /^[0-9]{10}$/.test(val.replace(/\s/g, ''));

  const isStrongPassword = (pwd: string) =>
    pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);

  // Validate all fields before submit
  const validateForm = (): string | null => {
    if (!name.trim()) return 'Full name is required';
    if (!email.trim()) return 'Email is required';
    if (!isValidEmail(email)) return 'Please enter a valid email address';
    if (!phone.trim()) return 'Phone number is required';
    if (!isValidPhone(phone)) return 'Phone must be exactly 10 digits';
    if (role === 'caregiver') {
      if (!password) return 'Password is required';
      if (!isStrongPassword(password))
        return 'Password needs 8+ characters, one uppercase letter and one number';
      if (password !== confirmPassword) return 'Passwords do not match';
    }
    return null;
  };

  // Handle form submission
  const handleSubmit = async () => {
    setError('');
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (role === 'patient') {
        const result = await sendOTP(email, true);
        if (result.success) {
          setStep('otp');
          setCountdown(60);
          setCanResend(false);
        } else {
          setError(result.message);
        }
      } else {
        await signUpCaregiver({
          email,
          name,
          role: 'caregiver_primary',
          phone,
          password,
          patient_email: patientEmail.trim() || undefined,
        });
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Pass name and phone so AuthContext creates the profile row
      await verifyOTP(email, otp, { name, phone });
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP resend
  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    setError('');
    try {
      const result = await sendOTP(email);
      if (result.success) {
        setCountdown(60);
        setCanResend(false);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Animation variants — same as login page
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  } as const;

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100 },
    },
  } as const;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">

      {/* Animated background — identical to login page */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], x: [0, -30, 0], y: [0, -50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-3xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Logo — same as login page */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-sky-100 to-emerald-100 bg-clip-text text-transparent">
              AlzCare
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            {role === 'patient'
              ? 'Create your patient account'
              : 'Create your caregiver account'}
          </p>
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center backdrop-blur-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ── STEP 1 — Form ── */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10"
            >
              {/* Back to login */}
              <Link
                href="/login"
                className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to login
              </Link>

              {/* Role icon */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  role === 'patient'
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25'
                    : 'bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg shadow-violet-500/25'
                }`}>
                  {role === 'patient'
                    ? <User className="w-6 h-6 text-white" />
                    : <Stethoscope className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {role === 'patient' ? 'Patient Registration' : 'Caregiver Registration'}
                  </h2>
                  <p className="text-slate-400 text-xs">
                    {role === 'patient'
                      ? 'OTP will be sent to your email'
                      : 'Secure password account'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all text-sm"
                    />
                  </div>
                  {phone.length > 0 && phone.length < 10 && (
                    <p className="text-red-400 text-xs mt-1">{10 - phone.length} more digits needed</p>
                  )}
                  {phone.length === 10 && (
                    <p className="text-emerald-400 text-xs mt-1">✓ Valid phone number</p>
                  )}
                </div>

                {/* Caregiver only fields */}
                {role === 'caregiver' && (
                  <>
                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Min 8 chars, uppercase & number"
                          className="w-full pl-11 pr-11 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showPassword
                            ? <EyeOff className="w-4 h-4" />
                            : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {password.length > 0 && (
                        <div className="mt-2">
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-300 ${
                              password.length < 8
                                ? 'w-1/3 bg-red-500'
                                : !isStrongPassword(password)
                                ? 'w-2/3 bg-yellow-500'
                                : 'w-full bg-emerald-500'
                            }`} />
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {password.length < 8
                              ? 'Weak — min 8 characters'
                              : !isStrongPassword(password)
                              ? 'Good — add uppercase and number for strong'
                              : 'Strong password'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Repeat your password"
                          className="w-full pl-11 pr-11 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showConfirmPassword
                            ? <EyeOff className="w-4 h-4" />
                            : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && password !== confirmPassword && (
                        <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                      )}
                      {confirmPassword.length > 0 && password === confirmPassword && (
                        <p className="text-emerald-400 text-xs mt-1">✓ Passwords match</p>
                      )}
                    </div>

                    {/* Patient email to link */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Patient Email to Link
                        <span className="ml-2 text-xs text-slate-500 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={patientEmail}
                          onChange={e => setPatientEmail(e.target.value)}
                          placeholder="patient@example.com"
                          className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all text-sm"
                        />
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        Link your account to an existing patient
                      </p>
                    </div>
                  </>
                )}

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`w-full py-4 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 ${
                    role === 'patient'
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-violet-400 to-violet-600 hover:shadow-lg hover:shadow-violet-500/25'
                  }`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {role === 'patient' ? 'Send OTP' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                {/* Already have account */}
                <p className="text-center text-sm text-slate-400 pt-1">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>

              </div>
            </motion.div>
          )}

          {/* ── STEP 2 — OTP (Patient only) ── */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10"
            >
              <button
                onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </button>

              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
                <p className="text-slate-400 text-sm">We sent a 6-digit code to</p>
                <p className="text-emerald-400 text-sm font-medium mt-1">{email}</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl tracking-widest placeholder-slate-600 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all"
                  />
                  {otp.length === 6 && (
                    <p className="text-emerald-400 text-xs mt-1.5 text-center">✓ Ready to verify</p>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-emerald-400 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify & Create Account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                <div className="text-center">
                  <button
                    onClick={handleResend}
                    disabled={!canResend || loading}
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {canResend ? 'Resend code' : `Resend in ${countdown}s`}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3 — Success ── */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-white mb-2">Account Created!</h2>
              <p className="text-slate-400 text-sm mb-1">
                Welcome to AlzCare, {name}.
              </p>
              <p className="text-slate-500 text-xs">
                Redirecting you to your dashboard...
              </p>
              <div className="mt-6 flex justify-center">
                <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Footer badges — same as login page */}
        <motion.div variants={itemVariants} className="mt-8 text-center">
          <div className="flex items-center justify-center gap-5 text-slate-500 text-xs">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              <span>Secure & Private</span>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}