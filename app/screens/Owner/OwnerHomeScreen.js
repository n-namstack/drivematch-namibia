import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useDriverStore from '../../store/useDriverStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import DriverCard from '../../components/DriverCard';

const OwnerHomeScreen = ({ navigation }) => {
  const { profile } = useAuth();
  const { featuredDrivers, loading, fetchFeaturedDrivers } = useDriverStore();

  useEffect(() => {
    fetchFeaturedDrivers();
  }, []);

  const quickActions = [
    {
      id: 'search',
      icon: 'search',
      label: 'Search Drivers',
      color: COLORS.primary,
      onPress: () => navigation.navigate('Search'),
    },
    {
      id: 'saved',
      icon: 'heart',
      label: 'Saved Drivers',
      color: COLORS.error,
      onPress: () => navigation.navigate('Saved'),
    },
    {
      id: 'messages',
      icon: 'chatbubbles',
      label: 'Messages',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('Messages'),
    },
    {
      id: 'notifications',
      icon: 'notifications',
      label: 'Notifications',
      color: COLORS.accent,
      onPress: () => navigation.navigate('Notifications'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchFeaturedDrivers} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.firstname || 'there'}!</Text>
            <Text style={styles.subtitle}>Find your perfect driver today</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="person-circle" size={40} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <Text style={styles.searchPlaceholder}>Search for drivers...</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionItem}
              onPress={action.onPress}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured Drivers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Drivers</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {featuredDrivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>No featured drivers yet</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={featuredDrivers}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <DriverCard
                  driver={item}
                  onPress={() => navigation.navigate('DriverDetails', { driverId: item.id })}
                  horizontal
                />
              )}
              contentContainerStyle={styles.driversList}
            />
          )}
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How NamDriver Works</Text>
          <View style={styles.howItWorksContainer}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Search</Text>
                <Text style={styles.stepDescription}>
                  Browse verified drivers by location, experience, and availability
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Connect</Text>
                <Text style={styles.stepDescription}>
                  Message drivers directly and discuss your requirements
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Hire with Confidence</Text>
                <Text style={styles.stepDescription}>
                  View credentials, reviews, and make an informed decision
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  profileButton: {
    padding: SPACING.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchPlaceholder: {
    color: COLORS.gray[400],
    fontSize: FONTS.sizes.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  quickActionItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  seeAll: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  driversList: {
    paddingRight: SPACING.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  howItWorksContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  stepItem: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONTS.sizes.md,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stepDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default OwnerHomeScreen;
