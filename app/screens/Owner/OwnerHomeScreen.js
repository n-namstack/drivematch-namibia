import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import useDriverStore from '../../store/useDriverStore';
import useModerationStore from '../../store/useModerationStore';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import DriverCard from '../../components/DriverCard';
import PromoCarousel from '../../components/PromoCarousel';

const OWNER_PROMOS = [
  {
    id: '1',
    title: 'Find Your Driver',
    subtitle: 'Browse verified, experienced drivers ready for work',
    gradient: ['#4F46E5', '#7C3AED'],
    icon: 'search-outline',
    decorIcon: 'people',
    cta: 'Browse Drivers',
    route: 'AllDrivers',
    params: { showAll: true },
  },
  {
    id: '2',
    title: 'Post a Job',
    subtitle: 'Get applications from qualified drivers fast',
    gradient: ['#059669', '#0D9488'],
    icon: 'megaphone-outline',
    decorIcon: 'megaphone',
    cta: 'Post Now',
    route: 'CreateJobPost',
  },
  {
    id: '3',
    title: 'Track Earnings',
    subtitle: 'Digital logbook — daily entries confirmed by both parties',
    gradient: ['#7C3AED', '#4F46E5'],
    icon: 'document-text-outline',
    decorIcon: 'document-text',
    cta: 'View Agreements',
    route: 'Agreements',
  },
  {
    id: '4',
    title: 'Direct Hire',
    subtitle: 'Send a formal offer to any driver you like',
    gradient: ['#D97706', '#DC2626'],
    icon: 'paper-plane-outline',
    decorIcon: 'paper-plane',
    cta: 'Sent Offers',
    route: 'SentOffers',
  },
];

const QUICK_ACTIONS = [
  {
    label: 'Post a Job',
    sub: 'Hire the right driver',
    icon: 'megaphone',
    color: COLORS.primary,
    bg: '#EEF2FF',
    route: 'CreateJobPost',
  },
  {
    label: 'Browse Drivers',
    sub: 'Search & filter',
    icon: 'people',
    color: COLORS.secondary,
    bg: '#D1FAE5',
    route: 'AllDrivers',
    params: { showAll: true },
  },
  {
    label: 'Sent Offers',
    sub: 'Track your offers',
    icon: 'paper-plane',
    color: '#0891B2',
    bg: '#E0F2FE',
    route: 'SentOffers',
  },
  {
    label: 'Agreements',
    sub: 'Track earnings',
    icon: 'document-text',
    color: '#7C3AED',
    bg: '#EDE9FE',
    route: 'Agreements',
    gated: true,
  },
  {
    label: 'Earnings',
    sub: 'View analytics',
    icon: 'bar-chart',
    color: '#0891B2',
    bg: '#E0F2FE',
    route: 'Earnings',
    gated: true,
  },
];

const OwnerHomeScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const allFeaturedDrivers = useDriverStore((s) => s.featuredDrivers);
  const savedDrivers = useDriverStore((s) => s.savedDrivers);
  const blockedIds = useModerationStore((s) => s.blockedIds);
  const featuredDrivers = blockedIds.size
    ? allFeaturedDrivers.filter((d) => !blockedIds.has(d.user_id))
    : allFeaturedDrivers;
  const fetchFeaturedDrivers = useDriverStore((s) => s.fetchFeaturedDrivers);
  const fetchSavedDrivers = useDriverStore((s) => s.fetchSavedDrivers);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [hasHiredDriver, setHasHiredDriver] = useState(false);
  const [hiringCheckDone, setHiringCheckDone] = useState(false);

  const fetchUnreadCount = async () => {
    if (!profile?.id) return;
    try {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    } catch {}
  };

  const fetchActiveJobCount = async () => {
    if (!profile?.id) return;
    try {
      const { count } = await supabase
        .from('job_posts')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', profile.id)
        .eq('status', 'open');
      setActiveJobCount(count || 0);
    } catch {}
  };

  const fetchHiredDriver = async () => {
    if (!profile?.id) { setHiringCheckDone(true); return; }
    try {
      const { count } = await supabase
        .from('hire_offers')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', profile.id)
        .eq('status', 'accepted');
      setHasHiredDriver((count || 0) > 0);
    } catch {}
    setHiringCheckDone(true);
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      fetchActiveJobCount();
      fetchHiredDriver();
    }, [profile?.id]),
  );

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('owner-home-drivers')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'driver_profiles' }, () => {
        fetchFeaturedDrivers();
      })
      .subscribe();

    const notifChannel = supabase
      .channel('owner-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile?.id}` }, () => {
        fetchUnreadCount();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile?.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notifChannel);
    };
  }, [profile?.id]);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchFeaturedDrivers(),
        profile?.id ? fetchSavedDrivers(profile.id) : Promise.resolve(),
        fetchUnreadCount(),
        fetchActiveJobCount(),
        fetchHiredDriver(),
      ]);
    } catch {
      Toast.show({ type: 'error', text1: 'Connection issue', text2: 'Could not load data. Pull to refresh.' });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
        }
      >
        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greetingSmall}>Good day,</Text>
              <Text style={styles.greetingName}>{profile?.firstname || 'there'} 👋</Text>
            </View>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.headerSub}>Ready to find your perfect driver?</Text>

          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="search-outline" size={18} color={COLORS.gray[400]} />
            <Text style={styles.searchPlaceholder}>Search by name, location or skills...</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Stats Row (overlaps gradient) ── */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeJobCount}</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{savedDrivers?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Saved Drivers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{featuredDrivers.length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        {/* ── Promo Carousel ── */}
        <View style={{ marginTop: SPACING.lg }}>
          <PromoCarousel items={OWNER_PROMOS} navigation={navigation} />
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {(hiringCheckDone ? QUICK_ACTIONS.filter(a => !a.gated || hasHiredDriver) : QUICK_ACTIONS.filter(a => !a.gated)).map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                onPress={() => navigation.navigate(action.route, action.params)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Top Drivers ── */}
        <View style={[styles.section, styles.sectionLast, styles.sectionNoHPad]}>
          <View style={[styles.sectionHeader, styles.sectionHPad]}>
            <Text style={styles.sectionTitle}>Top Drivers</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllDrivers', { showAll: true })}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {featuredDrivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>No drivers available yet</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.driversCarousel}
            >
              {featuredDrivers.slice(0, 5).map((item) => (
                <DriverCard
                  key={item.id}
                  driver={item}
                  onPress={() => navigation.navigate('DriverDetails', { driverId: item.id })}
                  horizontal
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 36,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  greetingSmall: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  greetingName: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 2,
  },
  headerSub: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: SPACING.md,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  searchPlaceholder: { color: COLORS.gray[400], fontSize: FONTS.sizes.sm, flex: 1 },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginTop: -22,
    zIndex: 1,
    ...SHADOWS.md,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md },
  statValue: { fontSize: FONTS.sizes['2xl'], fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, alignSelf: 'center', height: '55%', backgroundColor: COLORS.gray[200] },

  // Sections
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionLast: { marginBottom: SPACING.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  seeAll: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600', marginBottom: SPACING.md },

  // Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  actionCard: {
    width: '48.5%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  actionSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  sectionNoHPad: { paddingHorizontal: 0 },
  sectionHPad: { paddingHorizontal: SPACING.lg },
  driversCarousel: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.sm },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: SPACING['2xl'] },
  emptyText: { marginTop: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
});

export default OwnerHomeScreen;
