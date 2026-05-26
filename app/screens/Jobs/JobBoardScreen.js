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
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useRoute } from "@react-navigation/native";
import useJobStore from "../../store/useJobStore";
import useModerationStore from "../../store/useModerationStore";
import { requireAuth } from "../../utils/requireAuth";
import JobCard from "../../components/JobCard";
import ScreenHeader from "../../components/ScreenHeader";
import LocationAutocomplete from "../../components/LocationAutocomplete";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  VEHICLE_TYPES,
  AVAILABILITY_OPTIONS,
} from "../../constants/theme";

const EXPERIENCE_OPTIONS = [
  { id: "any", label: "Any Level" },
  { id: "beginner", label: "0-2 years" },
  { id: "intermediate", label: "2-5 years" },
  { id: "experienced", label: "5+ years" },
];

const DEFAULT_FILTERS = {
  location: null,
  availability: null,
  vehicleTypes: [],
  experience: null,
};

const JobBoardScreen = ({ navigation }) => {
  const route = useRoute();
  const { user, profile, driverProfile } = useAuth();
  const isOwner = profile?.role === "owner";
  const blockedIds = useModerationStore((s) => s.blockedIds);
  const { filterStatus } = route.params || {};
  const {
    jobs,
    myInterests,
    loading,
    pagination,
    fetchJobs,
    fetchMyInterests,
    expressInterest,
    withdrawInterest,
  } = useJobStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tempFilters, setTempFilters] = useState(DEFAULT_FILTERS);

  const hasActiveFilters = useMemo(
    () =>
      filters.location ||
      filters.availability ||
      filters.vehicleTypes.length > 0 ||
      filters.experience,
    [filters],
  );

  const filteredJobs = useMemo(() => {
    // Hide posts from blocked users (instant feed removal)
    let result = blockedIds.size
      ? jobs.filter((job) => !blockedIds.has(job.owner_id))
      : jobs;

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((job) => {
        const interest = myInterests?.find((i) => i.job_post_id === job.id);
        const status = interest?.status?.toLowerCase() || "";
        return (
          job.title?.toLowerCase().includes(q) ||
          job.location?.toLowerCase().includes(q) ||
          job.description?.toLowerCase().includes(q) ||
          job.vehicle_types?.some((vt) => vt.toLowerCase().includes(q)) ||
          status.includes(q)
        );
      });
    }

    // Location filter
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      result = result.filter((job) =>
        job.location?.toLowerCase().includes(loc),
      );
    }

    // Availability filter
    if (filters.availability) {
      result = result.filter(
        (job) => job.availability_type === filters.availability,
      );
    }

    // Vehicle types filter
    if (filters.vehicleTypes.length > 0) {
      result = result.filter((job) =>
        job.vehicle_types?.some((vt) => filters.vehicleTypes.includes(vt)),
      );
    }

    // Experience filter
    if (filters.experience && filters.experience !== "any") {
      result = result.filter(
        (job) => job.experience_level === filters.experience,
      );
    }

    return result;
  }, [jobs, searchQuery, myInterests, filters, blockedIds]);

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
          // silently handle error
        }
      };

      initializeScreen();
    }, [filterStatus, driverProfile?.id]),
  );

  const getInterestForJob = (jobId) => {
    return myInterests?.find((interest) => interest.job_post_id === jobId);
  };

  const handleInterest = (job) => {
    if (!requireAuth(user, navigation, "Sign in to apply for jobs.")) return;
    if (!driverProfile?.id) {
      Alert.alert("Complete your profile", "Finish setting up your driver profile before applying for jobs.");
      return;
    }
    if (driverProfile.verification_status !== 'verified') {
      Alert.alert("Verification Required", "Complete document verification before applying for jobs.");
      return;
    }

    const interestRecord = getInterestForJob(job.id);
    const hasInterest = !!interestRecord;

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
              const { error } = await expressInterest(
                job.id,
                driverProfile.id,
              );
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

  const openFilters = () => {
    setTempFilters({ ...filters });
    setShowFilters(true);
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setShowFilters(false);
  };

  const resetFilters = () => {
    setTempFilters(DEFAULT_FILTERS);
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
  };

  const removeFilter = (key) => {
    const updated = {
      ...filters,
      [key]: key === "vehicleTypes" ? [] : null,
    };
    setFilters(updated);
  };

  const toggleVehicleType = (typeId) => {
    const current = tempFilters.vehicleTypes || [];
    if (current.includes(typeId)) {
      setTempFilters({
        ...tempFilters,
        vehicleTypes: current.filter((t) => t !== typeId),
      });
    } else {
      setTempFilters({
        ...tempFilters,
        vehicleTypes: [...current, typeId],
      });
    }
  };

  const renderJob = ({ item: job }) => {
    const interestRecord = getInterestForJob(job.id);
    const status = interestRecord?.status;

    const getStatusUI = () => {
      switch (status) {
        case "accepted":
          return {
            label: "Hired!",
            icon: "checkmark-done-circle",
            color: COLORS.success,
            active: true,
          };
        case "shortlisted":
          return {
            label: "Shortlisted",
            icon: "star",
            color: COLORS.warning,
            active: true,
          };
        case "rejected":
          return {
            label: "Rejected",
            icon: "close-circle",
            color: COLORS.error,
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
          status={!isOwner ? ui.label : undefined}
          statusColor={!isOwner ? ui.color : undefined}
          statusIcon={!isOwner ? ui.icon : undefined}
          hasInterest={!isOwner && !!interestRecord}
          onPress={() =>
            navigation.navigate("JobPostDetails", { jobId: job.id })
          }
        />

        {!isOwner && (
          <TouchableOpacity
            style={[
              styles.interestButton,
              ui.active && {
                borderColor: ui.color,
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
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Job Opportunities" subtitle="Find your next hustle" />

      {/* Search + Filter Button */}
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
        <TouchableOpacity
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
          onPress={openFilters}
        >
          <Ionicons
            name="options"
            size={20}
            color={hasActiveFilters ? COLORS.white : COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <View style={styles.activeFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.location && (
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => removeFilter("location")}
              >
                <Text style={styles.filterChipText}>{filters.location}</Text>
                <Ionicons name="close" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {filters.availability && (
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => removeFilter("availability")}
              >
                <Text style={styles.filterChipText}>
                  {AVAILABILITY_OPTIONS.find(
                    (a) => a.id === filters.availability,
                  )?.label || filters.availability}
                </Text>
                <Ionicons name="close" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {filters.vehicleTypes.length > 0 && (
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => removeFilter("vehicleTypes")}
              >
                <Text style={styles.filterChipText}>
                  {filters.vehicleTypes.length} vehicle type
                  {filters.vehicleTypes.length > 1 ? "s" : ""}
                </Text>
                <Ionicons name="close" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {filters.experience && filters.experience !== "any" && (
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => removeFilter("experience")}
              >
                <Text style={styles.filterChipText}>
                  {EXPERIENCE_OPTIONS.find((e) => e.id === filters.experience)
                    ?.label || filters.experience}
                </Text>
                <Ionicons name="close" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Results count when filters active */}
      {(hasActiveFilters || searchQuery.trim()) && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}{" "}
            found
          </Text>
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

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
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Check back later for new opportunities"}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearAllFilters}
                >
                  <Text style={styles.clearButtonText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Location */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Location</Text>
              <LocationAutocomplete
                value={tempFilters.location || ""}
                onSelect={(loc) =>
                  setTempFilters({ ...tempFilters, location: loc || null })
                }
                placeholder="Search for a location..."
              />
            </View>

            {/* Availability Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Availability Type</Text>
              <View style={styles.optionsRow}>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionChip,
                      tempFilters.availability === option.id &&
                        styles.optionChipSelected,
                    ]}
                    onPress={() =>
                      setTempFilters({
                        ...tempFilters,
                        availability:
                          tempFilters.availability === option.id
                            ? null
                            : option.id,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        tempFilters.availability === option.id &&
                          styles.optionChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Vehicle Types */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Vehicle Types</Text>
              <View style={styles.optionsRow}>
                {VEHICLE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.optionChip,
                      (tempFilters.vehicleTypes || []).includes(type.id) &&
                        styles.optionChipSelected,
                    ]}
                    onPress={() => toggleVehicleType(type.id)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        (tempFilters.vehicleTypes || []).includes(type.id) &&
                          styles.optionChipTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Experience Level */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Experience Level</Text>
              <View style={styles.optionsRow}>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionChip,
                      tempFilters.experience === option.id &&
                        styles.optionChipSelected,
                    ]}
                    onPress={() =>
                      setTempFilters({
                        ...tempFilters,
                        experience:
                          tempFilters.experience === option.id
                            ? null
                            : option.id,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        tempFilters.experience === option.id &&
                          styles.optionChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
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
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  activeFilters: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.xs,
    gap: SPACING.xs,
  },
  filterChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  resultsCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  clearFiltersText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
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
    marginTop: -10,
    ...SHADOWS.sm,
  },
  interestButtonText: {
    fontSize: 16,
    fontWeight: "700",
    backgroundColor: "transparent",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
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
  clearButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
  },
  clearButtonText: {
    color: COLORS.white,
    fontWeight: "500",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  resetText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  filterSection: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  filterLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  optionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[100],
  },
  optionChipSelected: {
    backgroundColor: COLORS.primary,
  },
  optionChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  optionChipTextSelected: {
    color: COLORS.white,
  },
  modalFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: "bold",
  },
});

export default JobBoardScreen;
