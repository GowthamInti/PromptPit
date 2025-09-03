import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PlayIcon, 
  DocumentDuplicateIcon,
  XMarkIcon,
  DocumentIcon,
  ArrowLeftIcon,
  ClockIcon,
  LockClosedIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  Cog6ToothIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { useProviders } from '../contexts/ProviderContext';
import { usePrompts } from '../contexts/PromptContext';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

const PromptEditor = () => {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const { providers, models, selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = useProviders();
  const { 
    currentPrompt, 
    promptVersions, 
    loading, 
    setCurrentPrompt,
    fetchPromptVersions,
    fetchPromptById,
    lockPromptVersion,
    createAndLockPrompt,
    runPrompt,
    duplicatePrompt,
    deletePrompt,
    deletePromptVersion
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
  });
  const [output, setOutput] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [includeFileContent, setIncludeFileContent] = useState(true);

  const [showVersions, setShowVersions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewPrompt, setIsNewPrompt] = useState(false);
  const [showModelConfig, setShowModelConfig] = useState(false);
  
  // Knowledge Base RAG states
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState(null);




  // Drag and drop states
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [justDroppedDoc, setJustDroppedDoc] = useState(false);
  const [justDroppedImage, setJustDroppedImage] = useState(false);

  // Markdown rendering states
  const [renderAsMarkdown, setRenderAsMarkdown] = useState(true);

  // Refs for file inputs
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  
  // Structured Output states
  const [structuredOutput, setStructuredOutput] = useState(false);

  const [jsonSchemaContent, setJsonSchemaContent] = useState('');

  // Report view states
  const [reportViewMode, setReportViewMode] = useState('json'); // 'json', 'formatted'

  // Fetch knowledge bases on component mount
  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      try {
        console.log('Fetching knowledge bases...');
        const response = await apiService.getKnowledgeBases();
        console.log('Knowledge bases response:', response.data);
        
        // The API returns { knowledge_bases: [...], total_count: 0, page: 1, page_size: 10 }
        const kbData = response.data;
        if (kbData && Array.isArray(kbData.knowledge_bases)) {
          setKnowledgeBases(kbData.knowledge_bases);
        } else if (Array.isArray(kbData)) {
          // Fallback if API returns direct array
          setKnowledgeBases(kbData);
        } else {
          console.warn('Knowledge bases response format unexpected:', kbData);
          setKnowledgeBases([]);
        }
      } catch (error) {
        console.error('Error fetching knowledge bases:', error);
        setKnowledgeBases([]); // Set empty array on error
      }
    };
    fetchKnowledgeBases();
  }, []);

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
        fetchPromptVersions(currentPrompt.id);
        // Show versions panel if the prompt has versions
        if (currentPrompt.versions_count > 0) {
          setShowVersions(true);
        }
      }
    } else if (isNewPrompt) {
      setPromptData({
        id: generateTempId(),
        title: '',
        text: '',
        system_prompt: '',
      });
      setUploadedFiles([]);
      setUploadedImages([]);
      setOutput(null);
      setIsEditing(true);
    }
  }, [currentPrompt, isNewPrompt, fetchPromptVersions]);

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
    handleDocumentDrop(files);
    event.target.value = '';
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    handleImageDrop(files);
    event.target.value = '';
  };

  const handleDocumentDrop = (files) => {
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
      
      // Show success animation
      setJustDroppedDoc(true);
      setTimeout(() => setJustDroppedDoc(false), 1000);
    }
  };

  const handleImageDrop = (files) => {
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
      
      // Show success animation
      setJustDroppedImage(true);
      setTimeout(() => setJustDroppedImage(false), 1000);
    }
  };

  const handleDocumentDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDocumentDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDoc(true);
  };

  const handleDocumentDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingDoc(false);
    }
  };

  const handleDocumentDropEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDoc(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleDocumentDrop(files);
  };

  const handleImageDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImageDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(true);
  };

  const handleImageDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingImage(false);
    }
  };

  const handleImageDropEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleImageDrop(files);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // const handleSavePrompt = async () => {
  //   if (!promptData.title.trim() || !promptData.text.trim()) {
  //     toast.error('Please fill in all required fields');
  //     return;
  //   }

  //   try {
  //     if (isNewPrompt) {
  //       await createPrompt({
  //         ...promptData,
  //         provider_id: selectedProvider.id,
  //         model_id: selectedModel.id,
  //         files: uploadedFiles,
  //         images: uploadedImages,
  //       });
  //       toast.success('Prompt created successfully!');
  //       navigate('/editor');
  //     } else {
  //       await updatePrompt(currentPrompt.id, {
  //         ...promptData,
  //         files: uploadedFiles,
  //         images: uploadedImages,
  //       });
  //       toast.success('Prompt updated successfully!');
  //     }
  //   } catch (error) {
  //     console.error('Error saving prompt:', error);
  //     toast.error('Failed to save prompt');
  //   }
  // };

  // const handleRagPreview = async () => {
  //   if (!selectedKnowledgeBase || !promptData.text.trim()) {
  //     toast.error('Please select a knowledge base and enter a prompt');
  //     return;
  //   }

  //   try {
  //     setLoadingRagPreview(true);
  //     const response = await apiService.getRagPreview({
  //       knowledge_base_id: selectedKnowledgeBase.id,
  //       query: promptData.text
  //     });
      
  //     setRagContext(response.data);
  //     setShowRagPreview(true);
  //   } catch (error) {
  //     console.error('Error getting RAG preview:', error);
  //     toast.error('Failed to get RAG context preview');
  //   } finally {
  //     setLoadingRagPreview(false);
  //   }
  // };

  const handleRunPrompt = async () => {
    if (!selectedProvider || !selectedModel) {
      toast.error('Please select a provider and model');
      return;
    }

    if (!promptData.text.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    // Validate JSON schema if structured output is enabled
    if (structuredOutput && jsonSchemaContent) {
      try {
        JSON.parse(jsonSchemaContent);
      } catch (error) {
        toast.error('Invalid JSON schema. Please check your schema format.');
        return;
      }
    }

    try {
      const requestData = {
        provider_id: selectedProvider.id,
        model_id: selectedModel.id,
        text: promptData.text,
        title: promptData.title || 'Untitled Prompt',
        system_prompt: promptData.system_prompt,
        include_file_content: includeFileContent,

        structured_output: structuredOutput,
        json_schema: structuredOutput && jsonSchemaContent ? jsonSchemaContent : null,
      };

      // Add knowledge base for RAG if selected
      if (selectedKnowledgeBase) {
        requestData.knowledge_base_id = selectedKnowledgeBase.id;
      }

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
        provider_id: selectedProvider.id,
        model_id: selectedModel.id,
        title: promptData.title || 'Untitled Prompt',
        files: uploadedFiles,
        images: uploadedImages,
        structured_output: structuredOutput,
        json_schema: structuredOutput && jsonSchemaContent ? jsonSchemaContent : null,
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

  // Function to detect if content looks like markdown
  const isMarkdownContent = (text) => {
    if (!text) return false;
    
    const markdownPatterns = [
      /^#{1,6}\s/m,           // Headers (# ## ###)
      /\*\*.*\*\*/,           // Bold text
      /\*.*\*/,               // Italic text  
      /```[\s\S]*?```/,       // Code blocks
      /`[^`]+`/,              // Inline code
      /^\s*[-*+]\s/m,         // Unordered lists
      /^\s*\d+\.\s/m,         // Ordered lists
      /\[.*\]\(.*\)/,         // Links
      /!\[.*\]\(.*\)/,        // Images
      /^\s*>/m,               // Blockquotes
      /\|.*\|/,               // Tables
      /^---+$/m,              // Horizontal rules
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
  };



  // Function to generate formatted report from JSON response
  const generateFormattedReport = (jsonResponse, jsonSchema = null) => {
    try {
      if (typeof jsonResponse === 'string') {
        jsonResponse = JSON.parse(jsonResponse);
      }
      
      if (typeof jsonResponse !== 'object' || jsonResponse === null) {
        return 'Unable to generate report: Response is not a valid JSON object';
      }
      
      let report = '';
      
      // Helper function to sort keys according to schema order
      const sortKeysBySchema = (keys, schema) => {
        if (!schema || !schema.properties) return keys;
        
        if (schema.propertyOrder) {
          // Sort keys according to explicit propertyOrder, keeping unknown keys at the end
          return keys.sort((a, b) => {
            const aIndex = schema.propertyOrder.indexOf(a);
            const bIndex = schema.propertyOrder.indexOf(b);
            
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });
        } else {
          // Use the order from schema properties (maintains user's defined order)
          const schemaKeys = Object.keys(schema.properties);
          return keys.sort((a, b) => {
            const aIndex = schemaKeys.indexOf(a);
            const bIndex = schemaKeys.indexOf(b);
            
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });
        }
      };
      
      // Recursive function to process nested objects
      const processObject = (obj, level = 0, schema = null) => {
        const indent = '  '.repeat(level);
        
        // Get keys and sort them according to schema order
        let keys = Object.keys(obj);
        keys = sortKeysBySchema(keys, schema);
        
        // Debug: Log the ordering at each level
        if (schema && schema.properties) {
          console.log(`Level ${level} - Schema keys:`, Object.keys(schema.properties));
          console.log(`Level ${level} - Sorted keys:`, keys);
        }
        
        for (const key of keys) {
          const value = obj[key];
          if (value === null || value === undefined) {
            continue;
          }
          
          // Format the key (capitalize and add spaces)
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
            .trim();
          
          if (typeof value === 'object' && !Array.isArray(value)) {
            // Nested object
            report += `${indent}${formattedKey}:\n`;
            const nestedSchema = schema && schema.properties && schema.properties[key] ? schema.properties[key] : null;
            processObject(value, level + 1, nestedSchema);
          } else if (Array.isArray(value)) {
            // Array
            report += `${indent}${formattedKey}:\n`;
            const arraySchema = schema && schema.properties && schema.properties[key] ? schema.properties[key] : null;
            for (let index = 0; index < value.length; index++) {
              const item = value[index];
              if (typeof item === 'object' && item !== null) {
                report += `${indent}  ${index + 1}.\n`;
                const itemSchema = arraySchema && arraySchema.items ? arraySchema.items : null;
                processObject(item, level + 2, itemSchema);
              } else {
                report += `${indent}  ${index + 1}. ${item}\n`;
              }
            }
          } else {
            // Simple value
            report += `${indent}${formattedKey}: ${value}\n`;
          }
        }
      };
      
      // Get schema for ordering if available
      const schemaForOrdering = jsonSchema ? 
        (typeof jsonSchema === 'string' ? JSON.parse(jsonSchema) : jsonSchema) : null;
      
      // Debug: Log the schema and expected order
      if (schemaForOrdering && schemaForOrdering.properties) {
        console.log('Top level - Schema properties order:', Object.keys(schemaForOrdering.properties));
        console.log('Top level - Response properties:', Object.keys(jsonResponse));
      }
      
      processObject(jsonResponse, 0, schemaForOrdering);
      
      return report;
    } catch (error) {
      console.error('Error generating formatted report:', error);
      return 'Error generating formatted report from JSON response';
    }
  };

  // Function to export formatted report as text file
  const exportFormattedReport = (jsonResponse, filename = 'report.txt', jsonSchema = null) => {
    try {
      const reportContent = generateFormattedReport(jsonResponse, jsonSchema);
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const loadVersion = (version) => {
    // Populate the prompt editor with the selected version data
    setPromptData({
      title: version.title || currentPrompt?.title || '',
      text: version.prompt_text || '',
      system_prompt: version.system_prompt || '',
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
    
    // Restore structured output settings if available
    if (version.structured_output !== undefined) {
      setStructuredOutput(version.structured_output);
    }
    if (version.json_schema) {
      setJsonSchemaContent(version.json_schema);

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


          </div>
        </div>
      )}

    {/* Knowledge Base RAG Section - Always Visible */}
    <div className="bg-slate-800 text-white px-6 py-4 border-b border-slate-700">
            <div className="max-w-4xl mx-auto">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-2">
                      <BookOpenIcon className="h-4 w-4 inline mr-1" />
                      🧠 Knowledge Base (RAG) - Optional {Array.isArray(knowledgeBases) && knowledgeBases.length > 0 && `(${knowledgeBases.length} available)`}
                    </label>
                    <select
                      value={selectedKnowledgeBase?.id || ''}
                      onChange={(e) => {
                        if (Array.isArray(knowledgeBases)) {
                          const kb = knowledgeBases.find(k => k.id === parseInt(e.target.value));
                          setSelectedKnowledgeBase(kb || null);
                        } else {
                          setSelectedKnowledgeBase(null);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No Knowledge Base</option>
                      {Array.isArray(knowledgeBases) && knowledgeBases.map((kb) => (
                        <option key={kb.id} value={kb.id}>
                          {kb.name} ({kb.content_count || 0} docs)
                        </option>
                      ))}
                    </select>
                    {selectedKnowledgeBase && (
                      <div className="mt-2 text-xs text-blue-300">
                        ✓ Selected: <span className="font-medium">{selectedKnowledgeBase.name}</span> • {selectedKnowledgeBase.content_count || 0} documents
                        <span className="ml-2 text-slate-400">Your prompt will be enhanced with relevant context from this knowledge base.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>



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
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6 shadow-sm">
              <div className="flex items-center mb-4">
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">User *</span>
              </div>

              {/* Hidden file inputs for fallback */}
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

              {/* Drag and Drop Zones */}
              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Document Drop Zone */}
                  <div
                    onDragOver={handleDocumentDragOver}
                    onDragEnter={handleDocumentDragEnter}
                    onDragLeave={handleDocumentDragLeave}
                    onDrop={handleDocumentDropEvent}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer group ${
                      isDraggingDoc
                        ? 'border-blue-400 bg-blue-500/10 scale-105'
                        : justDroppedDoc
                        ? 'border-green-400 bg-green-500/10'
                        : 'border-slate-600 hover:border-blue-500 hover:bg-slate-800/50'
                    }`}
                  >
                    <DocumentIcon className={`h-8 w-8 mx-auto mb-2 transition-colors ${
                      isDraggingDoc 
                        ? 'text-blue-400' 
                        : justDroppedDoc
                        ? 'text-green-400'
                        : 'text-slate-400 group-hover:text-blue-400'
                    }`} />
                    <p className={`text-sm font-medium transition-colors ${
                      isDraggingDoc 
                        ? 'text-blue-300' 
                        : justDroppedDoc
                        ? 'text-green-300'
                        : 'text-slate-300 group-hover:text-blue-300'
                    }`}>
                      {isDraggingDoc ? 'Release to upload documents' : justDroppedDoc ? 'Documents uploaded!' : 'Drop documents here'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF, DOCX, PPTX • or click to browse
                    </p>
                  </div>

                  {/* Image Drop Zone */}
                  <div
                    onDragOver={handleImageDragOver}
                    onDragEnter={handleImageDragEnter}
                    onDragLeave={handleImageDragLeave}
                    onDrop={handleImageDropEvent}
                    onClick={() => imageInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer group ${
                      isDraggingImage
                        ? 'border-green-400 bg-green-500/10 scale-105'
                        : justDroppedImage
                        ? 'border-green-400 bg-green-500/10'
                        : 'border-slate-600 hover:border-green-500 hover:bg-slate-800/50'
                    }`}
                  >
                    <svg className={`h-8 w-8 mx-auto mb-2 transition-colors ${
                      isDraggingImage 
                        ? 'text-green-400' 
                        : justDroppedImage
                        ? 'text-green-400'
                        : 'text-slate-400 group-hover:text-green-400'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className={`text-sm font-medium transition-colors ${
                      isDraggingImage 
                        ? 'text-green-300' 
                        : justDroppedImage
                        ? 'text-green-300'
                        : 'text-slate-300 group-hover:text-green-300'
                    }`}>
                      {isDraggingImage ? 'Release to upload images' : justDroppedImage ? 'Images uploaded!' : 'Drop images here'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG, GIF, BMP • or click to browse
                    </p>
                  </div>
                </div>
              )}

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
                    {uploadedImages.filter(image => image).map((image, index) => (
                      <div key={index} className="relative">
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
                            className="w-full h-16 object-cover rounded"
                            onError={(e) => {
                              console.warn('Failed to load image:', image.name);
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-16 bg-slate-700 rounded flex items-center justify-center">
                            <DocumentIcon className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
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

              {/* User Input Textarea - Now styled like System */}
              <textarea
                value={promptData.text}
                onChange={(e) => setPromptData(prev => ({ ...prev, text: e.target.value }))}
                className="w-full border-0 resize-none focus:ring-0 text-white font-mono text-sm bg-transparent"
                rows={8}
                placeholder="Enter your message here..."
                disabled={!isEditing}
              />
            </div>
          </div>
          {/* Structured Output Section */}
          <div className="mb-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-purple-300">
                  🎯 Structured Output - Optional
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Enable</span>
                  <button
                    onClick={() => setStructuredOutput(!structuredOutput)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      structuredOutput ? 'bg-purple-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        structuredOutput ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {structuredOutput && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">
                      JSON Schema
                    </label>
                    <div className="space-y-2">
                      <textarea
                        value={jsonSchemaContent}
                        onChange={(e) => {
                          setJsonSchemaContent(e.target.value);
                          // Try to parse as JSON for validation
                          try {
                            if (e.target.value.trim()) {
                              JSON.parse(e.target.value);

                            }
                          } catch (error) {
                            // Invalid JSON - keep content
                          }
                        }}
                        placeholder={`Paste your JSON schema here... 

Example with property order:
{
  "type": "object",
  "properties": {
    "clinical_indication": { "type": "string" },
    "technique": { "type": "string" },
    "findings": { "type": "string" },
    "impression": { "type": "string" }
  },
  "required": ["clinical_indication", "findings", "impression"],
  "propertyOrder": ["clinical_indication", "technique", "findings", "impression"]
}`}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                        rows={8}
                      />
                      {jsonSchemaContent && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {(() => {
                              try {
                                JSON.parse(jsonSchemaContent);
                                return <span className="text-xs text-green-400">✓ Valid JSON Schema</span>;
                              } catch (error) {
                                return <span className="text-xs text-red-400">⚠ Invalid JSON Schema</span>;
                              }
                            })()}
                          </div>
                          <button
                            onClick={() => {
                              setJsonSchemaContent('');
                            }}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  

                  
                  <div className="text-xs text-purple-300 space-y-1">
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Run Prompt Button */}
          <div className="flex justify-center mb-8">
            <div className="text-center">
                <button
                  onClick={handleRunPrompt}
                  disabled={loading || !selectedProvider || !selectedModel || !promptData.text.trim() || (structuredOutput && !jsonSchemaContent)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    <span>Run Prompt</span>
                  </>
                )}
              </button>
            </div>
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
                {/* RAG Context Display */}
                {(output.rag_context || output.rag_results) && (
                  <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-300 flex items-center">
                        <BookOpenIcon className="h-4 w-4 mr-1" />
                        RAG Context Used
                      </span>
                      <span className="text-xs text-blue-400">
                        {output.rag_results?.length || 0} relevant docs found
                      </span>
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-blue-300 cursor-pointer hover:text-blue-200">
                        View retrieved context →
                      </summary>
                      <div className="mt-2 p-2 bg-slate-900/50 rounded text-xs text-slate-300 max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{output.rag_context || 'No context available'}</pre>
                      </div>
                    </details>
                    
                    {/* Show individual RAG results if available */}
                    {output.rag_results && output.rag_results.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-300 cursor-pointer hover:text-blue-200">
                          View individual documents →
                        </summary>
                        <div className="mt-2 space-y-2">
                          {output.rag_results.map((result, index) => (
                            <div key={index} className="p-2 bg-slate-900/50 rounded border border-slate-700">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-blue-200">Document #{index + 1}</span>
                                <span className="text-xs text-slate-400">
                                  Score: {(result.score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="text-xs text-slate-300 max-h-20 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{result.content || 'No content available'}</pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Response</span>
                  <div className="flex items-center space-x-2">
                    {/* Report View Mode Toggle for Structured Output */}
                    {structuredOutput && output.output_text && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setReportViewMode('json')}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            reportViewMode === 'json' 
                              ? 'bg-purple-600 text-white border-purple-500' 
                              : 'text-slate-400 border-slate-600 hover:text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          JSON
                        </button>
                        <button
                          onClick={() => setReportViewMode('formatted')}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            reportViewMode === 'formatted' 
                              ? 'bg-purple-600 text-white border-purple-500' 
                              : 'text-slate-400 border-slate-600 hover:text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          Report
                        </button>

                      </div>
                    )}
                    
                    {/* Markdown/Plain Text Toggle */}
                    {output.output_text && isMarkdownContent(output.output_text) && (
                      <button
                        onClick={() => setRenderAsMarkdown(!renderAsMarkdown)}
                        className="text-slate-400 hover:text-slate-300 text-xs px-2 py-1 rounded border border-slate-600 hover:border-slate-500"
                      >
                        {renderAsMarkdown ? '📝 Plain' : '🎨 Markdown'}
                      </button>
                    )}
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
                
                {/* Conditional Rendering: Structured Output Report, Markdown, or Plain Text */}
                {output.output_text && (
                  <>
                    {/* Structured Output Report View */}
                    {structuredOutput && reportViewMode === 'formatted' && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-purple-300">📋 Formatted Report (Ordered by Schema)</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => copyToClipboard(generateFormattedReport(output.output_text, jsonSchemaContent))}
                              className="text-purple-400 hover:text-purple-300 text-xs"
                            >
                              Copy Report
                            </button>
                            <button
                              onClick={() => exportFormattedReport(output.output_text, `${promptData.title || 'report'}-${new Date().toISOString().split('T')[0]}.txt`, jsonSchemaContent)}
                              className="text-purple-400 hover:text-purple-300 text-xs"
                            >
                              Export TXT
                            </button>
                          </div>
                        </div>
                        <div className="bg-slate-900 border border-purple-500/30 rounded-lg p-4">
                          <pre className="whitespace-pre-wrap text-sm text-slate-200 font-mono">
                            {generateFormattedReport(output.output_text, jsonSchemaContent)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* JSON View (for structured output) or Original Content */}
                    {(reportViewMode === 'json' || !structuredOutput) && (
                      <div>
                        {structuredOutput && reportViewMode === 'json' && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-300">🔧 JSON Response</span>
                          </div>
                        )}
                        
                        {isMarkdownContent(output.output_text) && renderAsMarkdown ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                // Custom styling for markdown elements
                                h1: ({node, children, ...props}) => <h1 className="text-2xl font-bold text-white mb-4 mt-6 border-b border-slate-600 pb-2" {...props}>{children}</h1>,
                                h2: ({node, children, ...props}) => <h2 className="text-xl font-semibold text-white mb-3 mt-5" {...props}>{children}</h2>,
                                h3: ({node, children, ...props}) => <h3 className="text-lg font-medium text-white mb-2 mt-4" {...props}>{children}</h3>,
                                h4: ({node, children, ...props}) => <h4 className="text-base font-medium text-white mb-2 mt-3" {...props}>{children}</h4>,
                                h5: ({node, children, ...props}) => <h5 className="text-sm font-medium text-white mb-1 mt-2" {...props}>{children}</h5>,
                                h6: ({node, children, ...props}) => <h6 className="text-sm font-medium text-slate-300 mb-1 mt-2" {...props}>{children}</h6>,
                                p: ({node, ...props}) => <p className="text-slate-200 mb-3 leading-relaxed" {...props} />,
                                strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                                em: ({node, ...props}) => <em className="text-slate-300 italic" {...props} />,
                                ul: ({node, ...props}) => <ul className="text-slate-200 mb-3 ml-4 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="text-slate-200 mb-3 ml-4 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="text-slate-200" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-slate-800/50 text-slate-300 italic" {...props} />,
                                code: ({node, inline, ...props}) => 
                                  inline 
                                    ? <code className="bg-slate-700 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                    : <code className="block bg-slate-900 text-slate-200 p-3 rounded-lg text-sm font-mono overflow-x-auto" {...props} />,
                                pre: ({node, ...props}) => <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4" {...props} />,
                                a: ({node, children, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>,
                                table: ({node, ...props}) => <table className="w-full border-collapse border border-slate-600 mb-4" {...props} />,
                                th: ({node, ...props}) => <th className="border border-slate-600 px-3 py-2 bg-slate-800 text-white font-semibold text-left" {...props} />,
                                td: ({node, ...props}) => <td className="border border-slate-600 px-3 py-2 text-slate-200" {...props} />,
                                hr: ({node, ...props}) => <hr className="border-slate-600 my-6" {...props} />,
                              }}
                            >
                              {output.output_text}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <pre className="whitespace-pre-wrap text-sm text-slate-200 font-mono">
                            {output.output_text}
                          </pre>
                        )}
                      </div>
                    )}
                  </>
                )}
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
  );
};

export default PromptEditor;
