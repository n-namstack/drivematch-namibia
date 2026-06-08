import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const ResetPasswordScreen = ({ navigation }) => {
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const handleReset = async () => {
    if (password.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password updated', 'Your password has been changed. Please sign in.', [
        {
          text: 'OK',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
          },
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="lock-open-outline" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>
          Choose a strong password for your account.
        </Text>

        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={COLORS.gray[400]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.gray[400]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={COLORS.gray[400]}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator size="small" color={COLORS.white} />
            : <Text style={styles.btnText}>Update Password</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, paddingHorizontal: SPACING.lg, justifyContent: 'center' },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes['2xl'], fontWeight: 'bold',
    color: COLORS.text, textAlign: 'center', marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: SPACING.xl,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    gap: SPACING.sm, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  input: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.text, paddingVertical: SPACING.sm },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 15, alignItems: 'center', marginTop: SPACING.sm,
  },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
});

export default ResetPasswordScreen;
