import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useAgreementStore from '../../store/useAgreementStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const fmtMoney = (n) =>
  `N$${parseFloat(n || 0).toLocaleString('en-NA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtMoneyFull = (n) =>
  `N$${parseFloat(n || 0).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Date helpers ──────────────────────────────────────────────────────────────

const isoDate = (d) => d.toISOString().split('T')[0];

// Returns Monday of the ISO week containing d
const weekStart = (d) => {
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
};

const weekLabel = (mondayDate) => {
  const end = new Date(mondayDate);
  end.setDate(end.getDate() + 6);
  const opts = { day: 'numeric', month: 'short' };
  return `${mondayDate.toLocaleDateString('en-NA', opts)}`;
};

const monthKey = (dateStr) => dateStr.slice(0, 7); // "2026-05"
const monthLabel = (key) => {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('en-NA', { month: 'short', year: '2-digit' });
};

// ── Aggregation ───────────────────────────────────────────────────────────────

const buildWeeklyBuckets = (allEntries, isOwner, ownerPct) => {
  const now = new Date();
  const buckets = [];
  for (let i = 7; i >= 0; i--) {
    const mon = weekStart(new Date(now));
    mon.setDate(mon.getDate() - i * 7);
    buckets.push({ key: isoDate(mon), label: weekLabel(mon), total: 0, cut: 0, days: 0 });
  }

  allEntries.forEach((e) => {
    const d = new Date(e.entry_date);
    const mon = weekStart(d);
    const key = isoDate(mon);
    const b = buckets.find((x) => x.key === key);
    if (!b) return;
    const amt = parseFloat(e.amount);
    b.total += amt;
    b.days += 1;
    if (!isOwner && ownerPct) b.cut += amt * (parseFloat(ownerPct) / 100);
  });
  return buckets;
};

const buildMonthlyBuckets = (allEntries, isOwner, ownerPct) => {
  const now = new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(isoDate(d));
    buckets.push({ key, label: monthLabel(key), total: 0, cut: 0, days: 0 });
  }

  allEntries.forEach((e) => {
    const key = monthKey(e.entry_date);
    const b = buckets.find((x) => x.key === key);
    if (!b) return;
    const amt = parseFloat(e.amount);
    b.total += amt;
    b.days += 1;
    if (!isOwner && ownerPct) b.cut += amt * (parseFloat(ownerPct) / 100);
  });
  return buckets;
};

// ── Bar chart ─────────────────────────────────────────────────────────────────

