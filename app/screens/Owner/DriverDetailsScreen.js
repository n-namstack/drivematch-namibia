import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useDriverStore from '../../store/useDriverStore';
import useChatStore from '../../store/useChatStore';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  VERIFICATION_STATUS,
} from '../../constants/theme';

const DriverDetailsScreen = ({ route, navigation }) => {
  const { driverId } = route.params;
  const { user, profile: currentUser } = useAuth();
  const selectedDriver = useDriverStore((s) => s.selectedDriver);
  const fetchDriverById = useDriverStore((s) => s.fetchDriverById);
  const saveDriver = useDriverStore((s) => s.saveDriver);
  const unsaveDriver = useDriverStore((s) => s.unsaveDriver);
  const savedDrivers = useDriverStore((s) => s.savedDrivers);
  const { startConversation, setCurrentConversation } = useChatStore();
  const [messaging, setMessaging] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchDriverById(driverId);
      setLoading(false);
    };
    load();
  }, [driverId]);

  const driver = selectedDriver;
  const userProfile = driver?.profiles;
  const isSaved = savedDrivers.some((sd) => sd.driver_id === driverId);

  const handleCall = async () => {
    const phone = userProfile?.phone;
    if (!phone) {
      Alert.alert('No Phone Number', 'This driver has not added a phone number yet.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(`tel:${phone}`);
      if (supported) {
        await Linking.openURL(`tel:${phone}`);
      } else {
        Alert.alert('Cannot Call', `Unable to open the dialer. You can reach this driver at: ${phone}`);
      }
    } catch (err) {
      Alert.alert('Error', `Could not open the dialer. Driver's number: ${phone}`);
    }
  };

  const handleShare = async () => {
    const name = `${userProfile?.firstname || ''} ${userProfile?.lastname || ''}`.trim();
    const loc = userProfile?.location || 'Namibia';
    const exp = driver?.years_of_experience || 0;
    const rating = (driver?.rating || 0).toFixed(1);
    const verified = driver?.verification_status === 'verified' ? ' (Verified)' : '';

    try {
      await Share.share({
        message: `Check out ${name}${verified} on DriveMatch Namibia!\n\nLocation: ${loc}\nExperience: ${exp} years\nRating: ${rating}/5\n\nDownload DriveMatch to connect with professional drivers in Namibia.`,
      });
    } catch (err) {
      // User cancelled share
    }
  };

  const handleToggleSave = async () => {
    if (isSaved) {
      await unsaveDriver(currentUser.id, driverId);
    } else {
      await saveDriver(currentUser.id, driverId);
    }
  };

  const handleMessage = async () => {
    if (messaging) return;
    setMessaging(true);
    try {
      const { data, error } = await startConversation(user.id, driver.id);
      if (error) {
        Alert.alert('Error', 'Could not start conversation. Please try again.');
        return;
      }
      setCurrentConversation(data);
      navigation.navigate('Chat', { conversationId: data.id });
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setMessaging(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const r = rating || 0;
    const fullStars = Math.floor(r);
    const hasHalf = r % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={14} color={COLORS.accent} />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Ionicons key={i} name="star-half" size={14} color={COLORS.accent} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={14} color={COLORS.gray[300]} />);
      }
    }
    return stars;
  };

  if (loading || !driver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${userProfile?.firstname || ''} ${userProfile?.lastname || ''}`.trim() || 'Driver';
  const statusInfo = VERIFICATION_STATUS[driver.verification_status] || VERIFICATION_STATUS.pending;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/* Navigation */}
          <SafeAreaView edges={['top']} style={styles.navBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <TouchableOpacity onPress={handleShare} style={styles.navButton}>
                <Ionicons name="share-outline" size={20} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleSave} style={styles.navButton}>
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isSaved ? '#FF6B6B' : COLORS.white}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Profile Info */}
          <View style={styles.heroContent}>
            <View style={styles.avatarWrapper}>
              {userProfile?.profile_image ? (
                <Image source={{ uri: userProfile.profile_image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Ionicons name="person" size={36} color={COLORS.white} />
                </View>
              )}
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            </View>

            <Text style={styles.heroName}>{fullName}</Text>

            <View style={styles.heroMeta}>
              {userProfile?.location && (
                <View style={styles.heroMetaItem}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.heroMetaText}>{userProfile.location}</Text>
                </View>
              )}
              <View style={styles.heroMetaItem}>
                <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]} />
                <Text style={styles.heroMetaText}>{statusInfo.label}</Text>
              </View>
            </View>

            <View style={styles.ratingRow}>
              {renderStars(driver.rating)}
              <Text style={styles.ratingValue}>
                {(driver.rating || 0).toFixed(1)}
              </Text>
              <Text style={styles.reviewCount}>
                ({driver.total_reviews || 0})
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Card */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statBlock}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.primary + '12' }]}>
                  <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.statValue}>{driver.years_of_experience || 0}</Text>
                <Text style={styles.statLabel}>Years Exp</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.accent + '12' }]}>
                  <Ionicons name="chatbubbles-outline" size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.statValue}>{driver.total_reviews || 0}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.secondary + '12' }]}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.secondary} />
                </View>
                <Text style={styles.statValue}>{driver.driver_documents?.length || 0}</Text>
                <Text style={styles.statLabel}>Documents</Text>
              </View>
              <View style={styles.statBlock}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.info + '12' }]}>
                  <Ionicons name="car-outline" size={18} color={COLORS.info} />
                </View>
                <Text style={styles.statValue}>{driver.work_history?.length || 0}</Text>
                <Text style={styles.statLabel}>Jobs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* About */}
        {driver.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              <Text style={styles.bioText}>{driver.bio}</Text>
            </View>
          </View>
        )}

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: COLORS.primary + '10' }]}>
                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.detailLabel}>Availability</Text>
              <Text style={styles.detailValue}>
                {driver.availability === 'full_time' ? 'Full Time'
                  : driver.availability === 'part_time' ? 'Part Time' : 'Weekends Only'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: driver.has_pdp ? COLORS.secondary + '10' : COLORS.gray[100] }]}>
                <Ionicons
                  name={driver.has_pdp ? 'shield-checkmark-outline' : 'shield-outline'}
                  size={16}
                  color={driver.has_pdp ? COLORS.secondary : COLORS.gray[400]}
                />
              </View>
              <Text style={styles.detailLabel}>PDP</Text>
              <Text style={[styles.detailValue, { color: driver.has_pdp ? COLORS.secondary : COLORS.textSecondary }]}>
                {driver.has_pdp ? 'Yes' : 'No'}
              </Text>
            </View>
            {driver.languages?.length > 0 && (
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.detailIcon, { backgroundColor: COLORS.info + '10' }]}>
                  <Ionicons name="globe-outline" size={16} color={COLORS.info} />
                </View>
                <Text style={styles.detailLabel}>Languages</Text>
                <Text style={styles.detailValue}>{driver.languages.join(', ')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vehicle Types */}
        {driver.vehicle_types?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Types</Text>
            <View style={styles.chipsRow}>
              {driver.vehicle_types.map((type, index) => (
                <View key={index} style={styles.chip}>
                  <Ionicons name="car-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.chipText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Documents */}
        {driver.driver_documents && driver.driver_documents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents</Text>
            {driver.driver_documents.map((doc) => {
              const docStatus = VERIFICATION_STATUS[doc.verification_status] || VERIFICATION_STATUS.pending;
              return (
                <View key={doc.id} style={styles.docItem}>
                  <View style={[styles.docIcon, { backgroundColor: COLORS.primary + '10' }]}>
                    <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>
                      {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                    {doc.expiry_date && (
                      <Text style={styles.docExpiry}>Exp: {doc.expiry_date}</Text>
                    )}
                  </View>
                  <View style={[styles.docBadge, { backgroundColor: docStatus.color + '15' }]}>
                    <View style={[styles.docBadgeDot, { backgroundColor: docStatus.color }]} />
                    <Text style={[styles.docBadgeText, { color: docStatus.color }]}>
                      {docStatus.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Work History */}
        {driver.work_history && driver.work_history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {driver.work_history.map((job, index) => (
              <View key={job.id} style={styles.workItem}>
                <View style={styles.timelineDot}>
                  <View style={[styles.timelineDotInner, job.is_current && { backgroundColor: COLORS.secondary }]} />
                </View>
                {index < driver.work_history.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.workContent}>
                  <View style={styles.workHeaderRow}>
                    <Text style={styles.workPosition}>{job.position}</Text>
                    {job.is_current && (
                      <View style={styles.currentTag}>
                        <Text style={styles.currentTagText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.workCompany}>{job.company_name}</Text>
                  {job.description && (
                    <Text style={styles.workDesc}>{job.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {driver.driver_reviews && driver.driver_reviews.length > 0 && (
              <View style={styles.reviewSummary}>
                <Ionicons name="star" size={14} color={COLORS.accent} />
                <Text style={styles.reviewSummaryText}>
                  {(driver.rating || 0).toFixed(1)} ({driver.driver_reviews.length})
                </Text>
              </View>
            )}
          </View>
          {currentUser?.role === 'owner' && (
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => navigation.navigate('WriteReview', {
                driverId: driver.id,
                driverName: fullName,
                driverImage: userProfile?.profile_image,
              })}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          )}
          {driver.driver_reviews && driver.driver_reviews.length > 0 && driver.driver_reviews.map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewerRow}>
                    {review.reviewer?.profile_image ? (
                      <Image source={{ uri: review.reviewer.profile_image }} style={styles.reviewerAvatar} />
                    ) : (
                      <View style={[styles.reviewerAvatar, styles.reviewerAvatarPlaceholder]}>
                        <Text style={styles.reviewerInitial}>
                          {(review.reviewer?.firstname || 'O')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.reviewerMeta}>
                      <Text style={styles.reviewerName}>
                        {review.reviewer?.firstname || 'Owner'} {review.reviewer?.lastname || ''}
                      </Text>
                      <View style={styles.reviewStars}>
                        {renderStars(review.rating)}
                      </View>
                    </View>
                  </View>
                </View>
                {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
                {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                {review.response && (
                  <View style={styles.reviewReply}>
                    <Ionicons name="return-down-forward-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.reviewReplyText}>{review.response}</Text>
                  </View>
                )}
              </View>
            ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionSecondary} onPress={handleMessage}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionSecondaryText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPrimary} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color={COLORS.white} />
          <Text style={styles.actionPrimaryText}>Call Driver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  heroSection: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.xl + SPACING.sm,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  placeholderAvatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  heroName: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },

  // Stats
  statsContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: -SPACING.md,
    marginBottom: SPACING.md,
  },
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBlock: {
    alignItems: 'center',
    gap: 4,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  bioText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // Details
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
    gap: SPACING.sm,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  chipText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Documents
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  docExpiry: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  docBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Work History
  workItem: {
    flexDirection: 'row',
    paddingLeft: 4,
    marginBottom: SPACING.md,
  },
  timelineDot: {
    width: 20,
    alignItems: 'center',
    paddingTop: 4,
    zIndex: 1,
  },
  timelineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gray[300],
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  timelineLine: {
    position: 'absolute',
    left: 8.5,
    top: 18,
    bottom: -SPACING.md,
    width: 2,
    backgroundColor: COLORS.gray[200],
  },
  workContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm + 4,
    marginLeft: SPACING.sm,
  },
  workHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workPosition: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  currentTag: {
    backgroundColor: COLORS.secondary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  currentTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  workCompany: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  workDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: SPACING.xs,
  },

  // Reviews
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  writeReviewText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  reviewSummaryText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewItem: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reviewTop: {
    marginBottom: SPACING.sm,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewerAvatarPlaceholder: {
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitial: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  reviewerMeta: {
    flex: 1,
  },
  reviewerName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 1,
    marginTop: 2,
  },
  reviewTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  reviewComment: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  reviewReply: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.gray[50],
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  reviewReplyText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    lineHeight: 17,
  },

  // Action Bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...SHADOWS.lg,
  },
  actionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.primary + '10',
  },
  actionSecondaryText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionPrimary: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.primary,
  },
  actionPrimaryText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default DriverDetailsScreen;
