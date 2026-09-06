import React, { useState, useMemo } from 'react';
import { WebIcon } from '../components/WebIcon';
import { Button } from '../components/Button';
import { InterestChip } from '../components/InterestChip';
import { TRIP_INTERESTS } from '../constants/tripInterests';
import { useTheme } from '../context/ThemeContext';
import { useTrips } from '../context/TripContext';
import { Trip } from '../types';
import { useUser } from '../context/UserContext';
import { useI18n } from '../context/I18nContext';
import { useMembers } from '../context/MemberContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, extractCurrencySymbol } from '../utils';

const BUDGET_CATEGORIES = [
  {
    key: 'Economy',
    icon: 'leaf',
    color: '#4CAF50',
    description: 'Budget-friendly',
    defaultAmount: 25000,
  },
  {
    key: 'Standard',
    icon: 'star',
    color: '#FF5A5F',
    description: 'Best value & comfort',
    defaultAmount: 60000,
  },
  {
    key: 'Luxury',
    icon: 'diamond',
    color: '#FFB800',
    description: 'Premium experience',
    defaultAmount: 150000,
  },
];

const GROUP_SIZES = [
  { key: 'Solo', icon: 'person', label: 'Solo Traveler' },
  { key: 'Couple', icon: 'person', label: 'Couple (2 people)' },
  { key: 'Friends', icon: 'people', label: 'Friends Group' },
  { key: 'Family', icon: 'home', label: 'Family Trip' },
];

const TRAVEL_PACES = [
  { key: 'Relaxed', label: 'Relaxed (2-3 places/day)' },
  { key: 'Balanced', label: 'Balanced (3-4 places/day)' },
  { key: 'Packed', label: 'Packed (4-5 places/day)' },
];

const POPULAR_DESTINATIONS = [
  'Bali, Indonesia',
  'Santorini, Greece',
  'Tokyo, Japan',
  'Paris, France',
  'Goa, India',
  'Dubai, UAE',
  'Manali, India',
  'Rome, Italy',
];

