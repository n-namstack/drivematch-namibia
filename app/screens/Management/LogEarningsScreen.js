import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import useAgreementStore from '../../store/useAgreementStore';
import agreementService from '../../services/agreementService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const LogEarningsScreen = ({ route, navigation }) => {
  const { agreementId } = route.params;
  const { profile } = useAuth();
  const activeAgreement = useAgreementStore((s) => s.activeAgreement);
  const fetchAgreementById = useAgreementStore((s) => s.fetchAgreementById);
  const logEarning = useAgreementStore((s) => s.logEarning);
  const updateEarning = useAgreementStore((s) => s.updateEarning);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [totalEarned, setTotalEarned] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingEntry, setExistingEntry] = useState(null);
  const [loadingEntry, setLoadingEntry] = useState(false);

  useEffect(() => {
    if (!activeAgreement || activeAgreement.id !== agreementId) {
      fetchAgreementById(agreementId);
    }
  }, [agreementId]);

  // Check for existing entry when date changes
  useEffect(() => {
    checkForExistingEntry(date);
  }, [date, agreementId]);

  // Auto-fill amount paid based on contract type
  useEffect(() => {
    if (!activeAgreement || existingEntry) return;

    if (activeAgreement.contract_type === 'daily_target' && activeAgreement.daily_target_amount) {
      setAmountPaid(String(activeAgreement.daily_target_amount));
    } else if (activeAgreement.contract_type === 'revenue_share' && totalEarned) {
      const earned = parseFloat(totalEarned);
      if (!isNaN(earned) && earned > 0) {
        const ownerPct = 100 - Number(activeAgreement.revenue_share_driver_pct);
        const ownerShare = Math.round(earned * ownerPct) / 100;
        setAmountPaid(String(ownerShare));
      }
    }
  }, [totalEarned, activeAgreement?.contract_type]);

  const checkForExistingEntry = async (selectedDate) => {
    setLoadingEntry(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { data } = await agreementService.checkExistingEntry(agreementId, dateStr);
    if (data) {
      setExistingEntry(data);
      setTotalEarned(String(data.total_earned));
      setAmountPaid(String(data.amount_paid_to_owner));
      setNotes(data.notes || '');
    } else {
      setExistingEntry(null);
      setTotalEarned('');
      setAmountPaid('');
      setNotes('');
      // Re-trigger auto-fill for daily_target
      if (activeAgreement?.contract_type === 'daily_target' && activeAgreement.daily_target_amount) {
        setAmountPaid(String(activeAgreement.daily_target_amount));
      }
    }
    setLoadingEntry(false);
  };

  const handleSubmit = async () => {
    const earned = parseFloat(totalEarned);
    const paid = parseFloat(amountPaid);

    if (!earned || earned < 0) {
      Alert.alert('Required', 'Please enter the total amount earned.');
      return;
    }
    if (!paid || paid < 0) {
      Alert.alert('Required', 'Please enter the amount paid to owner.');
      return;
    }

    setSubmitting(true);
    const dateStr = date.toISOString().split('T')[0];

    if (existingEntry) {
      // Update existing
      const wasVerified = existingEntry.verification_status === 'verified';
      if (wasVerified) {
        Alert.alert(
          'Re-verification Required',
          'This entry was already verified. Updating it will require the owner to re-verify.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setSubmitting(false) },
            {
              text: 'Update Anyway',
              onPress: async () => {
                const { error } = await updateEarning(
                  existingEntry.id,
                  {
                    total_earned: earned,
                    amount_paid_to_owner: paid,
                    notes: notes.trim() || null,
                  },
                  wasVerified
                );
                setSubmitting(false);
                if (error) {
                  Alert.alert('Error', error.message || 'Could not update entry.');
                } else {
                  Alert.alert('Updated', 'Your entry has been updated.', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                  ]);
                }
              },
            },
          ]
        );
        return;
      }

      const { error } = await updateEarning(existingEntry.id, {
        total_earned: earned,
        amount_paid_to_owner: paid,
        notes: notes.trim() || null,
      }, false);
      setSubmitting(false);
      if (error) {
        Alert.alert('Error', error.message || 'Could not update entry.');
      } else {
        Alert.alert('Updated', 'Your entry has been updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } else {
      // Create new
      const { error } = await logEarning({
        agreement_id: agreementId,
        date: dateStr,
        total_earned: earned,
        amount_paid_to_owner: paid,
        notes: notes.trim() || null,
        created_by: profile.id,
      });
      setSubmitting(false);
      if (error) {
        if (error.message?.includes('unique') || error.code === '23505') {
          Alert.alert('Duplicate', 'An entry already exists for this date.');
        } else {
          Alert.alert('Error', error.message || 'Could not log earnings.');
        }
      } else {
        Alert.alert('Logged', 'Your earnings have been logged.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    }
  };

  const formatDate = (d) => {
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Get contract type hint
  const getHint = () => {
    if (!activeAgreement) return '';
    if (activeAgreement.contract_type === 'daily_target') {
      return `Target: N$${Number(activeAgreement.daily_target_amount).toLocaleString()}/day`;
    }
    if (activeAgreement.contract_type === 'revenue_share') {
      const ownerPct = 100 - Number(activeAgreement.revenue_share_driver_pct);
      return `Owner gets ${ownerPct}%, you keep ${activeAgreement.revenue_share_driver_pct}%`;
    }
    if (activeAgreement.contract_type === 'rent_to_own') {
      return `Rent to Own: N$${Number(activeAgreement.rent_to_own_total).toLocaleString()} total`;
    }
    return '';
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Contract hint */}
          {getHint() ? (
            <View style={styles.hintBanner}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.hintText}>{getHint()}</Text>
            </View>
          ) : null}

          {/* Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                maximumDate={new Date()}
                onChange={(e, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
            {existingEntry && (
              <View style={styles.existingBadge}>
                <Ionicons name="create-outline" size={14} color={COLORS.warning} />
                <Text style={styles.existingText}>
                  Entry exists for this date — editing mode
                </Text>
              </View>
            )}
          </View>

          {/* Total Earned */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Total Earned (N$)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              keyboardType="numeric"
              value={totalEarned}
              onChangeText={setTotalEarned}
            />
          </View>

          {/* Amount Paid to Owner */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Amount Paid to Owner (N$)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              keyboardType="numeric"
              value={amountPaid}
              onChangeText={setAmountPaid}
            />
            {activeAgreement?.contract_type === 'revenue_share' && totalEarned ? (
              <Text style={styles.calcHint}>
                Auto-calculated: {100 - Number(activeAgreement.revenue_share_driver_pct)}% of N${Number(totalEarned).toLocaleString()}
              </Text>
            ) : null}
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any notes for today..."
              value={notes}
              onChangeText={setNotes}
              maxLength={200}
            />
          </View>

          {/* Verified entry warning */}
          {existingEntry?.verification_status === 'verified' && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
              <Text style={styles.warningText}>
                This entry was already verified. Updating it will require the owner to re-verify.
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || loadingEntry}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
            <Text style={styles.submitBtnText}>
              {submitting
                ? 'Saving...'
                : existingEntry
                ? 'Update Entry'
                : 'Log Earnings'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },

  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '0A',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  hintText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
    flex: 1,
  },

  fieldGroup: {
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  dateButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  existingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  existingText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.warning,
    fontWeight: '500',
  },

  amountInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  calcHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  notesInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.warning + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  warningText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.accentDark || COLORS.text,
    flex: 1,
  },

  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    backgroundColor: COLORS.background,
  },
  submitBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});

export default LogEarningsScreen;
