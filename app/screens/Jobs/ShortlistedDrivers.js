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
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from "../../constants/theme";

const ShortlistedDriversScreen = ({ route, navigation }) => {
  const { jobId, jobTitle } = route.params;
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShortlistedDrivers();
  }, []);

  const fetchShortlistedDrivers = async () => {
    try {
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

      if (error) throw error;
      setDrivers(data || []);
    } catch (err) {
      // Silently handle — empty list shown via ListEmptyComponent
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
              <View
                style={[
                  styles.badge,
                  driver?.availability?.toLowerCase() === "full_time"
                    ? styles.badgeAvailable
                    : styles.badgeBusy,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    driver?.availability?.toLowerCase() === "full_time"
                      ? styles.textAvailable
                      : styles.textBusy,
                  ]}
                >
                  {driver?.availability?.replace("_", " ") || "Unknown"}
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
          keyExtractor={(item) => item.driver_id}
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
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  header: { fontSize: FONTS.sizes.lg, fontWeight: "bold", marginBottom: 20, color: COLORS.text },
  driverCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    marginBottom: SPACING.md,
    marginHorizontal: 4,
    ...SHADOWS.lg,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.gray[200],
  },
  initialsContainer: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: "bold",
  },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: FONTS.sizes.md, fontWeight: "bold" },
  details: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm - 1, marginTop: 2 },
  empty: { textAlign: "center", marginTop: 50, color: COLORS.textLight },
  viewButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  viewText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: "600",
    marginRight: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: 8,
  },
  badgeAvailable: {
    backgroundColor: COLORS.success + '1A',
    borderColor: COLORS.success + '40',
    borderWidth: 1,
  },
  badgeBusy: {
    backgroundColor: COLORS.warning + '1A',
    borderColor: COLORS.warning + '40',
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  textAvailable: {
    color: COLORS.secondaryDark,
  },
  textBusy: {
    color: COLORS.accentDark,
  },
  phoneText: {
    fontSize: FONTS.sizes.sm - 1,
    color: COLORS.textSecondary,
  },
});

export default ShortlistedDriversScreen;
