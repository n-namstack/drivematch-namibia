import { create } from 'zustand';
import supabase from '../lib/supabase';

const useDriverStore = create((set, get) => ({
  // State
  drivers: [],
  featuredDrivers: [],
  selectedDriver: null,
  savedDrivers: [],
  loading: false,
  error: null,
  filters: {
    location: null,
    minExperience: null,
    availability: null,
    vehicleTypes: null,
    minRating: null,
    hasPdp: null,
  },
  pagination: {
    page: 0,
    limit: 20,
    hasMore: true,
  },

  // Actions
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      drivers: [],
      pagination: { ...state.pagination, page: 0, hasMore: true },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        location: null,
        minExperience: null,
        availability: null,
        vehicleTypes: null,
        minRating: null,
        hasPdp: null,
      },
      drivers: [],
      pagination: { page: 0, limit: 20, hasMore: true },
    });
  },

  searchDrivers: async (resetList = false) => {
    const { filters, pagination, drivers } = get();

    if (!pagination.hasMore && !resetList) return;

    set({ loading: true, error: null });

    try {
      const offset = resetList ? 0 : pagination.page * pagination.limit;

      const { data, error } = await supabase.rpc('search_drivers', {
        p_location: filters.location,
        p_min_experience: filters.minExperience,
        p_availability: filters.availability,
        p_vehicle_types: filters.vehicleTypes,
        p_min_rating: filters.minRating,
        p_has_pdp: filters.hasPdp,
        p_limit: pagination.limit,
        p_offset: offset,
      });

      if (error) throw error;

      const newDrivers = resetList ? data : [...drivers, ...data];

      set({
        drivers: newDrivers,
        loading: false,
        pagination: {
          ...pagination,
          page: resetList ? 1 : pagination.page + 1,
          hasMore: data.length === pagination.limit,
        },
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchFeaturedDrivers: async () => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          *,
          profiles:user_id (
            firstname,
            lastname,
            profile_image,
            location
          )
        `)
        .eq('is_featured', true)
        .order('rating', { ascending: false })
        .limit(10);

      if (error) throw error;
      set({ featuredDrivers: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchDriverById: async (driverId) => {
    set({ loading: true, error: null, selectedDriver: null });

    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          *,
          profiles:user_id (
            firstname,
            lastname,
            email,
            phone,
            profile_image,
            location
          ),
          work_history (*),
          driver_documents (
            id,
            document_type,
            verification_status,
            expiry_date
          ),
          driver_reviews (
            *,
            reviewer:reviewer_id (
              firstname,
              lastname,
              profile_image
            )
          )
        `)
        .eq('id', driverId)
        .single();

      if (error) throw error;
      set({ selectedDriver: data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  fetchSavedDrivers: async (ownerId) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('saved_drivers')
        .select(`
          *,
          driver:driver_id (
            *,
            profiles:user_id (
              firstname,
              lastname,
              profile_image,
              location
            )
          )
        `)
        .eq('owner_id', ownerId);

      if (error) throw error;
      set({ savedDrivers: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  saveDriver: async (ownerId, driverId, notes = '') => {
    try {
      const { data, error } = await supabase
        .from('saved_drivers')
        .insert({ owner_id: ownerId, driver_id: driverId, notes })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        savedDrivers: [...state.savedDrivers, data],
      }));

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  unsaveDriver: async (ownerId, driverId) => {
    try {
      const { error } = await supabase
        .from('saved_drivers')
        .delete()
        .eq('owner_id', ownerId)
        .eq('driver_id', driverId);

      if (error) throw error;

      set((state) => ({
        savedDrivers: state.savedDrivers.filter(
          (sd) => sd.driver_id !== driverId
        ),
      }));

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },

  submitReview: async (review) => {
    try {
      const { data, error } = await supabase
        .from('driver_reviews')
        .insert(review)
        .select()
        .single();

      if (error) throw error;

      // Refresh driver data to get updated rating
      if (get().selectedDriver?.id === review.driver_id) {
        await get().fetchDriverById(review.driver_id);
      }

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },
}));

export default useDriverStore;
