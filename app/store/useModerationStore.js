import { create } from 'zustand';
import supabase from '../lib/supabase';

const useModerationStore = create((set, get) => ({
  // Set of auth user ids the current account has blocked
  blockedIds: new Set(),
  blockedUsers: [],
  loading: false,

  fetchBlocked: async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          blocked_id,
          created_at,
          blocked:blocked_id (
            firstname,
            lastname,
            profile_image
          )
        `)
        .eq('blocker_id', userId);

      if (error) throw error;

      set({
        blockedIds: new Set((data || []).map((row) => row.blocked_id)),
        blockedUsers: data || [],
      });
    } catch (err) {
      // Block list fetch failed silently — feed stays unfiltered
    }
  },

  blockUser: async (blockerId, blockedId, reason = null) => {
    if (!blockerId || !blockedId) {
      return { error: new Error('Missing user id') };
    }
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: blockerId, blocked_id: blockedId });

      if (error && error.code !== '23505') throw error; // ignore duplicate block

      // Notify the developer/admins via the existing reports table
      await supabase.from('reports').insert({
        reporter_id: blockerId,
        reported_user_id: blockedId,
        reason: 'blocked',
        details: reason || 'User blocked an account',
      });

      const next = new Set(get().blockedIds);
      next.add(blockedId);
      set({ blockedIds: next });

      // Refresh the detailed list for the management screen
      get().fetchBlocked(blockerId);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },

  unblockUser: async (blockerId, blockedId) => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);

      if (error) throw error;

      const next = new Set(get().blockedIds);
      next.delete(blockedId);
      set({
        blockedIds: next,
        blockedUsers: get().blockedUsers.filter((u) => u.blocked_id !== blockedId),
      });
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },

  isBlocked: (userId) => get().blockedIds.has(userId),

  resetStore: () => set({ blockedIds: new Set(), blockedUsers: [], loading: false }),
}));

export default useModerationStore;
