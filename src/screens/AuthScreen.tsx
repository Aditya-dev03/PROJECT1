import React from 'react';
import { WebIcon } from '../components/WebIcon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

export const AuthScreen = ({ onPhoneLogin }: { onPhoneLogin: () => void }) => {
  const { theme } = useTheme();
  const { signInWithGoogle, isLoading, loginAsGuest } = useAuth();
  const { t } = useI18n();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0A1A2A',
        backgroundImage: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Dark Gradient Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(10, 26, 42, 0.4) 0%, rgba(10, 26, 42, 0.88) 60%, #0A1A2A 100%)',
        }}
      />

      {/* Auth Card */}
      <div
        className="glass-panel animate-scale-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          padding: '40px 32px',
          borderRadius: '28px',
          backgroundColor: 'rgba(19, 39, 59, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #FF5A5F 0%, #FF8A8A 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(255, 90, 95, 0.4)',
          }}
        >
          <WebIcon name="airplane" size={32} color="#FFFFFF" />
        </div>

        <h1
          style={{
            fontSize: '2.4rem',
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.03em',
            margin: '0 0 6px 0',
          }}
        >
          Travora
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 32px 0' }}>
          Discover. Plan. Explore. Together.
        </p>

        <div style={{ textAlign: 'left', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0' }}>
            {t('auth.welcomeBack') || 'Ready for your next adventure?'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
            Sign in to create, organize, split expenses, and track your trips in real time.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Google Sign In */}
          <button
            onClick={signInWithGoogle}
            disabled={isLoading}
            style={{
              width: '100%',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Phone Sign In */}
          <button
            onClick={onPhoneLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
            }}
          >
            <WebIcon name="phone" size={18} color="#FFFFFF" />
            <span>Continue with Phone</span>
          </button>

          {/* Guest Mode */}
          <button
            onClick={loginAsGuest}
            disabled={isLoading}
            style={{
              width: '100%',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: 'transparent',
              color: '#FF5A5F',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              border: '1.5px solid #FF5A5F',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 90, 95, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <WebIcon name="person" size={18} color="#FF5A5F" />
            <span>Explore as Guest (Instant)</span>
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '24px', margin: '24px 0 0 0' }}>
          By continuing, you agree to Travora's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
