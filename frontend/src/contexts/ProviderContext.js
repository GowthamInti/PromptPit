import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, apiService } from '../services/api';
import toast from 'react-hot-toast';

const ProviderContext = createContext();

export const useProviders = () => {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProviders must be used within a ProviderProvider');
  }
  return context;
};

export const ProviderProvider = ({ children }) => {
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);

  // Fetch providers on mount
  useEffect(() => {
    fetchProviders();
  }, []);

  // Fetch models when providers change
  useEffect(() => {
    if (providers.length > 0) {
      fetchModels();
    }
  }, [providers]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/providers');
      setProviders(response.data);
      
      // Auto-select first active provider if none selected
      const activeProviders = response.data.filter(p => p.is_active);
      if (activeProviders.length > 0 && !selectedProvider) {
        setSelectedProvider(activeProviders[0]);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await api.get('/api/models');
      setModels(response.data);
      
      // Auto-select first model if none selected
      if (response.data.length > 0 && !selectedModel) {
        setSelectedModel(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      toast.error('Failed to fetch models');
    }
  };

  const addProvider = async (providerData) => {
    try {
      const response = await api.post('/api/providers', providerData);
      await fetchProviders(); // Refresh the providers list
      
      // Show success message with model refresh info
      const modelsRefreshed = response.data.models_refreshed || 0;
      const message = response.data.message || `${providerData.name} API key added successfully`;
      toast.success(message);
      
      // Also refresh models to show the newly added ones
      await fetchModels();
      
      return response.data;
    } catch (error) {
      console.error('Error adding provider:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to add provider';
      toast.error(errorMessage);
      throw error;
    }
  };

  const updateApiKey = async (providerName, apiKey) => {
    try {
      const response = await api.put(`/api/providers/${providerName}/api-key`, { api_key: apiKey });
      await fetchProviders(); // Refresh the providers list
      
      // Show success message with model refresh info
      const modelsRefreshed = response.data.models_refreshed || 0;
      const message = response.data.message || `${providerName} API key updated successfully`;
      toast.success(message);
      
      // Also refresh models to show the newly refreshed ones
      await fetchModels();
      
      return response.data;
    } catch (error) {
      console.error('Error updating API key:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update API key';
      toast.error(errorMessage);
      throw error;
    }
  };

  const deactivateProvider = async (providerId) => {
    try {
      const response = await apiService.deactivateProvider(providerId);
      await fetchProviders(); // Refresh the providers list
      await fetchModels(); // Refresh models list
      
      // Update selected provider if the deactivated one was selected
      if (selectedProvider && selectedProvider.id === providerId) {
        const remainingProviders = providers.filter(p => p.id !== providerId && p.is_active);
        setSelectedProvider(remainingProviders.length > 0 ? remainingProviders[0] : null);
      }
      
      toast.success(response.data.message || 'Provider deactivated successfully');
    } catch (error) {
      console.error('Error deactivating provider:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to deactivate provider';
      toast.error(errorMessage);
      throw error;
    }
  };

  const clearApiKey = async (providerId) => {
    try {
      console.log('ProviderContext: clearApiKey called with providerId:', providerId);
      const response = await apiService.clearApiKey(providerId);
      console.log('ProviderContext: clearApiKey response:', response);
      await fetchProviders(); // Refresh the providers list
      await fetchModels(); // Refresh models list
      
      toast.success(response.data.message || 'API key cleared successfully');
    } catch (error) {
      console.error('Error clearing API key:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to clear API key';
      toast.error(errorMessage);
      throw error;
    }
  };

  const permanentlyDeleteProvider = async (providerId) => {
    try {
      const response = await apiService.permanentlyDeleteProvider(providerId);
      await fetchProviders(); // Refresh the providers list
      await fetchModels(); // Refresh models list
      
      // Update selected provider if the deleted one was selected
      if (selectedProvider && selectedProvider.id === providerId) {
        const remainingProviders = providers.filter(p => p.id !== providerId && p.is_active);
        setSelectedProvider(remainingProviders.length > 0 ? remainingProviders[0] : null);
      }
      
      toast.success(response.data.message || 'Provider permanently deleted');
    } catch (error) {
      console.error('Error permanently deleting provider:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete provider';
      toast.error(errorMessage);
      throw error;
    }
  };

  const refreshModels = async (providerId) => {
    try {
      const response = await api.put(`/api/providers/${providerId}/refresh-models`);
      await fetchModels(); // Refresh the models list
      toast.success(`Refreshed ${response.data.models.length} models`);
      return response.data;
    } catch (error) {
      console.error('Error refreshing models:', error);
      toast.error('Failed to refresh models');
      throw error;
    }
  };

  const getModelsByProvider = (providerId) => {
    return models.filter(model => model.provider_id === providerId);
  };

  const value = {
    providers,
    models,
    loading,
    selectedProvider,
    selectedModel,
    setSelectedProvider,
    setSelectedModel,
    addProvider,
    updateApiKey,
    deactivateProvider,
    clearApiKey,
    permanentlyDeleteProvider,
    refreshModels,
    getModelsByProvider,
    fetchProviders,
    fetchModels,
  };

  return (
    <ProviderContext.Provider value={value}>
      {children}
    </ProviderContext.Provider>
  );
};
