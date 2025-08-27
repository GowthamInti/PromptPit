import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PlayIcon, 
  DocumentDuplicateIcon,
  InformationCircleIcon,
  PaperClipIcon,
  XMarkIcon,
  DocumentIcon,
  ArrowLeftIcon,
  ClockIcon,
  LockClosedIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useProviders } from '../contexts/ProviderContext';
import { usePrompts } from '../contexts/PromptContext';
import toast from 'react-hot-toast';

const PromptEditor = () => {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const { providers, models, selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = useProviders();
  const { 
    currentPrompt, 
    promptVersions, 
    loading, 
    saving,
    setCurrentPrompt,
    fetchPromptVersions,
    fetchPromptById,
    createPrompt,
    updatePrompt,
    lockPromptVersion,
    runPrompt,
    duplicatePrompt,
    deletePrompt
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
  const [includeFileContent, setIncludeFileContent] = useState(true);
  const [fileContentPrefix, setFileContentPrefix] = useState('File content:\n');
  const [showVersions, setShowVersions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewPrompt, setIsNewPrompt] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null); // 'prompt', 'output', or null
  const [showModelConfigModal, setShowModelConfigModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showOutputModal, setShowOutputModal] = useState(false);

  // Determine if this is a new prompt or editing existing
  useEffect(() => {
    if (promptId === 'new' || !promptId) {
      setIsNewPrompt(true);
      setIsEditing(true);
      setCurrentPrompt(null);
    } else {
      setIsNewPrompt(false);
      // Load existing prompt only if promptId is a valid number
      if (promptId && !isNaN(parseInt(promptId))) {
        fetchPromptById(promptId);
      } else {
        console.warn('Invalid prompt ID:', promptId);
        setIsNewPrompt(true);
        setIsEditing(true);
        setCurrentPrompt(null);
      }
    }
  }, [promptId, setCurrentPrompt, fetchPromptById]);

  // Load current prompt data when selected
  useEffect(() => {
    if (currentPrompt && !isNewPrompt) {
      setPromptData({
        title: currentPrompt.title || '',
        text: currentPrompt.text || '',
        system_prompt: currentPrompt.system_prompt || '',
        temperature: currentPrompt.temperature || 0.7,
        max_tokens: currentPrompt.max_tokens || 1000,
      });
      setUploadedFiles(currentPrompt.files || []);
      setUploadedImages(currentPrompt.images || []);
      setOutput(currentPrompt.last_output || null);
      setIsEditing(false);
    } else if (isNewPrompt) {
      // Reset to default state for new prompt
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
  }, [currentPrompt, isNewPrompt]);

  // Auto-select first provider and model for new prompts
  useEffect(() => {
    if (isNewPrompt && providers.length > 0 && !selectedProvider) {
      const firstProvider = providers[0];
      setSelectedProvider(firstProvider);
      
      // Auto-select first model for this provider
      const providerModels = models.filter(m => m.provider_id === firstProvider.id);
      if (providerModels.length > 0) {
        setSelectedModel(providerModels[0]);
      }
    }
  }, [isNewPrompt, providers, models, selectedProvider, setSelectedProvider, setSelectedModel]);

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

      if (isNewPrompt) {
        const newPrompt = await createPrompt(promptPayload);
        navigate(`/editor/${newPrompt.id}`);
      } else if (currentPrompt) {
        await updatePrompt(currentPrompt.id, promptPayload);
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleDuplicatePrompt = async (promptId) => {
    try {
      await duplicatePrompt(promptId);
      toast.success('Prompt duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      toast.error('Failed to duplicate prompt');
    }
  };

  const handleDeletePrompt = async (promptId, promptTitle) => {
    if (window.confirm(`Are you sure you want to delete "${promptTitle}"? This action cannot be undone.`)) {
      try {
        await deletePrompt(promptId);
        toast.success('Prompt deleted successfully!');
        navigate('/editor');
      } catch (error) {
        console.error('Error deleting prompt:', error);
        toast.error('Failed to delete prompt');
      }
    }
  };

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/editor')}
            className="btn-secondary inline-flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Prompts
          </button>
          <div>
            <h1 className="heading-lg text-gradient">
              {isNewPrompt ? 'New Prompt' : (currentPrompt?.title || 'Loading...')}
            </h1>
            <p className="mt-1 body-sm text-secondary">
              {isNewPrompt ? 'Create a new prompt' : 'Edit and run your prompt'}
            </p>
          </div>
        </div>
        
        {/* Model Configuration Capsule */}
        <div className="flex items-center space-x-3">
          {/* Different buttons for new prompt vs existing prompt */}
          {isNewPrompt ? (
            // New prompt - only model config
            <div className="bg-slate-800/50 rounded-full px-4 py-2 border border-slate-600/50 hover:bg-slate-700/50 transition-colors cursor-pointer"
                 onClick={() => setShowModelConfigModal(true)}>
              <div className="flex items-center space-x-2">
                <Cog6ToothIcon className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-primary">
                  {selectedProvider?.name || 'No Provider'} / {selectedModel?.name || 'No Model'}
                </span>
                {selectedModel?.supports_vision && (
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                )}
              </div>
            </div>
          ) : (
            // Existing prompt - all action buttons
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn-secondary inline-flex items-center"
              >
                {isEditing ? <EyeIcon className="h-4 w-4 mr-2" /> : <PencilIcon className="h-4 w-4 mr-2" />}
                {isEditing ? 'View' : 'Edit'}
              </button>
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="btn-secondary inline-flex items-center"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Versions
              </button>
              <button
                onClick={() => handleDuplicatePrompt(currentPrompt.id)}
                className="btn-secondary inline-flex items-center"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                Duplicate
              </button>
              <button
                onClick={() => handleDeletePrompt(currentPrompt.id, currentPrompt.title)}
                className="btn-secondary inline-flex items-center text-red-400 hover:text-red-300"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Delete
              </button>
              
              {/* Model Config Capsule */}
              <div className="bg-slate-800/50 rounded-full px-4 py-2 border border-slate-600/50 hover:bg-slate-700/50 transition-colors cursor-pointer"
                   onClick={() => setShowModelConfigModal(true)}>
                <div className="flex items-center space-x-2">
                  <Cog6ToothIcon className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-primary">
                    {selectedProvider?.name || 'No Provider'} / {selectedModel?.name || 'No Model'}
                  </span>
                  {selectedModel?.supports_vision && (
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Prompt */}
        <div className={`flex flex-col transition-all duration-300 ${expandedSection === 'output' ? 'w-1/4' : 'w-1/2'}`}>
          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-md text-primary">Prompt</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="p-2 text-slate-400 hover:text-accent transition-colors"
                  title="Expand prompt"
                >
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setExpandedSection(expandedSection === 'prompt' ? null : 'prompt')}
                  className="p-2 text-slate-400 hover:text-accent transition-colors"
                  title={expandedSection === 'prompt' ? 'Collapse' : 'Expand'}
                >
                  {expandedSection === 'prompt' ? 
                    <ArrowsPointingInIcon className="h-4 w-4" /> : 
                    <ArrowsPointingOutIcon className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={promptData.title}
                  onChange={(e) => setPromptData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field font-mono"
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
                  className="input-field font-mono"
                  rows={4}
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
                      {uploadedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={image.name}
                            className="w-full h-20 object-cover rounded border border-slate-600/50"
                          />
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
                            {image.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  value={promptData.text}
                  onChange={(e) => setPromptData(prev => ({ ...prev, text: e.target.value }))}
                  className="input-field font-mono text-sm leading-relaxed"
                  rows={20}
                  placeholder="Enter your prompt here..."
                  required
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6 pt-4 border-t border-slate-700/50 px-6 pb-6">
            
            {isEditing ? (
              <>
                <button
                  onClick={handleSavePrompt}
                  disabled={saving || !promptData.title.trim() || !promptData.text.trim()}
                  className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : (isNewPrompt ? 'Create Prompt' : 'Save Changes')}
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
                {output && (
                  <button
                    onClick={handleLockVersion}
                    disabled={!currentPrompt || !output}
                    className="flex-1 btn-success py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LockClosedIcon className="h-4 w-4 mr-2" />
                    Lock Version
                  </button>
                )}
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
                {output && (
                  <button
                    onClick={handleLockVersion}
                    disabled={!currentPrompt || !output}
                    className="flex-1 btn-success py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LockClosedIcon className="h-4 w-4 mr-2" />
                    Lock Version
                  </button>
                )}
              </>
            )}
          </div>
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className={`flex flex-col transition-all duration-300 ${expandedSection === 'prompt' ? 'w-1/4' : 'w-1/2'}`}>
          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-md text-primary">Output</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowOutputModal(true)}
                  className="p-2 text-slate-400 hover:text-accent transition-colors"
                  title="Expand output"
                >
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setExpandedSection(expandedSection === 'output' ? null : 'output')}
                  className="p-2 text-slate-400 hover:text-accent transition-colors"
                  title={expandedSection === 'output' ? 'Collapse' : 'Expand'}
                >
                  {expandedSection === 'output' ? 
                    <ArrowsPointingInIcon className="h-4 w-4" /> : 
                    <ArrowsPointingOutIcon className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
            
            {!output ? (
              <div className="text-center py-12">
                <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-muted" />
                <h3 className="mt-2 text-sm font-medium text-secondary">No output yet</h3>
                <p className="mt-1 text-sm text-muted">
                  Run a prompt to see the output here.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-scale-in h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-secondary">Response</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted">
                      Generated from: {promptData.title || 'Current Prompt'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(output.output_text)}
                      className="text-sm text-accent hover:text-blue-200 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-slate-100 font-mono leading-relaxed">
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
                  <ClockIcon className="mx-auto h-8 w-8 text-muted" />
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
                      {version.output && (
                        <div className="mt-2">
                          <button
                            onClick={() => copyToClipboard(version.output.output_text)}
                            className="text-xs text-accent hover:text-blue-200"
                          >
                            Copy Output
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Versions Panel - Slides in from right when active */}
      {showVersions && currentPrompt && (
        <div className="absolute right-0 top-0 h-full w-80 bg-slate-900/95 border-l border-slate-700/50 shadow-2xl transform transition-transform duration-300 z-10">
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading-md text-primary">Version History</h2>
              <button
                onClick={() => setShowVersions(false)}
                className="p-2 text-slate-400 hover:text-accent transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            {promptVersions.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-8 w-8 text-muted" />
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
                    {version.output && (
                      <div className="mt-2">
                        <button
                          onClick={() => copyToClipboard(version.output.output_text)}
                          className="text-xs text-accent hover:text-blue-200"
                        >
                          Copy Output
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Model Configuration Modal */}
      {showModelConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-md text-primary">Model Configuration</h2>
              <button
                onClick={() => setShowModelConfigModal(false)}
                className="p-2 text-slate-400 hover:text-accent transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Provider
                </label>
                <select
                  value={selectedProvider?.id || ''}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="input-field w-full"
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
                  className="input-field w-full"
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

              {selectedModel && (
                <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
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
                            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                            Supports Vision
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-4xl mx-4 h-5/6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-md text-primary">Prompt Editor</h2>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-2 text-slate-400 hover:text-accent transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="h-full flex flex-col space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={promptData.title}
                  onChange={(e) => setPromptData({...promptData, title: e.target.value})}
                  placeholder="Enter prompt title"
                  className="input-field w-full"
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  System Prompt (Optional)
                </label>
                <textarea
                  value={promptData.system_prompt}
                  onChange={(e) => setPromptData({...promptData, system_prompt: e.target.value})}
                  placeholder="Enter system prompt..."
                  rows={4}
                  className="input-field w-full resize-none"
                  disabled={!isEditing}
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-secondary mb-2">
                  User Prompt *
                </label>
                <textarea
                  value={promptData.text}
                  onChange={(e) => setPromptData({...promptData, text: e.target.value})}
                  placeholder="Enter your prompt..."
                  className="input-field w-full resize-none h-full"
                  disabled={!isEditing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Temperature
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={promptData.temperature}
                    onChange={(e) => setPromptData({...promptData, temperature: parseFloat(e.target.value)})}
                    className="input-field w-full"
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4000"
                    value={promptData.max_tokens}
                    onChange={(e) => setPromptData({...promptData, max_tokens: parseInt(e.target.value)})}
                    className="input-field w-full"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Output Modal */}
      {showOutputModal && output && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-4xl mx-4 h-5/6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-md text-primary">Output Viewer</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(output.output_text)}
                  className="text-sm text-accent hover:text-blue-200 transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={() => setShowOutputModal(false)}
                  className="p-2 text-slate-400 hover:text-accent transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="h-full flex flex-col space-y-4">
              <div className="flex-1 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-slate-100 font-mono">
                  {output.output_text}
                </pre>
              </div>

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
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptEditor;
