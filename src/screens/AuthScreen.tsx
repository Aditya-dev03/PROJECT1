import React, { useState, useEffect } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import {
  GoogleUserProfile,
  loadGoogleIdentityScript,
  decodeGoogleJwt,
  getGoogleClientId,
  saveGoogleClientId,
  launchGoogleOAuthPopup,
} from '../services/auth/googleAuth';

export const AuthScreen = ({ onPhoneLogin }: { onPhoneLogin: () => void }) => {
  const { theme } = useTheme();
  const { signInWithGoogle, loginWithGoogleProfile, isLoading, loginAsGuest } = useAuth();
  const { t } = useI18n();

  // Google OAuth States
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleClientIdInput, setGoogleClientIdInput] = useState('');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  // Attempt to load Google Identity Services in background if clientId exists
  useEffect(() => {
    const cid = getGoogleClientId();
    if (!cid) return;
    loadGoogleIdentityScript().then((loaded) => {
      if (loaded && typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: cid,
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
        } catch (err) {
          console.warn('[AUTH] GIS init warning:', err);
        }
      }
    });
  }, [loginWithGoogleProfile]);

  const executeGoogleOAuth = async (clientId: string) => {
    setIsConnectingGoogle(true);
    setGoogleAuthError(null);
    try {
      const profile = await launchGoogleOAuthPopup(clientId);
      await loginWithGoogleProfile(profile);
      setIsGoogleModalOpen(false);
    } catch (err: any) {
      console.error('[AUTH] Google OAuth error:', err);
      const msg = err?.message || 'Google sign-in failed. Please try again.';
      setGoogleAuthError(msg);
      if (msg.toLowerCase().includes('client id') || msg.toLowerCase().includes('origin')) {
        setIsGoogleModalOpen(true);
      }
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleGoogleClick = async () => {
    setGoogleAuthError(null);
    const redirected = await signInWithGoogle();
    if (redirected) return;

    const clientId = getGoogleClientId();
    if (!clientId) {
      setGoogleClientIdInput('');
      setIsGoogleModalOpen(true);
      return;
    }

    await executeGoogleOAuth(clientId);
  };

  const handleSaveClientIdAndSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = googleClientIdInput.trim();
    if (!cleanId) {
      setGoogleAuthError('Please enter your Google OAuth Client ID.');
      return;
    }
    saveGoogleClientId(cleanId);
    await executeGoogleOAuth(cleanId);
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
            disabled={isLoading || isConnectingGoogle}
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
              cursor: isLoading || isConnectingGoogle ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
              opacity: isLoading || isConnectingGoogle ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !isConnectingGoogle) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isConnectingGoogle ? (
              <>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2.5px solid #4285F4',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Opening Google Sign-In...</span>
              </>
            ) : (
              <>
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
              </>
            )}
          </button>

          {/* Phone Sign In */}
          <button
            onClick={onPhoneLogin}
            disabled={isLoading || isConnectingGoogle}
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
            disabled={isLoading || isConnectingGoogle}
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

        {/* Error notification banner on auth card */}
        {googleAuthError && !isGoogleModalOpen && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#FCA5A5',
              fontSize: '0.82rem',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span>{googleAuthError}</span>
            <button
              onClick={() => {
                setGoogleClientIdInput(getGoogleClientId());
                setIsGoogleModalOpen(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#93C5FD',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              Setup Client ID
            </button>
          </div>
        )}

        {/* Settings button to view / update Google Client ID */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setGoogleClientIdInput(getGoogleClientId());
              setIsGoogleModalOpen(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.55)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)')}
          >
            <WebIcon name="settings-outline" size={13} color="currentColor" />
            <span>{getGoogleClientId() ? 'Google Client ID Connected (click to change)' : 'Google OAuth Setup (2 mins)'}</span>
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '20px', margin: '20px 0 0 0' }}>
          By continuing, you agree to Travora's Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Real Google OAuth Setup Modal */}
      {isGoogleModalOpen && (
        <div
          className="modal-overlay animate-fade-in"
          onClick={() => setIsGoogleModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
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
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
              borderRadius: '24px',
              padding: '28px 32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
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
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
            >
              <WebIcon name="close" size={16} />
            </button>

            {/* Google Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24">
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
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                  Real Google Account Login
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                  Authenticates directly via accounts.google.com
                </span>
              </div>
            </div>

            {googleAuthError && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #F87171',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  color: '#991B1B',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  lineHeight: 1.4,
                }}
              >
                <strong>Notice:</strong> {googleAuthError}
              </div>
            )}

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 8px 0', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <WebIcon name="key" size={16} color="#3B82F6" />
                <span>Google OAuth 2.0 Web Client Setup</span>
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                To connect directly to Google's real sign-in popup without fake forms, Google requires a free OAuth Client ID from your Google Cloud Console:
              </p>

              <ol style={{ fontSize: '0.8rem', color: '#334155', margin: '0 0 12px 0', paddingLeft: '20px', lineHeight: 1.6 }}>
                <li>
                  Open{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Google Cloud Console Credentials ↗
                  </a>
                </li>
                <li>Click <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong> &rarr; Select <strong>Web application</strong>.</li>
                <li>
                  In <strong>Authorized JavaScript origins</strong>, add:
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '4px' }}>
                    <code style={{ backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', color: '#0F172A' }}>
                      {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined') {
                          navigator.clipboard.writeText(window.location.origin);
                          setCopiedOrigin(true);
                          setTimeout(() => setCopiedOrigin(false), 2000);
                        }
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: copiedOrigin ? '#10B981' : '#E2E8F0',
                        color: copiedOrigin ? '#FFFFFF' : '#334155',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedOrigin ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </li>
                <li>
                  In <strong>Authorized redirect URIs</strong>, also add:
                  <div style={{ marginTop: '4px' }}>
                    <code style={{ backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', color: '#0F172A' }}>
                      {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                    </code>
                  </div>
                </li>
                <li>Copy your generated <strong>Client ID</strong> and paste it below:</li>
              </ol>
            </div>

            {/* Client ID Form */}
            <form onSubmit={handleSaveClientIdAndSignIn}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#1F2937', marginBottom: '6px' }}>
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1234567890-abcdefg12345.apps.googleusercontent.com"
                  value={googleClientIdInput}
                  onChange={(e) => setGoogleClientIdInput(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.88rem',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
                <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748B', marginTop: '5px' }}>
                  Saved securely in browser storage. Your real Google account will open in a popup window.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#F1F5F9',
                    border: 'none',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isConnectingGoogle || !googleClientIdInput.trim()}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#4285F4',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: isConnectingGoogle || !googleClientIdInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: isConnectingGoogle || !googleClientIdInput.trim() ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(66, 133, 244, 0.35)',
                  }}
                >
                  {isConnectingGoogle ? (
                    <>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #FFFFFF',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                      <span>Opening Google...</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path
                          fill="#FFFFFF"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                        />
                        <path
                          fill="#FFFFFF"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                        />
                        <path
                          fill="#FFFFFF"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#FFFFFF"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Connect & Sign In</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
