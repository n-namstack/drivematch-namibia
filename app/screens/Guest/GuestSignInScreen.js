import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import PrimaryButton from '../../components/PrimaryButton';

const BENEFITS = [
  { icon: 'briefcase-outline', text: 'Post jobs and hire trusted drivers' },
  { icon: 'chatbubbles-outline', text: 'Message drivers directly' },
  { icon: 'heart-outline', text: 'Save your favourite drivers' },
  { icon: 'star-outline', text: 'Leave reviews and build trust' },
];

const GuestSignInScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="person-add-outline" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          You're browsing as a guest. Sign in to unlock everything DuoLink offers.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.icon} style={styles.benefitRow}>
              <Ionicons name={b.icon} size={22} color={COLORS.primary} />
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          title="Create Account"
          icon="arrow-forward"
          onPress={() => navigation.navigate('Register')}
        />

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>
            Already have an account? <Text style={styles.signInText}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes['3xl'],
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  benefits: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  benefitText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    flex: 1,
  },
  secondaryButton: {
    paddingVertical: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
  signInText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default GuestSignInScreen;
