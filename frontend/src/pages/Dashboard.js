import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  ArrowRightIcon,
  SparklesIcon,
  TrashIcon,
  KeyIcon,
  EllipsisVerticalIcon,
  EyeSlashIcon,
  ChatBubbleLeftRightIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { useProviders } from '../contexts/ProviderContext';
import AddProviderModal from '../components/AddProviderModal';

const Dashboard = () => {
  const { providers, models, loading, addProvider, refreshModels, deactivateProvider, clearApiKey, permanentlyDeleteProvider } = useProviders();
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any dropdown
      const dropdowns = document.querySelectorAll('.dropdown-container');
      let clickedInside = false;
      
      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target)) {
          clickedInside = true;
        }
      });
      
      if (!clickedInside) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const quickActions = [
    {
      name: 'Create New Prompt',
      description: 'Start experimenting with a new prompt',
      href: '/editor',
      icon: SparklesIcon,
      color: 'bg-blue-500',
      iconColor: 'text-blue-400',
    },
    {
      name: 'Chat with AI',
      description: 'Start a conversation with memory',
      href: '/chat',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-green-500',
      iconColor: 'text-green-400',
    },
    {
      name: 'Knowledge Base',
      description: 'Manage and search your documents',
      href: '/knowledge-base',
      icon: DocumentIcon,
      color: 'bg-purple-500',
      iconColor: 'text-purple-400',
    },
  ];

  const handleRefreshModels = async (providerId) => {
    try {
      setRefreshing(true);
      await refreshModels(providerId);
    } catch (error) {
      console.error('Error refreshing models:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeactivateProvider = async (providerId, providerName) => {
    if (window.confirm(`Are you sure you want to deactivate ${providerName}? This will remove the API key and deactivate all associated models.`)) {
      try {
        await deactivateProvider(providerId);
      } catch (error) {
        console.error('Error deactivating provider:', error);
      }
    }
  };

  const handleClearApiKey = async (providerId, providerName) => {
    console.log('handleClearApiKey called:', { providerId, providerName });
    if (window.confirm(`Are you sure you want to clear the API key for ${providerName}? This will remove the key but keep the provider configured.`)) {
      try {
        console.log('Calling clearApiKey...');
        await clearApiKey(providerId);
        console.log('clearApiKey completed');
      } catch (error) {
        console.error('Error clearing API key:', error);
      }
    }
  };

  const handlePermanentlyDeleteProvider = async (providerId, providerName) => {
    if (window.confirm(`⚠️ WARNING: This will permanently delete ${providerName} and ALL associated data including prompts, outputs, and evaluations. This action cannot be undone. Are you absolutely sure?`)) {
      try {
        await permanentlyDeleteProvider(providerId);
      } catch (error) {
        console.error('Error permanently deleting provider:', error);
      }
    }
  };

  const handleUpdateApiKey = async (providerName) => {
    setShowAddProvider(true);
  };

  return (
    <div className="h-full p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-xl text-gradient mb-2">Dashboard</h1>
          <p className="body-lg text-secondary max-w-2xl">
            Welcome to your Prompt Optimization Playground. Configure your LLM providers and start experimenting.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddProvider(true)}
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Configure Providers
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card group hover:shadow-lg transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <SparklesIcon className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted">Active Providers</p>
              <p className="text-3xl font-bold text-primary">{providers.filter(p => p.is_active).length}</p>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <SparklesIcon className="h-8 w-8 text-purple-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted">Models</p>
              <p className="text-3xl font-bold text-primary">{models.length}</p>
            </div>
          </div>
        </div>


      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="heading-md text-primary mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="card hover:shadow-lg transition-all duration-200 group border border-slate-700 hover:border-slate-600"
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-xl ${action.color} shadow-lg`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-base font-semibold text-primary group-hover:text-accent transition-colors">
                    {action.name}
                  </h3>
                  <p className="text-sm text-muted mt-1">{action.description}</p>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </Link>
          ))}
        </div>
      </div>



      {/* Provider Management */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading-md text-primary">LLM Providers</h2>
          {providers.filter(p => p.is_active).length > 0 && (
            <button
              onClick={() => handleRefreshModels(providers[0].id)}
              disabled={refreshing}
              className="text-sm text-accent hover:text-blue-300 disabled:opacity-50 transition-colors"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Models'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="card">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* OpenAI Provider */}
            <div className="card group hover:shadow-lg transition-all duration-200 border border-slate-700 hover:border-slate-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <SparklesIcon className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-base font-semibold text-primary">
                      OpenAI
                    </h3>
                    <p className="text-sm text-muted">
                      GPT-4, GPT-3.5-turbo, and more
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {providers.find(p => p.name === 'openai' && p.is_active) ? (
                    <span className="status-badge success">Active</span>
                  ) : (
                    <span className="status-badge warning">Not Configured</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Status:</span>
                  <span className={providers.find(p => p.name === 'openai' && p.is_active) ? "text-emerald-400 font-medium" : "text-yellow-400 font-medium"}>
                    {providers.find(p => p.name === 'openai' && p.is_active) ? "Connected" : "No API Key"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Models:</span>
                  <span className="text-secondary">
                    {models.filter(m => m.provider_id === providers.find(p => p.name === 'openai')?.id).length} available
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Added:</span>
                  <span className="text-secondary">
                    {providers.find(p => p.name === 'openai') ? 
                      new Date(providers.find(p => p.name === 'openai').created_at).toLocaleDateString() : 
                      "Not configured"
                    }
                  </span>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                {providers.find(p => p.name === 'openai' && p.is_active) ? (
                  <>
                    <button
                      onClick={() => handleUpdateApiKey('openai')}
                      className="flex-1 btn-secondary text-sm py-2"
                    >
                      <KeyIcon className="mr-1 h-4 w-4" />
                      Update Key
                    </button>
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === 'openai' ? null : 'openai')}
                        className="btn-danger text-sm py-2 px-3"
                        title="More options"
                      >
                        <EllipsisVerticalIcon className="h-4 w-4" />
                      </button>
                      
                      {openDropdown === 'openai' && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                console.log('Clear API Key button clicked for OpenAI');
                                const openaiProvider = providers.find(p => p.name === 'openai');
                                console.log('OpenAI provider found:', openaiProvider);
                                if (openaiProvider) {
                                  handleClearApiKey(openaiProvider.id, 'OpenAI');
                                } else {
                                  console.error('OpenAI provider not found');
                                }
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 flex items-center"
                            >
                              <EyeSlashIcon className="mr-2 h-4 w-4" />
                              Clear API Key
                            </button>
                            <button
                              onClick={() => {
                                handleDeactivateProvider(providers.find(p => p.name === 'openai').id, 'OpenAI');
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 flex items-center"
                            >
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Deactivate
                            </button>
                            <hr className="border-slate-600 my-1" />
                            <button
                              onClick={() => {
                                handlePermanentlyDeleteProvider(providers.find(p => p.name === 'openai').id, 'OpenAI');
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center"
                            >
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Delete Permanently
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => handleUpdateApiKey('openai')}
                    className="flex-1 btn-primary text-sm py-2"
                  >
                    <KeyIcon className="mr-1 h-4 w-4" />
                    Add API Key
                  </button>
                )}
              </div>
            </div>

            {/* Groq Provider */}
            <div className="card group hover:shadow-lg transition-all duration-200 border border-slate-700 hover:border-slate-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <SparklesIcon className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-base font-semibold text-primary">
                      Groq
                    </h3>
                    <p className="text-sm text-muted">
                      Llama2, Mixtral, and other open-source models
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {providers.find(p => p.name === 'groq' && p.is_active) ? (
                    <span className="status-badge success">Active</span>
                  ) : (
                    <span className="status-badge warning">Not Configured</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Status:</span>
                  <span className={providers.find(p => p.name === 'groq' && p.is_active) ? "text-emerald-400 font-medium" : "text-yellow-400 font-medium"}>
                    {providers.find(p => p.name === 'groq' && p.is_active) ? "Connected" : "No API Key"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Models:</span>
                  <span className="text-secondary">
                    {models.filter(m => m.provider_id === providers.find(p => p.name === 'groq')?.id).length} available
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Added:</span>
                  <span className="text-secondary">
                    {providers.find(p => p.name === 'groq') ? 
                      new Date(providers.find(p => p.name === 'groq').created_at).toLocaleDateString() : 
                      "Not configured"
                    }
                  </span>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                {providers.find(p => p.name === 'groq' && p.is_active) ? (
                  <>
                    <button
                      onClick={() => handleUpdateApiKey('groq')}
                      className="flex-1 btn-secondary text-sm py-2"
                    >
                      <KeyIcon className="mr-1 h-4 w-4" />
                      Update Key
                    </button>
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === 'groq' ? null : 'groq')}
                        className="btn-danger text-sm py-2 px-3"
                        title="More options"
                      >
                        <EllipsisVerticalIcon className="h-4 w-4" />
                      </button>
                      
                      {openDropdown === 'groq' && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                console.log('Clear API Key button clicked for Groq');
                                const groqProvider = providers.find(p => p.name === 'groq');
                                console.log('Groq provider found:', groqProvider);
                                if (groqProvider) {
                                  handleClearApiKey(groqProvider.id, 'Groq');
                                } else {
                                  console.error('Groq provider not found');
                                }
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 flex items-center"
                            >
                              <EyeSlashIcon className="mr-2 h-4 w-4" />
                              Clear API Key
                            </button>
                            <button
                              onClick={() => {
                                handleDeactivateProvider(providers.find(p => p.name === 'groq').id, 'Groq');
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 flex items-center"
                            >
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Deactivate
                            </button>
                            <hr className="border-slate-600 my-1" />
                            <button
                              onClick={() => {
                                handlePermanentlyDeleteProvider(providers.find(p => p.name === 'groq').id, 'Groq');
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center"
                            >
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Delete Permanently
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => handleUpdateApiKey('groq')}
                    className="flex-1 btn-primary text-sm py-2"
                  >
                    <KeyIcon className="mr-1 h-4 w-4" />
                    Add API Key
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Provider Modal */}
      <AddProviderModal
        isOpen={showAddProvider}
        onClose={() => setShowAddProvider(false)}
        onAdd={addProvider}
      />
    </div>
  );
};

export default Dashboard;
