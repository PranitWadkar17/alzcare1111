'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ParticleCanvas from "@/components/ParticleCanvas";
import { 
  UserPlus, 
  User, 
  Stethoscope, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Shield,
  Heart,
  Activity,
  ChevronLeft
} from 'lucide-react';

type LoginType = 'select' | 'patient' | 'caregiver' | 'register';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '';
  
  const { 
    sendOTP, 
    verifyOTP, 
    signInCaregiver, 
   // checkAccountLock,
    getRememberedEmail,
    setRememberEmail: setAuthRememberEmail,
    sessionExpired,        // ADD THIS
    clearSessionExpired,  // RENAMED to avoid conflict
  } = useAuth();

  const [loginType, setLoginType] = useState<LoginType>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmailState] = useState(false); // RENAMED
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Email validation function
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Load remembered email
  useEffect(() => {
    const saved = getRememberedEmail();
    if (saved) {
      setEmail(saved);
      setRememberEmailState(true);
    }
  }, []);

  // Reset OTP when email changes
  useEffect(() => {
    setOtp('');
    setOtpSent(false);
  }, [email]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
      setCountdown(60);
    }
  }, [countdown, canResend]);
    useEffect(() => {
  if (sessionExpired) {
    setError('Your session expired. Please login again.');
    clearSessionExpired();
  }
}, [sessionExpired]);

  
    const handleSendOTP = async () => {
  if (!email) {
    setError('Please enter your email');
    return;
  }

  if (!isValidEmail(email)) {
    setError('Please enter a valid email address');
    return;
  }

  setLoading(true);
  setError('');

  try {
    const result = await sendOTP(email);
    if (result.success) {
      setOtpSent(true);
      setCanResend(false);
      setCountdown(60);
      if (rememberEmail) setAuthRememberEmail(email, true);
    } else {
      setError(result.message);  // this already handles lock message from AuthContext
    }
  } catch (err: any) {
    setError(err.message || 'Failed to send OTP');
  } finally {
    setLoading(false);
  }
};


  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyOTP(email, otp);
      router.push(redirectTo || '/patient/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCaregiverLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInCaregiver(email, password);
      if (rememberEmail) setAuthRememberEmail(email, true); // FIXED: use renamed function
      router.push(redirectTo || '/caregiver/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    await handleSendOTP();
  };
  const isStrongPassword = (pwd: string): boolean => {
    return (
      pwd.length >= 12 &&
      /[A-Z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[^a-zA-Z0-9]/.test(pwd)
    );
  };
  // Animation variants - SIMPLIFIED to avoid TypeScript errors
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  } as const; // ADDED as const

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100 }
    }
  } as const; // ADDED as const

  const cardHover = {
    scale: 1.02,
    transition: { type: 'spring' as const, stiffness: 300 }
  };

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      {/* <div className="absolute inset-0 overflow-hidden"> */}
      {/* <div className="min-h-screen bg-slate-950 relative overflow-hidden">
       <AnimatedBackground /> */}
      <div className="absolute inset-0 overflow-hidden">
         <ParticleCanvas />
        {/* Gradient Orbs */}
        <motion.div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[60px_60px]" />
      </div>

      {/* Main Container */}
      <motion.div 
        className="relative z-10 w-full max-w-6xl"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-sky-400 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-white via-sky-100 to-emerald-100 bg-clip-text text-transparent">
              AlzCare
            </h1>
          </div>
          <p className="text-slate-400 text-lg">Intelligent Alzheimer&apos;s Care Ecosystem</p>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-md mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-center backdrop-blur-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selection View */}
        {loginType === 'select' && (
          <motion.div 
            variants={containerVariants}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {/* New User Card */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => { setLoginType('register'); setError(''); setOtpSent(false); }}
              className="group cursor-pointer"
            >
              <div className="h-full p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-sky-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-sky-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-sky-500/0 to-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="relative z-10 w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center"></div>
                  <div className="w-16 h-16 mb-6 rounded-2xl bg-linear-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:scale-110 transition-transform duration-300">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">New User</h3>
                  <p className="text-slate-400 mb-6">Create a new account as a patient or caregiver</p>
                  <div className="flex items-center text-sky-400 group-hover:text-sky-300 transition-colors">
                    <span className="font-medium">Register</span>
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Patient Card */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => { setLoginType('patient'); setError(''); setOtpSent(false); }}
              className="group cursor-pointer"
            >
              <div className="h-full p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-emerald-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-16 h-16 mb-6 rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">Patient</h3>
                  <p className="text-slate-400 mb-6">Simple OTP login - no password needed</p>
                  <div className="flex items-center text-emerald-400 group-hover:text-emerald-300 transition-colors">
                    <span className="font-medium">Login with OTP</span>
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Caregiver Card */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              onClick={() => { setLoginType('caregiver'); setError(''); setOtpSent(false); }}
              className="group cursor-pointer"
            >
              <div className="h-full p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-violet-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-violet-500/0 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-16 h-16 mb-6 rounded-2xl bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform duration-300">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">Caregiver</h3>
                  <p className="text-slate-400 mb-6">Secure login with password protection</p>
                  <div className="flex items-center text-violet-400 group-hover:text-violet-300 transition-colors">
                    <span className="font-medium">Login with Password</span>
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Patient Login Form */}
        <AnimatePresence mode="wait">
          {loginType === 'patient' && (
            <motion.div
              key="patient"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                <button 
                  onClick={() => { 
                  setLoginType('select'); 
                   setOtpSent(false); 
                     setError(''); // Optional - remove if you want to keep email
                }}
                  className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2">Patient Login</h2>
                  <p className="text-slate-400">Enter your email to receive OTP</p>
                </div>

                {!otpSent ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="patient@example.com"
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all"
                        />
                      </div>
                    </div>

                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmailState(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400/20"
                      />
                      <span className="ml-2 text-sm text-slate-400">Remember my email</span>
                    </label>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSendOTP}
                      disabled={loading}
                      className="w-full py-4 bg-linear-to-r from-emerald-400 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Send OTP
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <p className="text-emerald-300 text-sm text-center">
                        OTP sent to <span className="font-semibold">{email}</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Enter 6-digit OTP</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl tracking-widest placeholder-slate-600 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all"
                      />
                      {otp.length === 6 && (
                        <p className="text-emerald-400 text-sm mt-2 text-center">✓ Ready to verify</p>
                      )}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleVerifyOTP}
                      disabled={loading || otp.length !== 6}
                      className="w-full py-4 bg-linear-to-r from-emerald-400 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                      ) : (
                        'Verify & Login'
                      )}
                    </motion.button>

                    <div className="text-center">
                      <button
                        onClick={handleResendOTP}
                        disabled={!canResend}
                        className="text-sm text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        {canResend ? 'Resend OTP' : `Resend in ${countdown}s`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Caregiver Login Form */}
          {loginType === 'caregiver' && (
            <motion.div
              key="caregiver"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                <button 
                  onClick={() => { 
                    setLoginType('select'); 
                    setError('');
                    setPassword('');
                    setEmail(''); // Optional - remove if you want to keep email
                  }}
                  className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2">Caregiver Login</h2>
                  <p className="text-slate-400">Secure access for healthcare providers</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="caregiver@hospital.com"
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                   {password && password.length > 0 && (
                      <div className="mt-2">
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              password.length < 8
                                ? 'w-1/3 bg-red-500'
                                : password.length >= 8 && !isStrongPassword(password)
                                ? 'w-2/3 bg-yellow-500'
                                : 'w-full bg-emerald-500'
                            }`}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {password.length < 8
                            ? 'Weak — min 8 characters'
                            : !isStrongPassword(password)
                            ? 'Good — add uppercase, number & symbol for strong'
                            : 'Strong password'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmailState(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-400/20"
                      />
                      <span className="ml-2 text-sm text-slate-400">Remember me</span>
                    </label>
                    <Link href="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                      Forgot password?
                    </Link>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCaregiverLogin}
                    disabled={loading}
                    className="w-full py-4 bg-linear-to-r from-violet-400 to-violet-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Secure Login
                        <Shield className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Register Redirect */}
          {loginType === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-sky-400 to-sky-600 flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-4">Create Account</h2>
                <p className="text-slate-400 mb-8">Choose your account type to get started</p>
                
                <div className="space-y-4">
                  <Link href="/register?role=patient">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-4 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-3"
                    >
                      <User className="w-6 h-6 text-emerald-400" />
                      <span className="text-emerald-300 font-medium">Register as Patient</span>
                    </motion.div>
                  </Link>
                  
                  <Link href="/register?role=caregiver">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-all cursor-pointer flex items-center justify-center gap-3"
                    >
                      <Stethoscope className="w-6 h-6 text-violet-400" />
                      <span className="text-violet-300 font-medium">Register as Caregiver</span>
                    </motion.div>
                  </Link>
                </div>

                <button 
                  onClick={() => { 
                    setLoginType('select');
                    setError('');
                  }}
                  className="mt-6 text-slate-400 hover:text-white transition-colors"
                >
                  Back to login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>Real-time Monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>24/7 Support</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
      <LoginPageInner />
    </Suspense>
  );
}