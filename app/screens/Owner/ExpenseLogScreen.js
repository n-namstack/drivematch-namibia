import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, ScrollView, Pressable,
  Animated, PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import useExpenseStore from '../../store/useExpenseStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

// ─── Types by role ────────────────────────────────────────────────────────────
const OWNER_TYPES = [
  { key: 'maintenance', label: 'Maintenance',  icon: 'construct',        color: '#F59E0B' },
  { key: 'insurance',   label: 'Insurance',    icon: 'shield-checkmark', color: '#3B82F6' },
  { key: 'tyres',       label: 'Tyres',        icon: 'ellipse',          color: '#8B5CF6' },
  { key: 'other',       label: 'Other',        icon: 'receipt',          color: '#6B7280' },
];

const DRIVER_TYPES = [
  { key: 'fuel',    label: 'Fuel',    icon: 'flame',    color: '#EF4444' },
  { key: 'toll',    label: 'Toll',    icon: 'navigate', color: '#0891B2' },
  { key: 'parking', label: 'Parking', icon: 'car',      color: '#059669' },
  { key: 'other',   label: 'Other',   icon: 'receipt',  color: '#6B7280' },
];

const TYPE_HINTS = {
  maintenance: 'e.g. Oil change, Brake pads, Full service',
  insurance:   'e.g. Third party, Comprehensive, NAMMIC',
  tyres:       'e.g. Front tyre replacement, Wheel balance',
  fuel:        'e.g. Full tank — Engen CBD',
  toll:        'e.g. B1 highway toll gate',
  parking:     'e.g. CBD parking, Airport parking',
  other:       'Describe what this expense is for',
};

