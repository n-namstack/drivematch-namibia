import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const FEATURES = [
  {
    icon: 'people-outline',
    color: COLORS.primary,
    bg: '#EEF2FF',
    title: 'Hire Verified Drivers',
    body: 'Browse trusted, rated drivers in your area and send direct hire offers.',
  },
  {
    icon: 'document-text-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
    title: 'Smart Agreements',
    body: 'Log daily earnings digitally. Owner and driver both confirm — no paperwork.',
  },
  {
    icon: 'briefcase-outline',
    color: COLORS.accent,
    bg: '#FEF3C7',
    title: 'Any Job, Your Terms',
    body: 'Daily remittance or buyout contracts — full-time, part-time, or weekends.',
  },
  {
    icon: 'bar-chart-outline',
    color: '#0891B2',
    bg: '#E0F2FE',
    title: 'Track Every Cent',
    body: 'Full earnings analytics for drivers and owners, always in sync.',
  },
];

const HOW_IT_WORKS = [
  { step: '1', label: 'Post a job or browse drivers' },
  { step: '2', label: 'Send or accept a hire offer' },
  { step: '3', label: 'Log daily earnings together' },
];

const GuestHomeScreen = ({ navigation }) => {
  const { continueAsGuest } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Hero ── */}
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary, '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Decorative blobs */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          {/* Brand chip */}
          <View style={styles.brandChip}>
            <Ionicons name="car-sport" size={14} color={COLORS.white} />
            <Text style={styles.brandChipText}>DriveMatch Namibia</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>
            Hire drivers.{'\n'}Log agreements.{'\n'}Earn smarter.
          </Text>
          <Text style={styles.subline}>
            Namibia's platform for car owners and drivers — hire, agree, and track earnings all in one place.
          </Text>

          {/* CTAs */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Get Started — It's Free</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.75}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Feature Cards ── */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>WHY DRIVEMATCH</Text>
          <Text style={styles.sectionTitle}>Everything you need</Text>

          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <View style={[styles.featureIconBg, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon} size={24} color={f.color} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── How It Works ── */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>THE PROCESS</Text>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.stepsCard}>
            {HOW_IT_WORKS.map((item, idx) => (
              <View key={item.step} style={styles.stepRow}>
                <LinearGradient
                  colors={[COLORS.primary, '#4F46E5']}
                  style={styles.stepBadge}
                >
                  <Text style={styles.stepBadgeText}>{item.step}</Text>
                </LinearGradient>
                <Text style={styles.stepLabel}>{item.label}</Text>
                {idx < HOW_IT_WORKS.length - 1 && (
                  <View style={styles.stepConnector} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ── Browse Jobs CTA ── */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Jobs')}
          >
            <LinearGradient
              colors={[COLORS.secondary, '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.jobsCard}
            >
              <View style={styles.jobsIconCircle}>
                <Ionicons name="briefcase" size={28} color={COLORS.secondary} />
              </View>
              <View style={styles.jobsText}>
                <Text style={styles.jobsTitle}>Browse Available Jobs</Text>
                <Text style={styles.jobsSub}>No account needed — explore what's hiring</Text>
              </View>
              <View style={styles.jobsArrow}>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Sign In Prompt ── */}
        <View style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account?  </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Hero ──
  hero: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -60,
    right: -60,
  },
  blob2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 20,
    left: -40,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  brandChipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.4,
  },
  headline: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 42,
    marginBottom: SPACING.md,
  },
  subline: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  primaryBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryBtnText: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // ── Sections ──
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  sectionEyebrow: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },

  // ── Feature Grid ──
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  featureCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    width: '47.5%',
    ...SHADOWS.md,
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  featureBody: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  // ── Steps ──
  stepsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.lg,
    ...SHADOWS.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepBadgeText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.white,
  },
  stepLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  stepConnector: {
    display: 'none', // layout handled by gap
  },

  // ── Jobs CTA ──
  jobsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  jobsIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  jobsText: { flex: 1 },
  jobsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 3,
  },
  jobsSub: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  jobsArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Sign in ──
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  signInText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  signInLink: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default GuestHomeScreen;
