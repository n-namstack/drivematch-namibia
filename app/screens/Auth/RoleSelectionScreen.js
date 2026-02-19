import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const RoleSelectionScreen = ({ navigation, route }) => {
  const { signUp } = useAuth();
  const { formData } = route.params;
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: 'driver',
      title: "I'm a Driver",
      description: 'Create a profile, showcase my skills, and connect with car owners looking for drivers.',
      icon: 'car',
      features: [
        'Create professional profile',
        'Upload verification documents',
        'Receive job inquiries',
        'Build trusted reviews',
      ],
    },
    {
      id: 'owner',
      title: "I'm a Car Owner",
      description: 'Search for trusted drivers, view their credentials, and find the perfect match for my vehicle.',
      icon: 'key',
      features: [
        'Search verified drivers',
        'View driver credentials',
        'Message drivers directly',
        'Leave reviews after hiring',
      ],
    },
  ];

  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert('Please Select', 'Please select your role to continue');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUp({
        ...formData,
        role: selectedRole,
      });

      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else if (data?.user?.identities?.length === 0) {
        // Email already exists in Supabase
        Alert.alert(
          'Email Already Registered',
          'This email is already registered. Please sign in instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
          ]
        );
      } else {
        // Signup succeeded — Supabase sends an OTP to the user's email.
        // Navigate to email verification screen.
        navigation.navigate('VerifyEmail', { email: formData.email });
      }
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>How will you use NamDriver?</Text>
          <Text style={styles.subtitle}>
            Choose your role to get started.
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleCard,
                selectedRole === role.id && styles.roleCardSelected,
              ]}
              onPress={() => setSelectedRole(role.id)}
            >
              <View style={styles.roleHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    selectedRole === role.id && styles.iconContainerSelected,
                  ]}
                >
                  <Ionicons
                    name={role.icon}
                    size={28}
                    color={selectedRole === role.id ? COLORS.white : COLORS.primary}
                  />
                </View>
                {selectedRole === role.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={COLORS.primary}
                  />
                )}
              </View>

              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>

              <View style={styles.featuresContainer}>
                {role.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={COLORS.secondary}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Continue Button - pinned at bottom */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole || loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  backButton: {
    marginBottom: SPACING.lg,
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  rolesContainer: {
    gap: SPACING.md,
  },
  roleCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {
    backgroundColor: COLORS.primary,
  },
  roleTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  roleDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  featuresContainer: {
    gap: SPACING.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featureText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    backgroundColor: COLORS.background,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
});

export default RoleSelectionScreen;
