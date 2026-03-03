import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useRoute } from "@react-navigation/native";
import useJobStore from "../../store/useJobStore";
import JobCard from "../../components/JobCard";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../../constants/theme";

const JobBoardScreen = ({ navigation }) => {
  const rout = useRoute();
  const { driverProfile } = useAuth();
  const { filterStatus } = rout.params || {};
  const {
    jobs,
    myInterests, // Now expected to be [{ job_post_id: '...', status: '...' }]
    loading,
    pagination,
    fetchJobs,
    fetchMyInterests,
    expressInterest,
    withdrawInterest,
  } = useJobStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    const q = searchQuery.toLowerCase().trim();

    return jobs.filter((job) => {
      const interest = myInterests?.find((i) => i.job_post_id === job.id);
      const status = interest?.status?.toLowerCase() || "";

      const displayStatus = status;
      return (
        job.title?.toLowerCase().includes(q) ||
        job.location?.toLowerCase().includes(q) ||
        job.description?.toLowerCase().includes(q) ||
        job.vehicle_types?.some((vt) => vt.toLowerCase().includes(q)) ||
        displayStatus.includes(q)
      );
    });
  }, [jobs, searchQuery, myInterests]);

  useFocusEffect(
    useCallback(() => {
      fetchJobs(true);
      if (driverProfile?.id) fetchMyInterests(driverProfile.id);
    }, [driverProfile?.id]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs(true);
    if (driverProfile?.id) await fetchMyInterests(driverProfile.id);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      fetchJobs(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const initializeScreen = async () => {
        try {
          if (filterStatus) {
            setSearchQuery(filterStatus === "applied" ? "" : filterStatus);
          }
          await fetchJobs(true);

          if (driverProfile?.id) {
            await fetchMyInterests(driverProfile.id);
          }
        } catch (error) {
          console.error("Error refreshing job board:", error);
        }
      };

      initializeScreen();
    }, [filterStatus, driverProfile?.id]), // Added driverProfile.id to deps for safety
  );

  // Helper to get the specific interest record for a job
  const getInterestForJob = (jobId) => {
    return myInterests?.find((interest) => interest.job_post_id === jobId);
  };

  const handleInterest = (job) => {
    const interestRecord = getInterestForJob(job.id);
    const hasInterest = !!interestRecord;

    // If already hired or rejected, we don't want them withdrawing interest
    if (
      interestRecord?.status === "accepted" ||
      interestRecord?.status === "rejected"
    ) {
      return;
    }

    if (hasInterest) {
      Alert.alert(
        "Withdraw Interest",
        "Are you sure you want to withdraw your interest in this job?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Withdraw",
            style: "destructive",
            onPress: async () => {
              const { error } = await withdrawInterest(
                job.id,
                driverProfile.id,
              );
              if (error) Alert.alert("Error", "Could not withdraw interest.");
              else fetchMyInterests(driverProfile.id);
            },
          },
        ],
      );
    } else {
      Alert.alert(
        "Express Interest",
        `Let ${job.owner?.firstname || "the owner"} know you're interested in "${job.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "I'm Interested",
            onPress: async () => {
              const { error } = await expressInterest(job.id, driverProfile.id);
              if (error) {
                if (
                  error.message?.includes("duplicate") ||
                  error.code === "23505"
                ) {
                  Alert.alert(
                    "Already Interested",
                    "You have already expressed interest in this job.",
                  );
                } else {
                  Alert.alert(
                    "Error",
                    error.message ||
                      "Could not express interest. Please try again.",
                  );
                }
              } else {
                Alert.alert(
                  "Interest Sent!",
                  `${job.owner?.firstname || "The owner"} will be notified.`,
                );
                fetchMyInterests(driverProfile.id);
              }
            },
          },
        ],
      );
    }
  };


  const renderJob = ({ item: job }) => {
    const interestRecord = getInterestForJob(job.id);
    const status = interestRecord?.status; // 'applied', 'shortlisted', 'accepted', 'rejected'

    // Map database status to UI labels and colors
    const getStatusUI = () => {
      switch (status) {
        case "accepted":
          return {
            label: "Hired!",
            icon: "checkmark-done-circle",
            color: "#4CAF50",
            active: true,
          };
        case "shortlisted":
          return {
            label: "Shortlisted",
            icon: "star",
            color: "#FF9800",
            active: true,
          };
        case "rejected":
          return {
            label: "Rejected",
            icon: "close-circle",
            color: "#F44336",
            active: true,
          };
        case "pending":
          return {
            label: "Interested",
            icon: "checkmark-circle",
            color: COLORS.secondary,
            active: true,
          };
        default:
          return {
            label: "I'm Interested",
            icon: "hand-right-outline",
            color: COLORS.primary,
            active: false,
          };
      }
    };

    const ui = getStatusUI();

    return (
      <View style={styles.jobWrapper}>
        <JobCard
          job={job}
          status={ui.label}
          statusColor={ui.color}
          statusIcon={ui.icon}
          hasInterest={!!interestRecord}
          onPress={() =>
            navigation.navigate("JobPostDetails", { jobId: job.id })
          }
        />

        <TouchableOpacity
          style={[
            styles.interestButton,
            ui.active && {
              borderColor: ui.color,
              // backgroundColor: ui.color + "20",
            },
          ]}
          onPress={() => handleInterest(job)}
          disabled={status === "accepted" || status === "rejected"}
        >
          <Ionicons name={ui.icon} size={18} color={ui.color} />
          <Text style={[styles.interestButtonText, { color: ui.color }]}>
            {ui.label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Job Opportunities</Text>
          <Text style={styles.headerSubtitle}>Find your next hustle</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, location..."
            placeholderTextColor={COLORS.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={COLORS.gray[400]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading && jobs.length > 0 ? (
            <ActivityIndicator
              style={{ padding: SPACING.md }}
              color={COLORS.primary}
            />
          ) : null
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons
                name="briefcase-outline"
                size={56}
                color={COLORS.gray[300]}
              />
              <Text style={styles.emptyTitle}>No Jobs Found</Text>
              <Text style={styles.emptySubtitle}>
                Check back later for new opportunities
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
  searchContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  jobWrapper: { marginBottom: SPACING.md },
  interestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 12,
    marginTop: -10, // Pulls the button slightly into the JobCard for a merged look
    ...SHADOWS.sm,
  },
  interestButtonText: {
    fontSize: 16,
    fontWeight: "700",
    backgroundColor: "transparent",
  },
  emptyState: { alignItems: "center", paddingTop: 100, paddingHorizontal: 40 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});

export default JobBoardScreen;
