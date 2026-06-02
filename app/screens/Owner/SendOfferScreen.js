import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import useHireOfferStore from '../../store/useHireOfferStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const JOB_TYPES = [
  { key: 'permanent', label: 'Permanent' },
  { key: 'temporary', label: 'Temporary' },
  { key: 'contract', label: 'Contract' },
];

const formatDate = (date) =>
  date.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' });

const toISODate = (date) => date.toISOString().split('T')[0];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);

const SendOfferScreen = ({ navigation, route }) => {
  const { driverId, driverName, driverImage } = route.params;
  const { profile } = useAuth();
  const sendOffer = useHireOfferStore((s) => s.sendOffer);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [jobType, setJobType] = useState('permanent');
  const [startDate, setStartDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && !submitting;

  const handleSend = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await sendOffer(profile.id, driverId, {
        title: title.trim(),
        message: message.trim() || null,
        job_type: jobType,
        start_date: startDate ? toISODate(startDate) : null,
      });
      Toast.show({ type: 'success', text1: 'Offer sent!', text2: `Your offer has been sent to ${driverName}.` });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to send offer', text2: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Driver preview */}
          <View style={styles.driverCard}>
            {driverImage ? (
              <Image source={{ uri: driverImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={26} color={COLORS.gray[400]} />
              </View>
            )}
            <View>
              <Text style={styles.driverLabel}>Sending offer to</Text>
              <Text style={styles.driverName}>{driverName}</Text>
            </View>
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Job Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Full-time Truck Driver"
              placeholderTextColor={COLORS.gray[400]}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              maxLength={80}
            />
          </View>

          {/* Job type */}
          <View style={styles.field}>
            <Text style={styles.label}>Job Type</Text>
            <View style={styles.segmented}>
              {JOB_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.segment, jobType === t.key && styles.segmentActive]}
                  onPress={() => setJobType(t.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentText, jobType === t.key && styles.segmentTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Start date */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Start Date <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={startDate ? COLORS.primary : COLORS.gray[400]}
              />
              <Text style={[styles.dateBtnText, startDate && styles.dateBtnTextSelected]}>
                {startDate ? formatDate(startDate) : 'Select a start date'}
              </Text>
              {startDate && (
                <TouchableOpacity
                  onPress={() => setStartDate(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={startDate || tomorrow}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={tomorrow}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
            )}
          </View>

          {/* Message */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Message <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Add any additional details, expectations, or a personal note..."
              placeholderTextColor={COLORS.gray[400]}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={600}
            />
            <Text style={styles.charCount}>{message.length}/600</Text>
          </View>
        </ScrollView>

        {/* Send button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendBtn, !canSubmit && styles.sendBtnDisabled]}
            onPress={handleSend}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color={COLORS.white} />
                <Text style={styles.sendBtnText}>Send Offer</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  driverName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginTop: 2 },

  field: { marginBottom: SPACING.lg },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  required: { color: COLORS.error },
  optional: { color: COLORS.textSecondary, fontWeight: '400' },

  input: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    ...SHADOWS.sm,
  },
  textarea: {
    height: 120,
    paddingTop: 13,
  },
  charCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    ...SHADOWS.sm,
  },
  dateBtnText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  dateBtnTextSelected: { color: COLORS.text },

  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  segmentActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  segmentText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  segmentTextActive: { color: COLORS.primary, fontWeight: '700' },

  footer: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
});

export default SendOfferScreen;
