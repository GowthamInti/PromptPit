import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusIcon, 
  DocumentIcon, 
  PhotoIcon, 
  TrashIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  CloudArrowUpIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  PaperClipIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { useProviders } from '../contexts/ProviderContext';
import toast from 'react-hot-toast';

const KnowledgeBase = () => {
  const { providers, models, selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = useProviders();
  
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKB, setSelectedKB] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKB, setNewKB] = useState({ name: '', description: '' });
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [expandedKBs, setExpandedKBs] = useState(new Set());
  
  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  
  // Text input states
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  
  // Processing states
  const [summaries, setSummaries] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  
  // Summary editing states
  const [editedSummaries, setEditedSummaries] = useState({});
  
  // Content viewing states
  const [showContentViewer, setShowContentViewer] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [contentDetails, setContentDetails] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  
  // Always use ChromaDB for content

  // Fetch knowledge bases on component mount
  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  // Fetch contents when a knowledge base is selected
  useEffect(() => {
    if (selectedKB) {
      fetchContents(selectedKB.id);
    }
  }, [selectedKB]);

  const fetchKnowledgeBases = async () => {
    try {
      setLoading(true);
      const response = await apiService.getKnowledgeBases();
      setKnowledgeBases(response.data.knowledge_bases);
    } catch (error) {
      console.error('Error fetching knowledge bases:', error);
      toast.error('Failed to fetch knowledge bases');
    } finally {
      setLoading(false);
    }
  };

  const fetchContents = async (kbId) => {
    try {
      // Always use ChromaDB for real-time content
      const response = await apiService.getKnowledgeBaseContents(kbId);
      setContents(response.data.contents);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast.error('Failed to fetch contents');
    }
  };

  const createKnowledgeBase = async () => {
    try {
      const knowledgeBaseData = {
        ...newKB,
        user_id: "default_user"  // Add the required user_id field
      };
      const response = await apiService.createKnowledgeBase(knowledgeBaseData);
      setKnowledgeBases([...knowledgeBases, response.data]);
      setShowCreateModal(false);
      setNewKB({ name: '', description: '' });
      toast.success('Knowledge base created successfully!');
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      toast.error('Failed to create knowledge base');
    }
  };

  const deleteKnowledgeBase = async (kbId) => {
    if (!window.confirm('Are you sure you want to delete this knowledge base? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteKnowledgeBase(kbId);
      setKnowledgeBases(knowledgeBases.filter(kb => kb.id !== kbId));
      if (selectedKB && selectedKB.id === kbId) {
        setSelectedKB(null);
        setContents([]);
      }
      toast.success('Knowledge base deleted successfully!');
    } catch (error) {
      console.error('Error deleting knowledge base:', error);
      toast.error('Failed to delete knowledge base');
    }
  };

  const toggleKBExpansion = (kbId) => {
    const newExpanded = new Set(expandedKBs);
    if (newExpanded.has(kbId)) {
      newExpanded.delete(kbId);
    } else {
      newExpanded.add(kbId);
    }
    setExpandedKBs(newExpanded);
  };


  const handleFileInput = (event, type) => {
    const files = Array.from(event.target.files);
    if (type === 'files') {
      setUploadedFiles(prev => [...prev, ...files]);
    } else {
      setUploadedImages(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index, type) => {
    if (type === 'files') {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setUploadedImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const extractAndSummarize = async () => {
    if (!selectedProvider || !selectedModel) {
      toast.error('Please select a provider and model first');
      return;
    }

    if (uploadedFiles.length === 0 && uploadedImages.length === 0 && !textInput.trim()) {
      toast.error('Please upload files or enter text first');
      return;
    }

    try {
      setProcessing(true);
      setProcessingStep('Processing content with LLM...');
      
      // Prepare all content for single LLM call
      const allContent = [];
      const contentNames = [];
      
      // Add files
      uploadedFiles.forEach(file => {
        allContent.push(file);
        contentNames.push(file.name);
      });
      
      // Add images
      uploadedImages.forEach(image => {
        allContent.push(image);
        contentNames.push(image.name);
      });
      
      // Add text input
      if (textInput.trim()) {
        allContent.push({ type: 'text', content: textInput, name: textTitle || 'Custom Text' });
        contentNames.push(textTitle || 'Custom Text');
      }
      
      // Create single prompt for all content
      const promptText = userPrompt.trim() || `Please provide a comprehensive summary of all the following content. Since you're processing multiple items together, create a unified summary that captures the key information from all sources and shows how they relate to each other. Focus on key points that would be useful for knowledge retrieval and search purposes.`;
      
      const requestData = {
        provider_id: selectedProvider.id,
        model_id: selectedModel.id,
        text: promptText,
        system_prompt: 'You are a helpful assistant that creates concise, informative summaries.',
        files: uploadedFiles,
        images: uploadedImages
      };
      
      // If there's text input, append it to the prompt
      if (textInput.trim()) {
        requestData.text += `\n\nText to summarize:\n${textInput}`;
      }
      
      console.log('Processing all content with single LLM call:', requestData);
      
      // Single LLM call for all content
      const response = await apiService.runLLMWithFiles(requestData);
      
      // Parse the response to extract individual summaries
      const outputText = response.data.output_text;
      
      // Split the response into individual summaries (assuming the LLM provides separate summaries)
      // For now, we'll use the full response for each content item
      const summaries = Array(allContent.length).fill(outputText);
      
      setSummaries(summaries);
      setShowReview(true);
      setProcessingStep('');
      
    } catch (error) {
      console.error('Error processing content:', error);
      toast.error('Failed to process content');
      setProcessingStep('');
    } finally {
      setProcessing(false);
    }
  };

  const addToKnowledgeBase = async () => {
    if (!selectedKB) return;

    try {
      setProcessingStep('Adding content to knowledge base...');
      
      // Get the unified summary
      const finalSummary = editedSummaries[0] !== undefined ? editedSummaries[0] : summaries[0];
      
      // Create a simplified content object with the processed information
      const contentData = {
        provider_id: selectedProvider.id,
        model_id: selectedModel.id,
        summary: finalSummary
      };
      
      // Single API call to add all content with summaries
      const response = await apiService.addContentToKnowledgeBase(contentData, selectedKB.id);
      
      toast.success(response.data.message);
      
      // Reset states
      setUploadedFiles([]);
      setUploadedImages([]);
      setTextInput('');
      setTextTitle('');
      setUserPrompt('');
      setSummaries([]);
      setEditedSummaries({});
      setShowReview(false);
      setProcessingStep('');
      
      // Refresh the knowledge base contents
      fetchContents(selectedKB.id);
      
    } catch (error) {
      console.error('Error adding content to knowledge base:', error);
      toast.error('Failed to add content to knowledge base');
      setProcessingStep('');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'image':
        return <PhotoIcon className="h-5 w-5" />;
      case 'text':
        return <DocumentDuplicateIcon className="h-5 w-5" />;
      case 'unified':
        return <FolderIcon className="h-5 w-5 text-purple-400" />;
      default:
        return <DocumentIcon className="h-5 w-5" />;
    }
  };



  const viewContent = async (content) => {
    try {
      setLoadingContent(true);
      setSelectedContent(content);
      setShowContentViewer(true);
      
      // Fetch full content details
      const response = await apiService.getKnowledgeBaseContent(content.knowledge_base_id, content.id);
      console.log('Content API response:', response.data);
      
      // The backend returns content in response.data.content
      if (response.data && response.data.content) {
        setContentDetails(response.data.content);
      } else {
        console.error('Unexpected API response structure:', response.data);
        toast.error('Invalid content data received');
        setShowContentViewer(false);
      }
    } catch (error) {
      console.error('Error fetching content details:', error);
      toast.error('Failed to load content details');
      setShowContentViewer(false);
    } finally {
      setLoadingContent(false);
    }
  };

  const deleteContent = async (contentId, contentName) => {
    if (!window.confirm(`Are you sure you want to delete "${contentName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteKnowledgeBaseContent(selectedKB.id, contentId);
      toast.success('Content deleted successfully!');
      
      // Refresh the contents list
      fetchContents(selectedKB.id);
      
      // Close content viewer if the deleted content was being viewed
      if (selectedContent && selectedContent.id === contentId) {
        setShowContentViewer(false);
        setSelectedContent(null);
        setContentDetails(null);
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const filteredKnowledgeBases = knowledgeBases.filter(kb => {
    const matchesSearch = kb.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kb.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || kb.content_count > 0;
    return matchesSearch && matchesType;
  });

  const sortedKnowledgeBases = [...filteredKnowledgeBases].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'created_at':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'updated_at':
        return new Date(b.updated_at) - new Date(a.updated_at);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-black">
        <div className="p-6 border-b border-slate-700/50 bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Stash</h1>
              <p className="text-sm text-slate-400">Create and manage document collections with vector search.</p>
            </div>
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
            <h1 className="text-xl font-bold text-white">Stash</h1>
            <p className="text-sm text-slate-400">Create and manage document collections with vector search.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New Stash
          </button>
        </div>
      </div>

      {/* Provider/Model Selection */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Cog6ToothIcon className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">Processing Model:</span>
            </div>
            
            <select
              value={selectedProvider?.id || ''}
              onChange={(e) => {
                const provider = providers.find(p => p.id === parseInt(e.target.value));
                setSelectedProvider(provider);
                setSelectedModel(null);
              }}
              className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-blue-500"
            >
              <option value="">Select Provider</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            
            <select
              value={selectedModel?.id || ''}
              onChange={(e) => {
                const model = models.find(m => m.id === parseInt(e.target.value));
                setSelectedModel(model);
              }}
              className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-blue-500"
              disabled={!selectedProvider}
            >
              <option value="">Select Model</option>
              {models
                .filter(model => !selectedProvider || model.provider_id === selectedProvider.id)
                .map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
            </select>
          </div>
          
          {/* ChromaDB Status */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
              ChromaDB Live
            </span>
            <span className="text-xs text-slate-400">
              Real-time vector storage
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-900">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search stash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="with_content">With Content</option>
              <option value="empty">Empty</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="created_at">Newest First</option>
              <option value="updated_at">Recently Updated</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Knowledge Base Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {sortedKnowledgeBases.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FolderIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-2 text-sm font-medium text-slate-400">No stash found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {searchTerm || filterType 
                  ? 'Try adjusting your search or filters.' 
                  : 'Create your first stash to get started.'}
              </p>
              {!searchTerm && !filterType && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create First Stash
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedKnowledgeBases.map((kb) => (
              <div key={kb.id} className={`bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200 ${
                expandedKBs.has(kb.id) ? 'lg:col-span-2' : ''
              }`}>
                {/* Main Knowledge Base Card */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleKBExpansion(kb.id)}
                          className="text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          {expandedKBs.has(kb.id) ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </button>
                        <h3 className="text-lg font-semibold text-white">
                          {kb.name || 'Untitled Stash'}
                        </h3>
                        {kb.content_count > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {kb.content_count} document{kb.content_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {kb.description && (
                        <p className="text-sm text-slate-400 mt-1">
                          {kb.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                    <span>
                      Created {new Date(kb.created_at).toLocaleDateString()}
                    </span>
                    {kb.content_count > 0 && (
                      <span className="text-emerald-400">✓ Has content</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedKB(kb);
                        setShowFileUpload(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex-1 text-center text-sm"
                    >
                      Add Content
                    </button>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => {
                          setSelectedKB(kb);
                          if (!expandedKBs.has(kb.id)) {
                            toggleKBExpansion(kb.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="View stash contents"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteKnowledgeBase(kb.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete stash"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Section - Expanded View */}
                {expandedKBs.has(kb.id) && (
                  <div className="border-t border-slate-700 bg-slate-750">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-slate-200">Contents</h4>
                        <button
                          onClick={() => {
                            setSelectedKB(kb);
                            setShowFileUpload(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          <PlusIcon className="h-4 w-4 inline mr-1" />
                          Add More
                        </button>
                      </div>
                      
                      {kb.content_count === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <DocumentIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg mb-2">No documents uploaded yet</p>
                          <p className="text-sm mb-4">Upload files to start building your stash</p>
                          <button
                            onClick={() => {
                              setSelectedKB(kb);
                              setShowFileUpload(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <CloudArrowUpIcon className="h-4 w-4 inline mr-2" />
                            Upload Files
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {contents.map((content) => (
                            <div key={content.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  {getContentTypeIcon(content.content_type)}
                                  <span className="text-sm font-medium text-white">
                                    {content.original_filename}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(content.processing_status)}
                                  <span className="text-xs capitalize bg-slate-600 px-2 py-1 rounded">
                                    {content.processing_status}
                                  </span>
                                </div>
                              </div>
                              
                              {content.summary && (
                                <div className="mb-3">
                                  <p className="text-sm text-slate-300 leading-relaxed">
                                    {content.summary}
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <div className="flex items-center space-x-4">
                                  <span className="bg-slate-600 px-2 py-1 rounded">{content.content_type}</span>
                                  {content.file_size && (
                                    <span>{(content.file_size / 1024).toFixed(1)} KB</span>
                                  )}
                                  <span>{new Date(content.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => viewContent(content)}
                                    className="text-slate-400 hover:text-blue-400 transition-colors p-1"
                                    title="View full content"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteContent(content.id, content.original_filename)}
                                    className="text-slate-400 hover:text-red-400 transition-colors p-1"
                                    title="Delete content"
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Upload Modal */}
      {showFileUpload && selectedKB && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Content to "{selectedKB.name}"</h3>
              <button
                                 onClick={() => {
                   setShowFileUpload(false);
                   setUploadedFiles([]);
                   setUploadedImages([]);
                   setUserPrompt('');
                 }}
                className="text-slate-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* User Prompt Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Processing Instructions (Optional)</label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Enter custom instructions for processing your files (e.g., 'Focus on medical terminology', 'Extract key business insights', etc.)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                rows={3}
              />
              <p className="text-xs text-slate-400 mt-1">
                Leave empty to use default processing instructions
              </p>
            </div>

            {/* Unified Content Input Section */}
            <div className="space-y-6 mb-6">
              {/* Text Content */}
              <div>
                <label className="block text-sm font-medium mb-2">Content Title (Optional)</label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Enter a title for this content"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Text Content</label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter your text content here..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  rows={6}
                />
              </div>

              {/* File Upload Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Documents</label>
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.docx,.doc,.txt,.md"
                      onChange={(e) => handleFileInput(e, 'files')}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-800 hover:bg-slate-750 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
                    >
                      <PaperClipIcon className="h-4 w-4" />
                      Select Files
                    </button>
                    <p className="text-sm text-slate-400 mt-2">PDF, DOCX, DOC, TXT, MD</p>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Images</label>
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center">
                    <input
                      ref={imageInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileInput(e, 'images')}
                      className="hidden"
                    />
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="bg-slate-800 hover:bg-slate-750 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
                    >
                      <PhotoIcon className="h-4 w-4" />
                      Select Images
                    </button>
                    <p className="text-sm text-slate-400 mt-2">JPG, PNG, GIF, BMP</p>
                  </div>
                </div>
              </div>
            </div>

                  {/* Uploaded Files Preview */}
                  {(uploadedFiles.length > 0 || uploadedImages.length > 0) && (
                    <div className="space-y-4 mb-6">
                      {uploadedFiles.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Documents ({uploadedFiles.length})</h4>
                          <div className="space-y-2">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-slate-800 rounded p-2">
                                <span className="text-sm text-white">{file.name}</span>
                                <button
                                  onClick={() => removeFile(index, 'files')}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {uploadedImages.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Images ({uploadedImages.length})</h4>
                          <div className="space-y-2">
                            {uploadedImages.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-slate-800 rounded p-2">
                                <span className="text-sm text-white">{file.name}</span>
                                <button
                                  onClick={() => removeFile(index, 'images')}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowFileUpload(false);
                        setUploadedFiles([]);
                        setUploadedImages([]);
                        setTextInput('');
                        setTextTitle('');
                        setUserPrompt('');
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-750 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={extractAndSummarize}
                      disabled={!selectedProvider || !selectedModel || 
                        (uploadedFiles.length === 0 && uploadedImages.length === 0 && !textInput.trim()) || processing}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          {processingStep}
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4" />
                          Extract & Summarize
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
      
      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Review Content Before Adding</h3>
              <button
                onClick={() => setShowReview(false)}
                className="text-slate-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Unified Summary Section */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h4 className="text-sm font-medium mb-2 text-white">Content Summary</h4>
                <p className="text-xs text-slate-400 mb-3">
                  {uploadedFiles.length > 0 && `${uploadedFiles.length} document${uploadedFiles.length !== 1 ? 's' : ''}`}
                  {uploadedFiles.length > 0 && uploadedImages.length > 0 && ' and '}
                  {uploadedImages.length > 0 && `${uploadedImages.length} image${uploadedImages.length !== 1 ? 's' : ''}`}
                  {textInput.trim() && (uploadedFiles.length > 0 || uploadedImages.length > 0) && ' and '}
                  {textInput.trim() && 'custom text'}
                  {' processed together'}
                </p>
                
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-slate-400 mb-1">Generated Summary:</h5>
                  <textarea
                    value={editedSummaries[0] !== undefined ? editedSummaries[0] : summaries[0] || ''}
                    onChange={(e) => setEditedSummaries(prev => ({ ...prev, 0: e.target.value }))}
                    className="w-full bg-slate-900 rounded p-3 text-sm text-slate-300 border border-slate-700 focus:border-blue-500 focus:outline-none"
                    rows={6}
                    placeholder="Edit the summary if needed..."
                  />
                </div>
              </div>

              {/* Content List Section */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h4 className="text-sm font-medium mb-3 text-white">Content Items</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Note: Files and images will be processed by the LLM to generate the summary, but will not be saved to disk.
                </p>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={`file-${index}`} className="flex items-center space-x-2 text-sm text-slate-300">
                      <DocumentIcon className="h-4 w-4 text-blue-400" />
                      <span>{file.name}</span>
                      <span className="text-slate-500">(Document - Processed only)</span>
                    </div>
                  ))}
                  {uploadedImages.map((image, index) => (
                    <div key={`image-${index}`} className="flex items-center space-x-2 text-sm text-slate-300">
                      <PhotoIcon className="h-4 w-4 text-green-400" />
                      <span>{image.name}</span>
                      <span className="text-slate-500">(Image - Processed only)</span>
                    </div>
                  ))}
                  {textInput.trim() && (
                    <div className="flex items-center space-x-3 text-sm text-slate-300">
                      <DocumentDuplicateIcon className="h-4 w-4 text-purple-400" />
                      <span>{textTitle || 'Custom Text'}</span>
                      <span className="text-slate-500">(Text - Saved)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReview(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Edit
              </button>
              <button
                onClick={addToKnowledgeBase}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    {processingStep}
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    Add to Stash
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Knowledge Base Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Stash</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newKB.name}
                  onChange={(e) => setNewKB({ ...newKB, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter stash name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={newKB.description}
                  onChange={(e) => setNewKB({ ...newKB, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createKnowledgeBase}
                disabled={!newKB.name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Viewer Modal */}
      {showContentViewer && selectedContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getContentTypeIcon(selectedContent.content_type)}
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedContent.original_filename}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <span className="bg-slate-600 px-2 py-1 rounded text-xs">
                      {selectedContent.content_type}
                    </span>
                    {getStatusIcon(selectedContent.processing_status)}
                    <span className="capitalize">{selectedContent.processing_status}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowContentViewer(false);
                  setSelectedContent(null);
                  setContentDetails(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {loadingContent ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-400">Loading content...</span>
              </div>
            ) : contentDetails ? (
              <div className="space-y-6">
                {/* Summary Section */}
                {contentDetails.summary && (
                  <div>
                    <h4 className="text-md font-medium text-slate-200 mb-2">Summary</h4>
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <p className="text-slate-300 leading-relaxed">
                        {contentDetails.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Unified Content Details Section */}
                {selectedContent.content_type === 'unified' && contentDetails.content_metadata && (
                  <div>
                    <h4 className="text-md font-medium text-slate-200 mb-2">Content Items</h4>
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      {contentDetails.content_metadata.note && (
                        <div className="mb-3 p-2 bg-slate-700 rounded text-xs text-slate-300">
                          ℹ️ {contentDetails.content_metadata.note}
                        </div>
                      )}
                      {contentDetails.content_metadata.files && contentDetails.content_metadata.files.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-slate-300 mb-2">Files & Images:</h5>
                          <div className="space-y-2">
                            {contentDetails.content_metadata.files.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-slate-700 rounded p-2">
                                <div className="flex items-center space-x-2">
                                  {file.mime_type.startsWith('image/') ? (
                                    <PhotoIcon className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <DocumentIcon className="h-4 w-4 text-blue-400" />
                                  )}
                                  <span className="text-sm text-slate-300">{file.original_name}</span>
                                  <span className="text-xs text-slate-500">({file.type})</span>
                                </div>
                                <span className="text-xs text-slate-500">
                                  {file.saved_path ? `${(file.size / 1024).toFixed(1)} KB` : "Not saved"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {contentDetails.content_metadata.text_content && (
                        <div>
                          <h5 className="text-sm font-medium text-slate-300 mb-2">Text Content:</h5>
                          <div className="bg-slate-700 rounded p-2">
                            <div className="text-sm text-slate-300">
                              <strong>Title:</strong> {contentDetails.content_metadata.text_content.title || 'Untitled'}
                            </div>
                            {contentDetails.content_metadata.text_content.description && (
                              <div className="text-sm text-slate-400 mt-1">
                                {contentDetails.content_metadata.text_content.description}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full Content Section */}
                {contentDetails.extracted_text ? (
                  <div>
                    <h4 className="text-md font-medium text-slate-200 mb-2">Full Content</h4>
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 max-h-96 overflow-y-auto">
                      <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                        {contentDetails.extracted_text}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <DocumentIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No extracted content available</p>
                    <p className="text-sm">
                      {selectedContent.processing_status === 'pending' 
                        ? 'Content is still being processed'
                        : selectedContent.processing_status === 'failed'
                        ? 'Content processing failed'
                        : 'No text content could be extracted from this file'
                      }
                    </p>
                  </div>
                )}

                {/* Metadata Section */}
                <div>
                  <h4 className="text-md font-medium text-slate-200 mb-2">Details</h4>
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">File Size:</span>
                        <span className="text-slate-300 ml-2">
                          {contentDetails.file_size 
                            ? `${(contentDetails.file_size / 1024).toFixed(1)} KB`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Content Type:</span>
                        <span className="text-slate-300 ml-2 capitalize">
                          {contentDetails.content_type}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">MIME Type:</span>
                        <span className="text-slate-300 ml-2">
                          {contentDetails.mime_type || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Status:</span>
                        <span className="text-slate-300 ml-2 capitalize">
                          {contentDetails.processing_status}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Created:</span>
                        <span className="text-slate-300 ml-2">
                          {new Date(contentDetails.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Updated:</span>
                        <span className="text-slate-300 ml-2">
                          {new Date(contentDetails.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {contentDetails.processing_error && (
                      <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded">
                        <span className="text-red-400 font-medium">Processing Error:</span>
                        <p className="text-red-300 mt-1 text-sm">
                          {contentDetails.processing_error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <XCircleIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Failed to load content</p>
                <p className="text-sm">Please try again later</p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => deleteContent(selectedContent.id, selectedContent.original_filename)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => {
                  setShowContentViewer(false);
                  setSelectedContent(null);
                  setContentDetails(null);
                }}
                className="bg-slate-800 hover:bg-slate-750 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
