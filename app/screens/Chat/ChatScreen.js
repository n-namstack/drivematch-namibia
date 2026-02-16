import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useChatStore from '../../store/useChatStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { format } from 'date-fns';

const ChatScreen = ({ route, navigation }) => {
  const { conversationId } = route.params;
  const { user, profile } = useAuth();
  const {
    messages,
    currentConversation,
    loading,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchMessages(conversationId);
    markMessagesAsRead(conversationId, user.id, profile.role);

    // Subscribe to real-time updates
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
    // Update navigation header with participant info
    if (currentConversation) {
      const participant = getOtherParticipant();
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitle}>
            {participant.image ? (
              <Image source={{ uri: participant.image }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={16} color={COLORS.gray[400]} />
              </View>
            )}
            <Text style={styles.headerName}>{participant.name}</Text>
          </View>
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

    setSending(true);
    const { error } = await sendMessage(conversationId, user.id, messageText.trim());
    setSending(false);

    if (!error) {
      setMessageText('');
    }
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
              {format(new Date(item.created_at), 'EEEE, MMMM d')}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
          ]}
        >
          {!isOwnMessage && (
            <View style={styles.senderAvatar}>
              {item.sender?.profile_image ? (
                <Image
                  source={{ uri: item.sender.profile_image }}
                  style={styles.avatarSmall}
                />
              ) : (
                <View style={[styles.avatarSmall, styles.placeholderAvatarSmall]}>
                  <Ionicons name="person" size={12} color={COLORS.gray[400]} />
                </View>
              )}
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownMessage : styles.otherMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {item.content}
            </Text>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {format(new Date(item.created_at), 'HH:mm')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.gray[400]}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sending}
        >
          <Ionicons
            name="send"
            size={20}
            color={messageText.trim() ? COLORS.white : COLORS.gray[400]}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  placeholderAvatar: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  senderAvatar: {
    marginRight: SPACING.xs,
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  placeholderAvatarSmall: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  ownMessage: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: SPACING.xs,
  },
  otherMessage: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: SPACING.xs,
    ...SHADOWS.sm,
  },
  messageText: {
    fontSize: FONTS.sizes.md,
    lineHeight: 22,
  },
  ownMessageText: {
    color: COLORS.white,
  },
  otherMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.xs,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: COLORS.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    gap: SPACING.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    maxHeight: 100,
  },
  input: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray[200],
  },
});

export default ChatScreen;
