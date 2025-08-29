import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, apiService } from '../services/api';
import toast from 'react-hot-toast';

const PromptContext = createContext();

export const usePrompts = () => {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error('usePrompts must be used within a PromptProvider');
  }
  return context;
};

export const PromptProvider = ({ children }) => {
  const [prompts, setPrompts] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [promptVersions, setPromptVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch prompts on mount
  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/prompts/with-versions');
      setPrompts(response.data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast.error('Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPromptVersions = useCallback(async (promptId) => {
    try {
      const response = await api.get(`/api/prompts/${promptId}/versions`);
      setPromptVersions(response.data);
    } catch (error) {
      console.error('Error fetching prompt versions:', error);
      toast.error('Failed to fetch prompt versions');
    }
  }, []);

  const fetchPromptById = useCallback(async (promptId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/prompts/${promptId}`);
      setCurrentPrompt(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching prompt:', error);
      toast.error('Failed to fetch prompt');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPrompt = useCallback(async (promptData) => {
    try {
      setSaving(true);
      const response = await api.post('/api/prompts', promptData);
      await fetchPrompts();
      toast.success('Prompt created successfully!');
      return response.data;
    } catch (error) {
      console.error('Error creating prompt:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create prompt';
      toast.error(errorMessage);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [fetchPrompts]);

  const updatePrompt = useCallback(async (promptId, promptData) => {
    try {
      setSaving(true);
      const response = await api.put(`/api/prompts/${promptId}`, promptData);
      await fetchPrompts();
      toast.success('Prompt updated successfully!');
      return response.data;
    } catch (error) {
      console.error('Error updating prompt:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update prompt';
      toast.error(errorMessage);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [fetchPrompts]);

  const lockPromptVersion = useCallback(async (promptId, versionData) => {
    try {
      setSaving(true);
      const response = await api.post(`/api/prompts/${promptId}/versions`, versionData);
      await fetchPromptVersions(promptId);
      toast.success('Prompt version locked successfully!');
      return response.data;
    } catch (error) {
      console.error('Error locking prompt version:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to lock prompt version';
      toast.error(errorMessage);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [fetchPromptVersions]);

  const createAndLockPrompt = useCallback(async (versionData) => {
    try {
      setSaving(true);
      const response = await api.post('/api/prompts/create-and-lock', versionData);
      await fetchPrompts();
      toast.success('Prompt created and version locked successfully!');
      return response.data;
    } catch (error) {
      console.error('Error creating and locking prompt:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create and lock prompt';
      toast.error(errorMessage);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [fetchPrompts]);

  const runPrompt = useCallback(async (promptData) => {
    try {
      setLoading(true);
      const response = await apiService.runPrompt(promptData);
      return response.data;
    } catch (error) {
      console.error('Error running prompt:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to run prompt';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePrompt = useCallback(async (promptId) => {
    try {
      await api.delete(`/api/prompts/${promptId}`);
      await fetchPrompts();
      toast.success('Prompt deleted successfully!');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete prompt';
      toast.error(errorMessage);
      throw error;
    }
  }, [fetchPrompts]);

  const duplicatePrompt = useCallback(async (promptId) => {
    try {
      const response = await api.post(`/api/prompts/${promptId}/duplicate`);
      await fetchPrompts();
      toast.success('Prompt duplicated successfully!');
      return response.data;
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to duplicate prompt';
      toast.error(errorMessage);
      throw error;
    }
  }, [fetchPrompts]);

  const deletePromptVersion = useCallback(async (promptId, versionId) => {
    try {
      await api.delete(`/api/prompts/${promptId}/versions/${versionId}`);
      await fetchPromptVersions(promptId);
      toast.success('Version deleted successfully!');
    } catch (error) {
      console.error('Error deleting prompt version:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete version';
      toast.error(errorMessage);
      throw error;
    }
  }, [fetchPromptVersions]);

  const value = {
    prompts,
    currentPrompt,
    promptVersions,
    loading,
    saving,
    setCurrentPrompt,
    fetchPrompts,
    fetchPromptVersions,
    fetchPromptById,
    createPrompt,
    updatePrompt,
    lockPromptVersion,
    createAndLockPrompt,
    runPrompt,
    deletePrompt,
    duplicatePrompt,
    deletePromptVersion,
  };

  return (
    <PromptContext.Provider value={value}>
      {children}
    </PromptContext.Provider>
  );
};
