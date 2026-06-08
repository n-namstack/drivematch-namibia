import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
  Image, Switch, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import useAgreementStore from '../../store/useAgreementStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const AGREEMENT_TYPES = [
  { key: 'daily_remittance', label: 'Daily Remittance', icon: 'cash-outline' },
  { key: 'buyout_contract',  label: 'Buyout Contract',  icon: 'car-outline' },
];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);

const fmt = (d) =>
  d.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' });

const CreateAgreementScreen = ({ navigation, route }) => {
  const { driverId, driverName, driverImage } = route.params;
  const { profile } = useAuth();
  const createAgreement = useAgreementStore((s) => s.createAgreement);
  const uploadContractDocument = useAgreementStore((s) => s.uploadContractDocument);

  const [type, setType] = useState('daily_remittance');
  const [dailyAmount, setDailyAmount] = useState('');
  const [ownerPct, setOwnerPct] = useState('50');
  const [buyoutTarget, setBuyoutTarget] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [serviceBy, setServiceBy] = useState('owner'); // 'owner' | 'driver'
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [vehicle, setVehicle] = useState('');
  const [notes, setNotes] = useState('');
  const [contractFile, setContractFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [offSundays, setOffSundays] = useState(true);
  const [offPublicHolidays, setOffPublicHolidays] = useState(true);

  const isDailyRemittance = type === 'daily_remittance';

  const canSubmit =
    dailyAmount.trim().length > 0 &&
    (!isDailyRemittance ? buyoutTarget.trim().length > 0 : true) &&
    !submitting;

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setContractFile(result.assets[0]);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Could not open document picker' });
    }
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const endDate = !isDailyRemittance && durationMonths
        ? (() => {
            const d = new Date(startDate);
            d.setMonth(d.getMonth() + parseInt(durationMonths, 10));
            return d.toISOString().split('T')[0];
          })()
        : null;

      const payload = {
        owner_id: profile.id,
        driver_id: driverId,
        agreement_type: type,
        daily_amount: parseFloat(dailyAmount),
        owner_percentage: isDailyRemittance ? parseFloat(ownerPct) : null,
        buyout_target: !isDailyRemittance ? parseFloat(buyoutTarget) : null,
        service_responsibility: isDailyRemittance ? 'owner' : serviceBy,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate,
        vehicle_description: vehicle.trim() || null,
        notes: notes.trim() || null,
        off_sundays: isDailyRemittance ? offSundays : false,
        off_public_holidays: isDailyRemittance ? offPublicHolidays : false,
      };

      const created = await createAgreement(payload);

      // Upload contract doc if provided (buyout)
      if (!isDailyRemittance && contractFile) {
        await uploadContractDocument(created.id, contractFile.uri, contractFile.mimeType);
      }

      Toast.show({ type: 'success', text1: 'Agreement created!', text2: `Agreement with ${driverName} is now active.` });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to create agreement', text2: err?.message || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Driver card */}
          <View style={styles.driverCard}>
            {driverImage ? (
              <Image source={{ uri: driverImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={26} color={COLORS.gray[400]} />
              </View>
            )}
            <View>
              <Text style={styles.driverLabel}>Agreement with</Text>
              <Text style={styles.driverName}>{driverName}</Text>
            </View>
          </View>

          {/* Agreement type */}
          <View style={styles.field}>
            <Text style={styles.label}>Agreement Type</Text>
            <View style={styles.typeBtns}>
              {AGREEMENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, type === t.key && styles.typeBtnActive]}
                  onPress={() => setType(t.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.icon} size={18} color={type === t.key ? COLORS.white : COLORS.textSecondary} />
                  <Text style={[styles.typeBtnText, type === t.key && styles.typeBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Daily amount */}
          <View style={styles.field}>
            <Text style={styles.label}>
              {isDailyRemittance ? 'Daily Target (N$)' : 'Daily Contribution (N$)'}
              <Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 400"
              placeholderTextColor={COLORS.gray[400]}
              value={dailyAmount}
              onChangeText={setDailyAmount}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>

          {isDailyRemittance ? (
            /* Owner's % back to driver */
            <View style={styles.field}>
              <Text style={styles.label}>Driver's % cut at month-end</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 50"
                placeholderTextColor={COLORS.gray[400]}
                value={ownerPct}
                onChangeText={setOwnerPct}
                keyboardType="numeric"
                returnKeyType="next"
              />
              {ownerPct && dailyAmount ? (
                <Text style={styles.hint}>
                  Driver keeps N${(parseFloat(dailyAmount || 0) * parseFloat(ownerPct || 0) / 100).toFixed(2)}/day
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Work Schedule — daily remittance only */}
          {isDailyRemittance && (
            <View style={styles.field}>
              <Text style={styles.label}>Work Schedule</Text>
              <Text style={styles.scheduleSubtitle}>
                Off days are auto-logged and excluded from monthly projections.
              </Text>
              <View style={styles.scheduleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleToggleLabel}>Sundays off</Text>
                  <Text style={styles.scheduleToggleSub}>Driver does not log on Sundays</Text>
                </View>
                <Switch
                  value={offSundays}
                  onValueChange={setOffSundays}
                  trackColor={{ true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              </View>
              <View style={[styles.scheduleRow, { marginTop: SPACING.sm }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleToggleLabel}>Public holidays off</Text>
                  <Text style={styles.scheduleToggleSub}>Driver does not log on Namibian public holidays</Text>
                </View>
                <Switch
                  value={offPublicHolidays}
                  onValueChange={setOffPublicHolidays}
                  trackColor={{ true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              </View>
            </View>
          )}

          {!isDailyRemittance ? (
            <>
              {/* Buyout target */}
              <View style={styles.field}>
                <Text style={styles.label}>Total Buyout Amount (N$)<Text style={styles.required}> *</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 100000"
                  placeholderTextColor={COLORS.gray[400]}
                  value={buyoutTarget}
                  onChangeText={setBuyoutTarget}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>

              {/* Duration */}
              <View style={styles.field}>
                <Text style={styles.label}>Duration (months) <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 18"
                  placeholderTextColor={COLORS.gray[400]}
                  value={durationMonths}
                  onChangeText={setDurationMonths}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>

              {/* Service responsibility */}
              <View style={styles.field}>
                <Text style={styles.label}>Service Responsibility</Text>
                <View style={styles.segmented}>
                  {['driver', 'owner'].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.segment, serviceBy === v && styles.segmentActive]}
                      onPress={() => setServiceBy(v)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.segmentText, serviceBy === v && styles.segmentTextActive]}>
                        {v === 'driver' ? 'Driver' : 'Owner'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Contract document */}
              <View style={styles.field}>
                <Text style={styles.label}>Signed Contract <Text style={styles.optional}>(optional)</Text></Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument} activeOpacity={0.8}>
                  <Ionicons
                    name={contractFile ? 'document-attach' : 'cloud-upload-outline'}
                    size={20}
                    color={contractFile ? COLORS.primary : COLORS.gray[400]}
                  />
                  <Text style={[styles.uploadBtnText, contractFile && styles.uploadBtnTextSelected]}>
                    {contractFile ? contractFile.name : 'Upload PDF or image'}
                  </Text>
                  {contractFile && (
                    <TouchableOpacity onPress={() => setContractFile(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {/* Start date */}
          <View style={styles.field}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.dateBtnText}>{fmt(startDate)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (d) setStartDate(d);
                }}
              />
            )}
          </View>

          {/* Vehicle */}
          <View style={styles.field}>
            <Text style={styles.label}>Vehicle Description <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Toyota Hilux ABC 123 NB"
              placeholderTextColor={COLORS.gray[400]}
              value={vehicle}
              onChangeText={setVehicle}
              returnKeyType="next"
              maxLength={80}
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Any additional terms or notes..."
              placeholderTextColor={COLORS.gray[400]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={400}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
            onPress={handleCreate}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                <Text style={styles.createBtnText}>Create Agreement</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.sm },

  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.lg, ...SHADOWS.sm,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center' },
  driverLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  driverName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginTop: 2 },

  field: { marginBottom: SPACING.lg },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  required: { color: COLORS.error },
  optional: { color: COLORS.textSecondary, fontWeight: '400' },
  hint: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: SPACING.xs },
  scheduleSubtitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, ...SHADOWS.sm,
  },
  scheduleToggleLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  scheduleToggleSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  input: {
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
    fontSize: FONTS.sizes.sm, color: COLORS.text, ...SHADOWS.sm,
  },
  textarea: { height: 100, paddingTop: 13 },

  typeBtns: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, borderWidth: 1.5, borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.xl, paddingVertical: 13,
    backgroundColor: COLORS.white,
  },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  typeBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  typeBtnTextActive: { color: COLORS.white },

  segmented: {
    flexDirection: 'row', backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg, padding: 3,
  },
  segment: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  segmentActive: { backgroundColor: COLORS.white, ...SHADOWS.sm },
  segmentText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  segmentTextActive: { color: COLORS.primary, fontWeight: '700' },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 13, ...SHADOWS.sm,
  },
  dateBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.text },

  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 13, ...SHADOWS.sm,
  },
  uploadBtnText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.gray[400] },
  uploadBtnTextSelected: { color: COLORS.text },

  footer: { padding: SPACING.lg, paddingTop: SPACING.md, backgroundColor: COLORS.background },
  createBtn: {
    backgroundColor: '#7C3AED', borderRadius: BORDER_RADIUS.xl, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, ...SHADOWS.md,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
});

export default CreateAgreementScreen;
