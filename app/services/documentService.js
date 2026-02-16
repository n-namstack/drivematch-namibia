import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import supabase from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

const BUCKET_NAME = 'driver_documents';

export const documentService = {
  // Request permissions
  requestCameraPermission: async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  },

  requestMediaLibraryPermission: async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  },

  // Pick image from camera
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

      console.log('[DocumentService] Camera result canceled:', result.canceled);

      if (result.canceled) {
        return { data: null, error: null };
      }

      return { data: result.assets[0], error: null };
    } catch (err) {
      console.log('[DocumentService] Camera error:', err);
      return { data: null, error: err };
    }
  },

  // Pick image from library
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

      console.log('[DocumentService] Image picker canceled:', result.canceled);

      if (result.canceled) {
        return { data: null, error: null };
      }

      return { data: result.assets[0], error: null };
    } catch (err) {
      console.log('[DocumentService] Image picker error:', err);
      return { data: null, error: err };
    }
  },

  // Pick document (PDF, etc.)
  pickDocument: async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      console.log('[DocumentService] Document picker canceled:', result.canceled);

      if (result.canceled) {
        return { data: null, error: null };
      }

      return { data: result.assets[0], error: null };
    } catch (err) {
      console.log('[DocumentService] Document picker error:', err);
      return { data: null, error: err };
    }
  },

  // Upload document to Supabase Storage
  uploadDocument: async (userId, file, documentType) => {
    try {
      console.log('[DocumentService] Uploading file:', {
        uri: file.uri,
        mimeType: file.mimeType,
      });

      const fileExt = file.uri.split('.').pop().toLowerCase();
      const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`;
      const contentType = file.mimeType || `image/${fileExt}`;

      // Always read file as base64 from URI
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64',
      });

      console.log('[DocumentService] Base64 read, length:', base64.length);

      const fileData = decode(base64);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileData, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.log('[DocumentService] Upload error:', error);
        throw error;
      }

      console.log('[DocumentService] Upload success:', data);

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      return { data: { ...data, url: urlData.publicUrl }, error: null };
    } catch (err) {
      console.log('[DocumentService] Upload failed:', err);
      return { data: null, error: err };
    }
  },

  // Get signed URL for private document
  getSignedUrl: async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 3600);

      if (error) throw error;
      return { data: data.signedUrl, error: null };
    } catch (err) {
      console.log('[DocumentService] Signed URL error:', err);
      return { data: null, error: err };
    }
  },

  // Save document record to database
  saveDocumentRecord: async (driverId, documentData) => {
    try {
      console.log('[DocumentService] Saving record:', { driverId, documentData });

      const { data, error } = await supabase
        .from('driver_documents')
        .insert({
          driver_id: driverId,
          document_type: documentData.documentType,
          document_url: documentData.url,
          document_number: documentData.documentNumber,
          expiry_date: documentData.expiryDate,
        })
        .select()
        .single();

      if (error) {
        console.log('[DocumentService] Save record error:', error);
        throw error;
      }

      console.log('[DocumentService] Record saved:', data);
      return { data, error: null };
    } catch (err) {
      console.log('[DocumentService] Save record failed:', err);
      return { data: null, error: err };
    }
  },

  // Fetch driver's documents
  fetchDriverDocuments: async (driverId) => {
    try {
      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.log('[DocumentService] Fetch documents error:', err);
      return { data: null, error: err };
    }
  },

  // Delete document
  deleteDocument: async (documentId, documentUrl) => {
    try {
      const path = documentUrl.split(`${BUCKET_NAME}/`)[1];
      if (path) {
        await supabase.storage.from(BUCKET_NAME).remove([path]);
      }

      const { error } = await supabase
        .from('driver_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.log('[DocumentService] Delete error:', err);
      return { error: err };
    }
  },

  // Submit all documents for verification
  submitForVerification: async (driverId) => {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .update({ verification_status: 'submitted' })
        .eq('id', driverId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.log('[DocumentService] Submit verification error:', err);
      return { data: null, error: err };
    }
  },
};

export default documentService;
