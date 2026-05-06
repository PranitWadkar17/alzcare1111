'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { UserRole, Profile, AuthState, RegisterData } from '@/types';

interface AuthContextType extends AuthState {
  // Patient OTP flow
  sendOTP: (email: string, isRegistration?: boolean) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (email: string, token: string, userData?: { name: string; phone: string }) => Promise<void>;
  //resendOTP: (email: string) => Promise<{ success: boolean; message: string }>;
  isAuthenticated: boolean;
  // Caregiver password flow
  signUpCaregiver: (data: RegisterData) => Promise<void>;
  signInCaregiver: (email: string, password: string) => Promise<void>;

  // 2FA
  verify2FA: (email: string, token: string) => Promise<void>;

  // Common
  signOut: () => Promise<void>;
  checkAccountLock: (email: string) => Promise<{ locked: boolean; until?: string }>;

  // Session management
  updateLastActivity: () => void;

  // Remember email
  getRememberedEmail: () => string | null;
  setRememberEmail: (email: string, remember: boolean) => void;
  sessionExpired: boolean;          // ADD THIS
  clearSessionExpired: () => void;
  pendingUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_LOGIN_ATTEMPTS = 3;
const LOCK_DURATION_MINUTES = 15;
const SESSION_TIMEOUT_MINUTES = 30;
// const OTP_RESEND_COOLDOWN = 60;

export function AuthProvider({ children }: { children: ReactNode }) {
  // ADD THIS as first line inside the function
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // State
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  // const [canResendOTP, setCanResendOTP] = useState(false);
  // const [otpCountdown, setOtpCountdown] = useState(OTP_RESEND_COOLDOWN);

  // Computed
  const isAuthenticated = !!user && !!profile;

  // Initialize auth state
  useEffect(() => {
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        clearAuthState();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Session timeout check
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;

      if (inactiveTime > timeoutMs) {
        signOut();
        setSessionExpired(true);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity]);

  // Activity tracking
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [isAuthenticated]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const profileFound = await fetchProfile(session.user.id);
        if (profileFound) {
          setUser(session.user);
        } else {
          // Stale session with no matching profile — clean it up
          console.warn('Stale session detected (no profile). Signing out.');
          await supabase.auth.signOut();
          clearAuthState();
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string): Promise<boolean> => {
    try {
      // Step 1: Try to find profile by auth user ID
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      let profileRow = data;

      // Step 2: If not found by ID, try by email (handles ID mismatch permanently)
      if (error || !data) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          const { data: emailProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', authUser.email)
            .single();

          if (emailProfile) {
            // Found by email! Fix the ID mismatch permanently in the database
            console.log('[Auth] Healing profile ID mismatch:', emailProfile.id, '→', userId);
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ id: userId, updated_at: new Date().toISOString() })
              .eq('email', authUser.email);

            if (!updateError) {
              profileRow = { ...emailProfile, id: userId };
            } else {
              console.error('[Auth] Failed to heal profile ID:', updateError.message);
              return false;
            }
          }
        }
      }

      if (profileRow) {
        const profileData: Profile = {
          id: profileRow.id,
          email: profileRow.email,
          name: profileRow.name,
          role: profileRow.role as UserRole,
          phone: profileRow.phone,
          emergency_contact_name: profileRow.emergency_contact_name,
          emergency_contact_phone: profileRow.emergency_contact_phone,
          password_hint: profileRow.password_hint,
          two_factor_enabled: profileRow.two_factor_enabled,
          two_factor_secret: profileRow.two_factor_secret,
          last_login_at: profileRow.last_login_at,
          login_attempts: profileRow.login_attempts || 0,
          locked_until: profileRow.locked_until,
          remember_token: profileRow.remember_token,
          avatar_url: profileRow.avatar_url,
          language: profileRow.language || 'en',
          created_at: profileRow.created_at,
          updated_at: profileRow.updated_at,
        };

        setProfile(profileData);
        setRole(profileData.role);

        // Update last login
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Fetch profile error:', error);
      return false;
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setProfile(null);
    setRole(null);
    setLoading(false);
    setPendingUser(null);
  };

  // Check if account is locked
  const checkAccountLock = async (email: string): Promise<{ locked: boolean; until?: string }> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('locked_until, login_attempts')
        .eq('email', email)
        .single();

      if (error || !data) return { locked: false };

      if (data.locked_until) {
        const lockedUntil = new Date(data.locked_until);
        if (lockedUntil > new Date()) {
          return { locked: true, until: data.locked_until };
        }
      }

      return { locked: false };
    } catch (error) {
      return { locked: false };
    }
  };

  // Increment login attempts
  const incrementLoginAttempts = async (email: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('login_attempts')
        .eq('email', email)
        .single();

      const newAttempts = (data?.login_attempts || 0) + 1;

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_DURATION_MINUTES);

        await supabase
          .from('profiles')
          .update({
            login_attempts: newAttempts,
            locked_until: lockedUntil.toISOString()
          })
          .eq('email', email);
      } else {
        await supabase
          .from('profiles')
          .update({ login_attempts: newAttempts })
          .eq('email', email);
      }
    } catch (error) {
      console.error('Increment login attempts error:', error);
    }
  };

  // Reset login attempts
  const resetLoginAttempts = async (email: string) => {
    try {
      await supabase
        .from('profiles')
        .update({
          login_attempts: 0,
          locked_until: null
        })
        .eq('email', email);
    } catch (error) {
      console.error('Reset login attempts error:', error);
    }
  };

  // PATIENT: Send OTP
  const sendOTP = async (email: string, isRegistration: boolean = false): Promise<{ success: boolean; message: string }> => {
    try {
      // Clear any existing session first (prevents caregiver session from interfering)
      try { await supabase.auth.signOut(); clearAuthState(); } catch {}

      // Check if account is locked
      const lockStatus = await checkAccountLock(email);
      if (lockStatus.locked) {
        return {
          success: false,
          message: `Account locked. Try again after ${new Date(lockStatus.until!).toLocaleTimeString()}`
        };
      }

      // Check if user exists and is patient
      if (isRegistration) {
        // REGISTRATION — check email is NOT already taken
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', email)
          .single();

        if (existingProfile) {
          return { success: false, message: 'This email is already registered. Please login instead.' };
        }
      } else {
        // LOGIN — check email EXISTS and is a patient
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', email)
          .single();

        if (error || !profile) {
          return { success: false, message: 'Email not registered. Please register first.' };
        }

        if (profile.role !== 'patient') {
          return { success: false, message: 'This email is registered as a caregiver. Use caregiver login.' };
        }
      }

      // Send OTP via Supabase
      // Send OTP via Supabase
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: isRegistration ? true : false,
          emailRedirectTo: undefined,
        },
      });

      if (otpError) throw otpError;

      // Start countdown
      // setCanResendOTP(false);
      // setOtpCountdown(OTP_RESEND_COOLDOWN);

      return { success: true, message: 'OTP sent to your email.' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to send OTP.' };
    }
  };

  // PATIENT: Verify OTP
  const verifyOTP = async (email: string, token: string, userData?: { name: string; phone: string }) => {
    try {
      let data, error;
      try {
        const result = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        data = result.data;
        error = result.error;
      } catch (fetchErr: any) {
        throw new Error('Network error verifying OTP. The code may have expired — please request a new OTP.');
      }

      if (error) {
        await incrementLoginAttempts(email);
        throw error;
      }

      if (data.user) {
        // Check if profile exists — query by EMAIL (reliable) not by ID (can mismatch)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .single();

        // LOGIN PATH — profile must already exist
        if (!existingProfile && !userData) {
          await supabase.auth.signOut();
          throw new Error('No account found for this email. Please register first.');
        }

        // REGISTER PATH — create profile with provided userData
        if (!existingProfile && userData) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email,
              name: userData.name,
              role: 'patient',
              phone: userData.phone,
              two_factor_enabled: false,
              login_attempts: 0,
              language: 'en',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (profileError) {
            await supabase.auth.signOut();
            throw profileError;
          }
        }

        // If profile ID doesn't match auth user ID, fix it permanently
        if (existingProfile && existingProfile.id !== data.user.id) {
          await supabase
            .from('profiles')
            .update({ id: data.user.id, updated_at: new Date().toISOString() })
            .eq('email', email);
        }

        // Complete login
        await resetLoginAttempts(email);
        setUser(data.user);
        await fetchProfile(data.user.id);
        await sendLoginNotification(email);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Invalid OTP.');
    }
  };

  // PATIENT: Resend OTP
  // const resendOTP = async (email: string): Promise<{ success: boolean; message: string }> => {
  //   if (!canResendOTP) {
  //     return { success: false, message: `Please wait ${otpCountdown} seconds.` };
  //   }
  //   return sendOTP(email);
  // };

  // CAREGIVER: Sign up
  const signUpCaregiver = async (data: RegisterData) => {
    try {
      // Create auth user with password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password!,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create caregiver profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            name: data.name,
            role: data.role,
            phone: data.phone,
            two_factor_enabled: false,
            login_attempts: 0,
            language: 'en',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (profileError) throw profileError;

        // Link to patient if provided
        if (data.patient_email) {
          const { data: patient } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', data.patient_email)
            .eq('role', 'patient')
            .single();

          if (patient) {
            await supabase
              .from('patient_caregiver_links')
              .insert({
                patient_id: patient.id,
                caregiver_id: authData.user.id,
                relationship: data.role === 'caregiver_primary' ? 'primary' : 'secondary',
                status: 'active',
                invited_by: 'caregiver',
                permissions: {
                  view_meds: true,
                  edit_meds: data.role === 'caregiver_primary',
                  view_location: true,
                  edit_notes: data.role === 'caregiver_primary',
                  view_tasks: true,
                  edit_tasks: data.role === 'caregiver_primary',
                  trigger_sos: true,
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
          }
        }

        // Update state
        setUser(authData.user);
        await fetchProfile(authData.user.id);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create account.');
    }
  };

  // CAREGIVER: Sign in
  const signInCaregiver = async (email: string, password: string) => {
    try {
      // Check if account is locked
      const lockStatus = await checkAccountLock(email);
      if (lockStatus.locked) {
        throw new Error(`Account locked. Try again after ${new Date(lockStatus.until!).toLocaleTimeString()}`);
      }

      // 1. Sign in with password FIRST to get auth context
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await incrementLoginAttempts(email);
        throw error;
      }

      if (!data.user) {
        throw new Error('Authentication failed.');
      }

      // 2. NOW check if user is caregiver (we are authenticated now, so RLS allows reading our own profile)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, two_factor_enabled')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Profile not found.');
      }

      if (profile.role === 'patient') {
        await supabase.auth.signOut();
        throw new Error('This email is registered as a patient. Use patient login.');
      }

      // Complete login
      await resetLoginAttempts(email);
      setUser(data.user);
      await fetchProfile(data.user.id);
      await sendLoginNotification(email);
    } catch (error: any) {
      throw new Error(error.message || 'Invalid credentials.');
    }
  };

  // CAREGIVER: Verify 2FA
  const verify2FA = async (email: string, token: string) => {
    try {
      // In real implementation, verify TOTP token
      // For now, we'll use Supabase OTP as 2FA
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;

      // Complete login
      if (pendingUser) {
        setUser(pendingUser);
        await fetchProfile(pendingUser.id);
        await sendLoginNotification(email);
        setPendingUser(null);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Invalid 2FA code.');
    }
  };

  // Send login notification email
  const sendLoginNotification = async (email: string) => {
    try {
      // Call API route to send email
      await fetch('/api/auth/login-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Failed to send login notification:', error);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      clearAuthState();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Update last activity
  const updateLastActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Remember email functions
  const getRememberedEmail = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('alzcare_remember_email');
  };

  const setRememberEmail = (email: string, remember: boolean) => {
    if (typeof window === 'undefined') return;

    if (remember) {
      localStorage.setItem('alzcare_remember_email', email);
    } else {
      localStorage.removeItem('alzcare_remember_email');
    }
  };

  // OTP countdown effect
  // useEffect(() => {
  //   if (otpCountdown > 0 && !canResendOTP) {
  //     const timer = setTimeout(() => {
  //       setOtpCountdown(prev => prev - 1);
  //     }, 1000);
  //     return () => clearTimeout(timer);
  //   } else if (otpCountdown === 0) {
  //     setCanResendOTP(true);
  //     setOtpCountdown(OTP_RESEND_COOLDOWN);
  //   }
  // }, [otpCountdown, canResendOTP]);
  const clearSessionExpired = () => {
    setSessionExpired(false);
  };
  const value: AuthContextType = {
    user,
    profile,
    role,
    loading,
    isAuthenticated,
    sendOTP,
    verifyOTP,
    // resendOTP,
    signUpCaregiver,
    signInCaregiver,
    verify2FA,
    signOut,
    checkAccountLock,
    updateLastActivity,
    getRememberedEmail,
    setRememberEmail,
    sessionExpired,         // ADD THIS
    clearSessionExpired,
    pendingUser,

  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};