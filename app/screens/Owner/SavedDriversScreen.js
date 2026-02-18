import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useDriverStore from '../../store/useDriverStore';
import DriverCard from '../../components/DriverCard';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

const SavedDriversScreen = ({ navigation }) => {
  const { user } = useAuth();
  const savedDrivers = useDriverStore((s) => s.savedDrivers);
  const fetchSavedDrivers = useDriverStore((s) => s.fetchSavedDrivers);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSaved();
    }
  }, [user?.id]);

  const loadSaved = async () => {
    setLoading(true);
    await fetchSavedDrivers(user.id);
    setLoading(false);
  };

  const handleRefresh = () => {
    if (user?.id) {
      loadSaved();
    }
  };

  const renderDriver = useCallback(
    ({ item }) => {
      const driver = item.driver;
      if (!driver) return null;
      return (
        <DriverCard
          driver={driver}
          onPress={() => navigation.navigate('DriverDetails', { driverId: driver.id })}
        />
      );
    },
    [navigation]
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={64} color={COLORS.gray[300]} />
        <Text style={styles.emptyTitle}>No Saved Drivers</Text>
        <Text style={styles.emptyText}>
          Save drivers you're interested in to easily find them later. Tap the heart icon on a driver's profile to save them.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Drivers</Text>
        {savedDrivers.filter((item) => item.driver != null).length > 0 && (
          <Text style={styles.count}>{savedDrivers.filter((item) => item.driver != null).length} saved</Text>
        )}
      </View>

      <FlatList
        data={savedDrivers.filter((item) => item.driver != null)}
        keyExtractor={(item) => item.id}
        renderItem={renderDriver}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
  },
  count: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default SavedDriversScreen;
