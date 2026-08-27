import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { usePersistedState } from '../hooks/usePersistence';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  addMessage: (tripId: string, message: Omit<Message, 'id' | 'timestamp'>) => Promise<Message>;
  sendMessage: (tripId: string, text: string, type?: Message['type'], metadata?: any) => Promise<Message>;
  getMessages: (tripId: string) => Message[];
  deleteMessagesByTrip: (tripId: string) => void;
  fetchTripMessages: (tripId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const SEED_CHAT: Record<string, Message[]> = {};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages, isLoaded] = usePersistedState<Record<string, Message[]>>('@travora_chats', SEED_CHAT);

  // Fetch messages for a specific trip from Supabase
  const fetchTripMessages = useCallback(async (tripId: string) => {
    if (!tripId || !user || user.isGuest) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) {
        // Table may not exist yet or user offline
        return;
      }

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
          // Merge avoiding duplicate IDs
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

  // Realtime subscription for incoming messages
  useEffect(() => {
    if (!user || user.isGuest) return;

    const channel = supabase
      .channel('public-messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newRow = payload.new as any;
          if (!newRow || !newRow.trip_id) return;

          const incomingMsg: Message = {
            id: newRow.id,
            senderId: newRow.user_id || 'user',
            senderName: newRow.sender_name || 'Traveler',
            senderAvatar: newRow.sender_avatar || '',
            text: newRow.text || '',
            image: newRow.image || undefined,
            type: (newRow.type as Message['type']) || 'message',
            timestamp: newRow.created_at || new Date().toISOString(),
            metadata: newRow.metadata || undefined,
          };

          setMessages(prev => {
            const tripMsgs = prev[newRow.trip_id] || [];
            if (tripMsgs.some(m => m.id === incomingMsg.id)) return prev;
            return {
              ...prev,
              [newRow.trip_id]: [...tripMsgs, incomingMsg],
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, setMessages]);

  const addMessage = useCallback(async (tripId: string, msgData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
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

    // 2. Background sync to Supabase if authenticated
    if (user && !user.isGuest && tripId) {
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

  const sendMessage = useCallback(async (tripId: string, text: string, type: Message['type'] = 'message', metadata?: any): Promise<Message> => {
    return addMessage(tripId, {
      senderId: user?.id || 'me',
      senderName: user?.name || 'You',
      senderAvatar: user?.photo || '',
      text: text.trim(),
      type,
      metadata,
    });
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

    if (user && !user.isGuest && tripId) {
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