const ALL_TYPES = [...OWNER_TYPES, ...DRIVER_TYPES].filter(
  (t, i, arr) => arr.findIndex(x => x.key === t.key) === i,
);
const TYPE_MAP = Object.fromEntries(ALL_TYPES.map(t => [t.key, t]));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n =>
  `N$ ${Number(n).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isoDate = d => d.toISOString().slice(0, 10);
const monthKey = d => d.slice(0, 7);

const DATE_FILTERS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_year',  label: 'This Year' },
  { key: 'all',        label: 'All Time' },
  { key: 'custom',     label: 'Custom' },
];

const applyDateFilter = (expenses, filter, from, to) => {
  const today = new Date();
  let fromDate, toDate;
  if (filter === 'this_month') {
    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    toDate   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  } else if (filter === 'last_month') {
    fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    toDate   = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
  } else if (filter === 'this_year') {
    fromDate = new Date(today.getFullYear(), 0, 1);
    toDate   = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
  } else if (filter === 'custom') {
    fromDate = new Date(from); fromDate.setHours(0, 0, 0, 0);
    toDate   = new Date(to);   toDate.setHours(23, 59, 59, 999);
  } else {
    return expenses;
  }
  return expenses.filter(e => {
    const d = new Date(e.expense_date + 'T00:00:00');
    return d >= fromDate && d <= toDate;
  });
};

const groupByMonth = expenses => {
  const groups = {};
  for (const e of expenses) {
    const mk = monthKey(e.expense_date);
    if (!groups[mk]) {
      const d = new Date(e.expense_date + 'T00:00:00');
      groups[mk] = { key: mk, label: d.toLocaleDateString('en-NA', { month: 'long', year: 'numeric' }), items: [] };
    }
    groups[mk].items.push(e);
  }
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
};

// ─── PDF generator ────────────────────────────────────────────────────────────
const buildPDF = (expenses, filter, from, to) => {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  let dateLabel = 'All Time';
  const today = new Date();
  if (filter === 'this_month')
    dateLabel = today.toLocaleDateString('en-NA', { month: 'long', year: 'numeric' });
  else if (filter === 'last_month') {
    const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    dateLabel = lm.toLocaleDateString('en-NA', { month: 'long', year: 'numeric' });
  } else if (filter === 'this_year')
    dateLabel = today.getFullYear().toString();
  else if (filter === 'custom')
    dateLabel = `${from.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })} – ${to.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const typeTotals = {};
  for (const e of expenses)
    typeTotals[e.expense_type] = (typeTotals[e.expense_type] || 0) + Number(e.amount);

  const typeRows = Object.entries(typeTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([key, amt]) => `<tr><td>${TYPE_MAP[key]?.label || key}</td><td class="r">${fmt(amt)}</td></tr>`)
    .join('');

  const expenseRows = expenses
    .slice()
    .sort((a, b) => a.expense_date.localeCompare(b.expense_date))
    .map(e => `<tr>
      <td>${new Date(e.expense_date + 'T00:00:00').toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
      <td>${TYPE_MAP[e.expense_type]?.label || e.expense_type}</td>
      <td>${e.notes || '—'}</td>
      <td>${e.vehicle_description || '—'}</td>
      <td class="r">${fmt(e.amount)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:-apple-system,Arial,sans-serif;margin:0;padding:0;color:#1f2937}
    .hdr{background:linear-gradient(135deg,#1E3A8A,#1E40AF,#3B82F6);padding:32px 40px;color:#fff}
    .hdr h1{margin:0 0 4px;font-size:26px;font-weight:800}
    .hdr p{margin:0;font-size:13px;opacity:.85}
    .body{padding:32px 40px}
    .sum{background:#EFF6FF;border-radius:12px;padding:20px 24px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:center}
    .sum .lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6B7280}
    .sum .amt{font-size:28px;font-weight:800;color:#1E40AF;margin-top:4px}
    .sum .meta{text-align:right;font-size:12px;color:#6B7280}
    h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#9CA3AF;margin:0 0 10px}
    table{width:100%;border-collapse:collapse;margin-bottom:28px}
    th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#9CA3AF;padding:0 8px 8px;border-bottom:2px solid #E5E7EB}
    td{padding:10px 8px;font-size:12px;border-bottom:1px solid #F3F4F6;vertical-align:top}
    .r{text-align:right;font-weight:600}
    .foot{padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;font-size:11px;color:#9CA3AF}
  </style></head><body>
    <div class="hdr"><h1>DuoLink</h1><p>Expense Report — ${dateLabel}</p></div>
    <div class="body">
      <div class="sum">
        <div><div class="lbl">Total Expenses</div><div class="amt">${fmt(total)}</div></div>
        <div class="meta">${expenses.length} record${expenses.length !== 1 ? 's' : ''}<br>Generated ${today.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
      <h2>By Category</h2>
      <table><tr><th>Category</th><th class="r">Total</th></tr>${typeRows}</table>
      <h2>All Expenses</h2>
      <table><tr><th>Date</th><th>Category</th><th>Description</th><th>Vehicle</th><th class="r">Amount</th></tr>${expenseRows}</table>
    </div>
    <div class="foot">Generated by DuoLink · ${today.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </body></html>`;
};

// ─── Type breakdown bar ───────────────────────────────────────────────────────
const TypeBreakdown = ({ expenses }) => {
  const totals = {};
  let grand = 0;
  for (const e of expenses) {
    totals[e.expense_type] = (totals[e.expense_type] || 0) + Number(e.amount);
    grand += Number(e.amount);
  }
  if (grand === 0) return null;
  const rows = Object.entries(totals)
    .map(([key, amount]) => ({ ...(TYPE_MAP[key] || TYPE_MAP.other), amount, pct: (amount / grand) * 100 }))
    .sort((a, b) => b.amount - a.amount);
  return (
    <View style={bk.wrap}>
      {rows.map(r => (
        <View key={r.key} style={bk.row}>
          <View style={bk.labelWrap}>
            <Ionicons name={r.icon} size={13} color={r.color} />
            <Text style={bk.label}>{r.label}</Text>
          </View>
          <View style={bk.track}>
            <View style={[bk.fill, { width: `${r.pct}%`, backgroundColor: r.color }]} />
          </View>
          <Text style={bk.amount}>{fmt(r.amount)}</Text>
        </View>
      ))}
    </View>
  );
};

// ─── Expense row ──────────────────────────────────────────────────────────────
const ExpenseRow = ({ item, onDelete }) => {
  const t = TYPE_MAP[item.expense_type] || TYPE_MAP.other;
  return (
    <TouchableOpacity style={row.wrap} onLongPress={() => onDelete(item)} delayLongPress={500} activeOpacity={0.8}>
      <View style={[row.icon, { backgroundColor: t.color + '18' }]}>
        <Ionicons name={t.icon} size={18} color={t.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={row.label}>{t.label}</Text>
        {item.notes ? <Text style={row.sub} numberOfLines={1}>{item.notes}</Text> : null}
        {item.vehicle_description ? <Text style={row.vehicle} numberOfLines={1}>{item.vehicle_description}</Text> : null}
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

// ─── Log modal (drag-to-dismiss bottom sheet) ─────────────────────────────────
const LogModal = ({ visible, onClose, onSave, profile }) => {
  const insets  = useSafeAreaInsets();
  const isDriver = profile?.role === 'driver';
  const types   = isDriver ? DRIVER_TYPES : OWNER_TYPES;

  const [type, setType]       = useState(types[0].key);
  const [desc, setDesc]       = useState('');
  const [amount, setAmount]   = useState('');
  const [date, setDate]       = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [vehicle, setVehicle] = useState('');
  const [saving, setSaving]   = useState(false);

  const slideY = useRef(new Animated.Value(700)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderMove: (_, { dy }) => { if (dy > 0) slideY.setValue(dy); },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.8) {
          Animated.timing(slideY, { toValue: 700, duration: 200, useNativeDriver: true }).start(dismiss);
        } else {
          Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      slideY.setValue(700);
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }).start();
    }
  }, [visible]);

  const reset = () => { setType(types[0].key); setDesc(''); setAmount(''); setDate(new Date()); setVehicle(''); };

  const dismiss = () => { reset(); onClose(); };

  const handleClose = () => {
    Animated.timing(slideY, { toValue: 700, duration: 220, useNativeDriver: true }).start(dismiss);
  };

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount greater than 0.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        owner_id: profile?.id,
        expense_type: type,
        amount: num,
        expense_date: isoDate(date),
        notes: desc.trim() || null,
        vehicle_description: vehicle.trim() || null,
      });
      Animated.timing(slideY, { toValue: 700, duration: 220, useNativeDriver: true }).start(dismiss);
    } catch {
      Alert.alert('Error', 'Could not save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <View style={{ flex: 1 }}>
        {/* Overlay sits behind the sheet via absoluteFill */}
        <Pressable style={[StyleSheet.absoluteFill, ms.overlay]} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={ms.kav}
        >
        <Animated.View style={[ms.sheet, { transform: [{ translateY: slideY }] }]}>
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={ms.handleArea}>
            <View style={ms.handle} />
          </View>

          <Text style={ms.title}>Log Expense</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
            {/* Category */}
            <Text style={ms.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {types.map(t => {
                const active = type === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[ms.chip, { borderColor: active ? t.color : COLORS.border, backgroundColor: active ? t.color + '18' : COLORS.background }]}
                    onPress={() => setType(t.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={t.icon} size={14} color={active ? t.color : COLORS.textSecondary} />
                    <Text style={[ms.chipText, { color: active ? t.color : COLORS.textSecondary }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Description */}
            <Text style={ms.label}>Description</Text>
            <TextInput
              style={ms.input}
              placeholder={TYPE_HINTS[type]}
              placeholderTextColor={COLORS.textSecondary}
              value={desc}
              onChangeText={setDesc}
            />

            {/* Amount */}
            <Text style={ms.label}>Amount (N$)</Text>
            <TextInput
              style={ms.input}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.textSecondary}
              value={amount}
              onChangeText={setAmount}
            />

            {/* Date */}
            <Text style={ms.label}>Date</Text>
            <TouchableOpacity style={ms.dateBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={ms.dateBtnText}>
                {date.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, d) => { setShowPicker(false); if (d) setDate(d); }}
              />
            )}

            {/* Vehicle (owner only) */}
            {!isDriver && (
              <>
                <Text style={ms.label}>Vehicle (optional)</Text>
                <TextInput
                  style={ms.input}
                  placeholder="e.g. Toyota Hilux — ABC 123 N"
                  placeholderTextColor={COLORS.textSecondary}
                  value={vehicle}
                  onChangeText={setVehicle}
                />
              </>
            )}

            <View style={{ height: SPACING.sm }} />
          </ScrollView>

          {/* Cancel + Save row — always visible outside scroll */}
          <View style={[ms.actions, { marginBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity style={ms.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
              <Text style={ms.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ms.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={ms.saveBtnText}>Save Expense</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const ExpenseLogScreen = ({ navigation }) => {
  const { profile }   = useAuth();
  const expenses      = useExpenseStore(s => s.expenses);
  const loading       = useExpenseStore(s => s.loading);
  const fetchExpenses = useExpenseStore(s => s.fetchExpenses);
  const logExpense    = useExpenseStore(s => s.logExpense);
  const deleteExpense = useExpenseStore(s => s.deleteExpense);

  const isDriver = profile?.role === 'driver';
  const types    = isDriver ? DRIVER_TYPES : OWNER_TYPES;
  const allTypeFilter = [{ key: 'all', label: 'All', icon: 'list', color: COLORS.primary }, ...types];

  const [typeFilter,   setTypeFilter]   = useState('all');
  const [dateFilter,   setDateFilter]   = useState('this_month');
  const [customFrom,   setCustomFrom]   = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [customTo,     setCustomTo]     = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker,   setShowToPicker]   = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [exporting,    setExporting]    = useState(false);

  useEffect(() => { if (profile?.id) fetchExpenses(profile.id); }, [profile?.id]);

  const onRefresh = async () => { setRefreshing(true); await fetchExpenses(profile.id); setRefreshing(false); };

  const dateFiltered = applyDateFilter(expenses, dateFilter, customFrom, customTo);
  const filtered     = typeFilter === 'all' ? dateFiltered : dateFiltered.filter(e => e.expense_type === typeFilter);
  const grouped      = groupByMonth(filtered);
  const total        = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const handleDelete = item => {
    Alert.alert(
      'Delete expense?',
      `${TYPE_MAP[item.expense_type]?.label || 'Expense'} — ${fmt(item.amount)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(item.id) },
      ],
    );
  };

  const handleExport = async () => {
    if (filtered.length === 0) {
      Alert.alert('Nothing to export', 'No expenses found for the selected period.');
      return;
    }
    setExporting(true);
    try {
      const html = buildPDF(filtered, dateFilter, customFrom, customTo);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Expense Report' });
    } catch {
      Alert.alert('Export failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Build flat list data: headers + items interleaved
  const listData = [];
  for (const g of grouped) {
    const groupTotal = g.items.reduce((s, e) => s + Number(e.amount), 0);
    listData.push({ type: 'header', key: `h-${g.key}`, label: g.label, total: groupTotal });
    for (const item of g.items) listData.push({ type: 'item', key: item.id, item });
  }

  const renderRow = ({ item: r }) => {
    if (r.type === 'header') {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupLabel}>{r.label}</Text>
          <Text style={styles.groupTotal}>{fmt(r.total)}</Text>
        </View>
      );
    }
    return <ExpenseRow item={r.item} onDelete={handleDelete} />;
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Log</Text>
        <TouchableOpacity onPress={handleExport} style={styles.iconBtn} disabled={exporting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {exporting
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Ionicons name="download-outline" size={22} color={COLORS.primary} />
          }
        </TouchableOpacity>
      </View>

      <FlatList
        data={listData}
        keyExtractor={r => r.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <>
            {/* Date filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg }} style={{ marginBottom: SPACING.sm }}>
              {DATE_FILTERS.map(f => {
                const active = dateFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.dateChip, active && styles.dateChipActive]}
                    onPress={() => setDateFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Custom date range */}
            {dateFilter === 'custom' && (
              <View style={styles.customRange}>
                <TouchableOpacity style={styles.rangePicker} onPress={() => setShowFromPicker(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.rangeText}>
                    {customFrom.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
                <Text style={{ color: COLORS.textSecondary, fontSize: FONTS.sizes.xs }}>to</Text>
                <TouchableOpacity style={styles.rangePicker} onPress={() => setShowToPicker(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.rangeText}>
                    {customTo.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {showFromPicker && (
              <DateTimePicker value={customFrom} mode="date" maximumDate={customTo}
                onChange={(_, d) => { setShowFromPicker(false); if (d) setCustomFrom(d); }} />
            )}
            {showToPicker && (
              <DateTimePicker value={customTo} mode="date" minimumDate={customFrom} maximumDate={new Date()}
                onChange={(_, d) => { setShowToPicker(false); if (d) setCustomTo(d); }} />
            )}

            {/* Summary card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                {DATE_FILTERS.find(f => f.key === dateFilter)?.label || 'Total'}
              </Text>
              <Text style={styles.summaryAmount}>{fmt(total)}</Text>
              <TypeBreakdown expenses={filtered} />
            </View>

            {/* Type filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg }} style={{ marginBottom: SPACING.sm }}>
              {allTypeFilter.map(t => {
                const active = typeFilter === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.chip, active && { backgroundColor: t.color, borderColor: t.color }]}
                    onPress={() => setTypeFilter(t.key)}
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
                <Text style={styles.emptyTitle}>No expenses found</Text>
                <Text style={styles.emptySub}>Tap + to log your first expense</Text>
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
        profile={profile}
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
  iconBtn:     { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },

  dateChip: {
    borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 7, marginRight: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  dateChipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateChipText:      { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.textSecondary },
  dateChipTextActive:{ color: COLORS.white },

  customRange: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm,
  },
  rangePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 9, backgroundColor: COLORS.surface,
  },
  rangeText: { fontSize: FONTS.sizes.xs, color: COLORS.text, fontWeight: '500' },

  summaryCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  summaryLabel:  { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmount: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 4, marginBottom: SPACING.sm },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 7, marginRight: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  chipText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.textSecondary },

  groupHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginTop: SPACING.sm,
  },
  groupLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupTotal: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },

  empty:      { alignItems: 'center', paddingVertical: 48, paddingHorizontal: SPACING.xl },
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
    marginHorizontal: SPACING.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  icon:    { width: 40, height: 40, borderRadius: BORDER_RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  label:   { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  sub:     { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
  vehicle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1, fontStyle: 'italic' },
  amount:  { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  date:    { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
});

const bk = StyleSheet.create({
  wrap:     { gap: 8, marginTop: 4 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  labelWrap:{ flexDirection: 'row', alignItems: 'center', gap: 4, width: 110 },
  label:    { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '500' },
  track:    { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  fill:     { height: 6, borderRadius: 3 },
  amount:   { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.text, width: 80, textAlign: 'right' },
});

const ms = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  kav:      { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: SPACING.lg,
    maxHeight: '88%',
  },
  handleArea: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  title:      { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  label:      { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: FONTS.sizes.sm, color: COLORS.text, backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1.5,
    paddingHorizontal: SPACING.md, paddingVertical: 8, marginRight: SPACING.xs,
  },
  chipText:   { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 12, marginBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  dateBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.text },
  actions:      { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn:    { flex: 1, paddingVertical: 14, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', backgroundColor: COLORS.gray?.[100] || '#F3F4F6' },
  cancelBtnText:{ color: COLORS.text, fontWeight: '600', fontSize: FONTS.sizes.sm },
  saveBtn:      { flex: 2, paddingVertical: 14, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', backgroundColor: COLORS.primary },
  saveBtnText:  { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },
});

export default ExpenseLogScreen;
