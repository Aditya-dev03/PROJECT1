import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { Member } from '../types';
import { usePersistedState } from '../hooks/usePersistence';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface MemberContextType {
  members: Member[];
  isLoaded: boolean;
  addMember: (member: any) => Member;
  removeMember: (id: string) => void;
  getMembersByTripId: (tripId: string) => Member[];
  deleteMembersByTrip: (tripId: string) => void;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

const SEED_MEMBERS: Member[] = [
  {
    id: 'u1',
    tripId: '1',
    name: 'Rahul',
    avatar: 'https://i.pravatar.cc/150?u=rahul',
    email: 'rahul@example.com',
    role: 'Admin',
  },
  {
    id: 'u2',
    tripId: '1',
    name: 'Aarya',
    avatar: 'https://i.pravatar.cc/150?u=aarya',
    email: 'aarya@example.com',
    role: 'Member',
  }
];

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [members, setMembers, isLoaded] = usePersistedState<Member[]>('@travora_members', SEED_MEMBERS);

  // Fetch all members from Supabase
  const fetchSupabaseMembers = useCallback(async () => {
    if (!user || user.isGuest) return;
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          id,
          trip_id,
          role,
          user_id,
          profiles (
            name,
            email,
            photo
          )
        `);

      if (error) {
        // Table not created yet or network offline - fallback silently to local
        return;
      }

      if (data && data.length > 0) {
        const mappedMembers: Member[] = data.map((tm: any) => ({
          id: tm.id,
          tripId: tm.trip_id,
          name: tm.profiles?.name || (tm.user_id === user.id ? user.name : 'Traveler'),
          avatar: tm.profiles?.photo || (tm.user_id === user.id ? user.photo : '') || 'https://i.pravatar.cc/150?u=' + encodeURIComponent(tm.id),
          email: tm.profiles?.email || (tm.user_id === user.id ? user.email : '') || '',
          role: tm.role === 'owner' || tm.role === 'Admin' ? 'Admin' : 'Member',
        }));

        setMembers(prev => {
          // Merge Supabase members with local members, prioritizing DB entries
          const merged = [...prev];
          for (const m of mappedMembers) {
            const idx = merged.findIndex(existing => existing.tripId === m.tripId && (existing.id === m.id || (existing.email && existing.email === m.email)));
            if (idx >= 0) {
              merged[idx] = m;
            } else {
              merged.push(m);
            }
          }
          return merged;
        });
      }
    } catch {
      // Ignore network/schema errors
    }
  }, [user, setMembers]);

  // Fetch on mount or when user session changes
  useEffect(() => {
    if (isLoaded && user && !user.isGuest) {
      fetchSupabaseMembers();
    }
  }, [isLoaded, user, fetchSupabaseMembers]);

  // Realtime subscription for membership changes
  useEffect(() => {
    if (!user || user.isGuest) return;

    const channel = supabase
      .channel('public-members-context-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_members' },
        () => {
          fetchSupabaseMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSupabaseMembers]);

  const addMember = useCallback((data: any) => {
    const newMember: Member = {
      ...data,
      id: data.id || ('m_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4)),
      name: data.name || (user?.name ? user.name : 'Traveler'),
      email: data.email || user?.email || '',
      avatar: data.avatar || user?.photo || '',
      role: data.role || 'Admin',
    };

    // 1. ALWAYS add to local state immediately so UI updates
    setMembers(prev => {
      // Prevent duplicates
      const exists = prev.some(
        m => m.tripId === newMember.tripId && (m.id === newMember.id || (m.email && m.email === newMember.email))
      );
      if (exists) {
        return prev.map(m =>
          m.tripId === newMember.tripId && (m.id === newMember.id || (m.email && m.email === newMember.email))
            ? { ...m, ...newMember }
            : m
        );
      }
      return [...prev, newMember];
    });

    // 2. If authenticated, optionally sync to Supabase in the background
    if (user && !user.isGuest && data.tripId) {
      (async () => {
        try {
          await supabase
            .from('trip_members')
            .insert({
              trip_id: data.tripId,
              user_id: user.id,
              role: data.role === 'Admin' ? 'owner' : 'member',
            });
        } catch {
          // Ignore network/schema errors
        }
      })();
    }


    return newMember;
  }, [user, setMembers]);

  const removeMember = useCallback(async (id: string) => {
    // 1. Remove locally
    setMembers(prev => prev.filter(m => m.id !== id));

    // 2. Remove from Supabase if authenticated
    if (user && !user.isGuest) {
      try {
        await supabase
          .from('trip_members')
          .delete()
          .eq('id', id);
      } catch {
        // Ignore network/schema errors
      }
    }
  }, [user, setMembers]);

  const getMembersByTripId = useCallback((tripId: string): Member[] => {
    const found = members.filter(m => m.tripId === tripId);
    if (found.length > 0) {
      return found;
    }

    // Self-healing fallback: If no members exist in state for this trip,
    // synthesize the creator / host member using current user profile
    const fallbackHost: Member = {
      id: user?.id || 'host_' + tripId,
      tripId: tripId,
      name: user?.name || 'You',
      avatar: user?.photo || '',
      email: user?.email || '',
      role: 'Admin',
    };
    return [fallbackHost];
  }, [members, user]);

  const deleteMembersByTrip = useCallback((tripId: string) => {
    setMembers(prev => prev.filter(m => m.tripId !== tripId));
  }, [setMembers]);

  return (
    <MemberContext.Provider value={{ members, isLoaded, addMember, removeMember, getMembersByTripId, deleteMembersByTrip }}>
      {children}
    </MemberContext.Provider>
  );
};

export const useMembers = () => {
  const context = useContext(MemberContext);
  if (context === undefined) {
    throw new Error('useMembers must be used within a MemberProvider');
  }
  return context;
};