export const CreateTripScreen = ({
  onBack,
  onContinue,
}: {
  onBack?: () => void;
  onContinue?: (data: Trip) => void;
}) => {
  const { theme, isDark } = useTheme();
  const { addTrip } = useTrips();
  const { settings } = useUser();
  const { t } = useI18n();
  const { addMember } = useMembers();
  const { user } = useAuth();

  const currencySymbol = useMemo(() => extractCurrencySymbol(settings.currency), [settings.currency]);

  // Form State
  const [destination, setDestination] = useState('');
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 12);
    return d.toISOString().split('T')[0];
  });
  const [groupSize, setGroupSize] = useState('Friends');
  const [pace, setPace] = useState<'Relaxed' | 'Balanced' | 'Packed'>('Balanced');
  const [budgetTier, setBudgetTier] = useState('Standard');
  const [budgetAmount, setBudgetAmount] = useState(60000);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Cafes',
    'Beaches',
    'Restaurants',
    'Monuments & Culture',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return 3;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  const formattedDates = useMemo(() => {
    if (!startDate || !endDate) return '';
    const s = new Date(startDate);
    const e = new Date(endDate);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [startDate, endDate]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSelectBudgetTier = (tier: string) => {
    setBudgetTier(tier);
    const cat = BUDGET_CATEGORIES.find((b) => b.key === tier);
    if (cat) {
      setBudgetAmount(cat.defaultAmount);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError('Please enter a destination.');
      return;
    }

    if (selectedInterests.length === 0) {
      setError('Please select at least 1 travel interest.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const finalName = tripName.trim() || `Adventure in ${destination}`;
      const newTripData = {
        name: finalName,
        destination: destination.trim(),
        budget: budgetTier,
        budgetAmount,
        dates: formattedDates,
        interests: selectedInterests,
        groupSize,
        pace,
        image: `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80`,
      };

      const created = await addTrip(newTripData);

      // Add current user as Admin member
      addMember({
        tripId: created.id,
        name: user?.name || 'You',
        email: user?.email || '',
        avatar: user?.photo || '',
        role: 'Admin',
      });

      if (onContinue) {
        onContinue(created);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create trip.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '100px' }} className="animate-fade-in">
      <div className="travora-container" style={{ maxWidth: '820px', paddingTop: '28px' }}>
        {/* Back Button & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          {onBack && (
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
          )}
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: theme.text,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              Plan Your Adventure
            </h1>
            <p style={{ fontSize: '0.9rem', color: theme.textLight, margin: 0 }}>
              AI-enhanced collaborative group trip planning
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate}>
          {/* Card 1: Destination & Name */}
          <div
            className="glass-panel"
            style={{
              padding: '28px',
              borderRadius: '24px',
              marginBottom: '24px',
              border: `1px solid ${theme.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-light)',
                  color: theme.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WebIcon name="location" size={18} color={theme.primary} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                1. Where are you heading?
              </h2>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                Destination City / Country *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bali, Indonesia or Goa, India"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                style={{ width: '100%', fontSize: '1.05rem', fontWeight: 600 }}
              />
            </div>

            {/* Popular presets */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.78rem', color: theme.textLight, fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Popular suggestions:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {POPULAR_DESTINATIONS.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setDestination(city)}
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: destination === city ? theme.primary : theme.input,
                      color: destination === city ? '#FFFFFF' : theme.text,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                Trip Title (Optional)
              </label>
              <input
                type="text"
                placeholder={destination ? `Summer Trip to ${destination}` : 'e.g. Annual Friends Getaway'}
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Card 2: Dates & Group */}
          <div
            className="glass-panel"
            style={{
              padding: '28px',
              borderRadius: '24px',
              marginBottom: '24px',
              border: `1px solid ${theme.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 166, 153, 0.15)',
                  color: '#00A699',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WebIcon name="calendar" size={18} color="#00A699" />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                2. Travel Dates & Companions
              </h2>
            </div>

            {/* Date Pickers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 166, 153, 0.12)',
                color: '#00A699',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '24px',
              }}
            >
              <WebIcon name="time" size={15} color="#00A699" />
              <span>Trip Duration: {durationDays} Days</span>
            </div>

            {/* Group Size selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.text, marginBottom: '8px' }}>
                Group Size
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px',
                }}
              >
                {GROUP_SIZES.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGroupSize(g.key)}
                    style={{
                      padding: '12px',
                      borderRadius: '14px',
                      border: `1.5px solid ${groupSize === g.key ? theme.primary : theme.border}`,
                      backgroundColor: groupSize === g.key ? 'var(--primary-light)' : theme.card,
                      color: groupSize === g.key ? theme.primary : theme.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      transition: 'all 0.15s',
                    }}
                  >
                    <WebIcon name={g.icon} size={18} color={groupSize === g.key ? theme.primary : theme.textLight} />
                    <span>{g.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Pace */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.text, marginBottom: '8px' }}>
                Travel Pace
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '10px',
                }}
              >
                {TRAVEL_PACES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPace(p.key as any)}
                    style={{
                      padding: '12px',
                      borderRadius: '14px',
                      border: `1.5px solid ${pace === p.key ? '#00A699' : theme.border}`,
                      backgroundColor: pace === p.key ? 'rgba(0, 166, 153, 0.12)' : theme.card,
                      color: pace === p.key ? '#00A699' : theme.text,
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Budget & Estimation */}
          <div
            className="glass-panel"
            style={{
              padding: '28px',
              borderRadius: '24px',
              marginBottom: '24px',
              border: `1px solid ${theme.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WebIcon name="wallet" size={18} color="#F59E0B" />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                3. Budget Planning
              </h2>
            </div>

            {/* Budget Tiers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              {BUDGET_CATEGORIES.map((b) => {
                const isSelected = budgetTier === b.key;
                return (
                  <div
                    key={b.key}
                    onClick={() => handleSelectBudgetTier(b.key)}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      border: `2px solid ${isSelected ? b.color : theme.border}`,
                      backgroundColor: isSelected ? `${b.color}15` : theme.card,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <WebIcon name={b.icon} size={18} color={b.color} />
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: theme.text }}>
                        {b.key}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: theme.textLight }}>
                      {b.description}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Budget Slider */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: theme.text }}>
                  Total Estimated Budget
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: theme.primary }}>
                  {formatCurrency(budgetAmount, currencySymbol)}
                </span>
              </div>

              <input
                type="range"
                min="5000"
                max="500000"
                step="5000"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(Number(e.target.value))}
                style={{ width: '100%', accentColor: theme.primary, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: theme.textLight, marginTop: '4px' }}>
                <span>₹5,000</span>
                <span>₹2,50,000</span>
                <span>₹5,00,000+</span>
              </div>
            </div>
          </div>

          {/* Card 4: Interests & Style */}
          <div
            className="glass-panel"
            style={{
              padding: '28px',
              borderRadius: '24px',
              marginBottom: '32px',
              border: `1px solid ${theme.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-light)',
                  color: theme.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WebIcon name="sparkles" size={18} color={theme.primary} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                  4. Travel Interests ({selectedInterests.length} selected)
                </h2>
                <p style={{ fontSize: '0.82rem', color: theme.textLight, margin: 0 }}>
                  AI will curate your itinerary around these specific preferences
                </p>
              </div>
            </div>

            {/* Interest chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TRIP_INTERESTS.map((item) => (
                <InterestChip
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  selected={selectedInterests.includes(item.label)}
                  onPress={() => toggleInterest(item.label)}
                />
              ))}
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            title="Create Trip & Generate Hub"
            loading={isLoading}
            style={{ height: '56px', fontSize: '1.05rem', borderRadius: '16px' }}
          />
        </form>
      </div>
    </div>
  );
};