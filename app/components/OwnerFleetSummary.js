import { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { toLocalISODate } from '../utils/dates';

export const localIsoDate = toLocalISODate;

const money = (n) => `N$${Math.round(n).toLocaleString('en-NA')}`;

// Mirrors the shortfall rules in AgreementDetailScreen (today excluded; rejected day off owes full daily)
const outstandingFor = (e, dailyAmount, today) => {
  if (dailyAmount <= 0 || e.entry_date === today) return 0;
  const paid = parseFloat(e.shortfall_paid || 0);
  if (e.dayoff_status === 'rejected') return Math.max(0, dailyAmount - paid);
  const amt = parseFloat(e.amount);
  if (amt <= 0) return 0;
  return Math.max(0, dailyAmount - amt - paid);
};

export const summarizeAgreement = (agreement, entries) => {
  const today = localIsoDate();
  const monthStart = today.slice(0, 8) + '01';
  const dailyAmount = parseFloat(agreement.daily_amount || 0);
  const mine = entries.filter((e) => e.agreement_id === agreement.id);

  const todayEntry = mine.find((e) => e.entry_date === today);
  const monthCollected = mine
    .filter((e) => e.entry_date >= monthStart)
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const toConfirm = mine.filter(
    (e) => !e.owner_confirmed_at && e.dayoff_status !== 'pending' && parseFloat(e.amount) > 0,
  );
  const dayOffRequests = mine.filter((e) => e.dayoff_status === 'pending');
  const shortfall = mine.reduce((s, e) => s + outstandingFor(e, dailyAmount, today), 0);

  return { todayEntry, monthCollected, toConfirm, dayOffRequests, shortfall, dailyAmount };
};

const TodayChip = ({ entry, dailyAmount }) => {
  if (!entry) {
    return (
      <View style={[styles.chip, { backgroundColor: COLORS.gray[100] }]}>
        <Ionicons name="time-outline" size={12} color={COLORS.gray[500]} />
        <Text style={[styles.chipText, { color: COLORS.gray[600] }]}>Not logged yet</Text>
      </View>
    );
  }
  if (entry.dayoff_status) {
    return (
      <View style={[styles.chip, { backgroundColor: COLORS.infoLight }]}>
        <Ionicons name="bed-outline" size={12} color={COLORS.primary} />
        <Text style={[styles.chipText, { color: COLORS.primary }]}>Day off</Text>
      </View>
    );
  }
  const amt = parseFloat(entry.amount);
  const short = dailyAmount > 0 && amt < dailyAmount;
  return (
    <View style={[styles.chip, { backgroundColor: short ? COLORS.warningLight : COLORS.successLight }]}>
      <Ionicons
        name={short ? 'alert-circle' : 'checkmark-circle'}
        size={12}
        color={short ? COLORS.accentDark : COLORS.secondary}
      />
      <Text style={[styles.chipText, { color: short ? COLORS.accentDark : COLORS.secondaryDark }]}>
        Today {money(amt)}
      </Text>
    </View>
  );
};

const DriverRow = ({ agreement, summary, onPress }) => {
  const d = agreement.driver;
  const name = d ? `${d.firstname || ''} ${d.lastname || ''}`.trim() : 'Driver';
  const pending = summary.toConfirm.length + summary.dayOffRequests.length;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      {d?.profile_image ? (
        <Image source={{ uri: d.profile_image }} style={styles.avatar} cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.chipRow}>
          <TodayChip entry={summary.todayEntry} dailyAmount={summary.dailyAmount} />
          {summary.shortfall > 0 && (
            <View style={[styles.chip, { backgroundColor: COLORS.errorLight }]}>
              <Text style={[styles.chipText, { color: COLORS.error }]}>
                {money(summary.shortfall)} owed
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.monthValue}>{money(summary.monthCollected)}</Text>
        <Text style={styles.monthLabel}>this month</Text>
        {pending > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pending} to review</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const OwnerFleetSummary = ({ agreements, entries, onOpenAgreement }) => {
  const summaries = useMemo(
    () => agreements.map((a) => ({ agreement: a, summary: summarizeAgreement(a, entries) })),
    [agreements, entries],
  );

  if (summaries.length === 0) return null;

  const totals = summaries.reduce(
    (t, { summary: s }) => ({
      confirm: t.confirm + s.toConfirm.length,
      dayOff: t.dayOff + s.dayOffRequests.length,
    }),
    { confirm: 0, dayOff: 0 },
  );
  const firstNeedingAction = summaries.find(
    ({ summary: s }) => s.toConfirm.length + s.dayOffRequests.length > 0,
  );

  return (
    <View>
      {firstNeedingAction && (
        <TouchableOpacity
          style={styles.attention}
          activeOpacity={0.85}
          onPress={() => onOpenAgreement(firstNeedingAction.agreement.id)}
        >
          <View style={styles.attentionIcon}>
            <Ionicons name="notifications" size={18} color={COLORS.accentDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.attentionTitle}>Needs your attention</Text>
            <Text style={styles.attentionSub}>
              {[
                totals.confirm > 0 && `${totals.confirm} ${totals.confirm === 1 ? 'payment' : 'payments'} to confirm`,
                totals.dayOff > 0 && `${totals.dayOff} day-off ${totals.dayOff === 1 ? 'request' : 'requests'}`,
              ].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.accentDark} />
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        {summaries.map(({ agreement, summary }, i) => (
          <View key={agreement.id}>
            {i > 0 && <View style={styles.divider} />}
            <DriverRow
              agreement={agreement}
              summary={summary}
              onPress={() => onOpenAgreement(agreement.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  attention: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.warningLight,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  attentionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attentionTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.gray[900] },
  attentionSub: { fontSize: FONTS.sizes.xs, color: COLORS.gray[700], marginTop: 2 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.sm,
  },
  divider: { height: 1, backgroundColor: COLORS.gray[100] },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.sm },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: COLORS.infoLight, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  name: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  rowRight: { alignItems: 'flex-end' },
  monthValue: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  monthLabel: { fontSize: 11, color: COLORS.textSecondary },
  pendingBadge: {
    marginTop: 4,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
});

export default memo(OwnerFleetSummary);
