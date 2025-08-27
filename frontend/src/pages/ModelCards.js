import React, { useState, useEffect } from 'react';
import { 
  DocumentIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  EyeIcon,
  ShareIcon, 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ModelCards = () => {
  const [modelCards, setModelCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchModelCards();
  }, []);

  const fetchModelCards = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      setModelCards([
        {
          id: 1,
          uuid: 'card-1',
          title: 'Story Writing Model Card',
          description: 'A comprehensive evaluation of story writing prompts across multiple models',
          created_at: '2024-01-15T10:30:00Z',
          status: 'published',
          metrics: {
            total_prompts: 5,
            total_outputs: 15,
            total_evaluations: 12,
            avg_score: 8.2,
            total_cost: 0.156
          },
          models_tested: ['gpt-4', 'gpt-3.5-turbo', 'llama2-70b'],
          providers: ['openai', 'groq']
        },
        {
          id: 2,
          uuid: 'card-2',
          title: 'Technical Explanation Model Card',
          description: 'Evaluation of models for technical content explanation',
          created_at: '2024-01-15T09:15:00Z',
          status: 'draft',
          metrics: {
            total_prompts: 3,
            total_outputs: 8,
            total_evaluations: 6,
            avg_score: 7.8,
            total_cost: 0.089
          },
          models_tested: ['gpt-4', 'llama2-70b'],
          providers: ['openai', 'groq']
        }
      ]);
    } catch (error) {
      console.error('Error fetching model cards:', error);
      toast.error('Failed to fetch model cards');
    } finally {
      setLoading(false);
    }
  };

  const generateModelCard = async () => {
    try {
      // This would call the backend to generate a new model card
      toast.success('Model card generation started!');
    } catch (error) {
      console.error('Error generating model card:', error);
      toast.error('Failed to generate model card');
    }
  };

  const exportModelCard = async (format, cardId) => {
    try {
      // This would call the backend to export the model card
      toast.success(`Model card exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting model card:', error);
      toast.error('Failed to export model card');
    }
  };

  const shareModelCard = async (cardId) => {
    try {
      const shareUrl = `${window.location.origin}/share/${cardId}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      console.error('Error sharing model card:', error);
      toast.error('Failed to copy share link');
    }
  };

  const viewModelCard = (card) => {
    setSelectedCard(card);
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-xl text-gradient mb-2">Model Cards</h1>
          <p className="body-lg text-secondary max-w-2xl">
            Generate and manage model cards summarizing your experiments and evaluations.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={generateModelCard}
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Generate Model Card
          </button>
        </div>
      </div>

      {/* Model Cards List */}
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
      ) : modelCards.length === 0 ? (
        <div className="card text-center py-12 border border-slate-700">
          <div className="p-4 rounded-full bg-slate-800 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <DocumentIcon className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">No model cards yet</h3>
          <p className="text-muted mb-6">
            Generate your first model card to get started.
          </p>
          <button
            onClick={generateModelCard}
            className="btn-primary"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Generate Model Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modelCards.map((card) => (
            <div key={card.id} className="card hover:shadow-lg transition-all duration-200 border border-slate-700 hover:border-slate-600">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary truncate">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted mt-1 line-clamp-2">
                    {card.description}
                  </p>
                </div>
                <span className={`status-badge ${getStatusColor(card.status)} ml-2`}>
                  {card.status}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-2xl font-bold text-primary">{card.metrics.avg_score}</p>
                  <p className="text-xs text-muted">Avg Score</p>
                </div>
                <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-2xl font-bold text-primary">{card.metrics.total_prompts}</p>
                  <p className="text-xs text-muted">Prompts</p>
                </div>
                <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-2xl font-bold text-primary">{card.metrics.total_evaluations}</p>
                  <p className="text-xs text-muted">Evaluations</p>
                </div>
                <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-2xl font-bold text-primary">${card.metrics.total_cost}</p>
                  <p className="text-xs text-muted">Total Cost</p>
                </div>
              </div>

              {/* Models and Providers */}
              <div className="mb-4">
                <p className="text-sm text-secondary mb-2">Models Tested:</p>
                <div className="flex flex-wrap gap-1">
                  {card.models_tested.map((model) => (
                    <span key={model} className="status-badge info text-xs">
                      {model}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-secondary mb-2">Providers:</p>
                <div className="flex flex-wrap gap-1">
                  {card.providers.map((provider) => (
                    <span key={provider} className="status-badge success text-xs capitalize">
                      {provider}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewModelCard(card)}
                    className="btn-secondary p-2"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => shareModelCard(card.uuid)}
                    className="btn-secondary p-2"
                    title="Share"
                  >
                    <ShareIcon className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => exportModelCard('json', card.id)}
                    className="btn-secondary p-2 text-xs"
                    title="Export as JSON"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => exportModelCard('markdown', card.id)}
                    className="btn-secondary p-2 text-xs"
                    title="Export as Markdown"
                  >
                    MD
                  </button>
                  <button
                    onClick={() => exportModelCard('pdf', card.id)}
                    className="btn-secondary p-2 text-xs"
                    title="Export as PDF"
                  >
                    PDF
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xs text-muted">
                Created: {new Date(card.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Model Card Detail Modal */}
      {showModal && selectedCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary">
                  {selectedCard.title}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
                <p className="text-secondary">{selectedCard.description}</p>
              </div>

              {/* Metrics Overview */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Metrics Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                    <p className="text-3xl font-bold text-primary">{selectedCard.metrics.avg_score}</p>
                    <p className="text-sm text-muted">Average Score</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                    <p className="text-3xl font-bold text-primary">{selectedCard.metrics.total_prompts}</p>
                    <p className="text-sm text-muted">Total Prompts</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                    <p className="text-3xl font-bold text-primary">{selectedCard.metrics.total_outputs}</p>
                    <p className="text-sm text-muted">Total Outputs</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                    <p className="text-3xl font-bold text-primary">{selectedCard.metrics.total_evaluations}</p>
                    <p className="text-sm text-muted">Evaluations</p>
                  </div>
                </div>
              </div>

              {/* Cost Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Cost Analysis</h3>
                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary">Total Cost:</span>
                    <span className="text-2xl font-bold text-primary">${selectedCard.metrics.total_cost}</span>
                  </div>
                </div>
              </div>

              {/* Models and Providers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-3">Models Tested</h3>
                  <div className="space-y-2">
                    {selectedCard.models_tested.map((model) => (
                      <div key={model} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                        <span className="font-medium text-primary">{model}</span>
                        <span className="status-badge info">Tested</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-primary mb-3">Providers</h3>
                  <div className="space-y-2">
                    {selectedCard.providers.map((provider) => (
                      <div key={provider} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                        <span className="font-medium text-primary capitalize">{provider}</span>
                        <span className="status-badge success">Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Export Options</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => exportModelCard('json', selectedCard.id)}
                    className="btn-secondary inline-flex items-center"
                  >
                    <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                    Export as JSON
                  </button>
                  <button
                    onClick={() => exportModelCard('markdown', selectedCard.id)}
                    className="btn-secondary inline-flex items-center"
                  >
                    <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                    Export as Markdown
                  </button>
                  <button
                    onClick={() => exportModelCard('pdf', selectedCard.id)}
                    className="btn-secondary inline-flex items-center"
                  >
                    <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                    Export as PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelCards;
