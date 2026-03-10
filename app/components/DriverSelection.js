import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../lib/supabase";
import { COLORS, SPACING, BORDER_RADIUS } from "../constants/theme";

const SelectionActions = ({
  driverId,
  jobPostId,
  currentStatus,
  onStatusUpdate,
  positionsAvailable = 1,
  hiredCount = 0,
  ownerId,
  driverName,
  jobTile,
  driverUuId,
}) => {
  if (!driverId || !jobPostId) {
    return null;
  }
  const [loading, setLoading] = useState(null);

  const handleUpdate = async (newStatus) => {
    if (newStatus === "accepted") {
      Alert.alert(
        "Confirm Hire",
        "Are you sure you want to hire this driver for this job?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Hire", onPress: () => performUpdate(newStatus) },
        ],
      );
    } else {
      if (newStatus === "shortlisted") {
        Alert.alert(
          "Shortlisted",
          `${driverName} will be notified on his/her application status(${newStatus}) for this job`,
        );
        performUpdate(newStatus);
      } else if (newStatus === "rejected") {
        Alert.alert(
          "Rejected",
          `Are you sure you want to reject ${driverName} for this applicant?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Yes, Reject", onPress: () => performUpdate(newStatus) },
          ],
        );
      }
    }
  };

  const notifyDriverOfStatusChange = async (
    driverUuId,
    jobTitle,
    newStatus,
  ) => {
    const statusConfig = {
      shortlisted: {
        title: "You've been Shortlisted! 🎉",
        message: `Great new! You have been shortlisted for the ${jobTitle} position. Keep an eye on your message`,
        type: "job_update",
      },
      rejected: {
        title: "Application Update",
        message: `The owner for ${jobTitle} position has moved forward with other candidates. Don't give up more jobs are comming`,
        type: "job_update",
      },
      accepted: {
        title: "You're Hired! 🚚",
        message: `Congratulations! You have been selected for the ${jobTitle} job. Contact the owner to start.`,
        type: "job_update",
      },
    };

    const config = statusConfig[newStatus];

    if (driverUuId && config) {
      try {
        const { error } = await supabase.from("notifications").insert({
          user_id: driverUuId,
          type: config.type,
          title: config.title,
          message: config.message,
          is_read: false,
        });

        if (error) throw error;
      } catch (error) {
        // Non-critical: notification send failed
      }
    }
  };

  const performUpdate = async (newStatus) => {
    setLoading(newStatus);

    try {
      const { data, error } = await supabase
        .from("job_interests")
        .update({ status: newStatus })
        .eq("driver_id", driverId)
        .eq("job_post_id", jobPostId)
        .select();

      // Send notification to driver about status change
      notifyDriverOfStatusChange(driverUuId, jobTile, newStatus);
      if (error) {
        Alert.alert("Error", error.message);
        setLoading(null);
      } else if (data && data.length > 0) {
        onStatusUpdate(newStatus);
      } else {
        Alert.alert(
          "Unauthorized",
          "You don't have permission to update this driver.",
        );
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  // 1. HIRED STATE
  if (currentStatus === "accepted") {
    return (
      <View style={styles.decisionContainer}>
        <View style={[styles.statusBanner, styles.bannerSuccess]}>
          <Ionicons name="trophy" size={20} color={COLORS.secondaryDark} />
          <Text style={styles.successText}>DRIVER HIRED</Text>
        </View>
        <Text style={styles.subText}>This driver has been hired for this job.</Text>
      </View>
    );
  }

  // 2. REJECTED STATE
  if (currentStatus === "rejected") {
    return (
      <View style={styles.decisionContainer}>
        <View style={[styles.statusBanner, styles.bannerGrey]}>
          <Ionicons name="close-circle" size={20} color={COLORS.gray[500]} />
          <Text style={styles.greyText}>DECLINED</Text>
        </View>
      </View>
    );
  }

  // 3. ACTIVE STEPS (Pending, Viewed, or Shortlisted)
  return (
    <View style={styles.wrapper}>
      {currentStatus === "shortlisted" && (
        <View style={styles.infoBadge}>
          <Ionicons name="star" size={14} color={COLORS.primary} />
          <Text style={styles.infoText}>Currently in your Shortlist</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        {/* REJECT BUTTON */}
        <TouchableOpacity
          style={[styles.btn, styles.declineBtn]}
          onPress={() => handleUpdate("rejected")}
          disabled={loading !== null}
        >
          {loading === "rejected" ? (
            <ActivityIndicator color={COLORS.rejected} />
          ) : (
            <>
              <Ionicons name="close" size={20} color={COLORS.rejected} />
              <Text style={styles.declineText}>Reject</Text>
            </>
          )}
        </TouchableOpacity>

        {/* STEP 1: Shortlist */}
        {(currentStatus === "pending" || currentStatus === "viewed") && (
          <TouchableOpacity
            style={[styles.btn, styles.shortlistBtn]}
            onPress={() => handleUpdate("shortlisted")}
            disabled={loading !== null}
          >
            {loading === "shortlisted" ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="list" size={18} color={COLORS.white} />
                <Text style={styles.whiteText}>Shortlist</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* STEP 2: Hire (only if positions still available) */}
        {currentStatus === "shortlisted" && hiredCount < positionsAvailable && (
          <TouchableOpacity
            style={[styles.btn, styles.acceptBtn]}
            onPress={() => handleUpdate("accepted")}
            disabled={loading !== null}
          >
            {loading === "accepted" ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
                <Text style={styles.whiteText}>Final Hire</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {currentStatus === "shortlisted" &&
          hiredCount >= positionsAvailable && (
            <View style={[styles.btn, styles.filledBtn]}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={COLORS.success}
              />
              <Text style={styles.filledText}>All Positions Filled</Text>
            </View>
          )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingBottom: SPACING.sm,
  },
  infoBadge: {
    backgroundColor: COLORS.infoLight,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.xs,
  },
  infoText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  buttonRow: { flexDirection: "row", padding: SPACING.md, gap: SPACING.lg },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
  },
  declineBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.rejected,
  },
  shortlistBtn: { backgroundColor: COLORS.primary },
  acceptBtn: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  filledBtn: { backgroundColor: COLORS.successLight, borderColor: COLORS.success },
  filledText: { color: COLORS.success, fontSize: 13, fontWeight: "600" },
  whiteText: { color: COLORS.white, fontSize: 16 },
  declineText: { color: COLORS.rejected, fontSize: 16 },
  decisionContainer: {
    padding: SPACING.lg,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  bannerSuccess: { backgroundColor: COLORS.successLight },
  bannerGrey: { backgroundColor: COLORS.gray[100] },
  successText: { color: COLORS.success, fontWeight: "bold" },
  greyText: { color: COLORS.gray[500], fontWeight: "bold" },
  subText: { color: COLORS.textLight, fontSize: 12, marginTop: SPACING.xs },
});

export default SelectionActions;
