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
}) => {
  if (!driverId || !jobPostId) {
    return null;
  }
  const [loading, setLoading] = useState(null);

  console.log(
    "Driver id (selection): ",
    driverId,
    " | Job post id (selection): ",
    jobPostId,
  );

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
      performUpdate(newStatus);
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

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(null);
      } else if (data && data.length > 0) {
        onStatusUpdate(newStatus);
      } else {
        // This happens if the policy blocks the update or IDs are wrong
        Alert.alert(
          "Unauthorized",
          "You don't have permission to update this driver.",
        );
      }
    } catch (e) {
      console.log("App Error:", e);
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
          <Text style={styles.successText}>🏆 DRIVER HIRED</Text>
        </View>
        <Text style={styles.subText}>Selection finalized for this job.</Text>
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

        {/* STEP 2: Hire */}
        {currentStatus === "shortlisted" && (
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
