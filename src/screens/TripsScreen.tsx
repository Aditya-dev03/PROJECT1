import React, { useState, useMemo, useEffect } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useTheme } from '../context/ThemeContext';
import { useTrips } from '../context/TripContext';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useMembers } from '../context/MemberContext';
import { useItinerary } from '../context/ItineraryContext';
import { useExpenses } from '../context/ExpenseContext';
import { useChat } from '../context/ChatContext';
import { Button } from '../components/Button';
import confetti from 'canvas-confetti';
import {
  lookupTripByJoinCode,
  executeJoinTripByCode,
  normalizeJoinCode,
  getJoinCodeFromClipboard,
  copyJoinCodeToClipboard,
  copyJoinLinkToClipboard,
  TripLookupResult,
  JoinTripSuccessPayload,
} from '../services/joinCodeService';

interface TripsScreenProps {
  onViewTrip: (id: string) => void;
  onCreateTrip?: () => void;
  initialJoinCode?: string;
  autoOpenJoin?: boolean;
}

export const TripsScreen: React.FC<TripsScreenProps> = ({
  onViewTrip,
  onCreateTrip,
  initialJoinCode,
  autoOpenJoin = false,
}) => {
  const { theme, isDark } = useTheme();
  const { trips, addJoinedTrip, refreshTrips, deleteTrip } = useTrips();
  const { syncMembersForTrip } = useMembers();
  const { syncItineraryForTrip } = useItinerary();
  const { syncExpensesForTrip } = useExpenses();
  const { syncMessagesForTrip } = useChat();
  const { t } = useI18n();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Join Modal state
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(autoOpenJoin || Boolean(initialJoinCode));
  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode || '');
  const [isLoading, setIsLoading] = useState(false);
  const [previewTrip, setPreviewTrip] = useState<TripLookupResult | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCodeInput(initialJoinCode);
      setIsJoinModalVisible(true);
      performCodeLookup(initialJoinCode);
    }
  }, [initialJoinCode]);

  const filteredTrips = useMemo(() => {
    const statusFiltered = trips.filter((t) =>
      activeTab === 'active' ? t.status !== 'Completed' : t.status === 'Completed'
    );
    if (!searchQuery.trim()) return statusFiltered;
    return statusFiltered.filter(
      (t) =>
        t.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [trips, activeTab, searchQuery]);

  const handleCopyCode = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    await copyJoinCodeToClipboard(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyLink = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    await copyJoinLinkToClipboard(code);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handlePasteClipboard = async () => {
    const code = await getJoinCodeFromClipboard();
    if (code) {
      setJoinCodeInput(code);
      setJoinError(null);
      performCodeLookup(code);
    }
  };

  const performCodeLookup = async (codeToSearch: string) => {
    const code = normalizeJoinCode(codeToSearch);
    if (!code || code.length !== 6) {
      setJoinError('Please enter a valid 6-character join code.');
      return;
    }

    setIsLoading(true);
    setJoinError(null);
    setPreviewTrip(null);
    try {
      const result = await lookupTripByJoinCode(code, user, trips);
      if (result) {
        setPreviewTrip(result);
      } else {
        setJoinError('No trip found for this code. Make sure the code is correct.');
      }
    } catch (err: any) {
      setJoinError(err?.message || 'Lookup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchCode = () => {
    performCodeLookup(joinCodeInput);
  };

  const handleJoinTrip = async () => {
    if (!previewTrip) return;
    setIsLoading(true);
    setJoinError(null);
    try {
      const code = previewTrip.joinCode || normalizeJoinCode(joinCodeInput);
      const joinedId = await executeJoinTripByCode(
        code,
        user,
        trips,
        async (payload: JoinTripSuccessPayload) => {
          // 1. Add joined trip to local trips state
          addJoinedTrip(payload.trip);

          // 2. Hydrate all collaborative modules if available from the package
          if (payload.package) {
            if (payload.package.members && payload.package.members.length > 0) {
              syncMembersForTrip(payload.trip.id, payload.package.members);
            }
            if (payload.package.itineraryDays && payload.package.itineraryDays.length > 0) {
              syncItineraryForTrip(payload.trip.id, payload.package.itineraryDays);
            }
            if (payload.package.expenses && payload.package.expenses.length > 0) {
              syncExpensesForTrip(payload.trip.id, payload.package.expenses);
            }
            if (payload.package.messages && payload.package.messages.length > 0) {
              syncMessagesForTrip(payload.trip.id, payload.package.messages);
            }
          }

          // 3. Refresh Supabase if logged in
          await refreshTrips();
        }
      );

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore if confetti not supported
      }

      setJoinSuccess(`You have joined ${previewTrip.destination}!`);
      setTimeout(() => {
        setIsJoinModalVisible(false);
        setPreviewTrip(null);
        setJoinCodeInput('');
        setJoinSuccess(null);
        onViewTrip(joinedId);
      }, 800);
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to join trip.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }} className="animate-fade-in">
      <div className="travora-container" style={{ paddingTop: '28px' }}>
        {/* Header Title & Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: theme.text,
                letterSpacing: '-0.03em',
                margin: '0 0 4px 0',
              }}
            >
              {t('nav.trips') || 'My Trips'}
            </h1>
            <p style={{ fontSize: '0.9rem', color: theme.textLight, margin: 0 }}>
              Manage, organize, and view all your travel itineraries
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setIsJoinModalVisible(true);
                setPreviewTrip(null);
                setJoinCodeInput('');
                setJoinError(null);
                setJoinSuccess(null);
              }}
              className="btn-outline"
              style={{
                padding: '8px 18px',
                fontSize: '0.9rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
              }}
            >
              <WebIcon name="people" size={17} color={theme.primary} />
              <span>Join with Code</span>
            </button>
            {onCreateTrip && (
              <button
                onClick={onCreateTrip}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.9rem', borderRadius: '12px' }}
              >
                <WebIcon name="plus" size={17} color="#FFFFFF" />
                <span>New Trip</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs & Search Bar */}
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
          {/* Active / Completed Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: theme.input,
              padding: '4px',
              borderRadius: '14px',
              border: `1px solid ${theme.border}`,
            }}
          >
            <button
              onClick={() => setActiveTab('active')}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'active' ? theme.card : 'transparent',
                color: activeTab === 'active' ? theme.primary : theme.textLight,
                boxShadow: activeTab === 'active' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Active Trips ({trips.filter((t) => t.status !== 'Completed').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'completed' ? theme.card : 'transparent',
                color: activeTab === 'completed' ? theme.primary : theme.textLight,
                boxShadow: activeTab === 'completed' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Completed ({trips.filter((t) => t.status === 'Completed').length})
            </button>
          </div>

          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: theme.input,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '2px 12px',
              minWidth: '240px',
            }}
          >
            <WebIcon name="search" size={16} color={theme.textLight} />
            <input
              type="text"
              placeholder="Search your trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                padding: '8px 10px',
                fontSize: '0.88rem',
                color: theme.text,
                outline: 'none',
                boxShadow: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Trips Grid */}
        {filteredTrips.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              borderRadius: '24px',
            }}
          >
            <WebIcon name="map" size={48} color={theme.textLight} style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, marginBottom: '6px' }}>
              {activeTab === 'active' ? 'No Active Trips Found' : 'No Completed Trips'}
            </h3>
            <p style={{ fontSize: '0.9rem', color: theme.textLight, maxWidth: '380px', margin: '0 auto 20px' }}>
              {activeTab === 'active'
                ? 'Create a new customized itinerary or join a friend’s trip using their 6-character code.'
                : 'Trips marked as completed will appear here in your travel memory archive.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setIsJoinModalVisible(true);
                  setPreviewTrip(null);
                  setJoinCodeInput('');
                  setJoinError(null);
                }}
                className="btn-outline"
                style={{ padding: '10px 20px', borderRadius: '12px' }}
              >
                <WebIcon name="people" size={18} color={theme.primary} />
                <span>Join with Code</span>
              </button>
              {onCreateTrip && activeTab === 'active' && (
                <button onClick={onCreateTrip} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '12px' }}>
                  <WebIcon name="plus" size={18} color="#FFFFFF" />
                  <span>Create a Trip</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => onViewTrip(trip.id)}
                className="glass-panel"
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: `1px solid ${theme.border}`,
                  transition: 'all 0.25s ease',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
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
                {/* Hero Image */}
                <div style={{ position: 'relative', height: '180px' }}>
                  <img
                    src={trip.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'}
                    alt={trip.destination}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)',
                    }}
                  />

                  {/* Budget & Status Badges */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      display: 'flex',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(6px)',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '8px',
                      }}
                    >
                      {trip.budget || 'Standard'}
                    </span>
                    <span
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(6px)',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '8px',
                      }}
                    >
                      {trip.groupSize || 'Friends'}
                    </span>
                  </div>

                  {/* Join Code Badge with Copy Action */}
                  {trip.joinCode && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        display: 'flex',
                        gap: '4px',
                      }}
                    >
                      <button
                        onClick={(e) => handleCopyCode(e, trip.joinCode!)}
                        style={{
                          backgroundColor: copiedCode === trip.joinCode ? '#10B981' : 'rgba(255, 255, 255, 0.92)',
                          color: copiedCode === trip.joinCode ? '#FFFFFF' : '#1F2937',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                        title="Click to copy 6-digit join code"
                      >
                        <WebIcon name={copiedCode === trip.joinCode ? 'checkmark' : 'copy'} size={12} />
                        <span>{copiedCode === trip.joinCode ? 'COPIED!' : trip.joinCode}</span>
                      </button>

                      <button
                        onClick={(e) => handleCopyLink(e, trip.joinCode!)}
                        style={{
                          backgroundColor: copiedLink === trip.joinCode ? '#10B981' : 'rgba(255, 255, 255, 0.92)',
                          color: copiedLink === trip.joinCode ? '#FFFFFF' : '#1F2937',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                        title="Copy direct invite link"
                      >
                        <WebIcon name={copiedLink === trip.joinCode ? 'checkmark' : 'share'} size={12} />
                      </button>
                    </div>
                  )}

                  <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '16px' }}>
                    <h3
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        margin: 0,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      }}
                    >
                      {trip.destination}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: theme.text, marginBottom: '4px' }}>
                      {trip.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        color: theme.textLight,
                        marginBottom: '12px',
                      }}
                    >
                      <WebIcon name="calendar" size={14} color={theme.textLight} />
                      <span>{trip.dates || 'Dates not set'}</span>
                    </div>

                    {/* Interest Chips preview */}
                    {trip.interests && trip.interests.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        {trip.interests.slice(0, 3).map((interest, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: theme.input,
                              color: theme.textLight,
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {interest}
                          </span>
                        ))}
                        {trip.interests.length > 3 && (
                          <span style={{ fontSize: '0.72rem', color: theme.textLight, alignSelf: 'center' }}>
                            +{trip.interests.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: `1px solid ${theme.border}`,
                      paddingTop: '12px',
                      marginTop: '4px',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.primary }}>
                      Open Hub →
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete trip to ${trip.destination}?`)) {
                          deleteTrip(trip.id);
                        }
                      }}
                      style={{
                        color: theme.textLight,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Delete Trip"
                    >
                      <WebIcon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join Trip Modal */}
      {isJoinModalVisible && (
        <div className="modal-overlay" onClick={() => setIsJoinModalVisible(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', padding: '28px', borderRadius: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--primary-light)',
                    color: theme.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WebIcon name="people" size={22} color={theme.primary} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: theme.text, margin: 0 }}>
                    Join Trip with Code
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: theme.textLight }}>Collaborative Travel Sync</span>
                </div>
              </div>
              <button
                onClick={() => setIsJoinModalVisible(false)}
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

            <p style={{ fontSize: '0.88rem', color: theme.textLight, marginBottom: '18px' }}>
              Enter the 6-character join code shared by your friend to automatically sync the itinerary, split expenses, and chat live.
            </p>

            {/* Code Input */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. SANTO1"
                value={joinCodeInput}
                autoFocus
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setJoinCodeInput(val);
                  setJoinError(null);
                  if (val.trim().length === 6) {
                    performCodeLookup(val);
                  } else {
                    setPreviewTrip(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (previewTrip) {
                      handleJoinTrip();
                    } else {
                      handleSearchCode();
                    }
                  }
                }}
                style={{
                  flex: 1,
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  letterSpacing: '3px',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  padding: '12px 14px',
                  borderRadius: '14px',
                }}
              />
              <button
                onClick={handlePasteClipboard}
                style={{
                  padding: '0 16px',
                  borderRadius: '14px',
                  backgroundColor: theme.input,
                  border: `1.5px solid ${theme.border}`,
                  color: theme.text,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
                title="Paste join code or link from clipboard"
              >
                <WebIcon name="copy" size={16} />
                <span>Paste</span>
              </button>
            </div>

            {joinError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  color: '#EF4444',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <WebIcon name="alert-circle" size={16} color="#EF4444" />
                <span>{joinError}</span>
              </div>
            )}

            {joinSuccess && (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  color: '#10B981',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <WebIcon name="checkmark" size={16} color="#10B981" />
                <span>{joinSuccess}</span>
              </div>
            )}

            {/* Trip Preview Card */}
            {previewTrip && (
              <div
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  backgroundColor: isDark ? 'var(--bg-input)' : '#F0FDF4',
                  border: `2px solid ${theme.primary}`,
                  marginBottom: '20px',
                  padding: '14px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.15)',
                }}
              >
                <img
                  src={previewTrip.image}
                  alt={previewTrip.destination}
                  style={{ width: '76px', height: '76px', borderRadius: '12px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        color: theme.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Trip Found ✨
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: theme.input,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        color: theme.textLight,
                      }}
                    >
                      {previewTrip.groupSize || 'Friends'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: theme.text, marginBottom: '2px' }}>
                    {previewTrip.destination}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: theme.textLight, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <WebIcon name="calendar" size={12} color={theme.textLight} />
                    <span>{previewTrip.dates || 'Flexible dates'}</span>
                  </div>
                  {previewTrip.creatorName && (
                    <div style={{ fontSize: '0.78rem', color: theme.primary, fontWeight: 700, marginTop: '4px' }}>
                      Created by: {previewTrip.creatorName}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {previewTrip ? (
              <Button
                title={`Join Trip to ${previewTrip.destination}`}
                loading={isLoading}
                onClick={handleJoinTrip}
              />
            ) : (
              <Button
                title="Search Trip"
                loading={isLoading}
                disabled={joinCodeInput.trim().length < 6}
                onClick={handleSearchCode}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
