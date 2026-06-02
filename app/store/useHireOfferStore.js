import { create } from 'zustand';
import supabase from '../lib/supabase';

const useHireOfferStore = create((set, get) => ({
  sentOffers: [],
  receivedOffers: [],
  loading: false,

  // Owner: send a direct hire offer to a driver
  sendOffer: async (ownerId, driverId, { title, message, job_type, start_date }) => {
    const { error } = await supabase.from('hire_offers').insert({
      owner_id: ownerId,
      driver_id: driverId,
      title,
      message: message || null,
      job_type: job_type || null,
      start_date: start_date || null,
    });
    if (error) throw error;
  },

  // Owner: fetch all offers they've sent
  fetchSentOffers: async (ownerId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('hire_offers')
        .select(`
          *,
          driver:driver_id (
            id,
            firstname,
            lastname,
            profile_image,
            location
          )
        `)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ sentOffers: data || [] });
    } finally {
      set({ loading: false });
    }
  },

  // Driver: fetch all offers they've received
  fetchReceivedOffers: async (driverId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('hire_offers')
        .select(`
          *,
          owner:owner_id (
            id,
            firstname,
            lastname,
            profile_image
          )
        `)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ receivedOffers: data || [] });
    } finally {
      set({ loading: false });
    }
  },

  // Driver: accept or reject an offer
  respondToOffer: async (offerId, status) => {
    const { error } = await supabase
      .from('hire_offers')
      .update({ status })
      .eq('id', offerId);
    if (error) throw error;
    set((state) => ({
      receivedOffers: state.receivedOffers.map((o) =>
        o.id === offerId ? { ...o, status } : o,
      ),
    }));
  },

  // Owner: withdraw a pending offer
  withdrawOffer: async (offerId) => {
    const { error } = await supabase
      .from('hire_offers')
      .update({ status: 'withdrawn' })
      .eq('id', offerId);
    if (error) throw error;
    set((state) => ({
      sentOffers: state.sentOffers.map((o) =>
        o.id === offerId ? { ...o, status: 'withdrawn' } : o,
      ),
    }));
  },

  // Derived: number of pending offers for a driver
  pendingCount: () =>
    get().receivedOffers.filter((o) => o.status === 'pending').length,
}));

export default useHireOfferStore;
