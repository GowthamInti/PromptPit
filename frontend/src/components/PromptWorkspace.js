import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  DocumentDuplicateIcon,
  InformationCircleIcon,
  PaperClipIcon,
  XMarkIcon,
  DocumentIcon,
  PlusIcon,
  FolderIcon,
  ClockIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowPathIcon,
  TrashIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useProviders } from '../contexts/ProviderContext';
import { usePrompts } from '../contexts/PromptContext';
import toast from 'react-hot-toast';

const PromptWorkspace = () => {
  const { providers, models, selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = useProviders();
  const { 
    prompts, 
    currentPrompt, 
    promptVersions, 
    loading, 
    saving,
    setCurrentPrompt,
    fetchPrompts,
    fetchPromptVersions,
    createPrompt,
    updatePrompt,
    lockPromptVersion,
    runPrompt,
    deletePrompt,
    duplicatePrompt,
    deletePromptVersion
  } = usePrompts();

  const [promptData, setPromptData] = useState({
    title: '',
    text: '',
    system_prompt: '',
    temperature: 0.7,
    max_tokens: 1000,
  });
  const [output, setOutput] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [extractedContent, setExtractedContent] = useState('');
  const [includeFileContent, setIncludeFileContent] = useState(true);
  const [fileContentPrefix, setFileContentPrefix] = useState('File content:\n');
  const [showVersions, setShowVersions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);



  // Load current prompt data when selected
  useEffect(() => {
    if (currentPrompt) {
      setPromptData({
        title: currentPrompt.title || '',
        text: currentPrompt.text || '',
        system_prompt: currentPrompt.system_prompt || '',
        temperature: currentPrompt.temperature || 0.7,
        max_tokens: currentPrompt.max_tokens || 1000,
      });
      setUploadedFiles(currentPrompt.files || []);
      // Handle images - they might be metadata objects from database, not File objects
      const images = currentPrompt.images || [];
      const validImages = images.filter(img => img && (img instanceof File || (img.name || img.filename)));
      setUploadedImages(validImages);
      setOutput(currentPrompt.last_output || null);
      setIsEditing(false);
      
      // Load versions for this prompt
      if (currentPrompt.id) {
        console.log('Loading versions for prompt:', currentPrompt.id, 'Version count:', currentPrompt.versions_count);
        fetchPromptVersions(currentPrompt.id);
        // Show versions panel if the prompt has versions
        if (currentPrompt.versions_count > 0) {
          setShowVersions(true);
        }
      }
    } else {
      // Reset to default state
      setPromptData({
        title: '',
        text: '',
        system_prompt: '',
        temperature: 0.7,
        max_tokens: 1000,
      });
      setUploadedFiles([]);
      setUploadedImages([]);
      setOutput(null);
      setIsEditing(true);
    }
  }, [currentPrompt]);

  const handleProviderChange = (providerId) => {
    const provider = providers.find(p => p.id === parseInt(providerId));
    setSelectedProvider(provider);
    setSelectedModel(null);
  };

  const handleModelChange = (modelId) => {
    const model = models.find(m => m.id === parseInt(modelId));
    setSelectedModel(model);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const supportedExtensions = ['.pdf', '.docx', '.pptx'];
    
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      return supportedExtensions.includes(extension);
    });
    
    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only PDF, DOCX, and PPTX files are supported.');
    }
    
    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} document(s) uploaded successfully!`);
    }
    
    event.target.value = '';
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'];
    
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      return supportedExtensions.includes(extension);
    });
    
    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only PNG, JPG, JPEG, GIF, and BMP files are supported.');
    }
    
    if (validFiles.length > 0) {
      setUploadedImages(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} image(s) uploaded successfully!`);
    }
    
    event.target.value = '';
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePrompt = async () => {
    if (!promptData.title.trim()) {
      toast.error('Please enter a title for your prompt');
      return;
    }

    if (!promptData.text.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      const promptPayload = {
        ...promptData,
        provider_id: selectedProvider?.id,
        model_id: selectedModel?.id,
        files: uploadedFiles,
        images: uploadedImages,
        include_file_content: includeFileContent,
        file_content_prefix: fileContentPrefix,
      };

      if (currentPrompt) {
        await updatePrompt(currentPrompt.id, promptPayload);
      } else {
        const newPrompt = await createPrompt(promptPayload);
        setCurrentPrompt(newPrompt);
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
    }
  };

  const handleLockVersion = async () => {
    if (!currentPrompt) {
      toast.error('Please save the prompt first');
      return;
    }

    try {
      const versionPayload = {
        prompt_text: promptData.text,
        system_prompt: promptData.system_prompt,
        temperature: promptData.temperature,
        max_tokens: promptData.max_tokens,
        provider_id: selectedProvider?.id,
        model_id: selectedModel?.id,
        files: uploadedFiles,
        images: uploadedImages,
        include_file_content: includeFileContent,
        file_content_prefix: fileContentPrefix,
        output: output,
      };

      await lockPromptVersion(currentPrompt.id, versionPayload);
      await fetchPromptVersions(currentPrompt.id);
      setShowVersions(true);
    } catch (error) {
      console.error('Error locking version:', error);
    }
  };



  const handleRunPrompt = async () => {
    if (!selectedProvider || !selectedModel) {
      toast.error('Please select a provider and model');
      return;
    }

    if (!promptData.text.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      const requestData = {
        provider_id: selectedProvider.id,
        model_id: selectedModel.id,
        text: promptData.text,
        title: promptData.title || 'Untitled Prompt',
        system_prompt: promptData.system_prompt,
        temperature: promptData.temperature,
        max_tokens: promptData.max_tokens,
        include_file_content: includeFileContent,
        file_content_prefix: fileContentPrefix,
      };



      if (uploadedFiles.length > 0 && includeFileContent) {
        requestData.files = uploadedFiles;
      }

      if (uploadedImages.length > 0) {
        requestData.images = uploadedImages;
      }
      
      const response = await runPrompt(requestData);
      setOutput(response);

      // Update current prompt with new output if it exists
      if (currentPrompt) {
        await updatePrompt(currentPrompt.id, { last_output: response });
      }

      toast.success('Prompt executed successfully!');
    } catch (error) {
      console.error('Error running prompt:', error);
    }
  };

  const handleNewPrompt = () => {
    setCurrentPrompt(null);
    setIsEditing(true);
  };

  const handleDuplicatePrompt = async () => {
    if (!currentPrompt) return;
    
    try {
      const duplicated = await duplicatePrompt(currentPrompt.id);
      setCurrentPrompt(duplicated);
      toast.success('Prompt duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating prompt:', error);
    }
  };

  const handleDeletePrompt = async () => {
    if (!currentPrompt) return;
    
    if (window.confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      try {
        await deletePrompt(currentPrompt.id);
        setCurrentPrompt(null);
        toast.success('Prompt deleted successfully!');
      } catch (error) {
        console.error('Error deleting prompt:', error);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const loadVersion = (version) => {
    // Populate the prompt editor with the selected version data
    setPromptData({
      title: version.title || currentPrompt?.title || '',
      text: version.prompt_text || '',
      system_prompt: version.system_prompt || '',
      temperature: version.temperature || 0.7,
      max_tokens: version.max_tokens || 1000,
    });
    
    // Set the output if available
    if (version.output) {
      setOutput(version.output);
    }
    
    // Set files and images if available
    if (version.files) {
      setUploadedFiles(version.files);
    }
    if (version.images) {
      // Handle images - they might be metadata objects from database, not File objects
      const images = version.images || [];
      const validImages = images.filter(img => img && (img instanceof File || (img.name || img.filename)));
      setUploadedImages(validImages);
    }
    
    // Enable editing mode
    setIsEditing(true);
    
    toast.success('Version loaded into editor!');
  };

  const handleDeleteVersion = async (versionId) => {
    if (!currentPrompt) return;
    
    if (window.confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      try {
        await deletePromptVersion(currentPrompt.id, versionId);
        toast.success('Version deleted successfully!');
      } catch (error) {
        console.error('Error deleting version:', error);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-lg text-gradient">Prompt Workspace</h1>
          <p className="mt-2 body-lg text-secondary">
            Create, version, and manage your prompts with full history tracking.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button
            onClick={handleNewPrompt}
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New Prompt
          </button>
          {currentPrompt && (
            <>
              <button
                onClick={handleDuplicatePrompt}
                className="btn-secondary inline-flex items-center"
              >
                <DocumentDuplicateIcon className="mr-2 h-4 w-4" />
                Duplicate
              </button>
              <button
                onClick={handleDeletePrompt}
                className="btn-error inline-flex items-center"
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Prompt List */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h2 className="heading-md text-primary">Prompts</h2>
            </div>
            
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    onClick={() => setCurrentPrompt(prompt)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      currentPrompt?.id === prompt.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-primary truncate">
                          {prompt.title || 'Untitled Prompt'}
                        </h3>
                        <p className="text-xs text-muted mt-1 truncate">
                          {prompt.text?.substring(0, 50)}...
                        </p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-xs text-muted">
                            {new Date(prompt.created_at).toLocaleDateString()}
                          </span>
                          {prompt.last_output && (
                            <span className="text-xs text-emerald-400">✓ Has output</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {prompts.length === 0 && (
                  <div className="text-center py-8">
                    <FolderIcon className="mx-auto h-8 w-8 text-muted" />
                    <p className="mt-2 text-sm text-muted">No prompts yet</p>
                    <p className="text-xs text-muted">Create your first prompt to get started</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column - Prompt Editor */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Prompt Info */}
            {currentPrompt && (
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h2 className="heading-md text-primary">
                      {isEditing ? 'Editing' : 'Viewing'}: {currentPrompt.title}
                    </h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="btn-secondary text-sm py-1 px-2"
                      >
                        {isEditing ? <EyeIcon className="h-4 w-4" /> : <PencilIcon className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setShowVersions(!showVersions)}
                        className="btn-secondary text-sm py-1 px-2"
                      >
                        <ClockIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Created:</span>
                    <span className="text-primary">
                      {new Date(currentPrompt.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Last modified:</span>
                    <span className="text-primary">
                      {new Date(currentPrompt.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Versions:</span>
                    <span className="text-primary">{promptVersions.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Model Configuration */}
            <div className="card">
              <div className="card-header">
                <h2 className="heading-md text-primary">Model Configuration</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Provider
                  </label>
                  <select
                    value={selectedProvider?.id || ''}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="input-field"
                    disabled={providers.length === 0 || !isEditing}
                  >
                    <option value="">Select Provider</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Model
                  </label>
                  <select
                    value={selectedModel?.id || ''}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="input-field"
                    disabled={!selectedProvider || models.length === 0 || !isEditing}
                  >
                    <option value="">Select Model</option>
                    {models
                      .filter(model => !selectedProvider || model.provider_id === selectedProvider.id)
                      .sort((a, b) => {
                        if (uploadedImages.length > 0) {
                          if (a.supports_vision && !b.supports_vision) return -1;
                          if (!a.supports_vision && b.supports_vision) return 1;
                        }
                        return a.name.localeCompare(b.name);
                      })
                      .map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} {model.supports_vision ? '(Vision)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              


              {selectedModel && (
                <div className="mt-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-5 w-5 text-accent mt-0.5 mr-2" />
                    <div className="text-sm text-secondary">
                      <p className="font-medium text-primary">{selectedModel.name}</p>
                      {selectedModel.description && (
                        <p className="mt-1">{selectedModel.description}</p>
                      )}
                      {selectedModel.context_length && (
                        <p className="mt-1">Context length: {selectedModel.context_length.toLocaleString()} tokens</p>
                      )}
                      {selectedModel.supports_vision && (
                        <p className="mt-1 text-emerald-400">
                          <span className="inline-flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Supports Vision
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div className="card">
              <div className="card-header">
                <h2 className="heading-md text-primary">Prompt</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={promptData.title}
                    onChange={(e) => setPromptData(prev => ({ ...prev, title: e.target.value }))}
                    className="input-field"
                    placeholder="Enter a title for your prompt"
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    System Prompt (Optional)
                  </label>
                  <textarea
                    value={promptData.system_prompt}
                    onChange={(e) => setPromptData(prev => ({ ...prev, system_prompt: e.target.value }))}
                    className="input-field"
                    rows={3}
                    placeholder="Enter a system prompt to set the behavior of the model..."
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-secondary">
                      User Prompt *
                    </label>
                    {isEditing && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.docx,.pptx"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <input
                          type="file"
                          multiple
                          accept=".png,.jpg,.jpeg,.gif,.bmp"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="btn-secondary flex items-center text-xs py-2 px-3 cursor-pointer"
                        >
                          <PaperClipIcon className="h-3 w-3 mr-1" />
                          Add Docs
                        </label>
                        <label
                          htmlFor="image-upload"
                          className="btn-secondary flex items-center text-xs py-2 px-3 cursor-pointer"
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Add Images
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted">Attached documents ({uploadedFiles.length})</span>
                        {isEditing && (
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              <input
                                type="checkbox"
                                id="includeFileContent"
                                checked={includeFileContent}
                                onChange={(e) => setIncludeFileContent(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-700 text-accent focus:ring-accent w-3 h-3"
                              />
                              <label htmlFor="includeFileContent" className="text-xs text-secondary">
                                Include content
                              </label>
                            </div>
                            {includeFileContent && (
                              <input
                                type="text"
                                value={fileContentPrefix}
                                onChange={(e) => setFileContentPrefix(e.target.value)}
                                className="input-field text-xs py-1 px-2 w-32"
                                placeholder="Prefix:"
                              />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/50">
                            <div className="flex items-center space-x-2">
                              <DocumentIcon className="h-3 w-3 text-accent" />
                              <span className="text-xs text-primary">{file.name}</span>
                              <span className="text-xs text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            {isEditing && (
                              <button
                                onClick={() => removeFile(index)}
                                className="text-muted hover:text-red-400 transition-colors"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Uploaded Images List */}
                  {uploadedImages.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted">Attached images ({uploadedImages.length})</span>
                      </div>
                      
                      {selectedModel && !selectedModel.supports_vision && (
                        <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <div className="flex items-start">
                            <svg className="h-4 w-4 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div className="text-xs text-yellow-300">
                              <p className="font-medium">Vision Not Supported</p>
                              <p className="mt-1">The selected model doesn't support vision.</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {uploadedImages.filter(image => image).map((image, index) => (
                          <div key={index} className="relative group">
                            {image instanceof File ? (
                              <img
                                src={(() => {
                                  try {
                                    return URL.createObjectURL(image);
                                  } catch (error) {
                                    console.warn('Failed to create object URL for image:', error);
                                    return '';
                                  }
                                })()}
                                alt={image.name || 'Image'}
                                className="w-full h-20 object-cover rounded border border-slate-600/50"
                                onError={(e) => {
                                  console.warn('Failed to load image:', image.name);
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-20 bg-slate-700 rounded border border-slate-600/50 flex items-center justify-center">
                                <DocumentIcon className="h-8 w-8 text-slate-400" />
                              </div>
                            )}
                            {isEditing && (
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <button
                                  onClick={() => removeImage(index)}
                                  className="text-white hover:text-red-400 transition-colors"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate">
                              {image?.name || image?.filename || 'Unknown file'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    value={promptData.text}
                    onChange={(e) => setPromptData(prev => ({ ...prev, text: e.target.value }))}
                    className="input-field font-mono"
                    rows={8}
                    placeholder="Enter your prompt here..."
                    required
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSavePrompt}
                    disabled={saving || !promptData.title.trim() || !promptData.text.trim()}
                    className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Prompt'}
                  </button>
                  <button
                    onClick={handleRunPrompt}
                    disabled={
                      loading || 
                      !selectedProvider || 
                      !selectedModel || 
                      !promptData.text.trim() ||
                      (uploadedImages.length > 0 && selectedModel && !selectedModel.supports_vision)
                    }
                    className="flex-1 btn-accent py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                        Running...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Run
                      </div>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleRunPrompt}
                    disabled={
                      loading || 
                      !selectedProvider || 
                      !selectedModel || 
                      !promptData.text.trim() ||
                      (uploadedImages.length > 0 && selectedModel && !selectedModel.supports_vision)
                    }
                    className="flex-1 btn-accent py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                        Running...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Run
                      </div>
                    )}
                  </button>
                  <button
                    onClick={handleLockVersion}
                    disabled={!currentPrompt || !output}
                    className="flex-1 btn-success py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LockClosedIcon className="h-4 w-4 mr-2" />
                    Lock Version
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Output & Versions */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Output */}
            <div className="card">
              <div className="card-header">
                <h2 className="heading-md text-primary">Output</h2>
              </div>
              
              {!output ? (
                <div className="text-center py-12">
                  <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-muted" />
                  <h3 className="mt-2 text-sm font-medium text-secondary">No output yet</h3>
                  <p className="mt-1 text-sm text-muted">
                    Run a prompt to see the output here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-scale-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-secondary">Response</h3>
                    <button
                      onClick={() => copyToClipboard(output.output_text)}
                      className="text-sm text-accent hover:text-blue-200 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                    <pre className="whitespace-pre-wrap text-sm text-slate-100 font-mono">
                      {output.output_text}
                    </pre>
                  </div>



                  {/* Metadata */}
                  <div className="border-t border-slate-700/50 pt-4">
                    <h4 className="text-sm font-medium text-secondary mb-2">Metadata</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {output.latency_ms && (
                        <div>
                          <span className="text-muted">Latency:</span>
                          <span className="ml-2 font-medium text-primary">{output.latency_ms.toFixed(2)}ms</span>
                        </div>
                      )}
                      {output.cost_usd && (
                        <div>
                          <span className="text-muted">Cost:</span>
                          <span className="ml-2 font-medium text-primary">${output.cost_usd.toFixed(4)}</span>
                        </div>
                      )}
                      {output.token_usage && (
                        <>
                          <div>
                            <span className="text-muted">Input Tokens:</span>
                            <span className="ml-2 font-medium text-primary">{output.token_usage.input}</span>
                          </div>
                          <div>
                            <span className="text-muted">Output Tokens:</span>
                            <span className="ml-2 font-medium text-primary">{output.token_usage.output}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Versions */}
            {showVersions && currentPrompt && (
              <div className="card">
                <div className="card-header">
                  <h2 className="heading-md text-primary">Version History</h2>
                </div>
                
                {promptVersions.length === 0 ? (
                  <div className="text-center py-8">
                    <LockOpenIcon className="mx-auto h-8 w-8 text-muted" />
                    <p className="mt-2 text-sm text-muted">No versions yet</p>
                    <p className="text-xs text-muted">Lock a version to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {promptVersions.map((version, index) => (
                      <div key={version.id} className="p-3 bg-slate-700/30 rounded border border-slate-600/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-primary">
                            Version {promptVersions.length - index}
                          </span>
                          <span className="text-xs text-muted">
                            {new Date(version.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted space-y-1">
                          <div>Model: {version.model_name}</div>
                          <div>Temperature: {version.temperature}</div>
                          <div>Max Tokens: {version.max_tokens}</div>
                          {version.files && version.files.length > 0 && (
                            <div>Files: {version.files.length}</div>
                          )}
                          {version.images && version.images.length > 0 && (
                            <div>Images: {version.images.length}</div>
                          )}
                        </div>
                        <div className="mt-2 flex space-x-2">
                          <button
                            onClick={() => loadVersion(version)}
                            className="text-xs text-accent hover:text-blue-200"
                          >
                            Load Version
                          </button>
                          {version.output && (
                            <button
                              onClick={() => copyToClipboard(version.output.output_text)}
                              className="text-xs text-green-400 hover:text-green-300"
                            >
                              Copy Output
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteVersion(version.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                            title="Delete version"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      

    </div>
  );
};

export default PromptWorkspace;
