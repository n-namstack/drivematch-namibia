import supabase from '../lib/supabase';

const profileViewService = {
  /**
   * Record a profile view with unique daily deduplication.
   * - Won't count self-views (driver viewing their own profile)
   * - Won't count duplicate views from the same person on the same day
   * - Updates the cached profile_views count on driver_profiles
   */
  recordView: async (viewerId, driverId) => {
    if (!viewerId || !driverId) return;

    try {
      await supabase.rpc('record_profile_view', {
        p_viewer_id: viewerId,
        p_driver_id: driverId,
      });
    } catch (e) {
      // Silently fail — view tracking should never block the user experience
    }
  },

  /**
   * Fetch recent viewers of a driver's profile.
   * Useful for a "Who viewed your profile" feature later.
   */
  fetchRecentViewers: async (driverId, limit = 20) => {
    try {
      const { data, error } = await supabase
        .from('profile_view_logs')
        .select(`
          viewer_id,
          viewed_at,
          viewer:viewer_id (
            firstname,
            lastname,
            profile_image,
            location,
            role
          )
        `)
        .eq('viewed_driver_id', driverId)
        .order('viewed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Get the total unique viewer count for a driver.
   */
  fetchUniqueViewCount: async (driverId) => {
    try {
      const { count, error } = await supabase
        .from('profile_view_logs')
        .select('viewer_id', { count: 'exact', head: true })
        .eq('viewed_driver_id', driverId);

      if (error) throw error;
      return { count: count || 0, error: null };
    } catch (err) {
      return { count: 0, error: err };
    }
  },
};

export default profileViewService;
