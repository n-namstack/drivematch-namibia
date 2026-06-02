import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Switch, Platform, Linking, Alert, Image, ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import useAgreementStore, { getTotals, getBuyoutProgress, filterEntries } from '../../store/useAgreementStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const FILTERS = [
  { key: 'all',       label: 'All Time' },
  { key: 'month',     label: 'This Month' },
  { key: '7days',     label: 'Last 7 Days' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'year',      label: 'This Year' },
  { key: 'custom',    label: 'Custom Range' },
];

const fmt = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtMoney = (n) =>
  `N$${parseFloat(n || 0).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Log Entry Modal (driver only) ───────────────────────────────────────────
const LogEntryModal = ({ visible, onClose, onSave }) => {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setDate(new Date()); setAmount(''); setIsHoliday(false); setNotes(''); setShowDatePicker(false); };

  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    setSaving(true);
    try {
      await onSave({ entry_date: date.toISOString().split('T')[0], amount: parseFloat(amount), is_public_holiday: isHoliday, notes: notes.trim() || null });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Log Today's Entry</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={modal.label}>Date</Text>
              <TouchableOpacity style={modal.dateBtn} onPress={() => setShowDatePicker((v) => !v)}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text style={modal.dateBtnText}>{fmt(date.toISOString().split('T')[0])}</Text>
                <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.gray[400]} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, d) => {
                    setShowDatePicker(false);
                    if (d) setDate(d);
                  }}
                />
              )}

              <Text style={[modal.label, { marginTop: SPACING.md }]}>
                Amount I Brought Today (N$) <Text style={{ color: COLORS.error }}>*</Text>
              </Text>
              <TextInput
                style={modal.input}
                placeholder="e.g. 400"
                placeholderTextColor={COLORS.gray[400]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                returnKeyType="done"
              />

              <View style={modal.row}>
                <Text style={modal.label}>Public Holiday</Text>
                <Switch value={isHoliday} onValueChange={setIsHoliday} trackColor={{ true: COLORS.primary }} thumbColor={COLORS.white} />
              </View>

              <Text style={modal.label}>Notes <Text style={modal.optional}>(optional)</Text></Text>
              <TextInput
                style={[modal.input, { height: 70, paddingTop: 10, textAlignVertical: 'top' }]}
                placeholder="Any notes for this day..."
                placeholderTextColor={COLORS.gray[400]}
                value={notes}
                onChangeText={setNotes}
                multiline
                returnKeyType="done"
              />

              <View style={modal.actions}>
                <TouchableOpacity style={modal.cancelBtn} onPress={() => { reset(); onClose(); }}>
                  <Text style={modal.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modal.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={modal.saveBtnText}>Save & Sign</Text>}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Entry Row ───────────────────────────────────────────────────────────────
const EntryRow = ({ item, isOwner, onConfirm }) => {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try { await onConfirm(item.id); }
    finally { setConfirming(false); }
  };

  const bothSigned   = item.is_locked;
  const ownerPending = !item.owner_confirmed_at;

  return (
    <View style={styles.entryRow}>
      <View style={styles.entryLeft}>
        <Text style={styles.entryDate}>{fmt(item.entry_date)}</Text>
        <View style={styles.entryChips}>
          {item.is_public_holiday && (
            <View style={styles.holidayChip}>
              <Text style={styles.holidayChipText}>Public Holiday</Text>
            </View>
          )}
          {bothSigned ? (
            <View style={styles.lockedChip}>
              <Ionicons name="lock-closed" size={10} color="#059669" />
              <Text style={styles.lockedChipText}>Both confirmed</Text>
            </View>
          ) : (
            <View style={styles.pendingChip}>
              <Ionicons name="time-outline" size={10} color="#D97706" />
              <Text style={styles.pendingChipText}>Awaiting owner</Text>
            </View>
          )}
        </View>
        {item.notes ? <Text style={styles.entryNotes} numberOfLines={1}>{item.notes}</Text> : null}

        {/* Signature indicators */}
        <View style={styles.sigsRow}>
          <View style={styles.sigItem}>
            <Ionicons name={item.driver_confirmed_at ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={item.driver_confirmed_at ? '#059669' : COLORS.gray[300]} />
            <Text style={styles.sigLabel}>Driver</Text>
          </View>
          <View style={styles.sigItem}>
            <Ionicons name={item.owner_confirmed_at ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={item.owner_confirmed_at ? '#059669' : COLORS.gray[300]} />
            <Text style={styles.sigLabel}>Owner</Text>
          </View>
        </View>
      </View>

      <View style={styles.entryRight}>
        <Text style={styles.entryAmount}>{fmtMoney(item.amount)}</Text>
        {isOwner && ownerPending && !bothSigned && (
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={confirming}>
            {confirming
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <Text style={styles.confirmBtnText}>Confirm</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const AgreementDetailScreen = ({ navigation, route }) => {
  const { agreementId } = route.params;
  const { profile } = useAuth();
  const activeAgreement = useAgreementStore((s) => s.activeAgreement);
  const entries         = useAgreementStore((s) => s.entries);
  const loading         = useAgreementStore((s) => s.loading);
  const fetchAgreement  = useAgreementStore((s) => s.fetchAgreement);
  const logEntry        = useAgreementStore((s) => s.logEntry);
  const signAgreement   = useAgreementStore((s) => s.signAgreement);
  const confirmEntry    = useAgreementStore((s) => s.confirmEntry);
  const updateAgreementStatus = useAgreementStore((s) => s.updateAgreementStatus);

  const [filter, setFilter]     = useState('all');
  const [customFrom, setCustomFrom] = useState(new Date());
  const [customTo, setCustomTo]     = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker]     = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [signing, setSigning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchAgreement(agreementId); }, [agreementId]);

  const onRefresh = async () => { setRefreshing(true); await fetchAgreement(agreementId); setRefreshing(false); };

  const handleLogEntry = async (data) => {
    try {
      await logEntry(agreementId, activeAgreement.owner_id, activeAgreement.driver_id, data);
      Toast.show({ type: 'success', text1: 'Entry logged!', text2: 'Owner will be notified to confirm receipt.' });
    } catch (err) {
      const msg = err?.message === 'LOCKED'
        ? 'This entry is locked and confirmed by both parties.'
        : err?.message?.includes('unique')
        ? 'An entry for this date already exists.'
        : 'Could not save entry.';
      Toast.show({ type: 'error', text1: msg });
      throw err;
    }
  };

  const handleSign = () => {
    Alert.alert(
      'Sign Agreement',
      'By signing you confirm you have read and agree to all terms of this agreement.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          onPress: async () => {
            setSigning(true);
            try {
              await signAgreement(agreementId);
              Toast.show({ type: 'success', text1: 'Agreement signed!', text2: 'The agreement is now active.' });
            } catch {
              Toast.show({ type: 'error', text1: 'Could not sign. Please try again.' });
            } finally {
              setSigning(false);
            }
          },
        },
      ],
    );
  };

  const handleConfirmEntry = async (entryId) => {
    try {
      await confirmEntry(entryId);
      Toast.show({ type: 'success', text1: 'Receipt confirmed!', text2: 'This entry is now locked by both parties.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not confirm. Please try again.' });
    }
  };

  const handleStatusChange = (status) => {
    Alert.alert(
      status === 'completed' ? 'Mark as Completed' : 'Terminate Agreement',
      status === 'completed'
        ? 'Are you sure this agreement has been fulfilled?'
        : 'Are you sure you want to terminate this agreement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: status === 'terminated' ? 'destructive' : 'default',
          onPress: async () => {
            try { await updateAgreementStatus(agreementId, status); Toast.show({ type: 'success', text1: `Agreement ${status}` }); }
            catch { Toast.show({ type: 'error', text1: 'Could not update status' }); }
          },
        },
      ],
    );
  };

  if (loading && !activeAgreement) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }
  if (!activeAgreement) return null;

  const isOwner  = activeAgreement.owner_id === profile?.id;
  const isDriver = activeAgreement.driver_id === profile?.id;
  const otherParty = isOwner ? activeAgreement.driver : activeAgreement.owner;
  const otherName  = otherParty ? `${otherParty.firstname ?? ''} ${otherParty.lastname ?? ''}`.trim() : 'Unknown';
  const isDaily    = activeAgreement.agreement_type === 'daily_remittance';
  const isPending  = activeAgreement.status === 'pending_signature';
  const isActive   = activeAgreement.status === 'active';
  const customRange = filter === 'custom'
    ? { from: customFrom.toISOString().split('T')[0], to: customTo.toISOString().split('T')[0] }
    : null;
  const totals     = getTotals(entries, activeAgreement, filter, customRange);
  const buyout     = !isDaily ? getBuyoutProgress(activeAgreement, entries) : null;
  const visibleEntries = filterEntries(entries, filter, customRange);
  const typeColor  = isDaily ? COLORS.primary : '#7C3AED';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={visibleEntries}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {isDaily ? 'Daily Remittance' : 'Buyout Contract'}
              </Text>
              {isOwner && isActive && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Update Status', 'What would you like to do?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Mark Completed', onPress: () => handleStatusChange('completed') },
                      { text: 'Terminate', style: 'destructive', onPress: () => handleStatusChange('terminated') },
                    ])
                  }
                  style={styles.moreBtn}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text} />
                </TouchableOpacity>
              )}
              {!(isOwner && isActive) && <View style={{ width: 40 }} />}
            </View>

            {/* Signature status banners */}
            {isPending && isOwner && (
              <View style={styles.signBanner}>
                <Ionicons name="time-outline" size={16} color="#D97706" />
                <Text style={styles.signBannerText}>Waiting for driver to sign this agreement</Text>
              </View>
            )}
            {isPending && isDriver && (
              <View style={[styles.signBanner, styles.signBannerDriver]}>
                <Ionicons name="pen-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.signBannerText, { color: COLORS.primary }]}>
                  This agreement is waiting for your signature
                </Text>
              </View>
            )}

            {/* Party card */}
            <View style={styles.partyCard}>
              {otherParty?.profile_image ? (
                <Image source={{ uri: otherParty.profile_image }} style={styles.partyAvatar} />
              ) : (
                <View style={[styles.partyAvatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={22} color={COLORS.gray[400]} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.partyRole}>{isOwner ? 'Driver' : 'Owner'}</Text>
                <Text style={styles.partyName}>{otherName}</Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: isDaily ? '#EEF2FF' : '#EDE9FE' }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                  {isDaily ? 'Daily' : 'Buyout'}
                </Text>
              </View>
            </View>

            {/* Signature status row */}
            <View style={styles.sigsCard}>
              <Text style={styles.sigsCardTitle}>Signatures</Text>
              <View style={styles.sigsCardRow}>
                <View style={styles.sigCardItem}>
                  <Ionicons
                    name={activeAgreement.owner_signed_at ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20} color={activeAgreement.owner_signed_at ? '#059669' : COLORS.gray[300]}
                  />
                  <Text style={styles.sigCardLabel}>Owner</Text>
                  {activeAgreement.owner_signed_at && (
                    <Text style={styles.sigCardDate}>{fmt(activeAgreement.owner_signed_at)}</Text>
                  )}
                </View>
                <View style={styles.sigCardDivider} />
                <View style={styles.sigCardItem}>
                  <Ionicons
                    name={activeAgreement.driver_signed_at ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20} color={activeAgreement.driver_signed_at ? '#059669' : COLORS.gray[300]}
                  />
                  <Text style={styles.sigCardLabel}>Driver</Text>
                  {activeAgreement.driver_signed_at ? (
                    <Text style={styles.sigCardDate}>{fmt(activeAgreement.driver_signed_at)}</Text>
                  ) : (
                    <Text style={[styles.sigCardDate, { color: '#D97706' }]}>Pending</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Driver sign button */}
            {isPending && isDriver && (
              <TouchableOpacity style={styles.signBtn} onPress={handleSign} disabled={signing} activeOpacity={0.85}>
                {signing
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <>
                      <Ionicons name="pen" size={18} color={COLORS.white} />
                      <Text style={styles.signBtnText}>Sign Agreement</Text>
                    </>
                }
              </TouchableOpacity>
            )}

            {/* Vehicle + dates */}
            {activeAgreement.vehicle_description ? (
              <View style={styles.infoRow}>
                <Ionicons name="car-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.infoText}>{activeAgreement.vehicle_description}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>
                Started {fmt(activeAgreement.start_date)}
                {activeAgreement.end_date ? ` · ends ${fmt(activeAgreement.end_date)}` : ''}
              </Text>
            </View>

            {/* Summary card — only shown when active */}
            {isActive && (
              <View style={styles.summaryCard}>
                {isDaily ? (
                  <>
                    <View style={styles.summaryRow}>
                      <SumItem label="Total Brought" value={fmtMoney(totals.totalBrought)} color={COLORS.text} />
                      <SumItem label="Driver's Cut"  value={fmtMoney(totals.driverCut)}    color='#059669' />
                      <SumItem label="Days Worked"   value={`${totals.daysWorked}`}         color={COLORS.primary} />
                    </View>
                    <Text style={styles.summaryNote}>
                      N${parseFloat(activeAgreement.daily_amount).toFixed(0)}/day · {activeAgreement.owner_percentage}% driver cut
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabelBig}>{buyout.progressPct.toFixed(1)}% paid off</Text>
                      {buyout.estCompletion && <Text style={styles.estLabel}>Est. done: {buyout.estCompletion}</Text>}
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${buyout.progressPct}%` }]} />
                    </View>
                    <View style={styles.summaryRow}>
                      <SumItem label="Paid"      value={fmtMoney(buyout.totalPaid)}              color='#059669' />
                      <SumItem label="Remaining" value={fmtMoney(buyout.remaining)}              color={COLORS.error} />
                      <SumItem label="Target"    value={fmtMoney(activeAgreement.buyout_target)} color={COLORS.text} />
                    </View>
                    {activeAgreement.contract_document_url && (
                      <TouchableOpacity style={styles.contractLink} onPress={() => Linking.openURL(activeAgreement.contract_document_url)}>
                        <Ionicons name="document-attach-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.contractLinkText}>View Signed Contract</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Filter row — only when active */}
            {isActive && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {FILTERS.map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                      onPress={() => {
                        setFilter(f.key);
                        setShowFromPicker(false);
                        setShowToPicker(false);
                      }}
                    >
                      <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {filter === 'custom' && (
                  <View style={styles.customRangeRow}>
                    <TouchableOpacity
                      style={styles.customDateBtn}
                      onPress={() => { setShowFromPicker((v) => !v); setShowToPicker(false); }}
                    >
                      <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.customDateBtnText}>
                        From: {customFrom.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </TouchableOpacity>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.gray[400]} />
                    <TouchableOpacity
                      style={styles.customDateBtn}
                      onPress={() => { setShowToPicker((v) => !v); setShowFromPicker(false); }}
                    >
                      <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.customDateBtnText}>
                        To: {customTo.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {filter === 'custom' && showFromPicker && (
                  <DateTimePicker
                    value={customFrom}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    maximumDate={customTo}
                    onChange={(_, d) => { setShowFromPicker(false); if (d) setCustomFrom(d); }}
                  />
                )}

                {filter === 'custom' && showToPicker && (
                  <DateTimePicker
                    value={customTo}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    minimumDate={customFrom}
                    maximumDate={new Date()}
                    onChange={(_, d) => { setShowToPicker(false); if (d) setCustomTo(d); }}
                  />
                )}
              </>
            )}

            {isActive && (
              <Text style={styles.entriesTitle}>Entries ({visibleEntries.length})</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <EntryRow item={item} isOwner={isOwner} onConfirm={handleConfirmEntry} />
        )}
        ListEmptyComponent={
          isActive ? (
            <View style={styles.emptyEntries}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.gray[300]} />
              <Text style={styles.emptyEntriesText}>No entries yet</Text>
            </View>
          ) : null
        }
      />

      {/* Log Entry FAB — driver only, active agreements */}
      {isDriver && isActive && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowLog(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={24} color={COLORS.white} />
          <Text style={styles.fabText}>Log Today</Text>
        </TouchableOpacity>
      )}

      <LogEntryModal visible={showLog} onClose={() => setShowLog(false)} onSave={handleLogEntry} />
    </SafeAreaView>
  );
};

