import { create } from 'zustand';
import documentService from '../services/documentService';

const useDocumentStore = create((set, get) => ({
  // State
  documents: [],
  activeDocType: null,
  wizardPhase: 'overview', // overview | upload | details | selfie | verifying | review
  capturedImage: null,
  verificationResults: {},
  loading: false,
  uploading: false,
  error: null,

  // Actions
  setWizardPhase: (phase) => set({ wizardPhase: phase }),
  setActiveDocType: (docType) => set({ activeDocType: docType }),
  setCapturedImage: (image) => set({ capturedImage: image }),

  fetchDocuments: async (driverId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await documentService.fetchDriverDocuments(driverId);
      if (error) throw error;
      set({ documents: data || [], loading: false });
      return { data, error: null };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { data: null, error: err };
    }
  },

  getDocumentByType: (docType) => {
    return get().documents.find((d) => d.document_type === docType) || null;
  },

  uploadAndSave: async (userId, driverId, file, docType, expiryDate = null, docNumber = null) => {
    set({ uploading: true, error: null });
    try {
      // Check if document already exists for this type
      const existing = get().documents.find((d) => d.document_type === docType);

      let result;
      if (existing) {
        // Replace existing document
        result = await documentService.replaceDocument(userId, existing, file, docType);
        if (result.error) throw result.error;

        // Update expiry and number if provided
        if (expiryDate || docNumber) {
          await documentService.updateDocumentRecord(result.data.id, {
            ...(expiryDate && { expiry_date: expiryDate }),
            ...(docNumber && { document_number: docNumber }),
          });
        }
      } else {
        // Upload new document
        const { data: uploadData, error: uploadError } = await documentService.uploadDocument(
          userId, file, docType
        );
        if (uploadError) throw uploadError;

        // Save record to database
        const { data: savedData, error: saveError } = await documentService.saveDocumentRecord(
          driverId, {
            documentType: docType,
            url: uploadData.url,
            storagePath: uploadData.storagePath,
            documentNumber: docNumber,
            expiryDate: expiryDate,
          }
        );
        if (saveError) throw saveError;
        result = { data: savedData };
      }

      // Refresh documents list
      await get().fetchDocuments(driverId);
      set({ uploading: false });
      return { data: result.data, error: null };
    } catch (err) {
      set({ uploading: false, error: err.message });
      return { data: null, error: err };
    }
  },

  uploadSelfie: async (userId, driverId, documentId, selfieFile) => {
    set({ uploading: true, error: null });
    try {
      const { data, error } = await documentService.uploadSelfie(userId, selfieFile, documentId);
      if (error) throw error;

      // Refresh documents list
      await get().fetchDocuments(driverId);
      set({ uploading: false });
      return { data, error: null };
    } catch (err) {
      set({ uploading: false, error: err.message });
      return { data: null, error: err };
    }
  },

  triggerAIVerification: async (documentId, storagePath, expectedType, selfieStoragePath = null) => {
    try {
      const { data, error } = await documentService.verifyDocumentAI(
        documentId, storagePath, expectedType, selfieStoragePath
      );
      if (error) throw error;

      set((state) => ({
        verificationResults: {
          ...state.verificationResults,
          [documentId]: data,
        },
      }));

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  submitForVerification: async (driverId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await documentService.submitForVerification(driverId);
      if (error) throw error;
      set({ loading: false });
      return { data, error: null };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { data: null, error: err };
    }
  },

  startDocumentFlow: (docType) => {
    set({
      activeDocType: docType,
      wizardPhase: 'upload',
      capturedImage: null,
    });
  },

  resetWizard: () => {
    set({
      activeDocType: null,
      wizardPhase: 'overview',
      capturedImage: null,
    });
  },

  resetStore: () => {
    set({
      documents: [],
      activeDocType: null,
      wizardPhase: 'overview',
      capturedImage: null,
      verificationResults: {},
      loading: false,
      uploading: false,
      error: null,
    });
  },
}));

export default useDocumentStore;
