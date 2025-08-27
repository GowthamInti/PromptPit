import React, { useState, useEffect } from 'react';
import { 
  EyeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VersionHistory = () => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([]);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      setPrompts([
        {
          id: 1,
          uuid: 'prompt-1',
          title: 'Story Writing Prompt',
          versions: [
            {
              id: 1,
              version: 1,
              text: 'Write a short story about a robot learning to paint.',
              system_prompt: 'You are a creative storyteller.',
              temperature: 0.7,
              max_tokens: 1000,
              created_at: '2024-01-15T10:30:00Z',
              outputs: [
                {
                  id: 1,
                  output_text: 'Once upon a time, in a world where robots and humans coexisted...',
                  latency_ms: 2450.5,
                  cost_usd: 0.0234,
                  evaluations: [
                    { score: 8.5, feedback: 'Excellent creativity and coherence' }
                  ]
                }
              ]
            },
            {
              id: 2,
              version: 2,
              text: 'Write a short story about a robot learning to paint with more emotional depth.',
              system_prompt: 'You are a creative storyteller who focuses on emotional narratives.',
              temperature: 0.8,
              max_tokens: 1200,
              created_at: '2024-01-15T11:45:00Z',
              outputs: [
                {
                  id: 2,
                  output_text: 'In a world where metal hearts could feel, there lived a robot named Pixel...',
                  latency_ms: 2800.2,
                  cost_usd: 0.0289,
                  evaluations: [
                    { score: 9.2, feedback: 'Outstanding emotional depth and character development' }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 2,
          uuid: 'prompt-2',
          title: 'Technical Explanation Prompt',
          versions: [
            {
              id: 3,
              version: 1,
              text: 'Explain quantum computing in simple terms.',
              system_prompt: 'You are a patient teacher.',
              temperature: 0.3,
              max_tokens: 800,
              created_at: '2024-01-15T09:15:00Z',
              outputs: [
                {
                  id: 3,
                  output_text: 'Quantum computing is like having a super-powered computer...',
                  latency_ms: 1200.3,
                  cost_usd: 0.0156,
                  evaluations: [
                    { score: 7.8, feedback: 'Good explanation but could be more accessible' }
                  ]
                }
              ]
            }
          ]
        }
      ]);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast.error('Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (versionId) => {
    if (compareMode) {
      setSelectedVersions(prev => {
        if (prev.includes(versionId)) {
          return prev.filter(id => id !== versionId);
        } else if (prev.length < 2) {
          return [...prev, versionId];
        } else {
          return [prev[1], versionId];
        }
      });
    } else {
      setSelectedPrompt(prompts.find(p => p.versions.some(v => v.id === versionId)));
    }
  };

  const getAverageScore = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return null;
    const sum = evaluations.reduce((acc, evaluation) => acc + evaluation.score, 0);
    return (sum / evaluations.length).toFixed(1);
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-success-600';
    if (score >= 6) return 'text-warning-600';
    return 'text-error-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Version History</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and compare different versions of your prompts with their outputs and evaluations.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`btn-secondary inline-flex items-center ${compareMode ? 'bg-primary-100 text-primary-700' : ''}`}
          >
            <ChartBarIcon className="mr-2 h-4 w-4" />
            {compareMode ? 'Exit Compare' : 'Compare Versions'}
          </button>
        </div>
      </div>

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
      ) : (
        <div className="space-y-6">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium text-gray-900">{prompt.title}</h2>
                <p className="text-sm text-gray-500">
                  {prompt.versions.length} version{prompt.versions.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-4">
                {prompt.versions.map((version) => {
                  const isSelected = compareMode ? selectedVersions.includes(version.id) : selectedPrompt?.id === prompt.id;
                  const averageScore = getAverageScore(version.outputs[0]?.evaluations);
                  
                  return (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-4 transition-colors duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleVersionSelect(version.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              Version {version.version}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(version.created_at).toLocaleDateString()}
                            </span>
                            {compareMode && selectedVersions.includes(version.id) && (
                              <span className="status-badge success text-xs">Selected</span>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Prompt:</p>
                              <p className="text-sm text-gray-900 bg-gray-50 rounded p-2 font-mono">
                                {version.text}
                              </p>
                            </div>

                            {version.system_prompt && (
                              <div>
                                <p className="text-sm text-gray-600 mb-1">System Prompt:</p>
                                <p className="text-sm text-gray-900 bg-gray-50 rounded p-2 font-mono">
                                  {version.system_prompt}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Temperature:</span>
                                <span className="ml-1 font-medium">{version.temperature}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Max Tokens:</span>
                                <span className="ml-1 font-medium">{version.max_tokens}</span>
                              </div>
                              {averageScore && (
                                <div>
                                  <span className="text-gray-500">Avg Score:</span>
                                  <span className={`ml-1 font-medium ${getScoreColor(averageScore)}`}>
                                    {averageScore}/10
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // View version details
                            }}
                            className="btn-secondary p-2"
                            title="View details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Output Preview */}
                      {version.outputs[0] && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600 mb-2">Output Preview:</p>
                          <p className="text-sm text-gray-700 bg-gray-50 rounded p-3 line-clamp-3">
                            {version.outputs[0].output_text}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{version.outputs[0].latency_ms?.toFixed(0)}ms</span>
                            <span>${version.outputs[0].cost_usd?.toFixed(4)}</span>
                            {version.outputs[0].evaluations?.length > 0 && (
                              <span>{version.outputs[0].evaluations.length} evaluation{version.outputs[0].evaluations.length !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compare Modal */}
      {compareMode && selectedVersions.length === 2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Compare Versions</h2>
                <button
                  onClick={() => setCompareMode(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {selectedVersions.map((versionId) => {
                  const prompt = prompts.find(p => p.versions.some(v => v.id === versionId));
                  const version = prompt?.versions.find(v => v.id === versionId);
                  
                  if (!version) return null;
                  
                  return (
                    <div key={versionId} className="space-y-4">
                      <div className="card">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          {prompt.title} - Version {version.version}
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Prompt</h4>
                            <div className="bg-gray-50 rounded p-3">
                              <pre className="text-sm text-gray-900 font-mono whitespace-pre-wrap">
                                {version.text}
                              </pre>
                            </div>
                          </div>

                          {version.outputs[0] && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Output</h4>
                              <div className="bg-gray-50 rounded p-3">
                                <pre className="text-sm text-gray-900 font-mono whitespace-pre-wrap">
                                  {version.outputs[0].output_text}
                                </pre>
                              </div>
                            </div>
                          )}

                          {version.outputs[0]?.evaluations?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Evaluations</h4>
                              <div className="space-y-2">
                                {version.outputs[0].evaluations.map((evaluation, index) => (
                                  <div key={index} className="bg-gray-50 rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`font-medium ${getScoreColor(evaluation.score)}`}>
                                        {evaluation.score}/10
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{evaluation.feedback}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistory;
