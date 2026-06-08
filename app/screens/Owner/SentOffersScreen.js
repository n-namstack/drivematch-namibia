import { memo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import useHireOfferStore from '../../store/useHireOfferStore';
import useAgreementStore from '../../store/useAgreementStore';
import { SkeletonCard } from '../../components/SkeletonLoader';
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

const SentOfferCard = memo(({ offer, agreementId, hadPriorAgreement, onWithdraw, onCreateAgreement, onViewAgreement }) => {
  const [acting, setActing] = useState(false);
  const status = STATUS_CONFIG[offer.status] || STATUS_CONFIG.pending;
  const driverName = offer.driver
    ? `${offer.driver.firstname ?? ''} ${offer.driver.lastname ?? ''}`.trim()
    : 'Unknown Driver';

  const handleWithdraw = useCallback(() => {
    Alert.alert('Withdraw Offer', 'Are you sure you want to withdraw this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          setActing(true);
          await onWithdraw(offer.id);
          setActing(false);
        },
      },
    ]);
  }, [offer.id, onWithdraw]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {offer.driver?.profile_image ? (
          <Image
            source={{ uri: offer.driver.profile_image }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={18} color={COLORS.gray[400]} />
          </View>
        )}
        <View style={styles.cardHeaderMeta}>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.cardDate}>
            {new Date(offer.created_at).toLocaleDateString('en-NA', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.offerTitle}>{offer.title}</Text>

      <View style={styles.chips}>
        {offer.job_type ? (
          <View style={styles.chip}>
            <Ionicons name="briefcase-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.chipText}>{JOB_TYPE_LABELS[offer.job_type] ?? offer.job_type}</Text>
          </View>
        ) : null}
        {offer.start_date ? (
          <View style={styles.chip}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.chipText}>Starts {offer.start_date}</Text>
          </View>
        ) : null}
      </View>

      {offer.message ? (
        <Text style={styles.offerMessage} numberOfLines={3}>{offer.message}</Text>
      ) : null}

      {acting ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SPACING.sm }} />
      ) : (
        <>
          {offer.status === 'pending' && (
            <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw} activeOpacity={0.85}>
              <Ionicons name="close-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.withdrawBtnText}>Withdraw Offer</Text>
            </TouchableOpacity>
          )}
          {offer.status === 'accepted' && (
            agreementId ? (
              <TouchableOpacity
                style={[styles.agreementBtn, { backgroundColor: '#059669' }]}
                onPress={() => onViewAgreement(agreementId)}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text" size={16} color={COLORS.white} />
                <Text style={styles.agreementBtnText}>View Agreement</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.agreementBtn}
                onPress={() => onCreateAgreement(offer)}
                activeOpacity={0.85}
              >
                <Ionicons name={hadPriorAgreement ? 'refresh-outline' : 'document-text-outline'} size={16} color={COLORS.white} />
                <Text style={styles.agreementBtnText}>{hadPriorAgreement ? 'New Agreement' : 'Create Agreement'}</Text>
              </TouchableOpacity>
            )
          )}
        </>
      )}
    </View>
  );
});

const CARD_HEIGHT = 180;

const SentOffersScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const sentOffers = useHireOfferStore((s) => s.sentOffers);
  const loading = useHireOfferStore((s) => s.loading);
  const fetchSentOffers = useHireOfferStore((s) => s.fetchSentOffers);
  const withdrawOffer = useHireOfferStore((s) => s.withdrawOffer);
  const agreements = useAgreementStore((s) => s.agreements);
  const fetchAgreements = useAgreementStore((s) => s.fetchAgreements);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (profile?.id) await Promise.all([fetchSentOffers(profile.id), fetchAgreements(profile.id)]);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activeAgreementByDriver = new Map(
    agreements
      .filter((a) => a.status === 'active' || a.status === 'pending_signature')
      .map((a) => [a.driver_id, a.id]),
  );
  const pastAgreementDriverIds = new Set(
    agreements
      .filter((a) => a.status === 'terminated' || a.status === 'completed')
      .map((a) => a.driver_id),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleWithdraw = useCallback(async (offerId) => {
    try {
      await withdrawOffer(offerId);
      Toast.show({ type: 'success', text1: 'Offer Withdrawn' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to withdraw', text2: 'Please try again.' });
    }
  }, [withdrawOffer]);

  const handleCreateAgreement = useCallback((offer) => {
    const driverName = offer.driver
      ? `${offer.driver.firstname ?? ''} ${offer.driver.lastname ?? ''}`.trim()
      : '';
    navigation.navigate('CreateAgreement', {
      driverId: offer.driver_id,
      driverName,
      driverImage: offer.driver?.profile_image ?? null,
    });
  }, [navigation]);

  const handleViewAgreement = useCallback((id) => {
    navigation.navigate('AgreementDetail', { agreementId: id });
  }, [navigation]);

  const keyExtractor = useCallback((item) => item.id, []);

  const getItemLayout = useCallback((_, index) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  }), []);

  const renderItem = useCallback(({ item }) => (
    <SentOfferCard
      offer={item}
      agreementId={activeAgreementByDriver.get(item.driver_id) ?? null}
      hadPriorAgreement={pastAgreementDriverIds.has(item.driver_id)}
      onWithdraw={handleWithdraw}
      onCreateAgreement={handleCreateAgreement}
      onViewAgreement={handleViewAgreement}
    />
  ), [activeAgreementByDriver, pastAgreementDriverIds, handleWithdraw, handleCreateAgreement, handleViewAgreement]);

  if (loading && sentOffers.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.skeletonContent}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={sentOffers}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        windowSize={5}
        maxToRenderPerBatch={8}
        initialNumToRender={6}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="paper-plane-outline" size={56} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>No offers sent yet</Text>
            <Text style={styles.emptyText}>
              Find a driver and tap "Hire Directly" to send your first offer.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  skeletonContent: { padding: SPACING.lg },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xl },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center' },
  cardHeaderMeta: { flex: 1 },
  driverName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  cardDate: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  statusText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },

  offerTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  chips: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.gray[100], borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  chipText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  offerMessage: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    lineHeight: 20, marginTop: SPACING.xs,
  },

  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: SPACING.md, paddingVertical: 11, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FEE2E2',
  },
  withdrawBtnText: { color: COLORS.error, fontWeight: '700', fontSize: FONTS.sizes.sm },

  agreementBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: SPACING.md, paddingVertical: 11, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#7C3AED',
  },
  agreementBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },

  emptyState: { alignItems: 'center', paddingTop: SPACING['2xl'] * 2, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md },
  emptyText: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    textAlign: 'center', marginTop: SPACING.sm, lineHeight: 20,
  },
});

export default SentOffersScreen;
