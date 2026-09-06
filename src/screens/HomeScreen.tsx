import React, { useState, useMemo } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { useTrips } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils';

interface HomeScreenProps {
  onCreateTrip: () => void;
  onViewTrip: (id: string) => void;
  onJoinTrip?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

const POPULAR_DESTINATIONS = [
  {
    name: 'Bali, Indonesia',
    tag: 'Island Paradise',
    rating: '4.9',
    price: '₹45,000',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Santorini, Greece',
    tag: 'Cliffside Sunset',
    rating: '4.95',
    price: '₹75,000',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Tokyo, Japan',
    tag: 'Futuristic & Culture',
    rating: '4.92',
    price: '₹60,000',
    image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Paris, France',
    tag: 'Art & Gastronomy',
    rating: '4.88',
    price: '₹68,000',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onCreateTrip,
  onViewTrip,
  onJoinTrip,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const { trips, isLoaded: tripsLoaded } = useTrips();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const upcomingTrip = trips.length > 0 ? trips[0] : null;

  const filteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_DESTINATIONS;
    return POPULAR_DESTINATIONS.filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div style={{ paddingBottom: '80px' }} className="animate-fade-in">
      <div className="travora-container" style={{ paddingTop: '28px' }}>
        {/* Welcome Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: theme.textLight }}>
              {t('home.greeting') || 'Welcome back'}
            </div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: theme.text,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              {user?.name?.split(' ')[0] || 'Traveler'}! 👋
            </h1>
          </div>

          {/* Quick Create and Join CTAs */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {onJoinTrip && (
              <button
                onClick={onJoinTrip}
                className="btn-outline"
                style={{
                  borderRadius: '14px',
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                }}
              >
                <WebIcon name="people" size={18} color={theme.primary} />
                <span>Join with Code</span>
              </button>
            )}
            <button
              onClick={onCreateTrip}
              className="btn-primary"
              style={{ borderRadius: '14px', padding: '10px 22px' }}
            >
              <WebIcon name="plus" size={20} color="#FFFFFF" />
              <span>Create New Trip</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: theme.input,
            border: `1.5px solid ${theme.border}`,
            borderRadius: '16px',
            padding: '4px 16px',
            marginBottom: '32px',
            boxShadow: 'var(--shadow-sm)',
            maxWidth: '680px',
          }}
        >
          <WebIcon name="search" size={20} color={theme.textLight} />
          <input
            type="text"
            placeholder={t('home.searchPlaceholder') || 'Search destinations, trips, cities...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              padding: '12px 14px',
              fontSize: '0.95rem',
              color: theme.text,
              outline: 'none',
              boxShadow: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                color: theme.textLight,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <WebIcon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Hero: Upcoming Trip or Empty State */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: theme.text, margin: 0 }}>
              {upcomingTrip ? t('home.upcomingTrip') || 'Upcoming Adventure' : t('home.startJourney') || 'Your Journey Begins'}
            </h2>
            {upcomingTrip && (
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                }}
              >
                ● ACTIVE
              </span>
            )}
          </div>

          {upcomingTrip ? (
            <div
              onClick={() => onViewTrip(upcomingTrip.id)}
              style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                cursor: 'pointer',
                minHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                boxShadow: 'var(--shadow-xl)',
                border: `1px solid ${theme.border}`,
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 20px 35px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
              }}
            >
              <img
                src={upcomingTrip.image}
                alt={upcomingTrip.destination}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)',
                }}
              />

              <div style={{ position: 'relative', padding: '28px', color: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    style={{
                      backgroundColor: theme.primary,
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {upcomingTrip.budget} Tier
                  </span>
                  {upcomingTrip.joinCode && (
                    <span
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(8px)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        letterSpacing: '1px',
                      }}
                    >
                      CODE: {upcomingTrip.joinCode}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px 0' }}>
                  {upcomingTrip.destination}
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.85)', margin: '0 0 18px 0' }}>
                  {upcomingTrip.name} · {upcomingTrip.dates || 'Dates scheduled'}
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="btn-primary"
                    style={{ padding: '8px 18px', fontSize: '0.88rem', borderRadius: '10px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTrip(upcomingTrip.id);
                    }}
                  >
                    <WebIcon name="chat" size={16} color="#FFFFFF" />
                    <span>Open Trip Hub</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="glass-panel"
              style={{
                padding: '48px 32px',
                textAlign: 'center',
                borderRadius: '24px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--primary-light)',
                  color: theme.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <WebIcon name="airplane" size={32} color={theme.primary} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: theme.text, marginBottom: '8px' }}>
                {t('home.noTripsTitle') || 'No Trips Planned Yet'}
              </h3>
              <p style={{ fontSize: '0.92rem', color: theme.textLight, maxWidth: '420px', margin: '0 auto 24px' }}>
                {t('home.noTripsSub') || 'Create your first collaborative trip or join your travel buddies using a 6-digit join code.'}
              </p>
              <button onClick={onCreateTrip} className="btn-primary">
                <WebIcon name="plus" size={18} color="#FFFFFF" />
                <span>Start Planning Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Action Tiles */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, marginBottom: '16px' }}>
            Quick Actions
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              onClick={onCreateTrip}
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #FF5A5F 0%, #FF8A8A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <WebIcon name="sparkles" size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: theme.text }}>AI Trip Planner</div>
                <div style={{ fontSize: '0.8rem', color: theme.textLight }}>Auto-generate custom plan</div>
              </div>
            </div>

            <div
              onClick={onJoinTrip || onCreateTrip}
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #00A699 0%, #00C4B4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <WebIcon name="people" size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: theme.text }}>Group Travel</div>
                <div style={{ fontSize: '0.8rem', color: theme.textLight }}>Invite buddies via join code</div>
              </div>
            </div>

            <div
              onClick={() => {
                if (upcomingTrip) onViewTrip(upcomingTrip.id);
                else onCreateTrip();
              }}
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <WebIcon name="wallet" size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: theme.text }}>Split Expenses</div>
                <div style={{ fontSize: '0.8rem', color: theme.textLight }}>Equal & custom settlements</div>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Destinations Showcase */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, margin: 0 }}>
              {t('home.popularDestinations') || 'Trending Travel Spots'}
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredDestinations.map((dest, idx) => (
              <div
                key={idx}
                onClick={onCreateTrip}
                className="glass-panel"
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  border: `1px solid ${theme.border}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <div style={{ position: 'relative', height: '170px' }}>
                  <img
                    src={dest.image}
                    alt={dest.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      color: '#FFFFFF',
                      backdropFilter: 'blur(6px)',
                      padding: '4px 8px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <WebIcon name="star" size={12} color="#F59E0B" />
                    <span>{dest.rating}</span>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.92)',
                      color: '#1F2937',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {dest.tag}
                  </div>
                </div>

                <div style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: theme.text, margin: '0 0 4px 0' }}>
                    {dest.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: theme.textLight }}>Est. Budget</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: theme.primary }}>
                      {dest.price}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
