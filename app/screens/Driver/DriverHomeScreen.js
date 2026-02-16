import React, { useEffect, useState } from 'react';
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
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VERIFICATION_STATUS } from '../../constants/theme';

const DriverHomeScreen = ({ navigation }) => {
  const { profile, driverProfile, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  const getVerificationStatusInfo = () => {
    const status = driverProfile?.verification_status || 'pending';
    return VERIFICATION_STATUS[status] || VERIFICATION_STATUS.pending;
  };

  const statusInfo = getVerificationStatusInfo();

  const stats = [
    {
      label: 'Profile Views',
      value: '0', // Would come from analytics
      icon: 'eye',
    },
    {
      label: 'Messages',
      value: '0', // Would come from unread count
      icon: 'chatbubbles',
    },
    {
      label: 'Rating',
      value: driverProfile?.rating?.toFixed(1) || '0.0',
      icon: 'star',
    },
    {
      label: 'Reviews',
      value: driverProfile?.total_reviews?.toString() || '0',
      icon: 'document-text',
    },
  ];

  const quickActions = [
    {
      id: 'profile',
      icon: 'person',
      label: 'Edit Profile',
      color: COLORS.primary,
      onPress: () => navigation.navigate('EditDriverProfile'),
    },
    {
      id: 'documents',
      icon: 'document',
      label: 'Documents',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('DocumentUpload'),
    },
    {
      id: 'work',
      icon: 'briefcase',
      label: 'Work History',
      color: COLORS.accent,
      onPress: () => navigation.navigate('WorkHistory'),
    },
    {
      id: 'messages',
      icon: 'chatbubbles',
      label: 'Messages',
      color: COLORS.info,
      onPress: () => navigation.navigate('Messages'),
    },
  ];

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
            <Text style={styles.greeting}>
              Welcome, {profile?.firstname || 'Driver'}!
            </Text>
            <Text style={styles.subtitle}>Manage your driver profile</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Verification Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={
                driverProfile?.verification_status === 'verified'
                  ? 'shield-checkmark'
                  : 'shield-outline'
              }
              size={24}
              color={statusInfo.color}
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Verification Status</Text>
              <Text style={[styles.statusValue, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          {driverProfile?.verification_status !== 'verified' && (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => navigation.navigate('DocumentUpload')}
            >
              <Text style={styles.verifyButtonText}>
                {driverProfile?.verification_status === 'pending'
                  ? 'Upload Documents'
                  : 'View Status'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <Ionicons name={stat.icon} size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={action.onPress}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: action.color + '20' },
                  ]}
                >
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Tips</Text>
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
              <Text style={styles.tipText}>
                Add a professional profile photo to increase trust
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
              <Text style={styles.tipText}>
                Upload your documents for faster verification
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
              <Text style={styles.tipText}>
                Add your work history to showcase experience
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
              <Text style={styles.tipText}>
                Respond promptly to messages from car owners
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  notificationButton: {
    padding: SPACING.sm,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  verifyButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  tipsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default DriverHomeScreen;
