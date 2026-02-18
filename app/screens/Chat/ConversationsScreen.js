import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useChatStore from '../../store/useChatStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { formatDistanceToNow } from 'date-fns';

const ConversationsScreen = ({ navigation }) => {
  const { user, profile } = useAuth();
  const { conversations, loading, fetchConversations, setCurrentConversation } = useChatStore();

  useEffect(() => {
    if (user?.id && profile?.role) {
      fetchConversations(user.id, profile.role);
    }
  }, [user?.id, profile?.role]);

  const handleRefresh = () => {
    if (user?.id && profile?.role) {
      fetchConversations(user.id, profile.role);
    }
  };

  const handleConversationPress = (conversation) => {
    setCurrentConversation(conversation);
    navigation.navigate('Chat', { conversationId: conversation.id });
  };

  const getOtherParticipant = (conversation) => {
    if (profile?.role === 'owner') {
      // Show driver info
      const driver = conversation.driver;
      const driverProfile = driver?.profiles;
      return {
        name: `${driverProfile?.firstname || ''} ${driverProfile?.lastname || ''}`.trim() || 'Driver',
        image: driverProfile?.profile_image,
      };
    } else {
      // Show owner info
      const owner = conversation.owner;
      return {
        name: `${owner?.firstname || ''} ${owner?.lastname || ''}`.trim() || 'Car Owner',
        image: owner?.profile_image,
      };
    }
  };

  const getUnreadCount = (conversation) => {
    return profile?.role === 'owner'
      ? conversation.owner_unread_count
      : conversation.driver_unread_count;
  };

  const renderConversation = useCallback(
    ({ item }) => {
      const participant = getOtherParticipant(item);
      const unreadCount = getUnreadCount(item);
      const timeAgo = item.last_message_at
        ? formatDistanceToNow(new Date(item.last_message_at), { addSuffix: true })
        : '';

      return (
        <TouchableOpacity
          style={[styles.conversationItem, unreadCount > 0 && styles.unreadItem]}
          onPress={() => handleConversationPress(item)}
        >
          <View style={styles.avatarContainer}>
            {participant.image ? (
              <Image source={{ uri: participant.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={24} color={COLORS.gray[400]} />
              </View>
            )}
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={[styles.participantName, unreadCount > 0 && styles.unreadName]}>
                {participant.name}
              </Text>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.last_message
                ? (item.last_message.sender_id === user?.id ? 'You: ' : '') + item.last_message.content
                : 'Tap to start chatting'}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      );
    },
    [profile?.role]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={COLORS.gray[300]} />
      <Text style={styles.emptyTitle}>No Conversations Yet</Text>
      <Text style={styles.emptyText}>
        {profile?.role === 'owner'
          ? 'Start a conversation by messaging a driver from their profile'
          : 'Car owners will message you when they are interested in hiring you'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  unreadItem: {
    backgroundColor: COLORS.primaryLight + '10',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderAvatar: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  participantName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  unreadName: {
    fontWeight: 'bold',
  },
  timeAgo: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  lastMessage: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
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

export default ConversationsScreen;
