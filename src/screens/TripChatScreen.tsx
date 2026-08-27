import React, { useState, useEffect, useRef } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useTheme } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useMembers } from '../context/MemberContext';
import { Trip } from '../types';
import { getInitials } from '../utils';

interface TripChatProps {
  onBack: () => void;
  tripData: Trip;
}

export const TripChatScreen: React.FC<TripChatProps> = ({ onBack, tripData }) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { getMessages, addMessage } = useChat();
  const { getMembersByTripId } = useMembers();

  const tripId = tripData.id;
  const messages = getMessages(tripId);
  const members = getMembersByTripId(tripId);

  const [inputMessage, setInputMessage] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !selectedPhoto) return;

    addMessage(tripId, {
      senderId: user?.id || 'u1',
      senderName: user?.name || 'You',
      senderAvatar: user?.photo || '',
      text: inputMessage.trim(),
      image: selectedPhoto || undefined,
      type: 'message',
    });

    setInputMessage('');
    setSelectedPhoto(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setSelectedPhoto(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 70px)',
        backgroundColor: theme.background,
      }}
      className="animate-fade-in"
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: isDark ? 'rgba(10, 26, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: theme.input,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <WebIcon name="chevron-back" size={18} />
          </button>

          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: theme.text, margin: 0 }}>
              {tripData.destination} Group Chat
            </h2>
            <span style={{ fontSize: '0.78rem', color: theme.textLight }}>
              {members.length} members in conversation
            </span>
          </div>
        </div>

        {/* Member Avatars Stack */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {members.slice(0, 4).map((m, idx) => (
            <div
              key={m.id}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: theme.primary,
                border: `2px solid ${theme.card}`,
                marginLeft: idx > 0 ? '-10px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 700,
                overflow: 'hidden',
              }}
            >
              {m.avatar ? (
                <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getInitials(m.name)
              )}
            </div>
          ))}
          {members.length > 4 && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.textLight, marginLeft: '6px' }}>
              +{members.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: theme.textLight }}>
            <WebIcon name="chat" size={44} color={theme.textLight} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: theme.text, marginBottom: '4px' }}>
              Say hello to your travel crew!
            </p>
            <p style={{ fontSize: '0.85rem' }}>Send messages, share photos, and coordinate your plans here.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.id || msg.senderName === user?.name || msg.senderName === 'You';
            const isBot = msg.type === 'expense' || msg.senderName === 'Travora Bot';

            if (isBot) {
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: 'center',
                    backgroundColor: isDark ? 'rgba(0, 166, 153, 0.15)' : 'rgba(0, 166, 153, 0.1)',
                    border: '1px solid rgba(0, 166, 153, 0.3)',
                    color: theme.text,
                    padding: '8px 16px',
                    borderRadius: '16px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    maxWidth: '80%',
                    textAlign: 'center',
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                }}
              >
                {!isMe && (
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: theme.primary,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(msg.senderName)}
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: isMe ? theme.primary : theme.card,
                    color: isMe ? '#FFFFFF' : theme.text,
                    border: isMe ? 'none' : `1px solid ${theme.border}`,
                    padding: '12px 16px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {!isMe && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.primary, marginBottom: '4px' }}>
                      {msg.senderName}
                    </div>
                  )}

                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Attachment"
                      style={{
                        width: '100%',
                        maxWidth: '280px',
                        borderRadius: '12px',
                        marginBottom: msg.text ? '8px' : '0',
                        objectFit: 'cover',
                      }}
                    />
                  )}

                  {msg.text && (
                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </p>
                  )}

                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: isMe ? 'rgba(255,255,255,0.7)' : theme.textLight,
                      textAlign: 'right',
                      marginTop: '4px',
                    }}
                  >
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected Photo Preview */}
      {selectedPhoto && (
        <div
          style={{
            padding: '8px 24px',
            backgroundColor: theme.input,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ position: 'relative' }}>
            <img
              src={selectedPhoto}
              alt="Preview"
              style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }}
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <WebIcon name="close" size={12} />
            </button>
          </div>
          <span style={{ fontSize: '0.85rem', color: theme.textLight }}>Photo attached</span>
        </div>
      )}

      {/* Bottom Send Input Bar */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 24px',
          borderTop: `1px solid ${theme.border}`,
          backgroundColor: theme.card,
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: theme.input,
            color: theme.textLight,
            border: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Attach Photo"
        >
          <WebIcon name="camera" size={18} />
        </button>

        <input
          type="text"
          placeholder="Message group..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          style={{
            flex: 1,
            height: '44px',
            borderRadius: '14px',
            backgroundColor: theme.input,
            border: `1px solid ${theme.border}`,
            padding: '0 16px',
            fontSize: '0.92rem',
            color: theme.text,
            outline: 'none',
          }}
        />

        <button
          type="submit"
          disabled={!inputMessage.trim() && !selectedPhoto}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            backgroundColor: theme.primary,
            color: '#FFFFFF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: !inputMessage.trim() && !selectedPhoto ? 0.5 : 1,
            boxShadow: '0 4px 12px var(--primary-glow)',
          }}
        >
          <WebIcon name="send" size={18} color="#FFFFFF" />
        </button>
      </form>
    </div>
  );
};
