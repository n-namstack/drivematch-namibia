import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import supabase from '../../lib/supabase';
import DriverCard from '../../components/DriverCard';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const PAGE_SIZE = 20;

const GuestDriversScreen = ({ navigation }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchDrivers = async (offset = 0, isRefresh = false) => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('driver_profiles')
        .select(`
          *,
          profiles:user_id (
            firstname,
            lastname,
            profile_image,
            location
          )
        `)
        .order('rating', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      const newData = data || [];
      setHasMore(newData.length === PAGE_SIZE);
      setDrivers((prev) => (isRefresh || offset === 0 ? newData : [...prev, ...newData]));
    } catch (err) {
      setError('Could not load drivers. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchDrivers(0);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrivers(0, true);
  };

  const onEndReached = () => {
    if (!loadingMore && hasMore && !loading && !search.trim()) {
      setLoadingMore(true);
      fetchDrivers(drivers.length);
    }
  };

  const visibleDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => {
      const p = d.profiles || {};
      const name = `${p.firstname || ''} ${p.lastname || ''}`.toLowerCase();
      const loc = (p.location || '').toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [drivers, search]);

  const ListHeader = (
    <View>
      {/* Hero */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <Ionicons name="shield-checkmark" size={12} color={COLORS.white} />
          <Text style={styles.heroBadgeText}>Namibia's Driver Platform</Text>
        </View>
        <Text style={styles.heroTitle}>Find your trusted driver</Text>
        <Text style={styles.heroSubtitle}>
          Browse verified, experienced drivers — no account needed
        </Text>

        <View style={styles.trustRow}>
          {[
            { icon: 'shield-checkmark-outline', label: 'Verified' },
            { icon: 'star-outline',             label: 'Rated' },
            { icon: 'eye-outline',              label: 'Free to Browse' },
          ].map((t) => (
            <View key={t.label} style={styles.trustChip}>
              <Ionicons name={t.icon} size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.trustChipText}>{t.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or location..."
            placeholderTextColor={COLORS.gray[400]}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Sign-up CTA */}
      <TouchableOpacity
        style={styles.ctaBanner}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('Register')}
      >
        <LinearGradient
          colors={['#4F46E5', COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}
        >
          <View style={styles.ctaLeft}>
            <Text style={styles.ctaTitle}>Ready to hire a driver?</Text>
            <Text style={styles.ctaSubtitle}>Create a free account — takes 30 seconds</Text>
          </View>
          <View style={styles.ctaArrow}>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Section title */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {search.trim() ? 'Search Results' : 'Available Drivers'}
        </Text>
        <Text style={styles.resultsCount}>
          {visibleDrivers.length}{!search.trim() && hasMore ? '+' : ''}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={visibleDrivers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <DriverCard
              driver={item}
              onPress={() => navigation.navigate('DriverDetails', { driverId: item.id })}
              compact
            />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: SPACING.lg }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={error ? 'cloud-offline-outline' : 'car-outline'}
              size={56}
              color={COLORS.gray[300]}
            />
            <Text style={styles.emptyTitle}>
              {error ? 'Something went wrong' : search.trim() ? 'No matches found' : 'No drivers yet'}
            </Text>
            <Text style={styles.emptyText}>
              {error || (search.trim() ? 'Try a different name or location.' : 'Check back later for available drivers.')}
            </Text>
            {error && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => { setLoading(true); fetchDrivers(0); }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: SPACING.xl, flexGrow: 1 },
  cardWrap: { paddingHorizontal: SPACING.lg },
  hero: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  heroBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: FONTS.sizes['3xl'],
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SPACING.xs,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  trustRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
  },
  trustChipText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.text, padding: 0 },
  ctaBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  ctaLeft: { flex: 1 },
  ctaTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.white },
  ctaSubtitle: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  ctaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.text },
  resultsCount: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING['2xl'], paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.md },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryText: { color: COLORS.white, fontWeight: '600' },
});

export default GuestDriversScreen;
