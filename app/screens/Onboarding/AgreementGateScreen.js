import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { EULA_URL, getTermsText, getPrivacyText } from '../../constants/legal';
import PrimaryButton from '../../components/PrimaryButton';

const AgreementGateScreen = () => {
  const { acceptTerms } = useAuth();
  const [legalModal, setLegalModal] = useState(null);
  const [accepting, setAccepting] = useState(false);

  const handleAgree = async () => {
    setAccepting(true);
    await acceptTerms();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>Welcome to DuoLink</Text>
        <Text style={styles.body}>
          DuoLink connects car owners with trusted drivers. To keep the community
          safe, we have a zero-tolerance policy for objectionable content and
          abusive behavior. You can report or block any user at any time.
        </Text>
        <Text style={styles.body}>
          By continuing, you agree to our{' '}
          <Text style={styles.link} onPress={() => setLegalModal('terms')}>Terms of Service</Text>,{' '}
          <Text style={styles.link} onPress={() => setLegalModal('privacy')}>Privacy Policy</Text>, and{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(EULA_URL)}>EULA</Text>.
        </Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton title="Agree & Continue" onPress={handleAgree} loading={accepting} />
      </View>

      <Modal
        visible={legalModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalModal(null)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </Text>
            <TouchableOpacity onPress={() => setLegalModal(null)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.legalText}>
              {legalModal === 'privacy' ? getPrivacyText() : getTermsText()}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logo: { width: 96, height: 96, borderRadius: 22, marginBottom: SPACING.md },
  title: {
    fontSize: FONTS.sizes['3xl'],
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  body: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  link: { color: COLORS.primary, fontWeight: '600' },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
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
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.text },
  modalBody: { flex: 1, padding: SPACING.lg },
  legalText: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 22 },
});

export default AgreementGateScreen;
