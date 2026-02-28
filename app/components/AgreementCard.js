import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const CONTRACT_LABELS = {
  daily_target: { label: 'Daily Target', icon: 'cash-outline', color: COLORS.primary },
  revenue_share: { label: 'Revenue Share', icon: 'pie-chart-outline', color: COLORS.secondary },
  rent_to_own: { label: 'Rent to Own', icon: 'key-outline', color: COLORS.accent },
};

const STATUS_COLORS = {
  active: COLORS.secondary,
  paused: COLORS.warning,
  ended: COLORS.gray[400],
};

const AgreementCard = ({ agreement, onPress, role }) => {
  const contractInfo = CONTRACT_LABELS[agreement.contract_type] || CONTRACT_LABELS.daily_target;
  const statusColor = STATUS_COLORS[agreement.status] || COLORS.gray[400];

  // Get the other party's info based on role
  let name = '';
  let imageUri = null;
  if (role === 'owner') {
    const driverProfile = agreement.driver_profiles;
    const profile = driverProfile?.profiles;
    name = profile ? `${profile.firstname} ${profile.lastname}` : 'Driver';
    imageUri = profile?.profile_image;
  } else {
    const ownerProfile = agreement.owner;
    name = ownerProfile ? `${ownerProfile.firstname} ${ownerProfile.lastname}` : 'Owner';
    imageUri = ownerProfile?.profile_image;
  }

  // Build terms summary
  let termsSummary = '';
  if (agreement.contract_type === 'daily_target') {
    termsSummary = `N$${Number(agreement.daily_target_amount).toLocaleString()}/day`;
  } else if (agreement.contract_type === 'revenue_share') {
    const ownerPct = 100 - Number(agreement.revenue_share_driver_pct);
    termsSummary = `${ownerPct}/${agreement.revenue_share_driver_pct} split`;
  } else if (agreement.contract_type === 'rent_to_own') {
    termsSummary = `N$${Number(agreement.rent_to_own_total).toLocaleString()} total`;
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={16} color={COLORS.gray[400]} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.termsRow}>
            <View style={[styles.typeBadge, { backgroundColor: contractInfo.color + '15' }]}>
              <Ionicons name={contractInfo.icon} size={12} color={contractInfo.color} />
              <Text style={[styles.typeText, { color: contractInfo.color }]}>{contractInfo.label}</Text>
            </View>
            <Text style={styles.termsText}>{termsSummary}</Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  typeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  termsText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default AgreementCard;
