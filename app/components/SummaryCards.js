import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const SummaryCards = ({ summary, contractType, agreementTerms }) => {
  if (!summary) return null;

  const cards = [
    {
      label: 'Today',
      earned: Number(summary.today_earned) || 0,
      paid: Number(summary.today_paid) || 0,
      icon: 'today-outline',
    },
    {
      label: 'This Week',
      earned: Number(summary.week_earned) || 0,
      paid: Number(summary.week_paid) || 0,
      icon: 'calendar-outline',
    },
    {
      label: 'This Month',
      earned: Number(summary.month_earned) || 0,
      paid: Number(summary.month_paid) || 0,
      icon: 'stats-chart-outline',
    },
  ];

  // For rent_to_own, replace "This Month" with progress card
  const isRentToOwn = contractType === 'rent_to_own';
  const totalPaid = Number(summary.total_paid) || 0;
  const rentTotal = Number(agreementTerms?.rent_to_own_total) || 1;
  const progressPct = isRentToOwn ? Math.min((totalPaid / rentTotal) * 100, 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {cards.map((card, index) => {
          // If rent_to_own and last card, show progress
          if (isRentToOwn && index === 2) {
            return (
              <View key={card.label} style={styles.card}>
                <Ionicons name="key-outline" size={16} color={COLORS.accent} />
                <Text style={styles.cardLabel}>Progress</Text>
                <Text style={styles.cardEarned}>
                  N${totalPaid.toLocaleString()}
                </Text>
                <Text style={styles.cardPaid}>
                  of N${rentTotal.toLocaleString()}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                </View>
                <Text style={styles.progressPctText}>{progressPct.toFixed(0)}%</Text>
              </View>
            );
          }

          return (
            <View key={card.label} style={styles.card}>
              <Ionicons name={card.icon} size={16} color={COLORS.primary} />
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardEarned}>
                N${card.earned.toLocaleString()}
              </Text>
              <Text style={styles.cardPaid}>
                Paid: N${card.paid.toLocaleString()}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Outstanding balance */}
      {(Number(summary.unverified_count) > 0 || Number(summary.disputed_count) > 0) && (
        <View style={styles.outstandingRow}>
          {Number(summary.unverified_count) > 0 && (
            <View style={[styles.outstandingBadge, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="time-outline" size={14} color={COLORS.warning} />
              <Text style={[styles.outstandingText, { color: COLORS.accentDark || COLORS.warning }]}>
                {summary.unverified_count} unverified (N${Number(summary.unverified_amount).toLocaleString()})
              </Text>
            </View>
          )}
          {Number(summary.disputed_count) > 0 && (
            <View style={[styles.outstandingBadge, { backgroundColor: COLORS.error + '15' }]}>
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
              <Text style={[styles.outstandingText, { color: COLORS.error }]}>
                {summary.disputed_count} disputed
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
    gap: 2,
    ...SHADOWS.sm,
  },
  cardLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardEarned: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardPaid: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressPctText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.accent,
  },
  outstandingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  outstandingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  outstandingText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
});

export default SummaryCards;
