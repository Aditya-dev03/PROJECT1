import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { loginAsGuest as _loginAsGuest, logoutGuest, getGuestSession } from '../services/auth/guestAuth';
import { GoogleUserProfile } from '../services/auth/googleAuth';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photo?: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  signInWithGoogle: () => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithGoogleProfile: (profile: Partial<GoogleUserProfile>) => Promise<void>;
  loginWithPhone: (phoneNumber: string) => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  loginAsGuest: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REAL_AUTH_KEY = '@travora_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tempPhone, setTempPhone] = useState<string | null>(null);

  const mapSupabaseUser = (sbUser: any): User => {
    return {
      id: sbUser.id,
      name:
        sbUser.user_metadata?.full_name ||
        sbUser.user_metadata?.name ||
        sbUser.email?.split('@')[0] ||
        'Traveler',
      email: sbUser.email,
      phone: sbUser.phone,
      photo:
        sbUser.user_metadata?.avatar_url ||
        sbUser.user_metadata?.picture ||
        '',
      isGuest: false,
    };
  };

  // Restore Session
  const restoreSession = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Check local persistent authenticated session first
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(REAL_AUTH_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && !parsed.isGuest && parsed.name) {
              await logoutGuest();
              setUser(parsed);
              setIsLoading(false);
              return;
            }
          } catch {
            // Ignore parse error
          }
        }
      }

      // 2. Check real Supabase session (if configured)
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await logoutGuest();
            const restoredUser = mapSupabaseUser(session.user);
            setUser(restoredUser);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(REAL_AUTH_KEY, JSON.stringify(restoredUser));
            }
            setIsLoading(false);
            return;
          }
        } catch (sbErr) {
          console.warn('[AUTH] Supabase session restore failed:', sbErr);
        }
      }

      // 3. Check guest session fallback
      const guest = await getGuestSession();
      if (guest) {
        setUser(guest);
        setIsLoading(false);
        return;
      }

      setUser(null);
    } catch (err) {
      console.warn('[AUTH] Restore session warning:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Listen to Supabase Auth State changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
            await logoutGuest();
            const newUser = mapSupabaseUser(session.user);
            setUser(newUser);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(REAL_AUTH_KEY, JSON.stringify(newUser));
            }
          }
          if (event === 'SIGNED_OUT') {
            setUser(null);
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(REAL_AUTH_KEY);
            }
          }
        } catch (err) {
          console.warn('[AUTH] State change error:', err);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // Ignore
    }
  }, []);

  // Login directly with a Google Profile (e.g. from Google Account Picker or GIS)
  const loginWithGoogleProfile = useCallback(async (profile: Partial<GoogleUserProfile>) => {
    setIsLoading(true);
    try {
      await logoutGuest();
      const googleUser: User = {
        id: profile.id || 'google_' + Date.now(),
        name: profile.name || 'Google Traveler',
        email: profile.email || 'traveler@gmail.com',
        photo: profile.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        isGuest: false,
      };

      setUser(googleUser);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(REAL_AUTH_KEY, JSON.stringify(googleUser));
      }
    } catch (err) {
      console.error('[AUTH] Failed to login with Google profile:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Google OAuth Sign In
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // If real Supabase instance is configured, trigger OAuth redirect
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
        if (data?.url && typeof window !== 'undefined') {
          window.location.href = data.url;
          return true;
        }
      }
      // Return false to indicate AuthScreen should open Google Account Picker modal
      return false;
    } catch (error: any) {
      console.warn('[AUTH] Supabase Google OAuth not active, opening Google Account Picker:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Phone Login
  const loginWithPhone = useCallback(async (phoneNumber: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber });
        if (error) throw error;
      }
      setTempPhone(phoneNumber);
    } catch (error: any) {
      console.warn('[AUTH] Phone login fallback:', error);
      setTempPhone(phoneNumber);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify OTP
  const verifyOTP = useCallback(async (otp: string) => {
    setIsLoading(true);
    try {
      if (tempPhone) {
        let sbSuccess = false;
        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase.auth.verifyOtp({
              phone: tempPhone,
              token: otp,
              type: 'sms',
            });
            if (!error) sbSuccess = true;
          } catch {
            sbSuccess = false;
          }
        }

        if (!sbSuccess) {
          const phoneUser: User = {
            id: 'phone_' + tempPhone.replace(/[^0-9]/g, ''),
            name: `Traveler (${tempPhone.slice(-4)})`,
            phone: tempPhone,
            isGuest: false,
          };
          setUser(phoneUser);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(REAL_AUTH_KEY, JSON.stringify(phoneUser));
          }
        }
      }
      await logoutGuest();
    } catch (error) {
      console.error('[AUTH] OTP verification error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [tempPhone]);

  // Logout
  const logout = useCallback(async () => {
    try {
      if (user?.isGuest) {
        await logoutGuest();
      } else {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(REAL_AUTH_KEY);
        }
        if (isSupabaseConfigured) {
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
        }
      }
      setUser(null);
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      setUser(null);
    }
  }, [user]);

  // Guest Login
  const loginAsGuestHandler = useCallback(async () => {
    setIsLoading(true);
    try {
      const guestUser = await _loginAsGuest();
      setUser(guestUser);
    } catch (error) {
      console.error('[AUTH] Guest login error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update User Profile
  const updateUser = useCallback(async (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      if (!updated.isGuest && typeof window !== 'undefined') {
        window.localStorage.setItem(REAL_AUTH_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: Boolean(user),
        signInWithGoogle,
        loginWithGoogle: signInWithGoogle,
        loginWithGoogleProfile,
        loginWithPhone,
        signInWithPhone: loginWithPhone,
        verifyOTP,
        logout,
        signOut: logout,
        restoreSession,
        updateUser,
        loginAsGuest: loginAsGuestHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};