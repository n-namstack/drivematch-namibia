import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import documentService from '../services/documentService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, DOCUMENT_TYPES } from '../constants/theme';

const DocumentCapture = ({ docType, existingDoc, onCapture, onBack }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const docTypeConfig = DOCUMENT_TYPES.find((d) => d.id === docType);

  const handleTakePhoto = async () => {
    setLoading(true);
    const { data, error } = await documentService.takePhoto();
    setLoading(false);
    if (data && !error) {
      setCapturedImage(data);
    }
  };

  const handlePickImage = async () => {
    setLoading(true);
    const { data, error } = await documentService.pickImage();
    setLoading(false);
    if (data && !error) {
      setCapturedImage(data);
    }
  };

  const handlePickDocument = async () => {
    setLoading(true);
    const { data, error } = await documentService.pickDocument();
    setLoading(false);
    if (data && !error) {
      setCapturedImage(data);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleContinue = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Preview</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage.uri }} style={styles.previewImage} resizeMode="contain" />
        </View>

        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.previewHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{docTypeConfig?.label || 'Upload Document'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Ionicons name="information-circle-outline" size={22} color={COLORS.info} />
        <Text style={styles.instructionsText}>
          {docTypeConfig?.instructions || 'Upload a clear photo of your document.'}
        </Text>
      </View>

      {/* Existing document preview */}
      {existingDoc?.document_url && (
        <View style={styles.existingContainer}>
          <Text style={styles.existingLabel}>Current document:</Text>
          <Image source={{ uri: existingDoc.document_url }} style={styles.existingThumb} resizeMode="cover" />
          <Text style={styles.existingHint}>Upload a new photo to replace</Text>
        </View>
      )}

      {/* Capture options */}
      <View style={styles.captureOptions}>
        <TouchableOpacity
          style={styles.captureCard}
          onPress={handleTakePhoto}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <View style={styles.captureIconBg}>
                <Ionicons name="camera" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.captureLabel}>Take Photo</Text>
              <Text style={styles.captureHint}>Use your camera</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureCard}
          onPress={handlePickImage}
          disabled={loading}
        >
          <View style={styles.captureIconBg}>
            <Ionicons name="images" size={32} color={COLORS.secondary} />
          </View>
          <Text style={styles.captureLabel}>From Gallery</Text>
          <Text style={styles.captureHint}>Choose existing photo</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.documentPickerBtn}
        onPress={handlePickDocument}
        disabled={loading}
      >
        <Ionicons name="document-outline" size={20} color={COLORS.primary} />
        <Text style={styles.documentPickerText}>Upload PDF or Document</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  previewHeader: {
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
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.info + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  instructionsText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  existingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  existingLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  existingThumb: {
    width: 120,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
  },
  existingHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  captureOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  captureCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  captureIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  captureLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  captureHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  documentPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderStyle: 'dashed',
  },
  documentPickerText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
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
  continueButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    ...SHADOWS.md,
  },
  continueText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default DocumentCapture;
