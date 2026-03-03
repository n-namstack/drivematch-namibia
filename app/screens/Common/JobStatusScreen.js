import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const JobStatusDashboard = ({ navigation }) => {
  const { profile, driverProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsData, setStatsData] = useState({
    applied: 0,
    shortlisted: 0,
    hired: 0,
    rejected: 0,
  });

  const fetchStats = async () => {
    if (!driverProfile?.id) return;
    try {
      const { data, error } = await supabase
        .from("job_interests")
        .select("status")
        .eq("driver_id", driverProfile?.id);

      if (error) throw error;

      const counts = (data || []).reduce(
        (acc, curr) => {
          acc.applied++;
          if (curr.status === "shortlisted") acc.shortlisted++;
          else if (curr.status === "accepted") acc.hired++;
          else if (curr.status === "rejected") acc.rejected++;
          return acc;
        },
        { applied: 0, shortlisted: 0, hired: 0, rejected: 0 },
      );
      setStatsData(counts);
    } catch (error) {
      console.error("Error fetching stats:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel("driver-grid-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_interests",
          filter: `driver_id=eq.${driverProfile?.id}`,
        },
        () => fetchStats(),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [driverProfile?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  // 🛠️ The Array-Mapped Logic
  const statusCards = [
    {
      label: "Applied Jobs",
      count: statsData.applied,
      icon: "paper-plane",
      color: "#2196F3",
      filter: "applied",
    },
    {
      label: "Shortlisted",
      count: statsData.shortlisted,
      icon: "star",
      color: "#FF9800",
      filter: "shortlisted",
    },
    {
      label: "Hired Jobs",
      count: statsData.hired,
      icon: "checkmark-circle",
      color: "#4CAF50",
      filter: "accepted",
    },
    {
      label: "Not Selected",
      count: statsData.rejected,
      icon: "close-circle",
      color: "#F44336",
      filter: "rejected",
    },
  ];

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2E7D32"
          />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.greeting}>
            Wassup {profile?.firstname || "Driver"}!
          </Text>
          <Text style={styles.subGreeting}>
            Your hustle is paying off. Here is a live look at where your
            applications stand.
          </Text>
        </View>

        {/*Rendered Grid using .map() */}
        <View style={styles.statsGrid}>
          {statusCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={styles.gridCard}
              onPress={() =>
                navigation.navigate("JobBoard", { filterStatus: card.filter })
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: card.color + "15" },
                ]}
              >
                <Ionicons name={card.icon} size={24} color={card.color} />
              </View>
              <Text style={styles.countText}>{card.count}</Text>
              <Text style={styles.labelText}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIconBox}>
            <Ionicons name="bulb-outline" size={20} color="#2E7D32" />
          </View>
          <Text style={styles.tipText}>
            {statsData.rejected > 0
              ? "Pro Tip: High-earning drivers use feedback to win. Check your 'Not Selected' jobs to see how to sharpen your profile!"
              : "Pro Tip: Keep your profile updated with your latest experience to stay at the top of the owners' lists."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  container: { paddingHorizontal: 20, paddingBottom: 30 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerSection: { marginBottom: 24, marginTop: 10 },
  greeting: { fontSize: 26, fontWeight: "800", color: "#1A1A1A" },
  subGreeting: { fontSize: 15, color: "#555", marginTop: 6, lineHeight: 22 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCard: {
    backgroundColor: "#FFF",
    width: "48%",
    paddingVertical: 22,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  countText: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  labelText: { fontSize: 13, color: "#888", fontWeight: "600" },
  tipCard: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    padding: 18,
    borderRadius: 20,
    marginTop: 10,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  tipIconBox: { backgroundColor: "#FFF", padding: 8, borderRadius: 12 },
  tipText: { flex: 1, fontSize: 13, color: "#1B5E20", lineHeight: 20 },
});

export default JobStatusDashboard;
