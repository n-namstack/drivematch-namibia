import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
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
  const { selectedDriver, loading, fetchDriverById, saveDriver, unsaveDriver, savedDrivers } = useDriverStore();
  const { startConversation, setCurrentConversation } = useChatStore();
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    fetchDriverById(driverId);
  }, [driverId]);

  const driver = selectedDriver;
  const userProfile = driver?.profiles;
  const isVerified = driver?.verification_status === 'verified';
  const isSaved = savedDrivers.some((sd) => sd.driver_id === driverId);

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
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={16} color={COLORS.accent} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={16} color={COLORS.accent} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={16} color={COLORS.accent} />);
      }
    }
    return stars;
  };

  if (loading || !driver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading driver profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${userProfile?.firstname || ''} ${userProfile?.lastname || ''}`.trim() || 'Driver';
  const statusInfo = VERIFICATION_STATUS[driver.verification_status] || VERIFICATION_STATUS.pending;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleSave} style={styles.saveButton}>
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={24}
              color={isSaved ? COLORS.error : COLORS.text}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {userProfile?.profile_image ? (
              <Image source={{ uri: userProfile.profile_image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={48} color={COLORS.gray[400]} />
              </View>
            )}
            {isVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
              </View>
            ) : (
              <View style={styles.unverifiedBadge}>
                <Ionicons name="alert-circle" size={16} color={COLORS.white} />
              </View>
            )}
          </View>

          <Text style={styles.name}>{fullName}</Text>

          <View style={styles.statusBadge(statusInfo.color)}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>

          {/* Unverified Warning */}
          {!isVerified && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={18} color="#B45309" />
              <Text style={styles.warningText}>
                This driver has not been verified. Please verify their credentials independently before hiring.
              </Text>
            </View>
          )}

          <View style={styles.ratingRow}>
            {renderStars(driver.rating || 0)}
            <Text style={styles.ratingValue}>{(driver.rating || 0).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({driver.total_reviews || 0} reviews)</Text>
          </View>

          {userProfile?.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>{userProfile.location}</Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{driver.years_of_experience || 0}</Text>
            <Text style={styles.statLabel}>Years Exp.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{driver.total_reviews || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {driver.availability === 'full_time' ? 'Full' : driver.availability === 'part_time' ? 'Part' : 'Wknd'}
            </Text>
            <Text style={styles.statLabel}>Availability</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons
              name={driver.has_pdp ? 'checkmark-circle' : 'close-circle'}
              size={22}
              color={driver.has_pdp ? COLORS.secondary : COLORS.gray[400]}
            />
            <Text style={styles.statLabel}>PDP</Text>
          </View>
        </View>

        {/* Bio */}
        {driver.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              <Text style={styles.bioText}>{driver.bio}</Text>
            </View>
          </View>
        )}

        {/* Vehicle Types */}
        {driver.vehicle_types && driver.vehicle_types.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Types</Text>
            <View style={styles.tagsContainer}>
              {driver.vehicle_types.map((type, index) => (
                <View key={index} style={styles.tag}>
                  <Ionicons name="car" size={14} color={COLORS.primary} />
                  <Text style={styles.tagText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Languages */}
        {driver.languages && driver.languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <View style={styles.tagsContainer}>
              {driver.languages.map((lang, index) => (
                <View key={index} style={styles.tag}>
                  <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.primary} />
                  <Text style={styles.tagText}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Documents */}
        {driver.driver_documents && driver.driver_documents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <View style={styles.card}>
              {driver.driver_documents.map((doc) => {
                const docStatus = VERIFICATION_STATUS[doc.verification_status] || VERIFICATION_STATUS.pending;
                return (
                  <View key={doc.id} style={styles.documentRow}>
                    <Ionicons name="document-text" size={20} color={COLORS.primary} />
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentType}>
                        {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                      {doc.expiry_date && (
                        <Text style={styles.documentExpiry}>Expires: {doc.expiry_date}</Text>
                      )}
                    </View>
                    <View style={[styles.docStatusBadge, { backgroundColor: docStatus.color + '20' }]}>
                      <Text style={[styles.docStatusText, { color: docStatus.color }]}>
                        {docStatus.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Work History */}
        {driver.work_history && driver.work_history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work History</Text>
            <View style={styles.card}>
              {driver.work_history.map((job) => (
                <View key={job.id} style={styles.workItem}>
                  <View style={styles.workHeader}>
                    <Ionicons name="briefcase" size={18} color={COLORS.primary} />
                    <View style={styles.workInfo}>
                      <Text style={styles.workPosition}>{job.position}</Text>
                      <Text style={styles.workCompany}>{job.company_name}</Text>
                    </View>
                    {job.is_current && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  {job.description && (
                    <Text style={styles.workDescription}>{job.description}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        {driver.driver_reviews && driver.driver_reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Reviews ({driver.driver_reviews.length})
            </Text>
            {driver.driver_reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    {review.reviewer?.profile_image ? (
                      <Image source={{ uri: review.reviewer.profile_image }} style={styles.reviewerAvatar} />
                    ) : (
                      <View style={[styles.reviewerAvatar, styles.placeholderAvatar]}>
                        <Ionicons name="person" size={14} color={COLORS.gray[400]} />
                      </View>
                    )}
                    <Text style={styles.reviewerName}>
                      {review.reviewer?.firstname || 'Owner'} {review.reviewer?.lastname || ''}
                    </Text>
                  </View>
                  <View style={styles.reviewRating}>
                    {renderStars(review.rating)}
                  </View>
                </View>
                {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
                {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                {review.response && (
                  <View style={styles.reviewResponse}>
                    <Text style={styles.reviewResponseLabel}>Driver's response:</Text>
                    <Text style={styles.reviewResponseText}>{review.response}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Bottom spacing for the action buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.hireButton} onPress={handleMessage}>
          <Ionicons name="call-outline" size={20} color={COLORS.white} />
          <Text style={styles.hireButtonText}>Contact Driver</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderAvatar: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  unverifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  name: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statusBadge: (color) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  }),
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: '#92400E',
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  ratingValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  reviewCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.sm,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.gray[200],
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  bioText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  documentExpiry: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  docStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  docStatusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  workItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  workHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  workInfo: {
    flex: 1,
  },
  workPosition: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  workCompany: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  currentBadge: {
    backgroundColor: COLORS.secondary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  currentBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  workDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginLeft: 34,
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  reviewComment: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  reviewResponse: {
    backgroundColor: COLORS.gray[50],
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  reviewResponseLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  reviewResponseText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    ...SHADOWS.lg,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  messageButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  hireButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  hireButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default DriverDetailsScreen;
