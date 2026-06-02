import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import useHireOfferStore from '../../store/useHireOfferStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   bg: '#FEF3C7', color: '#D97706' },
  viewed:    { label: 'Viewed',    bg: '#EEF2FF', color: COLORS.primary },
  accepted:  { label: 'Accepted',  bg: '#D1FAE5', color: '#059669' },
  rejected:  { label: 'Declined',  bg: '#FEE2E2', color: COLORS.error },
  withdrawn: { label: 'Withdrawn', bg: COLORS.gray[100], color: COLORS.textSecondary },
};

const JOB_TYPE_LABELS = {
  permanent: 'Permanent',
  temporary: 'Temporary',
  contract:  'Contract',
};

const OfferCard = ({ offer, onRespond }) => {
  const [responding, setResponding] = useState(false);
  const status = STATUS_CONFIG[offer.status] || STATUS_CONFIG.pending;
  const ownerName = offer.owner
    ? `${offer.owner.firstname ?? ''} ${offer.owner.lastname ?? ''}`.trim()
    : 'Unknown Owner';

  const handleRespond = async (newStatus) => {
    setResponding(true);
    await onRespond(offer.id, newStatus);
    setResponding(false);
  };

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        {offer.owner?.profile_image ? (
          <Image source={{ uri: offer.owner.profile_image }} style={styles.ownerAvatar} />
        ) : (
          <View style={[styles.ownerAvatar, styles.avatarFallback]}>
            <Ionicons name="person" size={18} color={COLORS.gray[400]} />
          </View>
        )}
        <View style={styles.cardHeaderMeta}>
          <Text style={styles.ownerName}>{ownerName}</Text>
          <Text style={styles.cardDate}>
            {new Date(offer.created_at).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Offer details */}
      <Text style={styles.offerTitle}>{offer.title}</Text>

      <View style={styles.chips}>
        {offer.job_type && (
          <View style={styles.chip}>
            <Ionicons name="briefcase-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.chipText}>{JOB_TYPE_LABELS[offer.job_type] ?? offer.job_type}</Text>
          </View>
        )}
        {offer.start_date && (
          <View style={styles.chip}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.chipText}>Starts {offer.start_date}</Text>
          </View>
        )}
      </View>

      {offer.message ? (
        <Text style={styles.offerMessage} numberOfLines={3}>{offer.message}</Text>
      ) : null}

      {/* Action buttons — only for pending offers */}
      {offer.status === 'pending' && (
        <View style={styles.actions}>
          {responding ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SPACING.sm }} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleRespond('accepted')}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.white} />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => handleRespond('rejected')}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={16} color={COLORS.error} />
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const MyOffersScreen = () => {
  const { profile } = useAuth();
  const receivedOffers = useHireOfferStore((s) => s.receivedOffers);
  const loading = useHireOfferStore((s) => s.loading);
  const fetchReceivedOffers = useHireOfferStore((s) => s.fetchReceivedOffers);
  const respondToOffer = useHireOfferStore((s) => s.respondToOffer);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (profile?.id) await fetchReceivedOffers(profile.id);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRespond = async (offerId, status) => {
    try {
      await respondToOffer(offerId, status);
      Toast.show({
        type: 'success',
        text1: status === 'accepted' ? 'Offer Accepted!' : 'Offer Declined',
        text2: status === 'accepted'
          ? 'The owner has been notified.'
          : 'The owner has been notified.',
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong', text2: 'Please try again.' });
    }
  };

  if (loading && receivedOffers.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={receivedOffers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OfferCard offer={item} onRespond={handleRespond} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={56} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>No offers yet</Text>
            <Text style={styles.emptyText}>
              When an owner sends you a hire offer, it will appear here.
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
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xl },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  ownerAvatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderMeta: { flex: 1 },
  ownerName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  cardDate: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },

  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },

  offerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  chips: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  chipText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  offerMessage: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SPACING.xs,
  },

  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: BORDER_RADIUS.lg,
  },
  acceptBtn: { backgroundColor: COLORS.primary },
  acceptBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },
  declineBtn: { backgroundColor: '#FEE2E2' },
  declineBtnText: { color: COLORS.error, fontWeight: '700', fontSize: FONTS.sizes.sm },

  emptyState: { alignItems: 'center', paddingTop: SPACING['2xl'] * 2, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 20 },
});

export default MyOffersScreen;
