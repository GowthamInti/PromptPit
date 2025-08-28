import React, { useState, useEffect, useRef } from 'react';
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
  PlusIcon,
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
    createAndLockPrompt,
    runPrompt,
    duplicatePrompt,
    deletePrompt
  } = usePrompts();

  // Generate unique temporary ID for new prompts
  const generateTempId = () => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const [promptData, setPromptData] = useState({
    id: generateTempId(),
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
  const [showModelConfig, setShowModelConfig] = useState(false);

  // Refs for file inputs
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Determine if this is a new prompt or editing existing
  useEffect(() => {
    if (promptId === 'new' || !promptId) {
      setIsNewPrompt(true);
      setIsEditing(true);
      setCurrentPrompt(null);
    } else {
      setIsNewPrompt(false);
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
      setPromptData({
        id: generateTempId(),
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
    if (!promptData.title.trim() || !promptData.text.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (isNewPrompt) {
        await createPrompt({
          ...promptData,
          provider_id: selectedProvider.id,
          model_id: selectedModel.id,
          files: uploadedFiles,
          images: uploadedImages,
        });
        toast.success('Prompt created successfully!');
        navigate('/editor');
      } else {
        await updatePrompt(currentPrompt.id, {
          ...promptData,
          files: uploadedFiles,
          images: uploadedImages,
        });
        toast.success('Prompt updated successfully!');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Failed to save prompt');
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
      toast.success('Prompt executed successfully!');
    } catch (error) {
      console.error('Error running prompt:', error);
      toast.error('Failed to run prompt');
    }
  };

  const handleLockVersion = async () => {
    if (!output) {
      toast.error('No output to lock');
      return;
    }

    try {
      const versionData = {
        prompt_text: promptData.text,
        system_prompt: promptData.system_prompt,
        temperature: promptData.temperature,
        max_tokens: promptData.max_tokens,
        provider_id: selectedProvider.id,
        model_id: selectedModel.id,
        title: promptData.title || 'Untitled Prompt',
        files: uploadedFiles,
        images: uploadedImages,
        output: output,
      };

      let result;
      
      // If this is a new prompt, create and lock in one operation
      if (isNewPrompt) {
        result = await createAndLockPrompt(versionData);
        setCurrentPrompt({ id: result.prompt_id, ...promptData });
        setIsNewPrompt(false);
      } else {
        // For existing prompts, just lock the version
        result = await lockPromptVersion(currentPrompt.id, versionData);
      }
      
      await fetchPromptVersions(result.prompt_id || currentPrompt.id);
      setShowVersions(true);
      
    } catch (error) {
      console.error('Error locking version:', error);
      toast.error('Failed to lock version');
    }
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
      setUploadedImages(version.images);
    }
    
    // Enable editing mode
    setIsEditing(true);
    
    toast.success('Version loaded into editor!');
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Single Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/editor')}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold">
            {isNewPrompt ? 'New Prompt' : (currentPrompt?.title || 'Loading...')}
          </h1>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {!isNewPrompt && currentPrompt && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors inline-flex items-center"
              >
                {isEditing ? <EyeIcon className="h-4 w-4 mr-2" /> : <PencilIcon className="h-4 w-4 mr-2" />}
                {isEditing ? 'View' : 'Edit'}
              </button>
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors inline-flex items-center"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Versions
              </button>
              <button
                onClick={() => handleDuplicatePrompt(currentPrompt.id)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors inline-flex items-center"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                Duplicate
              </button>
              <button
                onClick={() => handleDeletePrompt(currentPrompt.id, currentPrompt.title)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors inline-flex items-center"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Delete
              </button>
            </>
          )}
          
          {/* Model Configuration Capsule */}
          <button
            onClick={() => setShowModelConfig(!showModelConfig)}
            className="bg-gray-700 hover:bg-gray-600 rounded-full px-4 py-2 flex items-center space-x-2 transition-colors"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            <span className="text-sm">
              {selectedProvider?.name || 'No Provider'} / {selectedModel?.name || 'No Model'}
            </span>
          </button>
        </div>
      </div>

      {/* Model Configuration Dropdown */}
      {showModelConfig && (
        <div className="bg-gray-700 text-white px-6 py-4 border-b border-gray-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Provider</label>
              <select
                value={selectedProvider?.id || ''}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium mb-2">Model</label>
              <select
                value={selectedModel?.id || ''}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedProvider}
              >
                <option value="">Select Model</option>
                {models
                  .filter(model => !selectedProvider || model.provider_id === selectedProvider.id)
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Temperature</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={promptData.temperature}
                onChange={(e) => setPromptData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>0</span>
                <span>{promptData.temperature}</span>
                <span>2</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Output Tokens</label>
              <input
                type="range"
                min="1"
                max="4000"
                step="1"
                value={promptData.max_tokens}
                onChange={(e) => setPromptData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>1</span>
                <span>{promptData.max_tokens}</span>
                <span>4000</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Messages Section */}
        <div className="flex-1 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Messages</h2>
          
          {/* Title Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Prompt Title *
            </label>
            <input
              type="text"
              value={promptData.title}
              onChange={(e) => setPromptData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 bg-slate-800"
              placeholder="Enter a title for your prompt..."
              disabled={!isEditing}
            />
          </div>
          
          {/* System Message */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex items-center mb-4">
              <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-medium">System</span>
            </div>
            <textarea
              value={promptData.system_prompt}
              onChange={(e) => setPromptData(prev => ({ ...prev, system_prompt: e.target.value }))}
              className="w-full border-0 resize-none focus:ring-0 text-white font-mono text-sm bg-transparent"
              rows={12}
              placeholder="You are RadBot, an AI assistant specialized in generating structured radiology reports.  

Your role:
- Help clinicians draft radiology reports in a clear, standardized format.
- Use professional medical language appropriate for clinical documentation.
- Structure reports with sections such as: 
  - Clinical Indication / History
  - Technique
  - Findings
  - Impression (conclusion)
- Ensure findings are objective and descriptive.
- Keep interpretations evidence-based, cautious, and aligned with radiology reporting best practices.

Guidelines:
1. Use precise radiology terminology (e.g., “hypodense lesion”, “well-circumscribed mass”).
2. Do not speculate beyond the provided imaging findings.
3. Clearly separate **observations (Findings)** from **clinical conclusions (Impression)**.
4. Maintain concise, professional tone (avoid conversational language).
5. If findings are ambiguous, describe them cautiously (e.g., “could represent”, “suggestive of”).
6. Do not provide treatment recommendations — only describe imaging findings and possible impression.
7. If critical or urgent findings are described (e.g., pneumothorax, intracranial bleed), clearly flag them in the Impression with “urgent finding”.

Example output format:

---
**Clinical Indication:** [patient history or reason for exam]  
**Technique:** [modality and method used]  
**Findings:**  
- [Objective imaging observations, organized by anatomy/system]  
**Impression:**  
- [Concise summary of key findings, differential if applicable, urgent findings highlighted]  
---

Tone:
- Professional, clinical, concise.
- Avoid hedging unless medically necessary.
- Always prioritize patient safety and clarity."
              disabled={!isEditing}
            />
          </div>

          {/* User Input */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">User *</span>
              {isEditing && (
                <div className="flex items-center space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.pptx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.gif,.bmp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600 transition-colors flex items-center"
                  >
                    <PaperClipIcon className="h-3 w-3 mr-1" />
                    Add Docs
                  </button>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600 transition-colors flex items-center"
                  >
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add Images
                  </button>
                </div>
              )}
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Attached documents ({uploadedFiles.length})</span>
                  {isEditing && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeFileContent"
                        checked={includeFileContent}
                        onChange={(e) => setIncludeFileContent(e.target.checked)}
                        className="rounded border-slate-600 bg-slate-700 text-blue-500"
                      />
                      <label htmlFor="includeFileContent" className="text-xs text-slate-400">
                        Include content
                      </label>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-700 rounded border border-slate-600">
                      <span className="text-xs text-slate-300">{file.name}</span>
                      {isEditing && (
                        <button
                          onClick={() => removeFile(index)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded Images */}
            {uploadedImages.length > 0 && (
              <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400 mb-2 block">Attached images ({uploadedImages.length})</span>
                <div className="grid grid-cols-2 gap-2">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={image.name}
                        className="w-full h-16 object-cover rounded"
                      />
                      {isEditing && (
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 text-white bg-red-500 rounded-full p-1"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <input
              type="text"
              value={promptData.text}
              onChange={(e) => setPromptData(prev => ({ ...prev, text: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 bg-slate-800"
              placeholder="Enter your message here..."
              disabled={!isEditing}
            />
          </div>

          {/* Run Prompt Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handleRunPrompt}
              disabled={loading || !selectedProvider || !selectedModel || !promptData.text.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  <span>Run Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Output Section */}
                      <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Output</h3>
            {!output ? (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
                <DocumentIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">No output yet</p>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Response</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(output.output_text)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Copy
                    </button>
                    {output && (
                      <button
                        onClick={handleLockVersion}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center"
                      >
                        <LockClosedIcon className="h-3 w-3 mr-1" />
                        Lock Version
                      </button>
                    )}
                  </div>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-slate-200 font-mono">
                  {output.output_text}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Versions Panel - Slides in from right when active */}
        {showVersions && currentPrompt && (
          <div className="w-80 bg-slate-900 border-l border-slate-700 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Version History</h3>
              <button
                onClick={() => setShowVersions(false)}
                className="text-slate-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            {promptVersions.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-400">No versions yet</p>
                <p className="text-xs text-slate-500">Lock a version to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {promptVersions.map((version, index) => (
                  <div key={version.id} className="p-3 bg-slate-800 rounded border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        Version {promptVersions.length - index}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
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
                        className="text-xs text-blue-400 hover:text-blue-300"
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptEditor;
