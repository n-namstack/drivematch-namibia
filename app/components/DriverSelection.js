import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../lib/supabase";
import { COLORS } from "../constants/theme";
import agreementService from "../services/agreementService";

const SelectionActions = ({
  driverId,
  jobPostId,
  currentStatus,
  onStatusUpdate,
  positionsAvailable = 1,
  hiredCount = 0,
  ownerId,
  driverName,
}) => {
  if (!driverId || !jobPostId) {
    return null;
  }
  const navigation = useNavigation();
  const [loading, setLoading] = useState(null);
  const [existingAgreement, setExistingAgreement] = useState(undefined); // undefined = loading, null = none

  // Check for existing agreement when in hired state
  useEffect(() => {
    if (currentStatus === "accepted" && ownerId && driverId) {
      agreementService.checkExistingAgreement(ownerId, driverId).then(({ data }) => {
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
          <Text style={styles.successText}>DRIVER HIRED</Text>
        </View>
        <Text style={styles.subText}>This driver has been hired for this job.</Text>
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
              name={existingAgreement ? "bar-chart-outline" : "document-text-outline"}
              size={18}
              color={COLORS.white}
            />
            <Text style={styles.agreementBtnText}>
              {existingAgreement ? "View Dashboard" : "Set Up Payment Agreement"}
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
        {currentStatus === "shortlisted" && hiredCount >= positionsAvailable && (
          <View style={[styles.btn, styles.filledBtn]}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
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
  agreementBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
    width: "100%",
  },
  agreementBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SelectionActions;
