import { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import useDemandStore from '../../store/useDemandStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.42;

// Namibia center and boundaries
const NAMIBIA_REGION = {
  latitude: -22.0,
  longitude: 17.5,
  latitudeDelta: 14,
  longitudeDelta: 14,
};

// Restrict map panning to Namibia + small buffer
const NAMIBIA_BOUNDARY = {
  northEast: { latitude: -16.9, longitude: 25.3 },
  southWest: { latitude: -29.0, longitude: 11.7 },
};

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
  const mapRef = useRef(null);

  useEffect(() => {
    fetchInsights(true);
  }, []);

  // Only show locations that have open jobs
  const locationsWithJobs = useMemo(
    () => insights.filter((loc) => loc.openJobs > 0),
    [insights]
  );

  // Map markers: locations with jobs AND coordinates
  const mappableInsights = useMemo(
    () => locationsWithJobs.filter((loc) => loc.latitude != null && loc.longitude != null),
    [locationsWithJobs]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return locationsWithJobs;
    const q = search.toLowerCase();
    return locationsWithJobs.filter((loc) => loc.location.toLowerCase().includes(q));
  }, [locationsWithJobs, search]);

  const handleMarkerPress = (item) => {
    setSearch('');
    // Animate to the selected location
    mapRef.current?.animateToRegion(
      {
        latitude: item.latitude,
        longitude: item.longitude,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      },
      500
    );
  };

  const handleCardPress = (item) => {
    if (item.latitude != null && item.longitude != null) {
      mapRef.current?.animateToRegion(
        {
          latitude: item.latitude,
          longitude: item.longitude,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        },
        500
      );
    }
  };

  const renderCard = ({ item }) => {
    const color = getDemandColor(item.demandScore);
    const barWidth = Math.min(item.demandScore * 20, 100);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.locationIcon, { backgroundColor: color + '15' }]}>
              <Ionicons name="location" size={18} color={color} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{item.location}</Text>
              <Text style={[styles.demandLabel, { color }]}>
                {getDemandLabel(item.demandScore)}
              </Text>
            </View>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreValue, { color }]}>
              {item.demandScore.toFixed(1)}
            </Text>
            <Text style={styles.scoreLabel}>score</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="briefcase-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.statValue}>{item.openJobs}</Text>
            <Text style={styles.statLabel}>
              open job{item.openJobs !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={14} color={COLORS.primary} />
            <Text style={styles.statValue}>{item.activeDrivers}</Text>
            <Text style={styles.statLabel}>
              driver{item.activeDrivers !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${barWidth}%`, backgroundColor: color },
            ]}
          />
        </View>
      </TouchableOpacity>
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Where Drivers Are Needed</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={NAMIBIA_REGION}
          mapBoundaries={NAMIBIA_BOUNDARY}
          minZoomLevel={5}
          maxZoomLevel={12}
          showsUserLocation={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {mappableInsights.map((item) => {
            const color = getDemandColor(item.demandScore);
            return (
              <Marker
                key={item.location}
                coordinate={{
                  latitude: item.latitude,
                  longitude: item.longitude,
                }}
                pinColor={color}
                onPress={() => handleMarkerPress(item)}
              >
                <Callout tooltip>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{item.location}</Text>
                    <View style={styles.calloutRow}>
                      <Text style={[styles.calloutScore, { color }]}>
                        {item.demandScore.toFixed(1)}
                      </Text>
                      <Text style={styles.calloutLabel}>
                        {getDemandLabel(item.demandScore)}
                      </Text>
                    </View>
                    <View style={styles.calloutStats}>
                      <Text style={styles.calloutStat}>
                        {item.openJobs} job{item.openJobs !== 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.calloutDivider}>|</Text>
                      <Text style={styles.calloutStat}>
                        {item.activeDrivers} driver
                        {item.activeDrivers !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        {/* Legend overlay */}
        <View style={styles.legendOverlay}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
            <Text style={styles.legendText}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.gray[400] }]} />
            <Text style={styles.legendText}>Low</Text>
          </View>
        </View>
      </View>

      {/* Search */}
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

      {/* Location List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.location}
        renderItem={renderCard}
        contentContainerStyle={[
          styles.list,
          filtered.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshing={loading}
        onRefresh={() => fetchInsights(true)}
      />

      {/* Footer */}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // Map
  mapContainer: {
    height: MAP_HEIGHT,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Legend overlay
  legendOverlay: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    backgroundColor: COLORS.white + 'E6',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Callout
  callout: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    minWidth: 180,
    ...SHADOWS.md,
  },
  calloutTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  calloutScore: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  calloutLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  calloutStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  calloutStat: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  calloutDivider: {
    color: COLORS.gray[300],
    fontSize: FONTS.sizes.xs,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
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

  // Cards
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
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

  // Empty
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

  // Footer
  footer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
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
