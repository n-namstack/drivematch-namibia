import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useAgreementStore from '../../store/useAgreementStore';
import SummaryCards from '../../components/SummaryCards';
import EarningEntryCard from '../../components/EarningEntryCard';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const CONTRACT_LABELS = {
  daily_target: 'Daily Target',
  revenue_share: 'Revenue Share',
  rent_to_own: 'Rent to Own',
};

const ManagementDashboardScreen = ({ route, navigation }) => {
  const { agreementId } = route.params;
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  const activeAgreement = useAgreementStore((s) => s.activeAgreement);
  const earnings = useAgreementStore((s) => s.earnings);
  const summary = useAgreementStore((s) => s.summary);
  const loading = useAgreementStore((s) => s.loading);
  const fetchAgreementById = useAgreementStore((s) => s.fetchAgreementById);
  const fetchEarnings = useAgreementStore((s) => s.fetchEarnings);
  const fetchSummary = useAgreementStore((s) => s.fetchSummary);
  const verifyEarning = useAgreementStore((s) => s.verifyEarning);
  const disputeEarning = useAgreementStore((s) => s.disputeEarning);
  const subscribeToEarnings = useAgreementStore((s) => s.subscribeToEarnings);
  const unsubscribeFromEarnings = useAgreementStore((s) => s.unsubscribeFromEarnings);

  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      subscribeToEarnings(agreementId);
      return () => unsubscribeFromEarnings();
    }, [agreementId])
  );

  const loadData = async () => {
    await Promise.all([
      fetchAgreementById(agreementId),
      fetchEarnings(agreementId, { limit: 10 }),
      fetchSummary(agreementId),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleVerify = async (earningId) => {
    Alert.alert('Confirm', 'Verify this payment was received?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          const { error } = await verifyEarning(earningId);
          if (error) {
            Alert.alert('Error', error.message || 'Could not verify.');
          }
          fetchSummary(agreementId);
        },
      },
    ]);
  };

  const handleDispute = async (earningId, note) => {
    const { error } = await disputeEarning(earningId, note);
    if (error) {
      Alert.alert('Error', error.message || 'Could not submit dispute.');
    }
    fetchSummary(agreementId);
  };

  // Get the other party's name
  const getOtherName = () => {
    if (!activeAgreement) return '';
    if (isOwner) {
      const dp = activeAgreement.driver_profiles;
      const p = dp?.profiles;
      return p ? `${p.firstname} ${p.lastname}` : 'Driver';
    } else {
      const o = activeAgreement.owner;
      return o ? `${o.firstname} ${o.lastname}` : 'Owner';
    }
  };

  // Get terms summary
  const getTermsSummary = () => {
    if (!activeAgreement) return '';
    if (activeAgreement.contract_type === 'daily_target') {
      return `N$${Number(activeAgreement.daily_target_amount).toLocaleString()}/day`;
    }
    if (activeAgreement.contract_type === 'revenue_share') {
      const ownerPct = 100 - Number(activeAgreement.revenue_share_driver_pct);
      return `${ownerPct}/${activeAgreement.revenue_share_driver_pct} split`;
    }
    if (activeAgreement.contract_type === 'rent_to_own') {
      return `N$${Number(activeAgreement.rent_to_own_total).toLocaleString()} total`;
    }
    return '';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{getOtherName()}</Text>
          <Text style={styles.headerSub}>
            {CONTRACT_LABELS[activeAgreement?.contract_type] || ''} · {getTermsSummary()}
          </Text>
        </View>
        {activeAgreement?.status === 'active' && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.section}>
          <SummaryCards
            summary={summary}
            contractType={activeAgreement?.contract_type}
            agreementTerms={activeAgreement}
          />
        </View>

        {/* Recent Entries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EarningsHistory', { agreementId })}
            >
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {earnings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.gray[300]} />
              <Text style={styles.emptyTitle}>No Entries Yet</Text>
              <Text style={styles.emptyText}>
                {isOwner
                  ? 'Waiting for the driver to log their first earnings.'
                  : 'Tap the button below to log your first day.'}
              </Text>
            </View>
          ) : (
            earnings.map((entry) => (
              <EarningEntryCard
                key={entry.id}
                entry={entry}
                isOwner={isOwner}
                onVerify={handleVerify}
                onDispute={handleDispute}
              />
            ))
          )}
        </View>

        {/* Agreement Details */}
        {activeAgreement && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agreement Details</Text>
            <View style={styles.detailsCard}>
              <DetailRow label="Contract Type" value={CONTRACT_LABELS[activeAgreement.contract_type]} />
              {activeAgreement.contract_type === 'daily_target' && (
                <DetailRow label="Daily Target" value={`N$${Number(activeAgreement.daily_target_amount).toLocaleString()}`} />
              )}
              {activeAgreement.contract_type === 'revenue_share' && (
                <>
                  <DetailRow label="Driver's Share" value={`${activeAgreement.revenue_share_driver_pct}%`} />
                  <DetailRow label="Owner's Share" value={`${100 - Number(activeAgreement.revenue_share_driver_pct)}%`} />
                </>
              )}
              {activeAgreement.contract_type === 'rent_to_own' && (
                <>
                  <DetailRow label="Total Amount" value={`N$${Number(activeAgreement.rent_to_own_total).toLocaleString()}`} />
                  {activeAgreement.rent_to_own_target_date && (
                    <DetailRow label="Target Date" value={new Date(activeAgreement.rent_to_own_target_date).toLocaleDateString()} />
                  )}
                </>
              )}
              <DetailRow
                label="Days Off"
                value={activeAgreement.days_off?.length > 0 ? activeAgreement.days_off.join(', ') : 'None'}
              />
              <DetailRow label="Maintenance" value={activeAgreement.maintenance_responsibility === 'owner' ? 'Owner' : 'Driver'} />
              <DetailRow label="Start Date" value={new Date(activeAgreement.start_date).toLocaleDateString()} />
              {activeAgreement.notes && <DetailRow label="Notes" value={activeAgreement.notes} />}
            </View>

            {isOwner && activeAgreement.status === 'active' && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('AgreementSetup', {
                  driverId: activeAgreement.driver_id,
                  driverName: getOtherName(),
                  jobPostId: null,
                  editMode: true,
                  agreementId: activeAgreement.id,
                })}
              >
                <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                <Text style={styles.editBtnText}>Edit Agreement</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Driver FAB: Log Today */}
      {!isOwner && activeAgreement?.status === 'active' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('LogEarnings', { agreementId })}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
          <Text style={styles.fabText}>Log Earnings</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
  },
  activeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.secondary,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  seeAll: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },

  // Details card
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
  },
  detailLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  editBtnText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.lg,
  },
  fabText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
});

export default ManagementDashboardScreen;
