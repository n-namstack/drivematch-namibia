import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import useAgreementStore, { getBuyoutProgress } from '../../store/useAgreementStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const TYPE_CONFIG = {
  daily_remittance: { label: 'Daily Remittance', color: COLORS.primary,   bg: '#EEF2FF' },
  buyout_contract:  { label: 'Buyout Contract',  color: '#7C3AED',        bg: '#EDE9FE' },
};

const STATUS_CONFIG = {
  pending_signature: { label: 'Awaiting Signature', color: '#D97706', bg: '#FEF3C7' },
  active:            { label: 'Active',              color: '#059669', bg: '#D1FAE5' },
  completed:         { label: 'Completed',           color: COLORS.textSecondary, bg: COLORS.gray[100] },
  terminated:        { label: 'Terminated',          color: COLORS.error, bg: '#FEE2E2' },
};

const AgreementCard = ({ agreement, currentUserId, onPress }) => {
  const isOwner = agreement.owner_id === currentUserId;
  const otherParty = isOwner ? agreement.driver : agreement.owner;
  const otherName = otherParty
    ? `${otherParty.firstname ?? ''} ${otherParty.lastname ?? ''}`.trim()
    : 'Unknown';
  const typeConf   = TYPE_CONFIG[agreement.agreement_type]   || TYPE_CONFIG.daily_remittance;
  const statusConf = STATUS_CONFIG[agreement.status]         || STATUS_CONFIG.active;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Row 1: avatar + name + status */}
      <View style={styles.cardHeader}>
        {otherParty?.profile_image ? (
          <Image source={{ uri: otherParty.profile_image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={18} color={COLORS.gray[400]} />
          </View>
        )}
        <View style={styles.cardMeta}>
          <Text style={styles.cardName}>{otherName}</Text>
          <Text style={styles.cardRole}>{isOwner ? 'Driver' : 'Owner'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusConf.bg }]}>
          <Text style={[styles.badgeText, { color: statusConf.color }]}>{statusConf.label}</Text>
        </View>
      </View>

      {/* Row 2: type chip + vehicle */}
      <View style={styles.cardDetails}>
        <View style={[styles.typeChip, { backgroundColor: typeConf.bg }]}>
          <Text style={[styles.typeChipText, { color: typeConf.color }]}>{typeConf.label}</Text>
        </View>
        {agreement.vehicle_description ? (
          <Text style={styles.vehicle} numberOfLines={1}>{agreement.vehicle_description}</Text>
        ) : null}
      </View>

      {/* Row 3: summary line */}
      {agreement.agreement_type === 'daily_remittance' ? (
        <Text style={styles.summaryLine}>
          N${parseFloat(agreement.daily_amount).toFixed(0)}/day
          {agreement.owner_percentage ? ` • ${agreement.owner_percentage}% driver cut` : ''}
        </Text>
      ) : (
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: '0%' }]} />
          </View>
          <Text style={styles.progressLabel}>
            Target: N${parseFloat(agreement.buyout_target || 0).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Start date */}
      <Text style={styles.dateLabel}>
        Started {new Date(agreement.start_date).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
    </TouchableOpacity>
  );
};

const AgreementsScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const agreements = useAgreementStore((s) => s.agreements);
  const loading    = useAgreementStore((s) => s.loading);
  const fetchAgreements = useAgreementStore((s) => s.fetchAgreements);
  const [tab, setTab] = useState('active');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (profile?.id) await fetchAgreements(profile.id);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Earnings')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 8 }}>
          <Ionicons name="bar-chart-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = agreements.filter((a) =>
    tab === 'active'
      ? a.status === 'active' || a.status === 'pending_signature'
      : a.status === 'completed' || a.status === 'terminated',
  );

  if (loading && agreements.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Tab row */}
      <View style={styles.tabs}>
        {['active', 'ended'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'active' ? 'Active' : 'Ended'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AgreementCard
            agreement={item}
            currentUserId={profile?.id}
            onPress={() => navigation.navigate('AgreementDetail', { agreementId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={56} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>No {tab} agreements</Text>
            <Text style={styles.emptyText}>
              {tab === 'active'
                ? 'Create an agreement from a driver\'s profile.'
                : 'Completed or terminated agreements will appear here.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  tabActive: { backgroundColor: COLORS.white, ...SHADOWS.sm },
  tabText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.text, fontWeight: '700' },

  listContent: { padding: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },

  card: {
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center' },
  cardMeta: { flex: 1 },
  cardName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  cardRole: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },

  cardDetails: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  typeChip: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  typeChipText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  vehicle: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  summaryLine: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: '600', marginBottom: SPACING.xs },

  progressWrap: { marginBottom: SPACING.xs },
  progressBg: { height: 6, backgroundColor: COLORS.gray[100], borderRadius: 3, marginBottom: 4 },
  progressFill: { height: 6, backgroundColor: '#7C3AED', borderRadius: 3 },
  progressLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  dateLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingTop: SPACING['2xl'] * 2, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 20 },
});

export default AgreementsScreen;
