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
  
  // Judge endpoints
  runJudge: (data) => api.post('/api/judge', data),
  getEvaluations: (params) => api.get('/api/evaluations', { params }),
  getEvaluation: (id) => api.get(`/api/evaluations/${id}`),
  getOutputEvaluations: (outputId) => api.get(`/api/outputs/${outputId}/evaluations`),
  
  // Experiment endpoints
  getExperiments: (params) => api.get('/api/experiments', { params }),
  getExperiment: (id) => api.get(`/api/experiments/${id}`),
  createExperiment: (data) => api.post('/api/experiments', data),
  updateExperiment: (id, data) => api.put(`/api/experiments/${id}`, data),
  deleteExperiment: (id) => api.delete(`/api/experiments/${id}`),
  startExperiment: (id) => api.post(`/api/experiments/${id}/start`),
  addOptimizationCycle: (experimentId, data) => api.post(`/api/experiments/${experimentId}/cycles`, data),
  getOptimizationCycles: (experimentId) => api.get(`/api/experiments/${experimentId}/cycles`),
  
  // Model Card endpoints
  getModelCards: (params) => api.get('/api/model-cards', { params }),
  getModelCard: (id) => api.get(`/api/model-cards/${id}`),
  createModelCard: (data) => api.post('/api/model-cards', data),
  updateModelCard: (id, data) => api.put(`/api/model-cards/${id}`, data),
  deleteModelCard: (id) => api.delete(`/api/model-cards/${id}`),
  generateModelCard: (data) => api.post('/api/model-cards/generate', data),
  exportModelCard: (id, format) => api.post(`/api/model-cards/${id}/export`, null, { params: { format } }),
  publishModelCard: (id) => api.post(`/api/model-cards/${id}/publish`),
  
  // Health check 
  healthCheck: () => api.get('/api/health'),
};

export default api;


const apiServiceExtensions = {
  // Get a specific prompt
  getPrompt: (promptId) => {
    return api.get(`/prompts/${promptId}`);
  },

  // Create a new prompt
  createPrompt: (promptData) => {
    return api.post('/prompts', promptData);
  },

  // Update an existing prompt
  updatePrompt: (promptId, promptData) => {
    return api.put(`/prompts/${promptId}`, promptData);
  },

  // Get prompt versions
  getPromptVersions: (promptId) => {
    return api.get(`/prompts/${promptId}/versions`);
  },

  // Lock a prompt version
  lockPromptVersion: (promptId, versionData) => {
    return api.post(`/prompts/${promptId}/versions`, versionData);
  },

  // Get all outputs
  getOutputs: () => {
    return api.get('/outputs');
  },

  // Get outputs for a specific prompt
  getPromptOutputs: (promptId) => {
    return api.get(`/prompts/${promptId}/outputs`);
  },

  // Get a specific output
  getOutput: (outputId) => {
    return api.get(`/outputs/${outputId}`);
  },

  // Test form data (for debugging)
  testFormData: (data) => {
    const formData = new FormData();
    
    // Add regular fields
    Object.keys(data).forEach(key => {
      if (key !== 'files' && data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    
    // Add files
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    return api.post('/test-form-data', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Enhanced runPrompt method with file support
  runPrompt: (data) => {
    const formData = new FormData();
    
    // Add all form fields
    const fields = [
      'prompt_id', 'provider_id', 'model_id', 'text', 'title', 
      'system_prompt', 'temperature', 'max_tokens', 'include_file_content', 
      'file_content_prefix'
    ];
    
    fields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null) {
        formData.append(field, data[field]);
      }
    });
    
    // Add files
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    // Add images
    if (data.images && data.images.length > 0) {
      data.images.forEach(image => {
        formData.append('images', image);
      });
    }
    
    return api.post('/run', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get supported file types
  getSupportedFileTypes: () => {
    return api.get('/supported-file-types');
  }
};

// If you're using a module system, export these extensions
// or merge them with your existing apiService object

export { apiServiceExtensions };