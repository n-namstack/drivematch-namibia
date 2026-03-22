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
import { useAuth } from '../../context/AuthContext';
import useDriverStore from '../../store/useDriverStore';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import DriverCard from '../../components/DriverCard';

const OwnerHomeScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const featuredDrivers = useDriverStore((s) => s.featuredDrivers);
  const fetchFeaturedDrivers = useDriverStore((s) => s.fetchFeaturedDrivers);
  const fetchSavedDrivers = useDriverStore((s) => s.fetchSavedDrivers);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      // silent
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [profile?.id]),
  );

  useEffect(() => {
    loadData();

    // Realtime: auto-refresh when driver profiles change (availability, rating, etc.)
    const channel = supabase
      .channel('owner-home-drivers')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'driver_profiles' },
        () => { fetchFeaturedDrivers(); }
      )
      .subscribe();

    // Realtime: update notification badge
    const notifChannel = supabase
      .channel('owner-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile?.id}` },
        () => { fetchUnreadCount(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile?.id}` },
        () => { fetchUnreadCount(); }
      )
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
      ]);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Connection issue', text2: 'Could not load data. Pull to refresh.' });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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
            <Text style={styles.greeting}>Hello, {profile?.firstname || 'there'}!</Text>
            <Text style={styles.subtitle}>Find your perfect driver today</Text>
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

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <Text style={styles.searchPlaceholder}>Search by name or location...</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('CreateJobPost')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="megaphone-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Post a Job</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('SavedDrivers')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.error + '15' }]}>
              <Ionicons name="heart-outline" size={22} color={COLORS.error} />
            </View>
            <Text style={styles.quickActionLabel}>Saved Drivers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('My Jobs')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.secondary + '15' }]}>
              <Ionicons name="briefcase-outline" size={22} color={COLORS.secondary} />
            </View>
            <Text style={styles.quickActionLabel}>My Job Posts</Text>
          </TouchableOpacity>
        </View>

        {/* Top Drivers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Drivers</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllDrivers', { showAll: true })}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {featuredDrivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>No drivers available yet</Text>
            </View>
          ) : (
            featuredDrivers.slice(0, 5).map((item) => (
              <DriverCard
                key={item.id}
                driver={item}
                onPress={() => navigation.navigate('DriverDetails', { driverId: item.id })}
                compact
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
  },
  greeting: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs },
  notificationButton: {
    padding: SPACING.sm,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg, gap: SPACING.sm, ...SHADOWS.sm,
  },
  searchPlaceholder: { color: COLORS.gray[400], fontSize: FONTS.sizes.md },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
  },
  section: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginTop: SPACING.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  seeAll: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: SPACING['2xl'] },
  emptyText: { marginTop: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
});

export default OwnerHomeScreen;
