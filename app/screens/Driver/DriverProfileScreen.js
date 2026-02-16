import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VERIFICATION_STATUS } from '../../constants/theme';

const DriverProfileScreen = ({ navigation }) => {
  const { profile, driverProfile } = useAuth();

  const statusInfo = VERIFICATION_STATUS[driverProfile?.verification_status] || VERIFICATION_STATUS.pending;

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < fullStars ? 'star' : 'star-outline'}
          size={16}
          color={COLORS.accent}
        />
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile?.profile_image ? (
              <Image source={{ uri: profile.profile_image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={48} color={COLORS.gray[400]} />
              </View>
            )}
            {driverProfile?.verification_status === 'verified' && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
              </View>
            )}
          </View>
          <Text style={styles.name}>
            {profile?.firstname} {profile?.lastname}
          </Text>
          <Text style={styles.location}>
            <Ionicons name="location" size={14} color={COLORS.textSecondary} />
            {' '}{profile?.location || 'Namibia'}
          </Text>
          <View style={styles.ratingRow}>
            {renderStars(driverProfile?.rating)}
            <Text style={styles.ratingText}>
              {driverProfile?.rating?.toFixed(1) || '0.0'} ({driverProfile?.total_reviews || 0} reviews)
            </Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
          <Ionicons name="shield-outline" size={20} color={statusInfo.color} />
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>Verification Status</Text>
            <Text style={[styles.statusValue, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditDriverProfile')}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('DocumentUpload')}
          >
            <Ionicons name="document-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('WorkHistory')}
          >
            <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Work History</Text>
          </TouchableOpacity>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.bioText}>
              {driverProfile?.bio || 'No bio added yet. Tell car owners about yourself!'}
            </Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <View style={styles.detailItem}>
              <Ionicons name="time" size={20} color={COLORS.primary} />
              <View>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>
                  {driverProfile?.years_of_experience || 0} years
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
              <View>
                <Text style={styles.detailLabel}>Availability</Text>
                <Text style={styles.detailValue}>
                  {driverProfile?.availability === 'full_time'
                    ? 'Full Time'
                    : driverProfile?.availability === 'part_time'
                    ? 'Part Time'
                    : 'Weekends Only'}
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="card" size={20} color={COLORS.primary} />
              <View>
                <Text style={styles.detailLabel}>PDP Status</Text>
                <Text style={styles.detailValue}>
                  {driverProfile?.has_pdp ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Vehicle Types */}
        {driverProfile?.vehicle_types?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Types</Text>
            <View style={styles.tagsContainer}>
              {driverProfile.vehicle_types.map((type, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderAvatar: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  name: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
  },
  location: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: 4,
  },
  ratingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  actionButton: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  bioText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  detailLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});

export default DriverProfileScreen;
