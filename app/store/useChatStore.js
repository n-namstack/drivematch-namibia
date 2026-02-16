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
  fetchConversations: async (userId, userRole) => {
    set({ loading: true, error: null });

    try {
      let query = supabase
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
        .order('last_message_at', { ascending: false });

      if (userRole === 'owner') {
        query = query.eq('owner_id', userId);
      } else {
        // For drivers, we need to find conversations where they are the driver
        const { data: driverProfile } = await supabase
          .from('driver_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (driverProfile) {
          query = query.eq('driver_id', driverProfile.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ conversations: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  startConversation: async (ownerId, driverId) => {
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
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
        .select()
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
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ messages: data, loading: false });
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
      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);

      // Reset unread count
      const updateField = userRole === 'owner' ? 'owner_unread_count' : 'driver_unread_count';
      await supabase
        .from('conversations')
        .update({ [updateField]: 0 })
        .eq('id', conversationId);

      // Update local state
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, [updateField]: 0 }
            : conv
        ),
      }));
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  },

  subscribeToMessages: (conversationId, callback) => {
    // Unsubscribe from previous subscription if exists
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
          // Fetch the complete message with sender info
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
            set((state) => ({
              messages: [...state.messages, data],
            }));
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
    set({ currentConversation: conversation, messages: [] });
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
}));

export default useChatStore;
