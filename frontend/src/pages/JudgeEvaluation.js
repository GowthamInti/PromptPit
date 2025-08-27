import React, { useState, useEffect } from 'react';
import { 
  ScaleIcon,
  StarIcon,
  DocumentTextIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useProviders } from '../contexts/ProviderContext';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const JudgeEvaluation = () => {
  const { providers, models, selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = useProviders();
  const [evaluationData, setEvaluationData] = useState({
    output_id: null,
    judge_prompt: '',
    criteria: {
      relevance: true,
      accuracy: true,
      coherence: true,
      helpfulness: true,
      custom: false
    },
    custom_criteria: ''
  });
  const [outputs, setOutputs] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingOutputs, setFetchingOutputs] = useState(true);

  useEffect(() => {
    fetchOutputs();
  }, []);

  const fetchOutputs = async () => {
    try {
      setFetchingOutputs(true);
      // Mock data for now - replace with actual API call
      setOutputs([
        {
          id: 1,
          prompt: { title: 'Sample Prompt 1' },
          output_text: 'Once upon a time, in a world where robots and humans coexisted...',
          created_at: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          prompt: { title: 'Sample Prompt 2' },
          output_text: 'Quantum computing is like having a super-powered computer...',
          created_at: '2024-01-15T09:15:00Z'
        }
      ]);
    } catch (error) {
      console.error('Error fetching outputs:', error);
      toast.error('Failed to fetch outputs');
    } finally {
      setFetchingOutputs(false);
    }
  };

  const handleProviderChange = (providerId) => {
    const provider = providers.find(p => p.id === parseInt(providerId));
    setSelectedProvider(provider);
    setSelectedModel(null);
  };

  const handleModelChange = (modelId) => {
    const model = models.find(m => m.id === parseInt(modelId));
    setSelectedModel(model);
  };

  const handleCriteriaChange = (criteria) => {
    setEvaluationData(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [criteria]: !prev.criteria[criteria]
      }
    }));
  };

  const handleRunEvaluation = async () => {
    if (!selectedProvider || !selectedModel) {
      toast.error('Please select a judge provider and model');
      return;
    }

    if (!evaluationData.output_id) {
      toast.error('Please select an output to evaluate');
      return;
    }

    if (!evaluationData.judge_prompt.trim()) {
      toast.error('Please enter a judge prompt');
      return;
    }

    try {
      setLoading(true);

      const response = await apiService.runJudge({
        output_id: evaluationData.output_id,
        judge_provider_id: selectedProvider.id,
        judge_model_id: selectedModel.id,
        judge_prompt: evaluationData.judge_prompt,
        criteria: evaluationData.criteria
      });

      setEvaluations(prev => [response.data, ...prev]);
      toast.success('Evaluation completed successfully!');
      
      // Reset form
      setEvaluationData(prev => ({
        ...prev,
        output_id: null,
        judge_prompt: ''
      }));
    } catch (error) {
      console.error('Error running evaluation:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to run evaluation';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-success-600';
    if (score >= 6) return 'text-warning-600';
    return 'text-error-600';
  };

  const getScoreIcon = (score) => {
    if (score >= 8) return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
    if (score >= 6) return <StarIcon className="h-5 w-5 text-warning-500" />;
    return <XCircleIcon className="h-5 w-5 text-error-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Judge Evaluation</h1>
          <p className="mt-2 text-sm text-gray-700">
            Evaluate outputs using judge LLMs with custom criteria and scoring.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Evaluation Setup */}
        <div className="space-y-6">
          {/* Judge Configuration */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Judge Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Judge Provider
                </label>
                <select
                  value={selectedProvider?.id || ''}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="input-field"
                  disabled={providers.length === 0}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Judge Model
                </label>
                <select
                  value={selectedModel?.id || ''}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="input-field"
                  disabled={!selectedProvider || models.length === 0}
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

          {/* Output Selection */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Select Output to Evaluate</h2>
            </div>
            
            {fetchingOutputs ? (
              <div className="animate-pulse space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {outputs.map((output) => (
                  <button
                    key={output.id}
                    onClick={() => setEvaluationData(prev => ({ ...prev, output_id: output.id }))}
                    className={`w-full text-left p-4 border rounded-lg transition-colors duration-200 ${
                      evaluationData.output_id === output.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {output.prompt.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {output.output_text}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(output.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {evaluationData.output_id === output.id && (
                        <CheckCircleIcon className="h-5 w-5 text-primary-500 ml-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Evaluation Criteria */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Evaluation Criteria</h2>
            </div>
            
            <div className="space-y-3">
              {Object.entries({
                relevance: 'Relevance to the prompt',
                accuracy: 'Factual accuracy',
                coherence: 'Logical coherence',
                helpfulness: 'Helpfulness and usefulness'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={evaluationData.criteria[key]}
                    onChange={() => handleCriteriaChange(key)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">{label}</span>
                </label>
              ))}
              
              <div className="pt-3 border-t border-gray-200">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={evaluationData.criteria.custom}
                    onChange={() => handleCriteriaChange('custom')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">Custom criteria</span>
                </label>
                
                {evaluationData.criteria.custom && (
                  <textarea
                    value={evaluationData.custom_criteria}
                    onChange={(e) => setEvaluationData(prev => ({ ...prev, custom_criteria: e.target.value }))}
                    className="input-field mt-2"
                    rows={3}
                    placeholder="Enter custom evaluation criteria..."
                  />
                )}
              </div>
            </div>
          </div>

          {/* Judge Prompt */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Judge Prompt</h2>
            </div>
            
            <textarea
              value={evaluationData.judge_prompt}
              onChange={(e) => setEvaluationData(prev => ({ ...prev, judge_prompt: e.target.value }))}
              className="input-field"
              rows={6}
              placeholder="Enter instructions for the judge LLM on how to evaluate the output..."
            />
            
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> Be specific about what you want the judge to evaluate. 
                Include scoring criteria and any specific aspects you want to focus on.
              </p>
            </div>
          </div>

          {/* Run Evaluation Button */}
          <button
            onClick={handleRunEvaluation}
            disabled={loading || !selectedProvider || !selectedModel || !evaluationData.output_id || !evaluationData.judge_prompt.trim()}
            className="w-full btn-primary py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Evaluating...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <ScaleIcon className="mr-2 h-5 w-5" />
                Run Evaluation
              </div>
            )}
          </button>
        </div>

        {/* Right Column - Evaluation Results */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Evaluation Results</h2>
            </div>
            
            {evaluations.length === 0 ? (
              <div className="text-center py-12">
                <ScaleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No evaluations yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Run an evaluation to see results here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {evaluations.map((evaluation) => (
                  <div key={evaluation.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        {getScoreIcon(evaluation.score)}
                        <span className={`ml-2 text-lg font-semibold ${getScoreColor(evaluation.score)}`}>
                          {evaluation.score}/10
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(evaluation.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Feedback</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                          {evaluation.feedback}
                        </p>
                      </div>
                      
                      {evaluation.criteria && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1">Criteria Used</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(evaluation.criteria).map(([key, value]) => (
                              value && (
                                <span key={key} className="status-badge info text-xs capitalize">
                                  {key}
                                </span>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgeEvaluation;
