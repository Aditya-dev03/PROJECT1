import React, { useState } from 'react';
import { WebIcon } from '../components/WebIcon';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { useMembers } from '../context/MemberContext';
import { useAuth } from '../context/AuthContext';
import { Trip } from '../types';
import {
  copyJoinCodeToClipboard,
  shareTripInvite,
} from '../services/joinCodeService';
import { getInitials } from '../utils';

interface GroupMembersProps {
  onBack: () => void;
  tripData: Trip;
}

export const GroupMembersScreen: React.FC<GroupMembersProps> = ({ onBack, tripData }) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const tripId = tripData.id;

  const { getMembersByTripId, addMember, removeMember } = useMembers();
  const members = getMembersByTripId(tripId);

  const [copied, setCopied] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Admin' | 'Member'>('Member');

  const handleCopyCode = async () => {
    if (tripData.joinCode) {
      await copyJoinCodeToClipboard(tripData.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (tripData.joinCode) {
      await shareTripInvite(tripData, tripData.joinCode);
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    addMember({
      tripId,
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
    });

    setIsAddModalOpen(false);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  return (
    <div style={{ paddingBottom: '80px' }} className="animate-fade-in">
      <div className="travora-container" style={{ maxWidth: '780px', paddingTop: '28px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '14px',
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
                Travel Buddies
              </h1>
              <p style={{ fontSize: '0.9rem', color: theme.textLight, margin: 0 }}>
                {tripData.destination} · {members.length} Confirmed Travelers
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.9rem', borderRadius: '12px' }}
          >
            <WebIcon name="plus" size={17} color="#FFFFFF" />
            <span>Add Member</span>
          </button>
        </div>

        {/* Join Code Invite Banner Card */}
        {tripData.joinCode && (
          <div
            className="glass-panel"
            style={{
              padding: '28px',
              borderRadius: '24px',
              marginBottom: '32px',
              border: `1.5px solid ${theme.primary}`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(255, 90, 95, 0.12) 0%, rgba(19, 39, 59, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(255, 90, 95, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: theme.primary, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Trip Join Code
                </div>
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    color: theme.text,
                    letterSpacing: '4px',
                    fontFamily: 'monospace',
                    lineHeight: 1.1,
                  }}
                >
                  {tripData.joinCode}
                </div>
                <p style={{ fontSize: '0.88rem', color: theme.textLight, margin: '8px 0 0 0' }}>
                  Share this code with friends so they can join your trip instantly.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCopyCode}
                  className={copied ? 'btn-primary' : 'btn-outline'}
                  style={{
                    padding: '10px 18px',
                    fontSize: '0.88rem',
                    borderRadius: '12px',
                    backgroundColor: copied ? '#10B981' : undefined,
                    borderColor: copied ? '#10B981' : undefined,
                  }}
                >
                  <WebIcon name={copied ? 'checkmark' : 'copy'} size={16} />
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="btn-primary"
                  style={{ padding: '10px 18px', fontSize: '0.88rem', borderRadius: '12px' }}
                >
                  <WebIcon name="share" size={16} color="#FFFFFF" />
                  <span>Share Invite</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Member Roster List */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            borderRadius: '24px',
            border: `1px solid ${theme.border}`,
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text, marginBottom: '16px' }}>
            Confirmed Travelers ({members.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.map((m) => {
              const isCurrentUser = m.id === user?.id || m.email === user?.email || m.name === user?.name;
              const isAdmin = m.role === 'Admin';

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '16px',
                    backgroundColor: isDark ? 'var(--bg-input)' : '#F9FAFB',
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  {/* Avatar & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt={m.name}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: theme.primary,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem',
                        }}
                      >
                        {getInitials(m.name)}
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.text }}>
                          {m.name}
                        </span>
                        {isCurrentUser && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: theme.primary,
                              backgroundColor: 'var(--primary-light)',
                              padding: '1px 6px',
                              borderRadius: '6px',
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: theme.textLight, marginTop: '2px' }}>
                        {m.email || 'Group Participant'}
                      </div>
                    </div>
                  </div>

                  {/* Role Badge & Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backgroundColor: isAdmin ? 'rgba(0, 166, 153, 0.15)' : theme.input,
                        color: isAdmin ? '#00A699' : theme.textLight,
                      }}
                    >
                      {m.role || 'Member'}
                    </span>

                    {!isCurrentUser && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${m.name} from this trip?`)) {
                            removeMember(m.id);
                          }
                        }}
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          backgroundColor: theme.input,
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                        }}
                        title="Remove member"
                      >
                        <WebIcon name="trash" size={15} color="#EF4444" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px', padding: '28px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                Add Travel Buddy
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleAddMember}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Sarah Connor"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Email or Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. sarah@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Trip Role
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  style={{ width: '100%', height: '46px' }}
                >
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <Button title="Add to Group" type="submit" />
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
