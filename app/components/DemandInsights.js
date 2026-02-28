import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

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

const DemandInsights = ({ insights, loading, onSeeAll }) => {
  const topLocations = insights.slice(0, 5);

  if (loading && topLocations.length === 0) return null;
  if (!loading && topLocations.length === 0) return null;

  const hasAnyJobs = topLocations.some((loc) => loc.openJobs > 0);
  if (!hasAnyJobs) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="trending-up" size={20} color={COLORS.secondary} />
          <Text style={styles.title}>Where Drivers Are Needed</Text>
        </View>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {topLocations.filter((loc) => loc.openJobs > 0).slice(0, 5).map((loc) => {
        const color = getDemandColor(loc.demandScore);
        return (
          <View key={loc.location} style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.locationName} numberOfLines={1}>{loc.location}</Text>
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.badge, { backgroundColor: COLORS.secondary + '15' }]}>
                <Text style={[styles.badgeText, { color: COLORS.secondary }]}>
                  {loc.openJobs} job{loc.openJobs !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: COLORS.gray[100] }]}>
                <Text style={[styles.badgeText, { color: COLORS.textSecondary }]}>
                  {loc.activeDrivers} driver{loc.activeDrivers !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.demandDot, { backgroundColor: color }]} />
            </View>
          </View>
        );
      })}

      <View style={styles.legend}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  seeAll: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
    marginRight: SPACING.sm,
  },
  locationName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  demandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
  },
});

export default DemandInsights;
