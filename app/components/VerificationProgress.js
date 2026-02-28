import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const VerificationProgress = ({ verificationResult, loading, onContinue, onRetakeDoc, onRetakeSelfie, hasSelfie }) => {
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (verificationResult && !loading) {
      // Slight delay for animation effect
      const timer = setTimeout(() => setShowResults(true), 300);
      return () => clearTimeout(timer);
    }
  }, [verificationResult, loading]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTitle}>Verifying Your Document</Text>
          <Text style={styles.loadingText}>
            Our AI is checking your document. This usually takes a few seconds...
          </Text>
        </View>
      </View>
    );
  }

  if (!verificationResult) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.loadingTitle}>Verification Unavailable</Text>
          <Text style={styles.loadingText}>
            AI verification is temporarily unavailable. You can continue uploading.
          </Text>
          <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Parse results - handle both combined (selfie) and doc-only responses
  const docResult = verificationResult.documentVerification || verificationResult;
  const selfieResult = verificationResult.selfieVerification || null;
  const hasIssues = !docResult.isMatch || !docResult.isReadable ||
    (selfieResult && (!selfieResult.faceVisible || !selfieResult.documentInHand));

  return (
    <View style={styles.container}>
      {/* Overall status */}
      <View style={[styles.statusCard, hasIssues ? styles.statusWarning : styles.statusSuccess]}>
        <Ionicons
          name={hasIssues ? 'alert-circle' : 'checkmark-circle'}
          size={48}
          color={hasIssues ? COLORS.warning : COLORS.secondary}
        />
        <Text style={styles.statusTitle}>
          {hasIssues ? 'Issues Found' : 'Looking Good!'}
        </Text>
        <Text style={styles.statusSubtitle}>
          {hasIssues
            ? 'Some checks need attention. Review below.'
            : 'Your document passed our checks.'}
        </Text>
      </View>

      {/* Document checks */}
      {showResults && (
        <View style={styles.checksCard}>
          <Text style={styles.checksTitle}>Document Checks</Text>

          <CheckItem
            label="Document type matches"
            passed={docResult.isMatch}
            detail={docResult.isMatch ? `Detected: ${docResult.detectedType}` : docResult.details}
          />
          <CheckItem
            label="Document is readable"
            passed={docResult.isReadable}
          />
          <CheckItem
            label={`Confidence: ${docResult.confidence}`}
            passed={docResult.confidence === 'high'}
            warning={docResult.confidence === 'medium'}
          />

          {docResult.issues?.length > 0 && (
            <View style={styles.issuesList}>
              {docResult.issues.map((issue, idx) => (
                <View key={idx} style={styles.issueRow}>
                  <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
                  <Text style={styles.issueText}>{issue}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Selfie checks */}
          {selfieResult && (
            <>
              <View style={styles.divider} />
              <Text style={styles.checksTitle}>Selfie Verification</Text>

              <CheckItem label="Face is visible" passed={selfieResult.faceVisible} />
              <CheckItem label="Document held in hand" passed={selfieResult.documentInHand} />
              <CheckItem label="Matches uploaded document" passed={selfieResult.matchesUploadedDoc} />

              {selfieResult.issues?.length > 0 && (
                <View style={styles.issuesList}>
                  {selfieResult.issues.map((issue, idx) => (
                    <View key={idx} style={styles.issueRow}>
                      <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
                      <Text style={styles.issueText}>{issue}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        {hasIssues && (
          <>
            <TouchableOpacity style={styles.retakeButton} onPress={onRetakeDoc}>
              <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
              <Text style={styles.retakeText}>Retake Document</Text>
            </TouchableOpacity>
            {hasSelfie && selfieResult && (!selfieResult.faceVisible || !selfieResult.documentInHand) && (
              <TouchableOpacity style={styles.retakeButton} onPress={onRetakeSelfie}>
                <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                <Text style={styles.retakeText}>Retake Selfie</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
          <Text style={styles.continueText}>
            {hasIssues ? 'Continue Anyway' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CheckItem = ({ label, passed, warning = false, detail }) => (
  <View style={styles.checkRow}>
    <Ionicons
      name={passed ? 'checkmark-circle' : warning ? 'alert-circle' : 'close-circle'}
      size={20}
      color={passed ? COLORS.secondary : warning ? COLORS.warning : COLORS.error}
    />
    <View style={styles.checkInfo}>
      <Text style={styles.checkLabel}>{label}</Text>
      {detail && <Text style={styles.checkDetail}>{detail}</Text>}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING['2xl'],
    gap: SPACING.md,
  },
  loadingTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statusCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  statusSuccess: {
    backgroundColor: COLORS.secondary + '10',
  },
  statusWarning: {
    backgroundColor: COLORS.warning + '10',
  },
  statusTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statusSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  checksCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  checksTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  checkInfo: {
    flex: 1,
  },
  checkLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  checkDetail: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[100],
    marginVertical: SPACING.sm,
  },
  issuesList: {
    marginTop: SPACING.sm,
    gap: 4,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  issueText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.warning,
  },
  actionsRow: {
    marginTop: 'auto',
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  retakeText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
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
  continueText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default VerificationProgress;
