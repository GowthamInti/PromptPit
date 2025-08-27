import React, { useState, useEffect } from 'react';
import { 
  BeakerIcon,
  PlusIcon,
  PlayIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowPathIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import CreateExperimentModal from '../components/CreateExperimentModal';
import ExperimentDetailModal from '../components/ExperimentDetailModal';
import toast from 'react-hot-toast';

const Experiments = () => {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchExperiments();
  }, []);

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      setExperiments([
        {
          id: 1,
          name: 'Executive Summary Report Generation',
          type: 'report_generation',
          status: 'running',
          progress: 75,
          created_at: '2024-01-15T10:30:00Z',
          target_score: 8.5,
          current_score: 7.8,
          iterations: 3,
          max_iterations: 5,
          dataset_size: 50,
          description: 'Optimizing prompts for executive summary generation with iterative refinement',
          report_type: 'executive_summary',
          optimization_cycles: [
            { iteration: 1, score: 6.2, prompt_changes: 'Initial structured prompt created' },
            { iteration: 2, score: 7.1, prompt_changes: 'Added clarity instructions and bullet points' },
            { iteration: 3, score: 7.8, prompt_changes: 'Enhanced with specific formatting rules' }
          ]
        },
        {
          id: 2,
          name: 'Technical Analysis Report',
          type: 'report_generation',
          status: 'completed',
          progress: 100,
          created_at: '2024-01-14T15:20:00Z',
          target_score: 9.0,
          current_score: 9.2,
          iterations: 4,
          max_iterations: 4,
          dataset_size: 30,
          description: 'Optimized prompts for technical analysis with data-driven insights',
          report_type: 'technical_analysis',
          optimization_cycles: [
            { iteration: 1, score: 7.5, prompt_changes: 'Initial technical prompt' },
            { iteration: 2, score: 8.3, prompt_changes: 'Added data visualization instructions' },
            { iteration: 3, score: 8.9, prompt_changes: 'Enhanced with methodology section' },
            { iteration: 4, score: 9.2, prompt_changes: 'Final optimization with conclusion structure' }
          ]
        },
        {
          id: 3,
          name: 'Market Research Report',
          type: 'report_generation',
          status: 'pending',
          progress: 0,
          created_at: '2024-01-15T09:15:00Z',
          target_score: 8.0,
          current_score: 0,
          iterations: 0,
          max_iterations: 6,
          dataset_size: 100,
          description: 'Market research report generation with competitive analysis',
          report_type: 'market_research',
          optimization_cycles: []
        }
      ]);
    } catch (error) {
      console.error('Error fetching experiments:', error);
      toast.error('Failed to fetch experiments');
    } finally {
      setLoading(false);
    }
  };

  const getExperimentTypeIcon = (type) => {
    switch (type) {
      case 'report_generation':
        return <DocumentTextIcon className="h-6 w-6 text-blue-400" />;
      case 'style_adaptation':
        return <SparklesIcon className="h-6 w-6 text-purple-400" />;
      case 'few_shot_learning':
        return <DocumentTextIcon className="h-6 w-6 text-emerald-400" />;
      default:
        return <BeakerIcon className="h-6 w-6 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'warning';
      case 'completed':
        return 'success';
      case 'pending':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'info';
    }
  };

  const getExperimentTypeLabel = (type) => {
    switch (type) {
      case 'report_generation':
        return 'Report Generation';
      case 'style_adaptation':
        return 'Style Adaptation';
      case 'few_shot_learning':
        return 'Few-Shot Learning';
      default:
        return 'Custom Experiment';
    }
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

  const startExperiment = async (experimentId) => {
    try {
      // This would call the backend to start the experiment
      toast.success('Experiment started successfully!');
      // Update the experiment status
      setExperiments(prev => prev.map(exp => 
        exp.id === experimentId ? { ...exp, status: 'running' } : exp
      ));
    } catch (error) {
      console.error('Error starting experiment:', error);
      toast.error('Failed to start experiment');
    }
  };

  const stopExperiment = async (experimentId) => {
    try {
      // This would call the backend to stop the experiment
      toast.success('Experiment stopped successfully!');
      // Update the experiment status
      setExperiments(prev => prev.map(exp => 
        exp.id === experimentId ? { ...exp, status: 'completed' } : exp
      ));
    } catch (error) {
      console.error('Error stopping experiment:', error);
      toast.error('Failed to stop experiment');
    }
  };

  const deleteExperiment = async (experimentId) => {
    try {
      // This would call the backend to delete the experiment
      setExperiments(prev => prev.filter(exp => exp.id !== experimentId));
      toast.success('Experiment deleted successfully!');
    } catch (error) {
      console.error('Error deleting experiment:', error);
      toast.error('Failed to delete experiment');
    }
  };

  const viewExperimentDetails = (experiment) => {
    setSelectedExperiment(experiment);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-xl text-gradient mb-2">Prompt Optimization Experiments</h1>
          <p className="body-lg text-secondary max-w-2xl">
            Create and manage prompt optimization experiments for report generation with iterative refinement cycles.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New Experiment
          </button>
        </div>
      </div>

      {/* Experiment Types Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card group hover:shadow-lg transition-all duration-200 border border-slate-700 hover:border-slate-600">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <DocumentTextIcon className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-primary">Report Generation</h3>
              <p className="text-sm text-muted mt-1">Optimize prompts for structured report generation</p>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-200 border border-slate-700 hover:border-slate-600">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <SparklesIcon className="h-8 w-8 text-purple-400" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-primary">Style Adaptation</h3>
              <p className="text-sm text-muted mt-1">Adapt prompts for different writing styles</p>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-200 border border-slate-700 hover:border-slate-600">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <DocumentTextIcon className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-primary">Few-Shot Learning</h3>
              <p className="text-sm text-muted mt-1">Optimize prompts with example demonstrations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Experiments List */}
      {loading ? (
        <div className="card">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-slate-700 pb-4 last:border-b-0">
                <div className="h-4 bg-slate-700 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      ) : experiments.length === 0 ? (
        <div className="card text-center py-12 border border-slate-700">
          <div className="p-4 rounded-full bg-slate-800 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <BeakerIcon className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">No experiments yet</h3>
          <p className="text-muted mb-6">
            Create your first experiment to start optimizing prompts.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Experiment
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {experiments.map((experiment) => (
            <div key={experiment.id} className="card hover:shadow-lg transition-all duration-200 border border-slate-700 hover:border-slate-600">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0">
                      <div className="p-2 rounded-lg bg-slate-700/50 border border-slate-600/50">
                        {getExperimentTypeIcon(experiment.type)}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary">{experiment.name}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted">{getExperimentTypeLabel(experiment.type)}</p>
                        {experiment.report_type && (
                          <>
                            <span className="text-slate-600">•</span>
                            <p className="text-sm text-muted">{getReportTypeLabel(experiment.report_type)}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`status-badge ${getStatusColor(experiment.status)}`}>
                      {experiment.status}
                    </span>
                  </div>

                  <p className="text-sm text-secondary mb-4">{experiment.description}</p>

                  {/* Progress and Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted">Progress</p>
                      <div className="flex items-center">
                        <div className="flex-1 bg-slate-700 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${experiment.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-primary">{experiment.progress}%</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted">Score</p>
                      <p className="text-lg font-semibold text-primary">
                        {experiment.current_score}/{experiment.target_score}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted">Iterations</p>
                      <p className="text-lg font-semibold text-primary">
                        {experiment.iterations}/{experiment.max_iterations}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted">Dataset</p>
                      <p className="text-lg font-semibold text-primary">
                        {experiment.dataset_size} items
                      </p>
                    </div>
                  </div>

                  {/* Optimization Progress */}
                  {experiment.optimization_cycles && experiment.optimization_cycles.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-secondary mb-2">Recent Optimizations:</p>
                      <div className="space-y-2">
                        {experiment.optimization_cycles.slice(-2).map((cycle, index) => (
                          <div key={index} className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                            <span className="text-secondary">Iteration {cycle.iteration}: {cycle.prompt_changes}</span>
                            <span className="font-medium text-primary">{cycle.score}/10</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted">
                    <span>Created: {new Date(experiment.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => viewExperimentDetails(experiment)}
                    className="btn-secondary p-2"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  {experiment.status === 'pending' && (
                    <button
                      onClick={() => startExperiment(experiment.id)}
                      className="btn-success p-2"
                      title="Start experiment"
                    >
                      <PlayIcon className="h-4 w-4" />
                    </button>
                  )}

                  {experiment.status === 'running' && (
                    <button
                      onClick={() => stopExperiment(experiment.id)}
                      className="btn-warning p-2"
                      title="Stop experiment"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => deleteExperiment(experiment.id)}
                    className="btn-error p-2"
                    title="Delete experiment"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Experiment Modal */}
      {showCreateModal && (
        <CreateExperimentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={(experiment) => {
            setExperiments(prev => [experiment, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Experiment Detail Modal */}
      {showDetailModal && selectedExperiment && (
        <ExperimentDetailModal
          experiment={selectedExperiment}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
};

export default Experiments;
