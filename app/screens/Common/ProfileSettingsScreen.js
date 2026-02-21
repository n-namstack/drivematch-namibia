import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const SUPPORT_EMAIL = 'support@namdriver.com';

const ProfileSettingsScreen = ({ navigation }) => {
  const { profile, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [legalModal, setLegalModal] = useState(null);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? All your data, messages, and reviews will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      // Server-side function deletes all data AND the auth.users row
                      const { error: rpcError } = await supabase.rpc('delete_user_account');
                      if (rpcError) throw rpcError;

                      await signOut();
                    } catch (err) {
                      Alert.alert('Error', 'Could not delete account. Please contact support.');
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditDriverProfile');
  };

  const handleHelpCenter = () => {
    Alert.alert('Help Center', 'How can we help you?', [
      {
        text: 'Email Support',
        onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=NamDriver%20Support%20Request`),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const menuItems = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', onPress: handleEditProfile },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', onPress: handleHelpCenter },
        { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => setLegalModal('terms') },
        { icon: 'shield-outline', label: 'Privacy Policy', onPress: () => setLegalModal('privacy') },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        { icon: 'trash-outline', label: 'Delete Account', onPress: handleDeleteAccount, destructive: true },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* User Info */}
        <TouchableOpacity style={styles.userCard} onPress={handleEditProfile}>
          <View style={styles.avatarContainer}>
            {profile?.profile_image ? (
              <Image source={{ uri: profile.profile_image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={32} color={COLORS.gray[400]} />
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {profile?.firstname} {profile?.lastname}
            </Text>
            <Text style={styles.userEmail}>{profile?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {profile?.role === 'driver' ? 'Driver' : profile?.role === 'admin' ? 'Admin' : 'Car Owner'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>

        {/* Menu Sections */}
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.destructive ? COLORS.error : COLORS.primary}
                    />
                    <Text style={[styles.menuItemLabel, item.destructive && { color: COLORS.error }]}>
                      {item.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.version}>NamDriver v1.0.0</Text>
      </ScrollView>

      {/* Legal Modal */}
      <Modal
        visible={legalModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalModal(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </Text>
            <TouchableOpacity onPress={() => setLegalModal(null)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {legalModal === 'privacy' ? <PrivacyPolicyContent /> : <TermsOfServiceContent />}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Deleting Overlay */}
      {deleting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.overlayText}>Deleting account...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const PrivacyPolicyContent = () => (
  <View style={legalStyles.container}>
    <Text style={legalStyles.lastUpdated}>Last updated: February 2026</Text>

    <Text style={legalStyles.heading}>1. Information We Collect</Text>
    <Text style={legalStyles.body}>
      NamDriver collects information you provide when creating an account, including your name, email address, phone number, location, and profile photo. For drivers, we also collect professional credentials, work history, and uploaded documents such as driver's licenses and identity documents.
    </Text>

    <Text style={legalStyles.heading}>2. How We Use Your Information</Text>
    <Text style={legalStyles.body}>
      We use your information to: provide and maintain the NamDriver service; connect car owners with drivers; verify driver credentials; facilitate communication between users; send notifications about your account; and improve our services.
    </Text>

    <Text style={legalStyles.heading}>3. Information Sharing</Text>
    <Text style={legalStyles.body}>
      Your profile information is visible to other NamDriver users as part of the service. We do not sell your personal information to third parties. We may share information with service providers who assist in operating our platform, or when required by law.
    </Text>

    <Text style={legalStyles.heading}>4. Data Storage & Security</Text>
    <Text style={legalStyles.body}>
      Your data is stored securely using industry-standard encryption. Documents and personal files are stored in secure cloud storage with restricted access. We implement appropriate technical and organizational measures to protect your personal data.
    </Text>

    <Text style={legalStyles.heading}>5. Your Rights</Text>
    <Text style={legalStyles.body}>
      You have the right to: access your personal data; correct inaccurate data; delete your account and associated data; export your data; and withdraw consent for data processing. You can exercise these rights through the app settings or by contacting us.
    </Text>

    <Text style={legalStyles.heading}>6. Camera & Photo Library</Text>
    <Text style={legalStyles.body}>
      NamDriver requests access to your camera and photo library solely for uploading profile photos and document images for verification purposes. These images are stored securely and used only for the stated purpose.
    </Text>

    <Text style={legalStyles.heading}>7. Contact Us</Text>
    <Text style={legalStyles.body}>
      For privacy-related inquiries, contact us at support@namdriver.com.
    </Text>
  </View>
);

const TermsOfServiceContent = () => (
  <View style={legalStyles.container}>
    <Text style={legalStyles.lastUpdated}>Last updated: February 2026</Text>

    <Text style={legalStyles.heading}>1. Acceptance of Terms</Text>
    <Text style={legalStyles.body}>
      By using NamDriver, you agree to these Terms of Service. If you do not agree, please do not use the application. NamDriver reserves the right to update these terms at any time.
    </Text>

    <Text style={legalStyles.heading}>2. Service Description</Text>
    <Text style={legalStyles.body}>
      NamDriver is a platform that connects car owners with professional drivers in Namibia. We facilitate introductions and communication between parties but are not a party to any employment agreement between owners and drivers.
    </Text>

    <Text style={legalStyles.heading}>3. User Accounts</Text>
    <Text style={legalStyles.body}>
      You must provide accurate, complete information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use NamDriver.
    </Text>

    <Text style={legalStyles.heading}>4. Driver Verification</Text>
    <Text style={legalStyles.body}>
      Drivers may submit documents for verification. While NamDriver reviews these documents, verification does not constitute an endorsement or guarantee. Car owners should conduct their own due diligence when hiring drivers.
    </Text>

    <Text style={legalStyles.heading}>5. User Conduct</Text>
    <Text style={legalStyles.body}>
      Users agree not to: provide false or misleading information; harass or abuse other users; use the platform for illegal purposes; attempt to circumvent security measures; or post inappropriate content in reviews or messages.
    </Text>

    <Text style={legalStyles.heading}>6. Reviews & Ratings</Text>
    <Text style={legalStyles.body}>
      Reviews must be honest and based on actual experience. NamDriver reserves the right to remove reviews that violate our guidelines, contain inappropriate content, or are determined to be fraudulent.
    </Text>

    <Text style={legalStyles.heading}>7. Limitation of Liability</Text>
    <Text style={legalStyles.body}>
      NamDriver provides a platform for connecting users and is not liable for any disputes, damages, or issues arising from interactions between car owners and drivers. Users engage with each other at their own risk.
    </Text>

    <Text style={legalStyles.heading}>8. Termination</Text>
    <Text style={legalStyles.body}>
      NamDriver may suspend or terminate accounts that violate these terms. Users may delete their account at any time through the app settings, which will remove their personal data from our systems.
    </Text>

    <Text style={legalStyles.heading}>9. Contact</Text>
    <Text style={legalStyles.body}>
      For questions about these terms, contact us at support@namdriver.com.
    </Text>
  </View>
);

const legalStyles = StyleSheet.create({
  container: { padding: SPACING.lg, paddingBottom: SPACING['2xl'] },
  lastUpdated: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg, fontStyle: 'italic' },
  heading: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  body: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 22 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: FONTS.sizes['2xl'], fontWeight: 'bold', color: COLORS.text },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm,
  },
  avatarContainer: { marginRight: SPACING.md },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.text },
  userEmail: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  roleBadge: {
    backgroundColor: COLORS.primary + '15', paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full, alignSelf: 'flex-start', marginTop: SPACING.xs,
  },
  roleText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.primary, textTransform: 'capitalize' },
  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  sectionTitle: {
    fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary,
    marginBottom: SPACING.sm, textTransform: 'uppercase',
  },
  menuCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  menuItemLabel: { fontSize: FONTS.sizes.md, color: COLORS.text },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    gap: SPACING.sm, ...SHADOWS.sm,
  },
  signOutText: { fontSize: FONTS.sizes.md, color: COLORS.error, fontWeight: '500' },
  version: { textAlign: 'center', color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginVertical: SPACING.xl },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray[100],
  },
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  modalContent: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', gap: SPACING.md,
  },
  overlayText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '500' },
});

export default ProfileSettingsScreen;
