import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const AdminDashboardScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalOwners: 0,
    pendingVerifications: 0,
    verifiedDrivers: 0,
    totalConversations: 0,
    totalReviews: 0,
  });
  const [recentDrivers, setRecentDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [
        driversCount,
        ownersCount,
        pendingCount,
        verifiedCount,
        conversationsCount,
        reviewsCount,
        recent,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner'),
        supabase.from('driver_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'submitted'),
        supabase.from('driver_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('driver_reviews').select('id', { count: 'exact', head: true }),
        supabase.from('driver_profiles').select(`
          id,
          verification_status,
          rating,
          created_at,
          profiles:user_id (firstname, lastname, location)
        `).order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        totalDrivers: driversCount.count || 0,
        totalOwners: ownersCount.count || 0,
        pendingVerifications: pendingCount.count || 0,
        verifiedDrivers: verifiedCount.count || 0,
        totalConversations: conversationsCount.count || 0,
        totalReviews: reviewsCount.count || 0,
      });
      setRecentDrivers(recent.data || []);
    } catch (err) {
      // Dashboard load failed
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, []);

  const statCards = [
    { label: 'Total Drivers', value: stats.totalDrivers, icon: 'car', color: COLORS.primary },
    { label: 'Total Owners', value: stats.totalOwners, icon: 'people', color: COLORS.info },
    { label: 'Pending Verifications', value: stats.pendingVerifications, icon: 'shield-half', color: COLORS.warning },
    { label: 'Verified Drivers', value: stats.verifiedDrivers, icon: 'shield-checkmark', color: COLORS.secondary },
    { label: 'Conversations', value: stats.totalConversations, icon: 'chatbubbles', color: COLORS.accent },
    { label: 'Reviews', value: stats.totalReviews, icon: 'star', color: '#8B5CF6' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Welcome, {profile?.firstname || 'Admin'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Pending Alert */}
        {stats.pendingVerifications > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => navigation.navigate('Verify')}
          >
            <View style={styles.alertIconBg}>
              <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {stats.pendingVerifications} Pending Verification{stats.pendingVerifications !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.alertText}>Driver documents are waiting for review</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Verify')}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary + '15' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Verify Documents</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Drivers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Drivers</Text>
          {recentDrivers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No drivers registered yet</Text>
            </View>
          ) : (
            recentDrivers.map((driver) => {
              const name = `${driver.profiles?.firstname || ''} ${driver.profiles?.lastname || ''}`.trim() || 'Unknown';
              const statusColors = {
                verified: COLORS.secondary,
                submitted: COLORS.info,
                rejected: COLORS.error,
                pending: COLORS.warning,
              };
              const statusColor = statusColors[driver.verification_status] || COLORS.gray[400];

              return (
                <TouchableOpacity
                  key={driver.id}
                  style={styles.driverRow}
                  onPress={() => navigation.navigate('DriverDetails', { driverId: driver.id })}
                >
                  <View style={styles.driverAvatarPlaceholder}>
                    <Text style={styles.driverInitial}>
                      {(driver.profiles?.firstname || 'D')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{name}</Text>
                    <Text style={styles.driverLocation}>
                      {driver.profiles?.location || 'No location'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {driver.verification_status || 'pending'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
  },
  greeting: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs },
  notifButton: { padding: SPACING.sm },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warning + '10',
    marginHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    gap: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.warning + '30',
  },
  alertIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.warning + '20', justifyContent: 'center', alignItems: 'center',
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  alertText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg,
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  statCard: {
    width: '48%', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, ...SHADOWS.sm,
  },
  statIconBg: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
  },
  statValue: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },

  actionsRow: { flexDirection: 'row', gap: SPACING.sm },
  actionCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: SPACING.sm, ...SHADOWS.sm,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: FONTS.sizes.sm, fontWeight: '500', color: COLORS.text },

  emptyCard: {
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center', ...SHADOWS.sm,
  },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },

  driverRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    gap: SPACING.md, ...SHADOWS.sm,
  },
  driverAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center',
  },
  driverInitial: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.primary },
  driverInfo: { flex: 1 },
  driverName: { fontSize: FONTS.sizes.md, fontWeight: '500', color: COLORS.text },
  driverLocation: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});

export default AdminDashboardScreen;
