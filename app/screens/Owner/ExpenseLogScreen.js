import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import useExpenseStore from '../../store/useExpenseStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const TYPES = [
  { key: 'all',         label: 'All',         icon: 'list',              color: COLORS.primary },
  { key: 'fuel',        label: 'Fuel',         icon: 'flame',             color: '#EF4444' },
  { key: 'maintenance', label: 'Maintenance',  icon: 'construct',         color: '#F59E0B' },
  { key: 'insurance',   label: 'Insurance',    icon: 'shield-checkmark',  color: '#3B82F6' },
  { key: 'tyres',       label: 'Tyres',        icon: 'ellipse',           color: '#8B5CF6' },
  { key: 'other',       label: 'Other',        icon: 'receipt',           color: '#6B7280' },
];

const TYPE_MAP = Object.fromEntries(TYPES.filter((t) => t.key !== 'all').map((t) => [t.key, t]));

const fmt = (n) => `N$ ${Number(n).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMonthGroup = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-NA', { month: 'long', year: 'numeric' });
};

const monthKey = (dateStr) => dateStr.slice(0, 7); // "YYYY-MM"

const groupByMonth = (expenses) => {
  const groups = {};
  for (const e of expenses) {
    const mk = monthKey(e.expense_date);
    if (!groups[mk]) groups[mk] = { key: mk, label: fmtMonthGroup(e.expense_date), items: [] };
    groups[mk].items.push(e);
  }
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
};

const thisMonthKey = () => new Date().toISOString().slice(0, 7);

// ─── Summary bar chart ────────────────────────────────────────────────────────
const TypeBreakdown = ({ expenses }) => {
  const totals = {};
  let grand = 0;
  for (const e of expenses) {
    totals[e.expense_type] = (totals[e.expense_type] || 0) + Number(e.amount);
    grand += Number(e.amount);
  }
  if (grand === 0) return null;
  const rows = TYPES.filter((t) => t.key !== 'all' && totals[t.key] > 0).map((t) => ({
    ...t, amount: totals[t.key], pct: (totals[t.key] / grand) * 100,
  }));

  return (
    <View style={breakdown.wrap}>
      {rows.map((r) => (
        <View key={r.key} style={breakdown.row}>
          <View style={breakdown.labelWrap}>
            <Ionicons name={r.icon} size={14} color={r.color} />
            <Text style={breakdown.label}>{r.label}</Text>
          </View>
          <View style={breakdown.barTrack}>
            <View style={[breakdown.barFill, { width: `${r.pct}%`, backgroundColor: r.color }]} />
          </View>
          <Text style={breakdown.amount}>{fmt(r.amount)}</Text>
        </View>
      ))}
    </View>
  );
};

// ─── Expense row ──────────────────────────────────────────────────────────────
const ExpenseRow = ({ item, onDelete }) => {
  const t = TYPE_MAP[item.expense_type] || TYPE_MAP.other;
  return (
    <TouchableOpacity
      style={row.wrap}
      onLongPress={() => onDelete(item)}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <View style={[row.icon, { backgroundColor: t.color + '18' }]}>
        <Ionicons name={t.icon} size={18} color={t.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={row.label}>{t.label}</Text>
        {item.vehicle_description ? <Text style={row.sub}>{item.vehicle_description}</Text> : null}
        {item.notes ? <Text style={row.notes} numberOfLines={1}>{item.notes}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={row.amount}>{fmt(item.amount)}</Text>
        <Text style={row.date}>
          {new Date(item.expense_date + 'T00:00:00').toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Log modal ────────────────────────────────────────────────────────────────
const LogModal = ({ visible, onClose, onSave, ownerId }) => {
  const [type, setType]   = useState('fuel');
  const [amount, setAmount] = useState('');
  const [date, setDate]   = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [vehicle, setVehicle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setType('fuel'); setAmount(''); setDate(new Date()); setVehicle(''); setNotes(''); };

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        owner_id: ownerId,
        expense_type: type,
        amount: num,
        expense_date: date.toISOString().slice(0, 10),
        vehicle_description: vehicle.trim() || null,
        notes: notes.trim() || null,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={modal.overlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modal.sheet}>
        <View style={modal.handle} />
        <Text style={modal.title}>Log Expense</Text>

        {/* Type picker */}
        <Text style={modal.fieldLabel}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
          {TYPES.filter((t) => t.key !== 'all').map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[modal.typeChip, { borderColor: type === t.key ? t.color : COLORS.border, backgroundColor: type === t.key ? t.color + '18' : COLORS.surface }]}
              onPress={() => setType(t.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={t.icon} size={14} color={type === t.key ? t.color : COLORS.textSecondary} />
              <Text style={[modal.typeChipText, { color: type === t.key ? t.color : COLORS.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Amount */}
        <Text style={modal.fieldLabel}>Amount (N$)</Text>
        <TextInput
          style={modal.input}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={COLORS.textSecondary}
          value={amount}
          onChangeText={setAmount}
        />

        {/* Date */}
        <Text style={modal.fieldLabel}>Date</Text>
        <TouchableOpacity style={modal.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={modal.dateBtnText}>
            {date.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            maximumDate={new Date()}
            onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
          />
        )}

        {/* Vehicle */}
        <Text style={modal.fieldLabel}>Vehicle (optional)</Text>
        <TextInput
          style={modal.input}
          placeholder="e.g. Toyota Hilux — ABC 123 N"
          placeholderTextColor={COLORS.textSecondary}
          value={vehicle}
          onChangeText={setVehicle}
        />

        {/* Notes */}
        <Text style={modal.fieldLabel}>Notes (optional)</Text>
        <TextInput
          style={[modal.input, { height: 72, textAlignVertical: 'top' }]}
          placeholder="Any additional details…"
          placeholderTextColor={COLORS.textSecondary}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity style={modal.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={modal.saveBtnText}>Save Expense</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const ExpenseLogScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const expenses    = useExpenseStore((s) => s.expenses);
  const loading     = useExpenseStore((s) => s.loading);
  const fetchExpenses = useExpenseStore((s) => s.fetchExpenses);
  const logExpense    = useExpenseStore((s) => s.logExpense);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);

  const [filter, setFilter]   = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (profile?.id) fetchExpenses(profile.id); }, [profile?.id]);

  const onRefresh = async () => { setRefreshing(true); await fetchExpenses(profile.id); setRefreshing(false); };

  const filtered = filter === 'all' ? expenses : expenses.filter((e) => e.expense_type === filter);
  const grouped  = groupByMonth(filtered);

  const thisMonth = expenses.filter((e) => monthKey(e.expense_date) === thisMonthKey());
  const thisMonthTotal = thisMonth.reduce((s, e) => s + Number(e.amount), 0);

  const handleDelete = (item) => {
    Alert.alert('Delete expense?', `${TYPE_MAP[item.expense_type]?.label || 'Expense'} — ${fmt(item.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(item.id) },
    ]);
  };

  // flat list data: section headers + items interleaved
  const listData = [];
  for (const g of grouped) {
    const groupTotal = g.items.reduce((s, e) => s + Number(e.amount), 0);
    listData.push({ type: 'header', key: `h-${g.key}`, label: g.label, total: groupTotal });
    for (const item of g.items) listData.push({ type: 'item', key: item.id, item });
  }

  const renderRow = ({ item: row }) => {
    if (row.type === 'header') {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupLabel}>{row.label}</Text>
          <Text style={styles.groupTotal}>{fmt(row.total)}</Text>
        </View>
      );
    }
    return <ExpenseRow item={row.item} onDelete={handleDelete} />;
  };

  if (loading && expenses.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Log</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={listData}
        keyExtractor={(r) => r.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryAmount}>{fmt(thisMonthTotal)}</Text>
              <TypeBreakdown expenses={thisMonth} />
            </View>

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: SPACING.lg }}>
              {TYPES.map((t) => {
                const active = filter === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.chip, active && { backgroundColor: t.color, borderColor: t.color }]}
                    onPress={() => setFilter(t.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={t.icon} size={13} color={active ? COLORS.white : t.color} />
                    <Text style={[styles.chipText, active && { color: COLORS.white }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {listData.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.gray?.[300] || '#CBD5E1'} />
                <Text style={styles.emptyTitle}>{filter === 'all' ? 'No expenses logged yet' : `No ${TYPES.find((t) => t.key === filter)?.label || ''} expenses`}</Text>
                <Text style={styles.emptySub}>Tap the + button to log your first expense</Text>
              </View>
            )}
          </>
        }
        renderItem={renderRow}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      <LogModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={logExpense}
        ownerId={profile?.id}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn:     { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },

  summaryCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  summaryLabel:  { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmount: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 4, marginBottom: SPACING.sm },

  filterRow: { marginBottom: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 7, marginRight: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  chipText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.textSecondary },

  groupHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  groupLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupTotal: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md },
  emptySub:   { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
});

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  icon:   { width: 40, height: 40, borderRadius: BORDER_RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  label:  { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  sub:    { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
  notes:  { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1, fontStyle: 'italic' },
  amount: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  date:   { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
});

const breakdown = StyleSheet.create({
  wrap: { gap: 8, marginTop: 4 },
  row:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 110 },
  label:     { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '500' },
  barTrack:  { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  barFill:   { height: 6, borderRadius: 3 },
  amount:    { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.text, width: 80, textAlign: 'right' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg, paddingBottom: 40, paddingTop: SPACING.sm,
    maxHeight: '90%',
  },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.md },
  title:    { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: FONTS.sizes.sm, color: COLORS.text, backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
  },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1.5,
    paddingHorizontal: SPACING.md, paddingVertical: 7, marginRight: SPACING.xs,
  },
  typeChipText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 12, marginBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  dateBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 14, alignItems: 'center', marginTop: SPACING.sm,
  },
  saveBtnText: { color: COLORS.white, fontWeight: '800', fontSize: FONTS.sizes.md },
});

export default ExpenseLogScreen;
