import React, { useState } from 'react';
import { WebIcon } from './WebIcon';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useUser } from '../context/UserContext';
import { getInitials } from '../utils';

interface NavbarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onCreateTrip: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  onCreateTrip,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { t, locale } = useI18n();
  const { settings, updateSettings } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const navLinks = [
    { id: 'home', label: t('nav.home') || 'Home', icon: 'home' },
    { id: 'trips', label: t('nav.trips') || 'My Trips', icon: 'map' },
    { id: 'expenses', label: t('nav.expenses') || 'Expenses', icon: 'wallet' },
    { id: 'profile', label: t('nav.profile') || 'Profile', icon: 'person' },
  ];

  const languages = [
    { label: 'English (US)', code: 'en' },
    { label: 'Hindi (IN)', code: 'hi' },
    { label: 'French (FR)', code: 'fr' },
    { label: 'Spanish (ES)', code: 'es' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: isDark ? 'rgba(10, 26, 42, 0.88)' : 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${theme.border}`,
        transition: 'all 0.25s ease',
      }}
    >
      <div
        className="travora-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '70px',
        }}
      >
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF5A5F 0%, #FF7E82 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(255, 90, 95, 0.35)',
            }}
          >
            <WebIcon name="airplane" size={22} color="#FFFFFF" />
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.45rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: theme.text,
              }}
            >
              Travora
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => {
            const isActive = currentScreen === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? theme.primary : theme.textLight,
                  backgroundColor: isActive
                    ? isDark
                      ? 'rgba(255, 90, 95, 0.15)'
                      : 'rgba(255, 90, 95, 0.1)'
                    : 'transparent',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = theme.text;
                    e.currentTarget.style.backgroundColor = isDark ? '#152A3D' : '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = theme.textLight;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <WebIcon
                  name={link.icon}
                  size={18}
                  color={isActive ? theme.primary : theme.textLight}
                />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions (New Trip CTA, Theme Toggle, Language, Profile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Plan Trip CTA */}
          <button
            onClick={onCreateTrip}
            className="btn-primary"
            style={{
              padding: '8px 18px',
              fontSize: '0.9rem',
              borderRadius: '12px',
            }}
          >
            <WebIcon name="plus" size={17} color="#FFFFFF" />
            <span className="cta-text">Plan a Trip</span>
          </button>

          {/* Language Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowLangMenu(!showLangMenu);
                setShowUserMenu(false);
              }}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.input,
                border: `1px solid ${theme.border}`,
                color: theme.text,
                cursor: 'pointer',
              }}
              title="Change Language"
            >
              <WebIcon name="globe" size={18} color={theme.text} />
            </button>

            {showLangMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '160px',
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '14px',
                  boxShadow: 'var(--shadow-xl)',
                  padding: '6px',
                  zIndex: 200,
                  animation: 'scaleUp 0.18s ease-out forwards',
                }}
              >
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      updateSettings({ language: l.label });
                      setShowLangMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: settings.language === l.label ? 700 : 500,
                      color: settings.language === l.label ? theme.primary : theme.text,
                      backgroundColor: settings.language === l.label ? 'var(--primary-light)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{l.label}</span>
                    {settings.language === l.label && <WebIcon name="checkmark" size={14} color={theme.primary} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.input,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <WebIcon name={isDark ? 'sunny' : 'moon'} size={18} color={isDark ? '#F59E0B' : theme.text} />
          </button>

          {/* User Profile Avatar Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowLangMenu(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 6px',
                borderRadius: '12px',
                backgroundColor: theme.input,
                border: `1px solid ${theme.border}`,
                cursor: 'pointer',
              }}
            >
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt={user.name}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: theme.primary,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  {getInitials(user?.name || 'Traveler')}
                </div>
              )}
              <span
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: theme.text,
                  maxWidth: '100px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                className="user-name-text"
              >
                {user?.name?.split(' ')[0] || 'Traveler'}
              </span>
              <WebIcon name="chevron-down" size={14} color={theme.textLight} />
            </button>

            {showUserMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '210px',
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-xl)',
                  padding: '8px',
                  zIndex: 200,
                  animation: 'scaleUp 0.18s ease-out forwards',
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, marginBottom: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: theme.text }}>{user?.name || 'Traveler'}</div>
                  <div style={{ fontSize: '0.78rem', color: theme.textLight, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email || (user?.isGuest ? 'Guest Mode' : 'Connected')}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onNavigate('profile');
                    setShowUserMenu(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    color: theme.text,
                    cursor: 'pointer',
                  }}
                >
                  <WebIcon name="person" size={16} color={theme.textLight} />
                  <span>Profile & Settings</span>
                </button>

                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    color: '#EF4444',
                    cursor: 'pointer',
                  }}
                >
                  <WebIcon name="log-out" size={16} color="#EF4444" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .user-name-text {
            display: none !important;
          }
          .cta-text {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
