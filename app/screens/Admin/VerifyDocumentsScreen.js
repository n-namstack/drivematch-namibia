import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VERIFICATION_STATUS } from '../../constants/theme';

const getExpiryColor = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return COLORS.error;
  if (daysUntil <= 7) return COLORS.error;
  if (daysUntil <= 30) return COLORS.warning;
  return COLORS.secondary;
};

const getConfidenceColor = (confidence) => {
  switch (confidence) {
    case 'high': return COLORS.secondary;
    case 'medium': return COLORS.warning;
    case 'low': return COLORS.error;
    default: return COLORS.textLight;
  }
};

const VerifyDocumentsScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { docId, driverId }
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPendingDrivers();
  }, []);

  const fetchPendingDrivers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          id,
          user_id,
          verification_status,
          rating,
          years_of_experience,
          profiles:user_id (firstname, lastname, profile_image, location, email),
          driver_documents (id, document_type, document_url, selfie_url, verification_status, expiry_date, ai_verification_result, rejection_reason, created_at)
        `)
        .in('verification_status', ['submitted', 'pending'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDrivers(data || []);
    } catch (err) {
      Alert.alert('Error', 'Could not load pending drivers.');
    } finally {
      setLoading(false);
    }
  };

  // Per-document verification
  const handleVerifyDocument = async (driverId, docId) => {
    setActionLoading(docId);
    try {
      await supabase
        .from('driver_documents')
        .update({ verification_status: 'verified', verified_by: profile?.id, verified_at: new Date().toISOString() })
        .eq('id', docId);

      // Update local state
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id !== driverId) return d;
          return {
            ...d,
            driver_documents: d.driver_documents.map((doc) =>
              doc.id === docId ? { ...doc, verification_status: 'verified' } : doc
            ),
          };
        })
      );

      // Check if ALL documents for this driver are now verified
      const driver = drivers.find((d) => d.id === driverId);
      const updatedDocs = driver?.driver_documents.map((doc) =>
        doc.id === docId ? { ...doc, verification_status: 'verified' } : doc
      );
      const allVerified = updatedDocs?.every((doc) => doc.verification_status === 'verified');

      if (allVerified && updatedDocs?.length > 0) {
        await handleVerifyDriver(driverId);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not verify document.');
    } finally {
      setActionLoading(null);
    }
  };

  // Per-document rejection with reason
  const handleRejectDocument = async () => {
    if (!rejectModal) return;
    const { docId, driverId } = rejectModal;

    setActionLoading(docId);
    setRejectModal(null);
    try {
      await supabase
        .from('driver_documents')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectReason.trim() || 'Document does not meet requirements.',
          verified_by: profile?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', docId);

      // Update local state
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id !== driverId) return d;
          return {
            ...d,
            driver_documents: d.driver_documents.map((doc) =>
              doc.id === docId
                ? { ...doc, verification_status: 'rejected', rejection_reason: rejectReason.trim() }
                : doc
            ),
          };
        })
      );

      setRejectReason('');

      // Log admin action
      await supabase.from('admin_actions').insert({
        admin_id: profile?.id,
        action_type: 'reject_document',
        target_type: 'document',
        target_id: docId,
        reason: rejectReason.trim(),
      }).catch(() => {});
    } catch (err) {
      Alert.alert('Error', 'Could not reject document.');
    } finally {
      setActionLoading(null);
    }
  };

  // Verify entire driver (all docs verified)
  const handleVerifyDriver = async (driverId) => {
    try {
      await supabase
        .from('driver_profiles')
        .update({ verification_status: 'verified' })
        .eq('id', driverId);

      const driver = drivers.find((d) => d.id === driverId);
      if (driver?.user_id) {
        await supabase.from('notifications').insert({
          user_id: driver.user_id,
          type: 'verification',
          title: 'Profile Verified!',
          message: 'Congratulations! Your profile has been verified. You now have a verified badge visible to car owners.',
        });
      }

      setDrivers((prev) => prev.filter((d) => d.id !== driverId));

      await supabase.from('admin_actions').insert({
        admin_id: profile?.id,
        action_type: 'verify_document',
        target_type: 'driver',
        target_id: driverId,
      }).catch(() => {});
    } catch (err) {
      Alert.alert('Error', 'Could not verify driver.');
    }
  };

  // Reject entire driver
  const handleRejectEntireDriver = async (driverId) => {
    Alert.alert(
      'Reject All Documents',
      'This will reject all documents and notify the driver to resubmit.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject All',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(driverId);
            try {
              await supabase
                .from('driver_profiles')
                .update({ verification_status: 'rejected' })
                .eq('id', driverId);

              await supabase
                .from('driver_documents')
                .update({ verification_status: 'rejected' })
                .eq('driver_id', driverId);

              const driver = drivers.find((d) => d.id === driverId);
              if (driver?.user_id) {
                await supabase.from('notifications').insert({
                  user_id: driver.user_id,
                  type: 'verification',
                  title: 'Verification Update',
                  message: 'Your document verification was not approved. Please review your documents and resubmit.',
                });
              }

              setDrivers((prev) => prev.filter((d) => d.id !== driverId));

              await supabase.from('admin_actions').insert({
                admin_id: profile?.id,
                action_type: 'reject_document',
                target_type: 'driver',
                target_id: driverId,
              }).catch(() => {});
            } catch (err) {
              Alert.alert('Error', 'Could not reject verification.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // Verify all remaining docs at once
  const handleVerifyAllDocs = (driverId) => {
    Alert.alert(
      'Verify All Documents',
      'This will verify all documents and give the driver a verified badge.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify All',
          onPress: async () => {
            setActionLoading(driverId);
            try {
              await supabase
                .from('driver_documents')
                .update({
                  verification_status: 'verified',
                  verified_by: profile?.id,
                  verified_at: new Date().toISOString(),
                })
                .eq('driver_id', driverId);

              await handleVerifyDriver(driverId);
            } catch (err) {
              Alert.alert('Error', 'Could not verify documents.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const renderDriver = useCallback(({ item }) => {
    const name = `${item.profiles?.firstname || ''} ${item.profiles?.lastname || ''}`.trim() || 'Unknown Driver';
    const docs = item.driver_documents || [];
    const isProcessing = actionLoading === item.id;

    return (
      <View style={styles.driverCard}>
        {/* Driver Info */}
        <View style={styles.driverHeader}>
          <View style={styles.driverInfo}>
            {item.profiles?.profile_image ? (
              <Image source={{ uri: item.profiles.profile_image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {(item.profiles?.firstname || 'D')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.driverMeta}>
              <Text style={styles.driverName}>{name}</Text>
              <Text style={styles.driverDetail}>
                {item.profiles?.location || 'No location'} | {item.years_of_experience || 0} yrs exp
              </Text>
              <Text style={styles.driverEmail}>{item.profiles?.email}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('DriverDetails', { driverId: item.id })}
          >
            <Ionicons name="open-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Documents List - Per Document Verification */}
        <View style={styles.docsSection}>
          <Text style={styles.docsTitle}>Documents ({docs.length})</Text>
          {docs.length === 0 ? (
            <Text style={styles.noDocsText}>No documents uploaded</Text>
          ) : (
            docs.map((doc) => {
              const aiResult = doc.ai_verification_result;
              const docAI = aiResult?.documentVerification || aiResult;
              const selfieAI = aiResult?.selfieVerification;
              const expiryColor = getExpiryColor(doc.expiry_date);
              const isDocProcessing = actionLoading === doc.id;

              return (
                <View key={doc.id} style={styles.docCard}>
                  {/* Doc header with thumbnail */}
                  <View style={styles.docHeaderRow}>
                    <TouchableOpacity
                      style={styles.docThumbContainer}
                      onPress={() => setPreviewImage(doc.document_url)}
                    >
                      <Image source={{ uri: doc.document_url }} style={styles.docThumb} />
                      <View style={styles.docThumbOverlay}>
                        <Ionicons name="expand-outline" size={14} color={COLORS.white} />
                      </View>
                    </TouchableOpacity>

                    {doc.selfie_url && (
                      <TouchableOpacity
                        style={styles.selfieThumbContainer}
                        onPress={() => setPreviewImage(doc.selfie_url)}
                      >
                        <Image source={{ uri: doc.selfie_url }} style={styles.selfieThumb} />
                        <Ionicons name="person" size={10} color={COLORS.white} style={styles.selfieIcon} />
                      </TouchableOpacity>
                    )}

                    <View style={styles.docInfo}>
                      <Text style={styles.docType}>
                        {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                      {doc.expiry_date && (
                        <Text style={[styles.docExpiry, { color: expiryColor }]}>
                          Expires: {doc.expiry_date}
                        </Text>
                      )}
                      <View style={styles.docStatusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: VERIFICATION_STATUS[doc.verification_status]?.color || COLORS.gray[400] }]} />
                        <Text style={[styles.docStatusText, { color: VERIFICATION_STATUS[doc.verification_status]?.color || COLORS.gray[400] }]}>
                          {VERIFICATION_STATUS[doc.verification_status]?.label || doc.verification_status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* AI Verification Results */}
                  {docAI && (
                    <View style={styles.aiSection}>
                      <View style={styles.aiHeader}>
                        <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                        <Text style={styles.aiLabel}>AI Analysis</Text>
                      </View>
                      <View style={styles.aiResults}>
                        <AIBadge label="Match" passed={docAI.isMatch} />
                        <AIBadge label="Readable" passed={docAI.isReadable} />
                        <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(docAI.confidence) + '15' }]}>
                          <Text style={[styles.confidenceText, { color: getConfidenceColor(docAI.confidence) }]}>
                            {docAI.confidence}
                          </Text>
                        </View>
                      </View>
                      {docAI.detectedType && (
                        <Text style={styles.aiDetail}>Detected: {docAI.detectedType}</Text>
                      )}
                      {docAI.issues?.length > 0 && (
                        <View style={styles.aiIssues}>
                          {docAI.issues.map((issue, idx) => (
                            <Text key={idx} style={styles.aiIssueText}>- {issue}</Text>
                          ))}
                        </View>
                      )}
                      {selfieAI && (
                        <View style={styles.selfieAI}>
                          <Text style={styles.aiSubLabel}>Selfie Check:</Text>
                          <View style={styles.aiResults}>
                            <AIBadge label="Face" passed={selfieAI.faceVisible} />
                            <AIBadge label="Doc in hand" passed={selfieAI.documentInHand} />
                            <AIBadge label="Matches" passed={selfieAI.matchesUploadedDoc} />
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Rejection reason */}
                  {doc.rejection_reason && doc.verification_status === 'rejected' && (
                    <View style={styles.rejectionBox}>
                      <Text style={styles.rejectionLabel}>Rejection reason:</Text>
                      <Text style={styles.rejectionText}>{doc.rejection_reason}</Text>
                    </View>
                  )}

                  {/* Per-document actions */}
                  {doc.verification_status !== 'verified' && (
                    <View style={styles.docActions}>
                      <TouchableOpacity
                        style={styles.docRejectBtn}
                        onPress={() => {
                          setRejectReason('');
                          setRejectModal({ docId: doc.id, driverId: item.id });
                        }}
                        disabled={isDocProcessing}
                      >
                        <Ionicons name="close-outline" size={16} color={COLORS.error} />
                        <Text style={styles.docRejectText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.docVerifyBtn}
                        onPress={() => handleVerifyDocument(item.id, doc.id)}
                        disabled={isDocProcessing}
                      >
                        {isDocProcessing ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color={COLORS.white} />
                            <Text style={styles.docVerifyText}>Verify</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Bulk Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleRejectEntireDriver(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                <Text style={styles.rejectBtnText}>Reject All</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => handleVerifyAllDocs(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.white} />
                <Text style={styles.verifyBtnText}>Verify All</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [actionLoading, drivers]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="shield-checkmark" size={48} color={COLORS.secondary} />
        </View>
        <Text style={styles.emptyTitle}>All Caught Up!</Text>
        <Text style={styles.emptyText}>
          No pending document verifications at this time. Check back later.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Documents</Text>
        {drivers.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{drivers.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={drivers}
        keyExtractor={(item) => item.id}
        renderItem={renderDriver}
        contentContainerStyle={[styles.list, drivers.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPendingDrivers} />}
        ListEmptyComponent={renderEmpty}
      />

      {/* Image Preview Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close-circle" size={32} color={COLORS.white} />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal visible={!!rejectModal} transparent animationType="slide">
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>Rejection Reason</Text>
            <Text style={styles.rejectModalSubtitle}>
              Explain why this document was rejected so the driver can fix it.
            </Text>
            <TextInput
              style={styles.rejectModalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g., Document is expired, image is blurry, wrong document type..."
              placeholderTextColor={COLORS.textLight}
              multiline
              maxLength={500}
            />
            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={styles.rejectModalCancel}
                onPress={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
              >
                <Text style={styles.rejectModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectModalSubmit}
                onPress={handleRejectDocument}
              >
                <Text style={styles.rejectModalSubmitText}>Reject Document</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const AIBadge = ({ label, passed }) => (
  <View style={[styles.aiBadge, { backgroundColor: passed ? COLORS.secondary + '15' : COLORS.error + '15' }]}>
    <Ionicons
      name={passed ? 'checkmark' : 'close'}
      size={12}
      color={passed ? COLORS.secondary : COLORS.error}
    />
    <Text style={[styles.aiBadgeText, { color: passed ? COLORS.secondary : COLORS.error }]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  title: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  countBadge: {
    backgroundColor: COLORS.warning, borderRadius: 12, minWidth: 24, height: 24,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  countText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  list: { paddingHorizontal: SPACING.lg },

  driverCard: {
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  driverHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.primary },
  driverMeta: { flex: 1 },
  driverName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  driverDetail: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  driverEmail: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 1 },

  docsSection: {
    borderTopWidth: 1, borderTopColor: COLORS.gray[100], paddingTop: SPACING.sm, marginBottom: SPACING.md,
  },
  docsTitle: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  noDocsText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontStyle: 'italic' },

  docCard: {
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  docHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  docThumbContainer: {
    position: 'relative',
  },
  docThumb: {
    width: 48, height: 48, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.gray[200],
  },
  docThumbOverlay: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopLeftRadius: 4, borderBottomRightRadius: BORDER_RADIUS.sm, padding: 2,
  },
  selfieThumbContainer: {
    position: 'relative',
  },
  selfieThumb: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray[200],
  },
  selfieIcon: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.secondary,
    borderRadius: 6, padding: 1,
  },
  docInfo: { flex: 1 },
  docType: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: '500' },
  docExpiry: { fontSize: 11, marginTop: 1 },
  docStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  docStatusText: { fontSize: 11, fontWeight: '500' },

  // AI Section
  aiSection: {
    marginTop: SPACING.sm, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.gray[200],
  },
  aiHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4,
  },
  aiLabel: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  aiResults: {
    flexDirection: 'row', gap: 6, flexWrap: 'wrap',
  },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '600' },
  confidenceBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm,
  },
  confidenceText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  aiDetail: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  aiIssues: { marginTop: 4 },
  aiIssueText: { fontSize: 10, color: COLORS.warning },
  selfieAI: { marginTop: 6 },
  aiSubLabel: { fontSize: 11, fontWeight: '500', color: COLORS.text, marginBottom: 4 },

  // Rejection
  rejectionBox: {
    marginTop: SPACING.sm, backgroundColor: COLORS.error + '08',
    borderRadius: BORDER_RADIUS.sm, padding: SPACING.xs,
  },
  rejectionLabel: { fontSize: 10, fontWeight: '600', color: COLORS.error },
  rejectionText: { fontSize: 11, color: COLORS.error, marginTop: 2 },

  // Per-doc actions
  docActions: {
    flexDirection: 'row', gap: 6, marginTop: SPACING.sm,
  },
  docRejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 6, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.error + '40',
  },
  docRejectText: { fontSize: 12, fontWeight: '500', color: COLORS.error },
  docVerifyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 6, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.secondary,
  },
  docVerifyText: { fontSize: 12, fontWeight: '500', color: COLORS.white },

  // Bulk actions
  actionsRow: { flexDirection: 'row', gap: SPACING.sm },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.sm + 2, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.error + '10', borderWidth: 1, borderColor: COLORS.error + '30',
  },
  rejectBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.error },
  verifyBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.sm + 2, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.secondary,
  },
  verifyBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.white },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyIconBg: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.secondary + '10',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: 'bold', color: COLORS.text },
  emptyText: {
    fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: SPACING.sm, lineHeight: 22,
  },

  // Image preview modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalClose: {
    position: 'absolute', top: 60, right: 20, zIndex: 10,
  },
  modalImage: {
    width: '90%', height: '70%',
  },

  // Reject reason modal
  rejectModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  rejectModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  rejectModalTitle: {
    fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text,
  },
  rejectModalSubtitle: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.md,
  },
  rejectModalInput: {
    backgroundColor: COLORS.gray[50], borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.text,
    minHeight: 100, textAlignVertical: 'top',
  },
  rejectModalActions: {
    flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md,
  },
  rejectModalCancel: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.gray[200],
  },
  rejectModalCancelText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary },
  rejectModalSubmit: {
    flex: 1.5, alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.error,
  },
  rejectModalSubmitText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
});

export default VerifyDocumentsScreen;
