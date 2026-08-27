import React, { useEffect } from 'react';
import { WebIcon } from './WebIcon';
import { useTheme } from '../context/ThemeContext';
import { Activity } from '../types';

interface ActivityDetailModalProps {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  visible,
  activity,
  onClose,
}) => {
  const { theme, isDark } = useTheme();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible || !activity) return null;

  const details = activity.placeDetails;
  const photos = details?.photos || (activity.photo ? [activity.photo] : []);

  const handleOpenDirections = () => {
    const lat = details?.latitude || activity.coordinates?.latitude;
    const lng = details?.longitude || activity.coordinates?.longitude;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    } else if (activity.location || details?.address) {
      const query = encodeURIComponent(activity.location || details?.address || activity.name);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: theme.primary,
                backgroundColor: 'var(--primary-light)',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              {activity.time}
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text, margin: 0 }}>
              {activity.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: theme.input,
              color: theme.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <WebIcon name="close" size={18} />
          </button>
        </div>

        {/* Gallery / Hero Photo */}
        {photos.length > 0 ? (
          <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
            <img
              src={photos[0]}
              alt={activity.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {photos.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: '#FFFFFF',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              >
                1 of {photos.length} photos
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              height: '140px',
              backgroundColor: isDark ? theme.input : '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WebIcon name="map" size={48} color={theme.textLight} />
          </div>
        )}

        {/* Body Content */}
        <div style={{ padding: '24px' }}>
          {/* Metadata Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-light)',
                  color: theme.primary,
                  textTransform: 'capitalize',
                }}
              >
                {activity.category || 'Sightseeing'}
              </span>
              {activity.estimatedCost && (
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? '#152A3D' : '#F3F4F6',
                    color: theme.text,
                  }}
                >
                  {activity.estimatedCost}
                </span>
              )}
            </div>

            {activity.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B', fontWeight: 700 }}>
                <WebIcon name="star" size={16} color="#F59E0B" />
                <span>{activity.rating}</span>
                <span style={{ fontSize: '0.8rem', color: theme.textLight, fontWeight: 500 }}>(Verified Spot)</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme.textLight, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              About
            </h4>
            <p style={{ fontSize: '0.95rem', color: theme.text, lineHeight: 1.6, margin: 0 }}>
              {activity.description || 'A highly rated venue chosen specifically for your customized itinerary.'}
            </p>
          </div>

          {/* AI Note */}
          {activity.note && (
            <div
              style={{
                backgroundColor: isDark ? 'rgba(0, 166, 153, 0.15)' : 'rgba(0, 166, 153, 0.08)',
                border: '1px solid rgba(0, 166, 153, 0.3)',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <WebIcon name="sparkles" size={18} color="#00A699" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00A699', marginBottom: '2px' }}>
                  AI Recommendation Note
                </div>
                <div style={{ fontSize: '0.88rem', color: theme.text, lineHeight: 1.5 }}>
                  {activity.note}
                </div>
              </div>
            </div>
          )}

          {/* Location Address */}
          {(activity.location || details?.address) && (
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <WebIcon name="location" size={18} color={theme.textLight} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.88rem', color: theme.textLight }}>
                {activity.location || details?.address}
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleOpenDirections}
              className="btn-primary"
              style={{ flex: 1, height: '48px', fontSize: '0.92rem' }}
            >
              <WebIcon name="navigate" size={17} color="#FFFFFF" />
              <span>Get Directions</span>
            </button>
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1, height: '48px', fontSize: '0.92rem' }}
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
