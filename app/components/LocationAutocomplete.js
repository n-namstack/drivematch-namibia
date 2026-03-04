import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import locationService from '../services/locationService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const LocationAutocomplete = ({
  value,
  onSelect,
  placeholder = 'Search for a location...',
  maxResults = 8,
}) => {
  const [locations, setLocations] = useState([]);
  const [text, setText] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    locationService.getLocations().then(setLocations);
  }, []);

  // Sync external value changes
  useEffect(() => {
    setText(value || '');
  }, [value]);

  const filtered = useMemo(() => {
    if (!text.trim()) return locations.slice(0, maxResults);
    const q = text.toLowerCase();
    return locations
      .filter((loc) => loc.toLowerCase().includes(q))
      .slice(0, maxResults);
  }, [text, locations, maxResults]);

  const handleSelect = (loc) => {
    setText(loc);
    setShowDropdown(false);
    onSelect(loc);
  };

  const handleClear = () => {
    setText('');
    setShowDropdown(false);
    onSelect('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Ionicons name="location-outline" size={18} color={COLORS.gray[400]} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray[400]}
          value={text}
          onChangeText={(t) => {
            setText(t);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {text.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
          </TouchableOpacity>
        )}
      </View>
      {showDropdown && filtered.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownScroll}
          >
            {filtered.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={styles.dropdownItem}
                onPress={() => handleSelect(loc)}
              >
                <Ionicons name="location" size={14} color={COLORS.primary} />
                <Text
                  style={[
                    styles.dropdownText,
                    loc === value && styles.dropdownTextSelected,
                  ]}
                >
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    padding: 0,
  },
  dropdown: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xs,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
  },
  dropdownText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  dropdownTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default LocationAutocomplete;
