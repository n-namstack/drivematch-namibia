// src/features/fleet/screens/AddCarScreen.js
// Register a new vehicle — owner flow

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  COLORS,
  fleetTheme as T,
  REGISTER_VEHICLE_TYPES,
} from "../../constants/theme";
import {
  FormField,
  StyledInput,
  PrimaryButton,
} from "../../components/FleetCards";
import { registerVehicle, updateVehicle } from "../../services/FleetService";
import { useAuth } from "../../context/AuthContext";

const CURRENT_YEAR = new Date().getFullYear();

export default function AddCarScreen({ navigation, route }) {
  // If route.params.vehicle is passed, we're in edit mode
  const editVehicle = route?.params?.vehicle || null;
  const isEdit = !!editVehicle;
  const { profile } = useAuth();

  const [form, setForm] = useState({
    make: editVehicle?.make || "",
    model: editVehicle?.model || "",
    year: editVehicle?.year?.toString() || "",
    color: editVehicle?.color || "",
    registration_number: editVehicle?.registration_number || "",
    vehicle_type: editVehicle?.vehicle_type || "",
    capacity: editVehicle?.capacity?.toString() || "",
    vin: editVehicle?.vin || "",
    insurance_expiry: editVehicle?.insurance_expiry || "",
    roadworthy_expiry: editVehicle?.roadworthy_expiry || "",
    notes: editVehicle?.notes || "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  function validate() {
    const e = {};
    if (!form.make.trim()) e.make = "Make is required";
    if (!form.model.trim()) e.model = "Model is required";
    if (
      !form.year ||
      isNaN(form.year) ||
      +form.year < 1980 ||
      +form.year > CURRENT_YEAR + 1
    )
      e.year = `Enter a valid year (1980–${CURRENT_YEAR + 1})`;
    if (!form.registration_number.trim())
      e.registration_number = "Registration number is required";
    if (!form.vehicle_type) e.vehicle_type = "Select a vehicle type";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        year: parseInt(form.year),
        capacity: form.capacity ? parseInt(form.capacity) : null,
        registration_number: form.registration_number.toUpperCase().trim(),
        insurance_expiry: form.insurance_expiry || null,
        roadworthy_expiry: form.roadworthy_expiry || null,
      };

      if (isEdit) {
        await updateVehicle(editVehicle.id, payload);
        Alert.alert("Updated ✓", "Vehicle details have been updated.");
      } else {
        await registerVehicle(payload);
        Alert.alert(
          "Registered ✓",
          `${payload.make} ${payload.model} has been added to your fleet.`,
        );
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        "Error",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={T.typography.h1}>
              {isEdit ? "Edit Vehicle" : "Register Vehicle"}
            </Text>
            <Text style={T.typography.bodySmall}>
              {isEdit
                ? "Update vehicle information"
                : "Add a new car to your fleet"}
            </Text>
          </View>
        </View>

        {/* ── BASIC INFO ── */}
        <SectionDivider label="Basic Information" />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField label="Make" required error={errors.make}>
              <StyledInput
                placeholder="e.g. Toyota"
                value={form.make}
                onChangeText={(v) => set("make", v)}
                autoCapitalize="words"
              />
            </FormField>
          </View>
          <View style={{ width: T.spacing.md }} />
          <View style={{ flex: 1 }}>
            <FormField label="Model" required error={errors.model}>
              <StyledInput
                placeholder="e.g. HiAce"
                value={form.model}
                onChangeText={(v) => set("model", v)}
                autoCapitalize="words"
              />
            </FormField>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField label="Year" required error={errors.year}>
              <StyledInput
                placeholder={CURRENT_YEAR.toString()}
                value={form.year}
                onChangeText={(v) => set("year", v)}
                keyboardType="numeric"
                maxLength={4}
              />
            </FormField>
          </View>
          <View style={{ width: T.spacing.md }} />
          <View style={{ flex: 1 }}>
            <FormField label="Color" error={errors.color}>
              <StyledInput
                placeholder="e.g. White"
                value={form.color}
                onChangeText={(v) => set("color", v)}
                autoCapitalize="words"
              />
            </FormField>
          </View>
        </View>

        {/* Vehicle Type Picker */}
        <FormField label="Vehicle Type" required error={errors.vehicle_type}>
          <View style={styles.typeGrid}>
            {REGISTER_VEHICLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  form.vehicle_type === type.value && styles.typeChipActive,
                ]}
                onPress={() => set("vehicle_type", type.value)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    form.vehicle_type === type.value &&
                      styles.typeChipTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormField>

        <FormField label="Passenger / Load Capacity" error={errors.capacity}>
          <StyledInput
            placeholder="e.g. 15"
            value={form.capacity}
            onChangeText={(v) => set("capacity", v)}
            keyboardType="numeric"
          />
        </FormField>

        {/* ── REGISTRATION ── */}
        <SectionDivider label="Registration & Compliance" />

        <FormField
          label="Registration Number"
          required
          error={errors.registration_number}
        >
          <StyledInput
            placeholder="e.g. N 12345 W"
            value={form.registration_number}
            onChangeText={(v) => set("registration_number", v.toUpperCase())}
            autoCapitalize="characters"
          />
        </FormField>

        <FormField label="VIN (Vehicle ID Number)" error={errors.vin}>
          <StyledInput
            placeholder="17-character VIN"
            value={form.vin}
            onChangeText={(v) => set("vin", v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={17}
          />
        </FormField>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField label="Insurance Expiry" error={errors.insurance_expiry}>
              <StyledInput
                placeholder="YYYY-MM-DD"
                value={form.insurance_expiry}
                onChangeText={(v) => set("insurance_expiry", v)}
                keyboardType="numeric"
              />
            </FormField>
          </View>
          <View style={{ width: T.spacing.md }} />
          <View style={{ flex: 1 }}>
            <FormField
              label="Roadworthy Expiry"
              error={errors.roadworthy_expiry}
            >
              <StyledInput
                placeholder="YYYY-MM-DD"
                value={form.roadworthy_expiry}
                onChangeText={(v) => set("roadworthy_expiry", v)}
                keyboardType="numeric"
              />
            </FormField>
          </View>
        </View>

        {/* ── NOTES ── */}
        <SectionDivider label="Additional Notes" />

        <FormField label="Notes" error={errors.notes}>
          <StyledInput
            placeholder="Any additional info about this vehicle..."
            value={form.notes}
            onChangeText={(v) => set("notes", v)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 100, paddingTop: 12 }}
          />
        </FormField>

        {/* Submit */}
        <PrimaryButton
          title={loading ? "" : isEdit ? "Save Changes" : "Register Vehicle"}
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: T.spacing.sm, marginBottom: T.spacing.xxl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionDivider({ label }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionDividerText}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flex: 1 },
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
    backgroundColor: COLORS.primary,
    // borderWidth: 1,
    // borderColor: T.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 20, color: COLORS.white },

  row: { flexDirection: "row" },

  // Vehicle Type Grid
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.radius.full,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary + "15",
  },
  typeChipActive: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary + "40",
  },
  typeChipText: {
    fontSize: 13,
    color: T.colors.textSecondary,
    fontWeight: "500",
  },
  typeChipTextActive: { color: COLORS.primary, fontWeight: "700" },

  // Section divider
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: T.spacing.lg,
    marginTop: T.spacing.sm,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: T.colors.border },
  sectionDividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginHorizontal: T.spacing.md,
  },
});
