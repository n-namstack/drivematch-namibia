import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, DOCUMENT_TYPES } from '../constants/theme';

const DocumentProgressBar = ({ documents, activeDocType, phase }) => {
  const getDocStatus = (docTypeId) => {
    const doc = documents.find((d) => d.document_type === docTypeId);
    if (!doc) return 'none';
    return doc.verification_status;
  };

  const getStepColor = (docTypeId) => {
    if (docTypeId === activeDocType && phase !== 'overview' && phase !== 'review') {
      return COLORS.primary;
    }
    const status = getDocStatus(docTypeId);
    switch (status) {
      case 'verified': return COLORS.verified;
      case 'pending': case 'submitted': return COLORS.pending;
      case 'rejected': return COLORS.rejected;
      case 'expired': return COLORS.error;
      default: return COLORS.gray[300];
    }
  };

  const getStepIcon = (docTypeId) => {
    const status = getDocStatus(docTypeId);
    switch (status) {
      case 'verified': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'expired': return 'time';
      case 'pending': case 'submitted': return 'ellipse';
      default: return 'ellipse-outline';
    }
  };

  const requiredDocs = DOCUMENT_TYPES.filter((d) => d.required);
  const uploadedCount = requiredDocs.filter((d) => getDocStatus(d.id) !== 'none').length;
  const progress = requiredDocs.length > 0 ? uploadedCount / requiredDocs.length : 0;

  return (
    <View style={styles.container}>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.stepsRow}>
        {DOCUMENT_TYPES.filter((d) => d.required).map((docType, index) => (
          <View key={docType.id} style={styles.step}>
            <Ionicons
              name={getStepIcon(docType.id)}
              size={18}
              color={getStepColor(docType.id)}
            />
            <Text
              style={[
                styles.stepLabel,
                docType.id === activeDocType && styles.stepLabelActive,
              ]}
              numberOfLines={1}
            >
              {docType.id === 'drivers_license' ? 'License' : docType.id === 'id_document' ? 'ID' : docType.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    marginBottom: SPACING.sm,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  step: {
    alignItems: 'center',
    gap: 2,
  },
  stepLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default DocumentProgressBar;
