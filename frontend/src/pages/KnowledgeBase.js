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
  const [uploading, setUploading] = useState(false);
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
  const [showTextInput, setShowTextInput] = useState(false);
  
  // Processing states
  const [extractedTexts, setExtractedTexts] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [maxSummaryTokens, setMaxSummaryTokens] = useState(2000);
  
  // Summary editing states
  const [editingSummary, setEditingSummary] = useState(null);
  const [editedSummaries, setEditedSummaries] = useState({});
  
  // Content viewing states
  const [showContentViewer, setShowContentViewer] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [contentDetails, setContentDetails] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

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
      const response = await apiService.getKnowledgeBaseContents(kbId);
      setContents(response.data.contents);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast.error('Failed to fetch contents');
    }
  };

  const createKnowledgeBase = async () => {
    try {
      const response = await apiService.createKnowledgeBase(newKB);
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

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length || !selectedKB) return;

    try {
      setUploading(true);
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await apiService.uploadFilesToKnowledgeBase(selectedKB.id, formData);

      toast.success(response.data.message);
      fetchContents(selectedKB.id);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const processFiles = async () => {
    if (!selectedKB) return;

    try {
      setProcessing(true);
      const response = await apiService.processKnowledgeBaseFiles(selectedKB.id);
      toast.success(response.data.message);
      fetchContents(selectedKB.id);
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Failed to process files');
    } finally {
      setProcessing(false);
    }
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

    // Debug: Log the selected provider and model
    console.log('Selected provider:', selectedProvider);
    console.log('Selected model:', selectedModel);

    try {
      setProcessingStep('Processing content with LLM...');
      
      const summaries = [];
      const extractedTexts = [];
      
      // Process files
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const promptText = userPrompt.trim() || `Please provide a concise summary of the following document. Focus on key points that would be useful for retrieval:`;
        
        const requestData = {
          provider_id: selectedProvider.id,
          model_id: selectedModel.id,
          text: promptText,
          system_prompt: 'You are a helpful assistant that creates concise, informative summaries.',
          temperature: 0.3,
          max_tokens: 300,
          files: [file]
        };
        
        // Debug: Log what we're sending for files
        console.log('File processing - Request data:', requestData);
        
        const response = await apiService.runLLMWithFiles(requestData);
        
        summaries.push(response.data.output_text);
        extractedTexts.push(`Document: ${file.name} - Content extracted and processed`);
      }
      
      // Process images
      for (let i = 0; i < uploadedImages.length; i++) {
        const image = uploadedImages[i];
        const imagePromptText = userPrompt.trim() || `Please describe this image and provide key information that would be useful for retrieval:`;
        
        const requestData = {
          provider_id: selectedProvider.id,
          model_id: selectedModel.id,
          text: imagePromptText,
          system_prompt: 'You are a helpful assistant that creates concise, informative descriptions.',
          temperature: 0.3,
          max_tokens: 300,
          images: [image]
        };
        
        // Debug: Log what we're sending for images
        console.log('Image processing - Request data:', requestData);
        
        const response = await apiService.runLLMWithFiles(requestData);
        
        summaries.push(response.data.output_text);
        extractedTexts.push(`Image: ${image.name} - Content extracted and processed`);
      }
      
      // Process text input
      if (textInput.trim()) {
        const textPromptText = userPrompt.trim() || `Please provide a concise summary of the following text. Focus on key points that would be useful for retrieval:`;
        // Combine the prompt with the actual text content
        const combinedText = `${textPromptText}\n\nText to summarize:\n${textInput}`;
        
        const requestData = {
          provider_id: selectedProvider.id,
          model_id: selectedModel.id,
          text: combinedText,
          system_prompt: 'You are a helpful assistant that creates concise, informative summaries.',
          temperature: 0.3,
          max_tokens: 300
        };
        
        // Debug: Log what we're sending
        console.log('Text processing - Request data:', requestData);
        
        const response = await apiService.runLLMWithFiles(requestData);
        
        summaries.push(response.data.output_text);
        extractedTexts.push(`Text: ${textTitle || 'Custom Text'} - ${textInput.substring(0, 100)}...`);
      }
      
      setSummaries(summaries);
      setExtractedTexts(extractedTexts);
      setShowReview(true);
      setProcessingStep('');
      
    } catch (error) {
      console.error('Error processing content:', error);
      toast.error('Failed to process content');
      setProcessingStep('');
    }
  };

  const addToKnowledgeBase = async () => {
    if (!selectedKB) return;

    try {
      setProcessingStep('Adding to knowledge base...');
      
      const uploadedContents = [];
      
      // Upload files if any
      if (uploadedFiles.length > 0 || uploadedImages.length > 0) {
        const formData = new FormData();
        [...uploadedFiles, ...uploadedImages].forEach(file => {
          formData.append('files', file);
        });

        const uploadResponse = await apiService.uploadFilesToKnowledgeBase(selectedKB.id, formData);
        uploadedContents.push(...uploadResponse.data.uploaded_contents);
      }
      
      // Add text content if any
      if (textInput.trim()) {
        const textResponse = await apiService.addTextToKnowledgeBase(selectedKB.id, {
          text: textInput,
          title: textTitle || 'Custom Text Content',
          description: userPrompt || null
        });
        uploadedContents.push(textResponse.data);
      }

      // Process each content with its summary
      for (let i = 0; i < uploadedContents.length; i++) {
        const finalSummary = editedSummaries[i] !== undefined ? editedSummaries[i] : summaries[i] || extractedTexts[i];
        await apiService.processContentWithLLM(selectedKB.id, uploadedContents[i].id, {
          provider_id: selectedProvider.id,
          model_id: selectedModel.id,
          custom_summary: finalSummary,
          max_summary_tokens: maxSummaryTokens
        });
      }

      toast.success('Content added to knowledge base successfully!');
      fetchContents(selectedKB.id);
      setShowReview(false);
      setShowFileUpload(false);
      setShowTextInput(false);
      setUploadedFiles([]);
      setUploadedImages([]);
      setTextInput('');
      setTextTitle('');
      setExtractedTexts([]);
      setSummaries([]);
      setProcessingStep('');
      
    } catch (error) {
      console.error('Error adding to knowledge base:', error);
      toast.error('Failed to add to knowledge base');
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
      default:
        return <DocumentIcon className="h-5 w-5" />;
    }
  };

  const handleSummaryEdit = async (contentId, newSummary) => {
    try {
      await apiService.updateContentSummary(contentId, {
        summary: newSummary
      });
      toast.success('Summary updated successfully!');
      fetchContents(selectedKB.id);
    } catch (error) {
      console.error('Error updating summary:', error);
      toast.error('Failed to update summary');
    }
  };

  const viewContent = async (content) => {
    try {
      setLoadingContent(true);
      setSelectedContent(content);
      setShowContentViewer(true);
      
      // Fetch full content details
      const response = await apiService.getKnowledgeBaseContent(content.knowledge_base_id, content.id);
      setContentDetails(response.data);
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
              <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
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
            <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
            <p className="text-sm text-slate-400">Create and manage document collections with vector search.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New Knowledge Base
          </button>
        </div>
      </div>

      {/* Provider/Model Selection */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-900">
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
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-900">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search knowledge bases..."
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
              <h3 className="mt-2 text-sm font-medium text-slate-400">No knowledge bases found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {searchTerm || filterType 
                  ? 'Try adjusting your search or filters.' 
                  : 'Create your first knowledge base to get started.'}
              </p>
              {!searchTerm && !filterType && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create First Knowledge Base
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
                          {kb.name || 'Untitled Knowledge Base'}
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
                        title="View knowledge base contents"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteKnowledgeBase(kb.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete knowledge base"
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
                          <p className="text-sm mb-4">Upload files to start building your knowledge base</p>
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

            {/* Summary Length Control */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Summary Length</label>
              
              {/* Quick Preset Buttons */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setMaxSummaryTokens(1000)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    maxSummaryTokens === 1000 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Brief (1K)
                </button>
                <button
                  onClick={() => setMaxSummaryTokens(2000)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    maxSummaryTokens === 2000 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Standard (2K)
                </button>
                <button
                  onClick={() => setMaxSummaryTokens(5000)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    maxSummaryTokens === 5000 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Detailed (5K)
                </button>
                <button
                  onClick={() => setMaxSummaryTokens(10000)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    maxSummaryTokens === 10000 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Comprehensive (10K)
                </button>
              </div>
              
              {/* Range Slider */}
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="500"
                  value={maxSummaryTokens}
                  onChange={(e) => setMaxSummaryTokens(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-slate-400 min-w-[100px] font-mono">
                  {maxSummaryTokens.toLocaleString()} tokens
                </span>
              </div>
              
              <p className="text-xs text-slate-400 mt-2">
                Higher token counts generate more comprehensive summaries with greater detail and context preservation.
                <br />
                <span className="text-yellow-400">⚠️ Very high token counts may be slower and more expensive to process.</span>
              </p>
            </div>

            {/* Content Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Content Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTextInput(false)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    !showTextInput ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  Files & Images
                </button>
                <button
                  onClick={() => setShowTextInput(true)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    showTextInput ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  Text Only
                </button>
              </div>
            </div>

            {/* File Upload Section */}
            {!showTextInput && (
              <div className="space-y-4 mb-6">
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
            )}

            {/* Text Input Section */}
            {showTextInput && (
              <div className="space-y-4 mb-6">
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
                    rows={8}
                  />
                </div>
              </div>
            )}

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
                  setShowTextInput(false);
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
              {extractedTexts.map((text, index) => (
                <div key={index} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h4 className="text-sm font-medium mb-2">
                    {uploadedFiles[index]?.name || uploadedImages[index]?.name || (textInput.trim() ? (textTitle || 'Custom Text') : 'Content')}
                  </h4>
                  
                  <div className="mb-3">
                    <h5 className="text-xs font-medium text-slate-400 mb-1">Extracted Text:</h5>
                    <div className="bg-slate-900 rounded p-3 text-sm text-slate-300 max-h-32 overflow-y-auto">
                      {text.substring(0, 500)}
                      {text.length > 500 && '...'}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-xs font-medium text-slate-400 mb-1">Generated Summary:</h5>
                    <textarea
                      value={editedSummaries[index] !== undefined ? editedSummaries[index] : summaries[index]}
                      onChange={(e) => setEditedSummaries(prev => ({ ...prev, [index]: e.target.value }))}
                      className="w-full bg-slate-900 rounded p-3 text-sm text-slate-300 border border-slate-700 focus:border-blue-500 focus:outline-none"
                      rows={4}
                      placeholder="Edit the summary if needed..."
                    />
                  </div>
                </div>
              ))}
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
                    Add to Knowledge Base
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
            <h3 className="text-lg font-semibold mb-4">Create Knowledge Base</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newKB.name}
                  onChange={(e) => setNewKB({ ...newKB, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter knowledge base name"
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
