import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const WelcomeScreen = ({ navigation }) => {
  const { continueAsGuest } = useAuth();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo & Branding */}
        <View style={styles.brandSection}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.appName}>DuoLink</Text>
          <Text style={styles.tagline}>
            Namibia's trusted driver marketplace
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              Already have an account? <Text style={styles.signInText}>Sign In</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={continueAsGuest}
            activeOpacity={0.7}
          >
            <Text style={styles.guestButtonText}>Browse as guest</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING.lg,
  },
  brandSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
    marginBottom: SPACING.lg,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsSection: {
    gap: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: SPACING.sm,
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
  guestButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  guestButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
});

export default WelcomeScreen;
