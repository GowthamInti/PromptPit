import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { 
  XMarkIcon, 
  ChartBarIcon, 
  DocumentTextIcon,
  ScaleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const ExperimentDetailModal = ({ experiment, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([]);

  // Mock data for experiment details - replace with actual API calls
  const [experimentData] = useState({
    versions: [
      {
        id: 1,
        version: 1,
        prompt: "Generate an executive summary for the following business data. Focus on key insights and actionable recommendations.",
        system_prompt: "You are an expert business analyst creating executive summaries.",
        temperature: 0.7,
        max_tokens: 1000,
        created_at: '2024-01-15T10:30:00Z',
        outputs: [
          {
            id: 1,
            output_text: "Based on the provided data, this executive summary highlights the key performance indicators...",
            latency_ms: 2450.5,
            cost_usd: 0.0234,
            token_usage: { input: 15, output: 156, total: 171 },
            evaluations: [
              { score: 6.2, feedback: 'Good structure but lacks specific actionable insights', criteria: ['relevance', 'coherence'] }
            ],
            test_data_score: 6.5
          }
        ]
      },
      {
        id: 2,
        version: 2,
        prompt: "Generate an executive summary for the following business data. Structure the response with: 1) Key Findings, 2) Critical Insights, 3) Actionable Recommendations. Use bullet points for clarity.",
        system_prompt: "You are an expert business analyst creating structured executive summaries with clear sections.",
        temperature: 0.7,
        max_tokens: 1200,
        created_at: '2024-01-15T11:45:00Z',
        outputs: [
          {
            id: 2,
            output_text: "EXECUTIVE SUMMARY\n\nKey Findings:\n• Revenue increased by 15% year-over-year\n• Customer satisfaction scores improved to 8.7/10\n\nCritical Insights:\n• Digital transformation initiatives driving growth\n• Customer retention rates at all-time high\n\nActionable Recommendations:\n• Invest in additional digital infrastructure\n• Expand customer success programs",
            latency_ms: 2800.2,
            cost_usd: 0.0289,
            token_usage: { input: 18, output: 189, total: 207 },
            evaluations: [
              { score: 7.8, feedback: 'Excellent structure and clarity with specific recommendations', criteria: ['relevance', 'coherence', 'structure'] }
            ],
            test_data_score: 8.1
          }
        ]
      },
      {
        id: 3,
        version: 3,
        prompt: "Generate an executive summary for the following business data. Structure the response with: 1) Executive Overview (2-3 sentences), 2) Key Performance Metrics, 3) Strategic Insights, 4) Actionable Recommendations with priority levels (High/Medium/Low). Use clear formatting and ensure each section provides specific, data-driven insights.",
        system_prompt: "You are an expert business analyst creating comprehensive executive summaries that drive strategic decision-making.",
        temperature: 0.7,
        max_tokens: 1500,
        created_at: '2024-01-15T13:20:00Z',
        outputs: [
          {
            id: 3,
            output_text: "EXECUTIVE SUMMARY\n\nExecutive Overview:\nThe organization has demonstrated strong performance across key metrics, with notable improvements in customer satisfaction and operational efficiency.\n\nKey Performance Metrics:\n• Revenue Growth: +15% YoY\n• Customer Satisfaction: 8.7/10 (+0.8 points)\n• Operational Efficiency: 23% improvement\n\nStrategic Insights:\n• Digital transformation is the primary growth driver\n• Customer-centric approach yielding measurable results\n• Operational streamlining creating competitive advantages\n\nActionable Recommendations:\nHIGH PRIORITY:\n• Accelerate digital infrastructure investment\n• Implement advanced analytics platform\n\nMEDIUM PRIORITY:\n• Expand customer success programs\n• Develop talent retention strategies\n\nLOW PRIORITY:\n• Explore new market opportunities\n• Consider strategic partnerships",
            latency_ms: 3200.1,
            cost_usd: 0.0345,
            token_usage: { input: 22, output: 234, total: 256 },
            evaluations: [
              { score: 9.2, feedback: 'Outstanding comprehensive structure with prioritized recommendations and strategic insights', criteria: ['relevance', 'coherence', 'structure', 'completeness'] }
            ],
            test_data_score: 9.4
          }
        ]
      }
    ],
    optimizationHistory: [
      { iteration: 1, score: 6.2, prompt_changes: 'Initial prompt created', test_score: 6.5 },
      { iteration: 2, score: 7.8, prompt_changes: 'Added structured sections and bullet points', test_score: 8.1 },
      { iteration: 3, score: 9.2, prompt_changes: 'Enhanced with priority levels and comprehensive structure', test_score: 9.4 }
    ],
    metrics: {
      total_cost: 0.0868,
      total_tokens: 634,
      avg_latency: 2816.9,
      best_score: 9.2,
      best_test_score: 9.4,
      improvement_rate: 48.4
    },
    testDataEvaluation: {
      total_test_cases: 50,
      successful_cases: 47,
      success_rate: 94,
      avg_test_score: 8.7,
      performance_trend: 'improving'
    }
  });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'optimization', name: 'Optimization', icon: ArrowPathIcon },
    { id: 'versions', name: 'Versions', icon: DocumentTextIcon },
    { id: 'evaluations', name: 'Evaluations', icon: ScaleIcon },
    { id: 'test_results', name: 'Test Results', icon: DocumentTextIcon }
  ];

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
      setSelectedVersion(experimentData.versions.find(v => v.id === versionId));
    }
  };

  const getAverageScore = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return null;
    const sum = evaluations.reduce((acc, evaluation) => acc + evaluation.score, 0);
    return (sum / evaluations.length).toFixed(1);
  };

  const getReportTypeLabel = (reportType) => {
    switch (reportType) {
      case 'executive_summary':
        return 'Executive Summary';
      case 'technical_analysis':
        return 'Technical Analysis';
      case 'market_research':
        return 'Market Research';
      case 'financial_report':
        return 'Financial Report';
      default:
        return 'Custom Report';
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-6xl w-full bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                {experiment.name}
              </Dialog.Title>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-500">{experiment.description}</p>
                {experiment.report_type && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-blue-600 font-medium">
                      {getReportTypeLabel(experiment.report_type)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Experiment Status */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="card">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{experiment.current_score}</p>
                      <p className="text-sm text-gray-500">Current Score</p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{experiment.iterations}</p>
                      <p className="text-sm text-gray-500">Iterations</p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{experimentData.metrics.total_cost.toFixed(4)}</p>
                      <p className="text-sm text-gray-500">Total Cost ($)</p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{experimentData.metrics.improvement_rate}%</p>
                      <p className="text-sm text-gray-500">Improvement</p>
                    </div>
                  </div>
                </div>

                {/* Test Data Performance */}
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Test Data Performance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{experimentData.testDataEvaluation.success_rate}%</p>
                      <p className="text-sm text-gray-500">Success Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{experimentData.testDataEvaluation.avg_test_score}</p>
                      <p className="text-sm text-gray-500">Avg Test Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{experimentData.testDataEvaluation.total_test_cases}</p>
                      <p className="text-sm text-gray-500">Test Cases</p>
                    </div>
                  </div>
                </div>

                {/* Best Version */}
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Best Performing Version</h3>
                  {(() => {
                    const bestVersion = experimentData.versions.reduce((best, current) => {
                      const currentScore = getAverageScore(current.outputs[0]?.evaluations);
                      const bestScore = getAverageScore(best.outputs[0]?.evaluations);
                      return currentScore > bestScore ? current : best;
                    });
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">Version {bestVersion.version}</span>
                          <div className="flex items-center gap-4">
                            <span className={`text-lg font-semibold ${getScoreColor(getAverageScore(bestVersion.outputs[0]?.evaluations))}`}>
                              Judge: {getAverageScore(bestVersion.outputs[0]?.evaluations)}/10
                            </span>
                            <span className={`text-lg font-semibold ${getScoreColor(bestVersion.outputs[0]?.test_data_score)}`}>
                              Test: {bestVersion.outputs[0]?.test_data_score}/10
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-900 font-mono">{bestVersion.prompt}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-900">{bestVersion.outputs[0]?.output_text}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Optimization Tab */}
            {activeTab === 'optimization' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Optimization Process</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Strategy Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-medium">{experiment.type.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Target Score:</span>
                        <span className="font-medium">{experiment.target_score}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Max Iterations:</span>
                        <span className="font-medium">{experiment.max_iterations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dataset Size:</span>
                        <span className="font-medium">{experiment.dataset_size} items</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Performance Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Best Judge Score:</span>
                        <span className="font-medium">{experimentData.metrics.best_score}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Best Test Score:</span>
                        <span className="font-medium">{experimentData.metrics.best_test_score}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Cost:</span>
                        <span className="font-medium">${experimentData.metrics.total_cost.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Tokens:</span>
                        <span className="font-medium">{experimentData.metrics.total_tokens.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Optimization History</h4>
                  <div className="space-y-3">
                    {experimentData.optimizationHistory.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-primary-700">{item.iteration}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.prompt_changes}</p>
                            <p className="text-xs text-gray-500">Iteration {item.iteration}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-semibold ${getScoreColor(item.score)}`}>
                            Judge: {item.score}/10
                          </span>
                          <span className={`text-sm font-semibold ${getScoreColor(item.test_score)}`}>
                            Test: {item.test_score}/10
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optimization Process Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-md font-medium text-blue-900 mb-2">Iterative Optimization Process</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>1. Generate report section using current prompt template</p>
                    <p>2. Judge LLM evaluates output quality and suggests prompt improvements</p>
                    <p>3. Update prompt template based on judge feedback</p>
                    <p>4. Test updated prompt on separate test dataset</p>
                    <p>5. Compare test performance with previous version</p>
                    <p>6. Repeat until target score is reached or max iterations hit</p>
                  </div>
                </div>
              </div>
            )}

            {/* Versions Tab */}
            {activeTab === 'versions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Prompt Versions</h3>
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`btn-secondary inline-flex items-center ${compareMode ? 'bg-primary-100 text-primary-700' : ''}`}
                  >
                    <ChartBarIcon className="mr-2 h-4 w-4" />
                    {compareMode ? 'Exit Compare' : 'Compare Versions'}
                  </button>
                </div>

                <div className="space-y-4">
                  {experimentData.versions.map((version) => {
                    const averageScore = getAverageScore(version.outputs[0]?.evaluations);
                    const isSelected = compareMode ? selectedVersions.includes(version.id) : selectedVersion?.id === version.id;
                    
                    return (
                      <div
                        key={version.id}
                        className={`card cursor-pointer transition-colors duration-200 ${
                          isSelected ? 'ring-2 ring-primary-500' : 'hover:shadow-md'
                        }`}
                        onClick={() => handleVersionSelect(version.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-lg font-medium text-gray-900">Version {version.version}</h4>
                              {averageScore && (
                                <span className={`text-sm font-semibold ${getScoreColor(averageScore)}`}>
                                  Judge: {averageScore}/10
                                </span>
                              )}
                              {version.outputs[0]?.test_data_score && (
                                <span className={`text-sm font-semibold ${getScoreColor(version.outputs[0].test_data_score)}`}>
                                  Test: {version.outputs[0].test_data_score}/10
                                </span>
                              )}
                              {compareMode && selectedVersions.includes(version.id) && (
                                <span className="status-badge success text-xs">Selected</span>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Prompt Template:</p>
                                <p className="text-sm text-gray-900 bg-gray-50 rounded p-2 font-mono">
                                  {version.prompt}
                                </p>
                              </div>

                              {version.outputs[0] && (
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Generated Output:</p>
                                  <p className="text-sm text-gray-900 bg-gray-50 rounded p-2 line-clamp-3">
                                    {version.outputs[0].output_text}
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
                                <div>
                                  <span className="text-gray-500">Cost:</span>
                                  <span className="ml-1 font-medium">${version.outputs[0]?.cost_usd?.toFixed(4)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evaluations Tab */}
            {activeTab === 'evaluations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Judge LLM Evaluations</h3>
                
                <div className="space-y-4">
                  {experimentData.versions.map((version) => {
                    const evaluations = version.outputs[0]?.evaluations || [];
                    const averageScore = getAverageScore(evaluations);
                    
                    return (
                      <div key={version.id} className="card">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-medium text-gray-900">Version {version.version}</h4>
                          {averageScore && (
                            <div className="flex items-center">
                              {getScoreIcon(parseFloat(averageScore))}
                              <span className={`ml-2 text-lg font-semibold ${getScoreColor(averageScore)}`}>
                                {averageScore}/10
                              </span>
                            </div>
                          )}
                        </div>

                        {evaluations.length > 0 ? (
                          <div className="space-y-3">
                            {evaluations.map((evaluation, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`font-medium ${getScoreColor(evaluation.score)}`}>
                                    {evaluation.score}/10
                                  </span>
                                  <div className="flex gap-1">
                                    {evaluation.criteria.map((criterion) => (
                                      <span key={criterion} className="status-badge info text-xs capitalize">
                                        {criterion}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700">{evaluation.feedback}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No evaluations yet</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Test Results Tab */}
            {activeTab === 'test_results' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Test Dataset Results</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Overall Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Success Rate:</span>
                        <span className="font-medium">{experimentData.testDataEvaluation.success_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Score:</span>
                        <span className="font-medium">{experimentData.testDataEvaluation.avg_test_score}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Test Cases:</span>
                        <span className="font-medium">{experimentData.testDataEvaluation.total_test_cases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Successful Cases:</span>
                        <span className="font-medium">{experimentData.testDataEvaluation.successful_cases}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Performance Trend</h4>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success-600 mb-2">
                        {experimentData.testDataEvaluation.performance_trend === 'improving' ? '↗' : '↘'}
                      </div>
                      <p className="text-sm text-gray-600 capitalize">
                        {experimentData.testDataEvaluation.performance_trend}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Version Performance Comparison</h4>
                  <div className="space-y-3">
                    {experimentData.versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">Version {version.version}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-semibold ${getScoreColor(version.outputs[0]?.test_data_score)}`}>
                            Test Score: {version.outputs[0]?.test_data_score}/10
                          </span>
                          <span className={`text-sm font-semibold ${getScoreColor(getAverageScore(version.outputs[0]?.evaluations))}`}>
                            Judge Score: {getAverageScore(version.outputs[0]?.evaluations)}/10
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-md font-medium text-green-900 mb-2">Test Data Usage</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <p>• Test data is used to evaluate prompt effectiveness</p>
                    <p>• Judge LLM does not have access to test data during optimization</p>
                    <p>• Test results help validate prompt improvements</p>
                    <p>• Performance on test data indicates real-world applicability</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ExperimentDetailModal;
