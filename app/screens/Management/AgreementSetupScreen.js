import React, { useState } from 'react';
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
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const CONTRACT_TYPES = [
  {
    id: 'daily_target',
    label: 'Daily Target',
    description: 'Driver pays you a fixed amount daily',
    icon: 'cash-outline',
    color: COLORS.primary,
  },
  {
    id: 'revenue_share',
    label: 'Revenue Share',
    description: 'Split earnings by percentage',
    icon: 'pie-chart-outline',
    color: COLORS.secondary,
  },
  {
    id: 'rent_to_own',
    label: 'Rent to Own',
    description: 'Driver pays total over time, then owns the car',
    icon: 'key-outline',
    color: COLORS.accent,
  },
];

const DAYS_OFF_OPTIONS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
  { id: 'public_holidays', label: 'Public Holidays' },
];

const AgreementSetupScreen = ({ route, navigation }) => {
  const { driverId, driverName, jobPostId, jobInterestId } = route.params;
  const { profile } = useAuth();
  const createAgreement = useAgreementStore((s) => s.createAgreement);

  const [contractType, setContractType] = useState(null);
  const [dailyTarget, setDailyTarget] = useState('');
  const [driverPct, setDriverPct] = useState('');
  const [rentTotal, setRentTotal] = useState('');
  const [rentTargetDate, setRentTargetDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [daysOff, setDaysOff] = useState(['sunday', 'public_holidays']);
  const [maintenance, setMaintenance] = useState('owner');
  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleDayOff = (dayId) => {
    setDaysOff((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const validate = () => {
    if (!contractType) {
      Alert.alert('Required', 'Please select a contract type.');
      return false;
    }
    if (contractType === 'daily_target') {
      const amt = parseFloat(dailyTarget);
      if (!amt || amt <= 0) {
        Alert.alert('Required', 'Please enter a valid daily target amount.');
        return false;
      }
    }
    if (contractType === 'revenue_share') {
      const pct = parseFloat(driverPct);
      if (!pct || pct < 1 || pct > 99) {
        Alert.alert('Required', 'Please enter a valid driver percentage (1-99).');
        return false;
      }
    }
    if (contractType === 'rent_to_own') {
      const total = parseFloat(rentTotal);
      if (!total || total <= 0) {
        Alert.alert('Required', 'Please enter a valid total amount.');
        return false;
      }
      if (rentTargetDate <= new Date()) {
        Alert.alert('Required', 'Target date must be in the future.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const agreementData = {
      owner_id: profile.id,
      driver_id: driverId,
      job_interest_id: jobInterestId || null,
      contract_type: contractType,
      days_off: daysOff,
      maintenance_responsibility: maintenance,
      start_date: startDate.toISOString().split('T')[0],
      notes: notes.trim() || null,
    };

    if (contractType === 'daily_target') {
      agreementData.daily_target_amount = parseFloat(dailyTarget);
    } else if (contractType === 'revenue_share') {
      agreementData.revenue_share_driver_pct = parseFloat(driverPct);
    } else if (contractType === 'rent_to_own') {
      agreementData.rent_to_own_total = parseFloat(rentTotal);
      agreementData.rent_to_own_target_date = rentTargetDate.toISOString().split('T')[0];
    }

    const { data, error } = await createAgreement(agreementData);
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message || 'Could not create agreement. Please try again.');
      return;
    }

    Alert.alert('Agreement Created', 'Payment agreement has been set up successfully.', [
      {
        text: 'View Dashboard',
        onPress: () => navigation.replace('ManagementDashboard', { agreementId: data.id }),
      },
    ]);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Driver Info */}
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.driverName}>{driverName || 'Driver'}</Text>
          </View>

          {/* Contract Type */}
          <Text style={styles.sectionLabel}>Contract Type</Text>
          <View style={styles.contractTypes}>
            {CONTRACT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.contractCard,
                  contractType === type.id && { borderColor: type.color, borderWidth: 2 },
                ]}
                onPress={() => setContractType(type.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.contractIcon, { backgroundColor: type.color + '15' }]}>
                  <Ionicons name={type.icon} size={24} color={type.color} />
                </View>
                <Text style={styles.contractLabel}>{type.label}</Text>
                <Text style={styles.contractDesc}>{type.description}</Text>
                {contractType === type.id && (
                  <View style={[styles.selectedCheck, { backgroundColor: type.color }]}>
                    <Ionicons name="checkmark" size={14} color={COLORS.white} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Conditional Fields */}
          {contractType === 'daily_target' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Daily Target Amount (N$)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 400"
                keyboardType="numeric"
                value={dailyTarget}
                onChangeText={setDailyTarget}
              />
              <Text style={styles.fieldHint}>
                The driver pays you this amount every working day
              </Text>
            </View>
          )}

          {contractType === 'revenue_share' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Driver's Percentage (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 30"
                keyboardType="numeric"
                value={driverPct}
                onChangeText={setDriverPct}
              />
              {driverPct ? (
                <Text style={styles.fieldHint}>
                  Driver keeps {driverPct}%, you receive {100 - parseFloat(driverPct || 0)}%
                </Text>
              ) : (
                <Text style={styles.fieldHint}>
                  Enter the percentage the driver keeps from total earnings
                </Text>
              )}
            </View>
          )}

          {contractType === 'rent_to_own' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Total Amount (N$)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 120000"
                  keyboardType="numeric"
                  value={rentTotal}
                  onChangeText={setRentTotal}
                />
                <Text style={styles.fieldHint}>
                  Total amount the driver must pay to own the car
                </Text>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Target Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.dateText}>{formatDate(rentTargetDate)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={rentTargetDate}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(e, date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) setRentTargetDate(date);
                    }}
                  />
                )}
              </View>
            </>
          )}

          {/* Common Fields - only show after contract type is selected */}
          {contractType && (
            <>
              {/* Days Off */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Days Off</Text>
                <View style={styles.daysOffGrid}>
                  {DAYS_OFF_OPTIONS.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={[
                        styles.dayChip,
                        daysOff.includes(day.id) && styles.dayChipSelected,
                      ]}
                      onPress={() => toggleDayOff(day.id)}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          daysOff.includes(day.id) && styles.dayChipTextSelected,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Maintenance */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Maintenance Responsibility</Text>
                <View style={styles.radioRow}>
                  <TouchableOpacity
                    style={[styles.radioOption, maintenance === 'owner' && styles.radioSelected]}
                    onPress={() => setMaintenance('owner')}
                  >
                    <Ionicons
                      name={maintenance === 'owner' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={maintenance === 'owner' ? COLORS.primary : COLORS.gray[400]}
                    />
                    <Text style={styles.radioLabel}>Owner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioOption, maintenance === 'driver' && styles.radioSelected]}
                    onPress={() => setMaintenance('driver')}
                  >
                    <Ionicons
                      name={maintenance === 'driver' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={maintenance === 'driver' ? COLORS.primary : COLORS.gray[400]}
                    />
                    <Text style={styles.radioLabel}>Driver</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Start Date */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    onChange={(e, date) => {
                      setShowStartDatePicker(Platform.OS === 'ios');
                      if (date) setStartDate(date);
                    }}
                  />
                )}
              </View>

              {/* Notes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any additional terms or notes..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  maxLength={300}
                />
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        {contractType && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Ionicons name="document-text-outline" size={20} color={COLORS.white} />
              <Text style={styles.submitBtnText}>
                {submitting ? 'Creating...' : 'Create Agreement'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1, paddingHorizontal: SPACING.lg },

  // Driver info
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Section label
  sectionLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  // Contract type cards
  contractTypes: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  contractCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    ...SHADOWS.sm,
  },
  contractIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  contractDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    flex: 1,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Form fields
  fieldGroup: {
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  fieldHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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

  // Days off
  daysOffGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  dayChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  dayChipSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dayChipTextSelected: {
    color: COLORS.primary,
  },

  // Radio
  radioRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  radioSelected: {},
  radioLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },

  // Footer
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    backgroundColor: COLORS.background,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
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

export default AgreementSetupScreen;
