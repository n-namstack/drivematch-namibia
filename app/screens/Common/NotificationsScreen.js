import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { formatDistanceToNow } from 'date-fns';

const NOTIFICATION_ICONS = {
  message: { name: 'chatbubble', color: COLORS.primary },
  review: { name: 'star', color: COLORS.accent },
  verification: { name: 'shield-checkmark', color: COLORS.secondary },
  engagement: { name: 'heart', color: COLORS.error },
  system: { name: 'information-circle', color: COLORS.info },
};

const NotificationsScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) {
      setNotifications(data || []);
    }
    setLoading(false);

    // Mark all as read in background (don't block UI)
    if (!error && data?.some((n) => !n.is_read)) {
      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .then();
    }
  };

  const handleNotificationPress = (notification) => {
    const data = notification.data;
    if (notification.type === 'message' && data?.conversation_id) {
      navigation.navigate('Chat', { conversationId: data.conversation_id });
    } else if (notification.type === 'verification') {
      navigation.navigate('DocumentUpload');
    }
  };

  const renderItem = useCallback(({ item }) => {
    const iconConfig = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.system;
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.notifIcon, { backgroundColor: iconConfig.color + '12' }]}>
          <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notifTime}>{timeAgo}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  }, []);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="notifications-outline" size={40} color={COLORS.gray[300]} />
        </View>
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptyText}>
          You're all caught up! We'll notify you when there's something new.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          notifications.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchNotifications} />
        }
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  list: { paddingHorizontal: SPACING.lg },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    gap: SPACING.md, ...SHADOWS.sm,
  },
  notifCardUnread: { backgroundColor: COLORS.primary + '05', borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  notifIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  notifMessage: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: 19 },
  notifTime: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: SPACING.xs },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.gray[100],
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.text },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
});

export default NotificationsScreen;
