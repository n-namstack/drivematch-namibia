import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import supabase from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

const BUCKET_NAME = 'driver_documents';

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
    try {
      const fileExt = file.uri.split('.').pop().toLowerCase();
      const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`;
      const contentType = file.mimeType || `image/${fileExt}`;

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64',
      });

      const fileData = decode(base64);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileData, {
          contentType,
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      return { data: { ...data, url: urlData.publicUrl }, error: null };
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
    try {
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

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

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
      return { data: null, error: err };
    }
  },

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
      return { error: err };
    }
  },

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
      return { data: null, error: err };
    }
  },
};

export default documentService;
