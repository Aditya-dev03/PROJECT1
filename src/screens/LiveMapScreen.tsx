import React, { useState, useMemo } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useTheme } from '../context/ThemeContext';
import { useItinerary } from '../context/ItineraryContext';
import { useMembers } from '../context/MemberContext';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { Trip, Coordinates } from '../types';
import { InteractiveMap } from '../components/InteractiveMap';
import { MemberActivityPanel } from '../components/MemberActivityPanel';
import { ActivityDetailModal } from '../components/ActivityDetailModal';

interface LiveMapProps {
  onBack: () => void;
  tripData: Trip;
}

export const LiveMapScreen: React.FC<LiveMapProps> = ({ onBack, tripData }) => {
  const { theme, isDark } = useTheme();
  const tripId = tripData.id;

  const { getItineraryByTripId } = useItinerary();
  const { getMembersByTripId } = useMembers();

  const itinerary = getItineraryByTripId(tripId);
  const members = getMembersByTripId(tripId);

  const { memberLocations, userLocation } = useLiveLocation(tripId, members);

  const [selectedPin, setSelectedPin] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [focusCoords, setFocusCoords] = useState<Coordinates | null>(null);

  // Flatten all activities from all days into pins
  const activityPins = useMemo(() => {
    const pins: any[] = [];
    (itinerary?.days || []).forEach((day) => {
      (day.activities || []).forEach((act) => {
        if (act.coordinates?.latitude && act.coordinates?.longitude) {
          pins.push({
            id: act.id,
            name: act.name,
            category: act.category,
            time: act.time,
            photo: act.photo,
            address: act.location,
            coordinates: act.coordinates,
            rawActivity: act,
          });
        }
      });
    });
    return pins;
  }, [itinerary]);

  const mapCenter = useMemo(() => {
    if (activityPins.length > 0 && activityPins[0].coordinates) {
      return activityPins[0].coordinates;
    }
    if (userLocation) {
      return userLocation;
    }
    return { latitude: 36.4166, longitude: 25.4324 }; // Default
  }, [activityPins, userLocation]);

  const handleSelectActivity = (pin: any) => {
    setSelectedPin(pin.rawActivity || pin);
    setModalVisible(true);
  };

  const handleFocusMember = (latitude: number, longitude: number) => {
    setFocusCoords({ latitude, longitude });
  };

  return (
    <div style={{ paddingBottom: '60px' }} className="animate-fade-in">
      <div className="travora-container" style={{ paddingTop: '24px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onBack}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: theme.input,
                border: `1px solid ${theme.border}`,
                color: theme.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <WebIcon name="chevron-back" size={20} />
            </button>
            <div>
              <h1
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  color: theme.text,
                  letterSpacing: '-0.03em',
                  margin: 0,
                }}
              >
                Live Map & Route Tracker
              </h1>
              <p style={{ fontSize: '0.9rem', color: theme.textLight, margin: 0 }}>
                {tripData.destination} · Realtime GPS Buddy Radar
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              padding: '6px 14px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <span>Live Sync Active</span>
          </div>
        </div>

        {/* Responsive Map & Buddy Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: '24px',
          }}
          className="map-grid-container"
        >
          {/* Map Column */}
          <div>
            <InteractiveMap
              center={mapCenter}
              zoom={13}
              activityPins={activityPins}
              memberLocations={memberLocations}
              onSelectActivity={handleSelectActivity}
              selectedCoords={focusCoords}
              height="600px"
            />
          </div>

          {/* Sidebar: Member Activity Panel & Route Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <MemberActivityPanel
              theme={theme}
              isDark={isDark}
              members={memberLocations}
              onFocusMember={handleFocusMember}
            />

            {/* Spots on Map Checklist */}
            <div
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '20px',
                border: `1px solid ${theme.border}`,
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: '0 0 12px 0' }}>
                Mapped Route Spots ({activityPins.length})
              </h4>

              {activityPins.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: theme.textLight }}>
                  No spots with GPS coordinates in itinerary yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {activityPins.map((pin, idx) => (
                    <div
                      key={pin.id}
                      onClick={() => setFocusCoords(pin.coordinates)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: theme.input,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: theme.primary,
                            color: '#FFFFFF',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.text }}>
                          {pin.name}
                        </span>
                      </div>
                      <WebIcon name="navigate" size={14} color={theme.textLight} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Details Modal */}
      <ActivityDetailModal
        visible={modalVisible}
        activity={selectedPin}
        onClose={() => setModalVisible(false)}
      />

      <style>{`
        @media (max-width: 900px) {
          .map-grid-container {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};
