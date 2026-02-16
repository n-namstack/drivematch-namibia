import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import documentService from '../../services/documentService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, DOCUMENT_TYPES } from '../../constants/theme';

const DocumentUploadScreen = ({ navigation }) => {
  const { user, driverProfile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    if (!driverProfile?.id) return;
    const { data } = await documentService.fetchDriverDocuments(driverProfile.id);
    if (data) setDocuments(data);
    setLoading(false);
  };

  const getDocumentStatus = (docType) => {
    const doc = documents.find((d) => d.document_type === docType);
    if (!doc) return null;
    return doc.verification_status;
  };

  const handleUpload = async (docType) => {
    Alert.alert(
      'Upload Document',
      'Choose how to upload your document',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            setUploading(docType);
            const { data: imageData, error: imageError } = await documentService.takePhoto();
            if (imageData && !imageError) {
              await uploadDocument(docType, imageData);
            }
            setUploading(null);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            setUploading(docType);
            const { data: imageData, error: imageError } = await documentService.pickImage();
            if (imageData && !imageError) {
              await uploadDocument(docType, imageData);
            }
            setUploading(null);
          },
        },
        {
          text: 'Choose Document',
          onPress: async () => {
            setUploading(docType);
            const { data: docData, error: docError } = await documentService.pickDocument();
            if (docData && !docError) {
              await uploadDocument(docType, docData);
            }
            setUploading(null);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadDocument = async (docType, file) => {
    try {
      // Upload to storage
      const { data: uploadData, error: uploadError } = await documentService.uploadDocument(
        user.id,
        file,
        docType
      );

      if (uploadError) {
        Alert.alert('Upload Failed', uploadError.message);
        return;
      }

      // Save record to database
      const { error: saveError } = await documentService.saveDocumentRecord(driverProfile.id, {
        documentType: docType,
        url: uploadData.url,
      });

      if (saveError) {
        Alert.alert('Error', saveError.message);
        return;
      }

      Alert.alert('Success', 'Document uploaded successfully');
      fetchDocuments();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleSubmitForVerification = async () => {
    const requiredDocs = DOCUMENT_TYPES.filter((d) => d.required);
    const uploadedRequiredDocs = requiredDocs.filter((d) => getDocumentStatus(d.id));

    if (uploadedRequiredDocs.length < requiredDocs.length) {
      Alert.alert(
        'Missing Documents',
        'Please upload all required documents before submitting for verification'
      );
      return;
    }

    const { error } = await documentService.submitForVerification(driverProfile.id);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Submitted', 'Your documents have been submitted for verification');
      navigation.goBack();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return { name: 'checkmark-circle', color: COLORS.secondary };
      case 'pending':
        return { name: 'time', color: COLORS.accent };
      case 'rejected':
        return { name: 'close-circle', color: COLORS.error };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Verification Documents</Text>
          <Text style={styles.headerSubtitle}>
            Upload your documents to get verified and build trust with car owners
          </Text>
        </View>

        <View style={styles.documentsContainer}>
          {DOCUMENT_TYPES.map((docType) => {
            const status = getDocumentStatus(docType.id);
            const statusIcon = getStatusIcon(status);
            const isUploading = uploading === docType.id;

            return (
              <TouchableOpacity
                key={docType.id}
                style={styles.documentCard}
                onPress={() => handleUpload(docType.id)}
                disabled={isUploading}
              >
                <View style={styles.documentIcon}>
                  <Ionicons
                    name={status ? 'document' : 'document-outline'}
                    size={24}
                    color={status ? COLORS.primary : COLORS.gray[400]}
                  />
                </View>

                <View style={styles.documentInfo}>
                  <View style={styles.documentHeader}>
                    <Text style={styles.documentTitle}>{docType.label}</Text>
                    {docType.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.documentStatus}>
                    {status
                      ? status === 'verified'
                        ? 'Verified'
                        : status === 'pending'
                        ? 'Under Review'
                        : 'Rejected'
                      : 'Not uploaded'}
                  </Text>
                </View>

                {isUploading ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : statusIcon ? (
                  <Ionicons name={statusIcon.name} size={24} color={statusIcon.color} />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {driverProfile?.verification_status === 'pending' && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitForVerification}
            >
              <Text style={styles.submitButtonText}>Submit for Verification</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  },
  header: {
    padding: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  documentsContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  documentTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  requiredBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  requiredText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
  },
  documentStatus: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  footer: {
    padding: SPACING.lg,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
});

export default DocumentUploadScreen;
