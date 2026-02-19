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

const VerifyEmailScreen = ({ route, navigation }) => {
  const email = route?.params?.email || '';

  const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(60); // Email was just sent on signup
  const inputRefs = useRef([]);

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
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const resendOTP = async () => {
    if (sending || countdown > 0) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      setCountdown(60);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not resend code.');
    } finally {
      setSending(false);
    }
  };

  const handleCodeChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 8 digits entered
    if (digit && index === 7) {
      const fullCode = newCode.join('');
      if (fullCode.length === 8) {
        verifyOTP(fullCode);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
      // Success — session is created automatically.
      // onAuthStateChange in AuthContext picks it up and navigates to the main app.
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = () => {
    const fullCode = code.join('');
    if (fullCode.length !== 8) {
      Alert.alert('Error', 'Please enter the full 8-digit code');
      return;
    }
    verifyOTP(fullCode);
  };

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
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconInner}>
              <Ionicons name="mail-outline" size={40} color={COLORS.primary} />
            </View>
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to{'\n'}
            <Text style={styles.emailText}>{maskEmail(email)}</Text>
          </Text>

          {/* OTP Input */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.codeInput, digit && styles.codeInputFilled]}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, code.join('').length !== 8 && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={code.join('').length !== 8 || verifying}
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

          {/* Check spam hint */}
          <Text style={styles.spamHint}>Check your spam folder if you don't see it</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
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
    padding: SPACING.sm,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary + '08',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  emailText: {
    fontWeight: '600',
    color: COLORS.text,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  codeInput: {
    width: 40,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    ...SHADOWS.sm,
  },
  codeInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  verifyButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  verifyButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  resendText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  countdownText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
    fontWeight: '500',
  },
  resendLink: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  spamHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
    marginTop: SPACING.md,
  },
});

export default VerifyEmailScreen;
