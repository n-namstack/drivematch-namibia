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
  const [stats, setStats] = useState({
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
          if (curr.status === "shortlisted") {
            acc.shortlisted++;
          } else if (curr.status === "accepted") {
            acc.hired++;
          } else if (curr.status === "rejected") {
            acc.rejected++;
          }
          return acc;
        },
        { applied: 0, shortlisted: 0, hired: 0, rejected: 0 },
      );

      setStats(counts);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error.message);
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

  const GridCard = ({ label, count, icon, color, onPress }) => (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.countText}>{count}</Text>
      <Text style={styles.labelText}>{label}</Text>
    </TouchableOpacity>
  );

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
            applications stand right now.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <GridCard
            label="Applied Jobs"
            count={stats.applied}
            icon="paper-plane"
            color="#2196F3"
            onPress={() => navigation.navigate("AppliedJobs")}
          />
          <GridCard
            label="Shortlisted Jobs"
            count={stats.shortlisted}
            icon="star"
            color="#FF9800"
            onPress={() => navigation.navigate("ShortlistedNotifications")}
          />
          <GridCard
            label="Hired Jobs"
            count={stats.hired}
            icon="checkmark-circle"
            color="#4CAF50"
            onPress={() => navigation.navigate("HiredHistory")}
          />
          <GridCard
            label="Rejected Jobs"
            count={stats.rejected}
            icon="close-circle"
            color="#F44336"
            onPress={() => navigation.navigate("RejectedJobs")}
          />
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color="#2E7D32" />
          {stats.rejected > 0 && (
            <Text style={styles.tipText}>
              Tip: High-earning drivers use feedback to win. Visit the
              'Rejected' tab to understand owner requirements better and ensure
              your next application is at the top of the pile.
            </Text>
          )}
          {stats.shortlisted === 0 && stats.applied > 0 && (
            <Text style={styles.tipText}>
              Tip: Make sure your profile is complete and highlights your
              experience to increase your chances of getting shortlisted.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  container: { paddingHorizontal: 20 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerSection: { marginBottom: 20, paddingLeft: 4 },
  greeting: { fontSize: 24, fontWeight: "800", color: "#1A1A1A" },
  subGreeting: { fontSize: 14, color: "#666", marginTop: 4 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCard: {
    backgroundColor: "#FFF",
    width: "48%",
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  countText: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  labelText: { fontSize: 12, color: "#888", fontWeight: "600", marginTop: 2 },
  tipCard: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    alignItems: "center",
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: "#2E7D32",
    lineHeight: 18,
    fontStyle: "italic",
  },
});

export default JobStatusDashboard;
