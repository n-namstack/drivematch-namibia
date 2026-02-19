import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VERIFICATION_STATUS } from '../../constants/theme';

const DriverProfileScreen = ({ navigation }) => {
  const { profile, driverProfile, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [workCount, setWorkCount] = useState(0);

  const statusInfo = VERIFICATION_STATUS[driverProfile?.verification_status] || VERIFICATION_STATUS.pending;

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      if (!driverProfile?.id) return;
      const [docs, work] = await Promise.all([
        supabase.from('driver_documents').select('id', { count: 'exact', head: true }).eq('driver_id', driverProfile.id),
        supabase.from('work_history').select('id', { count: 'exact', head: true }).eq('driver_id', driverProfile.id),
      ]);
      setDocumentCount(docs.count || 0);
      setWorkCount(work.count || 0);
    } catch (err) {
      // Non-critical - counts will show 0
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await fetchCounts();
    setRefreshing(false);
  };

  const renderStars = (rating) => {
    const stars = [];
    const r = rating || 0;
    const fullStars = Math.floor(r);
    const hasHalf = r % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={14} color={COLORS.accent} />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Ionicons key={i} name="star-half" size={14} color={COLORS.accent} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={14} color={COLORS.gray[300]} />);
      }
    }
    return stars;
  };

  // Profile completion percentage
  const completionItems = [
    !!profile?.profile_image,
    !!driverProfile?.bio,
    (driverProfile?.years_of_experience || 0) > 0,
    (driverProfile?.vehicle_types?.length || 0) > 0,
    documentCount > 0,
    workCount > 0,
  ];
  const completionPercent = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.avatarWrapper}>
              {profile?.profile_image ? (
                <Image source={{ uri: profile.profile_image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Ionicons name="person" size={36} color={COLORS.white} />
                </View>
              )}
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            </View>

            <Text style={styles.heroName}>
              {profile?.firstname} {profile?.lastname}
            </Text>

            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroMetaText}>{profile?.location || 'Namibia'}</Text>
              </View>
              <View style={styles.heroMetaItem}>
                <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]} />
                <Text style={styles.heroMetaText}>{statusInfo.label}</Text>
              </View>
            </View>

            <View style={styles.ratingRow}>
              {renderStars(driverProfile?.rating)}
              <Text style={styles.ratingValue}>
                {(driverProfile?.rating || 0).toFixed(1)}
              </Text>
              <Text style={styles.reviewCount}>
                ({driverProfile?.total_reviews || 0})
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Card (overlapping hero) */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statBlock}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.primary + '12' }]}>
                  <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.statValue}>{driverProfile?.years_of_experience || 0}</Text>
                <Text style={styles.statLabel}>Years Exp</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.accent + '12' }]}>
                  <Ionicons name="chatbubbles-outline" size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.statValue}>{driverProfile?.total_reviews || 0}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.secondary + '12' }]}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.secondary} />
                </View>
                <Text style={styles.statValue}>{documentCount}</Text>
                <Text style={styles.statLabel}>Documents</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.info + '12' }]}>
                  <Ionicons name="car-outline" size={18} color={COLORS.info} />
                </View>
                <Text style={styles.statValue}>{workCount}</Text>
                <Text style={styles.statLabel}>Jobs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Profile Completion */}
        {completionPercent < 100 && (
          <View style={styles.completionCard}>
            <View style={styles.completionTop}>
              <View style={styles.completionInfo}>
                <Ionicons name="rocket-outline" size={18} color={COLORS.primary} />
                <Text style={styles.completionTitle}>Complete Your Profile</Text>
              </View>
              <Text style={[styles.completionPercent, { color: completionPercent >= 80 ? COLORS.secondary : COLORS.accent }]}>
                {completionPercent}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {
                width: `${completionPercent}%`,
                backgroundColor: completionPercent >= 80 ? COLORS.secondary : COLORS.primary,
              }]} />
            </View>
            <Text style={styles.completionHint}>
              A complete profile attracts more car owners
            </Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('EditDriverProfile')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.primary + '12' }]}>
                <Ionicons name="person-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>Edit Profile</Text>
              <Text style={styles.actionHint}>Bio, availability</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('DocumentUpload')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.secondary + '12' }]}>
                <Ionicons name="document-text-outline" size={22} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Documents</Text>
              <Text style={styles.actionHint}>{documentCount} uploaded</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('WorkHistory')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.accent + '12' }]}>
                <Ionicons name="briefcase-outline" size={22} color={COLORS.accent} />
              </View>
              <Text style={styles.actionLabel}>Work History</Text>
              <Text style={styles.actionHint}>{workCount} job{workCount !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.bioText}>
              {driverProfile?.bio || 'No bio added yet. Tap "Edit Profile" to tell car owners about yourself.'}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: COLORS.primary + '10' }]}>
                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.detailLabel}>Availability</Text>
              <Text style={styles.detailValue}>
                {driverProfile?.availability === 'full_time' ? 'Full Time'
                  : driverProfile?.availability === 'part_time' ? 'Part Time' : 'Weekends Only'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: driverProfile?.has_pdp ? COLORS.secondary + '10' : COLORS.gray[100] }]}>
                <Ionicons
                  name={driverProfile?.has_pdp ? 'shield-checkmark-outline' : 'shield-outline'}
                  size={16}
                  color={driverProfile?.has_pdp ? COLORS.secondary : COLORS.gray[400]}
                />
              </View>
              <Text style={styles.detailLabel}>PDP</Text>
              <Text style={[styles.detailValue, { color: driverProfile?.has_pdp ? COLORS.secondary : COLORS.textSecondary }]}>
                {driverProfile?.has_pdp ? 'Yes' : 'No'}
              </Text>
            </View>
            {driverProfile?.languages?.length > 0 && (
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.detailIcon, { backgroundColor: COLORS.info + '10' }]}>
                  <Ionicons name="globe-outline" size={16} color={COLORS.info} />
                </View>
                <Text style={styles.detailLabel}>Languages</Text>
                <Text style={styles.detailValue}>{driverProfile.languages.join(', ')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vehicle Types */}
        {driverProfile?.vehicle_types?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Types</Text>
            <View style={styles.chipsRow}>
              {driverProfile.vehicle_types.map((type, index) => (
                <View key={index} style={styles.chip}>
                  <Ionicons name="car-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.chipText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Hero
  heroSection: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.xl + SPACING.sm,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  placeholderAvatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  heroName: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },

  // Stats
  statsContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: -SPACING.md,
    marginBottom: SPACING.md,
  },
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBlock: {
    alignItems: 'center',
    gap: 4,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Completion
  completionCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  completionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  completionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  completionPercent: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.gray[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  completionHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  // Action Grid
  actionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  actionHint: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  bioText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // Details
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
    gap: SPACING.sm,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  chipText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});

export default DriverProfileScreen;
