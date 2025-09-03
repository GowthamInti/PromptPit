import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState({});
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Start a new conversation
  const startConversation = useCallback(async (systemPrompt = null) => {
    try {
      setLoading(true);
      
      // Generate session ID on frontend
      const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await apiService.startChatConversation(newSessionId, systemPrompt);
      
      const newConversation = {
        session_id: newSessionId,
        messages: [],
        system_prompt: response.data.system_prompt,
        created_at: response.data.created_at,
        last_updated: new Date().toISOString()
      };
      
      setConversations(prev => ({
        ...prev,
        [newSessionId]: newConversation
      }));
      
      setActiveSessionId(newSessionId);
      return newSessionId;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message and get AI response
  const sendMessage = useCallback(async (message, providerId, modelId, sessionId = null, files = [], images = []) => {
    try {
      setLoading(true);
      
      const currentSessionId = sessionId || activeSessionId;
      if (!currentSessionId) {
        throw new Error('No active conversation session');
      }

      const response = await apiService.sendChatMessage(
        message,
        currentSessionId,
        providerId,
        modelId,
        null, // systemPrompt
        files,
        images
      );

      const { user_message, ai_message, conversation_id } = response.data;

      // Add file and image information to the user message
      const userMessageWithFiles = {
        ...user_message,
        files: files.length > 0 ? files : undefined,
        images: images.length > 0 ? images : undefined
      };

      // Update conversation with new messages
      setConversations(prev => {
        const conversation = prev[conversation_id];
        if (!conversation) return prev;

        return {
          ...prev,
          [conversation_id]: {
            ...conversation,
            messages: [...conversation.messages, userMessageWithFiles, ai_message],
            last_updated: new Date().toISOString()
          }
        };
      });

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [activeSessionId]);

  // Get conversation history
  const getConversationHistory = useCallback(async (sessionId, limit = 50) => {
    try {
      const response = await apiService.getChatHistory(sessionId, limit);
      
      // Update conversation with history
      setConversations(prev => ({
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          messages: response.data.messages,
          system_prompt: response.data.system_prompt,
          last_updated: response.data.last_updated
        }
      }));

      return response.data;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      toast.error('Failed to get conversation history');
      throw error;
    }
  }, []);

  // Clear a conversation
  const clearConversation = useCallback(async (sessionId) => {
    try {
      await apiService.clearChatConversation(sessionId);
      
      // Remove from local state
      setConversations(prev => {
        const newConversations = { ...prev };
        delete newConversations[sessionId];
        return newConversations;
      });

      // If this was the active session, clear it
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }

      toast.success('Conversation cleared');
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast.error('Failed to clear conversation');
      throw error;
    }
  }, [activeSessionId]);

  // Update system prompt
  const updateSystemPrompt = useCallback(async (sessionId, newPrompt) => {
    try {
      await apiService.updateChatSystemPrompt(sessionId, newPrompt);
      
      // Update local state
      setConversations(prev => ({
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          system_prompt: newPrompt,
          last_updated: new Date().toISOString()
        }
      }));

      toast.success('System prompt updated');
    } catch (error) {
      console.error('Error updating system prompt:', error);
      toast.error('Failed to update system prompt');
      throw error;
    }
  }, []);

  // Get active conversations
  const getActiveConversations = useCallback(async () => {
    try {
      const response = await apiService.getActiveChatConversations();
      return response.data.conversations;
    } catch (error) {
      console.error('Error getting active conversations:', error);
      toast.error('Failed to get active conversations');
      throw error;
    }
  }, []);

  // Get conversation status
  const getConversationStatus = useCallback(async (sessionId) => {
    try {
      const response = await apiService.getChatConversationStatus(sessionId);
      return response.data;
    } catch (error) {
      console.error('Error getting conversation status:', error);
      toast.error('Failed to get conversation status');
      throw error;
    }
  }, []);

  // Set active session
  const setActiveSession = useCallback((sessionId) => {
    setActiveSessionId(sessionId);
  }, []);

  // Get current conversation
  const getCurrentConversation = useCallback(() => {
    return activeSessionId ? conversations[activeSessionId] : null;
  }, [activeSessionId, conversations]);

  // Get current messages
  const getCurrentMessages = useCallback(() => {
    const conversation = getCurrentConversation();
    return conversation ? conversation.messages : [];
  }, [getCurrentConversation]);

  const value = {
    conversations,
    activeSessionId,
    loading,
    startConversation,
    sendMessage,
    getConversationHistory,
    clearConversation,
    updateSystemPrompt,
    getActiveConversations,
    getConversationStatus,
    setActiveSession,
    getCurrentConversation,
    getCurrentMessages
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
