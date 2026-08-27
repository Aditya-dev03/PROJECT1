import React, { useState, useMemo } from 'react';
import { WebIcon } from './WebIcon';
import { useTheme } from '../context/ThemeContext';
import { Expense, Trip } from '../types';
import { formatCurrency } from '../utils';

const CATEGORY_COLORS: Record<string, { color: string; icon: string; label: string }> = {
  Food: { color: '#FF7A00', icon: 'restaurant', label: 'Food & Dining' },
  Dining: { color: '#FF7A00', icon: 'restaurant', label: 'Food & Dining' },
  Travel: { color: '#00C2CB', icon: 'airplane', label: 'Travel & Transport' },
  Transport: { color: '#00C2CB', icon: 'airplane', label: 'Travel & Transport' },
  Flights: { color: '#00C2CB', icon: 'airplane', label: 'Travel & Transport' },
  Stay: { color: '#8E44AD', icon: 'bed', label: 'Stay & Lodging' },
  Hotel: { color: '#8E44AD', icon: 'bed', label: 'Stay & Lodging' },
  Lodging: { color: '#8E44AD', icon: 'bed', label: 'Stay & Lodging' },
  Activities: { color: '#2ECC71', icon: 'cart', label: 'Activities & Tours' },
  Sightseeing: { color: '#2ECC71', icon: 'camera', label: 'Activities & Tours' },
  Shopping: { color: '#E91E63', icon: 'cart', label: 'Shopping' },
  Nightlife: { color: '#9C27B0', icon: 'nightlife', label: 'Nightlife & Drinks' },
  Drinks: { color: '#9C27B0', icon: 'drinks', label: 'Nightlife & Drinks' },
  General: { color: '#3498DB', icon: 'receipt', label: 'General / Other' },
  Misc: { color: '#3498DB', icon: 'receipt', label: 'General / Other' },
  Other: { color: '#3498DB', icon: 'receipt', label: 'General / Other' },
};

const DEFAULT_CAT = { color: '#3498DB', icon: 'receipt', label: 'Other' };

interface SpendingPieChartModalProps {
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  trips: Trip[];
  currencySymbol: string;
}

export const SpendingPieChartModal: React.FC<SpendingPieChartModalProps> = ({
  visible,
  onClose,
  expenses,
  trips,
  currencySymbol,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedTripId, setSelectedTripId] = useState<string>('all');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    const active = (expenses || []).filter((e) => e.category !== 'Settlement');
    if (selectedTripId === 'all') return active;
    return active.filter((e) => e.tripId === selectedTripId);
  }, [expenses, selectedTripId]);

  const { items, total } = useMemo(() => {
    const map: Record<string, { category: string; amount: number; count: number; color: string; icon: string; label: string }> = {};

    filteredExpenses.forEach((exp) => {
      const rawCat = exp.category || 'General';
      const catConfig = CATEGORY_COLORS[rawCat] || DEFAULT_CAT;
      const key = catConfig.label;

      if (!map[key]) {
        map[key] = {
          category: rawCat,
          amount: 0,
          count: 0,
          color: catConfig.color,
          icon: catConfig.icon,
          label: catConfig.label,
        };
      }
      map[key].amount += Number(exp.amount) || 0;
      map[key].count += 1;
    });

    const sumTotal = Object.values(map).reduce((sum, item) => sum + item.amount, 0);

    const mappedItems = Object.values(map)
      .map((item) => ({
        ...item,
        percentage: sumTotal > 0 ? (item.amount / sumTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { items: mappedItems, total: sumTotal };
  }, [filteredExpenses]);

  if (!visible) return null;

  // Generate SVG Pie/Donut Slices
  let cumulativeAngle = 0;
  const radius = 80;
  const cx = 100;
  const cy = 100;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary-light)',
                color: theme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WebIcon name="pie-chart" size={20} color={theme.primary} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                Spending Breakdown
              </h3>
              <p style={{ fontSize: '0.82rem', color: theme.textLight, margin: 0 }}>
                Visual analytics by category
              </p>
            </div>
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

        {/* Trip Filter Tabs */}
        {trips.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 24px',
              borderBottom: `1px solid ${theme.border}`,
              overflowX: 'auto',
            }}
          >
            <button
              onClick={() => setSelectedTripId('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedTripId === 'all' ? theme.primary : theme.input,
                color: selectedTripId === 'all' ? '#FFFFFF' : theme.text,
                transition: 'all 0.2s',
              }}
            >
              All Trips ({expenses.length})
            </button>
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTripId(t.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: selectedTripId === t.id ? theme.primary : theme.input,
                  color: selectedTripId === t.id ? '#FFFFFF' : theme.text,
                  transition: 'all 0.2s',
                }}
              >
                {t.destination || t.name}
              </button>
            ))}
          </div>
        )}

        {/* Chart & Category List Section */}
        <div style={{ padding: '24px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textLight }}>
              <WebIcon name="receipt" size={42} color={theme.textLight} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600 }}>No expenses recorded yet for this view.</p>
            </div>
          ) : (
            <>
              {/* Donut Chart Display */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: '28px',
                  position: 'relative',
                }}
              >
                <svg width="200" height="200" viewBox="0 0 200 200">
                  {items.map((item, index) => {
                    const sliceAngle = (item.percentage / 100) * 360;
                    const startAngle = cumulativeAngle;
                    const endAngle = cumulativeAngle + sliceAngle;
                    cumulativeAngle += sliceAngle;

                    const startRad = (startAngle - 90) * (Math.PI / 180);
                    const endRad = (endAngle - 90) * (Math.PI / 180);

                    const x1 = cx + radius * Math.cos(startRad);
                    const y1 = cy + radius * Math.sin(startRad);
                    const x2 = cx + radius * Math.cos(endRad);
                    const y2 = cy + radius * Math.sin(endRad);

                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                    const pathData =
                      item.percentage >= 99.9
                        ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
                        : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                    const isHovered = hoveredCategory === item.label;

                    return (
                      <path
                        key={index}
                        d={pathData}
                        fill={item.color}
                        opacity={isHovered ? 1 : 0.85}
                        stroke={theme.card}
                        strokeWidth="2.5"
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                        onMouseEnter={() => setHoveredCategory(item.label)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      />
                    );
                  })}
                  {/* Center Cutout for Donut */}
                  <circle cx={cx} cy={cy} r="50" fill={theme.card} />
                </svg>

                {/* Donut Center Info */}
                <div
                  style={{
                    position: 'absolute',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.textLight }}>
                    Total Spend
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text }}>
                    {formatCurrency(total, currencySymbol)}
                  </div>
                </div>
              </div>

              {/* Breakdown Category Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredCategory(item.label)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      backgroundColor: hoveredCategory === item.label ? 'var(--primary-light)' : theme.input,
                      border: `1px solid ${hoveredCategory === item.label ? theme.primary : 'transparent'}`,
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: item.color,
                        }}
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: theme.text }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: theme.textLight }}>
                        ({item.count} items)
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: theme.text, marginRight: '8px' }}>
                        {formatCurrency(item.amount, currencySymbol)}
                      </span>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: theme.primary,
                          backgroundColor: 'var(--primary-light)',
                          padding: '2px 6px',
                          borderRadius: '6px',
                        }}
                      >
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
