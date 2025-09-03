import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PromptEngineering from './pages/PromptEngineering';
import PromptEditor from './components/PromptEditor';
import ChatPage from './pages/ChatPage';
import KnowledgeBase from './pages/KnowledgeBase';
import { ProviderProvider } from './contexts/ProviderContext';
import { PromptProvider } from './contexts/PromptContext';
import { ChatProvider } from './contexts/ChatContext';

function App() {
  return (
    <ProviderProvider>
      <PromptProvider>
        <ChatProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<PromptEngineering />} />
              <Route path="/editor/new" element={<PromptEditor />} />
              <Route path="/editor/:promptId" element={<PromptEditor />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
            </Routes>
          </Layout>
        </ChatProvider>
      </PromptProvider>
    </ProviderProvider>
  );
}

export default App;
