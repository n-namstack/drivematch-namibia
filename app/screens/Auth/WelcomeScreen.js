import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Top Section */}
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="car-sport" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>NamDriver</Text>
          <Text style={styles.tagline}>
            Find trusted, verified drivers{'\n'}for your vehicle in Namibia
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Verified Drivers</Text>
              <Text style={styles.featureDesc}>License & background checked</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={22} color={COLORS.accent} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Trusted Reviews</Text>
              <Text style={styles.featureDesc}>Real ratings from car owners</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="chatbubbles" size={22} color={COLORS.secondary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Direct Messaging</Text>
              <Text style={styles.featureDesc}>Connect and hire instantly</Text>
            </View>
          </View>
        </View>

        {/* Buttons Section */}
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
  topSection: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  appName: {
    fontSize: 32,
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
  featuresSection: {
    gap: SPACING.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
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
});

export default WelcomeScreen;
