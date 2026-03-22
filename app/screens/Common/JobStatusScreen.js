import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import supabase from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../../constants/theme";

// Status configuration
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: "time-outline",
    color: COLORS.info,
    bgColor: COLORS.infoLight,
    step: 1,
  },
  viewed: {
    label: "Viewed",
    icon: "eye-outline",
    color: COLORS.primary,
    bgColor: COLORS.infoLight,
    step: 2,
  },
  shortlisted: {
    label: "Shortlisted",
    icon: "star",
    color: COLORS.warning,
    bgColor: COLORS.warningLight,
    step: 3,
  },
  accepted: {
    label: "Hired",
    icon: "checkmark-circle",
    color: COLORS.success,
    bgColor: COLORS.successLight,
    step: 4,
  },
  rejected: {
    label: "Not Selected",
    icon: "close-circle",
    color: COLORS.error,
    bgColor: COLORS.errorLight,
    step: -1,
  },
};

const PIPELINE_STEPS = ["pending", "viewed", "shortlisted", "accepted"];

const AnimatedCount = ({ value, color }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [value]);

  return (
    <Animated.Text
      style={[
        styles.countText,
        {
          color,
          transform: [
            {
              scale: animValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.5, 1.15, 1],
              }),
            },
          ],
        },
      ]}
    >
      {value}
    </Animated.Text>
  );
};

const StepIndicator = ({ currentStatus }) => {
  const config = STATUS_CONFIG[currentStatus];
  const isRejected = currentStatus === "rejected";
  const currentStep = isRejected ? 0 : config.step;

  return (
    <View style={styles.stepRow}>
      {PIPELINE_STEPS.map((step, index) => {
        const stepConfig = STATUS_CONFIG[step];
        const isActive = !isRejected && PIPELINE_STEPS.indexOf(currentStatus) >= index;
        const isCurrentStep = step === currentStatus && !isRejected;
        const dotColor = isRejected
          ? COLORS.gray[300]
          : isActive
          ? stepConfig.color
          : COLORS.gray[300];

        return (
          <React.Fragment key={step}>
            {index > 0 && (
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor:
                      !isRejected && currentStep > index
                        ? COLORS.success
                        : COLORS.gray[200],
                  },
                ]}
              />
            )}
            <View style={styles.stepDotContainer}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: isActive ? dotColor : COLORS.gray[200],
                    borderColor: isCurrentStep ? dotColor : "transparent",
                    borderWidth: isCurrentStep ? 2 : 0,
                  },
                ]}
              >
                {isActive && (
                  <Ionicons
                    name="checkmark"
                    size={8}
                    color={COLORS.white}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: isActive ? dotColor : COLORS.textLight },
                ]}
              >
                {stepConfig.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const TimelineItem = ({ entry, isLast }) => {
  const config = STATUS_CONFIG[entry.new_status] || {};
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDotCol}>
        <View
          style={[
            styles.timelineDot,
            { backgroundColor: config.color || COLORS.gray[400] },
          ]}
        />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineStatus, { color: config.color }]}>
          {config.label || entry.new_status}
        </Text>
        <Text style={styles.timelineTime}>
          {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
        </Text>
      </View>
    </View>
  );
};

