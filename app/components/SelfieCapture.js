import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import documentService from '../services/documentService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, DOCUMENT_TYPES } from '../constants/theme';

const SelfieCapture = ({ docType, documentImageUrl, onCapture, onSkip, onBack }) => {
  const [capturedSelfie, setCapturedSelfie] = useState(null);
  const [loading, setLoading] = useState(false);

  const docTypeConfig = DOCUMENT_TYPES.find((d) => d.id === docType);

  const handleTakeSelfie = async () => {
    setLoading(true);
    const { data, error } = await documentService.takeSelfie();
    setLoading(false);
    if (data && !error) {
      setCapturedSelfie(data);
    }
  };

  const handleRetake = () => {
    setCapturedSelfie(null);
  };

  const handleSubmit = () => {
    if (capturedSelfie) {
      onCapture(capturedSelfie);
    }
  };

  if (capturedSelfie) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Review Selfie</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedSelfie.uri }} style={styles.previewImage} resizeMode="contain" />
        </View>

        {/* Document reference */}
        {documentImageUrl && (
          <View style={styles.referenceRow}>
            <Image source={{ uri: documentImageUrl }} style={styles.referenceThumb} />
            <Text style={styles.referenceText}>Your {docTypeConfig?.label?.toLowerCase()}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit</Text>
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Identity Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionCard}>
        <View style={styles.instructionIconBg}>
          <Ionicons name="person-circle-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.instructionTitle}>
          Take a selfie holding your {docTypeConfig?.label?.toLowerCase() || 'document'}
        </Text>
        <Text style={styles.instructionText}>
          This verifies that the document belongs to you. Hold the document next to your face so both are clearly visible.
        </Text>
      </View>

      {/* Guidelines */}
      <View style={styles.guidelinesList}>
        <GuidelineItem icon="sunny-outline" text="Make sure you have good lighting" />
        <GuidelineItem icon="scan-outline" text="Hold the document flat, facing the camera" />
        <GuidelineItem icon="happy-outline" text="Keep your face fully visible" />
        <GuidelineItem icon="close-circle-outline" text="Don't cover any part of the document" />
      </View>

      {/* Document reference */}
      {documentImageUrl && (
        <View style={styles.referenceCard}>
          <Image source={{ uri: documentImageUrl }} style={styles.referenceThumbLarge} />
          <Text style={styles.referenceCardText}>Hold this document next to your face</Text>
        </View>
      )}

      {/* Capture button */}
      <View style={styles.captureArea}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleTakeSelfie}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} size="large" />
          ) : (
            <>
              <Ionicons name="camera" size={28} color={COLORS.white} />
              <Text style={styles.captureButtonText}>Take Selfie</Text>
            </>
          )}
        </TouchableOpacity>

        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const GuidelineItem = ({ icon, text }) => (
  <View style={styles.guidelineRow}>
    <Ionicons name={icon} size={18} color={COLORS.secondary} />
    <Text style={styles.guidelineText}>{text}</Text>
  </View>
);

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
  instructionCard: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  instructionIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  instructionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  instructionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
  },
  guidelinesList: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  guidelineText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  referenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  referenceThumbLarge: {
    width: 60,
    height: 42,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[200],
  },
  referenceCardText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  captureArea: {
    marginTop: 'auto',
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
    alignItems: 'center',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    width: '100%',
    ...SHADOWS.md,
  },
  captureButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  skipButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  skipText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  referenceThumb: {
    width: 40,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[200],
  },
  referenceText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  retakeText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  submitButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.secondary,
    ...SHADOWS.md,
  },
  submitText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default SelfieCapture;
