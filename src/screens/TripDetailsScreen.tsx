import React, { useMemo, useState } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useTheme } from '../context/ThemeContext';
import { useTrips } from '../context/TripContext';
import { useMembers } from '../context/MemberContext';
import { useExpenses } from '../context/ExpenseContext';
import { useItinerary } from '../context/ItineraryContext';
import { useUser } from '../context/UserContext';
import { useI18n } from '../context/I18nContext';
import { formatCurrency, extractCurrencySymbol, calculateBudgetStats, copyJoinCodeToClipboard } from '../utils';
import { Trip } from '../types';

interface TripDetailsProps {
  onBack: () => void;
  onGenerateAI: () => void;
  onViewMembers: () => void;
  onViewExpenses: () => void;
  onOpenChat: () => void;
  onOpenLiveTracking?: () => void;
  tripData?: Trip;
}

export const TripDetailsScreen: React.FC<TripDetailsProps> = ({
  onBack,
  onGenerateAI,
  onViewMembers,
  onViewExpenses,
  onOpenChat,
  onOpenLiveTracking,
  tripData,
}) => {
  const { theme, isDark } = useTheme();
  const { settings } = useUser();
  const { t } = useI18n();
  const tripId = tripData?.id || '';

  const { updateTrip } = useTrips();
  const { getMembersByTripId } = useMembers();
  const { getExpensesByTripId } = useExpenses();
  const { getItineraryByTripId } = useItinerary();

  const members = getMembersByTripId(tripId);
  const expenses = getExpensesByTripId(tripId);
  const itinerary = getItineraryByTripId(tripId);

  const [copied, setCopied] = useState(false);

  const currencySymbol = useMemo(() => extractCurrencySymbol(settings.currency), [settings.currency]);

  const budget = useMemo(() => {
    const total = tripData?.budgetAmount || 50000;
    const stats = calculateBudgetStats(total, expenses);
    return {
      total: formatCurrency(stats.total, currencySymbol),
      spent: formatCurrency(stats.spent, currencySymbol),
      remaining: formatCurrency(stats.remaining, currencySymbol),
      percentage: stats.percentage,
    };
  }, [tripData?.budgetAmount, expenses, currencySymbol]);

  if (!tripData) return null;

  const isCompleted = tripData.status === 'Completed';

  const handleCopyCode = async () => {
    if (tripData.joinCode) {
      await copyJoinCodeToClipboard(tripData.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalActivities = (itinerary?.days || []).reduce(
    (sum, d) => sum + (d.activities?.length || 0),
    0
  );

  return (
    <div style={{ paddingBottom: '80px' }} className="animate-fade-in">
      {/* Hero Destination Banner */}
      <div style={{ position: 'relative', height: '280px', overflow: 'hidden' }}>
        <img
          src={tripData.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80'}
          alt={tripData.destination}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* Back and Controls Header */}
        <div
          className="travora-container"
          style={{
            position: 'absolute',
            top: '20px',
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              padding: '8px 14px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
            }}
          >
            <WebIcon name="chevron-back" size={16} />
            <span>Back</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {tripData.joinCode && (
              <button
                onClick={handleCopyCode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: copied ? '#10B981' : 'rgba(255, 255, 255, 0.9)',
                  color: copied ? '#FFFFFF' : '#1F2937',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                <WebIcon name={copied ? 'checkmark' : 'copy'} size={14} />
                <span>{copied ? 'CODE COPIED!' : `CODE: ${tripData.joinCode}`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div
          className="travora-container"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: 0,
            right: 0,
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                backgroundColor: isCompleted ? '#6B7280' : '#10B981',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
              }}
            >
              ● {isCompleted ? 'COMPLETED' : 'ACTIVE'}
            </span>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {tripData.budget}
            </span>
          </div>

          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: '#FFFFFF',
              margin: '0 0 4px 0',
              letterSpacing: '-0.03em',
            }}
          >
            {tripData.destination}
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.85)', margin: 0 }}>
            {tripData.name} · {tripData.dates || 'Scheduled Dates'}
          </p>
        </div>
      </div>

      {/* Main Hub Content */}
      <div className="travora-container" style={{ paddingTop: '28px' }}>
        {/* Hub Navigation Cards */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, marginBottom: '16px' }}>
            Trip Modules
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {/* 1. Group Chat */}
            <div
              onClick={onOpenChat}
              className="glass-panel card-lift press-scale"
              style={{
                padding: '20px',
                borderRadius: '18px',
                cursor: 'pointer',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
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
                  boxShadow: '0 4px 12px rgba(255, 90, 95, 0.35)',
                }}
              >
                <WebIcon name="chat" size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.text }}>Trip Chat & Feed</div>
                <div style={{ fontSize: '0.8rem', color: theme.textLight }}>Realtime buddy messaging</div>
              </div>
            </div>

            {/* 2. AI Itinerary */}
            <div
              onClick={onGenerateAI}
              className="glass-panel card-lift press-scale"
              style={{
                padding: '20px',
                borderRadius: '18px',
                cursor: 'pointer',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
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
                  boxShadow: '0 4px 12px rgba(0, 166, 153, 0.35)',
                }}
              >
                <WebIcon name="sparkles" size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.text }}>AI Itinerary</div>
                <div style={{ fontSize: '0.8rem', color: theme.textLight }}>{totalActivities} planned spots</div>
              </div>
            </div>

            {/* 3. Expenses & Split */}
            <div
              onClick={onViewExpenses}
              className="glass-panel card-lift press-scale"
              style={{
                padding: '20px',
                borderRadius: '18px',
                cursor: 'pointer',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
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
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                }}
              >
                <WebIcon name="wallet" size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.text }}>Expenses & Split</div>
                <div style={{ fontSize: '0.8rem', color: theme.textLight }}>{expenses.length} expenses logged</div>
              </div>
            </div>

            {/* 4. Group Members */}
            <div
              onClick={onViewMembers}
              className="glass-panel card-lift press-scale"
              style={{
                padding: '20px',
                borderRadius: '18px',
                cursor: 'pointer',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #8C24B2 0%, #BA68C8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(140, 36, 178, 0.35)',
                }}
              >
                <WebIcon name="people" size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.text }}>Travel Buddies</div>
                <div style={{ fontSize: '0.8rem', color: theme.textLight }}>{members.length} members & code</div>
              </div>
            </div>

            {/* 5. Live Map Tracker */}
            {onOpenLiveTracking && (
              <div
                onClick={onOpenLiveTracking}
                className="glass-panel card-lift press-scale"
                style={{
                  padding: '20px',
                  borderRadius: '18px',
                  cursor: 'pointer',
                  border: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #007AFF 0%, #60A5FA 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(0, 122, 255, 0.35)',
                  }}
                >
                  <WebIcon name="navigate" size={22} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.text }}>Live Map Tracker</div>
                  <div style={{ fontSize: '0.8rem', color: theme.textLight }}>GPS live tracking & routes</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div
          className="glass-panel card-lift"
          style={{
            padding: '24px',
            borderRadius: '20px',
            marginBottom: '32px',
            border: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text, margin: '0 0 2px 0' }}>
                Trip Budget Overview
              </h3>
              <p style={{ fontSize: '0.82rem', color: theme.textLight, margin: 0 }}>
                Track overall spending vs target limit
              </p>
            </div>
            <button
              onClick={onViewExpenses}
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: theme.primary,
                backgroundColor: 'var(--primary-light)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              View Split Details →
            </button>
          </div>

          <div
            style={{
              height: '10px',
              backgroundColor: theme.input,
              borderRadius: '5px',
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: `${Math.min(budget.percentage, 100)}%`,
                height: '100%',
                background:
                  budget.percentage > 90
                    ? 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
                    : 'linear-gradient(90deg, #FF5A5F 0%, #FF8A8A 60%, #00A699 100%)',
                borderRadius: '5px',
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: budget.percentage > 0 ? '0 0 10px rgba(255, 90, 95, 0.4)' : 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ backgroundColor: theme.input, padding: '12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: theme.textLight, fontWeight: 600 }}>Total Budget</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text }}>{budget.total}</div>
            </div>
            <div style={{ backgroundColor: theme.input, padding: '12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: theme.textLight, fontWeight: 600 }}>Spent So Far</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.primary }}>{budget.spent}</div>
            </div>
            <div style={{ backgroundColor: theme.input, padding: '12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: theme.textLight, fontWeight: 600 }}>Remaining</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981' }}>{budget.remaining}</div>
            </div>
          </div>
        </div>

        {/* Trip Management Status Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: theme.input,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: theme.text }}>
              {isCompleted ? 'This trip is archived as Completed' : 'Mark Trip as Completed'}
            </div>
            <div style={{ fontSize: '0.82rem', color: theme.textLight }}>
              {isCompleted
                ? 'You can reopen this trip at any time to add new expenses or activities.'
                : 'Move to completed trips when your journey ends.'}
            </div>
          </div>

          <button
            onClick={() => updateTrip(tripId, { status: isCompleted ? 'Active' : 'Completed' })}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              backgroundColor: isCompleted ? theme.card : '#6B7280',
              color: isCompleted ? theme.primary : '#FFFFFF',
              border: `1px solid ${isCompleted ? theme.border : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            {isCompleted ? 'Reopen Trip' : 'Complete Trip'}
          </button>
        </div>
      </div>
    </div>
  );
};
