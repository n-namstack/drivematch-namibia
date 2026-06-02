import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuth } from "../../context/AuthContext";
import useDocumentStore from "../../store/useDocumentStore";
import useHireOfferStore from "../../store/useHireOfferStore";
import supabase from "../../lib/supabase";
import PromoCarousel from "../../components/PromoCarousel";

const DRIVER_PROMOS = [
  {
    id: '1',
    title: 'Get Verified',
    subtitle: 'A verified badge gets you hired faster — upload your docs today',
    gradient: ['#059669', '#0D9488'],
    icon: 'shield-checkmark-outline',
    decorIcon: 'shield-checkmark',
    cta: 'Upload Documents',
    route: 'DocumentUpload',
  },
  {
    id: '2',
    title: 'Browse Jobs',
    subtitle: 'Car owners are posting jobs — find work that suits you',
    gradient: ['#4F46E5', '#7C3AED'],
    icon: 'briefcase-outline',
    decorIcon: 'briefcase',
    cta: 'See All Jobs',
    route: 'Jobs',
  },
  {
    id: '3',
    title: 'Track Your Pay',
    subtitle: 'Log daily earnings — confirmed and locked by both parties',
    gradient: ['#7C3AED', '#4F46E5'],
    icon: 'cash-outline',
    decorIcon: 'cash',
    cta: 'View Agreements',
    route: 'Agreements',
  },
  {
    id: '4',
    title: 'Hire Offers',
    subtitle: 'Car owners are sending you direct offers — check them now',
    gradient: ['#D97706', '#F59E0B'],
    icon: 'paper-plane-outline',
    decorIcon: 'paper-plane',
    cta: 'View Offers',
    route: 'MyOffers',
  },
];
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  VERIFICATION_STATUS,
} from "../../constants/theme";

