import { create } from 'zustand';
import demandService from '../services/demandService';

const STALE_TTL = 15 * 60 * 1000; // 15 minutes

const useDemandStore = create((set, get) => ({
  insights: [],
  loading: false,
  error: null,
  lastFetched: 0,

  fetchInsights: async (force = false) => {
    const { lastFetched, loading } = get();
    if (loading) return;
    if (!force && lastFetched && Date.now() - lastFetched < STALE_TTL) return;

    set({ loading: true, error: null });
    try {
      const data = await demandService.getDemandInsights();
      set({ insights: data, loading: false, lastFetched: Date.now() });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  getTopLocations: (count = 5) => {
    return get().insights.slice(0, count);
  },

  resetStore: () => set({ insights: [], loading: false, error: null, lastFetched: 0 }),
}));

export default useDemandStore;
