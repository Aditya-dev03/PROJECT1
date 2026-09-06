import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { usePersistedState } from '../hooks/usePersistence';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { cloudSyncService } from '../services/cloudSyncService';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text?: string;
  image?: string;
  type: 'message' | 'activity' | 'expense' | 'itinerary';
  timestamp: string; // Stored as ISO string for persistence
  metadata?: any;
}

interface ChatContextType {
  messages: Record<string, Message[]>;
  isLoaded: boolean;
  addMessage: (tripId: string, message: Omit<Message, 'id' | 'timestamp'>, joinCode?: string) => Promise<Message>;
  sendMessage: (tripId: string, text: string, type?: Message['type'], metadata?: any, joinCode?: string) => Promise<Message>;
  syncMessagesForTrip: (tripId: string, incomingMessages: Message[]) => void;
  getMessages: (tripId: string) => Message[];
  deleteMessagesByTrip: (tripId: string) => void;
  fetchTripMessages: (tripId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const SEED_CHAT: Record<string, Message[]> = {};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages, isLoaded] = usePersistedState<Record<string, Message[]>>('@travora_chats', SEED_CHAT);

  // Fetch messages for a specific trip from Supabase if configured
  const fetchTripMessages = useCallback(async (tripId: string) => {
    if (!tripId || !isSupabaseConfigured || !user || user.isGuest) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) return;

      if (data && data.length > 0) {
        const remoteMessages: Message[] = data.map((row: any) => ({
          id: row.id,
          senderId: row.user_id || 'user',
          senderName: row.sender_name || 'Traveler',
          senderAvatar: row.sender_avatar || '',
          text: row.text || '',
          image: row.image || undefined,
          type: (row.type as Message['type']) || 'message',
          timestamp: row.created_at || new Date().toISOString(),
          metadata: row.metadata || undefined,
        }));

        setMessages(prev => {
          const currentTripMessages = prev[tripId] || [];
          const existingIds = new Set(currentTripMessages.map(m => m.id));
          const toAdd = remoteMessages.filter(m => !existingIds.has(m.id));

          if (toAdd.length === 0) return prev;

          const merged = [...currentTripMessages, ...toAdd].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          return {
            ...prev,
            [tripId]: merged,
          };
        });
      }
    } catch {
      // Graceful fallback
    }
  }, [user, setMessages]);

  const syncMessagesForTrip = useCallback((tripId: string, incomingMessages: Message[]) => {
    if (!incomingMessages || incomingMessages.length === 0) return;
    setMessages(prev => {
      const current = prev[tripId] || [];
      const existingIds = new Set(current.map(m => m.id));
      const toAdd = incomingMessages.filter(m => !existingIds.has(m.id));
      if (toAdd.length === 0) return prev;
      const merged = [...current, ...toAdd].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      return {
        ...prev,
        [tripId]: merged,
      };
    });
  }, [setMessages]);

  const addMessage = useCallback(async (
    tripId: string,
    msgData: Omit<Message, 'id' | 'timestamp'>,
    joinCode?: string
  ): Promise<Message> => {
    const newMessage: Message = {
      ...msgData,
      id: 'msg_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
    };

    // 1. Optimistic local update
    setMessages(prev => ({
      ...prev,
      [tripId]: [...(prev[tripId] || []), newMessage],
    }));

    // 2. Broadcast via Cloud Relay if joinCode available
    if (joinCode) {
      cloudSyncService.broadcastTripEvent(joinCode, {
        type: 'CHAT_MESSAGE',
        tripId,
        senderId: newMessage.senderId,
        senderName: newMessage.senderName,
        payload: newMessage,
      });
    }

    // 3. Background sync to Supabase if configured and authenticated
    if (isSupabaseConfigured && user && !user.isGuest && tripId) {
      (async () => {
        try {
          await supabase.from('messages').insert({
            trip_id: tripId,
            user_id: user.id,
            sender_name: newMessage.senderName,
            sender_avatar: newMessage.senderAvatar || user.photo || '',
            text: newMessage.text,
            type: newMessage.type,
            metadata: newMessage.metadata || {},
          });
        } catch {
          // Fallback to local storage
        }
      })();
    }

    return newMessage;
  }, [user, setMessages]);

  const sendMessage = useCallback(async (
    tripId: string,
    text: string,
    type: Message['type'] = 'message',
    metadata?: any,
    joinCode?: string
  ): Promise<Message> => {
    return addMessage(tripId, {
      senderId: user?.id || 'me',
      senderName: user?.name || 'You',
      senderAvatar: user?.photo || '',
      text: text.trim(),
      type,
      metadata,
    }, joinCode);
  }, [user, addMessage]);

  const getMessages = useCallback((tripId: string): Message[] => {
    return messages[tripId] || [];
  }, [messages]);

  const deleteMessagesByTrip = useCallback((tripId: string) => {
    setMessages(prev => {
      const updated = { ...prev };
      delete updated[tripId];
      return updated;
    });

    if (isSupabaseConfigured && user && !user.isGuest && tripId) {
      (async () => {
        try {
          await supabase.from('messages').delete().eq('trip_id', tripId);
        } catch {
          // Ignore
        }
      })();
    }
  }, [user, setMessages]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoaded,
        addMessage,
        sendMessage,
        syncMessagesForTrip,
        getMessages,
        deleteMessagesByTrip,
        fetchTripMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
