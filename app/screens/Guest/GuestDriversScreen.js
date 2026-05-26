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
      <View style={styles.hero}>
        <Text style={styles.brand}>DuoLink</Text>
        <Text style={styles.heroTitle}>Find a trusted driver</Text>
        <Text style={styles.heroSubtitle}>
          Browse Namibia's verified drivers — no account needed
        </Text>

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
      </View>

      {/* Sign-in CTA */}
      <TouchableOpacity
        style={styles.ctaBanner}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Login')}
      >
        <View style={styles.ctaIcon}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.ctaTextWrap}>
          <Text style={styles.ctaTitle}>Want to hire or message a driver?</Text>
          <Text style={styles.ctaSubtitle}>Create a free account to get started</Text>
        </View>
        <View style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Sign In</Text>
        </View>
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: BORDER_RADIUS.xl || 24,
    borderBottomRightRadius: BORDER_RADIUS.xl || 24,
  },
  brand: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: FONTS.sizes['3xl'],
    fontWeight: '800',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.85,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextWrap: { flex: 1 },
  ctaTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  ctaSubtitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  ctaButtonText: { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.sm },
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
