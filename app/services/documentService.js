import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import supabase from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

const BUCKET_NAME = 'driver_documents';

const compressImage = async (uri) => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
};

const isImage = (uri) => {
  const ext = uri.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext);
};

export const documentService = {
  requestCameraPermission: async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  },

  requestMediaLibraryPermission: async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  },

  takePhoto: async () => {
    const hasPermission = await documentService.requestCameraPermission();
    if (!hasPermission) {
      return { data: null, error: { message: 'Camera permission denied' } };
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) {
        return { data: null, error: null };
      }

      return { data: result.assets[0], error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  takeSelfie: async () => {
    const hasPermission = await documentService.requestCameraPermission();
    if (!hasPermission) {
      return { data: null, error: { message: 'Camera permission denied' } };
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        cameraType: ImagePicker.CameraType.front,
      });

      if (result.canceled) {
        return { data: null, error: null };
      }

      return { data: result.assets[0], error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  pickImage: async () => {
    const hasPermission = await documentService.requestMediaLibraryPermission();
    if (!hasPermission) {
      return { data: null, error: { message: 'Media library permission denied' } };
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) {
        return { data: null, error: null };
      }

      return { data: result.assets[0], error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  pickDocument: async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { data: null, error: null };
      }

      return { data: result.assets[0], error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  uploadDocument: async (userId, file, documentType) => {
    console.log('[DocumentService] uploadDocument called', { userId, documentType, fileUri: file?.uri });
    try {
      if (file.fileSize && file.fileSize > 10 * 1024 * 1024) {
        return { data: null, error: { message: 'File is too large. Maximum size is 10MB.' } };
      }

      let uploadUri = file.uri;
      let fileExt = file.uri.split('.').pop().toLowerCase();
      let contentType = file.mimeType || `image/${fileExt}`;

      if (isImage(file.uri)) {
        uploadUri = await compressImage(file.uri);
        fileExt = 'jpeg';
        contentType = 'image/jpeg';
      }

      const storagePath = `${userId}/${documentType}_${Date.now()}.${fileExt}`;

      const base64 = await FileSystem.readAsStringAsync(uploadUri, {
        encoding: 'base64',
      });

      const fileData = decode(base64);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileData, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.log('[DocumentService] uploadDocument storage error', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      console.log('[DocumentService] uploadDocument success', { url: urlData.publicUrl, storagePath });
      return { data: { ...data, url: urlData.publicUrl, storagePath }, error: null };
    } catch (err) {
      console.log('[DocumentService] uploadDocument caught error', err);
      return { data: null, error: err };
    }
  },

  uploadSelfie: async (userId, file, documentId) => {
    console.log('[DocumentService] uploadSelfie called', { userId, documentId });
    try {
      if (file.fileSize && file.fileSize > 10 * 1024 * 1024) {
        return { data: null, error: { message: 'File is too large. Maximum size is 10MB.' } };
      }

      const compressedUri = await compressImage(file.uri);
      const storagePath = `${userId}/selfie_${documentId}_${Date.now()}.jpeg`;

      const base64 = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: 'base64',
      });

      const fileData = decode(base64);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      const { data, error } = await supabase
        .from('driver_documents')
        .update({
          selfie_url: urlData.publicUrl,
          selfie_storage_path: storagePath,
        })
        .eq('id', documentId)
        .select();

      if (error) throw error;
      const record = data?.[0] ?? null;

      return { data: { ...record, selfieStoragePath: storagePath }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  verifyDocumentAI: async (documentId, storagePath, expectedType, selfieStoragePath = null) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-document', {
        body: {
          documentId,
          storagePath,
          expectedType,
          selfieStoragePath,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  getSignedUrl: async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 3600);

      if (error) throw error;
      return { data: data.signedUrl, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  saveDocumentRecord: async (driverId, documentData) => {
    console.log('[DocumentService] saveDocumentRecord called', { driverId, documentData });
    try {
      const { data, error } = await supabase
        .from('driver_documents')
        .insert({
          driver_id: driverId,
          document_type: documentData.documentType,
          document_url: documentData.url,
          document_storage_path: documentData.storagePath,
          document_number: documentData.documentNumber,
          expiry_date: documentData.expiryDate,
        })
        .select();

      if (error) {
        console.log('[DocumentService] saveDocumentRecord error', error);
        throw error;
      }
      const record = data?.[0] ?? null;
      console.log('[DocumentService] saveDocumentRecord success', { recordId: record?.id });
      return { data: record, error: null };
    } catch (err) {
      console.log('[DocumentService] saveDocumentRecord caught error', err);
      return { data: null, error: err };
    }
  },

  updateDocumentRecord: async (documentId, updates) => {
    console.log('[DocumentService] updateDocumentRecord called', { documentId, updates });
    try {
      const { data, error } = await supabase
        .from('driver_documents')
        .update(updates)
        .eq('id', documentId)
        .select();

      if (error) throw error;
      const record = data?.[0] ?? null;
      return { data: record, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  fetchDriverDocuments: async (driverId) => {
    try {
      const { data, error } = await supabase
        .from('driver_documents')
        .select('*, document_expiry_alerts(*)')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  deleteDocument: async (documentId, documentUrl, selfieStoragePath = null) => {
    try {
      const path = documentUrl.split(`${BUCKET_NAME}/`)[1];
      const pathsToRemove = [];
      if (path) pathsToRemove.push(path);
      if (selfieStoragePath) pathsToRemove.push(selfieStoragePath);

      if (pathsToRemove.length > 0) {
        await supabase.storage.from(BUCKET_NAME).remove(pathsToRemove);
      }

      const { error } = await supabase
        .from('driver_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },

  replaceDocument: async (userId, existingDoc, file, documentType) => {
    console.log('[DocumentService] replaceDocument called', { userId, existingDocId: existingDoc?.id, documentType });
    try {
      // Remove old files from storage
      const pathsToRemove = [];
      if (existingDoc.document_storage_path) pathsToRemove.push(existingDoc.document_storage_path);
      if (existingDoc.selfie_storage_path) pathsToRemove.push(existingDoc.selfie_storage_path);
      if (pathsToRemove.length > 0) {
        await supabase.storage.from(BUCKET_NAME).remove(pathsToRemove);
      }

      // Upload new file
      const { data: uploadData, error: uploadError } = await documentService.uploadDocument(
        userId, file, documentType
      );
      if (uploadError) throw uploadError;

      // Update existing record
      const { data, error } = await supabase
        .from('driver_documents')
        .update({
          document_url: uploadData.url,
          document_storage_path: uploadData.storagePath,
          selfie_url: null,
          selfie_storage_path: null,
          verification_status: 'pending',
          ai_verification_result: null,
          ai_verified_at: null,
          rejection_reason: null,
        })
        .eq('id', existingDoc.id)
        .select();

      if (error) throw error;
      const record = data?.[0] ?? null;

      // Delete related expiry alerts since document is new
      try {
        await supabase
          .from('document_expiry_alerts')
          .delete()
          .eq('document_id', existingDoc.id);
      } catch (_) {
        // Non-critical — ignore if alerts table doesn't exist or has no rows
      }

      return { data: { ...record, storagePath: uploadData.storagePath }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  submitForVerification: async (driverId) => {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .update({ verification_status: 'submitted' })
        .eq('id', driverId)
        .select();

      if (error) throw error;
      const record = data?.[0] ?? null;
      return { data: record, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },
};

export default documentService;
