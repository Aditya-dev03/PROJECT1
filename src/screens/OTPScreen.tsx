import React, { useState, useEffect, useRef } from 'react';
import { WebIcon } from '../components/WebIcon';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const OTPScreen = ({
  phoneNumber,
  onBack,
  onSuccess,
}: {
  phoneNumber: string;
  onBack: () => void;
  onSuccess: () => void;
}) => {
  const { theme } = useTheme();
  const { verifyOTP, loginWithPhone, isLoading } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleaned ? cleaned[cleaned.length - 1] : '';
    setOtp(newOtp);

    // Auto-focus next input
    if (cleaned && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    try {
      await verifyOTP(otpString);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Try again.');
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await loginWithPhone(phoneNumber);
      setTimer(30);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code.');
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
          Enter Verification Code
        </h2>
        <p style={{ fontSize: '0.92rem', color: theme.textLight, marginBottom: '28px' }}>
          We've sent a 6-digit code to{' '}
          <strong style={{ color: theme.primary }}>{phoneNumber}</strong>
        </p>

        <form onSubmit={handleVerify}>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              marginBottom: '24px',
            }}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                autoFocus={i === 0}
                onChange={(e) => handleOtpChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                style={{
                  width: '48px',
                  height: '56px',
                  borderRadius: '14px',
                  border: `2px solid ${digit ? theme.primary : theme.border}`,
                  backgroundColor: theme.input,
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: theme.text,
                  outline: 'none',
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 500, textAlign: 'center', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.88rem', color: theme.textLight }}>
              Didn't receive the code?{' '}
            </span>
            {timer > 0 ? (
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: theme.textLight }}>
                Resend in {timer}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: theme.primary,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                }}
              >
                Resend Code
              </button>
            )}
          </div>

          <Button
            title="Verify & Continue"
            loading={isLoading}
            disabled={otp.join('').length < 6}
          />
        </form>
      </div>
    </div>
  );
};
