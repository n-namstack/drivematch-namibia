import { create } from 'zustand';
import supabase from '../lib/supabase';

const useExpenseStore = create((set) => ({
  expenses: [],
  loading: false,

  fetchExpenses: async (ownerId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('vehicle_expenses')
        .select('*')
        .eq('owner_id', ownerId)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      set({ expenses: data || [] });
    } finally {
      set({ loading: false });
    }
  },

  logExpense: async (data) => {
    const { data: created, error } = await supabase
      .from('vehicle_expenses')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    set((state) => ({ expenses: [created, ...state.expenses] }));
    return created;
  },

  deleteExpense: async (id) => {
    const { error } = await supabase
      .from('vehicle_expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
  },
}));

export default useExpenseStore;
