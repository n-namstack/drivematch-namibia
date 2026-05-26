import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

/**
 * Canonical full-width primary action button.
 * variant: 'solid' (filled) | 'outline'
 */
const PrimaryButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'solid',
  style,
}) => {
  const isOutline = variant === 'outline';
  const isInactive = disabled || loading;
  const contentColor = isOutline ? COLORS.primary : COLORS.white;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutline ? styles.outline : styles.solid,
        isInactive && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isInactive}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          <Text style={[styles.text, { color: contentColor }]}>{title}</Text>
          {icon && <Ionicons name={icon} size={20} color={contentColor} />}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  solid: { backgroundColor: COLORS.primary },
  outline: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.primary },
  disabled: { opacity: 0.6 },
  text: { fontSize: FONTS.sizes.lg, fontWeight: '600' },
});

export default PrimaryButton;
