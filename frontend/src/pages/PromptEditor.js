import React, { useState, useRef } from 'react';
import { 
  PlayIcon, 
  DocumentDuplicateIcon,
  InformationCircleIcon,
  PaperClipIcon,
  XMarkIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { useProviders } from '../contexts/ProviderContext';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const PromptEditor = () => {
  const { providers, models, selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = useProviders();
  const [promptData, setPromptData] = useState({
    title: '',
    text: '',
    system_prompt: '',
    temperature: 0.7,
    max_tokens: 1000,
  });
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [extractedContent, setExtractedContent] = useState('');
  const [includeFileContent, setIncludeFileContent] = useState(true);
  const [fileContentPrefix, setFileContentPrefix] = useState('File content:\n');
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleProviderChange = (providerId) => {
    const provider = providers.find(p => p.id === parseInt(providerId));
    setSelectedProvider(provider);
    setSelectedModel(null); // Reset model selection
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
    
    // Reset file input
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
    
    // Reset file input
    event.target.value = '';
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const extractFileContent = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('No files to extract content from');
      return;
    }

    try {
      setLoading(true);
      // Create a temporary FormData to extract content
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // We'll simulate extraction by reading file content
      // In a real implementation, you might want to add a separate endpoint for preview
      const contents = uploadedFiles.map(file => 
        `Content from ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
      ).join('\n\n');
      
      setExtractedContent(contents);
      toast.success('File content preview generated!');
    } catch (error) {
      console.error('Error extracting file content:', error);
      let errorMessage = 'Failed to preview file content';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Ensure errorMessage is a string
      if (typeof errorMessage === 'object') {
        errorMessage = JSON.stringify(errorMessage);
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
      setLoading(true);
      setOutput(null);

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

      // Add files to request data if present and include_file_content is true
      if (uploadedFiles.length > 0 && includeFileContent) {
        requestData.files = uploadedFiles;
      }

      // Add images to request data if present
      if (uploadedImages.length > 0) {
        requestData.images = uploadedImages;
      }
      
      const response = await apiService.runPrompt(requestData);

      setOutput(response.data);
      toast.success('Prompt executed successfully!');
    } catch (error) {
      console.error('Error running prompt:', error);
      let errorMessage = 'Failed to run prompt';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Ensure errorMessage is a string
      if (typeof errorMessage === 'object') {
        errorMessage = JSON.stringify(errorMessage);
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-lg text-gradient">Prompt Editor</h1>
          <p className="mt-2 body-lg text-secondary">
            Create and experiment with prompts across different LLM providers and models.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Prompt Input */}
        <div className="space-y-6">
          {/* Provider and Model Selection */}
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
                  disabled={providers.length === 0}
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
                  disabled={!selectedProvider || models.length === 0}
                >
                  <option value="">Select Model</option>
                  {models
                    .filter(model => !selectedProvider || model.provider_id === selectedProvider.id)
                    .sort((a, b) => {
                      // Sort vision-capable models first when images are uploaded
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
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={promptData.title}
                  onChange={(e) => setPromptData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field"
                  placeholder="Enter a title for your prompt"
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
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-secondary">
                    User Prompt *
                  </label>
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
                      className="btn-secondary flex items-center text-xs py-2 px-3"
                    >
                      <PaperClipIcon className="h-3 w-3 mr-1" />
                      Add Docs
                    </button>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="btn-secondary flex items-center text-xs py-2 px-3"
                    >
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Add Images
                    </button>
                                      {uploadedFiles.length > 0 && (
                    <>
                      <button
                        onClick={extractFileContent}
                        disabled={loading}
                        className="btn-accent flex items-center text-xs py-2 px-3"
                      >
                        <DocumentIcon className="h-3 w-3 mr-1" />
                        Preview
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const testData = {
                              provider_id: selectedProvider?.id,
                              model_id: selectedModel?.id,
                              text: promptData.text,
                              files: uploadedFiles
                            };
                            const response = await apiService.testFormData(testData);
                            toast.success('Form data test successful!');
                          } catch (error) {
                            toast.error('Form data test failed');
                          }
                        }}
                        className="btn-secondary flex items-center text-xs py-2 px-3"
                      >
                        Test
                      </button>
                    </>
                  )}
                  </div>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted">Attached documents ({uploadedFiles.length})</span>
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
                    </div>
                    <div className="space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/50">
                          <div className="flex items-center space-x-2">
                            <DocumentIcon className="h-3 w-3 text-accent" />
                            <span className="text-xs text-primary">{file.name}</span>
                            <span className="text-xs text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-muted hover:text-red-400 transition-colors"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
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
                    
                    {/* Vision Support Warning */}
                    {selectedModel && !selectedModel.supports_vision && (
                      <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-start">
                          <svg className="h-4 w-4 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <div className="text-xs text-yellow-300">
                            <p className="font-medium">Vision Not Supported</p>
                            <p className="mt-1">
                              The selected model "{selectedModel.name}" doesn't support vision. 
                              Please select a vision-capable model like:
                            </p>
                            <ul className="mt-1 ml-4 list-disc">
                              <li>GPT-4 Vision (OpenAI)</li>
                              <li>Llama 4 Scout (Groq)</li>
                              <li>Llama 4 Maverick (Groq)</li>
                            </ul>
                            <p className="mt-1">
                              <a 
                                href="https://console.groq.com/docs/vision" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                              >
                                Learn more about vision models →
                              </a>
                            </p>
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
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <button
                              onClick={() => removeImage(index)}
                              className="text-white hover:text-red-400 transition-colors"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate">
                            {image.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Content Preview */}
                {extractedContent && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted">File content preview</span>
                      <button
                        onClick={() => setExtractedContent('')}
                        className="text-xs text-muted hover:text-red-400"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="bg-slate-900/50 rounded border border-slate-700/50 max-h-24 overflow-y-auto p-2">
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap">
                        {extractedContent.length > 150 
                          ? extractedContent.substring(0, 150) + '...' 
                          : extractedContent}
                      </pre>
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
                />
              </div>
            </div>
          </div>



          {/* Run Button */}
          <button
            onClick={handleRunPrompt}
            disabled={
              loading || 
              !selectedProvider || 
              !selectedModel || 
              !promptData.text.trim() ||
              (uploadedImages.length > 0 && selectedModel && !selectedModel.supports_vision)
            }
            className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="loading-dots mr-3">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                {uploadedImages.length > 0 ? 'Processing images & running...' :
                 uploadedFiles.length > 0 ? 'Processing files & running...' : 'Running...'}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <PlayIcon className="mr-2 h-5 w-5" />
                {uploadedImages.length > 0 ? 'Run Visual Question Answering' : 
                 uploadedFiles.length > 0 ? 'Run Prompt with Files' : 'Run Prompt'}
              </div>
            )}
          </button>
        </div>

        {/* Right Column - Output */}
        <div className="space-y-6">
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
        </div>
      </div>
    </div>
  );
};

export default PromptEditor;
