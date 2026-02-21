import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useJobStore from '../../store/useJobStore';
import supabase from '../../lib/supabase';
import JobCard from '../../components/JobCard';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VERIFICATION_STATUS } from '../../constants/theme';

const DriverHomeScreen = ({ navigation }) => {
  const { profile, driverProfile, refreshProfile, updateDriverProfile } = useAuth();
  const { jobs, fetchJobs, myInterests, fetchMyInterests } = useJobStore();
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Re-fetch unread count and recent jobs every time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      fetchJobs(true);
      if (driverProfile?.id) fetchMyInterests(driverProfile.id);
    }, [profile?.id, driverProfile?.id])
  );

  // Realtime: update notification badge instantly when new notifications arrive
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('driver-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => { fetchUnreadCount(); }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => { fetchUnreadCount(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const fetchUnreadCount = async () => {
    if (!profile?.id) return;
    try {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    } catch (err) {
      // Notification count fetch failed - non-critical
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshProfile(),
      fetchUnreadCount(),
      fetchJobs(true),
      driverProfile?.id ? fetchMyInterests(driverProfile.id) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const toggleAvailability = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const newValue = !driverProfile?.is_available_now;
      const { error } = await updateDriverProfile({ is_available_now: newValue });
      if (error) {
        Alert.alert('Error', 'Could not update availability. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not update availability. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  const statusInfo = VERIFICATION_STATUS[driverProfile?.verification_status] || VERIFICATION_STATUS.pending;
  const isAvailable = driverProfile?.is_available_now;

  const stats = [
    {
      label: 'Rating',
      value: driverProfile?.rating?.toFixed(1) || '0.0',
      icon: 'star',
      color: COLORS.accent,
    },
    {
      label: 'Reviews',
      value: driverProfile?.total_reviews?.toString() || '0',
      icon: 'chatbubbles',
      color: COLORS.secondary,
    },
    {
      label: 'Profile Views',
      value: driverProfile?.profile_views?.toString() || '0',
      icon: 'eye',
      color: COLORS.info,
    },
  ];

  const quickActions = [
    {
      id: 'profile',
      icon: 'person-outline',
      label: 'Edit Profile',
      color: COLORS.primary,
      onPress: () => navigation.navigate('EditDriverProfile'),
    },
    {
      id: 'documents',
      icon: 'document-text-outline',
      label: 'Documents',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('DocumentUpload'),
    },
    {
      id: 'work',
      icon: 'briefcase-outline',
      label: 'Work History',
      color: COLORS.accent,
      onPress: () => navigation.navigate('WorkHistory'),
    },
    {
      id: 'messages',
      icon: 'chatbubbles-outline',
      label: 'Messages',
      color: COLORS.info,
      onPress: () => navigation.navigate('Messages'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Welcome, {profile?.firstname || 'Driver'}!
            </Text>
            <Text style={styles.subtitle}>Manage your driver profile</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Availability Toggle */}
        <TouchableOpacity
          style={[styles.availabilityCard, isAvailable && styles.availabilityCardActive]}
          onPress={toggleAvailability}
          activeOpacity={0.8}
        >
          <View style={[styles.availabilityIcon, isAvailable && styles.availabilityIconActive]}>
            <Ionicons
              name={isAvailable ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={isAvailable ? COLORS.white : COLORS.gray[400]}
            />
          </View>
          <View style={styles.availabilityInfo}>
            <Text style={[styles.availabilityTitle, isAvailable && styles.availabilityTitleActive]}>
              {isAvailable ? 'Available Now' : 'Not Available'}
            </Text>
            <Text style={[styles.availabilityDesc, isAvailable && styles.availabilityDescActive]}>
              {isAvailable
                ? 'Car owners can see you as available for work'
                : 'Toggle on to let owners know you\'re ready'}
            </Text>
          </View>
          <View style={[styles.toggleTrack, isAvailable && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, isAvailable && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        {/* Verification Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={
                driverProfile?.verification_status === 'verified'
                  ? 'shield-checkmark'
                  : 'shield-outline'
              }
              size={24}
              color={statusInfo.color}
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Verification Status</Text>
              <Text style={[styles.statusValue, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          {driverProfile?.verification_status !== 'verified' && (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => navigation.navigate('DocumentUpload')}
            >
              <Text style={styles.verifyButtonText}>
                {driverProfile?.verification_status === 'pending'
                  ? 'Upload Documents'
                  : 'View Status'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Job Opportunities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Job Opportunities</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {jobs.length === 0 ? (
            <View style={styles.emptyJobs}>
              <Ionicons name="briefcase-outline" size={32} color={COLORS.gray[300]} />
              <Text style={styles.emptyJobsText}>No job posts yet</Text>
            </View>
          ) : (
            jobs.slice(0, 3).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                hasInterest={myInterests.includes(job.id)}
                compact
                onPress={() => navigation.navigate('JobPostDetails', { jobId: job.id })}
              />
            ))
          )}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Tips</Text>
          <View style={styles.tipsContainer}>
            {[
              'Add a professional profile photo to increase trust',
              'Upload your documents for faster verification',
              'Add your work history to showcase experience',
              'Toggle "Available Now" when you\'re ready for work',
            ].map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.secondary} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs },
  notificationButton: { padding: SPACING.sm, position: 'relative' },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: COLORS.error, borderRadius: 10, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  notifBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },

  // Availability
  availabilityCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.md, gap: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.gray[200], ...SHADOWS.sm,
  },
  availabilityCardActive: { backgroundColor: COLORS.secondary + '08', borderColor: COLORS.secondary },
  availabilityIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center',
  },
  availabilityIconActive: { backgroundColor: COLORS.secondary },
  availabilityInfo: { flex: 1 },
  availabilityTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.gray[500] },
  availabilityTitleActive: { color: COLORS.secondary },
  availabilityDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  availabilityDescActive: { color: COLORS.secondaryDark },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: COLORS.gray[300], padding: 2 },
  toggleTrackActive: { backgroundColor: COLORS.secondary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.white },
  toggleThumbActive: { transform: [{ translateX: 20 }] },

  // Status
  statusCard: {
    backgroundColor: COLORS.white, marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderLeftWidth: 4, ...SHADOWS.sm,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  statusValue: { fontSize: FONTS.sizes.md, fontWeight: 'bold' },
  verifyButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.gray[100],
  },
  verifyButtonText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: '500' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.md, marginBottom: SPACING.md },
  statItem: { flex: 1, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm },
  statIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: 'bold', color: COLORS.text },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: SPACING.xs },

  // Sections
  section: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  actionCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: SPACING.sm, ...SHADOWS.sm,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: FONTS.sizes.xs, fontWeight: '500', color: COLORS.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  seeAll: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '500' },
  emptyJobs: { alignItems: 'center', paddingVertical: SPACING.lg, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm },
  emptyJobsText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.sm },
  tipsContainer: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.sm },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  tipText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
});

export default DriverHomeScreen;
