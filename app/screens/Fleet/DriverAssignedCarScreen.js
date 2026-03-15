// src/features/fleet/screens/AssignCarScreen.js
// Assign a vehicle to a hired driver — owner flow

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { fleetTheme as T } from "../theme";
import {
  FormField,
  StyledInput,
  PrimaryButton,
  AssignmentCard,
} from "../components/FleetComponents";
import {
  assignVehicleToDriver,
  getVehicleAssignments,
  getAvailableVehicles,
  searchDrivers,
  endAssignment,
} from "../services/fleetService";

export default function AssignCarScreen({ navigation, route }) {
  // Can be navigated to with a pre-selected vehicle
  const preselectedVehicle = route?.params?.vehicle || null;

  const [step, setStep] = useState("form"); // 'form' | 'driverSearch'

  // Assignment form state
  const [selectedVehicle, setSelectedVehicle] = useState(preselectedVehicle);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [jobTitle, setJobTitle] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Existing assignments for the selected vehicle
  const [currentAssignments, setCurrentAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Available vehicles (if no vehicle preselected)
  const [availableVehicles, setAvailableVehicles] = useState([]);

  // Driver search state
  const [driverQuery, setDriverQuery] = useState("");
  const [driverResults, setDriverResults] = useState([]);
  const [driverSearching, setDriverSearching] = useState(false);

  useEffect(() => {
    if (!preselectedVehicle) loadAvailableVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicle) loadVehicleAssignments(selectedVehicle.id);
  }, [selectedVehicle]);

  async function loadAvailableVehicles() {
    try {
      const data = await getAvailableVehicles();
      setAvailableVehicles(data);
    } catch (err) {
      console.error("Failed to load vehicles", err);
    }
  }

  async function loadVehicleAssignments(vehicleId) {
    setAssignmentsLoading(true);
    try {
      const data = await getVehicleAssignments(vehicleId);
      setCurrentAssignments(data.filter((a) => a.status === "active"));
    } catch (err) {
      console.error("Failed to load assignments", err);
    } finally {
      setAssignmentsLoading(false);
    }
  }

  const handleDriverSearch = useCallback(async (query) => {
    setDriverQuery(query);
    if (query.length < 2) {
      setDriverResults([]);
      return;
    }
    setDriverSearching(true);
    try {
      const results = await searchDrivers(query);
      setDriverResults(results);
    } catch (err) {
      console.error("Driver search error", err);
    } finally {
      setDriverSearching(false);
    }
  }, []);

  function validate() {
    const e = {};
    if (!selectedVehicle) e.vehicle = "Please select a vehicle";
    if (!selectedDriver) e.driver = "Please select a driver";
    if (!startDate) e.startDate = "Start date is required";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setSubmitting(true);
    try {
      await assignVehicleToDriver({
        vehicle_id: selectedVehicle.id,
        driver_id: selectedDriver.id,
        job_title: jobTitle.trim() || null,
        start_date: startDate,
        end_date: endDate || null,
        notes: notes.trim() || null,
      });
      Alert.alert(
        "Assigned ✓",
        `${selectedVehicle.make} ${selectedVehicle.model} has been assigned to ${selectedDriver.full_name || selectedDriver.email}.`,
        [{ text: "Done", onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err.message || "Assignment failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEndAssignment(assignment) {
    Alert.alert(
      "End Assignment?",
      "This will mark the assignment as completed and free the vehicle.",
      [
        {
          text: "End Assignment",
          style: "destructive",
          onPress: async () => {
            try {
              await endAssignment(assignment.id, assignment.vehicle_id);
              loadVehicleAssignments(selectedVehicle.id);
              Alert.alert("Done", "Assignment has been ended.");
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }

  // ── Driver Search Modal View ──────────────────────────────────────────────
  if (step === "driverSearch") {
    return (
      <View style={styles.root}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setStep("form")}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={T.typography.h2}>Select Driver</Text>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={T.colors.textMuted}
            value={driverQuery}
            onChangeText={handleDriverSearch}
            autoFocus
          />
          {driverSearching && (
            <ActivityIndicator color={T.colors.accent} size="small" />
          )}
        </View>

        <FlatList
          data={driverResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: T.spacing.lg }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.driverRow}
              onPress={() => {
                setSelectedDriver(item);
                setErrors((prev) => ({ ...prev, driver: null }));
                setStep("form");
              }}
            >
              <View style={styles.driverRowAvatar}>
                <Text style={styles.driverRowAvatarText}>
                  {(item.full_name || item.email)?.[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: T.spacing.md }}>
                <Text style={T.typography.h4}>
                  {item.full_name || "(No name)"}
                </Text>
                <Text style={T.typography.bodySmall}>{item.email}</Text>
                {item.phone && (
                  <Text style={T.typography.caption}>{item.phone}</Text>
                )}
              </View>
              <Text style={{ color: T.colors.accent, fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            driverQuery.length >= 2 && !driverSearching ? (
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <Text style={{ fontSize: 32 }}>👤</Text>
                <Text style={[T.typography.bodySmall, { marginTop: 8 }]}>
                  No drivers found for "{driverQuery}"
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  // ── Main Assignment Form ──────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={T.typography.h1}>Assign Vehicle</Text>
            <Text style={T.typography.bodySmall}>
              Link a car to a hired driver
            </Text>
          </View>
        </View>

        {/* Current Active Assignments */}
        {currentAssignments.length > 0 && (
          <View style={styles.currentSection}>
            <Text style={styles.currentLabel}>ACTIVE ASSIGNMENTS</Text>
            {currentAssignments.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                onEnd={handleEndAssignment}
              />
            ))}
          </View>
        )}

        {/* ── Vehicle Picker (if no preselection) ── */}
        {!preselectedVehicle && (
          <FormField label="Select Vehicle" required error={errors.vehicle}>
            {availableVehicles.length === 0 ? (
              <View style={styles.noVehiclesBox}>
                <Text style={styles.noVehiclesText}>
                  No available vehicles. All cars are assigned or in
                  maintenance.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 4 }}
              >
                {availableVehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.vehiclePill,
                      selectedVehicle?.id === v.id && styles.vehiclePillActive,
                    ]}
                    onPress={() => {
                      setSelectedVehicle(v);
                      setErrors((prev) => ({ ...prev, vehicle: null }));
                    }}
                  >
                    <Text
                      style={[
                        styles.vehiclePillText,
                        selectedVehicle?.id === v.id &&
                          styles.vehiclePillTextActive,
                      ]}
                    >
                      {v.year} {v.make} {v.model}
                    </Text>
                    <Text style={styles.vehiclePillPlate}>
                      {v.registration_number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </FormField>
        )}

        {/* Selected Vehicle Preview */}
        {selectedVehicle && (
          <View style={styles.vehiclePreview}>
            <View style={styles.vehiclePreviewLeft}>
              <Text style={styles.vehiclePreviewEmoji}>🚘</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={T.typography.h4}>
                {selectedVehicle.year} {selectedVehicle.make}{" "}
                {selectedVehicle.model}
              </Text>
              <Text
                style={[
                  T.typography.bodySmall,
                  { color: T.colors.accent, fontWeight: "700" },
                ]}
              >
                {selectedVehicle.registration_number}
              </Text>
            </View>
          </View>
        )}

        {/* ── Driver Picker ── */}
        <FormField label="Assign To Driver" required error={errors.driver}>
          <TouchableOpacity
            style={[
              styles.driverPicker,
              errors.driver && styles.driverPickerError,
            ]}
            onPress={() => setStep("driverSearch")}
          >
            {selectedDriver ? (
              <View style={styles.selectedDriverRow}>
                <View style={styles.selectedDriverAvatar}>
                  <Text style={styles.selectedDriverAvatarText}>
                    {(selectedDriver.full_name ||
                      selectedDriver.email)?.[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={T.typography.h4}>
                    {selectedDriver.full_name || selectedDriver.email}
                  </Text>
                  {selectedDriver.full_name && (
                    <Text style={T.typography.bodySmall}>
                      {selectedDriver.email}
                    </Text>
                  )}
                </View>
                <Text style={{ color: T.colors.textMuted }}>Change</Text>
              </View>
            ) : (
              <View style={styles.driverPickerPlaceholder}>
                <Text style={styles.driverPickerPlaceholderText}>
                  Tap to search for a driver...
                </Text>
                <Text style={{ color: T.colors.accent, fontSize: 20 }}>›</Text>
              </View>
            )}
          </TouchableOpacity>
        </FormField>

        {/* ── Job Details ── */}
        <FormField label="Job / Vacancy Title" error={errors.jobTitle}>
          <StyledInput
            placeholder="e.g. Airport Shuttle Driver, Long Haul Route B"
            value={jobTitle}
            onChangeText={setJobTitle}
            autoCapitalize="words"
          />
        </FormField>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField label="Start Date" required error={errors.startDate}>
              <StyledInput
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChangeText={setStartDate}
                keyboardType="numeric"
              />
            </FormField>
          </View>
          <View style={{ width: T.spacing.md }} />
          <View style={{ flex: 1 }}>
            <FormField label="End Date" error={errors.endDate}>
              <StyledInput
                placeholder="Leave blank if ongoing"
                value={endDate}
                onChangeText={setEndDate}
                keyboardType="numeric"
              />
            </FormField>
          </View>
        </View>

        <FormField label="Notes" error={errors.notes}>
          <StyledInput
            placeholder="Any special instructions or context..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80, paddingTop: 12 }}
          />
        </FormField>

        <PrimaryButton
          title="Confirm Assignment"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!selectedVehicle || !selectedDriver}
          style={{ marginBottom: T.spacing.xxl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.colors.bg },
  content: { padding: T.spacing.lg, paddingTop: T.spacing.xl },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: T.spacing.xl,
    gap: T.spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: T.radius.md,
    backgroundColor: T.colors.bgCard,
    borderWidth: 1,
    borderColor: T.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 20, color: T.colors.textPrimary },
  row: { flexDirection: "row" },

  // Current assignments
  currentSection: {
    backgroundColor: T.colors.bgCard,
    borderRadius: T.radius.lg,
    padding: T.spacing.md,
    marginBottom: T.spacing.xl,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  currentLabel: {
    ...T.typography.label,
    marginBottom: T.spacing.md,
  },

  // Vehicle pill picker
  vehiclePill: {
    backgroundColor: T.colors.bgCard,
    borderRadius: T.radius.md,
    padding: T.spacing.md,
    marginRight: T.spacing.sm,
    borderWidth: 1.5,
    borderColor: T.colors.border,
    minWidth: 140,
  },
  vehiclePillActive: {
    borderColor: T.colors.accent,
    backgroundColor: "#F59E0B11",
  },
  vehiclePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: T.colors.textSecondary,
  },
  vehiclePillTextActive: { color: T.colors.accent },
  vehiclePillPlate: {
    fontSize: 12,
    color: T.colors.accent,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 1,
  },

  // Vehicle preview
  vehiclePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B11",
    borderRadius: T.radius.md,
    padding: T.spacing.md,
    marginBottom: T.spacing.lg,
    borderWidth: 1,
    borderColor: "#F59E0B44",
  },
  vehiclePreviewLeft: { marginRight: T.spacing.md },
  vehiclePreviewEmoji: { fontSize: 28 },

  // Driver picker
  driverPicker: {
    backgroundColor: T.colors.bgInput,
    borderRadius: T.radius.md,
    borderWidth: 1.5,
    borderColor: T.colors.border,
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: T.spacing.md,
  },
  driverPickerError: { borderColor: T.colors.danger },
  driverPickerPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  driverPickerPlaceholderText: { fontSize: 14, color: T.colors.textMuted },
  selectedDriverRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  selectedDriverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.colors.accentDark,
    alignItems: "center",
    justifyContent: "center",
    marginRight: T.spacing.md,
  },
  selectedDriverAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: T.colors.accent,
  },

  // No vehicles
  noVehiclesBox: {
    backgroundColor: T.colors.bgMuted,
    borderRadius: T.radius.md,
    padding: T.spacing.md,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  noVehiclesText: {
    fontSize: 13,
    color: T.colors.textMuted,
    textAlign: "center",
  },

  // Driver search modal
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: T.spacing.lg,
    paddingTop: T.spacing.xl,
    gap: T.spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.colors.bgCard,
    marginHorizontal: T.spacing.lg,
    borderRadius: T.radius.md,
    paddingHorizontal: T.spacing.md,
    marginBottom: T.spacing.md,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: T.colors.textPrimary,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.colors.bgCard,
    borderRadius: T.radius.md,
    padding: T.spacing.md,
    marginBottom: T.spacing.sm,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  driverRowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.colors.accentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  driverRowAvatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: T.colors.accent,
  },
});
