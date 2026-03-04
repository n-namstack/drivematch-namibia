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
import useDocumentStore from '../../store/useDocumentStore';
import useDemandStore from '../../store/useDemandStore';
import supabase from '../../lib/supabase';
import JobCard from '../../components/JobCard';
import DemandInsights from '../../components/DemandInsights';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VERIFICATION_STATUS } from '../../constants/theme';

const DriverHomeScreen = ({ navigation }) => {
  const { profile, driverProfile, refreshProfile, updateDriverProfile } = useAuth();
  const { jobs, fetchJobs, myInterests, fetchMyInterests } = useJobStore();
  const { documents, fetchDocuments } = useDocumentStore();
  const { insights: demandInsights, loading: demandLoading, fetchInsights } = useDemandStore();
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Re-fetch unread count and recent jobs every time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      fetchJobs(true);
      fetchInsights();
      if (driverProfile?.id) {
        fetchMyInterests(driverProfile.id);
        fetchDocuments(driverProfile.id);
      }
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
      fetchInsights(true),
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

  // Compute expiring documents
  const expiringDocs = documents.filter((doc) => {
    if (!doc.expiry_date || doc.verification_status === 'expired') return false;
    const daysUntil = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30;
  });
  const expiredDocs = documents.filter((doc) => doc.verification_status === 'expired');

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
        {/* Hero Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroGreeting}>
              <Text style={styles.greeting}>
                {profile?.firstname || 'Driver'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '18' }]}>
                <Ionicons
                  name={
                    driverProfile?.verification_status === 'verified'
                      ? 'shield-checkmark'
                      : 'shield-outline'
                  }
                  size={14}
                  color={statusInfo.color}
                />
                <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Availability Toggle inside Hero */}
          <TouchableOpacity
            style={[styles.availabilityRow, isAvailable && styles.availabilityRowActive]}
            onPress={toggleAvailability}
            activeOpacity={0.8}
          >
            <View style={styles.availabilityLeft}>
              <View style={[styles.availabilityDot, isAvailable && styles.availabilityDotActive]} />
              <Text style={styles.availabilityText}>
                {isAvailable ? 'Available for work' : 'Set yourself available'}
              </Text>
            </View>
            <View style={[styles.toggleTrack, isAvailable && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, isAvailable && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>

          {/* Stats inside Hero */}
          <View style={styles.statsRow}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Ionicons name={stat.icon} size={18} color={COLORS.white} style={{ opacity: 0.7 }} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Verification CTA (only if not verified) */}
        {driverProfile?.verification_status !== 'verified' && (
          <TouchableOpacity
            style={styles.verifyCta}
            onPress={() => navigation.navigate('DocumentUpload')}
            activeOpacity={0.7}
          >
            <View style={styles.verifyCtaLeft}>
              <Ionicons name="document-text" size={20} color={COLORS.primary} />
              <Text style={styles.verifyCtaText}>
                {driverProfile?.verification_status === 'pending'
                  ? 'Upload documents to get verified'
                  : 'Check your verification status'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Document Expiry Warnings */}
        {expiredDocs.length > 0 && (
          <TouchableOpacity
            style={[styles.verifyCta, { backgroundColor: COLORS.error + '10', borderColor: COLORS.error + '30', borderWidth: 1 }]}
            onPress={() => navigation.navigate('DocumentUpload')}
            activeOpacity={0.7}
          >
            <View style={styles.verifyCtaLeft}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={[styles.verifyCtaText, { color: COLORS.error }]}>
                {expiredDocs.length} document{expiredDocs.length > 1 ? 's' : ''} expired - update now
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.error} />
          </TouchableOpacity>
        )}

        {expiredDocs.length === 0 && expiringDocs.length > 0 && (
          <TouchableOpacity
            style={[styles.verifyCta, { backgroundColor: COLORS.warning + '10', borderColor: COLORS.warning + '30', borderWidth: 1 }]}
            onPress={() => navigation.navigate('DocumentUpload')}
            activeOpacity={0.7}
          >
            <View style={styles.verifyCtaLeft}>
              <Ionicons name="time-outline" size={20} color={COLORS.warning} />
              <Text style={[styles.verifyCtaText, { color: COLORS.accentDark }]}>
                {expiringDocs.length} document{expiringDocs.length > 1 ? 's' : ''} expiring soon
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.warning} />
          </TouchableOpacity>
        )}

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

        {/* Demand Insights */}
        <View style={styles.section}>
          <DemandInsights
            insights={demandInsights}
            loading={demandLoading}
            onSeeAll={() => navigation.navigate('DemandMap')}
          />
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

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },

  // Hero Card
  heroCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  heroGreeting: { flex: 1 },
  greeting: {
    fontSize: FONTS.sizes['3xl'],
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  notificationButton: {
    padding: SPACING.sm,
    position: 'relative',
    backgroundColor: COLORS.white + '15',
    borderRadius: BORDER_RADIUS.lg,
  },
  notifBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: COLORS.error, borderRadius: 10, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  notifBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },

  // Availability Row (inside hero)
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white + '12',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    marginBottom: SPACING.lg,
  },
  availabilityRowActive: {
    backgroundColor: COLORS.secondary + '30',
  },
  availabilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gray[400],
  },
  availabilityDotActive: {
    backgroundColor: COLORS.secondaryLight,
  },
  availabilityText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  toggleTrack: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: COLORS.white + '30', padding: 2,
  },
  toggleTrackActive: { backgroundColor: COLORS.secondary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white },
  toggleThumbActive: { transform: [{ translateX: 18 }] },

  // Stats Row (inside hero)
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.white + '12',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    opacity: 0.7,
  },

  // Verification CTA
  verifyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '0A',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  verifyCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  verifyCtaText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Sections
  section: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
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
});

export default DriverHomeScreen;
