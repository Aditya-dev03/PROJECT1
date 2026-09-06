import React, { useState } from 'react';
import { WebIcon } from '../components/WebIcon';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { useI18n } from '../context/I18nContext';
import { useTrips } from '../context/TripContext';
import { useExpenses } from '../context/ExpenseContext';
import { getInitials, formatCurrency, extractCurrencySymbol } from '../utils';

interface ProfileScreenProps {
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const { settings, updateSettings } = useUser();
  const { t } = useI18n();
  const { trips } = useTrips();
  const { expenses } = useExpenses();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [emailInput, setEmailInput] = useState(user?.email || '');

  const currencySymbol = extractCurrencySymbol(settings.currency);

  const totalSpent = expenses
    .filter((e) => e.category !== 'Settlement')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUser({
      name: nameInput.trim() || 'Traveler',
      email: emailInput.trim(),
    });
    setIsEditModalOpen(false);
  };

  const currencies = [
    'INR (₹)',
    'USD ($)',
    'EUR (€)',
    'GBP (£)',
    'JPY (¥)',
    'AUD (A$)',
    'CAD (C$)',
    'AED (AED)',
  ];

  const languages = [
    { label: 'English (US)', code: 'en' },
    { label: 'Hindi (IN)', code: 'hi' },
    { label: 'French (FR)', code: 'fr' },
    { label: 'Spanish (ES)', code: 'es' },
  ];

  return (
    <div style={{ paddingBottom: '80px' }} className="animate-fade-in">
      <div className="travora-container" style={{ maxWidth: '780px', paddingTop: '28px' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: theme.text,
              letterSpacing: '-0.03em',
              margin: '0 0 4px 0',
            }}
          >
            {t('nav.profile') || 'User Profile & Settings'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: theme.textLight, margin: 0 }}>
            Manage your account preferences, currencies, and travel statistics
          </p>
        </div>

        {/* Profile Card */}
        <div
          className="glass-panel"
          style={{
            padding: '28px',
            borderRadius: '24px',
            marginBottom: '28px',
            border: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {user?.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: theme.primary,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.6rem',
                  boxShadow: '0 4px 14px var(--primary-glow)',
                }}
              >
                {getInitials(user?.name || 'Traveler')}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                  {user?.name || 'Traveler'}
                </h2>
                {user?.isGuest ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: theme.primary,
                      backgroundColor: 'var(--primary-light)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    GUEST
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#10B981',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    ✓ GOOGLE ACCOUNT
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.88rem', color: theme.textLight, margin: '4px 0 0 0' }}>
                {user?.email || user?.phone || 'Connected session'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setNameInput(user?.name || '');
              setEmailInput(user?.email || '');
              setIsEditModalOpen(true);
            }}
            className="btn-outline"
            style={{ padding: '8px 16px', fontSize: '0.88rem', borderRadius: '12px' }}
          >
            <WebIcon name="create" size={16} color={theme.primary} />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Travel Stats Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            className="glass-panel"
            style={{ padding: '20px', borderRadius: '18px', textAlign: 'center', border: `1px solid ${theme.border}` }}
          >
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.primary }}>
              {trips.length}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: theme.textLight, marginTop: '2px' }}>
              Trips Planned
            </div>
          </div>

          <div
            className="glass-panel"
            style={{ padding: '20px', borderRadius: '18px', textAlign: 'center', border: `1px solid ${theme.border}` }}
          >
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00A699' }}>
              {expenses.length}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: theme.textLight, marginTop: '2px' }}>
              Expenses Logged
            </div>
          </div>

          <div
            className="glass-panel"
            style={{ padding: '20px', borderRadius: '18px', textAlign: 'center', border: `1px solid ${theme.border}` }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F59E0B' }}>
              {formatCurrency(totalSpent, currencySymbol)}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: theme.textLight, marginTop: '2px' }}>
              Total Managed
            </div>
          </div>
        </div>

        {/* App Settings List */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            borderRadius: '24px',
            marginBottom: '32px',
            border: `1px solid ${theme.border}`,
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: theme.text, marginBottom: '20px' }}>
            Preferences & Settings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Theme Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '14px',
                backgroundColor: theme.input,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <WebIcon name={isDark ? 'moon' : 'sunny'} size={20} color={theme.primary} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: theme.text }}>Dark Theme</div>
                  <div style={{ fontSize: '0.78rem', color: theme.textLight }}>
                    {isDark ? 'Dark mode enabled' : 'Light mode enabled'}
                  </div>
                </div>
              </div>

              <button
                onClick={toggleTheme}
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  backgroundColor: isDark ? theme.primary : '#D1D5DB',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    position: 'absolute',
                    top: '3px',
                    left: isDark ? '25px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>

            {/* Currency Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '14px',
                backgroundColor: theme.input,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <WebIcon name="card" size={20} color={theme.primary} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: theme.text }}>Primary Currency</div>
                  <div style={{ fontSize: '0.78rem', color: theme.textLight }}>For itinerary and expense budgets</div>
                </div>
              </div>

              <select
                value={settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value })}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.card,
                  color: theme.text,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '14px',
                backgroundColor: theme.input,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <WebIcon name="globe" size={20} color={theme.primary} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: theme.text }}>App Language</div>
                  <div style={{ fontSize: '0.78rem', color: theme.textLight }}>Select preferred interface locale</div>
                </div>
              </div>

              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.card,
                  color: theme.text,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.label}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={async () => {
            await logout();
            if (onLogout) onLogout();
          }}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#EF4444',
            border: '1.5px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.95rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <WebIcon name="log-out" size={18} color="#EF4444" />
          <span>Sign Out of Travora</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px', padding: '28px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                Edit Profile
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: theme.input,
                  border: 'none',
                  color: theme.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <WebIcon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <Button title="Save Profile" type="submit" />
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
