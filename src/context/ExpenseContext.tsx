import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { Expense } from '../types';
import { usePersistedState } from '../hooks/usePersistence';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ExpenseContextType {
  expenses: Expense[];
  isLoaded: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense | Promise<Expense>;
  syncExpensesForTrip: (tripId: string, expenses: Expense[]) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByTripId: (tripId: string) => Expense[];
  deleteExpensesByTrip: (tripId: string) => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const SEED_EXPENSES: Expense[] = [
  {
    id: '1',
    tripId: '1',
    title: 'Flight Tickets',
    amount: 1200,
    paidBy: 'u1',
    category: 'Travel',
    createdAt: new Date().toISOString(),
    splitType: 'Equal',
    splitParticipants: ['u1', 'u2'],
    status: 'Settled',
  },
  {
    id: '2',
    tripId: '1',
    title: 'Dinner at Beach',
    amount: 150,
    paidBy: 'u2',
    category: 'Food',
    createdAt: new Date().toISOString(),
    splitType: 'Equal',
    splitParticipants: ['u1', 'u2'],
    status: 'Pending',
  }
];

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [expenses, setExpenses, isLoaded] = usePersistedState<Expense[]>('@travora_expenses', SEED_EXPENSES);

  // Fetch all expenses from Supabase if configured
  const fetchSupabaseExpenses = useCallback(async () => {
    if (!isSupabaseConfigured || !user || user.isGuest) return;
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*');

      if (error) throw error;

      if (data) {
        const mappedExpenses: Expense[] = data.map((e: any) => ({
          id: e.id,
          tripId: e.trip_id,
          title: e.title,
          amount: Number(e.amount || 0),
          paidBy: e.paid_by,
          category: e.category,
          createdAt: e.created_at,
          splitType: e.split_type || 'Equal',
          splitParticipants: e.split_participants || [],
          customSplits: e.custom_splits || undefined,
          status: e.status || 'Pending',
        }));
        setExpenses(mappedExpenses);
      }
    } catch (err) {
      console.warn('Error fetching expenses from Supabase:', err);
    }
  }, [user, setExpenses]);

  // Fetch on mount or when session changes
  useEffect(() => {
    if (isLoaded && user && !user.isGuest) {
      fetchSupabaseExpenses();
    }
  }, [isLoaded, user, fetchSupabaseExpenses]);

  const syncExpensesForTrip = useCallback((tripId: string, incomingExpenses: Expense[]) => {
    if (!incomingExpenses || incomingExpenses.length === 0) return;
    setExpenses(prev => {
      const merged = [...prev];
      for (const inc of incomingExpenses) {
        const idx = merged.findIndex(e => e.id === inc.id || (e.tripId === tripId && e.title === inc.title && e.amount === inc.amount));
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...inc };
        } else {
          merged.push({ ...inc, tripId });
        }
      }
      return merged;
    });
  }, [setExpenses]);

  const addExpense = useCallback(async (data: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    // 1. Local state update
    setExpenses(prev => [newExpense, ...prev]);

    // 2. Supabase mode if configured
    if (isSupabaseConfigured && user && !user.isGuest) {
      try {
        const { data: newExpDb, error } = await supabase
          .from('expenses')
          .insert({
            trip_id: data.tripId,
            title: data.title,
            amount: data.amount,
            paid_by: data.paidBy,
            category: data.category,
            split_type: data.splitType,
            split_participants: data.splitParticipants,
            custom_splits: data.customSplits,
            status: data.status || 'Pending',
          })
          .select()
          .single();

        if (!error && newExpDb) {
          const syncedExpense: Expense = {
            id: newExpDb.id,
            tripId: newExpDb.trip_id,
            title: newExpDb.title,
            amount: Number(newExpDb.amount || 0),
            paidBy: newExpDb.paid_by,
            category: newExpDb.category,
            createdAt: newExpDb.created_at,
            splitType: newExpDb.split_type || 'Equal',
            splitParticipants: newExpDb.split_participants || [],
            customSplits: newExpDb.custom_splits || undefined,
            status: newExpDb.status || 'Pending',
          };
          setExpenses(prev => prev.map(e => e.id === newExpense.id ? syncedExpense : e));
          return syncedExpense;
        }
      } catch (err) {
        console.warn('Error saving expense to Supabase:', err);
      }
    }

    return newExpense;
  }, [user, setExpenses]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    // Local Update
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));

    // Supabase Update
    if (isSupabaseConfigured && user && !user.isGuest) {
      try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.paidBy !== undefined) dbUpdates.paid_by = updates.paidBy;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.splitType !== undefined) dbUpdates.split_type = updates.splitType;
        if (updates.splitParticipants !== undefined) dbUpdates.split_participants = updates.splitParticipants;
        if (updates.customSplits !== undefined) dbUpdates.custom_splits = updates.customSplits;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        await supabase.from('expenses').update(dbUpdates).eq('id', id);
      } catch (err) {
        console.warn('Error updating expense in Supabase:', err);
      }
    }
  }, [user, setExpenses]);

  const deleteExpense = useCallback(async (id: string) => {
    // Local Update
    setExpenses(prev => prev.filter(e => e.id !== id));

    // Supabase Delete
    if (isSupabaseConfigured && user && !user.isGuest) {
      try {
        await supabase.from('expenses').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting expense from Supabase:', err);
      }
    }
  }, [user, setExpenses]);

  const getExpensesByTripId = useCallback((tripId: string) => {
    return expenses.filter(e => e.tripId === tripId);
  }, [expenses]);

  const deleteExpensesByTrip = useCallback((tripId: string) => {
    setExpenses(prev => prev.filter(e => e.tripId !== tripId));
  }, [setExpenses]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        isLoaded,
        addExpense,
        syncExpensesForTrip,
        updateExpense,
        deleteExpense,
        getExpensesByTripId,
        deleteExpensesByTrip,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};
