import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../lib/supabase';
import { NAMIBIA_LOCATIONS } from '../constants/theme';

const CACHE_KEY = 'namibia_locations';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let memoryCache = null;

const locationService = {
  /**
   * Fetches Namibia locations from Supabase, with local caching.
   * Falls back to the hardcoded list if the fetch fails.
   */
  getLocations: async () => {
    // Return memory cache if available
    if (memoryCache) return memoryCache;

    // Check AsyncStorage cache
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { locations, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL && locations?.length > 0) {
          memoryCache = locations;
          return locations;
        }
      }
    } catch {
      // Cache read failed, continue to fetch
    }

    // Fetch from Supabase
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const locations = data.map((l) => l.name);
      if (locations.length > 0) {
        memoryCache = locations;
        // Save to cache (fire and forget)
        AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ locations, timestamp: Date.now() })
        ).catch(() => {});
        return locations;
      }
    } catch {
      // Fetch failed, fall through to fallback
    }

    // Fallback to hardcoded list
    return NAMIBIA_LOCATIONS;
  },

  /** Clears the cached locations (useful after admin changes). */
  clearCache: async () => {
    memoryCache = null;
    await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
  },
};

export default locationService;
