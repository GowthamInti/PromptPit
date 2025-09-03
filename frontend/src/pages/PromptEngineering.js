import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  FolderIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LockClosedIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { usePrompts } from '../contexts/PromptContext';
import toast from 'react-hot-toast';

const PromptEngineering = () => {
  const { 
    prompts, 
    loading, 
    fetchPrompts,
    deletePrompt,
    duplicatePrompt,
    deletePromptVersion
  } = usePrompts();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [expandedPrompts, setExpandedPrompts] = useState(new Set());
  const [exportingPromptId, setExportingPromptId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleDeletePrompt = async (promptId, promptTitle) => {
    if (window.confirm(`Are you sure you want to delete "${promptTitle}"? This action cannot be undone.`)) {
      try {
        await deletePrompt(promptId);
        toast.success('Prompt deleted successfully!');
      } catch (error) {
        console.error('Error deleting prompt:', error);
      }
    }
  };

  const handleDuplicatePrompt = async (promptId) => {
    try {
      await duplicatePrompt(promptId);
      toast.success('Prompt duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating prompt:', error);
    }
  };

  const togglePromptExpansion = (promptId) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(promptId)) {
      newExpanded.delete(promptId);
    } else {
      newExpanded.add(promptId);
    }
    setExpandedPrompts(newExpanded);
  };

  const handleDeleteVersion = async (promptId, versionId) => {
    if (window.confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      try {
        await deletePromptVersion(promptId, versionId);
        toast.success('Version deleted successfully!');
        // Refresh the prompts to update the version count
        await fetchPrompts();
      } catch (error) {
        console.error('Error deleting version:', error);
      }
    }
  };



  // Individual prompt export function
  const handleExportPrompt = async (promptId, promptTitle) => {
    try {
      setExportingPromptId(promptId);
      
      // Export with all versions and outputs
      const response = await apiService.exportPrompt(promptId, 'json', true, true);
      
      // Create and download the file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${promptTitle.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Prompt exported successfully!');
    } catch (error) {
      console.error('Error exporting prompt:', error);
      toast.error('Failed to export prompt');
    } finally {
      setExportingPromptId(null);
    }
  };

  // Individual prompt import function
  const handleImportPrompt = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON prompt export file');
      return;
    }
    
    try {
      setIsImporting(true);
      
      const response = await apiService.importPrompt(file);
      
      const message = response.data.was_copied 
        ? `Prompt imported successfully as "${response.data.prompt_title}" (auto-copied due to duplicate title) with ${response.data.versions_imported} versions.`
        : `Prompt imported successfully! ${response.data.prompt_title} with ${response.data.versions_imported} versions.`;
      
      toast.success(message);
      
      // Refresh the prompts list
      await fetchPrompts();
      
      // Clear the file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Error importing prompt:', error);
      toast.error('Failed to import prompt');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = prompt.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.text?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvider = !filterProvider || prompt.provider_name === filterProvider;
    return matchesSearch && matchesProvider;
  });

  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      case 'created_at':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'updated_at':
        return new Date(b.updated_at) - new Date(a.updated_at);
      default:
        return 0;
    }
  });

  const providers = [...new Set(prompts.map(p => p.provider_name).filter(Boolean))];

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-black">
        <div className="p-6 border-b border-slate-700/50 bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Prompt Engineering</h1>
              <p className="text-sm text-slate-400">Create, manage, and version your prompts with full history tracking.</p>
            </div>
            <Link
              to="/editor/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              New Prompt
            </Link>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Prompt Engineering</h1>
            <p className="text-sm text-slate-400">Create, manage, and version your prompts with full history tracking.</p>
          </div>
          <Link
            to="/editor/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New Prompt
          </Link>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-900">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Providers</option>
              {providers.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created_at">Created Date</option>
              <option value="updated_at">Updated Date</option>
              <option value="title">Title</option>
            </select>
            
            {/* Individual Prompt Import Button */}
            <label className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center space-x-2 cursor-pointer">
              <DocumentArrowUpIcon className="h-4 w-4" />
              <span>{isImporting ? 'Importing...' : 'Import Prompt'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportPrompt}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {sortedPrompts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FolderIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-2 text-sm font-medium text-slate-400">No prompts found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {searchTerm || filterProvider 
                  ? 'Try adjusting your search or filters.' 
                  : 'Create your first prompt to get started.'}
              </p>
              {!searchTerm && !filterProvider && (
                <div className="mt-6">
                  <Link
                    to="/editor/new"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create First Prompt
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPrompts.map((prompt) => (
              <div key={prompt.id} className="bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200">
                {/* Main Prompt Card */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => togglePromptExpansion(prompt.id)}
                          className="text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          {expandedPrompts.has(prompt.id) ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </button>
                        <h3 className="text-lg font-semibold text-white">
                          {prompt.title || 'Untitled Prompt'}
                        </h3>
                        {prompt.versions_count > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {prompt.versions_count} version{prompt.versions_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        {prompt.provider_name} • {prompt.model_name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-slate-300 line-clamp-3">
                      {prompt.text?.substring(0, 120)}
                      {prompt.text?.length > 120 && '...'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                    <span>
                      Created {new Date(prompt.created_at).toLocaleDateString()}
                    </span>
                    {prompt.last_output && (
                      <span className="text-emerald-400">✓ Has output</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/editor/${prompt.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex-1 text-center text-sm"
                    >
                      Open Prompt
                    </Link>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => handleExportPrompt(prompt.id, prompt.title)}
                        disabled={exportingPromptId === prompt.id}
                        className="p-2 text-slate-400 hover:text-green-400 transition-colors disabled:opacity-50"
                        title="Export prompt with versions"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicatePrompt(prompt.id)}
                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Duplicate prompt"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(prompt.id, prompt.title)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete prompt"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Versions Section */}
                {expandedPrompts.has(prompt.id) && prompt.versions && prompt.versions.length > 0 && (
                  <div className="border-t border-slate-700 bg-slate-750">
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">Locked Versions</h4>
                      <div className="space-y-3">
                        {prompt.versions.map((version) => (
                          <div key={version.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <LockClosedIcon className="h-4 w-4 text-blue-400" />
                                <span className="text-sm font-medium text-white">
                                  Version {version.version_number}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(version.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400">
                                by {version.locked_by_user}
                              </span>
                            </div>
                            
                            <div className="mb-3">
                              <p className="text-sm text-slate-300 line-clamp-2">
                                {version.prompt_text?.substring(0, 100)}
                                {version.prompt_text?.length > 100 && '...'}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center space-x-4">
                                {version.files && version.files.length > 0 && (
                                  <span className="text-blue-400">
                                    📎 {version.files.length} file{version.files.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {version.images && version.images.length > 0 && (
                                  <span className="text-green-400">
                                    🖼️ {version.images.length} image{version.images.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {version.output && (
                                <span className="text-emerald-400">✓ Has output</span>
                              )}
                            </div>
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={() => handleDeleteVersion(prompt.id, version.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                                title="Delete version"
                              >
                                Delete Version
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptEngineering;
