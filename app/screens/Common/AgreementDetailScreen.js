import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Switch, Platform, Linking, Alert, ScrollView,
  KeyboardAvoidingView, Animated, PanResponder, TouchableWithoutFeedback,
  Keyboard, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import useAgreementStore, { getTotals, getBuyoutProgress, filterEntries } from '../../store/useAgreementStore';
import { SkeletonEntryRow } from '../../components/SkeletonLoader';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { getWorkingDays, getDayOffInfo } from '../../constants/namibiaHolidays';

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
const LogEntryModal = memo(({ visible, onClose, onSave, entries = [], dailyAmount = 0 }) => {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [shortfallAllocations, setShortfallAllocations] = useState({});
  const { height: screenHeight } = useWindowDimensions();
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Drag-to-dismiss animation
  const translateY    = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          translateY.setValue(g.dy);
          backdropOpacity.setValue(Math.max(0, 1 - g.dy / 400));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.6) {
          Animated.parallel([
            Animated.timing(translateY,      { toValue: 600, duration: 220, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0,   duration: 220, useNativeDriver: true }),
          ]).start(() => { onClose(); reset(); });
        } else {
          Animated.parallel([
            Animated.spring(translateY,      { toValue: 0, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY,      { toValue: 600, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => { onClose(); reset(); });
  }, [onClose]);

  const reset = () => {
    setDate(new Date()); setAmount(''); setIsHoliday(false); setNotes('');
    setShowDatePicker(false); setShortfallAllocations({});
  };

  useEffect(() => {
    if (visible) {
      translateY.setValue(600);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY,      { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Find an existing unlocked entry for the currently selected date
  const selectedDateStr = date.toISOString().split('T')[0];
  const existingEntry = entries.find((e) => e.entry_date === selectedDateStr && !e.is_locked);
  const isUpdating = !!existingEntry;
  const isDateLocked = entries.some((e) => e.entry_date === selectedDateStr && e.is_locked);

  // Pre-fill when selected date changes
  useEffect(() => {
    if (existingEntry) {
      setAmount(parseFloat(existingEntry.amount) > 0 ? String(parseFloat(existingEntry.amount)) : '');
      setIsHoliday(existingEntry.is_public_holiday || false);
      const autoNote = existingEntry.notes?.endsWith('– day off');
      setNotes(autoNote ? '' : (existingEntry.notes || ''));
    } else {
      setAmount(''); setIsHoliday(false); setNotes('');
    }
  }, [selectedDateStr]);

  // Per-day outstanding shortfalls (excluding today's date; rejected day offs count as full daily owed)
  const shortfallEntries = useMemo(() => {
    if (dailyAmount <= 0) return [];
    return entries
      .filter((e) => {
        if (e.dayoff_status === 'rejected') {
          const outstanding = Math.max(0, dailyAmount - parseFloat(e.shortfall_paid || 0));
          return outstanding > 0 && e.entry_date !== selectedDateStr;
        }
        const amt = parseFloat(e.amount);
        const outstanding = Math.max(0, dailyAmount - amt - parseFloat(e.shortfall_paid || 0));
        return amt > 0 && outstanding > 0 && e.entry_date !== selectedDateStr;
      })
      .map((e) => {
        if (e.dayoff_status === 'rejected') {
          return { ...e, outstanding: Math.max(0, dailyAmount - parseFloat(e.shortfall_paid || 0)) };
        }
        return { ...e, outstanding: Math.max(0, dailyAmount - parseFloat(e.amount) - parseFloat(e.shortfall_paid || 0)) };
      })
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  }, [entries, dailyAmount, selectedDateStr]);

  const totalShortfall = shortfallEntries.reduce((s, e) => s + e.outstanding, 0);

  const totalShortfallPayment = useMemo(() =>
    shortfallEntries.reduce((s, e) => {
      const v = parseFloat(shortfallAllocations[e.id] || '0');
      return s + Math.min(isNaN(v) ? 0 : v, e.outstanding);
    }, 0),
    [shortfallEntries, shortfallAllocations],
  );

  const remainingAfterPayment = useMemo(() =>
    shortfallEntries.reduce((s, e) => {
      const v = parseFloat(shortfallAllocations[e.id] || '0');
      const applied = Math.min(isNaN(v) ? 0 : v, e.outstanding);
      return s + (e.outstanding - applied);
    }, 0),
    [shortfallEntries, shortfallAllocations],
  );

  const handleSave = async () => {
    if (isDateLocked) return;
    if (!amount || isNaN(parseFloat(amount))) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    const allocations = shortfallEntries
      .map((e) => ({
        entry_id: e.id,
        amount: Math.min(parseFloat(shortfallAllocations[e.id] || '0'), e.outstanding),
      }))
      .filter((a) => !isNaN(a.amount) && a.amount > 0);
    setSaving(true);
    try {
      await onSave(
        { entry_date: selectedDateStr, amount: parseFloat(amount), is_public_holiday: isHoliday, notes: notes.trim() || null },
        allocations,
      );
      dismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      {/* Tap-outside backdrop */}
      <TouchableWithoutFeedback onPress={dismiss}>
        <Animated.View style={[modal.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Draggable sheet */}
      <KeyboardAvoidingView
        style={modal.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <Animated.View style={[
          modal.sheet,
          { transform: [{ translateY }] },
          kbHeight > 0 && { maxHeight: screenHeight - kbHeight - 8 },
        ]}>
          {/* Drag handle — the only area that moves the sheet */}
          <View style={modal.handleWrap} {...panResponder.panHandlers}>
            <View style={modal.handle} />
          </View>

          <Text style={modal.title}>{isUpdating ? 'Update Entry' : "Log Today's Entry"}</Text>

          {isDateLocked && (
            <View style={modal.lockedBanner}>
              <Ionicons name="lock-closed" size={14} color="#059669" />
              <Text style={modal.lockedBannerText}>
                Confirmed by both parties — pick a different date to log.
              </Text>
            </View>
          )}

          {!isDateLocked && isUpdating && (
            <View style={modal.updateBanner}>
              <Ionicons name="information-circle-outline" size={15} color="#D97706" />
              <Text style={modal.updateBannerText}>
                {parseFloat(existingEntry.amount) === 0
                  ? 'Day-off entry — log your amount to record extra work.'
                  : 'Updating existing entry for this date.'}
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Shortfall section ── */}
            {shortfallEntries.length > 0 && (
              <View style={modal.shortfallSection}>
                <View style={modal.shortfallHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="alert-circle-outline" size={14} color="#92400E" />
                    <Text style={modal.shortfallTitle}>Outstanding Shortfalls</Text>
                    <View style={modal.shortfallTotalChip}>
                      <Text style={modal.shortfallTotalText}>N${totalShortfall.toFixed(0)} total</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={modal.coverAllBtn}
                    onPress={() => {
                      const allocs = {};
                      shortfallEntries.forEach((e) => { allocs[e.id] = String(e.outstanding.toFixed(0)); });
                      setShortfallAllocations(allocs);
                      setAmount(String((dailyAmount + totalShortfall).toFixed(0)));
                    }}
                  >
                    <Text style={modal.coverAllBtnText}>Cover all</Text>
                  </TouchableOpacity>
                </View>

                {shortfallEntries.map((e) => (
                  <View key={e.id} style={modal.shortfallRow}>
                    <View style={modal.shortfallRowLeft}>
                      <Text style={modal.shortfallRowDate}>{fmt(e.entry_date)}</Text>
                      <Text style={modal.shortfallRowOwed}>N${e.outstanding.toFixed(0)} outstanding</Text>
                    </View>
                    <TextInput
                      style={modal.shortfallInput}
                      placeholder="N$0"
                      placeholderTextColor={COLORS.gray[400]}
                      value={shortfallAllocations[e.id] || ''}
                      onChangeText={(v) => setShortfallAllocations((prev) => ({ ...prev, [e.id]: v }))}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                  </View>
                ))}

                {totalShortfallPayment > 0 && (
                  <View style={modal.shortfallSummary}>
                    <Text style={modal.shortfallSummaryLine}>
                      Today N${parseFloat(amount || '0').toFixed(0)}  +  Shortfall N${totalShortfallPayment.toFixed(0)}  =  N${(parseFloat(amount || '0') + totalShortfallPayment).toFixed(0)} total
                    </Text>
                    <Text style={modal.shortfallSummaryRemaining}>
                      Remaining shortfall after: N${remainingAfterPayment.toFixed(0)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text style={modal.label}>Date</Text>
            <TouchableOpacity style={modal.dateBtn} onPress={() => setShowDatePicker((v) => !v)}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={modal.dateBtnText}>{fmt(selectedDateStr)}</Text>
              <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.gray[400]} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
              />
            )}

            <Text style={[modal.label, { marginTop: SPACING.md }]}>
              Amount I Brought (N$) <Text style={{ color: COLORS.error }}>*</Text>
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

            <TouchableOpacity style={[modal.saveBtn, isDateLocked && { opacity: 0.4 }]} onPress={handleSave} disabled={saving || isDateLocked}>
              {saving
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={modal.saveBtnText}>{isUpdating ? 'Update & Sign' : 'Save & Sign'}</Text>}
            </TouchableOpacity>

            <View style={{ height: 8 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ─── Day Off Modal (driver only) ─────────────────────────────────────────────
const DayOffModal = memo(({ visible, onClose, onSave, entries = [] }) => {
  const [date, setDate]                   = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason]               = useState('');
  const [saving, setSaving]               = useState(false);

  const translateY      = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const reset = () => { setDate(new Date()); setReason(''); setShowDatePicker(false); };

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY,      { toValue: 600, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => { onClose(); reset(); });
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(600);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY,      { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const selectedDateStr  = date.toISOString().split('T')[0];
  const existingEntry    = entries.find((e) => e.entry_date === selectedDateStr);
  const isRejectedDayOff = existingEntry?.dayoff_status === 'rejected';
  const alreadyOff       = existingEntry && parseFloat(existingEntry.amount) === 0 && !isRejectedDayOff;
  const hasWorkedEntry   = existingEntry && parseFloat(existingEntry.amount) > 0;
  const isLocked         = !!existingEntry?.is_locked;

  const handleSave = async () => {
    if (isLocked) {
      Toast.show({ type: 'error', text1: 'This entry is locked and cannot be changed.' });
      return;
    }
    setSaving(true);
    try {
      const note = reason.trim() ? `${reason.trim()} – day off` : 'Day off';
      await onSave({ entry_date: selectedDateStr, amount: 0, is_public_holiday: false, notes: note, dayoff_status: 'pending' });
      dismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={dismiss}>
        <Animated.View style={[modal.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView style={modal.sheetWrapper} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
        <Animated.View style={[modal.sheet, { transform: [{ translateY }] }]}>
          <View style={modal.handleWrap}>
            <View style={modal.handle} />
          </View>

          <Text style={modal.title}>Mark Day Off</Text>

          {alreadyOff && (
            <View style={modal.updateBanner}>
              <Ionicons name="information-circle-outline" size={15} color="#D97706" />
              <Text style={modal.updateBannerText}>This day is already marked as day off. You can update the reason.</Text>
            </View>
          )}
          {hasWorkedEntry && (
            <View style={[modal.updateBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <Ionicons name="warning-outline" size={15} color="#DC2626" />
              <Text style={[modal.updateBannerText, { color: '#B91C1C' }]}>
                You already logged N${parseFloat(existingEntry.amount).toFixed(0)} for this date. Marking it off will clear the amount.
              </Text>
            </View>
          )}
          {isRejectedDayOff && (
            <View style={[modal.updateBanner, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
              <Text style={[modal.updateBannerText, { color: '#B91C1C' }]}>
                Your previous day off request was rejected. You can re-request it here, or log actual work using "Log Today".
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={modal.label}>Date</Text>
            <TouchableOpacity style={modal.dateBtn} onPress={() => setShowDatePicker((v) => !v)}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={modal.dateBtnText}>{fmt(selectedDateStr)}</Text>
              <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.gray[400]} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
              />
            )}

            <Text style={[modal.label, { marginTop: SPACING.md }]}>
              Reason <Text style={modal.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[modal.input, { height: 70, paddingTop: 10, textAlignVertical: 'top' }]}
              placeholder="e.g. Sick, Personal, Family..."
              placeholderTextColor={COLORS.gray[400]}
              value={reason}
              onChangeText={setReason}
              multiline
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[modal.saveBtn, { backgroundColor: '#DC2626' }]}
              onPress={handleSave}
              disabled={saving || isLocked}
            >
              {saving
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={modal.saveBtnText}>{alreadyOff ? 'Update Day Off' : 'Mark Day Off'}</Text>}
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ─── Entry Row ───────────────────────────────────────────────────────────────
const EntryRow = memo(({ item, isOwner, onConfirm, onReject, onApproveDayOff, onRejectDayOff, dailyAmount = 0 }) => {
  const [confirming, setConfirming]           = useState(false);
  const [rejecting, setRejecting]             = useState(false);
  const [approvingDayOff, setApprovingDayOff] = useState(false);
  const [rejectingDayOff, setRejectingDayOff] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try { await onConfirm(item.id); }
    finally { setConfirming(false); }
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Entry',
      'Reject this entry? The driver will be notified to re-log.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setRejecting(true);
            try { await onReject(item.id); }
            finally { setRejecting(false); }
          },
        },
      ],
    );
  };

  const handleApproveDayOff = async () => {
    setApprovingDayOff(true);
    try { await onApproveDayOff(item.id); }
    finally { setApprovingDayOff(false); }
  };

  const handleRejectDayOff = () => {
    Alert.alert(
      'Reject Day Off',
      "Reject this day off? The driver will still owe the daily remittance for this day.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setRejectingDayOff(true);
            try { await onRejectDayOff(item.id); }
            finally { setRejectingDayOff(false); }
          },
        },
      ],
    );
  };

  const amt          = parseFloat(item.amount);
  const bothSigned   = item.is_locked;
  const ownerPending = !item.owner_confirmed_at;
  const isRejected   = !!item.owner_rejected_at;

  // Day-off entries: auto-logged (Sunday/holiday), manually marked, or pending/rejected requests
  const isDayOff = amt === 0 && (
    item.is_public_holiday ||
    item.notes?.endsWith('– day off') ||
    item.notes?.toLowerCase() === 'day off' ||
    item.dayoff_status != null
  );
  const dayOffLabel = item.is_public_holiday
    ? (item.notes?.replace(' – day off', '') || 'Public Holiday')
    : item.notes?.includes('– day off')
      ? item.notes.replace(' – day off', '')
      : 'Day Off';

  // Remaining shortfall after any subsequent payments toward this entry
  const shortfall = (!isDayOff && dailyAmount > 0 && amt > 0)
    ? Math.max(0, dailyAmount - amt - parseFloat(item.shortfall_paid || 0))
    : 0;

  if (isDayOff) {
    const dayoffStatus     = item.dayoff_status;
    const isPendingDayOff  = dayoffStatus === 'pending';
    const isRejectedDayOff = dayoffStatus === 'rejected';
    const isApprovedDayOff = dayoffStatus === 'approved';
    const badgeBg    = isPendingDayOff ? '#FEF3C7' : isRejectedDayOff ? '#FEE2E2' : isApprovedDayOff ? '#D1FAE5' : '#FEE2E2';
    const badgeColor = isPendingDayOff ? '#D97706' : isRejectedDayOff ? '#DC2626' : isApprovedDayOff ? '#059669' : '#DC2626';
    const badgeText  = isPendingDayOff ? 'Pending' : isRejectedDayOff ? 'Rejected' : isApprovedDayOff ? 'Approved' : 'Day Off';
    const rejectedOwed = isRejectedDayOff && dailyAmount > 0
      ? Math.max(0, dailyAmount - parseFloat(item.shortfall_paid || 0))
      : 0;

    return (
      <View style={styles.dayOffRow}>
        <View style={styles.dayOffIconWrap}>
          <Ionicons name={isRejectedDayOff ? 'close-circle-outline' : 'moon-outline'} size={16} color="#DC2626" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dayOffDate}>{fmt(item.entry_date)}</Text>
          <Text style={styles.dayOffLabel}>{dayOffLabel}</Text>
          {isRejectedDayOff && rejectedOwed > 0 && (
            <Text style={styles.dayOffRejectedOwed}>N${rejectedOwed.toFixed(0)} still owed</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[styles.dayOffBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.dayOffBadgeText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
          {isOwner && isPendingDayOff && (
            <View style={styles.entryActionCol}>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleApproveDayOff} disabled={approvingDayOff || rejectingDayOff}>
                {approvingDayOff
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={styles.confirmBtnText}>Approve</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectEntryBtn} onPress={handleRejectDayOff} disabled={approvingDayOff || rejectingDayOff}>
                {rejectingDayOff
                  ? <ActivityIndicator size="small" color={COLORS.error} />
                  : <Text style={styles.rejectEntryBtnText}>Reject</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

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
          {shortfall > 0 && (
            <View style={styles.shortfallChip}>
              <Ionicons name="alert-circle-outline" size={10} color="#92400E" />
              <Text style={styles.shortfallChipText}>N${shortfall.toFixed(0)} short</Text>
            </View>
          )}
          {bothSigned ? (
            <View style={styles.lockedChip}>
              <Ionicons name="lock-closed" size={10} color="#059669" />
              <Text style={styles.lockedChipText}>Both confirmed</Text>
            </View>
          ) : isRejected ? (
            <View style={styles.rejectedChip}>
              <Ionicons name="close-circle" size={10} color="#DC2626" />
              <Text style={styles.rejectedChipText}>Rejected — re-log required</Text>
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
        {isOwner && ownerPending && !bothSigned && !isRejected && (
          <View style={styles.entryActionCol}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={confirming || rejecting}>
              {confirming
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={styles.confirmBtnText}>Confirm</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectEntryBtn} onPress={handleReject} disabled={confirming || rejecting}>
              {rejecting
                ? <ActivityIndicator size="small" color={COLORS.error} />
                : <Text style={styles.rejectEntryBtnText}>Reject</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.is_locked === next.item.is_locked &&
  prev.item.owner_confirmed_at === next.item.owner_confirmed_at &&
  prev.item.owner_rejected_at === next.item.owner_rejected_at &&
  prev.item.amount === next.item.amount &&
  prev.item.dayoff_status === next.item.dayoff_status &&
  prev.isOwner === next.isOwner &&
  prev.dailyAmount === next.dailyAmount
);

// ─── Monthly Projection Card ─────────────────────────────────────────────────

const MonthlyProjectionCard = ({ agreement, isOwner }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfMonth.setHours(0, 0, 0, 0);

  const agreementStart = new Date(agreement.start_date);
  agreementStart.setHours(0, 0, 0, 0);
  const effectiveStart = agreementStart > today ? agreementStart : today;

  const schedOpts = {
    offSundays: agreement.off_sundays !== false,
    offPublicHolidays: agreement.off_public_holidays !== false,
  };
  const workingDays = getWorkingDays(effectiveStart, endOfMonth, schedOpts);
  const monthName = today.toLocaleDateString('en-NA', { month: 'long', year: 'numeric' });

  const dailyAmt = parseFloat(agreement.daily_amount || 0);
  const ownerPct = parseFloat(agreement.owner_percentage || 0);

  const expectedGross = workingDays * dailyAmt;
  const driverCutAmt  = expectedGross * (ownerPct / 100);
  const ownerSalary   = expectedGross - driverCutAmt;

  if (!dailyAmt) return null;

  return (
    <View style={proj.card}>
      <View style={proj.header}>
        <Ionicons name="calendar" size={15} color="#7C3AED" />
        <Text style={proj.title}>Month-End Projection</Text>
        <Text style={proj.pill}>{workingDays} working days left</Text>
      </View>
      <Text style={proj.sub}>{monthName}</Text>

      <View style={proj.row}>
        <View style={proj.item}>
          <Text style={proj.itemLabel}>Expected Total</Text>
          <Text style={[proj.itemValue, { color: COLORS.text }]}>{fmtMoney(expectedGross)}</Text>
        </View>
        <View style={proj.divider} />
        <View style={proj.item}>
          <Text style={proj.itemLabel}>{isOwner ? "Driver's Cut" : 'Your Cut'} ({ownerPct}%)</Text>
          <Text style={[proj.itemValue, { color: '#D97706' }]}>{fmtMoney(driverCutAmt)}</Text>
        </View>
        {isOwner && (
          <>
            <View style={proj.divider} />
            <View style={proj.item}>
              <Text style={proj.itemLabel}>Your Salary</Text>
              <Text style={[proj.itemValue, { color: '#059669' }]}>{fmtMoney(ownerSalary)}</Text>
            </View>
          </>
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
  const rejectEntry     = useAgreementStore((s) => s.rejectEntry);
  const approveDayOff   = useAgreementStore((s) => s.approveDayOff);
  const rejectDayOff    = useAgreementStore((s) => s.rejectDayOff);
  const updateAgreementStatus = useAgreementStore((s) => s.updateAgreementStatus);

  const [filter, setFilter]     = useState('all');
  const [customFrom, setCustomFrom] = useState(new Date());
  const [customTo, setCustomTo]     = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker]     = useState(false);
  const [showLog, setShowLog]   = useState(false);
  const [signing, setSigning]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [dayOffInfo, setDayOffInfo] = useState(null);
  const [showDayOff, setShowDayOff] = useState(false);
  const [declining, setDeclining]   = useState(false);

  useEffect(() => { fetchAgreement(agreementId); }, [agreementId]);

  // Auto-log day-off entries (Sunday / public holiday) for the driver
  useFocusEffect(
    useCallback(() => {
      if (!activeAgreement || !profile) return;
      const isDriverRole = activeAgreement.driver_id === profile.id;
      const isActiveAgreement = activeAgreement.status === 'active';
      const isDailyType = activeAgreement.agreement_type === 'daily_remittance';
      if (!isDriverRole || !isActiveAgreement || !isDailyType) return;

      const schedOpts = {
        offSundays: activeAgreement.off_sundays !== false,
        offPublicHolidays: activeAgreement.off_public_holidays !== false,
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      const info = getDayOffInfo(today, schedOpts);
      setDayOffInfo(info);

      if (info.isOff) {
        const alreadyLogged = entries.some((e) => e.entry_date === todayStr);
        if (!alreadyLogged) {
          logEntry(activeAgreement.id, activeAgreement.owner_id, activeAgreement.driver_id, {
            entry_date: todayStr,
            amount: 0,
            is_public_holiday: info.reason === 'holiday',
            notes: info.reason === 'holiday' ? `${info.name} – day off` : 'Sunday – day off',
          }).catch(() => {}); // silent — owner is not notified for N$0 entries
        }
      } else {
        setDayOffInfo(null);
      }
    }, [activeAgreement?.id, activeAgreement?.status, entries.length, profile?.id]),
  );

  const onRefresh = async () => { setRefreshing(true); await fetchAgreement(agreementId); setRefreshing(false); };

  const handleLogEntry = async (data, allocations = []) => {
    try {
      const result = await logEntry(agreementId, activeAgreement.owner_id, activeAgreement.driver_id, data, allocations);
      if (result?.allocationErrors?.length > 0) {
        Toast.show({ type: 'success', text1: 'Entry logged!', text2: 'Owner will be notified to confirm receipt.' });
        Toast.show({
          type: 'error',
          text1: 'Shortfall payment failed',
          text2: `Could not record payment toward ${result.allocationErrors.length === 1 ? '1 day' : `${result.allocationErrors.length} days`}. Please try again.`,
        });
      } else {
        Toast.show({ type: 'success', text1: 'Entry logged!', text2: 'Owner will be notified to confirm receipt.' });
      }
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

  const handleConfirmEntry = useCallback(async (entryId) => {
    try {
      await confirmEntry(entryId);
      Toast.show({ type: 'success', text1: 'Receipt confirmed!', text2: 'This entry is now locked by both parties.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not confirm. Please try again.' });
    }
  }, [confirmEntry]);

  const handleRejectEntry = useCallback(async (entryId) => {
    try {
      await rejectEntry(entryId);
      Toast.show({ type: 'info', text1: 'Entry rejected', text2: 'Driver will need to re-log this entry.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not reject. Please try again.' });
    }
  }, [rejectEntry]);

  const handleApproveDayOff = useCallback(async (entryId) => {
    try {
      await approveDayOff(entryId);
      Toast.show({ type: 'success', text1: 'Day off approved', text2: 'Driver has been notified.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not approve. Please try again.' });
    }
  }, [approveDayOff]);

  const handleRejectDayOff = useCallback(async (entryId) => {
    try {
      await rejectDayOff(entryId);
      Toast.show({ type: 'info', text1: 'Day off rejected', text2: 'Driver still owes the daily remittance for this day.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not reject. Please try again.' });
    }
  }, [rejectDayOff]);

  const handleDeclineAgreement = () => {
    Alert.alert(
      'Decline Agreement',
      'Are you sure you want to decline this agreement? The owner will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setDeclining(true);
            try {
              await updateAgreementStatus(agreementId, 'terminated');
              Toast.show({ type: 'info', text1: 'Agreement declined' });
              navigation.goBack();
            } catch {
              Toast.show({ type: 'error', text1: 'Could not decline. Please try again.' });
            } finally {
              setDeclining(false);
            }
          },
        },
      ],
    );
  };

  const handleDayOffSave = async (data) => {
    try {
      await logEntry(agreementId, activeAgreement.owner_id, activeAgreement.driver_id, data);
      Toast.show({ type: 'success', text1: 'Day off logged', text2: 'Entry saved for this date.' });
    } catch (err) {
      const msg = err?.message === 'LOCKED'
        ? 'This entry is locked and cannot be changed.'
        : 'Could not save day off.';
      Toast.show({ type: 'error', text1: msg });
      throw err;
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

  const handleExportPDF = async () => {
    if (!activeAgreement || entries.length === 0) {
      Toast.show({ type: 'info', text1: 'No entries to export yet' });
      return;
    }
    setExporting(true);
    try {
      // Load app icon as base64 for embedding in PDF
      let logoSrc = '';
      try {
        const asset = Asset.fromModule(require('../../../assets/icon.png'));
        await asset.downloadAsync();
        if (asset.localUri) {
          const b64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: 'base64' });
          if (b64) logoSrc = `data:image/png;base64,${b64}`;
        }
      } catch { /* logo omitted if asset load fails */ }

      const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
      const isDaily = activeAgreement.agreement_type === 'daily_remittance';
      const ownerName  = activeAgreement.owner  ? `${activeAgreement.owner.firstname ?? ''} ${activeAgreement.owner.lastname ?? ''}`.trim() : 'Owner';
      const driverName = activeAgreement.driver ? `${activeAgreement.driver.firstname ?? ''} ${activeAgreement.driver.lastname ?? ''}`.trim() : 'Driver';
      const allTotals  = getTotals(entries, activeAgreement, 'all');

      const rows = sorted.map((e, idx) => {
        const isDayOff = parseFloat(e.amount) === 0 &&
          (e.is_public_holiday || e.notes?.endsWith('– day off'));
        const dayOffLabel = e.is_public_holiday
          ? (e.notes?.replace(' – day off', '') || 'Public Holiday')
          : 'Sunday';

        if (isDayOff) {
          return `
            <tr style="background:#FFF1F0;">
              <td>${fmt(e.entry_date)}</td>
              <td colspan="2"><span class="chip chip-red">Day Off &mdash; ${dayOffLabel}</span></td>
              <td class="notes">${e.notes ?? ''}</td>
              <td>&mdash;</td>
            </tr>`;
        }

        const status = e.is_locked
          ? '<span class="chip chip-green">&#10003; Confirmed</span>'
          : '<span class="chip chip-amber">Pending</span>';
        const holiday = e.is_public_holiday
          ? '<span class="chip chip-amber">Public Holiday</span>'
          : '';
        const rowBg = idx % 2 === 0 ? '' : 'style="background:#f9fafb;"';
        return `
          <tr ${rowBg}>
            <td>${fmt(e.entry_date)}</td>
            <td class="amount">N$${parseFloat(e.amount).toFixed(2)}</td>
            <td>${holiday}</td>
            <td class="notes">${e.notes ?? ''}</td>
            <td>${status}</td>
          </tr>`;
      }).join('');

      const summaryBlock = isDaily
        ? `<div class="summary-grid">
            <div class="sum-item">
              <span class="sum-val">N$${allTotals.totalBrought.toFixed(2)}</span>
              <span class="sum-lbl">Total Brought</span>
            </div>
            <div class="sum-item">
              <span class="sum-val green">N$${allTotals.driverCut.toFixed(2)}</span>
              <span class="sum-lbl">Driver's Cut (${activeAgreement.owner_percentage}%)</span>
            </div>
            <div class="sum-item">
              <span class="sum-val blue">${allTotals.daysWorked}</span>
              <span class="sum-lbl">Days Worked</span>
            </div>
           </div>`
        : (() => {
            const b = getBuyoutProgress(activeAgreement, entries);
            const pct = Math.min(100, b.progressPct);
            return `<div class="summary-grid">
              <div class="sum-item"><span class="sum-val green">N$${b.totalPaid.toFixed(2)}</span><span class="sum-lbl">Total Paid</span></div>
              <div class="sum-item"><span class="sum-val red">N$${b.remaining.toFixed(2)}</span><span class="sum-lbl">Remaining</span></div>
              <div class="sum-item"><span class="sum-val blue">${b.progressPct.toFixed(1)}%</span><span class="sum-lbl">Progress</span></div>
             </div>
             <div class="progress-wrap">
               <div class="progress-fill" style="width:${pct}%"></div>
             </div>`;
          })();

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica Neue, Arial, sans-serif; font-size: 13px; color: #111827; padding: 36px; background: #fff; }

  /* ── Header banner ── */
  .banner {
    background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 55%, #3B82F6 100%);
    border-radius: 14px;
    padding: 22px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .banner-left { display: flex; align-items: center; gap: 16px; }
  .logo { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; background: rgba(255,255,255,0.15); }
  .app-name { font-size: 24px; font-weight: 900; color: #fff; letter-spacing: 0.3px; }
  .doc-subtitle { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 3px; }
  .banner-right { text-align: right; font-size: 12px; color: rgba(255,255,255,0.8); line-height: 1.6; }
  .entries-count { font-size: 20px; font-weight: 800; color: #fff; display: block; }

  /* ── Type badge ── */
  .type-badge { display: inline-block; padding: 3px 11px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.22); color: #fff; margin-left: 10px; vertical-align: middle; }

  /* ── Party cards ── */
  .party-row { display: flex; gap: 16px; margin-bottom: 20px; }
  .party-block { flex: 1; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; }
  .party-role { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 600; }
  .party-name { font-size: 16px; font-weight: 800; color: #111827; margin-top: 4px; }

  /* ── Meta info ── */
  .meta-row { font-size: 12px; color: #6b7280; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .meta-icon { color: #1E40AF; font-style: normal; }

  /* ── Section titles ── */
  .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #1E40AF; margin: 20px 0 10px; border-left: 3px solid #1E40AF; padding-left: 8px; }

  /* ── Summary ── */
  .summary-grid { display: flex; gap: 12px; margin-bottom: 8px; }
  .sum-item { flex: 1; background: #EFF6FF; border-radius: 12px; padding: 14px 16px; border: 1px solid #DBEAFE; }
  .sum-val { display: block; font-size: 19px; font-weight: 900; color: #111827; }
  .sum-val.green { color: #059669; }
  .sum-val.blue  { color: #1E40AF; }
  .sum-val.red   { color: #DC2626; }
  .sum-lbl { display: block; font-size: 11px; color: #6b7280; margin-top: 4px; }

  /* ── Progress bar ── */
  .progress-wrap { height: 10px; background: #DBEAFE; border-radius: 5px; margin-bottom: 20px; overflow: hidden; }
  .progress-fill { height: 10px; background: linear-gradient(90deg, #1E40AF, #3B82F6); border-radius: 5px; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead tr { background: linear-gradient(135deg, #1E40AF, #3B82F6); }
  th { text-align: left; padding: 10px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; }
  th.amount { text-align: right; }
  td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 12px; }
  td.amount { text-align: right; font-weight: 700; color: #111827; }
  td.notes { color: #6b7280; font-size: 11px; }

  /* ── Chips ── */
  .chip { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .chip-green { background: #D1FAE5; color: #059669; }
  .chip-amber { background: #FEF3C7; color: #D97706; }
  .chip-red   { background: #FEE2E2; color: #B91C1C; }

  /* ── Footer ── */
  .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
</style>
</head><body>

  <!-- Branded banner header -->
  <div class="banner">
    <div class="banner-left">
      ${logoSrc ? `<img src="${logoSrc}" class="logo" alt="DuoLink" />` : '<div class="logo" style="background:rgba(255,255,255,0.2);"></div>'}
      <div>
        <div class="app-name">DuoLink <span class="type-badge">${isDaily ? 'Daily Remittance' : 'Buyout Contract'}</span></div>
        <div class="doc-subtitle">Agreement Statement</div>
      </div>
    </div>
    <div class="banner-right">
      <span class="entries-count">${sorted.length}</span>
      entries<br>
      ${new Date().toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}
    </div>
  </div>

  <!-- Parties -->
  <div class="party-row">
    <div class="party-block">
      <div class="party-role">Owner</div>
      <div class="party-name">${ownerName}</div>
    </div>
    <div class="party-block">
      <div class="party-role">Driver</div>
      <div class="party-name">${driverName}</div>
    </div>
  </div>

  ${activeAgreement.vehicle_description
    ? `<div class="meta-row"><em class="meta-icon">&#128663;</em> ${activeAgreement.vehicle_description}</div>`
    : ''}
  <div class="meta-row">
    <em class="meta-icon">&#128197;</em>
    Started ${fmt(activeAgreement.start_date)}${activeAgreement.end_date ? ` &nbsp;&middot;&nbsp; Ends ${fmt(activeAgreement.end_date)}` : ''}
  </div>

  <!-- Summary -->
  <div class="section-title">Summary — All Time</div>
  ${summaryBlock}

  <!-- Entries table -->
  <div class="section-title">Entries — Sorted by Date</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th class="amount">Amount</th>
        <th></th>
        <th>Notes</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>DuoLink &mdash; Connecting Owners &amp; Drivers in Namibia</span>
    <span>Exported ${new Date().toISOString().split('T')[0]}</span>
  </div>

</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
      } else {
        Toast.show({ type: 'info', text1: 'Sharing not available on this device' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Export failed', text2: err?.message });
    } finally {
      setExporting(false);
    }
  };

  // ── All hooks must be called unconditionally (Rules of Hooks) ───────────────
  const customRange = useMemo(() =>
    filter === 'custom'
      ? { from: customFrom.toISOString().split('T')[0], to: customTo.toISOString().split('T')[0] }
      : null,
    [filter, customFrom, customTo],
  );
  const totals = useMemo(() =>
    activeAgreement
      ? getTotals(entries, activeAgreement, filter, customRange)
      : { totalBrought: 0, driverCut: 0, daysWorked: 0 },
    [entries, activeAgreement, filter, customRange],
  );
  const buyout = useMemo(() => {
    const isDailyRemittance = activeAgreement?.agreement_type === 'daily_remittance';
    return activeAgreement && !isDailyRemittance ? getBuyoutProgress(activeAgreement, entries) : null;
  }, [activeAgreement, entries]);
  const visibleEntries = useMemo(() =>
    filterEntries(entries, filter, customRange)
      .slice()
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    [entries, filter, customRange],
  );
  const dailyAmountParsed = useMemo(() =>
    parseFloat(activeAgreement?.daily_amount || 0),
    [activeAgreement?.daily_amount],
  );
  // keyExtractor and renderItem extracted here so all hooks are unconditional
  const keyExtractor = useCallback((item) => item.id, []);
  const renderItem = useCallback(({ item }) => (
    <EntryRow
      item={item}
      isOwner={activeAgreement?.owner_id === profile?.id}
      onConfirm={handleConfirmEntry}
      onReject={handleRejectEntry}
      onApproveDayOff={handleApproveDayOff}
      onRejectDayOff={handleRejectDayOff}
      dailyAmount={dailyAmountParsed}
    />
  ), [activeAgreement?.owner_id, profile?.id, handleConfirmEntry, handleRejectEntry, handleApproveDayOff, handleRejectDayOff, dailyAmountParsed]);
  // ────────────────────────────────────────────────────────────────────────────

  if (loading && !activeAgreement) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.skeletonPad}>
          {[0, 1, 2, 3, 4].map((i) => <SkeletonEntryRow key={i} />)}
        </View>
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
  const isEnded    = activeAgreement.status === 'terminated' || activeAgreement.status === 'completed';
  const typeColor  = isDaily ? COLORS.primary : '#7C3AED';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={visibleEntries}
        keyExtractor={keyExtractor}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        removeClippedSubviews
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
              <View style={styles.headerRight}>
                {entries.length > 0 && (
                  <TouchableOpacity onPress={handleExportPDF} style={styles.exportBtn} disabled={exporting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {exporting
                      ? <ActivityIndicator size="small" color={COLORS.primary} />
                      : <Ionicons name="download-outline" size={21} color={COLORS.primary} />}
                  </TouchableOpacity>
                )}
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
                {!(entries.length > 0) && !(isOwner && isActive) && <View style={{ width: 40 }} />}
              </View>
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

            {/* Re-hire banner — shown to owner when agreement is ended */}
            {isEnded && isOwner && (
              <TouchableOpacity
                style={styles.rehireBanner}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CreateAgreement', {
                  driverId: activeAgreement.driver_id,
                  driverName: otherName,
                  driverImage: otherParty?.profile_image ?? null,
                })}
              >
                <View style={styles.rehireBannerLeft}>
                  <Ionicons name="refresh-circle-outline" size={20} color={COLORS.primary} />
                  <View>
                    <Text style={styles.rehireBannerTitle}>Start a new agreement</Text>
                    <Text style={styles.rehireBannerSub}>
                      This agreement has ended — create a fresh one with {otherName}.
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}

            {/* Party card */}
            <View style={styles.partyCard}>
              {otherParty?.profile_image ? (
                <Image source={{ uri: otherParty.profile_image }} style={styles.partyAvatar} contentFit="cover" cachePolicy="disk" transition={200} />
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

            {/* Driver sign + decline buttons */}
            {isPending && isDriver && (
              <View style={{ gap: SPACING.sm, marginHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
                <TouchableOpacity style={styles.signBtn} onPress={handleSign} disabled={signing || declining} activeOpacity={0.85}>
                  {signing
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <>
                        <Ionicons name="pen" size={18} color={COLORS.white} />
                        <Text style={styles.signBtnText}>Sign Agreement</Text>
                      </>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineAgreementBtn} onPress={handleDeclineAgreement} disabled={signing || declining} activeOpacity={0.85}>
                  {declining
                    ? <ActivityIndicator size="small" color={COLORS.error} />
                    : <>
                        <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                        <Text style={styles.declineAgreementBtnText}>Decline Agreement</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
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

            {/* Month-end projection — daily remittance only */}
            {isActive && isDaily && activeAgreement.daily_amount > 0 && (
              <MonthlyProjectionCard agreement={activeAgreement} isOwner={isOwner} />
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

            {/* Day-off banner — driver only */}
            {isActive && isDriver && isDaily && dayOffInfo?.isOff && (
              <View style={styles.dayOffBanner}>
                <Ionicons
                  name={dayOffInfo.reason === 'holiday' ? 'sunny-outline' : 'cafe-outline'}
                  size={16}
                  color="#7C3AED"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayOffBannerTitle}>
                    {dayOffInfo.reason === 'holiday'
                      ? `${dayOffInfo.name} – public holiday`
                      : 'Sunday – day off'}
                  </Text>
                  <Text style={styles.dayOffBannerSub}>
                    You're off today. Tap "Log Today" if you worked extra to cover a shortfall.
                  </Text>
                </View>
              </View>
            )}

            {isActive && (
              <Text style={styles.entriesTitle}>Entries ({visibleEntries.length})</Text>
            )}
          </>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          isActive ? (
            <View style={styles.emptyEntries}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.gray[300]} />
              <Text style={styles.emptyEntriesText}>No entries yet</Text>
            </View>
          ) : null
        }
      />

      {/* FAB row — driver only, active agreements */}
      {isDriver && isActive && (
        <View style={styles.fabRow}>
          <TouchableOpacity style={[styles.fab, styles.fabSecondary]} onPress={() => setShowDayOff(true)} activeOpacity={0.85}>
            <Ionicons name="moon-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.fabText, { color: COLORS.primary }]}>Day Off</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={() => setShowLog(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={22} color={COLORS.white} />
            <Text style={styles.fabText}>Log Today</Text>
          </TouchableOpacity>
        </View>
      )}

      <LogEntryModal
        visible={showLog}
        onClose={() => setShowLog(false)}
        onSave={handleLogEntry}
        entries={entries}
        dailyAmount={parseFloat(activeAgreement?.daily_amount || 0)}
      />
      <DayOffModal
        visible={showDayOff}
        onClose={() => setShowDayOff(false)}
        onSave={handleDayOffSave}
        entries={entries}
      />
    </SafeAreaView>
  );
};

const SumItem = memo(({ label, value, color }) => (
  <View style={styles.sumItem}>
    <Text style={[styles.sumValue, { color }]}>{value}</Text>
    <Text style={styles.sumLabel}>{label}</Text>
  </View>
));

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  skeletonPad: { padding: SPACING.lg, paddingTop: SPACING.xl },
  listContent: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exportBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  moreBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  signBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#FEF3C7', marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  signBannerDriver: { backgroundColor: '#EEF2FF' },
  signBannerText: { flex: 1, fontSize: FONTS.sizes.sm, color: '#D97706', fontWeight: '600' },

  rehireBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '0D', marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.primary + '25',
  },
  rehireBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  rehireBannerTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  rehireBannerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },

  signBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl, paddingVertical: 15, ...SHADOWS.md,
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

  entryActionCol: { gap: 6 },
  confirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    width: 82, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.xs },
  rejectEntryBtn: {
    backgroundColor: 'transparent', borderRadius: BORDER_RADIUS.lg,
    width: 82, height: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.error,
  },
  rejectEntryBtnText: { color: COLORS.error, fontWeight: '700', fontSize: FONTS.sizes.xs },

  rejectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEE2E2', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  rejectedChipText: { fontSize: 10, color: '#DC2626', fontWeight: '700' },

  emptyEntries: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyEntriesText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.sm },

  // Day-off entry row (Sunday / public holiday)
  dayOffRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#FFF1F0', marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#FECACA',
  },
  dayOffIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
  },
  dayOffDate: { fontSize: FONTS.sizes.xs, color: '#DC2626', marginBottom: 2 },
  dayOffLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: '#B91C1C' },
  dayOffBadge: {
    backgroundColor: '#FEE2E2', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  dayOffBadgeText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  dayOffRejectedOwed: { fontSize: FONTS.sizes.xs, color: '#DC2626', fontWeight: '600', marginTop: 2 },

  // Shortfall chip
  shortfallChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  shortfallChipText: { fontSize: 10, color: '#92400E', fontWeight: '700' },

  dayOffBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: '#EDE9FE', marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#DDD6FE',
  },
  dayOffBannerTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: '#5B21B6' },
  dayOffBannerSub: { fontSize: FONTS.sizes.xs, color: '#7C3AED', marginTop: 2 },

  fabRow: {
    position: 'absolute', bottom: SPACING.xl, right: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full,
    paddingVertical: 14, paddingHorizontal: SPACING.lg, ...SHADOWS.lg,
  },
  fabSecondary: {
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  fabText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },

  declineAgreementBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl, paddingVertical: 13,
    borderWidth: 1.5, borderColor: COLORS.error,
  },
  declineAgreementBtnText: { color: COLORS.error, fontWeight: '700', fontSize: FONTS.sizes.md },
});

const modal = StyleSheet.create({
  // Full-screen transparent backdrop (sits behind the sheet, dismisses on tap)
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  // Wrapper that positions the sheet at the bottom
  sheetWrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', pointerEvents: 'box-none' },
  // The draggable white sheet
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg, paddingBottom: 40,
    maxHeight: '92%',
    ...SHADOWS.lg,
  },
  // Wider drag-handle hit area
  handleWrap: { alignItems: 'center', paddingVertical: 12 },
  handle: { width: 44, height: 5, backgroundColor: COLORS.gray[300], borderRadius: 3 },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#DCFCE7', borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#86EFAC',
  },
  lockedBannerText: { flex: 1, fontSize: FONTS.sizes.xs, color: '#166534', fontWeight: '600' },
  updateBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#FEF3C7', borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  updateBannerText: { flex: 1, fontSize: FONTS.sizes.xs, color: '#92400E', fontWeight: '600' },
  shortfallSection: {
    backgroundColor: '#FFF7ED', borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  shortfallHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs,
  },
  shortfallTitle: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#92400E' },
  shortfallTotalChip: {
    backgroundColor: '#FED7AA', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  shortfallTotalText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  coverAllBtn: {
    backgroundColor: COLORS.primary + '18', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
  },
  coverAllBtnText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },
  shortfallRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: '#FED7AA',
  },
  shortfallRowLeft: { flex: 1 },
  shortfallRowDate: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: '#92400E' },
  shortfallRowOwed: { fontSize: FONTS.sizes.xs, color: '#B45309', marginTop: 1 },
  shortfallInput: {
    width: 82, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
    fontSize: FONTS.sizes.sm, color: COLORS.text,
    borderWidth: 1, borderColor: '#FED7AA', textAlign: 'right',
  },
  shortfallSummary: {
    backgroundColor: '#FEF3C7', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.xs,
    borderTopWidth: 1, borderTopColor: '#FED7AA',
  },
  shortfallSummaryLine: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#92400E' },
  shortfallSummaryRemaining: { fontSize: FONTS.sizes.xs, color: '#B45309', marginTop: 2 },
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
  saveBtn: { paddingVertical: 15, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', backgroundColor: '#7C3AED', marginTop: SPACING.md },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
});

const proj = StyleSheet.create({
  card: {
    backgroundColor: '#F5F3FF',
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 2 },
  title: { flex: 1, fontSize: FONTS.sizes.sm, fontWeight: '700', color: '#5B21B6' },
  pill: {
    fontSize: 10, fontWeight: '700', color: '#7C3AED',
    backgroundColor: '#EDE9FE', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sub: { fontSize: FONTS.sizes.xs, color: '#7C3AED', marginBottom: SPACING.sm, opacity: 0.75 },
  row: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 36, backgroundColor: '#DDD6FE', marginHorizontal: 4 },
  item: { flex: 1, alignItems: 'center' },
  itemLabel: { fontSize: 10, color: '#6B7280', marginBottom: 3, textAlign: 'center' },
  itemValue: { fontSize: FONTS.sizes.md, fontWeight: '800', textAlign: 'center' },
});

export default AgreementDetailScreen;
