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
import { COLORS } from "../constants/theme";

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
  const [existingAgreement, setExistingAgreement] = useState(undefined); // undefined = loading, null = none

  // Check for existing agreement when in hired state
  useEffect(() => {
    if (currentStatus === "accepted" && ownerId && driverId) {
      agreementService
        .checkExistingAgreement(ownerId, driverId)
        .then(({ data }) => {
          setExistingAgreement(data || null);
        });
    }
  }, [currentStatus, ownerId, driverId]);

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

    console.log("Notification data: ", config);

    console.log(`Driver id: ${driverId} | Driver uuid: ${driverUuId}`);

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
        console.log(`Notification sent to driver: ${newStatus}`);
      } catch (error) {
        console.log("Failed to send notification: ", error);
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
          <Ionicons name="trophy" size={20} color="#00875A" />
          <Text style={styles.successText}>DRIVER HIRED</Text>
        </View>
        <Text style={styles.subText}>
          This driver has been hired for this job.
        </Text>
        {existingAgreement !== undefined && (
          <TouchableOpacity
            style={styles.agreementBtn}
            onPress={() => {
              if (existingAgreement) {
                navigation.navigate("ManagementDashboard", {
                  agreementId: existingAgreement.id,
                });
              } else {
                navigation.navigate("AgreementSetup", {
                  driverId,
                  driverName: driverName || "Driver",
                  jobPostId,
                });
              }
            }}
          >
            <Ionicons
              name={
                existingAgreement
                  ? "bar-chart-outline"
                  : "document-text-outline"
              }
              size={18}
              color={COLORS.white}
            />
            <Text style={styles.agreementBtnText}>
              {existingAgreement
                ? "View Dashboard"
                : "Set Up Payment Agreement"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 2. REJECTED STATE
  if (currentStatus === "rejected") {
    return (
      <View style={styles.decisionContainer}>
        <View style={[styles.statusBanner, styles.bannerGrey]}>
          <Ionicons name="close-circle" size={20} color="#666" />
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
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFF" />
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
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingBottom: 10,
  },
  infoBadge: {
    backgroundColor: "#E7F1FF",
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  infoText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  buttonRow: { flexDirection: "row", padding: 16, gap: 24 },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: 8,
  },
  declineBtn: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: COLORS.rejected,
  },
  shortlistBtn: { backgroundColor: COLORS.primary },
  acceptBtn: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  filledBtn: { backgroundColor: "#E6F4EA", borderColor: COLORS.success },
  filledText: { color: COLORS.success, fontSize: 13, fontWeight: "600" },
  whiteText: { color: COLORS.white, fontSize: 16 },
  declineText: { color: COLORS.rejected, fontSize: 16 },
  decisionContainer: {
    padding: 25,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  bannerSuccess: { backgroundColor: "#E6F4EA" },
  bannerGrey: { backgroundColor: "#F5F5F5" },
  successText: { color: COLORS.success, fontWeight: "bold" },
  greyText: { color: "#666", fontWeight: "bold" },
  subText: { color: "#999", fontSize: 12, marginTop: 4 },
});

export default SelectionActions;
