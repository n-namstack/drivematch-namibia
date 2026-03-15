// src/features/fleet/components/FleetComponents.js
// Shared reusable UI components for Fleet Management

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  COLORS,
  fleetTheme as T,
  VEHICLE_STATUS_CONFIG,
} from "../constants/theme";

const t = T;

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const config =
    VEHICLE_STATUS_CONFIG[status] || VEHICLE_STATUS_CONFIG.inactive;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.color },
      ]}
    >
      <View style={[styles.badgeDot, { backgroundColor: config.color }]} />
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

// ─── VEHICLE CARD ─────────────────────────────────────────────────────────────
export function VehicleCard({ vehicle, onPress, onLongPress }) {
  return (
    <TouchableOpacity
      style={styles.vehicleCard}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      {/* Left accent bar */}
      <View
        style={[
          styles.cardAccentBar,
          {
            backgroundColor:
              VEHICLE_STATUS_CONFIG[vehicle.status]?.color || t.colors.accent,
          },
        ]}
      />

      <View style={styles.cardContent}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={t.typography.h3} numberOfLines={1}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </Text>
            <Text style={styles.regNumber}>{vehicle.registration_number}</Text>
          </View>
          <StatusBadge status={vehicle.status} />
        </View>

        {/* Details row */}
        <View style={styles.cardMeta}>
          <MetaChip icon="🚗" label={vehicle.vehicle_type} />
          {vehicle.color && <MetaChip icon="🎨" label={vehicle.color} />}
          {vehicle.capacity && (
            <MetaChip icon="👥" label={`${vehicle.capacity} seats`} />
          )}
        </View>

        {/* Expiry warnings */}
        {vehicle.roadworthy_expiry &&
          isExpiringSoon(vehicle.roadworthy_expiry) && (
            <View style={styles.warningRow}>
              <Text style={styles.warningText}>
                ⚠️ Roadworthy expires {formatDate(vehicle.roadworthy_expiry)}
              </Text>
            </View>
          )}
      </View>
    </TouchableOpacity>
  );
}

