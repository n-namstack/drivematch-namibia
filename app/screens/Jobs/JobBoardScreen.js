import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useJobStore from '../../store/useJobStore';
import JobCard from '../../components/JobCard';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const JobBoardScreen = ({ navigation }) => {
  const { driverProfile } = useAuth();
  const { jobs, myInterests, loading, pagination, fetchJobs, fetchMyInterests, expressInterest, withdrawInterest } = useJobStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchJobs(true);
      if (driverProfile?.id) fetchMyInterests(driverProfile.id);
    }, [driverProfile?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs(true);
    if (driverProfile?.id) await fetchMyInterests(driverProfile.id);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      fetchJobs(false);
    }
  };

  const handleInterest = (job) => {
    const hasInterest = myInterests.includes(job.id);

    if (hasInterest) {
      Alert.alert(
        'Withdraw Interest',
        'Are you sure you want to withdraw your interest in this job?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw',
            style: 'destructive',
            onPress: async () => {
              const { error } = await withdrawInterest(job.id, driverProfile.id);
              if (error) Alert.alert('Error', 'Could not withdraw interest.');
              else fetchMyInterests(driverProfile.id);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Express Interest',
        `Let ${job.owner?.firstname || 'the owner'} know you're interested in "${job.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: "I'm Interested",
            onPress: async () => {
              const { error } = await expressInterest(job.id, driverProfile.id);
              if (error) {
                if (error.message?.includes('duplicate') || error.code === '23505') {
                  Alert.alert('Already Interested', 'You have already expressed interest in this job.');
                } else {
                  Alert.alert('Error', error.message || 'Could not express interest. Please try again.');
                }
              } else {
                Alert.alert('Interest Sent!', `${job.owner?.firstname || 'The owner'} will be notified that you're interested.`);
                fetchMyInterests(driverProfile.id);
              }
            },
          },
        ]
      );
    }
  };

  const renderJob = ({ item: job }) => {
    const hasInterest = myInterests.includes(job.id);
    return (
      <View>
        <JobCard
          job={job}
          hasInterest={hasInterest}
          onPress={() => navigation.navigate('JobPostDetails', { jobId: job.id })}
        />
        {/* Interest button */}
        <TouchableOpacity
          style={[styles.interestButton, hasInterest && styles.interestButtonActive]}
          onPress={() => handleInterest(job)}
        >
          <Ionicons
            name={hasInterest ? 'checkmark-circle' : 'hand-right-outline'}
            size={18}
            color={hasInterest ? COLORS.secondary : COLORS.primary}
          />
          <Text style={[styles.interestButtonText, hasInterest && styles.interestButtonTextActive]}>
            {hasInterest ? 'Interested' : "I'm Interested"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Job Opportunities</Text>
          <Text style={styles.headerSubtitle}>Owners looking for drivers</Text>
        </View>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading && jobs.length > 0 ? (
            <ActivityIndicator style={{ padding: SPACING.md }} color={COLORS.primary} />
          ) : null
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={56} color={COLORS.gray[300]} />
              <Text style={styles.emptyTitle}>No Job Posts Yet</Text>
              <Text style={styles.emptySubtitle}>
                When car owners post that they're looking for a driver, you'll see their listings here
              </Text>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  headerSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['2xl'] },
  interestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  interestButtonActive: {
    backgroundColor: COLORS.secondary + '10',
    borderColor: COLORS.secondary,
  },
  interestButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  interestButtonTextActive: {
    color: COLORS.secondary,
  },
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
});

export default JobBoardScreen;
