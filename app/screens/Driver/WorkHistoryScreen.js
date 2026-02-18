import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const WorkHistoryScreen = ({ navigation }) => {
  const { driverProfile } = useAuth();
  const [workHistory, setWorkHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [referencePhone, setReferencePhone] = useState('');

  useEffect(() => {
    fetchWorkHistory();
  }, []);

  const fetchWorkHistory = async () => {
    if (!driverProfile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_history')
        .select('*')
        .eq('driver_id', driverProfile.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setWorkHistory(data || []);
    } catch (err) {
      Alert.alert('Error', 'Could not load work history. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setPosition('');
    setStartDate('');
    setEndDate('');
    setIsCurrent(false);
    setDescription('');
    setReferenceName('');
    setReferencePhone('');
    setEditingJob(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (job) => {
    setEditingJob(job);
    setCompanyName(job.company_name);
    setPosition(job.position);
    setStartDate(job.start_date || '');
    setEndDate(job.end_date || '');
    setIsCurrent(job.is_current || false);
    setDescription(job.description || '');
    setReferenceName(job.reference_name || '');
    setReferencePhone(job.reference_phone || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!companyName.trim() || !position.trim() || !startDate.trim()) {
      Alert.alert('Required Fields', 'Please fill in company name, position, and start date.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      Alert.alert('Invalid Date', 'Start date must be in YYYY-MM-DD format (e.g. 2023-01-15).');
      return;
    }
    if (endDate && !isCurrent && !dateRegex.test(endDate)) {
      Alert.alert('Invalid Date', 'End date must be in YYYY-MM-DD format (e.g. 2024-06-30).');
      return;
    }

    setSaving(true);
    try {
      const jobData = {
        driver_id: driverProfile.id,
        company_name: companyName.trim(),
        position: position.trim(),
        start_date: startDate.trim(),
        end_date: isCurrent ? null : (endDate.trim() || null),
        is_current: isCurrent,
        description: description.trim() || null,
        reference_name: referenceName.trim() || null,
        reference_phone: referencePhone.trim() || null,
      };

      if (editingJob) {
        const { error } = await supabase
          .from('work_history')
          .update(jobData)
          .eq('id', editingJob.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('work_history')
          .insert(jobData);
        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      fetchWorkHistory();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save work history.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (job) => {
    Alert.alert(
      'Delete Work History',
      `Remove "${job.position} at ${job.company_name}" from your work history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('work_history')
                .delete()
                .eq('id', job.id);
              if (error) throw error;
              fetchWorkHistory();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete work history entry.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Adding work history helps car owners trust your experience and increases your chances of being hired.
          </Text>
        </View>

        {workHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>No Work History</Text>
            <Text style={styles.emptyText}>
              Add your previous driving experience to build credibility with car owners.
            </Text>
          </View>
        ) : (
          workHistory.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.jobIcon}>
                  <Ionicons name="briefcase" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobPosition}>{job.position}</Text>
                  <Text style={styles.jobCompany}>{job.company_name}</Text>
                  <Text style={styles.jobDates}>
                    {job.start_date} — {job.is_current ? 'Present' : job.end_date || 'N/A'}
                  </Text>
                </View>
                {job.is_current && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </View>

              {job.description && (
                <Text style={styles.jobDescription}>{job.description}</Text>
              )}

              {job.reference_name && (
                <View style={styles.referenceRow}>
                  <Ionicons name="person" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.referenceText}>
                    Ref: {job.reference_name}
                    {job.reference_phone ? ` (${job.reference_phone})` : ''}
                  </Text>
                </View>
              )}

              <View style={styles.jobActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(job)}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(job)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={22} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Work Experience</Text>
        </TouchableOpacity>
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingJob ? 'Edit Experience' : 'Add Experience'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Company / Employer *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Windhoek Taxi Services"
                placeholderTextColor={COLORS.gray[400]}
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Position / Role *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Private Driver"
                placeholderTextColor={COLORS.gray[400]}
                value={position}
                onChangeText={setPosition}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2022-01-15"
                placeholderTextColor={COLORS.gray[400]}
                value={startDate}
                onChangeText={setStartDate}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Currently working here</Text>
              <Switch
                value={isCurrent}
                onValueChange={setIsCurrent}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primaryLight }}
                thumbColor={isCurrent ? COLORS.primary : COLORS.gray[100]}
              />
            </View>

            {!isCurrent && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2024-06-30"
                  placeholderTextColor={COLORS.gray[400]}
                  value={endDate}
                  onChangeText={setEndDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your responsibilities and achievements..."
                placeholderTextColor={COLORS.gray[400]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reference Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Muller"
                placeholderTextColor={COLORS.gray[400]}
                value={referenceName}
                onChangeText={setReferenceName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reference Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +264 81 123 4567"
                placeholderTextColor={COLORS.gray[400]}
                value={referencePhone}
                onChangeText={setReferencePhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={{ height: SPACING.xl }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingJob ? 'Update' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight + '15',
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  jobCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  jobIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobInfo: {
    flex: 1,
  },
  jobPosition: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  jobCompany: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  jobDates: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: COLORS.secondary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  currentBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  jobDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SPACING.sm,
    marginLeft: 52,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    marginLeft: 52,
  },
  referenceText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    fontWeight: '500',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  addButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  formGroup: {
    marginTop: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.sm,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  modalFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
});

export default WorkHistoryScreen;
