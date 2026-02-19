import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VEHICLE_TYPES } from '../constants/theme';

const EXPERIENCE_LABELS = {
  any: 'Any Level',
  beginner: '0-2 years',
  intermediate: '2-5 years',
  experienced: '5+ years',
};

const AVAILABILITY_LABELS = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  weekends_only: 'Weekends Only',
};

const JobCard = ({ job, onPress, hasInterest, compact = false }) => {
  const timeAgo = getTimeAgo(job.created_at);
  const vehicleLabels = (job.vehicle_types || [])
    .map((vt) => VEHICLE_TYPES.find((v) => v.id === vt)?.label || vt)
    .slice(0, 3);

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactLeft}>
          <Text style={styles.compactTitle} numberOfLines={1}>{job.title}</Text>
          <View style={styles.compactMeta}>
            {job.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{job.location}</Text>
              </View>
            )}
            <Text style={styles.compactTime}>{timeAgo}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
          {job.owner && (
            <Text style={styles.ownerName}>
              {job.owner.firstname} {job.owner.lastname}
            </Text>
          )}
        </View>
        {hasInterest && (
          <View style={styles.interestedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.secondary} />
            <Text style={styles.interestedText}>Interested</Text>
          </View>
        )}
      </View>

      {/* Description */}
      {job.description && (
        <Text style={styles.description} numberOfLines={2}>{job.description}</Text>
      )}

      {/* Tags */}
      <View style={styles.tagsRow}>
        {job.location && (
          <View style={styles.tag}>
            <Ionicons name="location-outline" size={12} color={COLORS.primary} />
            <Text style={styles.tagText}>{job.location}</Text>
          </View>
        )}
        {job.availability_type && (
          <View style={styles.tag}>
            <Ionicons name="time-outline" size={12} color={COLORS.primary} />
            <Text style={styles.tagText}>{AVAILABILITY_LABELS[job.availability_type] || job.availability_type}</Text>
          </View>
        )}
        {job.experience_level && job.experience_level !== 'any' && (
          <View style={styles.tag}>
            <Ionicons name="ribbon-outline" size={12} color={COLORS.primary} />
            <Text style={styles.tagText}>{EXPERIENCE_LABELS[job.experience_level]}</Text>
          </View>
        )}
      </View>

      {/* Vehicle types */}
      {vehicleLabels.length > 0 && (
        <View style={styles.vehicleRow}>
          {vehicleLabels.map((label, i) => (
            <View key={i} style={styles.vehicleChip}>
              <Text style={styles.vehicleChipText}>{label}</Text>
            </View>
          ))}
          {(job.vehicle_types || []).length > 3 && (
            <Text style={styles.moreText}>+{job.vehicle_types.length - 3} more</Text>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.timeText}>{timeAgo}</Text>
        <View style={styles.interestCount}>
          <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.interestCountText}>
            {job.interest_count || 0} interested
          </Text>
        </View>
        {job.salary_range && (
          <View style={styles.salaryBadge}>
            <Text style={styles.salaryText}>{job.salary_range}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  headerLeft: { flex: 1, marginRight: SPACING.sm },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  ownerName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  interestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  interestedText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  description: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  vehicleChip: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  vehicleChipText: {
    fontSize: 11,
    color: COLORS.gray[600],
  },
  moreText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  timeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
  },
  interestCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  interestCountText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  salaryBadge: {
    marginLeft: 'auto',
    backgroundColor: COLORS.secondary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  salaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  // Compact variant
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  compactLeft: { flex: 1 },
  compactTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  compactTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
  },
});

export default JobCard;
