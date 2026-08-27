import React, { useState } from 'react';
import { WebIcon } from '../components/WebIcon';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const PhoneLoginScreen = ({
  onBack,
  onSendOTP,
}: {
  onBack: () => void;
  onSendOTP: (phone: string) => void;
}) => {
  const { theme, isDark } = useTheme();
  const { loginWithPhone, isLoading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setError('');
    try {
      const fullPhone = `+91${phoneNumber}`;
      await loginWithPhone(fullPhone);
      onSendOTP(fullPhone);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="glass-panel animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px 32px',
          position: 'relative',
        }}
      >
        {/* Back Button */}
        <button
          onClick={onBack}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: theme.input,
            color: theme.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          <WebIcon name="chevron-back" size={20} />
        </button>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: theme.text, marginBottom: '8px' }}>
          What's your phone number?
        </h2>
        <p style={{ fontSize: '0.92rem', color: theme.textLight, marginBottom: '28px' }}>
          We'll send you a 6-digit verification code to get you signed in.
        </p>

        <form onSubmit={handleSendOTP}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: theme.input,
              border: `1.5px solid ${error ? '#EF4444' : theme.border}`,
              borderRadius: '16px',
              padding: '4px 16px',
              marginBottom: '16px',
              height: '58px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.primary, marginRight: '12px' }}>
              +91
            </span>
            <div style={{ width: '1px', height: '24px', backgroundColor: theme.border, marginRight: '12px' }} />
            <input
              type="tel"
              autoFocus
              placeholder="000 000 0000"
              value={phoneNumber}
              maxLength={10}
              onChange={(e) => {
                setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''));
                if (error) setError('');
              }}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: theme.text,
                padding: 0,
                outline: 'none',
                letterSpacing: '1px',
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 500, marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <Button
            title="Send Verification Code"
            loading={isLoading}
            disabled={phoneNumber.length < 10}
            style={{ marginTop: '12px' }}
          />
        </form>
      </div>
    </div>
  );
};
