import { create } from 'zustand';
import supabase from '../lib/supabase';

const useChatStore = create((set, get) => ({
  // State
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  realtimeSubscription: null,

  // Actions
  fetchConversations: async (userId, userRole, driverProfileId = null) => {
    const { conversations: cached } = get();
    // Only show full loading on first load (no cached data)
    if (cached.length === 0) {
      set({ loading: true, error: null });
    }

    try {
      let query = supabase
        .from('conversations')
        .select(`
          id,
          owner_id,
          driver_id,
          last_message_at,
          owner_unread_count,
          driver_unread_count,
          owner:owner_id (
            firstname,
            lastname,
            profile_image
          ),
          driver:driver_id (
            id,
            user_id,
            profiles:user_id (
              firstname,
              lastname,
              profile_image
            )
          ),
          messages (
            content,
            sender_id,
            created_at
          )
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { referencedTable: 'messages', ascending: false })
        .limit(1, { referencedTable: 'messages' });

      if (userRole === 'owner') {
        query = query.eq('owner_id', userId);
      } else if (driverProfileId) {
        query = query.eq('driver_id', driverProfileId);
      } else {
        // Fallback: fetch driver profile id
        const { data: dp } = await supabase
          .from('driver_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (dp) {
          query = query.eq('driver_id', dp.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const processed = (data || []).map((conv) => ({
        ...conv,
        last_message: conv.messages?.[0] || null,
      }));

      set({ conversations: processed, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchConversationById: async (conversationId) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          owner:owner_id (
            firstname,
            lastname,
            profile_image
          ),
          driver:driver_id (
            id,
            user_id,
            profiles:user_id (
              firstname,
              lastname,
              profile_image
            )
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      set({ currentConversation: data });
      return data;
    } catch (err) {
      return null;
    }
  },

  startConversation: async (ownerId, driverId) => {
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select(`
          *,
          owner:owner_id (
            firstname,
            lastname,
            profile_image
          ),
          driver:driver_id (
            id,
            user_id,
            profiles:user_id (
              firstname,
              lastname,
              profile_image
            )
          )
        `)
        .eq('owner_id', ownerId)
        .eq('driver_id', driverId)
        .single();

      if (existing) {
        set({ currentConversation: existing });
        return { data: existing, error: null };
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({ owner_id: ownerId, driver_id: driverId })
        .select(`
          *,
          owner:owner_id (
            firstname,
            lastname,
            profile_image
          ),
          driver:driver_id (
            id,
            user_id,
            profiles:user_id (
              firstname,
              lastname,
              profile_image
            )
          )
        `)
        .single();

      if (error) throw error;

      set((state) => ({
        conversations: [data, ...state.conversations],
        currentConversation: data,
      }));

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  fetchMessages: async (conversationId) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            firstname,
            lastname,
            profile_image
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      set({ messages: data || [], loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  sendMessage: async (conversationId, senderId, content, messageType = 'text', attachmentUrl = null) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: messageType,
          attachment_url: attachmentUrl,
        })
        .select(`
          *,
          sender:sender_id (
            firstname,
            lastname,
            profile_image
          )
        `)
        .single();

      if (error) throw error;

      set((state) => ({
        messages: [...state.messages, data],
      }));

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  markMessagesAsRead: async (conversationId, userId, userRole) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);

      const updateField = userRole === 'owner' ? 'owner_unread_count' : 'driver_unread_count';
      await supabase
        .from('conversations')
        .update({ [updateField]: 0 })
        .eq('id', conversationId);

      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, [updateField]: 0 }
            : conv
        ),
      }));
    } catch (err) {
      // Silent fail for read receipts
    }
  },

  subscribeToMessages: (conversationId, callback) => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:sender_id (
                firstname,
                lastname,
                profile_image
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            set((state) => {
              const exists = state.messages.some((m) => m.id === data.id);
              if (exists) return state;
              return { messages: [...state.messages, data] };
            });
            callback?.(data);
          }
        }
      )
      .subscribe();

    set({ realtimeSubscription: channel });
    return channel;
  },

  unsubscribeFromMessages: () => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
      set({ realtimeSubscription: null });
    }
  },

  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation, messages: [], loading: true });
  },

  clearChat: () => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
    }
    set({
      currentConversation: null,
      messages: [],
      realtimeSubscription: null,
    });
  },

  // Reset store on logout to prevent data leakage between accounts
  resetStore: () => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
    }
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      loading: false,
      error: null,
      realtimeSubscription: null,
    });
  },
}));

export default useChatStore;
