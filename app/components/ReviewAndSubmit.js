import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, DOCUMENT_TYPES, VERIFICATION_STATUS } from '../constants/theme';

const ReviewAndSubmit = ({ documents, loading, onSubmit, onEditDocument, verificationStatus }) => {
  const requiredDocs = DOCUMENT_TYPES.filter((d) => d.required);
  const getDocByType = (docTypeId) => documents.find((d) => d.document_type === docTypeId) || null;

  const allRequiredUploaded = requiredDocs.every((d) => getDocByType(d.id));
  const selfieDocsComplete = DOCUMENT_TYPES
    .filter((d) => d.requiresSelfie)
    .every((d) => {
      const doc = getDocByType(d.id);
      return doc && doc.selfie_url;
    });

  const canSubmit = allRequiredUploaded && verificationStatus !== 'submitted';
  const isAlreadySubmitted = verificationStatus === 'submitted' || verificationStatus === 'verified';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <View style={[styles.statusIcon, isAlreadySubmitted ? styles.statusSubmitted : canSubmit ? styles.statusReady : styles.statusIncomplete]}>
          <Ionicons
            name={isAlreadySubmitted ? 'time' : canSubmit ? 'checkmark-circle' : 'alert-circle'}
            size={48}
            color={isAlreadySubmitted ? COLORS.warning : canSubmit ? COLORS.secondary : COLORS.error}
          />
        </View>
        <Text style={styles.headerTitle}>
          {isAlreadySubmitted ? 'Documents Under Review' :
           canSubmit ? 'Ready to Submit' : 'Missing Documents'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isAlreadySubmitted ? 'Your documents are being reviewed by our team.' :
           canSubmit ? 'Review your documents below and submit for verification.' :
           'Please upload all required documents before submitting.'}
        </Text>
      </View>

      {/* Document summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Document Summary</Text>

        {DOCUMENT_TYPES.map((docType) => {
          const doc = getDocByType(docType.id);
          const status = doc?.verification_status;
          const statusInfo = status ? VERIFICATION_STATUS[status] : null;

          return (
            <TouchableOpacity
              key={docType.id}
              style={styles.docRow}
              onPress={() => onEditDocument(docType.id)}
            >
              {/* Thumbnail */}
              <View style={styles.docThumbContainer}>
                {doc?.document_url ? (
                  <Image source={{ uri: doc.document_url }} style={styles.docThumb} />
                ) : (
                  <View style={styles.docThumbEmpty}>
                    <Ionicons name={docType.icon} size={18} color={COLORS.gray[400]} />
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.docRowInfo}>
                <Text style={styles.docName}>{docType.label}</Text>
                <View style={styles.docStatusRow}>
                  {statusInfo ? (
                    <>
                      <View style={[styles.docStatusDot, { backgroundColor: statusInfo.color }]} />
                      <Text style={[styles.docStatusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.docMissing}>
                      {docType.required ? 'Required - Not uploaded' : 'Optional - Not uploaded'}
                    </Text>
                  )}
                </View>

                {/* Selfie status for docs that require it */}
                {docType.requiresSelfie && doc && (
                  <View style={styles.selfieStatus}>
                    <Ionicons
                      name={doc.selfie_url ? 'person-circle' : 'person-circle-outline'}
                      size={14}
                      color={doc.selfie_url ? COLORS.secondary : COLORS.textLight}
                    />
                    <Text style={[styles.selfieStatusText, {
                      color: doc.selfie_url ? COLORS.secondary : COLORS.textLight,
                    }]}>
                      {doc.selfie_url ? 'Selfie uploaded' : 'Selfie needed'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Edit icon */}
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Warnings */}
      {!allRequiredUploaded && (
        <View style={styles.warningCard}>
          <Ionicons name="alert-circle" size={20} color={COLORS.error} />
          <Text style={styles.warningText}>
            Upload all required documents before submitting for verification.
          </Text>
        </View>
      )}

      {allRequiredUploaded && !selfieDocsComplete && (
        <View style={styles.warningCard}>
          <Ionicons name="person-circle-outline" size={20} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Adding selfie verification for your ID and license speeds up approval.
          </Text>
        </View>
      )}

      {/* Submit button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!canSubmit || loading) && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.white} />
              <Text style={styles.submitText}>
                {isAlreadySubmitted ? 'Already Submitted' : 'Submit for Verification'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusReady: {
    backgroundColor: COLORS.secondary + '10',
  },
  statusIncomplete: {
    backgroundColor: COLORS.error + '10',
  },
  statusSubmitted: {
    backgroundColor: COLORS.warning + '10',
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  summaryTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
  },
  docThumbContainer: {
    marginRight: SPACING.sm,
  },
  docThumb: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[100],
  },
  docThumbEmpty: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  docRowInfo: {
    flex: 1,
  },
  docName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  docStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  docStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  docStatusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  docMissing: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
  },
  selfieStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  selfieStatusText: {
    fontSize: 11,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.warning + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  warningText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: SPACING.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default ReviewAndSubmit;