const BarChart = ({ buckets, isOwner }) => {
  const maxVal = Math.max(...buckets.map((b) => b.total), 1);

  return (
    <View style={chart.wrap}>
      {buckets.map((b, i) => {
        const pct = b.total / maxVal;
        const isLast = i === buckets.length - 1;
        return (
          <View key={b.key} style={chart.col}>
            <Text style={chart.valLabel} numberOfLines={1}>
              {b.total > 0 ? fmtMoney(b.total) : ''}
            </Text>
            <View style={chart.barBg}>
              <LinearGradient
                colors={isLast
                  ? [COLORS.primaryDark, COLORS.primary]
                  : ['#93C5FD', '#3B82F6']}
                style={[chart.bar, { height: `${Math.max(pct * 100, b.total > 0 ? 4 : 0)}%` }]}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
              />
            </View>
            <Text style={chart.xLabel} numberOfLines={1}>{b.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

const EarningsScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const agreements   = useAgreementStore((s) => s.agreements);
  const fetchAgreements = useAgreementStore((s) => s.fetchAgreements);
  const fetchAgreement  = useAgreementStore((s) => s.fetchAgreement);

  const [period, setPeriod]       = useState('weekly'); // 'weekly' | 'monthly'
  const [allEntries, setAllEntries] = useState([]);
  const [byAgreement, setByAgreement] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOwner  = profile?.role !== 'driver';
  const isDriver = profile?.role === 'driver';

  const loadData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      await fetchAgreements(profile.id);
      // Fetch entries for each active agreement
      const active = agreements.filter((a) => a.status === 'active');
      const results = await Promise.all(
        active.map(async (a) => {
          const { data } = await supabase_fetch(a.id);
          return { agreement: a, entries: data || [] };
        }),
      );
      const flat = results.flatMap((r) => r.entries);
      setAllEntries(flat);
      setByAgreement(results);
    } finally {
      setLoading(false);
    }
  };

  // Fetch entries directly since fetchAgreement mutates store state
  const supabase_fetch = async (agreementId) => {
    const { default: supabase } = await import('../../lib/supabase');
    return supabase
      .from('agreement_entries')
      .select('*')
      .eq('agreement_id', agreementId);
  };

  useEffect(() => { loadData(); }, [profile?.id]);

  // Re-aggregate when agreements load
  useEffect(() => {
    if (agreements.length === 0) return;
    loadData();
  }, [agreements.length]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  // For driver, find their cut percentage from first daily agreement
  const driverPct = isDriver
    ? agreements.find((a) => a.agreement_type === 'daily_remittance')?.owner_percentage
    : null;

  const buckets = period === 'weekly'
    ? buildWeeklyBuckets(allEntries, isOwner, driverPct)
    : buildMonthlyBuckets(allEntries, isOwner, driverPct);

  const currentBucket = buckets[buckets.length - 1];
  const avgTotal = buckets.reduce((s, b) => s + b.total, 0) / Math.max(buckets.filter((b) => b.total > 0).length, 1);
  const bestBucket = buckets.reduce((best, b) => b.total > best.total ? b : best, buckets[0]);

  const thisMonthTotal = allEntries
    .filter((e) => e.entry_date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, e) => s + parseFloat(e.amount), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary, '#3B82F6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings Analytics</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <SumCard
            label={period === 'weekly' ? 'This Week' : 'This Month'}
            value={fmtMoneyFull(currentBucket?.total)}
            icon="trending-up"
            color={COLORS.primary}
          />
          <SumCard
            label={period === 'weekly' ? 'Avg/Week' : 'Avg/Month'}
            value={fmtMoneyFull(avgTotal)}
            icon="analytics"
            color="#7C3AED"
          />
          <SumCard
            label="This Month"
            value={fmtMoneyFull(thisMonthTotal)}
            icon="calendar"
            color="#059669"
          />
        </View>

        {/* Period toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, period === 'weekly' && styles.toggleActive]}
            onPress={() => setPeriod('weekly')}
          >
            <Text style={[styles.toggleText, period === 'weekly' && styles.toggleTextActive]}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, period === 'monthly' && styles.toggleActive]}
            onPress={() => setPeriod('monthly')}
          >
            <Text style={[styles.toggleText, period === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
          </TouchableOpacity>
        </View>

        {/* Bar chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {period === 'weekly' ? 'Last 8 Weeks' : 'Last 6 Months'}
          </Text>
          {allEntries.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={40} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>No entries yet</Text>
            </View>
          ) : (
            <BarChart buckets={buckets} isOwner={isOwner} />
          )}
          {bestBucket?.total > 0 && (
            <Text style={styles.bestLabel}>
              Best: {bestBucket.label} — {fmtMoneyFull(bestBucket.total)}
            </Text>
          )}
        </View>

        {/* Per-agreement breakdown */}
        {byAgreement.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Agreement</Text>
            {byAgreement.map(({ agreement: a, entries: ents }) => {
              const total = ents.reduce((s, e) => s + parseFloat(e.amount), 0);
              const isDaily = a.agreement_type === 'daily_remittance';
              const cut = isOwner ? 0 : (isDaily ? total * (parseFloat(a.owner_percentage || 0) / 100) : 0);
              const other = isOwner
                ? `${ents.length} entries confirmed`
                : isDaily
                  ? `Your cut: ${fmtMoneyFull(cut)}`
                  : `${ents.length} payments`;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={styles.agCard}
                  onPress={() => navigation.navigate('AgreementDetail', { agreementId: a.id })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.agTypeDot, { backgroundColor: isDaily ? COLORS.primary : '#7C3AED' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agVehicle} numberOfLines={1}>
                      {a.vehicle_description || (isDaily ? 'Daily Remittance' : 'Buyout Contract')}
                    </Text>
                    <Text style={styles.agSub}>{other}</Text>
                  </View>
                  <Text style={styles.agTotal}>{fmtMoneyFull(total)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const SumCard = ({ label, value, icon, color }) => (
  <View style={styles.sumCard}>
    <View style={[styles.sumIconWrap, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={[styles.sumValue, { color }]}>{value}</Text>
    <Text style={styles.sumLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, paddingBottom: SPACING.lg,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },

  summaryRow: {
    flexDirection: 'row', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
  },
  sumCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.sm, alignItems: 'center', ...SHADOWS.sm,
  },
  sumIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  sumValue: { fontSize: FONTS.sizes.sm, fontWeight: '800' },
  sumLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },

  toggleRow: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    backgroundColor: COLORS.gray[100], borderRadius: BORDER_RADIUS.full, padding: 3,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, alignItems: 'center' },
  toggleActive: { backgroundColor: COLORS.white, ...SHADOWS.sm },
  toggleText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.primary },

  chartCard: {
    backgroundColor: COLORS.white, marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.md,
    marginTop: SPACING.md, ...SHADOWS.sm,
  },
  chartTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  emptyChart: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.sm },
  bestLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },

  section: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  agCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  agTypeDot: { width: 10, height: 10, borderRadius: 5 },
  agVehicle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  agSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
  agTotal: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
});

const chart = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 4 },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  valLabel: { fontSize: 8, color: COLORS.primary, fontWeight: '700', marginBottom: 2 },
  barBg: { width: '80%', flex: 1, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: COLORS.gray[100] },
  bar: { width: '100%', borderRadius: 4, minHeight: 2 },
  xLabel: { fontSize: 9, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
});

export default EarningsScreen;
