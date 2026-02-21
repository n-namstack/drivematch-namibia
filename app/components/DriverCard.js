import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const DriverCard = ({ driver, onPress, horizontal = false, compact = false }) => {
  // Handle both nested (from direct queries) and flat (from RPC) data
  const profile = driver.profiles || driver.profile;
  const firstName = profile?.firstname || driver.firstname || '';
  const lastName = profile?.lastname || driver.lastname || '';
  const profileImage = profile?.profile_image || driver.profile_image;
  const driverLocation = profile?.location || driver.location || 'Namibia';
  const fullName = `${firstName} ${lastName}`.trim() || 'Driver';
  const isVerified = driver.verification_status === 'verified';
  const isAvailableNow = driver.is_available_now;
  const isFeatured = driver.is_featured;

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={12} color={COLORS.accent} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={12} color={COLORS.accent} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={12} color={COLORS.gray[300]} />);
      }
    }
    return stars;
  };

  if (horizontal) {
    return (
      <TouchableOpacity style={styles.horizontalCard} onPress={onPress}>
        <View style={styles.horizontalImageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.horizontalImage} />
          ) : (
            <View style={[styles.horizontalImage, styles.placeholderImage]}>
              <Ionicons name="person" size={32} color={COLORS.gray[400]} />
            </View>
          )}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color={COLORS.white} />
            </View>
          )}
          {isAvailableNow && (
            <View style={styles.availableBadgeHoriz}>
              <View style={styles.availableDot} />
              <Text style={styles.availableBadgeText}>Available</Text>
            </View>
          )}
        </View>
        <View style={styles.horizontalContent}>
          <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
          <View style={styles.ratingRow}>
            {renderStars(driver.rating || 0)}
            <Text style={styles.ratingText}>({driver.total_reviews || 0})</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={12} color={COLORS.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>{driverLocation}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={12} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{driver.years_of_experience || 0} yrs exp</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.compactImage} />
        ) : (
          <View style={[styles.compactImage, styles.placeholderImage]}>
            <Ionicons name="person" size={20} color={COLORS.gray[400]} />
          </View>
        )}
        <View style={styles.compactInfo}>
          <View style={styles.compactTopRow}>
            <Text style={styles.compactName} numberOfLines={1}>{fullName}</Text>
            <View style={[styles.compactAvailableBadge, !isAvailableNow && styles.compactUnavailableBadge]}>
              <View style={[styles.availableDot, !isAvailableNow && styles.unavailableDot]} />
              <Text style={[styles.compactAvailableText, !isAvailableNow && styles.compactUnavailableText]}>
                {isAvailableNow ? 'Available' : 'Unavailable'}
              </Text>
            </View>
            {isVerified && (
              <Ionicons name="shield-checkmark" size={14} color={COLORS.secondary} />
            )}
          </View>
          <View style={styles.ratingRow}>
            {renderStars(driver.rating || 0)}
            <Text style={styles.ratingText}>({driver.total_reviews || 0})</Text>
          </View>
          <View style={styles.compactDetails}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={12} color={COLORS.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>{driverLocation}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={12} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{driver.years_of_experience || 0} yrs</Text>
            </View>
            {driver.has_pdp && (
              <View style={styles.infoRow}>
                <Ionicons name="card" size={12} color={COLORS.secondary} />
                <Text style={[styles.infoText, { color: COLORS.secondary }]}>PDP</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.imageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Ionicons name="person" size={24} color={COLORS.gray[400]} />
            </View>
          )}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color={COLORS.white} />
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
            {isFeatured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="flame" size={10} color={COLORS.accent} />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>
          {isAvailableNow && (
            <View style={styles.availableBadge}>
              <View style={styles.availableDot} />
              <Text style={styles.availableText}>Available Now</Text>
            </View>
          )}
          <View style={styles.ratingRow}>
            {renderStars(driver.rating || 0)}
            <Text style={styles.ratingText}>({driver.total_reviews || 0})</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={14} color={COLORS.primary} />
            <Text style={styles.infoText} numberOfLines={1}>{driverLocation}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={14} color={COLORS.primary} />
            <Text style={styles.infoText}>{driver.years_of_experience || 0} years</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={14} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {driver.availability === 'full_time' ? 'Full Time'
                : driver.availability === 'part_time' ? 'Part Time' : 'Weekends'}
            </Text>
          </View>
          {driver.has_pdp && (
            <View style={styles.infoItem}>
              <Ionicons name="card" size={14} color={COLORS.secondary} />
              <Text style={[styles.infoText, { color: COLORS.secondary }]}>PDP</Text>
            </View>
          )}
        </View>
        {driver.vehicle_types && driver.vehicle_types.length > 0 && (
          <View style={styles.tagsRow}>
            {driver.vehicle_types.slice(0, 3).map((type, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{type}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.viewButton} onPress={onPress}>
          <Text style={styles.viewButtonText}>View Profile</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  imageContainer: { position: 'relative' },
  image: { width: 56, height: 56, borderRadius: 28 },
  placeholderImage: { backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center' },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.secondary,
    borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  name: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.text, flex: 1 },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs / 2,
    backgroundColor: COLORS.accent + '15', paddingHorizontal: SPACING.xs + 2, paddingVertical: 2, borderRadius: BORDER_RADIUS.full,
  },
  featuredText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.accent },
  availableBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  availableDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.secondary },
  availableText: { fontSize: FONTS.sizes.xs, color: COLORS.secondary, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs / 2 },
  ratingText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginLeft: SPACING.xs },
  cardBody: { gap: SPACING.sm },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  infoItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.gray[50], paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm,
  },
  infoText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  tag: { backgroundColor: COLORS.primaryLight + '20', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full },
  tagText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '500', textTransform: 'capitalize' },
  cardFooter: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.gray[100] },
  viewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  viewButtonText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontWeight: '500' },
  horizontalCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, width: 160, marginRight: SPACING.md, ...SHADOWS.sm },
  horizontalImageContainer: { position: 'relative' },
  horizontalImage: { width: '100%', height: 100, borderTopLeftRadius: BORDER_RADIUS.lg, borderTopRightRadius: BORDER_RADIUS.lg },
  availableBadgeHoriz: {
    position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.black + '99', paddingHorizontal: SPACING.xs + 2, paddingVertical: 2, borderRadius: BORDER_RADIUS.full,
  },
  availableBadgeText: { fontSize: FONTS.sizes.xs, color: COLORS.white, fontWeight: '600' },
  horizontalContent: { padding: SPACING.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 2 },
  compactCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm, marginBottom: SPACING.sm,
    gap: SPACING.sm, ...SHADOWS.sm,
  },
  compactImage: { width: 44, height: 44, borderRadius: 22 },
  compactInfo: { flex: 1 },
  compactTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  compactName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text, flex: 1 },
  compactAvailableBadge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs - 1,
    backgroundColor: COLORS.secondary + '15', paddingHorizontal: SPACING.xs + 2, paddingVertical: 2, borderRadius: BORDER_RADIUS.full,
  },
  compactUnavailableBadge: { backgroundColor: COLORS.gray[100] },
  compactAvailableText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.secondary },
  compactUnavailableText: { color: COLORS.gray[400] },
  unavailableDot: { backgroundColor: COLORS.gray[400] },
  compactDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: 2 },
});

export default DriverCard;
