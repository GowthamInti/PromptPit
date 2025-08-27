import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PromptEngineering from './pages/PromptEngineering';
import PromptEditor from './components/PromptEditor';
import Experiments from './pages/Experiments';
import ModelCards from './pages/ModelCards';
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
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/model-cards" element={<ModelCards />} />
          </Routes>
        </Layout>
      </PromptProvider>
    </ProviderProvider>
  );
}

export default App;
