import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useJobStore from '../../store/useJobStore';
import LocationAutocomplete from '../../components/LocationAutocomplete';
import {
  COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS,
  VEHICLE_TYPES, AVAILABILITY_OPTIONS,
} from '../../constants/theme';

const EXPERIENCE_OPTIONS = [
  { id: 'any', label: 'Any Level' },
  { id: 'beginner', label: '0-2 years' },
  { id: 'intermediate', label: '2-5 years' },
  { id: 'experienced', label: '5+ years' },
];

const CreateJobPostScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const createJob = useJobStore((s) => s.createJob);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [experienceLevel, setExperienceLevel] = useState('any');
  const [availabilityType, setAvailabilityType] = useState('full_time');
  const [positionsAvailable, setPositionsAvailable] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const toggleVehicleType = (id) => {
    setVehicleTypes((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please add a title for your job post.');
      return;
    }

    setSubmitting(true);
    const { error } = await createJob({
      owner_id: profile.id,
      title: title.trim(),
      description: description.trim() || null,
      location: location || null,
      vehicle_types: vehicleTypes.length > 0 ? vehicleTypes : null,
      experience_level: experienceLevel,
      availability_type: availabilityType,
      positions_available: positionsAvailable,
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Could not create job post. Please try again.');
    } else {
      Alert.alert('Posted!', 'Your job post is now live. Drivers can see it and express interest.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.label}>Job Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Looking for a full-time driver"
            placeholderTextColor={COLORS.gray[400]}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe what you're looking for, any special requirements, schedule details..."
            placeholderTextColor={COLORS.gray[400]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <LocationAutocomplete
            value={location}
            onSelect={setLocation}
            placeholder="Select or type a location"
          />

          {/* Vehicle Types */}
          <Text style={styles.label}>Vehicle Experience Needed</Text>
          <View style={styles.chipGrid}>
            {VEHICLE_TYPES.map((vt) => {
              const selected = vehicleTypes.includes(vt.id);
              return (
                <TouchableOpacity
                  key={vt.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleVehicleType(vt.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Experience Level */}
          <Text style={styles.label}>Minimum Experience</Text>
          <View style={styles.chipGrid}>
            {EXPERIENCE_OPTIONS.map((opt) => {
              const selected = experienceLevel === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setExperienceLevel(opt.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Availability */}
          <Text style={styles.label}>Availability Type</Text>
          <View style={styles.chipGrid}>
            {AVAILABILITY_OPTIONS.map((opt) => {
              const selected = availabilityType === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setAvailabilityType(opt.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Number of Positions */}
          <Text style={styles.label}>Number of Positions</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, positionsAvailable <= 1 && styles.stepperBtnDisabled]}
              onPress={() => setPositionsAvailable((p) => Math.max(1, p - 1))}
              disabled={positionsAvailable <= 1}
            >
              <Ionicons name="remove" size={20} color={positionsAvailable <= 1 ? COLORS.gray[300] : COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{positionsAvailable}</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, positionsAvailable >= 20 && styles.stepperBtnDisabled]}
              onPress={() => setPositionsAvailable((p) => Math.min(20, p + 1))}
              disabled={positionsAvailable >= 20}
            >
              <Ionicons name="add" size={20} color={positionsAvailable >= 20 ? COLORS.gray[300] : COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="megaphone-outline" size={20} color={COLORS.white} />
                <Text style={styles.submitText}>Post Job</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: SPACING['2xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    ...SHADOWS.sm,
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.sm + 2,
  },
  charCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  inputInner: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  dropdown: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    ...SHADOWS.md,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  dropdownText: { fontSize: FONTS.sizes.md, color: COLORS.text },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
  },
  chipSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
  },
  chipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  stepperBtnDisabled: {
    borderColor: COLORS.gray[200],
  },
  stepperValue: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
    minWidth: 30,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xl,
    ...SHADOWS.md,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
});

export default CreateJobPostScreen;
