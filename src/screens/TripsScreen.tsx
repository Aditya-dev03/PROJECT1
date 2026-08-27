import React, { useState, useMemo } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useTheme } from '../context/ThemeContext';
import { useTrips } from '../context/TripContext';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import {
  lookupTripByJoinCode,
  executeJoinTripByCode,
  normalizeJoinCode,
  getJoinCodeFromClipboard,
  copyJoinCodeToClipboard,
  TripLookupResult,
} from '../services/joinCodeService';

interface TripsScreenProps {
  onViewTrip: (id: string) => void;
  onCreateTrip?: () => void;
}

export const TripsScreen: React.FC<TripsScreenProps> = ({
  onViewTrip,
  onCreateTrip,
}) => {
  const { theme, isDark } = useTheme();
  const { trips, refreshTrips, deleteTrip } = useTrips();
  const { t } = useI18n();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Join Modal state
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewTrip, setPreviewTrip] = useState<TripLookupResult | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

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

  const handleCopy = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    await copyJoinCodeToClipboard(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePasteClipboard = async () => {
    const code = await getJoinCodeFromClipboard();
    if (code) {
      setJoinCodeInput(code);
      setJoinError(null);
    }
  };

  const handleSearchCode = async () => {
    const code = normalizeJoinCode(joinCodeInput);
    if (!code || code.length < 5) {
      setJoinError('Please enter a valid 6-character join code.');
      return;
    }

    setIsLoading(true);
    setJoinError(null);
    try {
      const result = await lookupTripByJoinCode(code, user, trips);
      if (result) {
        setPreviewTrip(result);
      } else {
        setJoinError('No trip found for this code. Please check and try again.');
      }
    } catch (err: any) {
      setJoinError(err?.message || 'Lookup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTrip = async () => {
    if (!previewTrip) return;
    setIsLoading(true);
    setJoinError(null);
    try {
      const code = previewTrip.joinCode || normalizeJoinCode(joinCodeInput);
      const joinedId = await executeJoinTripByCode(code, user, trips, async () => {
        await refreshTrips();
      });
      setIsJoinModalVisible(false);
      setPreviewTrip(null);
      setJoinCodeInput('');
      onViewTrip(joinedId);
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
              }}
              className="btn-outline"
              style={{ padding: '8px 18px', fontSize: '0.9rem', borderRadius: '12px' }}
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
                ? 'Create a new customized itinerary or join a friend’s trip using a join code.'
                : 'Trips marked as completed will appear here in your travel memory archive.'}
            </p>
            {onCreateTrip && activeTab === 'active' && (
              <button onClick={onCreateTrip} className="btn-primary">
                <WebIcon name="plus" size={18} color="#FFFFFF" />
                <span>Create a Trip</span>
              </button>
            )}
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

                  {/* Join Code Badge */}
                  {trip.joinCode && (
                    <button
                      onClick={(e) => handleCopy(e, trip.joinCode!)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
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
                      title="Click to copy join code"
                    >
                      <WebIcon name={copiedCode === trip.joinCode ? 'checkmark' : 'copy'} size={12} />
                      <span>{copiedCode === trip.joinCode ? 'COPIED!' : trip.joinCode}</span>
                    </button>
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
            style={{ maxWidth: '480px', padding: '28px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--primary-light)',
                    color: theme.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WebIcon name="people" size={20} color={theme.primary} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                  Join Trip with Code
                </h3>
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

            <p style={{ fontSize: '0.88rem', color: theme.textLight, marginBottom: '20px' }}>
              Enter the 6-character code shared by your friend to view itinerary, chat, and split costs.
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
                  setJoinCodeInput(e.target.value.toUpperCase());
                  setJoinError(null);
                  setPreviewTrip(null);
                }}
                style={{
                  flex: 1,
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              />
              <button
                onClick={handlePasteClipboard}
                style={{
                  padding: '0 14px',
                  borderRadius: '12px',
                  backgroundColor: theme.input,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
                title="Paste from clipboard"
              >
                <WebIcon name="copy" size={16} />
                <span>Paste</span>
              </button>
            </div>

            {joinError && (
              <div style={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 500, marginBottom: '16px' }}>
                {joinError}
              </div>
            )}

            {/* Trip Preview Card */}
            {previewTrip ? (
              <div
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: isDark ? 'var(--bg-input)' : '#F9FAFB',
                  border: `1.5px solid ${theme.primary}`,
                  marginBottom: '20px',
                  padding: '12px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <img
                  src={previewTrip.image}
                  alt={previewTrip.destination}
                  style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover' }}
                />
                <div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: theme.primary,
                      textTransform: 'uppercase',
                    }}
                  >
                    Trip Found
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: theme.text }}>
                    {previewTrip.destination}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: theme.textLight }}>
                    {previewTrip.dates || 'Scheduled Dates'}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            {previewTrip ? (
              <Button
                title="Join This Adventure"
                loading={isLoading}
                onClick={handleJoinTrip}
              />
            ) : (
              <Button
                title="Search Trip"
                loading={isLoading}
                disabled={joinCodeInput.trim().length < 5}
                onClick={handleSearchCode}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
