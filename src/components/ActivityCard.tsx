import React from 'react';
import { WebIcon } from './WebIcon';
import { useTheme } from '../context/ThemeContext';
import { Activity } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: '#FF5A5F',
  cafe: '#FFB400',
  beach: '#00A699',
  hotel: '#8C24B2',
  attraction: '#007AFF',
  museum: '#5856D6',
  nightlife: '#FF2D55',
  shopping: '#34C759',
};

interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();
  const catColor = CATEGORY_COLORS[activity.category ?? ''] ?? theme.primary;

  return (
    <div
      onClick={onPress}
      className="card-lift press-scale"
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: theme.card,
        border: `1px solid ${theme.border}`,
        borderLeft: `4px solid ${catColor}`,
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        minHeight: '104px',
        position: 'relative',
      }}
    >
      {/* Left: Thumbnail with zoom effect */}
      <div
        style={{
          width: '112px',
          height: '104px',
          flexShrink: 0,
          backgroundColor: isDark ? theme.input : '#F3F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {activity.photo ? (
          <img
            src={activity.photo}
            alt={activity.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ) : (
          <WebIcon name={activity.icon || 'map'} size={28} color={catColor} />
        )}
      </div>

      {/* Center: Content */}
      <div style={{ flex: 1, padding: '12px 16px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: catColor,
            }}
          >
            {activity.time}
          </span>
          {activity.rating != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B' }}>
              <WebIcon name="star" size={12} color="#F59E0B" />
              <span>{activity.rating}</span>
            </div>
          )}
          {activity.category && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'capitalize',
                padding: '1px 6px',
                borderRadius: '6px',
                backgroundColor: `${catColor}18`,
                color: catColor,
              }}
            >
              {activity.category}
            </span>
          )}
        </div>

        <h4
          style={{
            fontSize: '0.98rem',
            fontWeight: 700,
            color: theme.text,
            margin: '0 0 2px 0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {activity.name}
        </h4>

        <p
          style={{
            fontSize: '0.82rem',
            color: theme.textLight,
            margin: '0 0 6px 0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {activity.description || activity.location || 'Click to view details'}
        </p>

        {activity.estimatedCost && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: `${catColor}15`,
              color: catColor,
              display: 'inline-block',
            }}
          >
            {activity.estimatedCost}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          paddingRight: '14px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.input,
              color: theme.textLight,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Edit Activity"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.textLight;
            }}
          >
            <WebIcon name="create" size={15} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.input,
              color: '#EF4444',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Delete Activity"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.input;
            }}
          >
            <WebIcon name="trash" size={15} color="#EF4444" />
          </button>
        )}
      </div>
    </div>
  );
};
