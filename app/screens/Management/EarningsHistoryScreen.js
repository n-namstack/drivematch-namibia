import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useAgreementStore from '../../store/useAgreementStore';
import agreementService from '../../services/agreementService';
import EarningEntryCard from '../../components/EarningEntryCard';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unverified', label: 'Unverified' },
  { id: 'verified', label: 'Verified' },
  { id: 'disputed', label: 'Disputed' },
];

const EarningsHistoryScreen = ({ route, navigation }) => {
  const { agreementId } = route.params;
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';
  const verifyEarning = useAgreementStore((s) => s.verifyEarning);
  const disputeEarning = useAgreementStore((s) => s.disputeEarning);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthSummary, setMonthSummary] = useState({ earned: 0, paid: 0, count: 0 });

  useEffect(() => {
    fetchData();
  }, [activeFilter, currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      .toISOString().split('T')[0];
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      .toISOString().split('T')[0];

    const options = {
      startDate,
      endDate,
    };
    if (activeFilter !== 'all') {
      options.status = activeFilter;
    }

    const { data, error } = await agreementService.fetchEarnings(agreementId, options);
    if (!error && data) {
      setEntries(data);
      // Calculate month summary
      const earned = data.reduce((sum, e) => sum + Number(e.total_earned), 0);
      const paid = data.reduce((sum, e) => sum + Number(e.amount_paid_to_owner), 0);
      setMonthSummary({ earned, paid, count: data.length });
    }
    setLoading(false);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
          fetchData();
        },
      },
    ]);
  };

  const handleDispute = async (earningId, note) => {
    const { error } = await disputeEarning(earningId, note);
    if (error) {
      Alert.alert('Error', error.message || 'Could not submit dispute.');
    }
    fetchData();
  };

  const renderItem = useCallback(({ item }) => (
    <EarningEntryCard
      entry={item}
      isOwner={isOwner}
      onVerify={handleVerify}
      onDispute={handleDispute}
    />
  ), [isOwner]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={40} color={COLORS.gray[300]} />
        <Text style={styles.emptyTitle}>No Entries</Text>
        <Text style={styles.emptyText}>
          {activeFilter !== 'all'
            ? `No ${activeFilter} entries for ${formatMonth(currentMonth)}.`
            : `No entries logged for ${formatMonth(currentMonth)}.`}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Month Summary */}
      {entries.length > 0 && (
        <View style={styles.monthSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={styles.summaryValue}>N${monthSummary.earned.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={styles.summaryValue}>N${monthSummary.paid.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Days</Text>
            <Text style={styles.summaryValue}>{monthSummary.count}</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{formatMonth(currentMonth)}</Text>
        <TouchableOpacity
          onPress={() => navigateMonth(1)}
          style={styles.monthArrow}
          disabled={
            currentMonth.getMonth() >= new Date().getMonth() &&
            currentMonth.getFullYear() >= new Date().getFullYear()
          }
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              currentMonth.getMonth() >= new Date().getMonth() &&
              currentMonth.getFullYear() >= new Date().getFullYear()
                ? COLORS.gray[300]
                : COLORS.primary
            }
          />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.filterTab, activeFilter === tab.id && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab.id)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === tab.id && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          entries.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  monthArrow: {
    padding: SPACING.sm,
  },
  monthText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 160,
    textAlign: 'center',
  },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },

  // List
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },

  // List header
  listHeader: {
    marginBottom: SPACING.sm,
  },
  monthSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.gray[200],
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
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});

export default EarningsHistoryScreen;
