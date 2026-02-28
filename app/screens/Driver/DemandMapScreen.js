import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import useDemandStore from '../../store/useDemandStore';

const getDemandColor = (score) => {
  if (score > 2) return COLORS.secondary;
  if (score >= 1) return COLORS.accent;
  return COLORS.gray[400];
};

const getDemandLabel = (score) => {
  if (score > 2) return 'High demand';
  if (score >= 1) return 'Moderate';
  return 'Low demand';
};

const DemandMapScreen = ({ navigation }) => {
  const { insights, loading, fetchInsights } = useDemandStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchInsights(true);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return insights;
    const q = search.toLowerCase();
    return insights.filter((loc) => loc.location.toLowerCase().includes(q));
  }, [insights, search]);

  const renderItem = ({ item }) => {
    const color = getDemandColor(item.demandScore);
    const barWidth = Math.min(item.demandScore * 20, 100);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.locationIcon, { backgroundColor: color + '15' }]}>
              <Ionicons name="location" size={18} color={color} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{item.location}</Text>
              <Text style={[styles.demandLabel, { color }]}>{getDemandLabel(item.demandScore)}</Text>
            </View>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreValue, { color }]}>{item.demandScore.toFixed(1)}</Text>
            <Text style={styles.scoreLabel}>score</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="briefcase-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.statValue}>{item.openJobs}</Text>
            <Text style={styles.statLabel}>open job{item.openJobs !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={14} color={COLORS.primary} />
            <Text style={styles.statValue}>{item.activeDrivers}</Text>
            <Text style={styles.statLabel}>driver{item.activeDrivers !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Ionicons name="analytics-outline" size={40} color={COLORS.gray[300]} />
        <Text style={styles.emptyTitle}>
          {search ? 'No matching locations' : 'No demand data yet'}
        </Text>
        <Text style={styles.emptyText}>
          {search
            ? 'Try a different search term.'
            : 'Demand insights will appear when job posts are created.'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Demand Insights</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search locations..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.location}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          filtered.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshing={loading}
        onRefresh={() => fetchInsights(true)}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => navigation.navigate('EditDriverProfile')}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.white} />
          <Text style={styles.updateButtonText}>Update Preferred Areas</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    padding: 0,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  demandLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: 1,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  barTrack: {
    height: 4,
    backgroundColor: COLORS.gray[100],
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.md,
  },
  updateButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default DemandMapScreen;