const DriverHomeScreen = ({ navigation }) => {
  const { profile, driverProfile, refreshProfile, updateDriverProfile } =
    useAuth();
  const { documents, fetchDocuments } = useDocumentStore();
  const fetchReceivedOffers = useHireOfferStore((s) => s.fetchReceivedOffers);
  const receivedOffers = useHireOfferStore((s) => s.receivedOffers);
  const pendingOfferCount = receivedOffers.filter((o) => o.status === 'pending').length;
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [docsLoaded, setDocsLoaded] = useState(false);

  // Re-fetch unread count and recent jobs every time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      if (driverProfile?.id) fetchDocuments(driverProfile.id).then(() => setDocsLoaded(true));
      if (profile?.id) fetchReceivedOffers(profile.id);
    }, [profile?.id, driverProfile?.id]),
  );

  // Realtime: update notification badge instantly when new notifications arrive
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel("driver-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchUnreadCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchUnreadCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const fetchUnreadCount = async () => {
    if (!profile?.id) return;
    try {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    } catch (err) {
      Toast.show({ type: "error", text1: "Connection issue", text2: "Could not load notifications." });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshProfile(),
      fetchUnreadCount(),
      driverProfile?.id ? fetchDocuments(driverProfile.id) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const toggleAvailability = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const newValue = !driverProfile?.is_available_now;
      const { error } = await updateDriverProfile({
        is_available_now: newValue,
      });
      if (error) {
        Alert.alert(
          "Error",
          "Could not update availability. Please try again.",
        );
      }
    } catch (err) {
      Alert.alert("Error", "Could not update availability. Please try again.");
    } finally {
      setToggling(false);
    }
  };

  const statusInfo =
    VERIFICATION_STATUS[driverProfile?.verification_status] ||
    VERIFICATION_STATUS.pending;
  const isAvailable = driverProfile?.is_available_now;

  // Profile completeness
  const getProfileCompleteness = () => {
    const steps = [
      { key: "photo", label: "Add profile photo", done: !!profile?.profile_image, screen: "EditDriverProfile" },
      { key: "name", label: "Add your name", done: !!(profile?.firstname && profile?.lastname), screen: "EditDriverProfile" },
      { key: "phone", label: "Add phone number", done: !!profile?.phone, screen: "EditDriverProfile" },
      { key: "location", label: "Set your location", done: !!profile?.location, screen: "EditDriverProfile" },
      { key: "bio", label: "Write a bio", done: !!driverProfile?.bio, screen: "EditDriverProfile" },
      { key: "experience", label: "Add experience", done: (driverProfile?.years_of_experience || 0) > 0, screen: "EditDriverProfile" },
      { key: "vehicles", label: "Select vehicle types", done: (driverProfile?.vehicle_types?.length || 0) > 0, screen: "EditDriverProfile" },
      { key: "languages", label: "Add languages", done: (driverProfile?.languages?.length || 0) > 0, screen: "EditDriverProfile" },
      { key: "drivers_license", label: "Upload driver's license", done: documents.some((d) => d.document_type === "drivers_license"), screen: "DocumentUpload" },
      { key: "id_document", label: "Upload national ID", done: documents.some((d) => d.document_type === "id_document"), screen: "DocumentUpload" },
      { key: "availability", label: "Set availability", done: !!driverProfile?.availability, screen: "EditDriverProfile" },
    ];
    const completed = steps.filter((s) => s.done).length;
    const missing = steps.filter((s) => !s.done);
    return { completed, total: steps.length, missing, percentage: Math.round((completed / steps.length) * 100) };
  };

  const completeness = getProfileCompleteness();

  // Compute expiring documents
  const expiringDocs = documents.filter((doc) => {
    if (!doc.expiry_date || doc.verification_status === "expired") return false;
    const daysUntil = Math.ceil(
      (new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24),
    );
    return daysUntil <= 30;
  });
  const expiredDocs = documents.filter(
    (doc) => doc.verification_status === "expired",
  );

  const stats = [
    {
      label: "Rating",
      value: driverProfile?.rating?.toFixed(1) || "0.0",
      icon: "star",
      color: COLORS.accent,
    },
    {
      label: "Reviews",
      value: driverProfile?.total_reviews?.toString() || "0",
      icon: "chatbubbles",
      color: COLORS.secondary,
    },
    {
      label: "Profile Views",
      value: driverProfile?.profile_views?.toString() || "0",
      icon: "eye",
      color: COLORS.info,
    },
  ];

  const quickActions = [
    {
      id: "documents",
      icon: "document-text-outline",
      label: "Documents",
      sub: "Upload & manage",
      color: COLORS.secondary,
      bg: '#D1FAE5',
      onPress: () => navigation.navigate("DocumentUpload"),
    },
    {
      id: "work",
      icon: "briefcase-outline",
      label: "Work History",
      sub: "View past work",
      color: COLORS.accent,
      bg: '#FEF3C7',
      onPress: () => navigation.navigate("WorkHistory"),
    },
    {
      id: "job-status",
      icon: "stats-chart-outline",
      label: "Job Status",
      sub: "Track applications",
      color: COLORS.info,
      bg: '#E0F2FE',
      onPress: () => navigation.navigate("JobStatusDashboard"),
    },
    {
      id: "offers",
      icon: "paper-plane-outline",
      label: "Hire Offers",
      sub: pendingOfferCount > 0 ? `${pendingOfferCount} pending` : "View offers",
      color: COLORS.primary,
      bg: '#EEF2FF',
      badge: pendingOfferCount,
      onPress: () => navigation.navigate("MyOffers"),
    },
    {
      id: "agreements",
      icon: "document-text-outline",
      label: "Agreements",
      sub: "Track earnings",
      color: '#7C3AED',
      bg: '#EDE9FE',
      onPress: () => navigation.navigate("Agreements"),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroGreeting}>
              <Text style={styles.greeting}>
                {profile?.firstname || "Driver"}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "18" }]}>
                <Ionicons
                  name={driverProfile?.verification_status === "verified" ? "shield-checkmark" : "shield-outline"}
                  size={12}
                  color={statusInfo.color}
                />
                <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Availability + Stats in one row */}
          <View style={styles.heroBottom}>
            <TouchableOpacity
              style={[styles.availabilityRow, isAvailable && styles.availabilityRowActive]}
              onPress={toggleAvailability}
              activeOpacity={0.8}
            >
              <View style={[styles.availabilityDot, isAvailable && styles.availabilityDotActive]} />
              <Text style={styles.availabilityText}>
                {isAvailable ? "Available" : "Unavailable"}
              </Text>
              <View style={[styles.toggleTrack, isAvailable && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, isAvailable && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            <View style={styles.statsRow}>
              {stats.map((stat, index) => (
                <View key={index} style={styles.statItem}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Profile Completeness */}
        {docsLoaded && completeness.percentage < 100 && (
          <TouchableOpacity
            style={styles.completenessCard}
            onPress={() => navigation.navigate(completeness.missing[0]?.screen || "EditDriverProfile")}
            activeOpacity={0.7}
          >
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessTitle}>Complete your profile</Text>
              <Text style={styles.completenessPercent}>{completeness.percentage}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${completeness.percentage}%` }]} />
            </View>
            <Text style={styles.completenessSubtext}>
              {completeness.completed}/{completeness.total} steps done
            </Text>
            <View style={styles.missingChips}>
              {completeness.missing.slice(0, 3).map((item) => (
                <View key={item.key} style={styles.missingChip}>
                  <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.missingChipText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}

        {/* Verification CTA (only if not verified) */}
        {driverProfile?.verification_status !== "verified" && (
          <TouchableOpacity
            style={styles.verifyCta}
            onPress={() => navigation.navigate("DocumentUpload")}
            activeOpacity={0.7}
          >
            <View style={styles.verifyCtaLeft}>
              <Ionicons name="document-text" size={20} color={COLORS.primary} />
              <Text style={styles.verifyCtaText}>
                {driverProfile?.verification_status === "pending"
                  ? "Upload documents to get verified"
                  : "Check your verification status"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Document Expiry Warnings */}
        {expiredDocs.length > 0 && (
          <TouchableOpacity
            style={[
              styles.verifyCta,
              {
                backgroundColor: COLORS.error + "10",
                borderColor: COLORS.error + "30",
                borderWidth: 1,
              },
            ]}
            onPress={() => navigation.navigate("DocumentUpload")}
            activeOpacity={0.7}
          >
            <View style={styles.verifyCtaLeft}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={[styles.verifyCtaText, { color: COLORS.error }]}>
                {expiredDocs.length} document{expiredDocs.length > 1 ? "s" : ""}{" "}
                expired - update now
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.error} />
          </TouchableOpacity>
        )}

        {expiredDocs.length === 0 && expiringDocs.length > 0 && (
          <TouchableOpacity
            style={[
              styles.verifyCta,
              {
                backgroundColor: COLORS.warning + "10",
                borderColor: COLORS.warning + "30",
                borderWidth: 1,
              },
            ]}
            onPress={() => navigation.navigate("DocumentUpload")}
            activeOpacity={0.7}
          >
            <View style={styles.verifyCtaLeft}>
              <Ionicons name="time-outline" size={20} color={COLORS.warning} />
              <Text
                style={[styles.verifyCtaText, { color: COLORS.accentDark }]}
              >
                {expiringDocs.length} document
                {expiringDocs.length > 1 ? "s" : ""} expiring soon
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.warning} />
          </TouchableOpacity>
        )}

        {/* Promo Carousel */}
        <PromoCarousel items={DRIVER_PROMOS} navigation={navigation} />

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <View style={{ position: 'relative', alignSelf: 'flex-start', marginBottom: SPACING.sm }}>
                  <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  </View>
                  {action.badge > 0 && (
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>
                        {action.badge > 9 ? '9+' : action.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },

  // Hero Card
  heroCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.lg,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  heroGreeting: { flex: 1 },
  greeting: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  statusBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: "600" },
  notificationButton: {
    padding: SPACING.sm,
    position: "relative",
    backgroundColor: COLORS.white + "15",
    borderRadius: BORDER_RADIUS.lg,
  },
  notifBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: "700" },

  heroBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  // Availability toggle (compact inline)
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white + "12",
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  availabilityRowActive: { backgroundColor: COLORS.secondary + "35" },
  availabilityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gray[400] },
  availabilityDotActive: { backgroundColor: COLORS.secondaryLight },
  availabilityText: { fontSize: FONTS.sizes.xs, fontWeight: "600", color: COLORS.white },
  toggleTrack: {
    width: 34, height: 20, borderRadius: 10,
    backgroundColor: COLORS.white + "30", padding: 2,
  },
  toggleTrackActive: { backgroundColor: COLORS.secondary },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.white },
  toggleThumbActive: { transform: [{ translateX: 14 }] },

  // Stats Row (inside hero)
  statsRow: {
    flex: 1,
    flexDirection: "row",
    gap: SPACING.xs,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.white + "12",
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    alignItems: "center",
  },
  statValue: { fontSize: FONTS.sizes.sm, fontWeight: "bold", color: COLORS.white },
  statLabel: { fontSize: 9, color: COLORS.white, opacity: 0.7 },

  // Profile Completeness
  completenessCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  completenessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  completenessTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  completenessPercent: {
    fontSize: FONTS.sizes.md,
    fontWeight: "700",
    color: COLORS.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.xs,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  completenessSubtext: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  missingChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  missingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.infoLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  missingChipText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: "500",
  },

  // Verification CTA
  verifyCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary + "0A",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
  },
  verifyCtaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
  },
  verifyCtaText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: "500",
    color: COLORS.primary,
  },

  // Sections
  section: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  actionCard: {
    width: '48.5%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  actionSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  actionBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  seeAll: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  emptyJobs: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  emptyJobsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
});

export default DriverHomeScreen;
