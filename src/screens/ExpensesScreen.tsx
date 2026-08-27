import React, { useState, useMemo } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useTheme } from '../context/ThemeContext';
import { useExpenses } from '../context/ExpenseContext';
import { useTrips } from '../context/TripContext';
import { useUser } from '../context/UserContext';
import { useI18n } from '../context/I18nContext';
import { formatCurrency, extractCurrencySymbol } from '../utils';
import { SpendingPieChartModal } from '../components/SpendingPieChartModal';

export const ExpensesScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { expenses } = useExpenses();
  const { trips } = useTrips();
  const { settings } = useUser();
  const { t } = useI18n();

  const [selectedTripId, setSelectedTripId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showChartModal, setShowChartModal] = useState(false);

  const currencySymbol = useMemo(() => extractCurrencySymbol(settings.currency), [settings.currency]);

  const filteredExpenses = useMemo(() => {
    let result = (expenses || []).filter((e) => e.category !== 'Settlement');
    if (selectedTripId !== 'all') {
      result = result.filter((e) => e.tripId === selectedTripId);
    }
    if (selectedCategory !== 'all') {
      result = result.filter((e) => e.category === selectedCategory);
    }
    return result;
  }, [expenses, selectedTripId, selectedCategory]);

  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const categories = ['all', 'Food', 'Hotel', 'Travel', 'Shopping', 'Entertainment', 'Misc'];

  return (
    <div style={{ paddingBottom: '80px' }} className="animate-fade-in">
      <div className="travora-container" style={{ paddingTop: '28px' }}>
        {/* Header */}
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
              {t('nav.expenses') || 'Global Expense Ledger'}
            </h1>
            <p style={{ fontSize: '0.9rem', color: theme.textLight, margin: 0 }}>
              Consolidated transactions and spending analytics across all trips
            </p>
          </div>

          <button
            onClick={() => setShowChartModal(true)}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.9rem', borderRadius: '12px' }}
          >
            <WebIcon name="pie-chart" size={18} color="#FFFFFF" />
            <span>Category Analytics</span>
          </button>
        </div>

        {/* Global Stats Banner */}
        <div
          className="glass-panel"
          style={{
            padding: '24px 28px',
            borderRadius: '20px',
            marginBottom: '28px',
            border: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: theme.textLight, marginBottom: '4px' }}>
              Filtered Total Spending
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: theme.primary, letterSpacing: '-0.03em' }}>
              {formatCurrency(totalSpent, currencySymbol)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ backgroundColor: theme.input, padding: '10px 16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: theme.textLight, fontWeight: 600 }}>Active Trips</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text }}>{trips.length}</div>
            </div>
            <div style={{ backgroundColor: theme.input, padding: '10px 16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: theme.textLight, fontWeight: 600 }}>Transactions</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text }}>{filteredExpenses.length}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          {/* Trip Selector */}
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              backgroundColor: theme.input,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              height: '42px',
            }}
          >
            <option value="all">All Trips</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.destination || t.name}
              </option>
            ))}
          </select>

          {/* Category Chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === cat ? theme.primary : theme.input,
                  color: selectedCategory === cat ? '#FFFFFF' : theme.text,
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Expense Rows */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            borderRadius: '24px',
            border: `1px solid ${theme.border}`,
          }}
        >
          {filteredExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textLight }}>
              <WebIcon name="receipt" size={44} color={theme.textLight} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.text, marginBottom: '4px' }}>
                No expenses found
              </p>
              <p style={{ fontSize: '0.85rem' }}>Try clearing filters or open a trip to record new group expenses.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredExpenses.map((exp) => {
                const tripMatch = trips.find((t) => t.id === exp.tripId);
                return (
                  <div
                    key={exp.id}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--primary-light)',
                          color: theme.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <WebIcon name="receipt" size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.text }}>
                          {exp.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: theme.textLight, marginTop: '2px' }}>
                          <strong style={{ color: theme.text }}>{tripMatch?.destination || 'Trip'}</strong> ·{' '}
                          <span style={{ textTransform: 'capitalize' }}>{exp.category}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: theme.text }}>
                        {formatCurrency(exp.amount, currencySymbol)}
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: exp.status === 'Settled' ? '#10B981' : '#F59E0B',
                          textTransform: 'uppercase',
                        }}
                      >
                        {exp.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Analytics Modal */}
      <SpendingPieChartModal
        visible={showChartModal}
        onClose={() => setShowChartModal(false)}
        expenses={expenses}
        trips={trips}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};
