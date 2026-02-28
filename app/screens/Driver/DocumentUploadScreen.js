import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import useDocumentStore from '../../store/useDocumentStore';
import DocumentProgressBar from '../../components/DocumentProgressBar';
import DocumentChecklist from '../../components/DocumentChecklist';
import DocumentCapture from '../../components/DocumentCapture';
import DocumentDetailsInput from '../../components/DocumentDetailsInput';
import SelfieCapture from '../../components/SelfieCapture';
import VerificationProgress from '../../components/VerificationProgress';
import ReviewAndSubmit from '../../components/ReviewAndSubmit';
import { COLORS, FONTS, SPACING, DOCUMENT_TYPES } from '../../constants/theme';

const DocumentUploadScreen = ({ navigation, route }) => {
  const { user, driverProfile, refreshProfile } = useAuth();
  const {
    documents,
    wizardPhase,
    activeDocType,
    verificationResults,
    loading,
    uploading,
    fetchDocuments,
    setWizardPhase,
    startDocumentFlow,
    uploadAndSave,
    uploadSelfie,
    triggerAIVerification,
    submitForVerification,
    resetWizard,
  } = useDocumentStore();

  const [capturedFile, setCapturedFile] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Initial load
  useEffect(() => {
    if (driverProfile?.id) {
      fetchDocuments(driverProfile.id);
    }
    return () => resetWizard();
  }, [driverProfile?.id]);

  // Handle deep-link from notification
  useEffect(() => {
    const initialDocType = route?.params?.initialDocType;
    if (initialDocType && documents.length > 0) {
      startDocumentFlow(initialDocType);
    }
  }, [route?.params?.initialDocType, documents.length]);

  const currentDocConfig = DOCUMENT_TYPES.find((d) => d.id === activeDocType);
  const currentDoc = documents.find((d) => d.document_type === activeDocType);

  // Handle document selection from checklist
  const handleSelectDocument = useCallback((docTypeId) => {
    startDocumentFlow(docTypeId);
  }, []);

  // Handle captured image from DocumentCapture
  const handleDocumentCaptured = useCallback((file) => {
    setCapturedFile(file);
    const config = DOCUMENT_TYPES.find((d) => d.id === activeDocType);
    if (config?.requiresExpiry || config?.requiresNumber) {
      setWizardPhase('details');
    } else if (config?.requiresSelfie) {
      // Upload first, then selfie
      handleUploadAndProceedToSelfie(file, null, null);
    } else {
      handleUploadAndFinish(file, null, null);
    }
  }, [activeDocType]);

  // Handle details submitted
  const handleDetailsSubmitted = useCallback((details) => {
    const config = DOCUMENT_TYPES.find((d) => d.id === activeDocType);
    if (config?.requiresSelfie) {
      handleUploadAndProceedToSelfie(capturedFile, details.expiryDate, details.documentNumber);
    } else {
      handleUploadAndFinish(capturedFile, details.expiryDate, details.documentNumber);
    }
  }, [activeDocType, capturedFile]);

  // Upload document and go to selfie step
  const handleUploadAndProceedToSelfie = async (file, expiryDate, docNumber) => {
    const { data, error } = await uploadAndSave(
      user.id, driverProfile.id, file, activeDocType, expiryDate, docNumber
    );

    if (error) {
      Alert.alert('Upload Failed', error.message || 'Could not upload document');
      return;
    }

    // Trigger AI verification in background (doc only, selfie will come later)
    if (data?.document_storage_path) {
      triggerAIVerification(data.id, data.document_storage_path, activeDocType).catch(() => {});
    }

    setWizardPhase('selfie');
  };

  // Upload document and finish (no selfie needed)
  const handleUploadAndFinish = async (file, expiryDate, docNumber) => {
    const { data, error } = await uploadAndSave(
      user.id, driverProfile.id, file, activeDocType, expiryDate, docNumber
    );

    if (error) {
      Alert.alert('Upload Failed', error.message || 'Could not upload document');
      return;
    }

    // Trigger AI verification
    if (data?.document_storage_path) {
      setAiLoading(true);
      setWizardPhase('verifying');
      const result = await triggerAIVerification(data.id, data.document_storage_path, activeDocType);
      setAiLoading(false);

      if (!result.data) {
        // AI verification failed or unavailable, just go to overview
        resetWizard();
        Alert.alert('Success', 'Document uploaded successfully');
      }
    } else {
      resetWizard();
      Alert.alert('Success', 'Document uploaded successfully');
    }
  };

  // Handle selfie captured
  const handleSelfieCaptured = async (selfieFile) => {
    const doc = documents.find((d) => d.document_type === activeDocType);
    if (!doc) return;

    const { data, error } = await uploadSelfie(user.id, driverProfile.id, doc.id, selfieFile);

    if (error) {
      Alert.alert('Upload Failed', error.message || 'Could not upload selfie');
      return;
    }

    // Trigger AI verification with selfie
    setAiLoading(true);
    setWizardPhase('verifying');
    const result = await triggerAIVerification(
      doc.id,
      doc.document_storage_path,
      activeDocType,
      data?.selfieStoragePath || data?.selfie_storage_path
    );
    setAiLoading(false);

    if (!result.data) {
      resetWizard();
      Alert.alert('Success', 'Document and selfie uploaded successfully');
    }
  };

  // Handle selfie skip
  const handleSelfieSkip = () => {
    resetWizard();
    Alert.alert('Document Uploaded', 'You can add the selfie later for faster verification.');
  };

  // Handle submit for verification
  const handleSubmitForVerification = async () => {
    const requiredDocs = DOCUMENT_TYPES.filter((d) => d.required);
    const missingRequired = requiredDocs.filter(
      (d) => !documents.find((doc) => doc.document_type === d.id)
    );

    if (missingRequired.length > 0) {
      Alert.alert(
        'Missing Documents',
        `Please upload: ${missingRequired.map((d) => d.label).join(', ')}`
      );
      return;
    }

    const { error } = await submitForVerification(driverProfile.id);
    if (error) {
      Alert.alert('Error', error.message || 'Could not submit for verification');
    } else {
      await refreshProfile();
      Alert.alert(
        'Submitted!',
        'Your documents have been submitted for verification. You will be notified once reviewed.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  // Navigation handlers for back buttons within wizard
  const handleBackToOverview = () => {
    setCapturedFile(null);
    resetWizard();
  };

  const handleBackToUpload = () => {
    setCapturedFile(null);
    setWizardPhase('upload');
  };

  const handleBackToDetails = () => {
    setWizardPhase('details');
  };

  if (loading && documents.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={wizardPhase === 'overview' ? () => navigation.goBack() : handleBackToOverview}
          style={styles.headerBtn}
        >
          <Ionicons
            name={wizardPhase === 'overview' ? 'arrow-back' : 'close'}
            size={24}
            color={COLORS.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {wizardPhase === 'overview' ? 'Verification Documents' :
           wizardPhase === 'review' ? 'Review & Submit' :
           currentDocConfig?.label || 'Upload Document'}
        </Text>
        {wizardPhase === 'overview' ? (
          <TouchableOpacity
            onPress={() => setWizardPhase('review')}
            style={styles.headerBtn}
          >
            <Ionicons name="checkmark-done-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Progress bar (shown in overview and review) */}
      {(wizardPhase === 'overview' || wizardPhase === 'review') && (
        <DocumentProgressBar
          documents={documents}
          activeDocType={activeDocType}
          phase={wizardPhase}
        />
      )}

      {/* Upload progress overlay */}
      {uploading && wizardPhase !== 'verifying' && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      {/* Wizard phases */}
      {wizardPhase === 'overview' && (
        <DocumentChecklist
          documents={documents}
          onSelectDocument={handleSelectDocument}
          verificationStatus={driverProfile?.verification_status}
        />
      )}

      {wizardPhase === 'upload' && (
        <DocumentCapture
          docType={activeDocType}
          existingDoc={currentDoc}
          onCapture={handleDocumentCaptured}
          onBack={handleBackToOverview}
        />
      )}

      {wizardPhase === 'details' && (
        <DocumentDetailsInput
          docType={activeDocType}
          existingDoc={currentDoc}
          onSubmit={handleDetailsSubmitted}
          onBack={handleBackToUpload}
        />
      )}

      {wizardPhase === 'selfie' && (
        <SelfieCapture
          docType={activeDocType}
          documentImageUrl={currentDoc?.document_url}
          onCapture={handleSelfieCaptured}
          onSkip={handleSelfieSkip}
          onBack={currentDocConfig?.requiresExpiry ? handleBackToDetails : handleBackToUpload}
        />
      )}

      {wizardPhase === 'verifying' && (
        <VerificationProgress
          verificationResult={verificationResults[currentDoc?.id]}
          loading={aiLoading}
          hasSelfie={!!currentDoc?.selfie_url}
          onContinue={handleBackToOverview}
          onRetakeDoc={() => {
            setCapturedFile(null);
            setWizardPhase('upload');
          }}
          onRetakeSelfie={() => setWizardPhase('selfie')}
        />
      )}

      {wizardPhase === 'review' && (
        <ReviewAndSubmit
          documents={documents}
          loading={loading}
          verificationStatus={driverProfile?.verification_status}
          onSubmit={handleSubmitForVerification}
          onEditDocument={(docTypeId) => startDocumentFlow(docTypeId)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  uploadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.lg,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  uploadingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default DocumentUploadScreen;
