import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useChatStore from '../../store/useChatStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { format, isToday, isYesterday } from 'date-fns';
import ReportModal from '../../components/ReportModal';

const ChatScreen = ({ route, navigation }) => {
  const { conversationId } = route.params;
  const { user, profile } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const {
    messages,
    currentConversation,
    loading,
    fetchMessages,
    fetchConversationById,
    sendMessage,
    markMessagesAsRead,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      // Fetch conversation details if not already loaded
      if (!currentConversation || currentConversation.id !== conversationId) {
        await fetchConversationById(conversationId);
      }
      await fetchMessages(conversationId);
      markMessagesAsRead(conversationId, user.id, profile.role);
    };
    init();

    const subscription = subscribeToMessages(conversationId, (newMessage) => {
      if (newMessage.sender_id !== user.id) {
        markMessagesAsRead(conversationId, user.id, profile.role);
      }
    });

    return () => {
      unsubscribeFromMessages();
    };
  }, [conversationId]);

  useEffect(() => {
    if (currentConversation) {
      const participant = getOtherParticipant();
      navigation.setOptions({
        headerTitle: () => (
          <TouchableOpacity
            style={styles.headerTitle}
            activeOpacity={0.7}
            onPress={() => {
              if (profile?.role === 'owner' && currentConversation?.driver?.id) {
                navigation.navigate('DriverDetails', { driverId: currentConversation.driver.id });
              }
            }}
          >
            {participant.image ? (
              <Image source={{ uri: participant.image }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                <Text style={styles.headerAvatarInitial}>
                  {(participant.name || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.headerName}>{participant.name}</Text>
            </View>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity onPress={() => setShowReport(true)} style={{ padding: SPACING.sm }}>
            <Ionicons name="flag-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        ),
      });
    }
  }, [currentConversation]);

  const getOtherParticipant = () => {
    if (!currentConversation) return { name: 'Chat', image: null };

    if (profile?.role === 'owner') {
      const driver = currentConversation.driver;
      const driverProfile = driver?.profiles;
      return {
        name: `${driverProfile?.firstname || ''} ${driverProfile?.lastname || ''}`.trim() || 'Driver',
        image: driverProfile?.profile_image,
      };
    } else {
      const owner = currentConversation.owner;
      return {
        name: `${owner?.firstname || ''} ${owner?.lastname || ''}`.trim() || 'Car Owner',
        image: owner?.profile_image,
      };
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    const { error } = await sendMessage(conversationId, user.id, text);
    if (error) {
      setMessageText(text);
      Alert.alert('Send Failed', error.message || 'Could not send your message. Please try again.');
    }

    setSending(false);
  };

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d');
  };

  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.sender_id === user.id;
    const showDate =
      index === 0 ||
      new Date(item.created_at).toDateString() !==
        new Date(messages[index - 1].created_at).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {formatDateLabel(item.created_at)}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageRow,
            isOwnMessage ? styles.ownMessageRow : styles.otherMessageRow,
          ]}
        >
          {!isOwnMessage && (
            <View style={styles.senderAvatarContainer}>
              {item.sender?.profile_image ? (
                <Image source={{ uri: item.sender.profile_image }} style={styles.avatarSmall} />
              ) : (
                <View style={[styles.avatarSmall, styles.placeholderAvatarSmall]}>
                  <Text style={styles.avatarInitialSmall}>
                    {(item.sender?.firstname || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownBubble : styles.otherBubble,
            ]}
          >
            <Text style={[styles.messageText, isOwnMessage ? styles.ownText : styles.otherText]}>
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isOwnMessage ? styles.ownTime : styles.otherTime]}>
                {format(new Date(item.created_at), 'HH:mm')}
              </Text>
              {isOwnMessage && (
                <Ionicons
                  name={item.is_read ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={item.is_read ? COLORS.info : COLORS.white + '80'}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyChat}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }
    return (
      <View style={styles.emptyChat}>
        <View style={styles.emptyChatIcon}>
          <View style={styles.emptyChatIconInner}>
            <Ionicons name="chatbubbles-outline" size={32} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.emptyChatTitle}>Start a conversation</Text>
        <Text style={styles.emptyChatText}>
          Send a message to get connected
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: hasScrolledRef.current });
            hasScrolledRef.current = true;
          }
        }}
        ListEmptyComponent={renderEmpty}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor={COLORS.gray[400]}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, messageText.trim() && styles.sendButtonActive]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons
                name="arrow-up"
                size={20}
                color={messageText.trim() ? COLORS.white : COLORS.gray[400]}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={
          currentConversation
            ? profile?.role === 'owner'
              ? currentConversation.driver?.user_id
              : currentConversation.owner_id
            : null
        }
        reportedUserName={getOtherParticipant().name}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarPlaceholder: {
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  headerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerOnlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
  },
  headerStatus: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.secondary,
    fontWeight: '500',
  },

  // Messages List
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },

  // Date Separator
  dateSeparator: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },

  // Message Rows
  messageRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs + 2,
    alignItems: 'flex-end',
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },

  // Sender Avatar
  senderAvatarContainer: {
    marginRight: SPACING.xs,
    marginBottom: 2,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  placeholderAvatarSmall: {
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialSmall: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Message Bubbles
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.xl + 4,
  },
  ownBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: BORDER_RADIUS.sm + 2,
  },
  otherBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: BORDER_RADIUS.sm + 2,
  },
  messageText: {
    fontSize: FONTS.sizes.md,
    lineHeight: 21,
  },
  ownText: {
    color: COLORS.white,
  },
  otherText: {
    color: COLORS.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 3,
  },
  messageTime: {
    fontSize: FONTS.sizes.xs - 2,
  },
  ownTime: {
    color: COLORS.white + '8C',
  },
  otherTime: {
    color: COLORS.textLight,
  },

  // Empty State
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyChatIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '08',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyChatIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyChatText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Input
  inputContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.xl + 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    paddingHorizontal: SPACING.md,
    maxHeight: 120,
  },
  input: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    paddingVertical: SPACING.sm + 2,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary,
  },
});

export default ChatScreen;
