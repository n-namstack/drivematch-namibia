import { create } from 'zustand';
import supabase from '../lib/supabase';

const useJobStore = create((set, get) => ({
  // State
  jobs: [],
  myJobs: [],
  myInterests: [],
  selectedJob: null,
  loading: false,
  error: null,
  pagination: {
    page: 0,
    limit: 20,
    hasMore: true,
  },

  // Fetch open job posts (for drivers browsing)
  fetchJobs: async (resetList = false) => {
    const { pagination, jobs } = get();
    if (!pagination.hasMore && !resetList) return;

    set({ loading: true, error: null });
    try {
      const offset = resetList ? 0 : pagination.page * pagination.limit;

      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          *,
          owner:owner_id (
            firstname,
            lastname,
            profile_image,
            location
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .range(offset, offset + pagination.limit - 1);

      if (error) throw error;

      set({
        jobs: resetList ? data : [...jobs, ...data],
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

  // Fetch owner's own job posts
  fetchMyJobs: async (ownerId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ myJobs: data || [], loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Fetch a single job post with details
  fetchJobById: async (jobId) => {
    set({ selectedJob: null });
    try {
      // Fetch the job post + owner (no join on job_interests to avoid RLS issues)
      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          *,
          owner:owner_id (
            id,
            firstname,
            lastname,
            profile_image,
            location,
            phone
          )
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;

      // Fetch interests separately, then batch-fetch driver details
      let interests = [];
      try {
        // Step 1: flat interests
        const { data: intData, error: intError } = await supabase
          .from('job_interests')
          .select('id, status, message, created_at, driver_id')
          .eq('job_post_id', jobId);

        if (intError) {
          console.warn('Failed to fetch interests for job', jobId, intError.message);
        }

        const rawInterests = intData || [];

        // Step 2: batch-fetch driver profiles for interested drivers
        const driverIds = [...new Set(rawInterests.map((i) => i.driver_id).filter(Boolean))];
        let driverMap = {};
        if (driverIds.length > 0) {
          // Fetch one-by-one using same query pattern as fetchDriverById
          const driverResults = await Promise.all(
            driverIds.map(async (dId) => {
              try {
                const { data: drv } = await supabase
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
                  .eq('id', dId)
                  .single();
                return drv;
              } catch (_) {
                return null;
              }
            })
          );
          driverResults.forEach((drv) => {
            if (drv) driverMap[drv.id] = drv;
          });
        }

        interests = rawInterests.map((i) => ({
          ...i,
          driver: driverMap[i.driver_id] || null,
        }));
      } catch (e) {
        console.warn('Error fetching interests:', e);
      }

      const result = { ...data, job_interests: interests };
      set({ selectedJob: result });
      return result;
    } catch (err) {
      return null;
    }
  },

  // Create a new job post (owner)
  createJob: async (jobData) => {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .insert(jobData)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        myJobs: [data, ...state.myJobs],
      }));

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // Update a job post (owner)
  updateJob: async (jobId, updates) => {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .update(updates)
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        myJobs: state.myJobs.map((j) => (j.id === jobId ? { ...j, ...data } : j)),
        selectedJob: state.selectedJob?.id === jobId ? { ...state.selectedJob, ...data } : state.selectedJob,
      }));

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // Delete a job post (owner)
  deleteJob: async (jobId) => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      set((state) => ({
        myJobs: state.myJobs.filter((j) => j.id !== jobId),
      }));

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },

  // Express interest in a job (driver)
  expressInterest: async (jobPostId, driverId, message = '') => {
    try {
      const { data, error } = await supabase
        .from('job_interests')
        .insert({
          job_post_id: jobPostId,
          driver_id: driverId,
          message: message || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state immediately so UI reflects the change
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobPostId
            ? { ...j, interest_count: (j.interest_count || 0) + 1 }
            : j
        ),
        myInterests: [...state.myInterests, jobPostId],
      }));

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // Withdraw interest (driver)
  withdrawInterest: async (jobPostId, driverId) => {
    try {
      const { error } = await supabase
        .from('job_interests')
        .delete()
        .eq('job_post_id', jobPostId)
        .eq('driver_id', driverId);

      if (error) throw error;

      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobPostId
            ? { ...j, interest_count: Math.max((j.interest_count || 1) - 1, 0) }
            : j
        ),
        myInterests: state.myInterests.filter((id) => id !== jobPostId),
      }));

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },

  // Fetch driver's own interests (to know which jobs they've expressed interest in)
  fetchMyInterests: async (driverId) => {
    try {
      const { data, error } = await supabase
        .from('job_interests')
        .select('job_post_id')
        .eq('driver_id', driverId);

      if (error) throw error;
      set({ myInterests: (data || []).map((d) => d.job_post_id) });
    } catch (err) {
      // Non-critical
    }
  },

  // Update interest status (owner accepts/rejects)
  updateInterestStatus: async (interestId, status) => {
    try {
      const { data, error } = await supabase
        .from('job_interests')
        .update({ status })
        .eq('id', interestId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  resetStore: () => {
    set({
      jobs: [],
      myJobs: [],
      myInterests: [],
      selectedJob: null,
      loading: false,
      error: null,
      pagination: { page: 0, limit: 20, hasMore: true },
    });
  },
}));

export default useJobStore;
