import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useJobStore from '../../store/useJobStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, VEHICLE_TYPES } from '../../constants/theme';

const STATUS_STYLES = {
  open: { bg: COLORS.secondary + '15', text: COLORS.secondary, label: 'Open' },
  closed: { bg: COLORS.gray[200], text: COLORS.gray[600], label: 'Closed' },
  filled: { bg: COLORS.primary + '15', text: COLORS.primary, label: 'Filled' },
};

const MyJobPostsScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const { myJobs, fetchMyJobs, updateJob, deleteJob, loading } = useJobStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return myJobs;
    const q = searchQuery.toLowerCase().trim();
    return myJobs.filter((job) =>
      job.title?.toLowerCase().includes(q) ||
      job.location?.toLowerCase().includes(q) ||
      job.description?.toLowerCase().includes(q) ||
      job.status?.toLowerCase().includes(q)
    );
  }, [myJobs, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) fetchMyJobs(profile.id);
    }, [profile?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyJobs(profile.id);
    setRefreshing(false);
  };

  const handleCloseJob = (job) => {
    Alert.alert(
      'Close Job Post',
      'This will hide the post from drivers. You can reopen it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Post',
          onPress: async () => {
            const { error } = await updateJob(job.id, { status: 'closed' });
            if (error) Alert.alert('Error', 'Could not close the post.');
            else fetchMyJobs(profile.id);
          },
        },
      ]
    );
  };

  const handleReopenJob = async (job) => {
    const { error } = await updateJob(job.id, { status: 'open' });
    if (error) Alert.alert('Error', 'Could not reopen the post.');
    else fetchMyJobs(profile.id);
  };

  const handleDeleteJob = (job) => {
    Alert.alert(
      'Delete Job Post',
      'This will permanently delete this post and all associated interest. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteJob(job.id);
            if (error) Alert.alert('Error', 'Could not delete the post.');
          },
        },
      ]
    );
  };

  const renderJob = ({ item: job }) => {
    const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES.open;
    const interestCount = job.interest_count || 0;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
            {job.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.locationText}>{job.location}</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        {/* Interest count + View button */}
        <TouchableOpacity
          style={styles.interestSummary}
          onPress={() => navigation.navigate('JobPostDetails', { jobId: job.id })}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={16} color={COLORS.primary} />
          <Text style={styles.interestSummaryText}>
            {interestCount} driver{interestCount !== 1 ? 's' : ''} interested
          </Text>
          {interestCount > 0 && (
            <View style={styles.viewDriversBtn}>
              <Text style={styles.viewDriversText}>View</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </View>
          )}
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actions}>
          {job.status === 'open' ? (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleCloseJob(job)}>
              <Ionicons name="close-circle-outline" size={16} color={COLORS.gray[600]} />
              <Text style={styles.actionText}>Close</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleReopenJob(job)}>
              <Ionicons name="refresh-outline" size={16} color={COLORS.secondary} />
              <Text style={[styles.actionText, { color: COLORS.secondary }]}>Reopen</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteJob(job)}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={[styles.actionText, { color: COLORS.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Job Posts</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateJobPost')}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.createButtonText}>Post Job</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      {myJobs.length > 0 && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.gray[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your posts..."
              placeholderTextColor={COLORS.gray[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={56} color={COLORS.gray[300]} />
              <Text style={styles.emptyTitle}>No Job Posts Yet</Text>
              <Text style={styles.emptySubtitle}>
                Post a job to let drivers know you're looking for someone
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreateJobPost')}
              >
                <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
                <Text style={styles.emptyButtonText}>Create Your First Post</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    padding: 0,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },
  createButtonText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['2xl'] },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  locationText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.sm,
  },
  statusText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  interestSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  interestSummaryText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  viewDriversBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDriversText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: FONTS.sizes.sm, color: COLORS.gray[600], fontWeight: '500' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'] * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.md },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  emptyButtonText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '600' },
});

export default MyJobPostsScreen;
