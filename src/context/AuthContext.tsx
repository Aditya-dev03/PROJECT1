import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { loginAsGuest as _loginAsGuest, logoutGuest, getGuestSession } from '../services/auth/guestAuth';

interface User {
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
  signInWithGoogle: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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

      // 1. Check real Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await logoutGuest();
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(REAL_AUTH_KEY) : null;
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!parsed?.isGuest) {
            setUser(parsed);
            setIsLoading(false);
            return;
          }
        }
        const restoredUser = mapSupabaseUser(session.user);
        setUser(restoredUser);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(REAL_AUTH_KEY, JSON.stringify(restoredUser));
        }
        setIsLoading(false);
        return;
      }

      // 2. Check guest session
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
  }, []);

  // Google OAuth Sign In
  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      if (data?.url && typeof window !== 'undefined') {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('[AUTH] Google sign in error:', error);
      alert(error?.message || 'Google sign in failed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Phone Login
  const loginWithPhone = useCallback(async (phoneNumber: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber });
      if (error) throw error;
      setTempPhone(phoneNumber);
    } catch (error: any) {
      console.error('[AUTH] Phone login error:', error);
      // Demo mock fallback if Supabase phone SMS is not provisioned
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
        try {
          const { error } = await supabase.auth.verifyOtp({
            phone: tempPhone,
            token: otp,
            type: 'sms',
          });
          if (error) throw error;
        } catch (sbErr) {
          console.warn('[AUTH] Supabase SMS verify fallback to local phone user for demo:', sbErr);
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
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
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