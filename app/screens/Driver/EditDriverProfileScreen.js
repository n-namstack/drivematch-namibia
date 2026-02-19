import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import locationService from '../../services/locationService';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  VEHICLE_TYPES,
  AVAILABILITY_OPTIONS,
  LANGUAGES,
} from '../../constants/theme';

const EditDriverProfileScreen = ({ navigation }) => {
  const { profile, driverProfile, updateProfile, updateDriverProfile, isDriver } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState(profile?.profile_image || null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    locationService.getLocations().then(setLocations);
  }, []);

  const [formData, setFormData] = useState({
    firstname: profile?.firstname || '',
    lastname: profile?.lastname || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    bio: driverProfile?.bio || '',
    years_of_experience: driverProfile?.years_of_experience?.toString() || '0',
    availability: driverProfile?.availability || 'full_time',
    vehicle_types: driverProfile?.vehicle_types || [],
    languages: driverProfile?.languages || [],
    has_pdp: driverProfile?.has_pdp || false,
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow photo library access to upload a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    setUploadingImage(true);
    try {
      const file = result.assets[0];

      // Validate file size (max 5MB)
      if (file.fileSize && file.fileSize > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Profile photo must be under 5MB. Please choose a smaller image.');
        setUploadingImage(false);
        return;
      }

      const fileExt = file.uri.split('.').pop().toLowerCase();
      // Use a stable filename so new uploads overwrite the old one (no orphaned files)
      const fileName = `${profile.id}/profile.${fileExt}`;
      const contentType = file.mimeType || `image/${fileExt}`;

      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
      const fileData = decode(base64);

      const { error: uploadError } = await supabase.storage
        .from('profile_images')
        .upload(fileName, fileData, { contentType, upsert: true });

      if (uploadError) throw uploadError;

      // Append cache-buster to force UI to reload the image
      const { data: urlData } = supabase.storage.from('profile_images').getPublicUrl(fileName);
      const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateProfile({ profile_image: imageUrl });
      setProfileImage(imageUrl);
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not upload your photo. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleLanguage = (lang) => {
    const current = formData.languages || [];
    if (current.includes(lang)) {
      updateField('languages', current.filter((l) => l !== lang));
    } else {
      updateField('languages', [...current, lang]);
    }
  };

  const toggleVehicleType = (typeId) => {
    const current = formData.vehicle_types || [];
    if (current.includes(typeId)) {
      updateField('vehicle_types', current.filter((t) => t !== typeId));
    } else {
      updateField('vehicle_types', [...current, typeId]);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    // Update base profile
    const { error: profileError } = await updateProfile({
      firstname: formData.firstname,
      lastname: formData.lastname,
      phone: formData.phone,
      location: formData.location,
    });

    if (profileError) {
      Alert.alert('Error', profileError.message);
      setLoading(false);
      return;
    }

    // Only update driver profile if user is a driver
    if (isDriver) {
      const { error: driverError } = await updateDriverProfile({
        bio: formData.bio,
        years_of_experience: parseInt(formData.years_of_experience) || 0,
        availability: formData.availability,
        vehicle_types: formData.vehicle_types,
        languages: formData.languages,
        has_pdp: formData.has_pdp,
      });

      if (driverError) {
        Alert.alert('Error', driverError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    Alert.alert('Success', 'Profile updated successfully', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoWrapper} onPress={handlePickImage} disabled={uploadingImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.photoPlaceholder]}>
                <Ionicons name="person" size={40} color={COLORS.gray[400]} />
              </View>
            )}
            <View style={styles.cameraIcon}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="camera" size={16} color={COLORS.white} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Tap to change photo</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={formData.firstname}
                onChangeText={(v) => updateField('firstname', v)}
                placeholder="First name"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={formData.lastname}
                onChangeText={(v) => updateField('lastname', v)}
                placeholder="Last name"
              />
            </View>
          </View>

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(v) => updateField('phone', v)}
            placeholder="+264..."
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[
                  styles.chip,
                  formData.location === loc && styles.chipSelected,
                ]}
                onPress={() => updateField('location', loc)}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.location === loc && styles.chipTextSelected,
                  ]}
                >
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Driver-specific sections - only shown for drivers */}
        {isDriver && (
          <>
            {/* About */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About You</Text>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={(v) => updateField('bio', v)}
                placeholder="Tell car owners about yourself, your experience, and what makes you a great driver..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Experience */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Experience</Text>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                value={formData.years_of_experience}
                onChangeText={(v) => updateField('years_of_experience', v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            {/* Availability */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <View style={styles.optionsRow}>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionCard,
                      formData.availability === option.id && styles.optionCardSelected,
                    ]}
                    onPress={() => updateField('availability', option.id)}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        formData.availability === option.id && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Languages */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Languages You Speak</Text>
              <View style={styles.vehicleGrid}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.languageChip,
                      formData.languages.includes(lang) && styles.languageChipSelected,
                    ]}
                    onPress={() => toggleLanguage(lang)}
                  >
                    <Text
                      style={[
                        styles.languageChipText,
                        formData.languages.includes(lang) && styles.languageChipTextSelected,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Vehicle Types */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Types You Can Drive</Text>
              <View style={styles.vehicleGrid}>
                {VEHICLE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.vehicleCard,
                      formData.vehicle_types.includes(type.id) && styles.vehicleCardSelected,
                    ]}
                    onPress={() => toggleVehicleType(type.id)}
                  >
                    <Ionicons
                      name={type.icon}
                      size={24}
                      color={
                        formData.vehicle_types.includes(type.id)
                          ? COLORS.white
                          : COLORS.primary
                      }
                    />
                    <Text
                      style={[
                        styles.vehicleLabel,
                        formData.vehicle_types.includes(type.id) && styles.vehicleLabelSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* PDP */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => updateField('has_pdp', !formData.has_pdp)}
              >
                <View>
                  <Text style={styles.switchLabel}>Professional Driving Permit (PDP)</Text>
                  <Text style={styles.switchDescription}>
                    Do you have a valid PDP?
                  </Text>
                </View>
                <View style={[styles.switch, formData.has_pdp && styles.switchActive]}>
                  <View style={[styles.switchThumb, formData.has_pdp && styles.switchThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
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
  photoSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  photoWrapper: {
    position: 'relative',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  photoHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  section: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    ...SHADOWS.sm,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.xs,
    marginTop: SPACING.sm,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  optionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  optionCardSelected: {
    backgroundColor: COLORS.primary,
  },
  optionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  optionLabelSelected: {
    color: COLORS.white,
  },
  languageChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  languageChipSelected: {
    backgroundColor: COLORS.primary,
  },
  languageChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  languageChipTextSelected: {
    color: COLORS.white,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  vehicleCard: {
    width: '30%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  vehicleCardSelected: {
    backgroundColor: COLORS.primary,
  },
  vehicleLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
  },
  vehicleLabelSelected: {
    color: COLORS.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  switchLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  switchDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
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
  footer: {
    padding: SPACING.lg,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
});

export default EditDriverProfileScreen;
