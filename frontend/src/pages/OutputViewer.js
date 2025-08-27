import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const OutputViewer = () => {
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOutputs();
  }, []);

  const fetchOutputs = async () => {
    try {
      setLoading(true);
      // This would be replaced with actual API call when backend is ready
      // const response = await apiService.getOutputs();
      // setOutputs(response.data);
      
      // Mock data for now
      setOutputs([
        {
          id: 1,
          prompt: {
            title: 'Sample Prompt 1',
            text: 'Write a short story about a robot learning to paint.',
            provider: { name: 'openai' },
            model: { name: 'gpt-4' }
          },
          output_text: 'Once upon a time, in a world where robots and humans coexisted, there lived a curious robot named Pixel. Unlike other robots who were content with their assigned tasks, Pixel had a burning desire to create art...',
          latency_ms: 2450.5,
          cost_usd: 0.0234,
          token_usage: { input: 15, output: 156, total: 171 },
          created_at: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          prompt: {
            title: 'Sample Prompt 2',
            text: 'Explain quantum computing in simple terms.',
            provider: { name: 'groq' },
            model: { name: 'llama2-70b' }
          },
          output_text: 'Quantum computing is like having a super-powered computer that can solve certain problems much faster than regular computers. Think of it like this: while a regular computer uses bits that are either 0 or 1...',
          latency_ms: 1200.3,
          cost_usd: 0.0156,
          token_usage: { input: 12, output: 89, total: 101 },
          created_at: '2024-01-15T09:15:00Z'
        }
      ]);
    } catch (error) {
      console.error('Error fetching outputs:', error);
      toast.error('Failed to fetch outputs');
    } finally {
      setLoading(false);
    }
  };

  const filteredOutputs = outputs.filter(output =>
    output.prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    output.prompt.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    output.output_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const viewOutput = (output) => {
    setSelectedOutput(output);
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outputs</h1>
          <p className="mt-2 text-sm text-gray-700">
            Browse and manage all your prompt outputs and results.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search outputs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary inline-flex items-center">
              <FunnelIcon className="mr-2 h-4 w-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Outputs List */}
      {loading ? (
        <div className="card">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredOutputs.length === 0 ? (
        <div className="card text-center py-12">
          <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No outputs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Run some prompts to see outputs here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOutputs.map((output) => (
            <div key={output.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {output.prompt.title}
                    </h3>
                    <span className="status-badge info capitalize">
                      {output.prompt.provider.name}
                    </span>
                    <span className="status-badge success">
                      {output.prompt.model.name}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {output.prompt.text}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {formatDate(output.created_at)}
                    </div>
                    {output.latency_ms && (
                      <span>{output.latency_ms.toFixed(0)}ms</span>
                    )}
                    {output.cost_usd && (
                      <span>${output.cost_usd.toFixed(4)}</span>
                    )}
                    {output.token_usage && (
                      <span>{output.token_usage.total} tokens</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => viewOutput(output)}
                    className="btn-secondary p-2"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(output.output_text)}
                    className="btn-secondary p-2"
                    title="Copy output"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {output.output_text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Output Detail Modal */}
      {showModal && selectedOutput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedOutput.prompt.title}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Prompt Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Prompt</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
                    {selectedOutput.prompt.text}
                  </pre>
                </div>
              </div>

              {/* Output */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Output</h3>
                  <button
                    onClick={() => copyToClipboard(selectedOutput.output_text)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Copy
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
                    {selectedOutput.output_text}
                  </pre>
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Metadata</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Provider</p>
                    <p className="font-medium capitalize">{selectedOutput.prompt.provider.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Model</p>
                    <p className="font-medium">{selectedOutput.prompt.model.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Latency</p>
                    <p className="font-medium">{selectedOutput.latency_ms?.toFixed(2)}ms</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Cost</p>
                    <p className="font-medium">${selectedOutput.cost_usd?.toFixed(4)}</p>
                  </div>
                  {selectedOutput.token_usage && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Input Tokens</p>
                        <p className="font-medium">{selectedOutput.token_usage.input}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Output Tokens</p>
                        <p className="font-medium">{selectedOutput.token_usage.output}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-500">Total Tokens</p>
                        <p className="font-medium">{selectedOutput.token_usage.total}</p>
                      </div>
                    </>
                  )}
                  {selectedOutput.response_metadata && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-sm text-gray-500">Response Metadata</p>
                      <p className="font-medium text-xs">
                        {JSON.stringify(selectedOutput.response_metadata, null, 2)}
                      </p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium">{formatDate(selectedOutput.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutputViewer;
