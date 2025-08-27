import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, SparklesIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const CreateExperimentModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    report_type: '',
    target_score: 8.0,
    max_iterations: 5,
    dataset_size: 50,
    base_prompt: '',
    report_rules: '',
    test_data: '',
    optimization_strategy: 'iterative_refinement',
    judge_criteria: {
      relevance: true,
      accuracy: true,
      coherence: true,
      helpfulness: true,
      structure: true,
      completeness: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newRule, setNewRule] = useState('');

  const experimentTypes = [
    {
      id: 'report_generation',
      name: 'Report Generation',
      description: 'Optimize prompts for structured report generation with iterative refinement',
      icon: DocumentTextIcon,
      color: 'blue'
    },
    {
      id: 'style_adaptation',
      name: 'Style Adaptation',
      description: 'Adapt prompts for different writing styles and tones',
      icon: SparklesIcon,
      color: 'purple'
    },
    {
      id: 'few_shot_learning',
      name: 'Few-Shot Learning',
      description: 'Optimize prompts with example demonstrations',
      icon: DocumentTextIcon,
      color: 'green'
    }
  ];

  const reportTypes = [
    { id: 'executive_summary', name: 'Executive Summary', description: 'High-level business summaries' },
    { id: 'technical_analysis', name: 'Technical Analysis', description: 'Detailed technical reports with data' },
    { id: 'market_research', name: 'Market Research', description: 'Market analysis and competitive insights' },
    { id: 'financial_report', name: 'Financial Report', description: 'Financial analysis and projections' },
    { id: 'custom', name: 'Custom Report', description: 'Custom report type' }
  ];

  const optimizationStrategies = [
    { id: 'iterative_refinement', name: 'Iterative Refinement', description: 'Gradual prompt improvement based on judge feedback' },
    { id: 'ab_testing', name: 'A/B Testing', description: 'Compare different prompt variations' },
    { id: 'template_optimization', name: 'Template Optimization', description: 'Optimize report structure templates' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.base_prompt) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.type === 'report_generation' && !formData.report_type) {
      toast.error('Please select a report type');
      return;
    }

    try {
      setLoading(true);
      
      // Create experiment object
      const experiment = {
        id: Date.now(), // Temporary ID
        ...formData,
        status: 'pending',
        progress: 0,
        current_score: 0,
        iterations: 0,
        created_at: new Date().toISOString(),
        optimization_cycles: []
      };

      // This would call the backend to create the experiment
      // await apiService.createExperiment(experiment);
      
      onCreate(experiment);
      resetForm();
    } catch (error) {
      console.error('Error creating experiment:', error);
      toast.error('Failed to create experiment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      report_type: '',
      target_score: 8.0,
      max_iterations: 5,
      dataset_size: 50,
      base_prompt: '',
      report_rules: '',
      test_data: '',
      optimization_strategy: 'iterative_refinement',
      judge_criteria: {
        relevance: true,
        accuracy: true,
        coherence: true,
        helpfulness: true,
        structure: true,
        completeness: true
      }
    });
    setCurrentStep(1);
    setNewRule('');
  };

  const addRule = () => {
    if (newRule.trim()) {
      setFormData(prev => ({
        ...prev,
        report_rules: prev.report_rules ? `${prev.report_rules}\n• ${newRule.trim()}` : `• ${newRule.trim()}`
      }));
      setNewRule('');
    }
  };

  const handleCriteriaChange = (criteria) => {
    setFormData(prev => ({
      ...prev,
      judge_criteria: {
        ...prev.judge_criteria,
        [criteria]: !prev.judge_criteria[criteria]
      }
    }));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-slate-900 rounded-xl shadow-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <Dialog.Title className="text-xl font-semibold text-white">
              Create Prompt Optimization Experiment
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-6">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-slate-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Experiment Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter experiment name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Describe your experiment"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Experiment Type *
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {experimentTypes.map((type) => {
                          const IconComponent = type.icon;
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                              className={`p-4 border rounded-lg text-left transition-colors duration-200 ${
                                formData.type === type.id
                                  ? `border-${type.color}-500 bg-${type.color}-500/10`
                                  : 'border-slate-600 hover:border-slate-500 bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center">
                                <IconComponent className={`h-6 w-6 text-${type.color}-400 mr-3`} />
                                <div>
                                  <h4 className="font-medium text-white">{type.name}</h4>
                                  <p className="text-sm text-slate-400">{type.description}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {formData.type === 'report_generation' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-3">
                          Report Type *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {reportTypes.map((type) => (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, report_type: type.id }))}
                              className={`p-3 border rounded-lg text-left transition-colors duration-200 ${
                                formData.report_type === type.id
                                  ? 'border-blue-500 bg-blue-500/10'
                                  : 'border-slate-600 hover:border-slate-500 bg-slate-800'
                              }`}
                            >
                              <h4 className="font-medium text-white">{type.name}</h4>
                              <p className="text-sm text-slate-400">{type.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Target Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.target_score}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_score: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Max Iterations
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.max_iterations}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_iterations: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Dataset Size
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={formData.dataset_size}
                        onChange={(e) => setFormData(prev => ({ ...prev, dataset_size: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Optimization Strategy
                      </label>
                      <select
                        value={formData.optimization_strategy}
                        onChange={(e) => setFormData(prev => ({ ...prev, optimization_strategy: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {optimizationStrategies.map((strategy) => (
                          <option key={strategy.id} value={strategy.id} className="bg-slate-800 text-white">
                            {strategy.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Base Prompt *
                    </label>
                    <textarea
                      value={formData.base_prompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_prompt: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      rows={6}
                      placeholder="Enter your base prompt template..."
                      required
                    />
                  </div>

                  {formData.type === 'report_generation' && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Report Rules & Structure
                      </label>
                      <div className="space-y-3">
                        <textarea
                          value={formData.report_rules}
                          onChange={(e) => setFormData(prev => ({ ...prev, report_rules: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={4}
                          placeholder="Enter report structure rules, formatting requirements, and guidelines..."
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newRule}
                            onChange={(e) => setNewRule(e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Add a new rule..."
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                          />
                          <button
                            type="button"
                            onClick={addRule}
                            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Evaluation Criteria */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Evaluation Criteria & Test Data</h3>
                  
                  <div className="space-y-6">
                    {/* Evaluation Criteria */}
                    <div>
                      <h4 className="text-md font-medium text-white mb-3">Judge LLM Evaluation Criteria</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries({
                          relevance: 'Relevance to the prompt and context',
                          accuracy: 'Factual accuracy and correctness',
                          coherence: 'Logical coherence and flow',
                          helpfulness: 'Usefulness and practical value',
                          structure: 'Proper structure and organization',
                          completeness: 'Completeness of information'
                        }).map(([key, label]) => (
                          <label key={key} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.judge_criteria[key]}
                              onChange={() => handleCriteriaChange(key)}
                              className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-800"
                            />
                            <span className="ml-3 text-sm text-slate-300">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Test Data */}
                    <div>
                      <h4 className="text-md font-medium text-white mb-3">Test Dataset</h4>
                      <textarea
                        value={formData.test_data}
                        onChange={(e) => setFormData(prev => ({ ...prev, test_data: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        placeholder="Enter test data or describe the test dataset that will be used to evaluate prompt effectiveness..."
                      />
                      <p className="mt-2 text-sm text-slate-400">
                        This test data will be used to evaluate prompt effectiveness but won't be used by the judge LLM for prompt optimization.
                      </p>
                    </div>

                    {/* Optimization Process Info */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <h4 className="text-md font-medium text-blue-400 mb-2">Optimization Process</h4>
                      <div className="text-sm text-blue-300 space-y-1">
                        <p>1. Generate report section using current prompt</p>
                        <p>2. Judge LLM evaluates output and suggests prompt improvements</p>
                        <p>3. Update prompt based on judge feedback</p>
                        <p>4. Test updated prompt on test dataset</p>
                        <p>5. Repeat until target score is reached or max iterations hit</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-700">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </div>
                    ) : (
                      'Create Experiment'
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CreateExperimentModal;
