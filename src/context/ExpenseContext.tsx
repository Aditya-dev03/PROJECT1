import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { Expense } from '../types';
import { usePersistedState } from '../hooks/usePersistence';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ExpenseContextType {
  expenses: Expense[];
  isLoaded: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense | Promise<Expense>;
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

  // Fetch all expenses from Supabase
  const fetchSupabaseExpenses = useCallback(async () => {
    if (!user || user.isGuest) return;
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

  // Realtime subscription
  useEffect(() => {
    if (!user || user.isGuest) return;

    const channel = supabase
      .channel('public-expenses-context-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          fetchSupabaseExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSupabaseExpenses]);

  const addExpense = useCallback(async (data: Omit<Expense, 'id' | 'createdAt'>) => {
    // Guest/Local mode
    if (!user || user.isGuest) {
      const newExpense: Expense = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    }

    // Supabase mode
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

      if (error) throw error;

      const newExpense: Expense = {
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

      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    } catch (err) {
      console.warn('Error saving expense to Supabase, using local fallback:', err);
      const fallbackExpense: Expense = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      setExpenses(prev => [fallbackExpense, ...prev]);
      return fallbackExpense;
    }
  }, [user, setExpenses]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    // Local Update
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));

    // Supabase Update
    if (user && !user.isGuest) {
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

        const { error } = await supabase
          .from('expenses')
          .update(dbUpdates)
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.warn('Error updating expense in Supabase:', err);
      }
    }
  }, [user, setExpenses]);

  const deleteExpense = useCallback(async (id: string) => {
    // Local Update
    setExpenses(prev => prev.filter(e => e.id !== id));

    // Supabase Delete
    if (user && !user.isGuest) {
      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id);

        if (error) throw error;
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
    <ExpenseContext.Provider value={{ expenses, isLoaded, addExpense, updateExpense, deleteExpense, getExpensesByTripId, deleteExpensesByTrip }}>
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
