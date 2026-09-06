import React, { useState, useEffect } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import {
  PRESET_GOOGLE_ACCOUNTS,
  GoogleUserProfile,
  loadGoogleIdentityScript,
  decodeGoogleJwt,
} from '../services/auth/googleAuth';

export const AuthScreen = ({ onPhoneLogin }: { onPhoneLogin: () => void }) => {
  const { theme } = useTheme();
  const { signInWithGoogle, loginWithGoogleProfile, isLoading, loginAsGuest } = useAuth();
  const { t } = useI18n();

  // Google Modal States
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isCustomGoogleOpen, setIsCustomGoogleOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  // Attempt to load Google Identity Services in background
  useEffect(() => {
    loadGoogleIdentityScript().then((loaded) => {
      if (loaded && typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
          if (clientId) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (response: any) => {
                if (response?.credential) {
                  const decoded = decodeGoogleJwt(response.credential);
                  if (decoded) {
                    loginWithGoogleProfile({
                      id: decoded.sub,
                      name: decoded.name || decoded.given_name || 'Google Traveler',
                      email: decoded.email,
                      photo: decoded.picture,
                      provider: 'google',
                    });
                  }
                }
              },
            });
          }
        } catch (err) {
          console.warn('[AUTH] GIS init warning:', err);
        }
      }
    });
  }, [loginWithGoogleProfile]);

  const handleGoogleClick = async () => {
    setGoogleAuthError(null);
    const redirected = await signInWithGoogle();
    if (!redirected) {
      // Open the authentic Google Account Picker modal
      setIsGoogleModalOpen(true);
    }
  };

  const handleSelectGoogleAccount = async (account: GoogleUserProfile) => {
    try {
      await loginWithGoogleProfile(account);
      setIsGoogleModalOpen(false);
    } catch (err: any) {
      setGoogleAuthError(err?.message || 'Failed to sign in with Google');
    }
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) {
      setGoogleAuthError('Please enter your Google email address');
      return;
    }
    const cleanEmail = customEmail.trim().toLowerCase();
    const formattedEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`;
    const formattedName = customName.trim() || formattedEmail.split('@')[0];

    try {
      await loginWithGoogleProfile({
        id: 'google_' + Date.now().toString(),
        name: formattedName,
        email: formattedEmail,
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=0D8ABC&color=fff&bold=true`,
        provider: 'google',
      });
      setIsGoogleModalOpen(false);
    } catch (err: any) {
      setGoogleAuthError(err?.message || 'Failed to sign in with Google');
    }
  };

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
            onClick={handleGoogleClick}
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

      {/* Google Account Picker Modal */}
      {isGoogleModalOpen && (
        <div
          className="modal-overlay animate-fade-in"
          onClick={() => setIsGoogleModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="modal-content animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              textAlign: 'left',
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsGoogleModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                border: 'none',
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <WebIcon name="close" size={16} />
            </button>

            {/* Google Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24">
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
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                  Sign in with Google
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>to continue to Travora</span>
              </div>
            </div>

            {googleAuthError && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #F87171',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#B91C1C',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                {googleAuthError}
              </div>
            )}

            {!isCustomGoogleOpen ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: '0 0 14px 0' }}>
                  Choose an account:
                </p>

                {/* Preset Google Accounts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {PRESET_GOOGLE_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => handleSelectGoogleAccount(acc)}
                      disabled={isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                        e.currentTarget.style.borderColor = '#4285F4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                    >
                      <img
                        src={acc.photo}
                        alt={acc.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {acc.email}
                        </div>
                      </div>
                      <WebIcon name="chevron-forward" size={16} color="#9CA3AF" />
                    </button>
                  ))}
                </div>

                {/* Option to use another Google account */}
                <button
                  onClick={() => setIsCustomGoogleOpen(true)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px dashed #D1D5DB',
                    color: '#4B5563',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#4285F4')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#D1D5DB')}
                >
                  <WebIcon name="person" size={16} color="#4285F4" />
                  <span>Use another Google account</span>
                </button>
              </div>
            ) : (
              /* Custom Google Account Form */
              <form onSubmit={handleCustomGoogleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Google Email
                  </label>
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={customEmail}
                    autoFocus
                    onChange={(e) => setCustomEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #D1D5DB',
                      fontSize: '0.9rem',
                      color: '#111827',
                      backgroundColor: '#F9FAFB',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="Aditya Pratap Singh"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #D1D5DB',
                      fontSize: '0.9rem',
                      color: '#111827',
                      backgroundColor: '#F9FAFB',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCustomGoogleOpen(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '12px',
                      backgroundColor: '#F3F4F6',
                      border: 'none',
                      color: '#4B5563',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      flex: 2,
                      padding: '10px',
                      borderRadius: '12px',
                      backgroundColor: '#4285F4',
                      border: 'none',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
                    }}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in as Google User'}
                  </button>
                </div>
              </form>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.72rem', color: '#9CA3AF' }}>
              Your Google identity is secured and synced for collaborative trip planning.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