// ─── ASSIGNMENT CARD ──────────────────────────────────────────────────────────
export function AssignmentCard({ assignment, onPress, onEnd }) {
  const { vehicle, driver } = assignment;
  const driverName =
    driver?.firstname + " " + driver?.lastname ||
    driver?.email ||
    "Unknown Driver";

  return (
    <TouchableOpacity
      style={styles.assignmentCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.assignmentHeader}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>
            {driverName[0]?.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: t.spacing.md }}>
          <Text style={t.typography.h4}>{driverName}</Text>
          <Text style={t.typography.bodySmall}>
            {assignment.job_title || "General Assignment"}
          </Text>
        </View>
        {assignment.status === "active" && (
          <TouchableOpacity
            style={styles.endBtn}
            onPress={() => onEnd?.(assignment)}
          >
            <Text style={styles.endBtnText}>End</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.assignmentVehicleRow}>
        <Text style={styles.assignmentVehicleText}>
          🚘 {vehicle?.year} {vehicle?.make} {vehicle?.model} ·{" "}
          {vehicle?.registration_number}
        </Text>
      </View>

      <View style={styles.assignmentDates}>
        <Text style={t.typography.caption}>
          FROM {formatDate(assignment.start_date)}
          {assignment.end_date
            ? ` · TO ${formatDate(assignment.end_date)}`
            : " · ONGOING"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── FORM FIELD ───────────────────────────────────────────────────────────────
export function FormField({ label, required, error, children }) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={{ color: t.colors.danger }}> *</Text>}
      </Text>
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

export function StyledInput({ style, ...props }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <TextInput
      style={[styles.input, focused && styles.inputFocused, style]}
      placeholderTextColor={t.colors.textMuted}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

// ─── PRIMARY BUTTON ───────────────────────────────────────────────────────────
export function PrimaryButton({ title, onPress, loading, disabled, style }) {
  return (
    <TouchableOpacity
      style={[
        styles.primaryBtn,
        (disabled || loading) && styles.primaryBtnDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={t.colors.textInverse} size="small" />
      ) : (
        <Text style={styles.primaryBtnText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
export function SectionHeader({ title, count, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={t.typography.h2}>{title}</Text>
        {count !== undefined && (
          <View style={styles.countBubble}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </View>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={[t.typography.h3, { textAlign: "center" }]}>{title}</Text>
      <Text
        style={[t.typography.bodySmall, { textAlign: "center", marginTop: 6 }]}
      >
        {subtitle}
      </Text>
      {actionLabel && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── SMALL HELPERS ────────────────────────────────────────────────────────────
function MetaChip({ icon, label }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaChipText}>
        {icon} {label}
      </Text>
    </View>
  );
}

function isExpiringSoon(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const diff = (date - today) / (1000 * 60 * 60 * 24);
  return diff <= 30;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-NA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.radius.full,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  // Vehicle Card
  vehicleCard: {
    flexDirection: "row",
    backgroundColor: T.colors.bgCard,
    borderRadius: T.radius.lg,
    marginBottom: T.spacing.md,
    overflow: "hidden",
    ...T.shadow.card,
  },
  cardAccentBar: { width: 4 },
  cardContent: { flex: 1, padding: T.spacing.md },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: T.spacing.sm,
  },
  regNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: T.colors.accent,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    backgroundColor: T.colors.bgMuted,
    borderRadius: T.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaChipText: {
    fontSize: 11,
    color: T.colors.textSecondary,
    fontWeight: "500",
  },
  warningRow: {
    marginTop: T.spacing.sm,
    backgroundColor: "#78350F22",
    borderRadius: T.radius.sm,
    padding: 8,
  },
  warningText: { fontSize: 12, color: T.colors.warning, fontWeight: "500" },

  // Assignment Card
  assignmentCard: {
    backgroundColor: T.colors.bgCard,
    borderRadius: T.radius.lg,
    padding: T.spacing.md,
    marginBottom: T.spacing.md,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  assignmentHeader: { flexDirection: "row", alignItems: "center" },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.colors.accentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: { fontSize: 18, fontWeight: "800", color: T.colors.accent },
  endBtn: {
    backgroundColor: "#EF444422",
    borderColor: T.colors.danger,
    borderWidth: 1,
    borderRadius: T.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  endBtnText: { color: T.colors.danger, fontSize: 12, fontWeight: "700" },
  assignmentVehicleRow: {
    marginTop: T.spacing.sm,
    paddingTop: T.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: T.colors.border,
  },
  assignmentVehicleText: { fontSize: 13, color: T.colors.textSecondary },
  assignmentDates: { marginTop: 6 },

  // Form
  fieldWrapper: { marginBottom: T.spacing.lg },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: T.colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  fieldError: { fontSize: 11, color: T.colors.danger, marginTop: 4 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    borderRadius: T.radius.md,
    paddingHorizontal: T.spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.black,
  },
  inputFocused: { borderColor: COLORS.gray[200] },

  // Buttons
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: T.radius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    ...T.shadow.accent,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.spacing.lg,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  countBubble: {
    backgroundColor: T.colors.accent,
    borderRadius: T.radius.full,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: { fontSize: 12, fontWeight: "800", color: T.colors.textInverse },
  sectionAction: { fontSize: 13, fontWeight: "600", color: T.colors.accent },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: T.spacing.xl,
  },
  emptyIcon: { fontSize: 52, marginBottom: T.spacing.lg },
  emptyAction: {
    marginTop: T.spacing.xl,
    backgroundColor: COLORS.primary,
    borderRadius: T.radius.md,
    paddingHorizontal: T.spacing.xl,
    paddingVertical: 12,
  },
  emptyActionText: { fontSize: 14, fontWeight: "700", color: COLORS.white },
});
