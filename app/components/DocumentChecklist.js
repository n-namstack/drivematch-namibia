import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, DOCUMENT_TYPES, VERIFICATION_STATUS } from '../constants/theme';

const getExpiryWarning = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return { text: 'Expired', color: COLORS.error };
  if (daysUntil <= 7) return { text: `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`, color: COLORS.error };
  if (daysUntil <= 30) return { text: `Expires in ${daysUntil} days`, color: COLORS.warning };
  return { text: `Expires ${expiry.toLocaleDateString()}`, color: COLORS.textSecondary };
};

const DocumentChecklist = ({ documents, onSelectDocument, verificationStatus }) => {
  const getDocByType = (docTypeId) => {
    return documents.find((d) => d.document_type === docTypeId) || null;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Required Documents</Text>
      </View>

      {DOCUMENT_TYPES.filter((d) => d.required).map((docType) => {
        const doc = getDocByType(docType.id);
        return (
          <DocumentCard
            key={docType.id}
            docType={docType}
            doc={doc}
            onPress={() => onSelectDocument(docType.id)}
          />
        );
      })}

      <View style={[styles.sectionHeader, { marginTop: SPACING.md }]}>
        <Text style={styles.sectionTitle}>Optional Documents</Text>
        <Text style={styles.sectionSubtitle}>Boost your profile credibility</Text>
      </View>

      {DOCUMENT_TYPES.filter((d) => !d.required).map((docType) => {
        const doc = getDocByType(docType.id);
        return (
          <DocumentCard
            key={docType.id}
            docType={docType}
            doc={doc}
            onPress={() => onSelectDocument(docType.id)}
          />
        );
      })}

      {/* Spacer for bottom button */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const DocumentCard = ({ docType, doc, onPress }) => {
  const status = doc?.verification_status;
  const statusInfo = status ? VERIFICATION_STATUS[status] : null;
  const expiryWarning = doc?.expiry_date ? getExpiryWarning(doc.expiry_date) : null;
  const hasAIResult = !!doc?.ai_verification_result;
  const aiResult = doc?.ai_verification_result;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail or placeholder */}
      <View style={styles.thumbnailContainer}>
        {doc?.document_url ? (
          <Image source={{ uri: doc.document_url }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name={docType.icon} size={28} color={COLORS.gray[400]} />
          </View>
        )}
        {doc?.selfie_url && (
          <View style={styles.selfieBadge}>
            <Ionicons name="person-circle" size={16} color={COLORS.secondary} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{docType.label}</Text>
          {docType.required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          )}
        </View>

        {/* Status row */}
        {statusInfo ? (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
            {hasAIResult && aiResult?.confidence && (
              <View style={[styles.aiBadge, {
                backgroundColor: aiResult.confidence === 'high' ? COLORS.secondary + '20' :
                  aiResult.confidence === 'medium' ? COLORS.warning + '20' : COLORS.error + '20',
              }]}>
                <Text style={[styles.aiBadgeText, {
                  color: aiResult.confidence === 'high' ? COLORS.secondary :
                    aiResult.confidence === 'medium' ? COLORS.warning : COLORS.error,
                }]}>
                  AI: {aiResult.confidence}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.notUploaded}>Not uploaded</Text>
        )}

        {/* Expiry warning */}
        {expiryWarning && (
          <View style={styles.expiryRow}>
            <Ionicons name="time-outline" size={12} color={expiryWarning.color} />
            <Text style={[styles.expiryText, { color: expiryWarning.color }]}>
              {expiryWarning.text}
            </Text>
          </View>
        )}

        {/* Rejection reason */}
        {status === 'rejected' && doc?.rejection_reason && (
          <Text style={styles.rejectionText} numberOfLines={2}>
            {doc.rejection_reason}
          </Text>
        )}
      </View>

      {/* Action icon */}
      <Ionicons
        name={doc ? 'create-outline' : 'cloud-upload-outline'}
        size={22}
        color={COLORS.primary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  sectionHeader: {
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfieBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 1,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    flexShrink: 1,
  },
  requiredBadge: {
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.error,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sm,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  notUploaded: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  expiryText: {
    fontSize: FONTS.sizes.xs,
  },
  rejectionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default DocumentChecklist;
