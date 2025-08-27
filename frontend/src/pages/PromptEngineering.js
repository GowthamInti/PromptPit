import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  FolderIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { usePrompts } from '../contexts/PromptContext';
import toast from 'react-hot-toast';

const PromptEngineering = () => {
  const { 
    prompts, 
    loading, 
    fetchPrompts,
    deletePrompt,
    duplicatePrompt
  } = usePrompts();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

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
      <div className="space-y-6 animate-fade-in">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="heading-lg text-gradient">Prompt Engineering</h1>
            <p className="mt-2 body-lg text-secondary">
              Create, manage, and version your prompts with full history tracking.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-lg text-gradient">Prompt Engineering</h1>
          <p className="mt-2 body-lg text-secondary">
            Create, manage, and version your prompts with full history tracking.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/editor/new"
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New Prompt
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="input-field"
            >
              <option value="">All Providers</option>
              {providers.map(provider => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              <option value="created_at">Newest First</option>
              <option value="updated_at">Recently Updated</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prompts Grid */}
      {sortedPrompts.length === 0 ? (
        <div className="card text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-muted" />
          <h3 className="mt-2 text-sm font-medium text-secondary">No prompts found</h3>
          <p className="mt-1 text-sm text-muted">
            {searchTerm || filterProvider 
              ? 'Try adjusting your search or filters.' 
              : 'Create your first prompt to get started.'}
          </p>
          {!searchTerm && !filterProvider && (
            <div className="mt-6">
              <Link
                to="/editor/new"
                className="btn-primary inline-flex items-center"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Create First Prompt
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPrompts.map((prompt) => (
            <div key={prompt.id} className="card group hover:shadow-lg transition-all duration-200 border border-slate-700 hover:border-slate-600">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary truncate group-hover:text-accent transition-colors">
                    {prompt.title || 'Untitled Prompt'}
                  </h3>
                  <p className="text-sm text-muted mt-1">
                    {prompt.provider_name} • {prompt.model_name}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-secondary line-clamp-3">
                  {prompt.text?.substring(0, 120)}
                  {prompt.text?.length > 120 && '...'}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted mb-4">
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
                  className="btn-primary flex-1 text-center py-2 text-sm"
                >
                  Open Prompt
                </Link>
                
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleDuplicatePrompt(prompt.id)}
                    className="p-2 text-slate-400 hover:text-accent transition-colors"
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
          ))}
        </div>
      )}
    </div>
  );
};

export default PromptEngineering;
