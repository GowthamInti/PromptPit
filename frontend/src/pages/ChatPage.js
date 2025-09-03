import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  XMarkIcon,
  DocumentIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { useProviders } from '../contexts/ProviderContext';
import { useChat } from '../contexts/ChatContext';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

const ChatPage = () => {
  const navigate = useNavigate();
  const { providers, models, selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = useProviders();
  const { 
    startConversation, 
    sendMessage, 
    getCurrentMessages, 
    clearConversation, 
    loading: chatLoading,
    activeSessionId 
  } = useChat();

  // Chat states
  const [inputMessage, setInputMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [renderAsMarkdown] = useState(true);
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);


  // Refs for file inputs
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const messagesEndRef = useRef(null);
    // Update messages when they change
  useEffect(() => {
    setMessages(getCurrentMessages());
  }, [getCurrentMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file uploads
  const handleFileUpload = (files, isImage = false) => {
    const validFiles = Array.from(files).filter(file => {
      if (isImage) {
        return file.type.startsWith('image/');
      } else {
        return file.type === 'application/pdf' || 
               file.type === 'text/plain' || 
               file.type === 'application/msword' ||
               file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    });

    if (isImage) {
      setUploadedImages(prev => [...prev, ...validFiles]);
    } else {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const images = files.filter(file => file.type.startsWith('image/'));
    const documents = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'text/plain' || 
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    if (images.length > 0) {
      handleFileUpload(images, true);
    }
    if (documents.length > 0) {
      handleFileUpload(documents, false);
    }
  };



  // Handle file input change
  const handleFileInputChange = (e, isImage = false) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files, isImage);
  };

  // Remove uploaded file
  const removeFile = (index, isImage = false) => {
    if (isImage) {
      setUploadedImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedProvider || !selectedModel) {
      toast.error('Please enter a message and select a provider/model');
      return;
    }

    try {
      // Start conversation if none exists
      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = await startConversation();
      }

      // Send message through chat context
      await sendMessage(
        inputMessage,
        selectedProvider.id,
        selectedModel.id,
        sessionId,
        uploadedFiles,
        uploadedImages
      );

      setInputMessage('');
      
      // Clear uploaded files after successful send
      setUploadedFiles([]);
      setUploadedImages([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear chat
  const clearChat = async () => {
    if (window.confirm('Are you sure you want to clear the chat? This action cannot be undone.')) {
      try {
        if (activeSessionId) {
          await clearConversation(activeSessionId);
        }
        setUploadedFiles([]);
        setUploadedImages([]);
      } catch (error) {
        console.error('Error clearing chat:', error);
        toast.error('Failed to clear chat');
      }
    }
  };

  // Check if content is markdown
  const isMarkdownContent = (content) => {
    const markdownPatterns = [
      /^#+\s+/m,           // Headers
      /\*\*.*\*\*/,        // Bold
      /\*.*\*/,            // Italic
      /\[.*\]\(.*\)/,      // Links
      /```[\s\S]*```/,     // Code blocks
      /^\s*[-*+]\s+/m,     // Lists
      /^\s*\d+\.\s+/m      // Numbered lists
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-900">
      {/* Header with Provider/Model Selection */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">💬 Chat</h1>
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

                {/* Provider and Model Selection */}
        <div className="flex items-center justify-between">
          {/* Provider/Model Capsule */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowModelConfig(!showModelConfig)}
              className="bg-slate-700 hover:bg-slate-600 rounded-full px-4 py-2 flex items-center space-x-2 transition-colors"
            >
              <span className="text-sm text-white">
                {selectedProvider?.name || 'No Provider'} / {selectedModel?.name || 'No Model'}
              </span>
            </button>
          </div>

          {/* Clear Chat Button */}
          <button
            onClick={clearChat}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Clear Chat
          </button>
        </div>

        {/* Model Configuration Dropdown */}
        {showModelConfig && (
          <div className="bg-slate-700 text-white px-6 py-4 border-b border-slate-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <select
                  value={selectedProvider?.id || ''}
                  onChange={(e) => {
                    const providerId = parseInt(e.target.value);
                    const provider = providers.find(p => p.id === providerId);
                    setSelectedProvider(provider);
                    setSelectedModel(null); // Reset model when provider changes
                  }}
                  className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <select
                  value={selectedModel?.id || ''}
                  onChange={(e) => {
                    const modelId = parseInt(e.target.value);
                    const model = models.find(m => m.id === modelId);
                    setSelectedModel(model);
                  }}
                  disabled={!selectedProvider}
                  className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Model</option>
                  {selectedProvider && models
                    .filter(model => model.provider_id === selectedProvider.id)
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
      </div>

      {/* Chat Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {getCurrentMessages().length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">Start a Conversation</h2>
              <p>Conversational bot with current session memory</p>
            </div>
          </div>
                  ) : (
            getCurrentMessages().map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="whitespace-pre-wrap">
                    {message.role === 'assistant' && isMarkdownContent(message.content) && renderAsMarkdown ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        className="prose prose-invert prose-sm max-w-none"
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )}
                    
                    {/* Display attached files and images if they exist */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <div className="text-sm text-slate-300 mb-2">📎 Attached files:</div>
                        <div className="flex flex-wrap gap-2">
                          {message.files.map((file, index) => (
                            <div key={index} className="flex items-center bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                              <DocumentIcon className="h-3 w-3 mr-1" />
                              {file.name || `File ${index + 1}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {message.images && message.images.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <div className="text-sm text-slate-300 mb-2">🖼️ Attached images:</div>
                        <div className="flex flex-wrap gap-2">
                          {message.images.map((image, index) => (
                            <div key={index} className="flex items-center bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                              <PhotoIcon className="h-3 w-3 mr-1" />
                              {image.name || `Image ${index + 1}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Area */}
      {(uploadedFiles.length > 0 || uploadedImages.length > 0) && (
        <div className="px-4 py-2 bg-slate-800 border-t border-slate-700">
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center bg-slate-700 text-slate-200 px-3 py-1 rounded-full text-sm">
                <DocumentIcon className="h-4 w-4 mr-2" />
                {file.name}
                <button
                  onClick={() => removeFile(index, false)}
                  className="ml-2 text-slate-400 hover:text-red-400"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            {uploadedImages.map((file, index) => (
              <div key={index} className="flex items-center bg-slate-700 text-slate-200 px-3 py-1 rounded-full text-sm">
                <PhotoIcon className="h-4 w-4 mr-2" />
                {file.name}
                <button
                  onClick={() => removeFile(index, true)}
                  className="ml-2 text-slate-400 hover:text-red-400"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="flex items-end space-x-4">
          {/* File Upload Buttons */}
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileInputChange(e, false)}
              className="hidden"
              multiple
              accept=".pdf,.txt,.doc,.docx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              title="Attach documents"
            >
              <DocumentIcon className="h-5 w-5" />
            </button>

            <input
              type="file"
              ref={imageInputRef}
              onChange={(e) => handleFileInputChange(e, true)}
              className="hidden"
              multiple
              accept="image/*"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              title="Attach images"
            >
              <PhotoIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Message Input with Drag & Drop */}
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
              className={`w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 ${
                isDragOver ? 'border-blue-400 bg-slate-600 ring-2 ring-blue-400' : ''
              }`}
              rows={3}
              disabled={chatLoading || !selectedProvider || !selectedModel}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
            
            {/* Drag & Drop Overlay */}
            {isDragOver && (
              <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center pointer-events-none">
                <div className="text-center text-blue-400">
                  <div className="text-2xl mb-2">📁</div>
                  <div className="font-medium">Drop files here</div>
                  <div className="text-sm opacity-75">Images and documents</div>
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || chatLoading || !selectedProvider || !selectedModel}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chatLoading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
            )}
            Send
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-2 text-xs text-slate-400">
          {!selectedProvider || !selectedModel ? (
            <span className="text-yellow-400">⚠️ Please select a provider and model to start chatting</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