const SumItem = ({ label, value, color }) => (
  <View style={styles.sumItem}>
    <Text style={[styles.sumValue, { color }]}>{value}</Text>
    <Text style={styles.sumLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  moreBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  signBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#FEF3C7', marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  signBannerDriver: { backgroundColor: '#EEF2FF' },
  signBannerText: { flex: 1, fontSize: FONTS.sizes.sm, color: '#D97706', fontWeight: '600' },

  signBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl, paddingVertical: 15, marginBottom: SPACING.md, ...SHADOWS.md,
  },
  signBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },

  partyCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.white, marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.md,
    marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  partyAvatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center' },
  partyRole: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  partyName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  typeBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  typeBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },

  sigsCard: {
    backgroundColor: COLORS.white, marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.md,
    marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  sigsCardTitle: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  sigsCardRow: { flexDirection: 'row', alignItems: 'center' },
  sigCardItem: { flex: 1, alignItems: 'center', gap: 4 },
  sigCardDivider: { width: 1, height: 40, backgroundColor: COLORS.gray[200] },
  sigCardLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  sigCardDate: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginHorizontal: SPACING.lg, marginBottom: 4 },
  infoText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  summaryCard: {
    backgroundColor: COLORS.white, marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.md,
    marginTop: SPACING.sm, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: SPACING.sm },
  summaryNote: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
  sumItem: { alignItems: 'center' },
  sumValue: { fontSize: FONTS.sizes.lg, fontWeight: '700' },
  sumLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  progressLabelBig: { fontSize: FONTS.sizes.md, fontWeight: '700', color: '#7C3AED' },
  estLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  progressBg: { height: 8, backgroundColor: COLORS.gray[100], borderRadius: 4, marginBottom: SPACING.sm },
  progressFill: { height: 8, backgroundColor: '#7C3AED', borderRadius: 4 },
  contractLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm },
  contractLinkText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '600' },

  filterRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  filterBtn: { paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.gray[200] },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterBtnText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },
  filterBtnTextActive: { color: COLORS.white },

  customRangeRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
  },
  customDateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.sm, paddingVertical: 9,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  customDateBtnText: { fontSize: FONTS.sizes.xs, color: COLORS.text, fontWeight: '600', flex: 1 },

  entriesTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },

  entryRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    backgroundColor: COLORS.white, marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  entryLeft: { flex: 1, marginRight: SPACING.sm },
  entryRight: { alignItems: 'flex-end', gap: 8 },
  entryDate: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  entryAmount: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  entryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  holidayChip: { backgroundColor: '#FEF3C7', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  holidayChipText: { fontSize: 10, color: '#D97706', fontWeight: '700' },
  lockedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D1FAE5', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  lockedChipText: { fontSize: 10, color: '#059669', fontWeight: '700' },
  pendingChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  pendingChipText: { fontSize: 10, color: '#D97706', fontWeight: '700' },
  entryNotes: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  sigsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: 6 },
  sigItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sigLabel: { fontSize: 10, color: COLORS.textSecondary },

  confirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 7,
  },
  confirmBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.xs },

  emptyEntries: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyEntriesText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.sm },

  fab: {
    position: 'absolute', bottom: SPACING.xl, right: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#7C3AED', borderRadius: BORDER_RADIUS.full,
    paddingVertical: 14, paddingHorizontal: SPACING.lg, ...SHADOWS.lg,
  },
  fabText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 40, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: COLORS.gray[200], borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  optional: { color: COLORS.textSecondary, fontWeight: '400' },
  input: {
    backgroundColor: COLORS.gray[50], borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: FONTS.sizes.sm, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.gray[200], marginBottom: SPACING.sm,
  },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.gray[50], borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.gray[200], marginBottom: SPACING.sm,
  },
  dateBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', backgroundColor: COLORS.gray[100] },
  cancelBtnText: { color: COLORS.text, fontWeight: '600', fontSize: FONTS.sizes.sm },
  saveBtn: { flex: 2, paddingVertical: 13, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', backgroundColor: '#7C3AED' },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },
});

export default AgreementDetailScreen;
