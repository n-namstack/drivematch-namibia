import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { documentService } from '../../services/documentService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const DOC_LABELS = {
  drivers_license:  'Driver\'s License',
  pdp:              'PDP',
  id_document:      'ID Document',
  police_clearance: 'Police Clearance',
  reference_letter: 'Reference Letter',
};

const DOC_ICONS = {
  drivers_license:  'card',
  pdp:              'document-text',
  id_document:      'person-circle',
  police_clearance: 'shield-checkmark',
  reference_letter: 'mail',
};

const getDaysUntil = (expiryDateStr) => {
  if (!expiryDateStr) return null;
  const diff = new Date(expiryDateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getUrgency = (days, status) => {
  if (status === 'expired' || (days !== null && days <= 0)) return 'expired';
  if (days !== null && days <= 7)  return 'critical';
  if (days !== null && days <= 30) return 'warning';
  return 'ok';
};

const URGENCY_COLORS = {
  expired:  { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626', icon: '#EF4444' },
  critical: { bg: '#FEF3C7', border: '#F59E0B', text: '#D97706', icon: '#F59E0B' },
  warning:  { bg: '#FEF9C3', border: '#EAB308', text: '#A16207', icon: '#EAB308' },
  ok:       { bg: '#F0FDF4', border: '#22C55E', text: '#15803D', icon: '#22C55E' },
};

const DocCard = ({ doc, onUpdate }) => {
  const days    = getDaysUntil(doc.expiry_date);
  const urgency = getUrgency(days, doc.verification_status);
  const colors  = URGENCY_COLORS[urgency];
  const label   = DOC_LABELS[doc.document_type] || doc.document_type;
  const icon    = DOC_ICONS[doc.document_type] || 'document';

  const statusLabel =
    urgency === 'expired'  ? 'Expired' :
    urgency === 'critical' ? `${days}d left — Urgent!` :
    urgency === 'warning'  ? `${days} days left` :
    days !== null          ? `${days} days left` :
    doc.verification_status === 'verified' ? 'Valid' : 'No expiry set';

  const verifColor =
    doc.verification_status === 'verified'  ? '#059669' :
    doc.verification_status === 'rejected'  ? COLORS.error :
    doc.verification_status === 'expired'   ? '#DC2626' : '#D97706';

  return (
    <View style={[card.wrap, { borderColor: colors.border, backgroundColor: colors.bg }]}>
      <View style={[card.iconWrap, { backgroundColor: colors.icon + '20' }]}>
        <Ionicons name={icon} size={26} color={colors.icon} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={card.docLabel}>{label}</Text>
        {doc.document_number ? (
          <Text style={card.docNum}>{doc.document_number}</Text>
        ) : null}
        <View style={card.row}>
          <View style={[card.statusPill, { backgroundColor: colors.icon + '20' }]}>
            <Ionicons
              name={urgency === 'ok' ? 'checkmark-circle' : urgency === 'expired' ? 'close-circle' : 'warning'}
              size={12} color={colors.icon}
            />
            <Text style={[card.statusText, { color: colors.text }]}>{statusLabel}</Text>
          </View>
          <View style={[card.verif, { backgroundColor: verifColor + '15' }]}>
            <Text style={[card.verifText, { color: verifColor }]}>
              {doc.verification_status === 'verified' ? 'Verified' :
               doc.verification_status === 'rejected' ? 'Rejected' :
               doc.verification_status === 'expired'  ? 'Expired'  : 'Pending'}
            </Text>
          </View>
        </View>
        {doc.expiry_date && (
          <Text style={card.expiryDate}>
            Expires {new Date(doc.expiry_date).toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={card.updateBtn}
        onPress={() => onUpdate(doc.document_type)}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={14} color={COLORS.primary} />
        <Text style={card.updateBtnText}>Update</Text>
      </TouchableOpacity>
    </View>
  );
};

const DocumentTrackerScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocs = async () => {
    if (!profile?.id) return;
    try {
      const { data: docs } = await documentService.fetchDriverDocuments(profile.id);
      setDocuments(docs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, [profile?.id]);

  const onRefresh = async () => { setRefreshing(true); await loadDocs(); setRefreshing(false); };

  const handleUpdate = (docType) => {
    navigation.navigate('DocumentUpload', { preselectedType: docType });
  };

  // Sort by urgency: expired/critical first, then warning, then ok
  const urgencyOrder = { expired: 0, critical: 1, warning: 2, ok: 3 };
  const sorted = (documents || []).slice().sort((a, b) => {
    const dA = getDaysUntil(a.expiry_date);
    const dB = getDaysUntil(b.expiry_date);
    const uA = urgencyOrder[getUrgency(dA, a.verification_status)];
    const uB = urgencyOrder[getUrgency(dB, b.verification_status)];
    return uA - uB;
  });

  const expiringSoon = sorted.filter((d) => {
    const days = getDaysUntil(d.expiry_date);
    const u = getUrgency(days, d.verification_status);
    return u === 'expired' || u === 'critical' || u === 'warning';
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Document Tracker</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Alert banner if anything expiring */}
            {expiringSoon.length > 0 && (
              <View style={styles.alertBanner}>
                <Ionicons name="warning" size={18} color="#D97706" />
                <Text style={styles.alertText}>
                  {expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''} need{expiringSoon.length === 1 ? 's' : ''} attention
                </Text>
              </View>
            )}

            {documents.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="documents-outline" size={48} color={COLORS.gray[300]} />
                <Text style={styles.emptyTitle}>No documents uploaded yet</Text>
                <Text style={styles.emptySub}>Upload your documents to track expiry dates</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => navigation.navigate('DocumentUpload')}>
                  <Text style={styles.uploadBtnText}>Upload Documents</Text>
                </TouchableOpacity>
              </View>
            )}

            {sorted.length > 0 && (
              <Text style={styles.sectionLabel}>
                {sorted.length} document{sorted.length !== 1 ? 's' : ''} tracked
              </Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <DocCard doc={item} onUpdate={handleUpdate} />
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#FEF3C7', marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  alertText: { fontSize: FONTS.sizes.sm, color: '#D97706', fontWeight: '600', flex: 1 },

  sectionLabel: {
    fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, marginTop: SPACING.xs,
  },
  cardWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },

  emptyState: { alignItems: 'center', paddingVertical: SPACING['2xl'], paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md },
  emptySub:   { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  uploadBtn:  { marginTop: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl, paddingVertical: 12, paddingHorizontal: SPACING.xl },
  uploadBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },
});

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1.5,
    padding: SPACING.md,
  },
  iconWrap: { width: 48, height: 48, borderRadius: BORDER_RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  docLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  docNum:   { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
  row: { flexDirection: 'row', gap: SPACING.xs, marginTop: 5, flexWrap: 'wrap' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  verif:     { borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3, justifyContent: 'center' },
  verifText: { fontSize: 11, fontWeight: '600' },
  expiryDate: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 4 },
  updateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.primary + '10', borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.sm, paddingVertical: 7, alignSelf: 'flex-start',
  },
  updateBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
});

export default DocumentTrackerScreen;
