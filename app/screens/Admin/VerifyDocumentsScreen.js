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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VERIFICATION_STATUS } from '../../constants/theme';

const VerifyDocumentsScreen = ({ navigation }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

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
          driver_documents (id, document_type, document_url, verification_status, expiry_date, created_at)
        `)
        .in('verification_status', ['submitted', 'pending'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDrivers(data || []);
    } catch (err) {
      // Fetch failed
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDriver = async (driverId) => {
    Alert.alert(
      'Verify Driver',
      'Are you sure you want to mark this driver as verified? This will make their profile show a verified badge.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          style: 'default',
          onPress: async () => {
            setActionLoading(driverId);
            try {
              // Update driver profile status
              await supabase
                .from('driver_profiles')
                .update({ verification_status: 'verified' })
                .eq('id', driverId);

              // Update all documents to verified
              await supabase
                .from('driver_documents')
                .update({ verification_status: 'verified' })
                .eq('driver_id', driverId);

              // Get driver user_id for notification
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
            } catch (err) {
              Alert.alert('Error', 'Could not verify driver. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectDriver = async (driverId) => {
    Alert.alert(
      'Reject Verification',
      'Are you sure you want to reject this driver\'s documents? They will be notified and asked to resubmit.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
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
            } catch (err) {
              Alert.alert('Error', 'Could not reject verification. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleViewDocument = async (url) => {
    if (url) {
      Linking.openURL(url);
    }
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

        {/* Documents List */}
        <View style={styles.docsSection}>
          <Text style={styles.docsTitle}>Documents ({docs.length})</Text>
          {docs.length === 0 ? (
            <Text style={styles.noDocsText}>No documents uploaded</Text>
          ) : (
            docs.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.docRow}
                onPress={() => handleViewDocument(doc.document_url)}
              >
                <View style={styles.docIconBg}>
                  <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docType}>
                    {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                  {doc.expiry_date && (
                    <Text style={styles.docExpiry}>Expires: {doc.expiry_date}</Text>
                  )}
                </View>
                <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleRejectDriver(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                <Text style={styles.rejectText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => handleVerifyDriver(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.white} />
                <Text style={styles.verifyText}>Verify Driver</Text>
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
    </SafeAreaView>
  );
};

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
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.gray[50],
  },
  docIconBg: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.primary + '10', justifyContent: 'center', alignItems: 'center',
  },
  docInfo: { flex: 1 },
  docType: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: '500' },
  docExpiry: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  actionsRow: { flexDirection: 'row', gap: SPACING.sm },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.sm + 2, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.error + '10', borderWidth: 1, borderColor: COLORS.error + '30',
  },
  rejectText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.error },
  verifyBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.sm + 2, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.secondary,
  },
  verifyText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.white },

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
});

export default VerifyDocumentsScreen;
