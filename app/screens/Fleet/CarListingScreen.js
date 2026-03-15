// src/features/fleet/screens/CarListScreen.js
// Fleet overview — list of all owner's vehicles

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  COLORS,
  fleetTheme as T,
  VEHICLE_STATUS_CONFIG,
} from "../../constants/theme";
import {
  VehicleCard,
  EmptyState,
  SectionHeader,
} from "../../components/FleetCards";
import {
  getMyVehicles,
  deleteVehicle,
  updateVehicle,
} from "../../services/FleetService";

const STATUS_FILTERS = [
  "all",
  "available",
  "assigned",
  "maintenance",
  "inactive",
];

export default function CarListingScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, []),
  );

  async function fetchVehicles(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getMyVehicles();
      setVehicles(data);
      applyFilters(data, activeFilter, search);
    } catch (err) {
      //   Alert.alert("Error", "Could not load your fleet.");
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function applyFilters(list, filter, searchText) {
    let result = list;
    if (filter !== "all") result = result.filter((v) => v.status === filter);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (v) =>
          v.make?.toLowerCase().includes(q) ||
          v.model?.toLowerCase().includes(q) ||
          v.registration_number?.toLowerCase().includes(q),
      );
    }
    setFiltered(result);
  }

  function handleFilterChange(filter) {
    setActiveFilter(filter);
    applyFilters(vehicles, filter, search);
  }

  function handleSearch(text) {
    setSearch(text);
    applyFilters(vehicles, activeFilter, text);
  }

  function handleLongPress(vehicle) {
    Alert.alert(
      `${vehicle.make} ${vehicle.model}`,
      "What would you like to do?",
      [
        {
          text: "Edit",
          onPress: () => navigation.navigate("AddCar", { vehicle }),
        },
        {
          text:
            vehicle.status === "maintenance"
              ? "Mark Available"
              : "Mark as Maintenance",
          onPress: () => toggleMaintenance(vehicle),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDelete(vehicle),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }

  async function toggleMaintenance(vehicle) {
    const newStatus =
      vehicle.status === "maintenance" ? "available" : "maintenance";
    try {
      await updateVehicle(vehicle.id, { status: newStatus });
      fetchVehicles();
    } catch (err) {
      Alert.alert("Error", "Could not update vehicle status.");
    }
  }

  function confirmDelete(vehicle) {
    if (vehicle.status === "assigned") {
      Alert.alert(
        "Cannot Delete",
        "This vehicle is currently assigned to a driver. End the assignment first.",
      );
      return;
    }
    Alert.alert(
      "Delete Vehicle?",
      `This will permanently remove ${vehicle.make} ${vehicle.model} (${vehicle.registration_number}) from your fleet.`,
      [
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicle(vehicle.id);
              fetchVehicles();
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }

  // Stats summary
  const stats = vehicles.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={T.typography.h1}>My Fleet</Text>
          <Text style={T.typography.bodySmall}>
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}{" "}
            registered
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("AddCar")}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      {vehicles.length > 0 && (
        <View style={styles.statsRow}>
          {Object.entries(stats).map(([status, count]) => {
            const config = VEHICLE_STATUS_CONFIG[status];
            return (
              <View
                key={status}
                style={[styles.statCard, { borderColor: config?.color }]}
              >
                <Text style={[styles.statCount, { color: config?.color }]}>
                  {count}
                </Text>
                <Text style={styles.statLabel}>{config?.label || status}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search make, model or plate..."
          placeholderTextColor={T.colors.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {/* Status Filters */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              activeFilter === f && styles.filterChipActive,
            ]}
            onPress={() => handleFilterChange(f)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === f && styles.filterTextActive,
              ]}
            >
              {f === "all" ? "All" : VEHICLE_STATUS_CONFIG[f]?.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Vehicle List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VehicleCard
            vehicle={item}
            onPress={() => navigation.navigate("AssignCar", { vehicle: item })}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchVehicles(true)}
            tintColor={T.colors.accent}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="🚗"
              title="No vehicles yet"
              subtitle="Register your first car to start managing your fleet"
              actionLabel="+ Register Vehicle"
              onAction={() => navigation.navigate("AddCar")}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.spacing.lg,
    paddingTop: T.spacing.xl,
    paddingBottom: T.spacing.md,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: T.spacing.lg,
    paddingVertical: 10,
    borderRadius: T.radius.md,
    ...T.shadow.accent,
  },
  addBtnText: { fontSize: 14, fontWeight: "800", color: COLORS.white },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: T.spacing.lg,
    marginBottom: T.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: T.colors.bgCard,
    borderRadius: T.radius.md,
    padding: T.spacing.sm,
    alignItems: "center",
    borderWidth: 1,
  },
  statCount: { fontSize: 22, fontWeight: "800" },
  statLabel: {
    fontSize: 10,
    color: T.colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: T.spacing.lg,
    borderRadius: T.radius.md,
    paddingHorizontal: T.spacing.md,
    marginBottom: T.spacing.md,
    borderWidth: 1,
    borderColor: T.colors.bgInput,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.1)",
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: T.colors.textPrimary,
  },

  // Filters
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: T.spacing.lg,
    marginBottom: T.spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.radius.full,
    backgroundColor: COLORS.primary + "15",
    borderWidth: 1,
    borderColor: COLORS.primary + "30",
  },
  filterChipActive: {
    backgroundColor: "#F59E0B22",
    borderColor: T.colors.accent,
  },
  filterText: {
    fontSize: 12,
    color: T.colors.textSecondary,
    fontWeight: "600",
  },
  filterTextActive: { color: T.colors.accent },

  list: { paddingHorizontal: T.spacing.lg, paddingBottom: T.spacing.xxl },
});
