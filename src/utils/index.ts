import { Expense, Member } from '../types';
export * from './responsive';

export const SCREEN_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 1200;
export const SCREEN_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 800;

/**
 * Formats a numeric amount into a currency string based on the provided symbol.
 */
export const formatCurrency = (amount: number, symbol: string = '₹'): string => {
  return `${symbol}${Math.round(amount).toLocaleString('en-IN')}`;
};

/**
 * Extracts the currency symbol from a string like "INR (₹)" or "USD ($)".
 */
export const extractCurrencySymbol = (currencyStr: string): string => {
  if (!currencyStr) return '₹';
  const match = currencyStr.match(/\((.+)\)/);
  return match ? match[1] : '₹';
};

/**
 * Formats a date string for display.
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Returns initials from a name (e.g., "John Doe" -> "JD").
 */
export const getInitials = (name: string): string => {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Calculates budget statistics.
 */
export interface BudgetStats {
  total: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export const calculateBudgetStats = (total: number, expenses: Expense[]): BudgetStats => {
  const spent = (expenses || [])
    .filter((e) => e.category !== 'Settlement')
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const remaining = Math.max(0, total - spent);
  const percentage = total > 0 ? Math.min((spent / total) * 100, 100) : 0;

  return { total, spent, remaining, percentage };
};

export interface BalanceSummary {
  memberId: string;
  name: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export const calculateBalances = (members: Member[], expenses: Expense[]): BalanceSummary[] => {
  const balances: Record<string, BalanceSummary> = {};

  (members || []).forEach((m) => {
    balances[m.id] = {
      memberId: m.id,
      name: m.name,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0,
    };
  });

  (expenses || []).forEach((exp) => {
    if (exp.category === 'Settlement') {
      return;
    }

    // Who paid
    if (balances[exp.paidBy]) {
      balances[exp.paidBy].totalPaid += Number(exp.amount) || 0;
    }

    // Who owes
    const participants = exp.splitParticipants || [];
    if (exp.splitType === 'Equal') {
      const perPerson = (Number(exp.amount) || 0) / (participants.length || 1);
      participants.forEach((pid) => {
        if (balances[pid]) {
          balances[pid].totalOwed += perPerson;
        }
      });
    } else if (exp.splitType === 'Custom' && exp.customSplits) {
      Object.entries(exp.customSplits).forEach(([pid, amt]) => {
        if (balances[pid]) {
          balances[pid].totalOwed += Number(amt) || 0;
        }
      });
    }
  });

  return Object.values(balances).map((b) => ({
    ...b,
    netBalance: b.totalPaid - b.totalOwed,
  }));
};

export interface Debt {
  from: string;
  to: string;
  amount: number;
}

export const getSettlements = (balances: BalanceSummary[]): Debt[] => {
  const debtors = balances.filter((b) => b.netBalance < -1).sort((a, b) => a.netBalance - b.netBalance);
  const creditors = balances.filter((b) => b.netBalance > 1).sort((a, b) => b.netBalance - a.netBalance);

  const settlements: Debt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  const dBalances = debtors.map((d) => ({ ...d, netBalance: Math.abs(d.netBalance) }));
  const cBalances = creditors.map((c) => ({ ...c }));

  while (dIdx < dBalances.length && cIdx < cBalances.length) {
    const amount = Math.min(dBalances[dIdx].netBalance, cBalances[cIdx].netBalance);
    if (amount > 0) {
      settlements.push({
        from: dBalances[dIdx].name,
        to: cBalances[cIdx].name,
        amount: Math.round(amount),
      });
    }

    dBalances[dIdx].netBalance -= amount;
    cBalances[cIdx].netBalance -= amount;

    if (dBalances[dIdx].netBalance < 1) dIdx++;
    if (cBalances[cIdx].netBalance < 1) cIdx++;
  }

  return settlements;
};

export {
  generateRawJoinCode,
  generateUniqueJoinCode,
  normalizeJoinCode,
  isValidJoinCode,
  formatTripInviteMessage,
  JOIN_CODE_CHARSET,
  JOIN_CODE_LENGTH,
} from '../services/joinCodeEngine';

export {
  copyJoinCodeToClipboard,
  getJoinCodeFromClipboard,
  shareTripInvite,
  lookupTripByJoinCode,
  executeJoinTripByCode,
} from '../services/joinCodeService';

import { generateUniqueJoinCode } from '../services/joinCodeEngine';
export const generateJoinCode = (existingCodes?: (string | undefined)[]): string => {
  return generateUniqueJoinCode(existingCodes);
};
