import React, { createContext, useContext, ReactNode } from 'react';
import { usePersistedState } from '../hooks/usePersistence';

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

interface UserSettings {
  currency: string;
  language: string;
  notifications: boolean;
}

interface UserContextType {
  profile: UserProfile;
  settings: UserSettings;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = usePersistedState<UserProfile>('@travora_user_profile', {
    name: 'Aditya Singh',
    email: 'aditya@travora.com',
    avatar: 'https://i.pravatar.cc/150?u=aditya',
  });

  const [settings, setSettings] = usePersistedState<UserSettings>('@travora_user_settings', {
    currency: 'INR (₹)',
    language: 'English (US)',
    notifications: true,
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return (
    <UserContext.Provider value={{ profile, settings, updateProfile, updateSettings }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
