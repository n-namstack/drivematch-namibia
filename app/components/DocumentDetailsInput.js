import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, DOCUMENT_TYPES } from '../constants/theme';

const DocumentDetailsInput = ({ docType, existingDoc, onSubmit, onBack }) => {
  const docTypeConfig = DOCUMENT_TYPES.find((d) => d.id === docType);

  const [expiryDate, setExpiryDate] = useState(
    existingDoc?.expiry_date ? new Date(existingDoc.expiry_date) : null
  );
  const [docNumber, setDocNumber] = useState(existingDoc?.document_number || '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const handleContinue = () => {
    onSubmit({
      expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
      documentNumber: docNumber.trim() || null,
    });
  };

  const canContinue = () => {
    if (docTypeConfig?.requiresExpiry && !expiryDate) return false;
    if (docTypeConfig?.requiresNumber && !docNumber.trim()) return false;
    return true;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Document Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        Enter the details for your {docTypeConfig?.label?.toLowerCase() || 'document'}
      </Text>

      {/* Document Number */}
      {docTypeConfig?.requiresNumber && (
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            {docType === 'drivers_license' ? 'License Number' :
             docType === 'pdp' ? 'Permit Number' :
             docType === 'id_document' ? 'ID / Passport Number' : 'Document Number'}
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.gray[400]} />
            <TextInput
              style={styles.input}
              value={docNumber}
              onChangeText={setDocNumber}
              placeholder="Enter document number"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="characters"
            />
          </View>
        </View>
      )}

      {/* Expiry Date */}
      {docTypeConfig?.requiresExpiry && (
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Expiry Date</Text>
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.gray[400]} />
            <Text style={[styles.dateText, !expiryDate && styles.placeholderText]}>
              {expiryDate ? expiryDate.toLocaleDateString() : 'Select expiry date'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={expiryDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.datePickerDone}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Info note */}
      <View style={styles.infoNote}>
        <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.secondary} />
        <Text style={styles.infoNoteText}>
          This information helps verify your documents and track expiry dates so you stay road-ready.
        </Text>
      </View>

      {/* Continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !canContinue() && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue()}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  fieldContainer: {
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  dateText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textLight,
  },
  datePickerContainer: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  datePickerDone: {
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  datePickerDoneText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.secondary + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  infoNoteText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.md,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default DocumentDetailsInput;
