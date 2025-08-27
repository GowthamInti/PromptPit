import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useProviders } from '../contexts/ProviderContext';

const AddProviderModal = ({ isOpen, onClose, onAdd }) => {
  const { providers, updateApiKey } = useProviders();
  const [formData, setFormData] = useState({
    name: '',
    api_key: '',
  });
  const [loading, setLoading] = useState(false);

  const providers_info = [
    { 
      name: 'openai', 
      label: 'OpenAI', 
      description: 'GPT-4, GPT-3.5-turbo, and more',
      icon: '🤖',
      color: 'bg-blue-500/10 border-blue-500/20',
      textColor: 'text-blue-400'
    },
    { 
      name: 'groq', 
      label: 'Groq', 
      description: 'Llama2, Mixtral, and other open-source models',
      icon: '⚡',
      color: 'bg-purple-500/10 border-purple-500/20',
      textColor: 'text-purple-400'
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.api_key) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      
      // Check if provider already has an API key
      const existingProvider = providers.find(p => p.name === formData.name && p.is_active);
      
      if (existingProvider) {
        // Update existing API key
        await updateApiKey(formData.name, formData.api_key);
      } else {
        // Add new API key
        await onAdd(formData);
      }
      
      setFormData({ name: '', api_key: '' });
      onClose();
    } catch (error) {
      // Error is already handled in the context
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = (providerName) => {
    setFormData(prev => ({ ...prev, name: providerName }));
  };

  const selectedProvider = providers_info.find(p => p.name === formData.name);
  const existingProvider = providers.find(p => p.name === formData.name && p.is_active);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-slate-900 rounded-xl shadow-lg border border-slate-700">
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <Dialog.Title className="text-lg font-semibold text-white">
              {existingProvider ? 'Update API Key' : 'Add API Key'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">
                Select Provider
              </label>
              <div className="space-y-2">
                {providers_info.map((provider) => {
                  const isConfigured = providers.find(p => p.name === provider.name && p.is_active);
                  return (
                    <button
                      key={provider.name}
                      type="button"
                      onClick={() => handleProviderSelect(provider.name)}
                      className={`w-full p-4 text-left border rounded-lg transition-all duration-200 ${
                        formData.name === provider.name
                          ? `${provider.color} border-2`
                          : 'border-slate-600 hover:border-slate-500 bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{provider.icon}</span>
                          <div>
                            <h3 className="font-medium text-white">{provider.label}</h3>
                            <p className="text-sm text-slate-400">{provider.description}</p>
                            {isConfigured && (
                              <p className="text-xs text-emerald-400 mt-1">✓ API key configured</p>
                            )}
                          </div>
                        </div>
                        {formData.name === provider.name && (
                          <div className={`w-5 h-5 ${provider.textColor} rounded-full flex items-center justify-center bg-slate-800`}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <label htmlFor="api_key" className="block text-sm font-medium text-slate-200 mb-2">
                API Key
              </label>
              <input
                type="password"
                id="api_key"
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your API key"
                required
              />
              <p className="mt-1 text-xs text-slate-400">
                Your API key is encrypted and stored securely. Never shared with third parties.
              </p>
            </div>

            {/* Provider Info */}
            {selectedProvider && (
              <div className={`p-3 rounded-lg ${selectedProvider.color}`}>
                <div className="flex items-center">
                  <span className="text-lg mr-2">{selectedProvider.icon}</span>
                  <div>
                    <h4 className="text-sm font-medium text-white">{selectedProvider.label}</h4>
                    <p className="text-xs text-slate-300">{selectedProvider.description}</p>
                    {existingProvider && (
                      <p className="text-xs text-emerald-300 mt-1">This will update your existing API key</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !formData.name || !formData.api_key}
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {existingProvider ? 'Updating...' : 'Adding...'}
                  </div>
                ) : (
                  existingProvider ? 'Update API Key' : 'Add API Key'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AddProviderModal;
