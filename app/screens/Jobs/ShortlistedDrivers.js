import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from "react-native";
import supabase from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";

const ShortlistedDriversScreen = ({ route, navigation }) => {
  const { jobId, jobTitle } = route.params;
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShortlistedDrivers();
  }, []);

  const fetchShortlistedDrivers = async () => {
    try {
      // We query job_interests but "join" the profiles table to get driver info
      const { data, error } = await supabase
        .from("job_interests")
        .select(
          `
            driver_id,
            status,
            driver_profiles:driver_id(
              user_id,
              years_of_experience,
              availability,
              vehicle_types,
              has_pdp,
              preferred_areas,
              profiles:user_id(
                id,
                firstname,
                lastname,
                profile_image,
                location,
                phone
              )
            )
        `,
        )
        .eq("job_post_id", jobId)
        .eq("status", "shortlisted");

      console.log("Data: ", data);

      if (error) throw error;
      setDrivers(data || []);
    } catch (err) {
      console.error("Error fetching drivers:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderDriver = ({ item }) => {
    const driver = item.driver_profiles;
    const shortlisted = driver?.profiles;

    const firstName = shortlisted?.firstname || "";
    const lastName = shortlisted?.lastname || "";
    const initials =
      `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("DriverDetails", {
            driverId: item.driver_id,
            jobPostId: jobId,
          })
        }
      >
        <View style={styles.driverCard}>
          {shortlisted?.profile_image ? (
            <Image
              source={{ uri: shortlisted.profile_image }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.initialsContainer]}>
              <Text style={styles.initialsText}>{initials || "?"}</Text>
            </View>
          )}

          <View style={styles.info}>
            <Text style={styles.name}>
              {shortlisted?.firstname} {shortlisted?.lastname}
            </Text>
            <View style={styles.metaRow}>
              {/* Availability Badge */}
              <View
                style={[
                  styles.badge,
                  driver.availability?.toLowerCase() === "full_time"
                    ? styles.badgeAvailable
                    : styles.badgeBusy,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    driver.availability?.toLowerCase() === "full_time"
                      ? styles.textAvailable
                      : styles.textBusy,
                  ]}
                >
                  {driver.availability.replace("_", " ") || "Unknown"}
                </Text>
              </View>

              <Text style={styles.phoneText}> | {shortlisted?.phone}</Text>
            </View>
          </View>

          <View style={styles.viewProfileBtn} activeOpacity={0.6}>
            <Text style={styles.viewText}>View</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Shortlisted for {jobTitle}</Text>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => item.id}
          renderItem={renderDriver}
          ListEmptyComponent={
            <Text style={styles.empty}>No drivers shortlisted yet.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 16 },
  header: { fontSize: 18, fontWeight: "bold", marginBottom: 20, color: "#333" },
  driverCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff", 
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 4, 

    // Android
    elevation: 5,

    // iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    borderRadius: 10,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#eee" },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: "bold" },
  details: { color: "#666", fontSize: 13, marginTop: 2 },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25, // Circular
  },
  initialsContainer: {
    backgroundColor: COLORS.primary, // Or a nice gray like '#E1E1E1'
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  driverCard: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
    backgroundColor: "#FFF",
    // ... shadows ...
  },

  viewButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  viewProfileBtn: {
    flexDirection: "row", // Align text and icon horizontally
    alignItems: "center",
    backgroundColor: COLORS.white, // Very light green background to make it look clickable
    paddingVertical: 6,
    paddingHorizontal: 10,
    // marginLeft: 15,
    borderRadius: 20, // Pill shape
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  viewText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4, // Space between text and chevron
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeAvailable: {
    backgroundColor: "#E8F5E9", // Light Green
    borderColor: "#C8E6C9",
    borderWidth: 1,
  },
  badgeBusy: {
    backgroundColor: "#FFF3E0", // Light Orange
    borderColor: "#FFE0B2",
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  textAvailable: {
    color: "#2E7D32",
  },
  textBusy: {
    color: "#EF6C00",
  },
  phoneText: {
    fontSize: 13,
    color: "#666",
  },
});

export default ShortlistedDriversScreen;
