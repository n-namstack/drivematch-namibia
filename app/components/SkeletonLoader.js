import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';

const usePulse = () => {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return anim;
};

const Block = ({ style, opacity }) => (
  <Animated.View style={[styles.block, style, { opacity }]} />
);

export const SkeletonStatCard = () => {
  const opacity = usePulse();
  return (
    <View style={styles.statCard}>
      <Block opacity={opacity} style={{ width: 36, height: 36, borderRadius: 18, marginBottom: SPACING.sm }} />
      <Block opacity={opacity} style={{ width: '60%', height: 20, borderRadius: 4, marginBottom: 6 }} />
      <Block opacity={opacity} style={{ width: '40%', height: 14, borderRadius: 4 }} />
    </View>
  );
};

export const SkeletonDriverRow = () => {
  const opacity = usePulse();
  return (
    <View style={styles.driverRow}>
      <Block opacity={opacity} style={{ width: 44, height: 44, borderRadius: 22 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Block opacity={opacity} style={{ width: '55%', height: 14, borderRadius: 4 }} />
        <Block opacity={opacity} style={{ width: '40%', height: 12, borderRadius: 4 }} />
      </View>
    </View>
  );
};

export const SkeletonCard = () => {
  const opacity = usePulse();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Block opacity={opacity} style={{ width: 40, height: 40, borderRadius: 20 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Block opacity={opacity} style={{ width: '55%', height: 14, borderRadius: 4 }} />
          <Block opacity={opacity} style={{ width: '35%', height: 11, borderRadius: 4 }} />
        </View>
        <Block opacity={opacity} style={{ width: 60, height: 22, borderRadius: BORDER_RADIUS.full }} />
      </View>
      <Block opacity={opacity} style={{ width: '80%', height: 16, borderRadius: 4, marginBottom: SPACING.sm }} />
      <Block opacity={opacity} style={{ width: '50%', height: 12, borderRadius: 4 }} />
    </View>
  );
};

export const SkeletonEntryRow = () => {
  const opacity = usePulse();
  return (
    <View style={styles.entryRow}>
      <View style={{ flex: 1, gap: 6 }}>
        <Block opacity={opacity} style={{ width: '40%', height: 13, borderRadius: 4 }} />
        <Block opacity={opacity} style={{ width: '60%', height: 11, borderRadius: 4 }} />
      </View>
      <Block opacity={opacity} style={{ width: 60, height: 20, borderRadius: 4 }} />
    </View>
  );
};

export const SkeletonHomeScreen = () => {
  const opacity = usePulse();
  return (
    <View style={styles.homeScreen}>
      {/* Hero card */}
      <Block opacity={opacity} style={{ height: 130, borderRadius: BORDER_RADIUS.xl, marginBottom: SPACING.lg }} />
      {/* Stats row */}
      <View style={styles.statsRow}>
        {[0, 1, 2].map((i) => (
          <Block key={i} opacity={opacity} style={{ flex: 1, height: 80, borderRadius: BORDER_RADIUS.lg }} />
        ))}
      </View>
      {/* Promo carousel placeholder */}
      <Block opacity={opacity} style={{ height: 160, borderRadius: BORDER_RADIUS.xl, marginTop: SPACING.md }} />
      {/* Quick actions */}
      <View style={styles.statsRow}>
        {[0, 1].map((i) => (
          <Block key={i} opacity={opacity} style={{ flex: 1, height: 80, borderRadius: BORDER_RADIUS.lg }} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    backgroundColor: COLORS.gray[200],
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'flex-start',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  homeScreen: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});
