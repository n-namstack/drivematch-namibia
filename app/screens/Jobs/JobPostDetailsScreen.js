import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useJobStore from '../../store/useJobStore';
import {
  COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS,
  VEHICLE_TYPES, AVAILABILITY_OPTIONS,
} from '../../constants/theme';

const EXPERIENCE_LABELS = {
  any: 'Any Level',
  beginner: '0-2 years',
  intermediate: '2-5 years',
  experienced: '5+ years',
};

const JobPostDetailsScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { profile, driverProfile } = useAuth();
  const { selectedJob, fetchJobById, expressInterest, withdrawInterest, fetchMyInterests, myInterests } = useJobStore();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const isDriver = profile?.role === 'driver';
  const isOwner = selectedJob?.owner_id === profile?.id;
  const hasInterest = myInterests.includes(jobId);

  useEffect(() => {
    loadJob();
    if (driverProfile?.id) fetchMyInterests(driverProfile.id);
  }, [jobId]);

  const loadJob = async () => {
    setLoading(true);
    await fetchJobById(jobId);
    setLoading(false);
  };

  const handleInterestToggle = async () => {
    if (acting) return;
    setActing(true);

    if (hasInterest) {
      const { error } = await withdrawInterest(jobId, driverProfile.id);
      if (error) Alert.alert('Error', 'Could not withdraw interest.');
    } else {
      const { error } = await expressInterest(jobId, driverProfile.id);
      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          Alert.alert('Already Interested', 'You have already expressed interest in this job.');
        } else {
          Alert.alert('Error', 'Could not express interest.');
        }
      } else {
        Alert.alert('Interest Sent!', 'The owner will be notified.');
      }
    }

    await fetchMyInterests(driverProfile.id);
    setActing(false);
  };

  const handleContact = () => {
    if (!selectedJob?.owner?.phone) {
      Alert.alert('No Phone', 'This owner has not shared their phone number.');
      return;
    }
    Linking.openURL(`tel:${selectedJob.owner.phone}`);
  };

  const handleMessage = () => {
    // Navigate to chat with the owner
    navigation.navigate('Chat', {
      conversationWith: selectedJob.owner_id,
      recipientName: `${selectedJob.owner?.firstname || ''} ${selectedJob.owner?.lastname || ''}`.trim(),
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!selectedJob) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray[300]} />
        <Text style={styles.errorText}>Job post not found</Text>
      </View>
    );
  }

  const vehicleLabels = (selectedJob.vehicle_types || []).map(
    (vt) => VEHICLE_TYPES.find((v) => v.id === vt)?.label || vt
  );
  const availLabel = AVAILABILITY_OPTIONS.find((o) => o.id === selectedJob.availability_type)?.label || selectedJob.availability_type;
  const expLabel = EXPERIENCE_LABELS[selectedJob.experience_level] || 'Any Level';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status */}
        {selectedJob.status !== 'open' && (
          <View style={styles.closedBanner}>
            <Ionicons name="information-circle" size={18} color={COLORS.gray[600]} />
            <Text style={styles.closedText}>
              This job post is {selectedJob.status === 'filled' ? 'filled' : 'closed'}
            </Text>
          </View>
        )}

        {/* Title & Owner */}
        <Text style={styles.title}>{selectedJob.title}</Text>

        {selectedJob.owner && (
          <View style={styles.ownerRow}>
            {selectedJob.owner.profile_image ? (
              <Image source={{ uri: selectedJob.owner.profile_image }} style={styles.ownerAvatar} />
            ) : (
              <View style={[styles.ownerAvatar, styles.ownerAvatarPlaceholder]}>
                <Ionicons name="person" size={18} color={COLORS.gray[400]} />
              </View>
            )}
            <View>
              <Text style={styles.ownerName}>
                {selectedJob.owner.firstname} {selectedJob.owner.lastname}
              </Text>
              {selectedJob.owner.location && (
                <Text style={styles.ownerLocation}>{selectedJob.owner.location}</Text>
              )}
            </View>
          </View>
        )}

        {/* Description */}
        {selectedJob.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{selectedJob.description}</Text>
          </View>
        )}

        {/* Details grid */}
        <View style={styles.detailsGrid}>
          {selectedJob.location && (
            <View style={styles.detailItem}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{selectedJob.location}</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Ionicons name="time" size={20} color={COLORS.primary} />
            <Text style={styles.detailLabel}>Availability</Text>
            <Text style={styles.detailValue}>{availLabel}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="ribbon" size={20} color={COLORS.primary} />
            <Text style={styles.detailLabel}>Experience</Text>
            <Text style={styles.detailValue}>{expLabel}</Text>
          </View>
          {selectedJob.salary_range && (
            <View style={styles.detailItem}>
              <Ionicons name="wallet" size={20} color={COLORS.secondary} />
              <Text style={styles.detailLabel}>Salary</Text>
              <Text style={[styles.detailValue, { color: COLORS.secondary }]}>{selectedJob.salary_range}</Text>
            </View>
          )}
        </View>

        {/* Vehicle types */}
        {vehicleLabels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Experience Needed</Text>
            <View style={styles.chipRow}>
              {vehicleLabels.map((label, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interest count */}
        <View style={styles.interestInfo}>
          <Ionicons name="people" size={20} color={COLORS.primary} />
          <Text style={styles.interestInfoText}>
            {selectedJob.interest_count || 0} driver{(selectedJob.interest_count || 0) !== 1 ? 's' : ''} interested
          </Text>
        </View>

        {/* Interested drivers list (visible to owner) */}
        {isOwner && selectedJob.job_interests?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interested Drivers</Text>
            {selectedJob.job_interests.map((interest) => {
              const driver = interest.driver;
              const dp = driver?.profiles;
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={styles.interestedDriverRow}
                  onPress={() => navigation.navigate('DriverDetails', { driverId: driver?.id })}
                >
                  {dp?.profile_image ? (
                    <Image source={{ uri: dp.profile_image }} style={styles.intDriverAvatar} />
                  ) : (
                    <View style={[styles.intDriverAvatar, styles.intDriverAvatarPlaceholder]}>
                      <Ionicons name="person" size={18} color={COLORS.gray[400]} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.intDriverName}>{dp?.firstname} {dp?.lastname}</Text>
                    {interest.message && (
                      <Text style={styles.intDriverMessage} numberOfLines={1}>{interest.message}</Text>
                    )}
                  </View>
                  <View style={styles.viewProfileBtn}>
                    <Text style={styles.viewProfileText}>View</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar (for drivers only) */}
      {isDriver && selectedJob.status === 'open' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.interestBtn, hasInterest && styles.interestBtnActive]}
            onPress={handleInterestToggle}
            disabled={acting}
          >
            {acting ? (
              <ActivityIndicator color={hasInterest ? COLORS.secondary : COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name={hasInterest ? 'checkmark-circle' : 'hand-right'}
                  size={20}
                  color={hasInterest ? COLORS.secondary : COLORS.white}
                />
                <Text style={[styles.interestBtnText, hasInterest && styles.interestBtnTextActive]}>
                  {hasInterest ? 'Interested' : "I'm Interested"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  errorText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  closedText: { fontSize: FONTS.sizes.sm, color: COLORS.gray[600], fontWeight: '500' },
  title: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22 },
  ownerAvatarPlaceholder: { backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center' },
  ownerName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  ownerLocation: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  descriptionText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 24 },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  detailItem: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  detailLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: SPACING.sm },
  detailValue: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '500' },
  interestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  interestInfoText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  interestedDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  intDriverAvatar: { width: 40, height: 40, borderRadius: 20 },
  intDriverAvatarPlaceholder: { backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center' },
  intDriverName: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  intDriverMessage: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  viewProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewProfileText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '500' },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    ...SHADOWS.lg,
  },
  interestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  interestBtnActive: {
    backgroundColor: COLORS.secondary + '15',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
  },
  interestBtnText: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.white },
  interestBtnTextActive: { color: COLORS.secondary },
  contactBtn: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
});

export default JobPostDetailsScreen;
