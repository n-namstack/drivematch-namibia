import { create } from 'zustand';
import supabase from '../lib/supabase';

// ─── helpers ────────────────────────────────────────────────────────────────

const isoDate = (d) => d.toISOString().split('T')[0];

const startOfMonth = () => {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
};

const sevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return isoDate(d);
};

const startOfLastMonth = () => {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth() - 1, 1));
};

const endOfLastMonth = () => {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 0));
};

const startOfYear = () => isoDate(new Date(new Date().getFullYear(), 0, 1));

export const filterEntries = (entries, filter, customRange = null) => {
  if (filter === 'month') {
    const from = startOfMonth();
    return entries.filter((e) => e.entry_date >= from);
  }
  if (filter === '7days') {
    const from = sevenDaysAgo();
    return entries.filter((e) => e.entry_date >= from);
  }
  if (filter === 'lastMonth') {
    const from = startOfLastMonth();
    const to   = endOfLastMonth();
    return entries.filter((e) => e.entry_date >= from && e.entry_date <= to);
  }
  if (filter === 'year') {
    const from = startOfYear();
    return entries.filter((e) => e.entry_date >= from);
  }
  if (filter === 'custom' && customRange?.from && customRange?.to) {
    return entries.filter((e) => e.entry_date >= customRange.from && e.entry_date <= customRange.to);
  }
  return entries;
};

export const getTotals = (entries, agreement, filter = 'all', customRange = null) => {
  const filtered = filterEntries(entries, filter, customRange);
  const totalBrought = filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const daysWorked = filtered.filter((e) => parseFloat(e.amount) > 0).length;
  const driverCut =
    agreement.agreement_type === 'daily_remittance' && agreement.owner_percentage
      ? totalBrought * (parseFloat(agreement.owner_percentage) / 100)
      : 0;
  return { totalBrought, driverCut, daysWorked };
};

export const getBuyoutProgress = (agreement, entries) => {
  const totalPaid = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const target = parseFloat(agreement.buyout_target || 0);
  const remaining = Math.max(0, target - totalPaid);
  const progressPct = target > 0 ? Math.min(100, (totalPaid / target) * 100) : 0;
  const dailyAmt = parseFloat(agreement.daily_amount || 0);
  const daysLeft = dailyAmt > 0 ? Math.ceil(remaining / dailyAmt) : null;
  const estCompletion = daysLeft
    ? new Date(Date.now() + daysLeft * 86400000).toLocaleDateString('en-NA', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null;
  return { totalPaid, remaining, progressPct, estCompletion };
};

// ─── store ───────────────────────────────────────────────────────────────────

const useAgreementStore = create((set, get) => ({
  agreements: [],
  activeAgreement: null,
  entries: [],
  loading: false,

  fetchAgreements: async (userId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('driver_agreements')
        .select(`
          *,
          owner:owner_id ( id, firstname, lastname, profile_image ),
          driver:driver_id ( id, firstname, lastname, profile_image )
        `)
        .or(`owner_id.eq.${userId},driver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ agreements: data || [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchAgreement: async (id) => {
    set({ loading: true });
    try {
      const [{ data: agreement, error: aErr }, { data: entries, error: eErr }] =
        await Promise.all([
          supabase
            .from('driver_agreements')
            .select(`
              *,
              owner:owner_id ( id, firstname, lastname, profile_image ),
              driver:driver_id ( id, firstname, lastname, profile_image )
            `)
            .eq('id', id)
            .single(),
          supabase
            .from('agreement_entries')
            .select('*')
            .eq('agreement_id', id)
            .order('entry_date', { ascending: false })
            .limit(150),
        ]);
      if (aErr) throw aErr;
      if (eErr) throw eErr;
      set({ activeAgreement: agreement, entries: entries || [] });
    } finally {
      set({ loading: false });
    }
  },

  // Owner creates agreement — owner_signed_at is set automatically by DB DEFAULT NOW()
  createAgreement: async (data) => {
    const { data: created, error } = await supabase
      .from('driver_agreements')
      .insert({ ...data, status: 'pending_signature' })
      .select()
      .single();
    if (error) throw error;
    return created;
  },

  // Driver signs the agreement → becomes active
  signAgreement: async (agreementId) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('driver_agreements')
      .update({ driver_signed_at: now, status: 'active' })
      .eq('id', agreementId)
      .select()
      .single();
    if (error) throw error;
    set((state) => ({
      agreements: state.agreements.map((a) => (a.id === agreementId ? { ...a, ...data } : a)),
      activeAgreement: state.activeAgreement?.id === agreementId
        ? { ...state.activeAgreement, ...data }
        : state.activeAgreement,
    }));
  },

  // Driver logs a daily entry and signs it in one step
  // Refuses to overwrite a locked entry
  logEntry: async (agreementId, ownerId, driverId, { entry_date, amount, is_public_holiday, notes }) => {
    const existing = get().entries.find((e) => e.entry_date === entry_date && e.agreement_id === agreementId);
    if (existing?.is_locked) {
      throw new Error('LOCKED');
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('agreement_entries')
      .upsert(
        {
          agreement_id: agreementId, owner_id: ownerId, driver_id: driverId,
          entry_date, amount: parseFloat(amount),
          is_public_holiday: !!is_public_holiday, notes: notes || null,
          driver_confirmed_at: now,   // driver signs when logging
          owner_confirmed_at: null,   // owner hasn't confirmed receipt yet
          is_locked: false,
        },
        { onConflict: 'agreement_id,entry_date' },
      )
      .select()
      .single();
    if (error) throw error;
    set((state) => {
      const idx = state.entries.findIndex((e) => e.entry_date === entry_date && e.agreement_id === agreementId);
      const updated =
        idx >= 0
          ? state.entries.map((e, i) => (i === idx ? data : e))
          : [data, ...state.entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      return { entries: updated };
    });
    return data;
  },

  // Owner confirms receipt of an entry → locked forever
  confirmEntry: async (entryId) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('agreement_entries')
      .update({ owner_confirmed_at: now, is_locked: true })
      .eq('id', entryId)
      .select()
      .single();
    if (error) throw error;
    set((state) => ({
      entries: state.entries.map((e) => (e.id === entryId ? data : e)),
    }));
  },

  updateAgreementStatus: async (id, status) => {
    const { error } = await supabase
      .from('driver_agreements')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    set((state) => ({
      agreements: state.agreements.map((a) => (a.id === id ? { ...a, status } : a)),
      activeAgreement: state.activeAgreement?.id === id
        ? { ...state.activeAgreement, status }
        : state.activeAgreement,
    }));
  },

  uploadContractDocument: async (agreementId, fileUri, mimeType) => {
    const ext = fileUri.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `agreements/${agreementId}/contract.${ext}`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error: uploadErr } = await supabase.storage
      .from('driver_documents')
      .upload(path, blob, { contentType: mimeType || 'application/pdf', upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from('driver_documents').getPublicUrl(path);
    const url = urlData.publicUrl;
    const { error: updateErr } = await supabase
      .from('driver_agreements')
      .update({ contract_document_url: url })
      .eq('id', agreementId);
    if (updateErr) throw updateErr;
    set((state) => ({
      activeAgreement: state.activeAgreement?.id === agreementId
        ? { ...state.activeAgreement, contract_document_url: url }
        : state.activeAgreement,
    }));
    return url;
  },
}));

export default useAgreementStore;
