# API Documentation

## Overview

The Prompt Optimization Playground API provides comprehensive endpoints for managing LLM providers, prompts, experiments, evaluations, and model cards.

## Base URL

```
http://localhost:8000/api
```

## Authentication

Currently, the API uses a simple user_id system. All endpoints accept a `user_id` parameter (defaults to "default_user").

## Endpoints

### Providers

#### GET /providers
Get all configured providers.

**Query Parameters:**
- None

**Response:**
```json
[
  {
    "id": 1,
    "name": "openai",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /providers
Add a new LLM provider.

**Request Body:**
```json
{
  "name": "openai",
  "api_key": "sk-your-api-key"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "openai",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### PUT /providers/{provider_id}/refresh-models
Refresh available models for a provider.

**Response:**
```json
{
  "message": "Refreshed 5 models",
  "models": [...]
}
```

### Models

#### GET /models
Get available models.

**Query Parameters:**
- `provider` (optional): Filter by provider name

**Response:**
```json
[
  {
    "id": 1,
    "provider_id": 1,
    "name": "gpt-4",
    "description": "GPT-4 model",
    "context_length": 8192,
    "is_available": true
  }
]
```

### Prompts

#### GET /prompts
Get all prompts.

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `provider_id` (optional): Filter by provider ID

#### POST /extract-files
Extract text content from uploaded files (PDF, DOCX, PPTX).

**Request:**
- `files`: List of uploaded files (multipart/form-data)

**Response:**
```json
[
  {
    "filename": "document.pdf",
    "content": "Extracted text content...",
    "success": true,
    "error_message": null
  }
]
```

#### POST /run-with-files
Run a prompt with file content included in the context.

**Request Parameters:**
- `prompt_id` (optional): ID of existing prompt
- `provider_id` (required): Provider ID
- `model_id` (required): Model ID
- `text` (required): User prompt text
- `title` (optional): Prompt title
- `system_prompt` (optional): System prompt
- `temperature` (optional): Temperature setting (default: 0.7)
- `max_tokens` (optional): Max tokens (default: 1000)
- `include_file_content` (optional): Whether to include file content (default: true)
- `file_content_prefix` (optional): Prefix for file content (default: "File content:\n")
- `files` (optional): List of uploaded files

**Response:**
```json
{
  "id": 123,
  "prompt_id": 456,
  "output_text": "Generated response...",
  "latency_ms": 1500.5,
  "token_usage": {
    "input": 500,
    "output": 200,
    "total": 700
  },
  "cost_usd": 0.002,
  "response_metadata": {
    "model": "gpt-4",
    "finish_reason": "stop"
  },
  "created_at": "2024-01-01T12:00:00Z"
}
```

#### GET /supported-file-types
Get information about supported file types.

**Response:**
```json
{
  "supported_extensions": [".pdf", ".docx", ".pptx"],
  "supported_formats": ["PDF", "DOCX", "PPTX"]
}
```
- `model_id` (optional): Filter by model ID

#### POST /prompts
Create a new prompt.

**Request Body:**
```json
{
  "provider_id": 1,
  "model_id": 1,
  "title": "My Prompt",
  "text": "Write a story about...",
  "system_prompt": "You are a helpful assistant",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

#### PUT /prompts/{prompt_id}
Update a prompt.

#### DELETE /prompts/{prompt_id}
Delete a prompt.

#### POST /run
Execute a prompt and get output.

**Request Body:**
```json
{
  "provider_id": 1,
  "model_id": 1,
  "text": "Write a story about...",
  "title": "Story Prompt",
  "system_prompt": "You are a creative writer",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response:**
```json
{
  "id": 1,
  "prompt_id": 1,
  "output_text": "Once upon a time...",
  "latency_ms": 1250.5,
  "token_usage": {
    "input": 50,
    "output": 200,
    "total": 250
  },
  "cost_usd": 0.015,
  "metadata": {},
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Experiments

#### GET /experiments
Get all experiments.

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `status` (optional): Filter by status (pending, running, completed, failed)
- `type` (optional): Filter by type (report_generation, content_creation, etc.)

#### POST /experiments
Create a new experiment.

**Request Body:**
```json
{
  "name": "Executive Summary Generation",
  "description": "Optimizing prompts for executive summaries",
  "type": "report_generation",
  "target_score": 8.5,
  "max_iterations": 5,
  "dataset_size": 50,
  "report_type": "executive_summary"
}
```

#### GET /experiments/{experiment_id}
Get a specific experiment with optimization cycles.

#### PUT /experiments/{experiment_id}
Update an experiment.

#### DELETE /experiments/{experiment_id}
Delete an experiment.

#### POST /experiments/{experiment_id}/start
Start an experiment.

#### POST /experiments/{experiment_id}/cycles
Add an optimization cycle.

**Request Body:**
```json
{
  "iteration": 1,
  "score": 7.5,
  "prompt_changes": "Added clarity instructions",
  "prompt_id": 1,
  "output_id": 1
}
```

#### GET /experiments/{experiment_id}/cycles
Get all optimization cycles for an experiment.

### Model Cards

#### GET /model-cards
Get all model cards.

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `status` (optional): Filter by status (draft, published, archived)

#### POST /model-cards
Create a new model card.

#### POST /model-cards/generate
Generate a model card from experiments.

**Request Body:**
```json
{
  "title": "Story Writing Model Card",
  "description": "Evaluation of story writing prompts",
  "experiment_ids": [1, 2, 3]
}
```

#### GET /model-cards/{card_id}
Get a specific model card.

#### PUT /model-cards/{card_id}
Update a model card.

#### DELETE /model-cards/{card_id}
Delete a model card.

#### POST /model-cards/{card_id}/export
Export a model card.

**Query Parameters:**
- `format`: Export format (json, markdown, pdf)

#### POST /model-cards/{card_id}/publish
Publish a model card.

### Judge Evaluations

#### POST /judge
Evaluate an output using a judge LLM.

**Request Body:**
```json
{
  "output_id": 1,
  "judge_provider_id": 1,
  "judge_model_id": 1,
  "criteria": {
    "clarity": "How clear and understandable is the response?",
    "accuracy": "How accurate is the information provided?",
    "completeness": "How complete is the response?"
  },
  "scale": 10,
  "explanation_required": true
}
```

**Response:**
```json
{
  "score": 8.5,
  "feedback": "The response is clear and well-structured...",
  "evaluation_id": 1,
  "latency_ms": 850.2
}
```

#### GET /evaluations
Get all evaluations.

**Query Parameters:**
- `output_id` (optional): Filter by output ID
- `judge_provider_id` (optional): Filter by judge provider ID
- `min_score` (optional): Filter by minimum score
- `max_score` (optional): Filter by maximum score

#### GET /evaluations/{evaluation_id}
Get a specific evaluation.

#### GET /outputs/{output_id}/evaluations
Get all evaluations for a specific output.

### Health Check

#### GET /health
Get API health status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "healthy",
  "stats": {
    "providers": 2,
    "prompts": 15,
    "experiments": 5,
    "model_cards": 3
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

## Database Schema

### Tables

1. **providers**: LLM providers (OpenAI, Groq, etc.)
2. **models**: Available models for each provider
3. **prompts**: Saved prompts with configuration
4. **outputs**: Generated outputs from prompts
5. **evaluations**: Judge evaluations of outputs
6. **experiments**: Optimization experiments
7. **optimization_cycles**: Iterations within experiments
8. **model_cards**: Generated model cards

### Key Relationships

- Providers have many Models
- Prompts belong to Providers and Models
- Outputs belong to Prompts
- Evaluations belong to Outputs
- Experiments have many OptimizationCycles
- ModelCards reference Experiments

## Usage Examples

### Complete Workflow

1. **Add Provider**
```bash
curl -X POST "http://localhost:8000/api/providers" \
  -H "Content-Type: application/json" \
  -d '{"name": "openai", "api_key": "sk-your-key"}'
```

2. **Run Prompt**
```bash
curl -X POST "http://localhost:8000/api/run" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": 1,
    "model_id": 1,
    "text": "Write a short story about a robot learning to paint",
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

3. **Evaluate Output**
```bash
curl -X POST "http://localhost:8000/api/judge" \
  -H "Content-Type: application/json" \
  -d '{
    "output_id": 1,
    "criteria": {
      "creativity": "How creative is the story?",
      "coherence": "How coherent is the narrative?"
    }
  }'
```

4. **Create Experiment**
```bash
curl -X POST "http://localhost:8000/api/experiments" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Story Writing Optimization",
    "type": "content_creation",
    "target_score": 8.0,
    "max_iterations": 5
  }'
```

5. **Generate Model Card**
```bash
curl -X POST "http://localhost:8000/api/model-cards/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Story Writing Model Card",
    "experiment_ids": [1, 2, 3]
  }'
```
