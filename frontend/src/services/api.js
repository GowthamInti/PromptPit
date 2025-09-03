import axios from 'axios';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      console.error('Authentication error');
    } else if (error.response?.status === 403) {
      console.error('Authorization error');
    } else if (error.response?.status === 404) {
      console.error('Resource not found');
    } else if (error.response?.status >= 500) {
      console.error('Server error');
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Provider endpoints
  getProviders: () => api.get('/api/providers'),
  addProvider: (data) => api.post('/api/providers', data),
  refreshModels: (providerId) => api.put(`/api/providers/${providerId}/refresh-models`),
  deactivateProvider: (providerId) => api.delete(`/api/providers/${providerId}`),
  clearApiKey: (providerId) => {
    console.log('API Service: clearApiKey called with providerId:', providerId);
    return api.delete(`/api/providers/${providerId}/api-key`);
  },
  permanentlyDeleteProvider: (providerId) => api.delete(`/api/providers/${providerId}/permanent`),
  addProviderAndRefreshModels: async (data) => {
    // Add provider (which now automatically refreshes models)
    const response = await api.post('/api/providers', data);
    return response;
  },
  
  // Model endpoints
  getModels: (provider) => api.get('/api/models', { params: { provider } }),
  
  // Prompt endpoints
  getPrompts: () => api.get('/api/prompts'),
  getPrompt: (id) => api.get(`/api/prompts/${id}`),
  createPrompt: (data) => api.post('/api/prompts', data),
  updatePrompt: (id, data) => api.put(`/api/prompts/${id}`, data),
  deletePrompt: (id) => api.delete(`/api/prompts/${id}`),
  runPrompt: (data) => {
    const formData = new FormData();
    
    // Add all the prompt data with proper type conversion
    Object.keys(data).forEach(key => {
      if (key !== 'files' && key !== 'images') {
        let value = data[key];
        // Convert boolean to string for FormData
        if (typeof value === 'boolean') {
          value = value.toString();
        }
        // Convert numbers to string for FormData
        if (typeof value === 'number') {
          value = value.toString();
        }
        // Handle null/undefined values
        if (value === null || value === undefined) {
          value = '';
        }
        formData.append(key, value);
      }
    });
    
    // Add files if present
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

    // Add images if present
    if (data.images && data.images.length > 0) {
      data.images.forEach(image => {
        formData.append('images', image);
      });
    }
    
    return api.post('/api/run', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  runPromptWithProvider: (data, providerId, modelId) => {
    const formData = new FormData();
    
    // Add provider and model IDs
    formData.append('provider_id', providerId);
    formData.append('model_id', modelId);
    
    // Add all the prompt data with proper type conversion
    Object.keys(data).forEach(key => {
      if (key !== 'files' && key !== 'images') {
        let value = data[key];
        // Convert boolean to string for FormData
        if (typeof value === 'boolean') {
          value = value.toString();
        }
        // Convert numbers to string for FormData
        if (typeof value === 'number') {
          value = value.toString();
        }
        // Handle null/undefined values
        if (value === null || value === undefined) {
          value = '';
        }
        formData.append(key, value);
      }
    });
    
    // Add files if present
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

    // Add images if present
    if (data.images && data.images.length > 0) {
      data.images.forEach(image => {
        formData.append('images', image);
      });
    }
    
    return api.post('/api/run', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getSupportedFileTypes: () => api.get('/api/supported-file-types'),
  testFormData: (data) => {
    const formData = new FormData();
    
    // Add all the prompt data with proper type conversion
    Object.keys(data).forEach(key => {
      if (key !== 'files') {
        let value = data[key];
        if (typeof value === 'boolean') {
          value = value.toString();
        }
        if (typeof value === 'number') {
          value = value.toString();
        }
        if (value === null || value === undefined) {
          value = '';
        }
        formData.append(key, value);
      }
    });
    
    // Add files if present
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    return api.post('/api/test-form-data', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getPromptOutputs: (promptId) => api.get(`/api/prompts/${promptId}/outputs`),
  getOutput: (outputId) => api.get(`/api/outputs/${outputId}`),
  
  // Knowledge Base endpoints
  getKnowledgeBases: () => api.get('/api/knowledge-bases'),
  createKnowledgeBase: (data) => api.post('/api/knowledge-bases', data),
  getKnowledgeBase: (kbId) => api.get(`/api/knowledge-bases/${kbId}`),
  updateKnowledgeBase: (kbId, data) => api.put(`/api/knowledge-bases/${kbId}`, data),
  deleteKnowledgeBase: (kbId) => api.delete(`/api/knowledge-bases/${kbId}`),
  
  // Content endpoints (ChromaDB-based only)
  getKnowledgeBaseContents: (kbId) => api.get(`/api/knowledge-bases/${kbId}/contents/chroma`),
  getKnowledgeBaseContent: (kbId, contentId) => api.get(`/api/knowledge-bases/${kbId}/contents/${contentId}/chroma`),
  deleteKnowledgeBaseContent: (kbId, contentId) => api.delete(`/api/knowledge-bases/${kbId}/contents/${contentId}`),
  
  // Content processing endpoints
  getProcessingStatus: (kbId, contentId) => api.get(`/api/knowledge-bases/${kbId}/contents/${contentId}/status`),
  
  // Chat endpoints
  startChatConversation: (sessionId, systemPrompt) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    if (systemPrompt) {
      formData.append('system_prompt', systemPrompt);
    }
    return api.post('/api/chat/start', formData);
  },

  sendChatMessage: (message, sessionId, providerId, modelId, systemPrompt, files = [], images = []) => {
    const formData = new FormData();
    formData.append('message', message);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }
    formData.append('provider_id', providerId);
    formData.append('model_id', modelId);
    if (systemPrompt) {
      formData.append('system_prompt', systemPrompt);
    }
    
    // Add files to FormData
    if (files && files.length > 0) {
      files.forEach((file, index) => {
        formData.append('files', file);
      });
    }
    
    // Add images to FormData
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        formData.append('images', image);
      });
    }
    
    return api.post('/api/chat/send', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getChatHistory: (sessionId, limit = 50) => api.get(`/api/chat/${sessionId}/history?limit=${limit}`),
  clearChatConversation: (sessionId) => api.delete(`/api/chat/${sessionId}`),
  updateChatSystemPrompt: (sessionId, systemPrompt) => api.put(`/api/chat/${sessionId}/system-prompt`, { system_prompt: systemPrompt }),
  getActiveChatConversations: () => api.get('/api/chat/active'),
  getChatConversationStatus: (sessionId) => api.get(`/api/chat/${sessionId}/status`),
  
  // Search endpoints
  searchKnowledgeBase: (kbId, data) => api.post(`/api/knowledge-bases/${kbId}/search`, data),
  getRagPreview: (data) => {
    const formData = new FormData();
    formData.append('knowledge_base_id', data.knowledge_base_id);
    formData.append('query', data.query);
    
    return api.post('/api/rag-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  addContentToKnowledgeBase: (data, kbId) => {
    const formData = new FormData();
    
    // Debug logging
    console.log('addContentToKnowledgeBase called with:', { data, kbId });
    
    // Ensure required parameters are present
    if (!data.summary) {
      throw new Error('Summary is required for adding content to knowledge base');
    }
    
    // Add all the data with proper type conversion
    Object.keys(data).forEach(key => {
      let value = data[key];
      // Convert boolean to string for FormData
      if (typeof value === 'boolean') {
        value = value.toString();
      }
      // Convert numbers to string for FormData
      if (typeof value === 'number') {
        value = value.toString();
      }
      // Handle null/undefined values
      if (value === null || value === undefined) {
        value = '';
      }
      formData.append(key, value);
      console.log(`FormData: ${key} = ${value}`);
    });
    
    return api.post(`/api/knowledge-bases/${kbId}/add-content`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  runLLMWithFiles: (data) => {
    const formData = new FormData();
    
    // Add all the data with proper type conversion
    Object.keys(data).forEach(key => {
      if (key !== 'files' && key !== 'images') {
        let value = data[key];
        // Convert boolean to string for FormData
        if (typeof value === 'boolean') {
          value = value.toString();
        }
        // Convert numbers to string for FormData
        if (typeof value === 'number') {
          value = value.toString();
        }
        // Handle null/undefined values
        if (value === null || value === undefined) {
          value = '';
        }
        formData.append(key, value);
      }
    });
    
    // Add files if present
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

    // Add images if present
    if (data.images && data.images.length > 0) {
      data.images.forEach(image => {
        formData.append('images', image);
      });
    }
    
    return api.post('/api/run', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Health check 
  healthCheck: () => api.get('/api/health'),
  
  // Individual prompt export/import
  exportPrompt: (promptId, format = 'json', includeVersions = true, includeOutputs = true) => 
    api.get(`/api/prompts/${promptId}/export`, { 
      params: { format, include_versions: includeVersions, include_outputs: includeOutputs } 
    }),
  importPrompt: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/prompts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export default apiService;