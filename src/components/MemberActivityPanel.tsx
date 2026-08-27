import React, { useState } from 'react';
import { WebIcon } from './WebIcon';
import { ExtendedMemberLocation } from '../hooks/useLiveLocation';
import { getInitials } from '../utils';

interface MemberActivityPanelProps {
  theme: any;
  isDark: boolean;
  members: ExtendedMemberLocation[];
  onFocusMember: (latitude: number, longitude: number) => void;
}

export const MemberActivityPanel: React.FC<MemberActivityPanelProps> = ({
  theme,
  isDark,
  members,
  onFocusMember,
}) => {
  const [expanded, setExpanded] = useState(true);

  const getRelativeTime = (isoString: string) => {
    const now = new Date();
    const updated = new Date(isoString);
    const diffMs = now.getTime() - updated.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    return `${diffMin}m ago`;
  };

  const onlineCount = members.filter((m) => m.status === 'online').length;

  return (
    <div
      style={{
        backgroundColor: isDark ? 'var(--bg-surface)' : '#FFFFFF',
        border: `1px solid ${theme.border}`,
        borderRadius: '20px',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header & Toggle */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${theme.border}` : 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 166, 153, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WebIcon name="people" size={18} color="#00A699" />
          </div>
          <div>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: theme.text, margin: 0 }}>
              Travel Buddies
            </h4>
            <span style={{ fontSize: '0.78rem', color: theme.textLight, fontWeight: 600 }}>
              <span style={{ color: '#10B981', fontWeight: 700 }}>● {onlineCount}</span> of {members.length} active
            </span>
          </div>
        </div>

        <button
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: theme.textLight,
            cursor: 'pointer',
          }}
        >
          <WebIcon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
        </button>
      </div>

      {/* Member List */}
      {expanded && (
        <div
          style={{
            padding: '12px 16px',
            maxHeight: '280px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: theme.textLight, fontSize: '0.85rem' }}>
              No members are currently sharing location.
            </div>
          ) : (
            members.map((member) => {
              const isOnline = member.status === 'online';

              return (
                <div
                  key={member.memberId}
                  onClick={() => onFocusMember(member.latitude, member.longitude)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: isDark ? 'var(--bg-input)' : '#F9FAFB',
                    border: `1px solid ${theme.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#1F3A56' : '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? 'var(--bg-input)' : '#F9FAFB';
                  }}
                >
                  {/* Left: Avatar & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
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
                          {getInitials(member.name)}
                        </div>
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: isOnline ? '#10B981' : '#6B7280',
                          border: `2px solid ${isDark ? theme.surface : '#FFFFFF'}`,
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: theme.text }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: theme.textLight }}>
                        {isOnline ? member.area : 'Offline'} · {getRelativeTime(member.lastUpdated)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Distance & Locate Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: isOnline ? theme.primary : theme.textLight,
                        }}
                      >
                        {isOnline ? member.distanceStr : '--'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusMember(member.latitude, member.longitude);
                      }}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--primary-light)',
                        color: theme.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title="Focus on Map"
                    >
                      <WebIcon name="navigate" size={14} color={theme.primary} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
