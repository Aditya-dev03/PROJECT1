import React from 'react';
import { WebIcon } from './WebIcon';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

interface BottomNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onCreateTrip: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  onCreateTrip,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();

  const navItems = [
    { id: 'home', label: t('nav.home') || 'Home', icon: 'home' },
    { id: 'trips', label: t('nav.trips') || 'Trips', icon: 'map' },
    { id: 'create_trip', label: 'Plan', icon: 'plus', isCta: true },
    { id: 'expenses', label: t('nav.expenses') || 'Expenses', icon: 'wallet' },
    { id: 'profile', label: t('nav.profile') || 'Profile', icon: 'person' },
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '68px',
        backgroundColor: isDark ? 'rgba(10, 26, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: `1px solid ${theme.border}`,
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        zIndex: 99,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
      }}
    >
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;

        if (item.isCta) {
          return (
            <button
              key={item.id}
              onClick={onCreateTrip}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: theme.primary,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px var(--primary-glow)',
                border: 'none',
                cursor: 'pointer',
                transform: 'translateY(-10px)',
              }}
              title="Create New Trip"
            >
              <WebIcon name="plus" size={24} color="#FFFFFF" />
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '6px 12px',
              borderRadius: '10px',
              color: isActive ? theme.primary : theme.textLight,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              minWidth: '54px',
            }}
          >
            <WebIcon
              name={item.icon}
              size={20}
              color={isActive ? theme.primary : theme.textLight}
            />
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '-0.01em',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}

      <style>{`
        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex !important;
          }
        }
      `}</style>
    </nav>
  );
};
