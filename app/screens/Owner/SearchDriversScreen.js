import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useDriverStore from '../../store/useDriverStore';
import DriverCard from '../../components/DriverCard';
import locationService from '../../services/locationService';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  VEHICLE_TYPES,
  AVAILABILITY_OPTIONS,
} from '../../constants/theme';

const SearchDriversScreen = ({ navigation, route }) => {
  const drivers = useDriverStore((s) => s.drivers);
  const loading = useDriverStore((s) => s.loading);
  const filters = useDriverStore((s) => s.filters);
  const pagination = useDriverStore((s) => s.pagination);
  const setFilters = useDriverStore((s) => s.setFilters);
  const clearFilters = useDriverStore((s) => s.clearFilters);
  const searchDrivers = useDriverStore((s) => s.searchDrivers);

  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);
  const searchInputRef = useRef(null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    locationService.getLocations().then(setLocations);
  }, []);

  const handleSearch = async (reset) => {
    try {
      await searchDrivers(reset);
    } catch (err) {
      Alert.alert('Search Error', 'Could not load drivers. Please try again.');
    }
  };

  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // Reset state when Search tab regains focus
  useFocusEffect(
    useCallback(() => {
      setSearchText('');
      setSearching(false);
      setHasSearched(false);
    }, [])
  );

  // Debounced search — only triggers when user types
  useEffect(() => {
    if (!searchText) {
      if (hasSearched) {
        setHasSearched(false);
      }
      return;
    }

    setSearching(true);

    const timer = setTimeout(async () => {
      setFilters({ searchText });
      setHasSearched(true);
      await handleSearch(true);
      setSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      handleSearch(false);
    }
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
    setHasSearched(true);
    handleSearch(true);
  };

  const resetFilters = () => {
    setTempFilters({
      searchText: null,
      location: null,
      minExperience: null,
      availability: null,
      vehicleTypes: null,
      minRating: null,
      hasPdp: null,
      availableNow: null,
    });
  };

  const toggleVehicleType = (typeId) => {
    const current = tempFilters.vehicleTypes || [];
    if (current.includes(typeId)) {
      setTempFilters({
        ...tempFilters,
        vehicleTypes: current.filter((t) => t !== typeId),
      });
    } else {
      setTempFilters({
        ...tempFilters,
        vehicleTypes: [...current, typeId],
      });
    }
  };

  const renderDriver = useCallback(
    ({ item }) => (
      <DriverCard
        driver={item}
        onPress={() => navigation.navigate('DriverDetails', { driverId: item.id })}
        compact
      />
    ),
    [navigation]
  );

  const renderFooter = () => {
    if (!hasSearched || (!loading && !searching)) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (hasSearched && (loading || searching)) return null;
    if (!hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={64} color={COLORS.gray[300]} />
          <Text style={styles.emptyTitle}>Search for Drivers</Text>
          <Text style={styles.emptyText}>
            Type a name or location above to find drivers
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={64} color={COLORS.gray[300]} />
        <Text style={styles.emptyTitle}>No Drivers Found</Text>
        <Text style={styles.emptyText}>
          Try adjusting your search or filters to find more drivers
        </Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            clearFilters();
            setSearchText('');
            setHasSearched(false);
          }}
        >
          <Text style={styles.clearButtonText}>Clear All Filters</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by name or location..."
            placeholderTextColor={COLORS.gray[400]}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, Object.entries(filters).some(([k, v]) => k !== 'searchText' && v) && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options"
            size={20}
            color={Object.entries(filters).some(([k, v]) => k !== 'searchText' && v) ? COLORS.white : COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {Object.entries(filters).some(([k, v]) => k !== 'searchText' && v) && (
        <View style={styles.activeFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.location && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{filters.location}</Text>
                <TouchableOpacity onPress={() => {
                  setFilters({ location: null });
                  handleSearch(true);
                }}>
                  <Ionicons name="close" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}
            {filters.availability && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  {AVAILABILITY_OPTIONS.find(a => a.id === filters.availability)?.label}
                </Text>
                <TouchableOpacity onPress={() => {
                  setFilters({ availability: null });
                  handleSearch(true);
                }}>
                  <Ionicons name="close" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}
            {filters.availableNow && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>Available Now</Text>
                <TouchableOpacity onPress={() => {
                  setFilters({ availableNow: null });
                  handleSearch(true);
                }}>
                  <Ionicons name="close" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}
            {filters.hasPdp && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>Has PDP</Text>
                <TouchableOpacity onPress={() => {
                  setFilters({ hasPdp: null });
                  handleSearch(true);
                }}>
                  <Ionicons name="close" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Caution Notice - only show when results exist */}
      {hasSearched && drivers.length > 0 && (
        <View style={styles.cautionBanner}>
          <Ionicons name="warning" size={18} color="#B45309" />
          <Text style={styles.cautionText}>
            Some drivers may not be verified. Look for the{' '}
            <Text style={{ fontWeight: 'bold' }}>green shield</Text> badge for verified drivers.
            Always verify credentials before hiring.
          </Text>
        </View>
      )}

      {/* Results Count */}
      {hasSearched && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {drivers.length} driver{drivers.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* Drivers List */}
      <FlatList
        data={hasSearched ? drivers : []}
        keyExtractor={(item) => item.id}
        renderItem={renderDriver}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Location */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Location</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {locations.map((location) => (
                  <TouchableOpacity
                    key={location}
                    style={[
                      styles.optionChip,
                      tempFilters.location === location && styles.optionChipSelected,
                    ]}
                    onPress={() =>
                      setTempFilters({
                        ...tempFilters,
                        location: tempFilters.location === location ? null : location,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        tempFilters.location === location && styles.optionChipTextSelected,
                      ]}
                    >
                      {location}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Availability */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Availability</Text>
              <View style={styles.optionsRow}>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionChip,
                      tempFilters.availability === option.id && styles.optionChipSelected,
                    ]}
                    onPress={() =>
                      setTempFilters({
                        ...tempFilters,
                        availability: tempFilters.availability === option.id ? null : option.id,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        tempFilters.availability === option.id && styles.optionChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Vehicle Types */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Vehicle Types</Text>
              <View style={styles.optionsRow}>
                {VEHICLE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.optionChip,
                      (tempFilters.vehicleTypes || []).includes(type.id) && styles.optionChipSelected,
                    ]}
                    onPress={() => toggleVehicleType(type.id)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        (tempFilters.vehicleTypes || []).includes(type.id) && styles.optionChipTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Experience */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Minimum Experience</Text>
              <View style={styles.optionsRow}>
                {[1, 2, 5, 10].map((years) => (
                  <TouchableOpacity
                    key={years}
                    style={[
                      styles.optionChip,
                      tempFilters.minExperience === years && styles.optionChipSelected,
                    ]}
                    onPress={() =>
                      setTempFilters({
                        ...tempFilters,
                        minExperience: tempFilters.minExperience === years ? null : years,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        tempFilters.minExperience === years && styles.optionChipTextSelected,
                      ]}
                    >
                      {years}+ years
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Available Now */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() =>
                  setTempFilters({
                    ...tempFilters,
                    availableNow: !tempFilters.availableNow,
                  })
                }
              >
                <View>
                  <Text style={styles.filterLabel}>Available Now</Text>
                  <Text style={styles.filterDescription}>
                    Only show drivers ready to work today
                  </Text>
                </View>
                <View
                  style={[
                    styles.switch,
                    tempFilters.availableNow && styles.switchActive,
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      tempFilters.availableNow && styles.switchThumbActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* PDP */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() =>
                  setTempFilters({
                    ...tempFilters,
                    hasPdp: !tempFilters.hasPdp,
                  })
                }
              >
                <View>
                  <Text style={styles.filterLabel}>Has PDP</Text>
                  <Text style={styles.filterDescription}>
                    Professional Driving Permit
                  </Text>
                </View>
                <View
                  style={[
                    styles.switch,
                    tempFilters.hasPdp && styles.switchActive,
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      tempFilters.hasPdp && styles.switchThumbActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
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
  searchHeader: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  activeFilters: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.xs,
    gap: SPACING.xs,
  },
  filterChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
  },
  cautionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    marginHorizontal: SPACING.lg,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cautionText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: '#92400E',
    lineHeight: 18,
  },
  resultsHeader: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  resultsCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  loadingFooter: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
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
    paddingHorizontal: SPACING.xl,
  },
  clearButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
  },
  clearButtonText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  // Modal styles
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
  resetText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  filterSection: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  filterLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  filterDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  optionChipSelected: {
    backgroundColor: COLORS.primary,
  },
  optionChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  optionChipTextSelected: {
    color: COLORS.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gray[300],
    padding: 2,
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  modalFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
});

export default SearchDriversScreen;
