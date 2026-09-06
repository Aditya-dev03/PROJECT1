import React, { useState, useCallback, useEffect } from 'react';
import { WebIcon } from '../components/WebIcon';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { useItinerary } from '../context/ItineraryContext';
import { useI18n } from '../context/I18nContext';
import { Trip, Activity } from '../types';
import { useItineraryGenerator } from '../hooks/useItineraryGenerator';
import { ActivityCard } from '../components/ActivityCard';
import { ActivityDetailModal } from '../components/ActivityDetailModal';

export const AIItineraryScreen = ({
  onBack,
  tripData,
}: {
  onBack: () => void;
  tripData?: Trip;
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const tripId = tripData?.id || '';

  if (!tripData) return null;

  const { getItineraryByTripId, updateItinerary, addActivity, removeActivity, editActivity } = useItinerary();
  const { generateItinerary, loading, loadingMessage, error } = useItineraryGenerator();

  const itinerary = getItineraryByTripId(tripId);
  const days = itinerary?.days || [];

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Edit / Add Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetDayId, setTargetDayId] = useState<string>('');
  const [newActName, setNewActName] = useState('');
  const [newActTime, setNewActTime] = useState('10:00 AM');
  const [newActLocation, setNewActLocation] = useState(tripData.destination || '');
  const [newActCategory, setNewActCategory] = useState('attraction');

  const [editingActivity, setEditingActivity] = useState<{ dayId: string; activity: Activity } | null>(null);

  // Smart Generation Handler
  const handleGenerate = useCallback(async () => {
    if (!tripId) return;
    const generatedDays = await generateItinerary(tripData);
    if (generatedDays && generatedDays.length > 0) {
      updateItinerary(tripId, generatedDays);
    }
  }, [tripId, tripData, generateItinerary, updateItinerary]);

  // Initial trigger if empty
  useEffect(() => {
    if (days.length === 0 && tripId) {
      handleGenerate();
    }
  }, [days.length, tripId]);

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActName.trim() || !targetDayId) return;

    addActivity(tripId, targetDayId, {
      name: newActName.trim(),
      time: newActTime.trim() || '12:00 PM',
      location: newActLocation.trim() || tripData.destination,
      category: newActCategory as any,
      icon: newActCategory === 'restaurant' ? 'restaurant' : newActCategory === 'cafe' ? 'cafe' : 'map',
      description: 'Custom activity added to itinerary.',
    });

    setIsAddModalOpen(false);
    setNewActName('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !editingActivity.activity.name.trim()) return;

    editActivity(tripId, editingActivity.dayId, editingActivity.activity.id, {
      name: editingActivity.activity.name,
      time: editingActivity.activity.time,
      location: editingActivity.activity.location,
      description: editingActivity.activity.description,
    });

    setEditingActivity(null);
  };

  return (
    <div style={{ paddingBottom: '80px' }} className="animate-fade-in">
      <div className="travora-container" style={{ maxWidth: '900px', paddingTop: '28px' }}>
        {/* Header Bar */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1
                  style={{
                    fontSize: '1.85rem',
                    fontWeight: 900,
                    color: theme.text,
                    letterSpacing: '-0.03em',
                    margin: 0,
                  }}
                >
                  AI Itinerary
                </h1>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    backgroundColor: 'var(--primary-light)',
                    color: theme.primary,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  GEMINI AI
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: theme.textLight, margin: 0 }}>
                {tripData.destination} · {tripData.dates || 'Custom Timeline'}
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.9rem', borderRadius: '12px' }}
          >
            <WebIcon name="sparkles" size={17} color="#FFFFFF" />
            <span>{loading ? 'Curating...' : 'Regenerate with AI'}</span>
          </button>
        </div>

        {/* Loading Indicator Banner */}
        {loading && (
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              borderRadius: '18px',
              marginBottom: '24px',
              border: `1.5px solid ${theme.primary}`,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              backgroundColor: 'var(--primary-light)',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                border: '3px solid var(--primary-glow)',
                borderTopColor: theme.primary,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.text }}>
                {loadingMessage || 'Curating your personalized travel plan...'}
              </div>
              <div style={{ fontSize: '0.82rem', color: theme.textLight }}>
                Matching verified spots, ratings, and clustering daily routes geographically.
              </div>
            </div>
          </div>
        )}

        {/* Error Notification Banner */}
        {error && !loading && (
          <div
            className="glass-panel"
            style={{
              padding: '20px 24px',
              borderRadius: '18px',
              marginBottom: '24px',
              border: '1.5px solid #EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <WebIcon name="alert-circle" size={24} color="#EF4444" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#EF4444' }}>
                  Itinerary Notice
                </div>
                <div style={{ fontSize: '0.85rem', color: theme.textLight, marginTop: '2px' }}>
                  {error}
                </div>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                backgroundColor: theme.primary,
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Days Itinerary Timeline */}
        {days.length === 0 && !loading ? (
          <div
            className="glass-panel"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              borderRadius: '24px',
            }}
          >
            <WebIcon name="sparkles" size={48} color={theme.primary} style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: theme.text, marginBottom: '8px' }}>
              No Itinerary Planned Yet
            </h3>
            <p style={{ fontSize: '0.9rem', color: theme.textLight, maxWidth: '420px', margin: '0 auto 20px' }}>
              Click below to generate a tailored multi-day itinerary using Gemini AI and real verified venues.
            </p>
            <Button
              title="Generate AI Itinerary"
              onClick={handleGenerate}
              style={{ maxWidth: '240px', margin: '0 auto' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {days.map((dayObj, dayIdx) => (
              <div
                key={dayObj.id || dayIdx}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderRadius: '24px',
                  border: `1px solid ${theme.border}`,
                }}
              >
                {/* Day Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    borderBottom: `1px solid ${theme.border}`,
                    paddingBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        backgroundColor: theme.primary,
                        color: '#FFFFFF',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        padding: '4px 10px',
                        borderRadius: '8px',
                      }}
                    >
                      {dayObj.day || `Day ${dayIdx + 1}`}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                        {dayObj.date || `Exploring ${tripData.destination}`}
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: theme.textLight }}>
                        {dayObj.activities?.length || 0} planned activities
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setTargetDayId(dayObj.id);
                      setIsAddModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor: theme.input,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    <WebIcon name="plus" size={14} />
                    <span>Add Spot</span>
                  </button>
                </div>

                {/* Activities in Day */}
                {dayObj.activities && dayObj.activities.length > 0 ? (
                  <div className="timeline-track">
                    {dayObj.activities.map((act) => (
                      <div key={act.id} className="timeline-item-wrapper">
                        <div className="timeline-node-dot" />
                        <ActivityCard
                          activity={act}
                          onPress={() => {
                            setSelectedActivity(act);
                            setModalVisible(true);
                          }}
                          onEdit={() => setEditingActivity({ dayId: dayObj.id, activity: { ...act } })}
                          onDelete={() => {
                            if (confirm(`Remove "${act.name}" from ${dayObj.day}?`)) {
                              removeActivity(tripId, dayObj.id, act.id);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: theme.textLight, fontSize: '0.88rem' }}>
                    No activities planned for this day yet.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      <ActivityDetailModal
        visible={modalVisible}
        activity={selectedActivity}
        onClose={() => setModalVisible(false)}
      />

      {/* Add Activity Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '28px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                Add New Spot
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

            <form onSubmit={handleSaveAdd}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Place / Activity Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Oia Sunset Lookout"
                  value={newActName}
                  onChange={(e) => setNewActName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={newActTime}
                    onChange={(e) => setNewActTime(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={newActCategory}
                    onChange={(e) => setNewActCategory(e.target.value)}
                    style={{ width: '100%', height: '44px' }}
                  >
                    <option value="attraction">Attraction / Landmark</option>
                    <option value="restaurant">Restaurant / Food</option>
                    <option value="cafe">Cafe / Coffee</option>
                    <option value="beach">Beach / Nature</option>
                    <option value="shopping">Shopping / Market</option>
                    <option value="nightlife">Nightlife / Drinks</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Location Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Street, Oia"
                  value={newActLocation}
                  onChange={(e) => setNewActLocation(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <Button title="Add to Timeline" type="submit" />
            </form>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {editingActivity && (
        <div className="modal-overlay" onClick={() => setEditingActivity(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '28px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                Edit Spot
              </h3>
              <button
                onClick={() => setEditingActivity(null)}
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

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={editingActivity.activity.name}
                  onChange={(e) =>
                    setEditingActivity({
                      ...editingActivity,
                      activity: { ...editingActivity.activity, name: e.target.value },
                    })
                  }
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Time
                </label>
                <input
                  type="text"
                  value={editingActivity.activity.time}
                  onChange={(e) =>
                    setEditingActivity({
                      ...editingActivity,
                      activity: { ...editingActivity.activity, time: e.target.value },
                    })
                  }
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Description / Note
                </label>
                <textarea
                  rows={3}
                  value={editingActivity.activity.description || ''}
                  onChange={(e) =>
                    setEditingActivity({
                      ...editingActivity,
                      activity: { ...editingActivity.activity, description: e.target.value },
                    })
                  }
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <Button title="Save Changes" type="submit" />
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
