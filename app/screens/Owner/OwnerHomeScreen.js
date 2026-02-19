import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
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

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchFeaturedDrivers(),
        profile?.id ? fetchSavedDrivers(profile.id) : Promise.resolve(),
      ]);
    } catch (err) {
      // Data will load on next refresh
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
            style={styles.profileButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="person-circle" size={40} color={COLORS.primary} />
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

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How NamDriver Works</Text>
          <View style={styles.howItWorksContainer}>
            {[
              { num: '1', title: 'Search', desc: 'Browse drivers by location, experience, and availability' },
              { num: '2', title: 'Connect', desc: 'Message or call drivers directly' },
              { num: '3', title: 'Hire', desc: 'View credentials, reviews, and hire with confidence' },
            ].map((step) => (
              <View key={step.num} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.num}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
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
  profileButton: { padding: SPACING.xs },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg, gap: SPACING.sm, ...SHADOWS.sm,
  },
  searchPlaceholder: { color: COLORS.gray[400], fontSize: FONTS.sizes.md },
  section: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginTop: SPACING.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  seeAll: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: SPACING['2xl'] },
  emptyText: { marginTop: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  howItWorksContainer: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, gap: SPACING.md, ...SHADOWS.sm },
  stepItem: { flexDirection: 'row', gap: SPACING.md },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.sizes.md },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  stepDescription: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
});

export default OwnerHomeScreen;
