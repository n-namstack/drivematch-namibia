import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useModerationStore from '../../store/useModerationStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const BlockedUsersScreen = () => {
  const { user } = useAuth();
  const blockedUsers = useModerationStore((s) => s.blockedUsers);
  const fetchBlocked = useModerationStore((s) => s.fetchBlocked);
  const unblockUser = useModerationStore((s) => s.unblockUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (user?.id) await fetchBlocked(user.id);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const handleUnblock = (item) => {
    const name = `${item.blocked?.firstname || ''} ${item.blocked?.lastname || ''}`.trim() || 'this user';
    Alert.alert(
      `Unblock ${name}?`,
      'Their content will appear in your feed again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            const { error } = await unblockUser(user.id, item.blocked_id);
            if (error) Alert.alert('Error', 'Could not unblock. Please try again.');
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const name = `${item.blocked?.firstname || ''} ${item.blocked?.lastname || ''}`.trim() || 'User';
    return (
      <View style={styles.row}>
        {item.blocked?.profile_image ? (
          <Image source={{ uri: item.blocked.profile_image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Ionicons name="person" size={22} color={COLORS.gray[400]} />
          </View>
        )}
        <Text style={styles.name}>{name}</Text>
        <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(item)}>
          <Text style={styles.unblockText}>Unblock</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
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
        data={blockedUsers}
        keyExtractor={(item) => item.blocked_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="ban-outline" size={56} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyText}>
              People you block won't appear in your feed or be able to reach you.
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
  listContent: { padding: SPACING.lg, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: SPACING.md },
  placeholder: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '500', color: COLORS.text },
  unblockBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  unblockText: { color: COLORS.primary, fontWeight: '600', fontSize: FONTS.sizes.sm },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
});

export default BlockedUsersScreen;
