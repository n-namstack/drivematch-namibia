import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const CODE_LENGTH = 6;

const VerifyEmailScreen = ({ route, navigation }) => {
  const email = route?.params?.email || '';

  const [code, setCode]       = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef(null);

  const maskEmail = (raw) => {
    if (!raw) return '';
    const [local, domain] = raw.split('@');
    if (!domain) return raw;
    const masked = local.length > 2
      ? local[0] + '***' + local[local.length - 1]
      : local[0] + '***';
    return `${masked}@${domain}`;
  };

  useEffect(() => {
    // Auto-focus the hidden input on mount
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) {
      verifyOTP(digits);
    }
  };

  const resendOTP = async () => {
    if (sending || countdown > 0) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setCountdown(60);
      setCode('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not resend code.');
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async (otpCode) => {
    if (verifying) return;
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });
      if (error) throw error;
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Invalid code. Please try again.');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = () => {
    if (code.length !== CODE_LENGTH) {
      Alert.alert('Error', `Please enter the full ${CODE_LENGTH}-digit code`);
      return;
    }
    verifyOTP(code);
  };

  const digits = code.split('');
  const activeIndex = Math.min(digits.length, CODE_LENGTH - 1);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconInner}>
              <Ionicons name="mail-outline" size={40} color={COLORS.primary} />
            </View>
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a {CODE_LENGTH}-digit code to{'\n'}
            <Text style={styles.emailText}>{maskEmail(email)}</Text>
          </Text>

          {/* OTP boxes — tap anywhere to focus the hidden input */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.codeContainer}
          >
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const filled  = i < digits.length;
              const focused = i === activeIndex && !verifying;
              return (
                <View
                  key={i}
                  style={[
                    styles.codeBox,
                    filled  && styles.codeBoxFilled,
                    focused && styles.codeBoxFocused,
                  ]}
                >
                  <Text style={styles.codeDigit}>{digits[i] ?? ''}</Text>
                  {focused && !filled && <View style={styles.cursor} />}
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Hidden input that receives all keyboard/paste input */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            style={styles.hiddenInput}
            caretHidden
          />

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, code.length !== CODE_LENGTH && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={code.length !== CODE_LENGTH || verifying}
          >
            {verifying ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity onPress={resendOTP} disabled={sending}>
                <Text style={styles.resendLink}>{sending ? 'Sending...' : 'Resend Code'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.spamHint}>Check your spam folder if you don't see it</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  backButton: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.primary + '08',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: FONTS.sizes['2xl'], fontWeight: 'bold',
    color: COLORS.text, marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl,
  },
  emailText: { fontWeight: '600', color: COLORS.text },

  codeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  codeBox: {
    width: 46, height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  codeBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  codeBoxFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2.5,
  },
  codeDigit: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  cursor: {
    width: 2, height: 22,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },

  // Hidden behind the boxes — receives all actual input
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },

  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  verifyButtonDisabled: { backgroundColor: COLORS.gray[300] },
  verifyButtonText: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: 'bold' },

  resendRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg },
  resendText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  countdownText: { fontSize: FONTS.sizes.sm, color: COLORS.gray[400], fontWeight: '500' },
  resendLink: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
  spamHint: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400], marginTop: SPACING.md },
});

export default VerifyEmailScreen;