const JobApplicationCard = ({ item, onPress }) => {
  const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const job = item.job_posts;

  return (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.jobCardHeader}>
        <View style={styles.jobCardLeft}>
          <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          <View style={styles.jobCardInfo}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {job?.title || "Untitled Job"}
            </Text>
            <View style={styles.jobMeta}>
              <Ionicons
                name="location-outline"
                size={12}
                color={COLORS.textLight}
              />
              <Text style={styles.jobLocation}>{job?.location || "—"}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusChip, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={12} color={config.color} />
          <Text style={[styles.statusChipText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* Step progress indicator */}
      <StepIndicator currentStatus={item.status} />

      {/* Timeline preview */}
      {item.status_history && item.status_history.length > 0 && (
        <View style={styles.timelinePreview}>
          {item.status_history.slice(0, 3).map((entry, idx) => (
            <TimelineItem
              key={entry.id}
              entry={entry}
              isLast={idx === Math.min(item.status_history.length, 3) - 1}
            />
          ))}
          {item.status_history.length > 3 && (
            <Text style={styles.moreHistory}>
              +{item.status_history.length - 3} more
            </Text>
          )}
        </View>
      )}

      <View style={styles.jobCardFooter}>
        {job?.salary_range && (
          <View style={styles.salaryBadge}>
            <Ionicons name="cash-outline" size={12} color={COLORS.secondary} />
            <Text style={styles.salaryText}>{job.salary_range}</Text>
          </View>
        )}
        <Text style={styles.appliedDate}>
          Applied{" "}
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const JobStatusDashboard = ({ navigation }) => {
  const { profile, driverProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [applications, setApplications] = useState([]);
  const [statsData, setStatsData] = useState({
    total: 0,
    pending: 0,
    viewed: 0,
    shortlisted: 0,
    hired: 0,
    rejected: 0,
  });

  const fetchApplications = async () => {
    if (!driverProfile?.id) return;
    try {
      const { data, error } = await supabase
        .from("job_interests")
        .select(
          `*,
          job_posts(id, title, location, salary_range, status, availability_type)`
        )
        .eq("driver_id", driverProfile.id)
        .order("created_at", { ascending: false });

      console.log("[JobStatus] fetched interests", { count: data?.length, error });
      if (error) throw error;

      // Try to fetch status history (table may not exist yet)
      let historyMap = {};
      try {
        const interestIds = (data || []).map((d) => d.id);
        if (interestIds.length > 0) {
          const { data: historyData } = await supabase
            .from("job_interest_status_history")
            .select("id, interest_id, old_status, new_status, changed_at")
            .in("interest_id", interestIds)
            .order("changed_at", { ascending: false });

          if (historyData) {
            historyData.forEach((h) => {
              if (!historyMap[h.interest_id]) historyMap[h.interest_id] = [];
              historyMap[h.interest_id].push(h);
            });
          }
        }
      } catch (_) {
        // History table may not exist yet — skip
      }

      const apps = (data || []).map((item) => ({
        ...item,
        status_history: historyMap[item.id] || [],
      }));

      setApplications(apps);

      // Calculate stats
      const counts = apps.reduce(
        (acc, curr) => {
          acc.total++;
          if (curr.status === "pending") acc.pending++;
          else if (curr.status === "viewed") acc.viewed++;
          else if (curr.status === "shortlisted") acc.shortlisted++;
          else if (curr.status === "accepted") acc.hired++;
          else if (curr.status === "rejected") acc.rejected++;
          return acc;
        },
        { total: 0, pending: 0, viewed: 0, shortlisted: 0, hired: 0, rejected: 0 }
      );
      setStatsData(counts);
    } catch (error) {
      console.log("[JobStatus] fetch error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!driverProfile?.id) return;
    fetchApplications();
    const channel = supabase
      .channel("driver-status-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_interests",
          filter: `driver_id=eq.${driverProfile.id}`,
        },
        () => fetchApplications()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [driverProfile?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, []);

  const filteredApps = applications.filter((app) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active")
      return ["pending", "viewed", "shortlisted"].includes(app.status);
    return app.status === activeFilter;
  });

  const statusCards = [
    {
      key: "all",
      label: "Total",
      count: statsData.total,
      icon: "layers-outline",
      color: COLORS.primary,
    },
    {
      key: "active",
      label: "Active",
      count: statsData.pending + statsData.viewed + statsData.shortlisted,
      icon: "pulse-outline",
      color: COLORS.info,
    },
    {
      key: "accepted",
      label: "Hired",
      count: statsData.hired,
      icon: "checkmark-circle",
      color: COLORS.success,
    },
    {
      key: "rejected",
      label: "Declined",
      count: statsData.rejected,
      icon: "close-circle",
      color: COLORS.error,
    },
  ];

  const handleCardPress = (item) => {
    if (item.job_posts?.id) {
      navigation.navigate("JobPostDetails", { jobId: item.job_posts.id });
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.secondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.greeting}>
            Hey {profile?.firstname || "Driver"}!
          </Text>
          <Text style={styles.subGreeting}>
            Track your applications and see where you stand.
          </Text>
        </View>

        {/* Stats Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          {statusCards.map((card) => (
            <TouchableOpacity
              key={card.key}
              style={[
                styles.statCard,
                activeFilter === card.key && {
                  borderColor: card.color,
                  borderWidth: 1.5,
                },
              ]}
              onPress={() => setActiveFilter(card.key)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.statIconCircle,
                  { backgroundColor: card.color + "15" },
                ]}
              >
                <Ionicons name={card.icon} size={20} color={card.color} />
              </View>
              <AnimatedCount value={card.count} color={card.color} />
              <Text style={styles.statLabel}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Pipeline Summary */}
        {(statsData.pending > 0 || statsData.viewed > 0) && (
          <View style={styles.pipelineCard}>
            <View style={styles.pipelineHeader}>
              <Ionicons name="git-branch-outline" size={18} color={COLORS.primary} />
              <Text style={styles.pipelineTitle}>Active Pipeline</Text>
            </View>
            <View style={styles.pipelineStages}>
              <View style={styles.pipelineStage}>
                <View style={[styles.pipelineDot, { backgroundColor: COLORS.info }]} />
                <Text style={styles.pipelineCount}>{statsData.pending}</Text>
                <Text style={styles.pipelineLabel}>Pending</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={COLORS.gray[300]} />
              <View style={styles.pipelineStage}>
                <View style={[styles.pipelineDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.pipelineCount}>{statsData.viewed}</Text>
                <Text style={styles.pipelineLabel}>Viewed</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={COLORS.gray[300]} />
              <View style={styles.pipelineStage}>
                <View style={[styles.pipelineDot, { backgroundColor: COLORS.warning }]} />
                <Text style={styles.pipelineCount}>{statsData.shortlisted}</Text>
                <Text style={styles.pipelineLabel}>Shortlisted</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={COLORS.gray[300]} />
              <View style={styles.pipelineStage}>
                <View style={[styles.pipelineDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.pipelineCount}>{statsData.hired}</Text>
                <Text style={styles.pipelineLabel}>Hired</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tip Card */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconBox}>
            <Ionicons
              name="bulb-outline"
              size={18}
              color={COLORS.secondaryDark}
            />
          </View>
          <Text style={styles.tipText}>
            {statsData.shortlisted > 0
              ? "You're shortlisted! Keep your phone nearby — owners may contact you soon."
              : statsData.rejected > statsData.hired
              ? "Keep applying! Each application improves your visibility to owners."
              : "Keep your profile updated to increase your chances of getting hired."}
          </Text>
        </View>

        {/* Applications List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {activeFilter === "all"
              ? "All Applications"
              : activeFilter === "active"
              ? "Active Applications"
              : `${STATUS_CONFIG[activeFilter]?.label || activeFilter} Jobs`}
          </Text>
          <Text style={styles.listCount}>{filteredApps.length}</Text>
        </View>

        {filteredApps.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={48}
              color={COLORS.gray[300]}
            />
            <Text style={styles.emptyTitle}>No applications here</Text>
            <Text style={styles.emptyText}>
              {activeFilter === "all"
                ? "Start applying to jobs to see your progress here."
                : "No applications match this filter."}
            </Text>
            {activeFilter === "all" && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate("DriverMain", { screen: "Jobs" })}
              >
                <Text style={styles.browseButtonText}>Browse Jobs</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredApps.map((item) => (
            <JobApplicationCard
              key={item.id}
              item={item}
              onPress={handleCardPress}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  // Header
  headerSection: { marginBottom: SPACING.md, marginTop: SPACING.sm },
  greeting: {
    fontSize: FONTS.sizes["2xl"],
    fontWeight: "800",
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },

  // Stats
  statsRow: {
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    minWidth: 90,
    borderWidth: 1.5,
    borderColor: "transparent",
    ...SHADOWS.sm,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  countText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: "600",
    marginTop: 2,
  },

  // Pipeline
  pipelineCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  pipelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  pipelineTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  pipelineStages: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pipelineStage: { alignItems: "center", flex: 1 },
  pipelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  pipelineCount: {
    fontSize: FONTS.sizes.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  pipelineLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: "500",
  },

  // Tip
  tipCard: {
    flexDirection: "row",
    backgroundColor: COLORS.successLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary + "25",
  },
  tipIconBox: {
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.secondaryDark,
    lineHeight: 19,
  },

  // List
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  listTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  listCount: {
    fontSize: FONTS.sizes.sm,
    fontWeight: "600",
    color: COLORS.textLight,
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },

  // Job Card
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  jobCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  jobCardInfo: { flex: 1 },
  jobTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  jobLocation: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Step Indicator
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  stepDotContainer: {
    alignItems: "center",
    width: 52,
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepLine: {
    height: 2,
    flex: 1,
    marginTop: 7,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
  },

  // Timeline
  timelinePreview: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 32,
  },
  timelineDotCol: {
    width: 20,
    alignItems: "center",
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  timelineStatus: {
    fontSize: FONTS.sizes.xs,
    fontWeight: "600",
  },
  timelineTime: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 1,
  },
  moreHistory: {
    fontSize: 11,
    color: COLORS.textLight,
    paddingLeft: 24,
    paddingBottom: SPACING.xs,
  },

  // Footer
  jobCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  salaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  salaryText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.secondary,
    fontWeight: "600",
  },
  appliedDate: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING["2xl"],
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },
  browseButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  browseButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: FONTS.sizes.sm,
  },
});

export default JobStatusDashboard;
