import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const STATUS_CONFIG = {
  verified: { label: 'Verified', color: COLORS.secondary, icon: 'checkmark-circle' },
  unverified: { label: 'Unverified', color: COLORS.warning, icon: 'time-outline' },
  disputed: { label: 'Disputed', color: COLORS.error, icon: 'alert-circle' },
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};

const EarningEntryCard = ({ entry, onVerify, onDispute, isOwner }) => {
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [disputeNote, setDisputeNote] = useState('');

  const status = STATUS_CONFIG[entry.verification_status] || STATUS_CONFIG.unverified;

  const handleDispute = () => {
    if (!disputeNote.trim()) {
      Alert.alert('Note Required', 'Please add a reason for the dispute.');
      return;
    }
    onDispute?.(entry.id, disputeNote.trim());
    setShowDisputeInput(false);
    setDisputeNote('');
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.date}>{formatDate(entry.date)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
          <Ionicons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountCol}>
          <Text style={styles.amountLabel}>Earned</Text>
          <Text style={styles.amountValue}>N${Number(entry.total_earned).toLocaleString()}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.amountCol}>
          <Text style={styles.amountLabel}>Paid to Owner</Text>
          <Text style={styles.amountValue}>N${Number(entry.amount_paid_to_owner).toLocaleString()}</Text>
        </View>
      </View>

      {entry.notes ? (
        <Text style={styles.notes} numberOfLines={1}>{entry.notes}</Text>
      ) : null}

      {entry.verification_status === 'disputed' && entry.dispute_note ? (
        <View style={styles.disputeNoteBox}>
          <Ionicons name="warning-outline" size={14} color={COLORS.error} />
          <Text style={styles.disputeNoteText}>{entry.dispute_note}</Text>
        </View>
      ) : null}

      {isOwner && entry.verification_status === 'unverified' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.verifyBtn]}
            onPress={() => onVerify?.(entry.id)}
          >
            <Ionicons name="checkmark" size={16} color={COLORS.white} />
            <Text style={styles.verifyBtnText}>Verify</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.disputeBtn]}
            onPress={() => setShowDisputeInput(!showDisputeInput)}
          >
            <Ionicons name="flag-outline" size={16} color={COLORS.error} />
            <Text style={styles.disputeBtnText}>Dispute</Text>
          </TouchableOpacity>
        </View>
      )}

      {showDisputeInput && (
        <View style={styles.disputeInputContainer}>
          <TextInput
            style={styles.disputeInput}
            placeholder="Reason for dispute..."
            value={disputeNote}
            onChangeText={setDisputeNote}
            multiline
            maxLength={200}
          />
          <View style={styles.disputeSubmitRow}>
            <TouchableOpacity onPress={() => setShowDisputeInput(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitDisputeBtn} onPress={handleDispute}>
              <Text style={styles.submitDisputeText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  date: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  amountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  amountCol: {
    flex: 1,
  },
  amountLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.gray[200],
  },
  notes: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  disputeNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: COLORS.error + '08',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  disputeNoteText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  verifyBtn: {
    backgroundColor: COLORS.secondary,
  },
  verifyBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  disputeBtn: {
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  disputeBtnText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  disputeInputContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
  },
  disputeInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  disputeSubmitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  cancelText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  submitDisputeBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  submitDisputeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
});

export default EarningEntryCard;
