import supabase from '../lib/supabase';

const agreementService = {
  // --- Agreements ---

  createAgreement: async (data) => {
    try {
      const { data: agreement, error } = await supabase
        .from('driver_agreements')
        .insert(data)
        .select()
        .single();
      return { data: agreement, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  fetchAgreementsForOwner: async (ownerId) => {
    try {
      const { data, error } = await supabase
        .from('driver_agreements')
        .select(`
          *,
          driver_profiles:driver_id (
            id,
            user_id,
            profiles:user_id ( firstname, lastname, profile_image )
          )
        `)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  fetchAgreementsForDriver: async (driverProfileId) => {
    try {
      const { data, error } = await supabase
        .from('driver_agreements')
        .select(`
          *,
          owner:owner_id ( firstname, lastname, profile_image )
        `)
        .eq('driver_id', driverProfileId)
        .order('created_at', { ascending: false });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  fetchAgreementById: async (agreementId) => {
    try {
      const { data, error } = await supabase
        .from('driver_agreements')
        .select(`
          *,
          driver_profiles:driver_id (
            id,
            user_id,
            profiles:user_id ( firstname, lastname, profile_image, phone )
          ),
          owner:owner_id ( firstname, lastname, profile_image, phone )
        `)
        .eq('id', agreementId)
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  updateAgreement: async (agreementId, updates) => {
    try {
      const { data, error } = await supabase
        .from('driver_agreements')
        .update(updates)
        .eq('id', agreementId)
        .select()
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  checkExistingAgreement: async (ownerId, driverId) => {
    try {
      const { data, error } = await supabase
        .from('driver_agreements')
        .select('id, status')
        .eq('owner_id', ownerId)
        .eq('driver_id', driverId)
        .eq('status', 'active')
        .maybeSingle();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // --- Daily Earnings ---

  logEarning: async (earningData) => {
    try {
      const { data, error } = await supabase
        .from('daily_earnings')
        .insert(earningData)
        .select()
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  updateEarning: async (earningId, updates, wasVerified) => {
    try {
      // If the entry was verified and amounts changed, revert to unverified
      const updateData = { ...updates };
      if (wasVerified) {
        updateData.verification_status = 'unverified';
        updateData.verified_at = null;
      }
      const { data, error } = await supabase
        .from('daily_earnings')
        .update(updateData)
        .eq('id', earningId)
        .select()
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  fetchEarnings: async (agreementId, options = {}) => {
    try {
      let query = supabase
        .from('daily_earnings')
        .select('*')
        .eq('agreement_id', agreementId)
        .order('date', { ascending: false });

      if (options.status) {
        query = query.eq('verification_status', options.status);
      }
      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  verifyEarning: async (earningId) => {
    try {
      const { data, error } = await supabase
        .from('daily_earnings')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
        })
        .eq('id', earningId)
        .select()
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  disputeEarning: async (earningId, disputeNote) => {
    try {
      const { data, error } = await supabase
        .from('daily_earnings')
        .update({
          verification_status: 'disputed',
          dispute_note: disputeNote,
        })
        .eq('id', earningId)
        .select()
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  checkExistingEntry: async (agreementId, date) => {
    try {
      const { data, error } = await supabase
        .from('daily_earnings')
        .select('*')
        .eq('agreement_id', agreementId)
        .eq('date', date)
        .maybeSingle();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // --- Dashboard ---

  fetchSummary: async (agreementId) => {
    try {
      const { data, error } = await supabase
        .rpc('get_agreement_summary', { p_agreement_id: agreementId });
      // RPC returns an array, take first row
      const summary = Array.isArray(data) ? data[0] : data;
      return { data: summary, error };
    } catch (error) {
      return { data: null, error };
    }
  },
};

export default agreementService;
