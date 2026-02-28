import { create } from 'zustand';
import agreementService from '../services/agreementService';
import supabase from '../lib/supabase';

const useAgreementStore = create((set, get) => ({
  // State
  agreements: [],
  activeAgreement: null,
  earnings: [],
  summary: null,
  loading: false,
  error: null,

  // --- Agreement Actions ---

  fetchMyAgreements: async (userId, role, driverProfileId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = role === 'driver'
        ? await agreementService.fetchAgreementsForDriver(driverProfileId)
        : await agreementService.fetchAgreementsForOwner(userId);

      if (error) {
        set({ error: error.message, loading: false });
        return { error };
      }
      set({ agreements: data || [], loading: false });
      return { data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { error };
    }
  },

  fetchAgreementById: async (agreementId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await agreementService.fetchAgreementById(agreementId);
      if (error) {
        set({ error: error.message, loading: false });
        return { error };
      }
      set({ activeAgreement: data, loading: false });
      return { data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { error };
    }
  },

  createAgreement: async (agreementData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await agreementService.createAgreement(agreementData);
      if (error) {
        set({ error: error.message, loading: false });
        return { data: null, error };
      }
      set((state) => ({
        agreements: [data, ...state.agreements],
        loading: false,
      }));
      return { data, error: null };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { data: null, error };
    }
  },

  updateAgreement: async (agreementId, updates) => {
    try {
      const { data, error } = await agreementService.updateAgreement(agreementId, updates);
      if (error) return { error };
      set((state) => ({
        agreements: state.agreements.map((a) => (a.id === agreementId ? { ...a, ...data } : a)),
        activeAgreement: state.activeAgreement?.id === agreementId
          ? { ...state.activeAgreement, ...data }
          : state.activeAgreement,
      }));
      return { data };
    } catch (error) {
      return { error };
    }
  },

  endAgreement: async (agreementId) => {
    return get().updateAgreement(agreementId, { status: 'ended' });
  },

  // --- Earnings Actions ---

  fetchEarnings: async (agreementId, options = {}) => {
    try {
      const { data, error } = await agreementService.fetchEarnings(agreementId, options);
      if (error) return { error };
      set({ earnings: data || [] });
      return { data };
    } catch (error) {
      return { error };
    }
  },

  logEarning: async (earningData) => {
    try {
      const { data, error } = await agreementService.logEarning(earningData);
      if (error) return { data: null, error };
      set((state) => ({
        earnings: [data, ...state.earnings],
      }));
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  updateEarning: async (earningId, updates, wasVerified) => {
    try {
      const { data, error } = await agreementService.updateEarning(earningId, updates, wasVerified);
      if (error) return { error };
      set((state) => ({
        earnings: state.earnings.map((e) => (e.id === earningId ? data : e)),
      }));
      return { data };
    } catch (error) {
      return { error };
    }
  },

  verifyEarning: async (earningId) => {
    try {
      const { data, error } = await agreementService.verifyEarning(earningId);
      if (error) return { error };
      set((state) => ({
        earnings: state.earnings.map((e) => (e.id === earningId ? data : e)),
      }));
      return { data };
    } catch (error) {
      return { error };
    }
  },

  disputeEarning: async (earningId, disputeNote) => {
    try {
      const { data, error } = await agreementService.disputeEarning(earningId, disputeNote);
      if (error) return { error };
      set((state) => ({
        earnings: state.earnings.map((e) => (e.id === earningId ? data : e)),
      }));
      return { data };
    } catch (error) {
      return { error };
    }
  },

  // --- Dashboard ---

  fetchSummary: async (agreementId) => {
    try {
      const { data, error } = await agreementService.fetchSummary(agreementId);
      if (error) return { error };
      set({ summary: data });
      return { data };
    } catch (error) {
      return { error };
    }
  },

  // --- Realtime ---

  realtimeSubscription: null,

  subscribeToEarnings: (agreementId) => {
    // Unsubscribe from previous if any
    get().unsubscribeFromEarnings();

    const channel = supabase
      .channel(`earnings-${agreementId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_earnings',
          filter: `agreement_id=eq.${agreementId}`,
        },
        () => {
          // Refresh earnings and summary on any change
          get().fetchEarnings(agreementId, { limit: 10 });
          get().fetchSummary(agreementId);
        }
      )
      .subscribe();

    set({ realtimeSubscription: channel });
  },

  unsubscribeFromEarnings: () => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
      set({ realtimeSubscription: null });
    }
  },

  // --- Reset ---

  resetStore: () => {
    get().unsubscribeFromEarnings();
    set({
      agreements: [],
      activeAgreement: null,
      earnings: [],
      summary: null,
      loading: false,
      error: null,
    });
  },
}));

export default useAgreementStore;
