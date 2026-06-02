import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HEIGHT = 168;

const PromoCarousel = ({ items, navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const timerRef = useRef(null);
  const dotScale = useRef(items.map(() => new Animated.Value(1))).current;

  const animateDot = useCallback((index) => {
    dotScale.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === index ? 1.4 : 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start();
    });
  }, [dotScale]);

  const goTo = useCallback((index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
    animateDot(index);
  }, [animateDot]);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        animateDot(next);
        return next;
      });
    }, 4000);
  }, [items.length, animateDot]);

  useEffect(() => {
    animateDot(0);
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const handleScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
    animateDot(index);
    startTimer();
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index,
        })}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.93}
            onPress={() => item.route && navigation.navigate(item.route, item.params)}
            style={styles.page}
          >
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              {/* Left: text */}
              <View style={styles.left}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle} numberOfLines={2}>{item.subtitle}</Text>
                <View style={styles.ctaPill}>
                  <Text style={styles.ctaText}>{item.cta}</Text>
                  <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.95)" />
                </View>
              </View>

              {/* Right: decorative icon */}
              <View style={styles.right}>
                <View style={styles.decorCircle}>
                  <Ionicons name={item.decorIcon} size={52} color="rgba(255,255,255,0.9)" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {items.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => { goTo(i); startTimer(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Animated.View
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
                { transform: [{ scale: dotScale[i] }] },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.sm },

  page: {
    width: SCREEN_WIDTH,
    paddingHorizontal: SPACING.lg,
  },

  card: {
    height: CARD_HEIGHT,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },

  left: {
    flex: 1,
    paddingRight: SPACING.md,
    justifyContent: 'center',
  },

  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    lineHeight: 24,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 17,
    marginBottom: SPACING.sm,
  },

  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },

  ctaText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },

  right: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },

  decorCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
  },
});

export default PromoCarousel;
