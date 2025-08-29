import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PromptEngineering from './pages/PromptEngineering';
import PromptEditor from './components/PromptEditor';
import KnowledgeBase from './pages/KnowledgeBase';
import { ProviderProvider } from './contexts/ProviderContext';
import { PromptProvider } from './contexts/PromptContext';

function App() {
  return (
    <ProviderProvider>
      <PromptProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor" element={<PromptEngineering />} />
            <Route path="/editor/new" element={<PromptEditor />} />
            <Route path="/editor/:promptId" element={<PromptEditor />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
          </Routes>
        </Layout>
      </PromptProvider>
    </ProviderProvider>
  );
}

export default App;
