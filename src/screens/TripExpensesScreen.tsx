import React, { useState, useMemo } from 'react';
import { WebIcon } from '../components/WebIcon';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useI18n } from '../context/I18nContext';
import { useExpenses } from '../context/ExpenseContext';
import { useMembers } from '../context/MemberContext';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import {
  formatCurrency,
  extractCurrencySymbol,
  calculateBalances,
  getSettlements,
  calculateBudgetStats,
} from '../utils';
import { Expense, Trip } from '../types';
import { SpendingPieChartModal } from '../components/SpendingPieChartModal';

const CATEGORIES = [
  { id: 'Food', icon: 'restaurant', color: '#FF9500' },
  { id: 'Hotel', icon: 'bed', color: '#5856D6' },
  { id: 'Travel', icon: 'airplane', color: '#007AFF' },
  { id: 'Shopping', icon: 'cart', color: '#FF2D55' },
  { id: 'Entertainment', icon: 'sparkles', color: '#AF52DE' },
  { id: 'Misc', icon: 'receipt', color: '#8E8E93' },
];

interface TripExpensesProps {
  onBack: () => void;
  tripData: Trip;
}

export const TripExpensesScreen: React.FC<TripExpensesProps> = ({ onBack, tripData }) => {
  const { theme, isDark } = useTheme();
  const { settings } = useUser();
  const { t } = useI18n();
  const { addMessage } = useChat();
  const { user } = useAuth();

  const tripId = tripData.id;
  const isCompleted = tripData.status === 'Completed';

  const { getExpensesByTripId, addExpense, updateExpense, deleteExpense } = useExpenses();
  const { getMembersByTripId, addMember } = useMembers();

  const rawExpenses = getExpensesByTripId(tripId);
  const tripMembers = getMembersByTripId(tripId);

  const currencySymbol = useMemo(() => extractCurrencySymbol(settings.currency), [settings.currency]);

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [selectedPayer, setSelectedPayer] = useState(tripMembers[0]?.id || 'u1');
  const [splitType, setSplitType] = useState<'Equal' | 'Custom'>('Equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    tripMembers.map((m) => m.id)
  );
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  // Ensure default payer is set
  React.useEffect(() => {
    if (!selectedPayer && tripMembers.length > 0) {
      setSelectedPayer(tripMembers[0].id);
      setSelectedParticipants(tripMembers.map((m) => m.id));
    }
  }, [tripMembers, selectedPayer]);

  // Derived Calculations
  const budgetStats = useMemo(() => {
    const total = tripData.budgetAmount || 50000;
    return calculateBudgetStats(total, rawExpenses);
  }, [tripData.budgetAmount, rawExpenses]);

  const balances = useMemo(() => {
    return calculateBalances(tripMembers, rawExpenses);
  }, [tripMembers, rawExpenses]);

  const settlements = useMemo(() => {
    return getSettlements(balances);
  }, [balances]);

  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    setTitle('');
    setAmount('');
    setSelectedCategory('Food');
    setSelectedPayer(tripMembers[0]?.id || 'u1');
    setSplitType('Equal');
    setSelectedParticipants(tripMembers.map((m) => m.id));
    setCustomSplits({});
    setIsModalVisible(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setTitle(exp.title);
    setAmount(exp.amount.toString());
    setSelectedCategory(exp.category);
    setSelectedPayer(exp.paidBy);
    setSplitType(exp.splitType || 'Equal');
    setSelectedParticipants(exp.splitParticipants || tripMembers.map((m) => m.id));
    const splitsMap: Record<string, string> = {};
    if (exp.customSplits) {
      Object.entries(exp.customSplits).forEach(([k, v]) => {
        splitsMap[k] = v.toString();
      });
    }
    setCustomSplits(splitsMap);
    setIsModalVisible(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid title and positive amount.');
      return;
    }

    if (selectedParticipants.length === 0) {
      alert('Please select at least one participant.');
      return;
    }

    const customAmounts: Record<string, number> = {};
    if (splitType === 'Custom') {
      selectedParticipants.forEach((pid) => {
        customAmounts[pid] = parseFloat(customSplits[pid] || '0') || 0;
      });
    }

    if (editingExpenseId) {
      updateExpense(editingExpenseId, {
        title: title.trim(),
        amount: numAmount,
        category: selectedCategory,
        paidBy: selectedPayer,
        splitType,
        splitParticipants: selectedParticipants,
        customSplits: splitType === 'Custom' ? customAmounts : undefined,
      });
    } else {
      await addExpense({
        tripId,
        title: title.trim(),
        amount: numAmount,
        category: selectedCategory,
        paidBy: selectedPayer,
        splitType,
        splitParticipants: selectedParticipants,
        customSplits: splitType === 'Custom' ? customAmounts : undefined,
        status: 'Pending',
      });

      // Post activity notification in Chat
      const payerName = tripMembers.find((m) => m.id === selectedPayer)?.name || 'Someone';
      addMessage(tripId, {
        senderId: user?.id || 'sys',
        senderName: 'Travora Bot',
        text: `💰 ${payerName} added an expense: "${title.trim()}" for ${formatCurrency(numAmount, currencySymbol)}`,
        type: 'expense',
      });
    }

    setIsModalVisible(false);
  };

  const handleSettleDebt = (settlement: { from: string; to: string; amount: number }) => {
    if (
      confirm(
        `Record settlement of ${formatCurrency(settlement.amount, currencySymbol)} from ${settlement.from} to ${settlement.to}?`
      )
    ) {
      const fromMember = tripMembers.find((m) => m.name === settlement.from);
      addExpense({
        tripId,
        title: `Settlement: ${settlement.from} → ${settlement.to}`,
        amount: settlement.amount,
        category: 'Settlement',
        paidBy: fromMember?.id || 'u1',
        splitType: 'Equal',
        splitParticipants: [],
        status: 'Settled',
      });
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }} className="animate-fade-in">
      <div className="travora-container" style={{ maxWidth: '960px', paddingTop: '28px' }}>
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
                Expenses & Split
              </h1>
              <p style={{ fontSize: '0.9rem', color: theme.textLight, margin: 0 }}>
                {tripData.destination} · Group Split Ledger
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="btn-outline"
              style={{ padding: '8px 16px', fontSize: '0.88rem', borderRadius: '12px' }}
            >
              <WebIcon name="pie-chart" size={17} color={theme.primary} />
              <span>Analytics</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.88rem', borderRadius: '12px' }}
            >
              <WebIcon name="plus" size={17} color="#FFFFFF" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            className="glass-panel"
            style={{ padding: '20px', borderRadius: '18px', border: `1px solid ${theme.border}` }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: theme.textLight, marginBottom: '4px' }}>
              Total Group Spend
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: theme.text }}>
              {formatCurrency(budgetStats.spent, currencySymbol)}
            </div>
            <div style={{ fontSize: '0.78rem', color: theme.textLight, marginTop: '2px' }}>
              {rawExpenses.length} transactions
            </div>
          </div>

          <div
            className="glass-panel"
            style={{ padding: '20px', borderRadius: '18px', border: `1px solid ${theme.border}` }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: theme.textLight, marginBottom: '4px' }}>
              Remaining Budget
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10B981' }}>
              {formatCurrency(budgetStats.remaining, currencySymbol)}
            </div>
            <div style={{ fontSize: '0.78rem', color: theme.textLight, marginTop: '2px' }}>
              of {formatCurrency(budgetStats.total, currencySymbol)} target
            </div>
          </div>

          <div
            className="glass-panel"
            style={{ padding: '20px', borderRadius: '18px', border: `1px solid ${theme.border}` }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: theme.textLight, marginBottom: '4px' }}>
              Active Members
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: theme.primary }}>
              {tripMembers.length} Buddies
            </div>
            <div style={{ fontSize: '0.78rem', color: theme.textLight, marginTop: '2px' }}>
              Equal / Custom Split
            </div>
          </div>
        </div>

        {/* Smart Debt Settlements (Who Owes Whom) */}
        {settlements.length > 0 && (
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              borderRadius: '20px',
              marginBottom: '32px',
              border: '1px solid rgba(0, 166, 153, 0.3)',
              backgroundColor: isDark ? 'rgba(0, 166, 153, 0.08)' : 'rgba(0, 166, 153, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <WebIcon name="sparkles" size={18} color="#00A699" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                Smart Debt Settlements (Who Owes Whom)
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: theme.textLight, marginBottom: '16px' }}>
              Optimized minimum transactions to settle all group debts completely.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {settlements.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    backgroundColor: theme.card,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 800, color: '#EF4444' }}>{s.from}</span>
                    <span style={{ color: theme.textLight, margin: '0 6px' }}>owes</span>
                    <span style={{ fontWeight: 800, color: '#10B981' }}>{s.to}</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: theme.text, marginTop: '2px' }}>
                      {formatCurrency(s.amount, currencySymbol)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSettleDebt(s)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    Settle Up
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            borderRadius: '24px',
            border: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, margin: 0 }}>
              Transaction Log ({rawExpenses.length})
            </h2>
          </div>

          {rawExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textLight }}>
              <WebIcon name="wallet" size={44} color={theme.textLight} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.text, marginBottom: '4px' }}>
                No expenses logged yet
              </p>
              <p style={{ fontSize: '0.88rem', maxWidth: '340px', margin: '0 auto 20px' }}>
                Add dinners, transport, flights, or hotel bookings to split with your group.
              </p>
              <Button title="Log First Expense" onClick={handleOpenAddModal} style={{ maxWidth: '200px', margin: '0 auto' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rawExpenses.map((exp) => {
                const payer = tripMembers.find((m) => m.id === exp.paidBy);
                const isSettlement = exp.category === 'Settlement';

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
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Left Icon & Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: isSettlement ? 'rgba(16, 185, 129, 0.15)' : 'var(--primary-light)',
                          color: isSettlement ? '#10B981' : theme.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <WebIcon name={isSettlement ? 'checkmark' : 'receipt'} size={20} />
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.text }}>
                          {exp.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: theme.textLight, marginTop: '2px' }}>
                          Paid by <strong style={{ color: theme.text }}>{payer?.name || 'Someone'}</strong> ·{' '}
                          <span style={{ textTransform: 'capitalize' }}>{exp.category}</span>
                          {exp.splitType === 'Equal' && exp.splitParticipants?.length > 0 && (
                            <span> · Split between {exp.splitParticipants.length} people</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Amount & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '1.15rem',
                            fontWeight: 900,
                            color: isSettlement ? '#10B981' : theme.text,
                          }}
                        >
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

                      {!isSettlement && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            style={{
                              padding: '6px',
                              borderRadius: '8px',
                              backgroundColor: theme.input,
                              border: 'none',
                              color: theme.textLight,
                              cursor: 'pointer',
                            }}
                            title="Edit"
                          >
                            <WebIcon name="create" size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete expense "${exp.title}"?`)) {
                                deleteExpense(exp.id);
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
                            title="Delete"
                          >
                            <WebIcon name="trash" size={15} color="#EF4444" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalVisible && (
        <div className="modal-overlay" onClick={() => setIsModalVisible(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', padding: '28px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text, margin: 0 }}>
                {editingExpenseId ? 'Edit Expense' : 'Log New Expense'}
              </h3>
              <button
                onClick={() => setIsModalVisible(false)}
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

            <form onSubmit={handleSaveExpense}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Seafood Dinner at Sunset Beach"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ width: '100%', height: '46px' }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Paid By
                </label>
                <select
                  value={selectedPayer}
                  onChange={(e) => setSelectedPayer(e.target.value)}
                  style={{ width: '100%', height: '46px' }}
                >
                  {tripMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === user?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Type Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '6px' }}>
                  Split Method
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSplitType('Equal')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: `1.5px solid ${splitType === 'Equal' ? theme.primary : theme.border}`,
                      backgroundColor: splitType === 'Equal' ? 'var(--primary-light)' : theme.card,
                      color: splitType === 'Equal' ? theme.primary : theme.text,
                      cursor: 'pointer',
                    }}
                  >
                    Split Equally
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('Custom')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: `1.5px solid ${splitType === 'Custom' ? theme.primary : theme.border}`,
                      backgroundColor: splitType === 'Custom' ? 'var(--primary-light)' : theme.card,
                      color: splitType === 'Custom' ? theme.primary : theme.text,
                      cursor: 'pointer',
                    }}
                  >
                    Custom Amounts
                  </button>
                </div>
              </div>

              {/* Participants Checklist */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: theme.text, marginBottom: '8px' }}>
                  Split Participants ({selectedParticipants.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tripMembers.map((m) => {
                    const isChecked = selectedParticipants.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          backgroundColor: theme.input,
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParticipants([...selectedParticipants, m.id]);
                              } else {
                                setSelectedParticipants(selectedParticipants.filter((id) => id !== m.id));
                              }
                            }}
                            style={{ accentColor: theme.primary, width: '16px', height: '16px' }}
                          />
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: theme.text }}>
                            {m.name}
                          </span>
                        </label>

                        {splitType === 'Custom' && isChecked && (
                          <input
                            type="number"
                            placeholder="Amount"
                            value={customSplits[m.id] || ''}
                            onChange={(e) =>
                              setCustomSplits({ ...customSplits, [m.id]: e.target.value })
                            }
                            style={{
                              width: '100px',
                              padding: '4px 8px',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button title={editingExpenseId ? 'Save Changes' : 'Log Expense'} type="submit" />
            </form>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      <SpendingPieChartModal
        visible={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        expenses={rawExpenses}
        trips={[tripData]}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};
