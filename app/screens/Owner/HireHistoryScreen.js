import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useDriverStore from '../../store/useDriverStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { formatDistanceToNow } from 'date-fns';

const HireHistoryScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const { fetchContactedDrivers } = useDriverStore();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await fetchContactedDrivers(profile?.id);
    setConversations(data);
    setLoading(false);
  };

  const renderItem = useCallback(({ item }) => {
    const driver = item.driver;
    const driverProfile = driver?.profiles;
    const fullName = `${driverProfile?.firstname || ''} ${driverProfile?.lastname || ''}`.trim() || 'Driver';
    const isVerified = driver?.verification_status === 'verified';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DriverDetails', { driverId: driver.id })}
      >
        <View style={styles.avatarContainer}>
          {driverProfile?.profile_image ? (
            <Image source={{ uri: driverProfile.profile_image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(driverProfile?.firstname || 'D')[0].toUpperCase()}
              </Text>
            </View>
          )}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={10} color={COLORS.white} />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.driverName}>{fullName}</Text>
          <View style={styles.metaRow}>
            {driverProfile?.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{driverProfile.location}</Text>
              </View>
            )}
            {driver?.rating > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={12} color={COLORS.accent} />
                <Text style={styles.metaText}>{driver.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>
            Last contacted {formatDistanceToNow(new Date(item.last_message_at), { addSuffix: true })}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
          >
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="time-outline" size={40} color={COLORS.gray[300]} />
        </View>
        <Text style={styles.emptyTitle}>No History Yet</Text>
        <Text style={styles.emptyText}>
          Drivers you message will appear here for easy reconnecting
        </Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.searchButtonText}>Find Drivers</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hire History</Text>
        <View style={{ width: 24 }} />
      </View>

      {conversations.length > 0 && (
        <Text style={styles.countText}>
          {conversations.length} driver{conversations.length !== 1 ? 's' : ''} contacted
        </Text>
      )}

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          conversations.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadHistory} />
        }
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  countText: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  list: { paddingHorizontal: SPACING.lg },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    gap: SPACING.md, ...SHADOWS.sm,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.primary },
  verifiedBadge: {
    position: 'absolute', bottom: -1, right: -1, backgroundColor: COLORS.secondary,
    borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  cardInfo: { flex: 1 },
  driverName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  metaRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  timeText: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  messageBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary + '10', justifyContent: 'center', alignItems: 'center',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.gray[100],
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.text },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  searchButton: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg, marginTop: SPACING.lg,
  },
  searchButtonText: { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.md },
});

export default HireHistoryScreen;
