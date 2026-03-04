import supabase from '../lib/supabase';

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

let memoryCache = null;
let cacheTimestamp = 0;

const demandService = {
  /**
   * Fetches per-location demand/supply insights via the get_demand_insights() RPC.
   * Caches in memory for 15 minutes.
   * Returns: [{ location, openJobs, activeDrivers, demandScore }]
   */
  getDemandInsights: async () => {
    if (memoryCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      return memoryCache;
    }

    const { data, error } = await supabase.rpc('get_demand_insights');

    if (error) throw error;

    const insights = (data || []).map((row) => ({
      location: row.location_name,
      openJobs: Number(row.open_jobs),
      activeDrivers: Number(row.active_drivers),
      demandScore: Number(row.demand_score),
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
    }));

    memoryCache = insights;
    cacheTimestamp = Date.now();
    return insights;
  },

  clearCache: () => {
    memoryCache = null;
    cacheTimestamp = 0;
  },
};

export default demandService;
