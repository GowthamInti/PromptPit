# Provider Service Update

## Quick Start

The application now supports only **OpenAI** and **Groq** providers with individual API keys.

### Adding a Provider

1. Navigate to the Dashboard
2. Click "Add Provider"
3. Select either OpenAI or Groq
4. Enter your API key
5. The system will validate the key and fetch available models

### Provider Management

- **View Providers**: Dashboard shows all configured providers
- **Delete Providers**: Click the trash icon to remove a provider
- **Refresh Models**: Update the list of available models for a provider

## Backend Architecture

### Service Classes

```
app/services/
├── provider_service.py      # Unified interface
├── openai_service.py        # OpenAI-specific operations
└── groq_service.py          # Groq-specific operations
```

### Adding a New Provider

1. Create a new service class (e.g., `anthropic_service.py`)
2. Implement the required methods:
   - `add_provider(api_key)`
   - `refresh_models(provider_id)`
   - `run_prompt(prompt_data)`
   - `get_available_models()`
3. Update `provider_service.py` to include the new provider
4. Add provider info to `get_provider_info()` method

### Example Service Class Structure

```python
class NewProviderService:
    def __init__(self, db: Session):
        self.db = db
        self.provider_name = "new_provider"

    async def add_provider(self, api_key: str) -> Provider:
        # Implementation here
        pass

    async def refresh_models(self, provider_id: int) -> List[Model]:
        # Implementation here
        pass

    async def run_prompt(self, prompt_data: Dict) -> Dict:
        # Implementation here
        pass

    def get_available_models(self) -> List[str]:
        # Return list of available models
        pass
```

## API Endpoints

### Provider Management
- `GET /api/providers/available` - Get available provider information
- `POST /api/providers` - Add a new provider
- `GET /api/providers` - Get configured providers
- `DELETE /api/providers/{id}` - Remove a provider
- `PUT /api/providers/{id}/refresh-models` - Refresh models

### Example Response (Available Providers)
```json
[
  {
    "name": "openai",
    "display_name": "OpenAI",
    "description": "GPT-4, GPT-3.5-turbo, and more",
    "models": ["gpt-4", "gpt-3.5-turbo", ...],
    "configured": true,
    "provider_id": 1
  }
]
```

## Frontend Components

### Key Files
- `src/pages/Dashboard.js` - Main provider management interface
- `src/components/AddProviderModal.js` - Provider configuration modal
- `src/contexts/ProviderContext.js` - Provider state management
- `src/components/Layout.js` - Simplified navigation

### Provider Context Methods
```javascript
const {
  providers,           // List of configured providers
  models,             // List of available models
  addProvider,        // Add a new provider
  deleteProvider,     // Remove a provider
  refreshModels,      // Refresh provider models
  getModelsByProvider // Get models for specific provider
} = useProviders();
```

## Security Notes

- API keys are stored in the database (should be encrypted in production)
- Each provider uses its own API key
- No shared keys between providers
- Provider-specific validation for API keys

## Testing

### Backend Testing
```bash
# Test provider endpoints
curl -X GET http://localhost:8000/api/providers/available
curl -X POST http://localhost:8000/api/providers \
  -H "Content-Type: application/json" \
  -d '{"name": "openai", "api_key": "your-api-key"}'
```

### Frontend Testing
1. Start the development server: `npm start`
2. Navigate to the Dashboard
3. Test adding/removing providers
4. Verify model fetching works correctly

## Troubleshooting

### Common Issues

1. **API Key Validation Fails**
   - Check if the API key is correct
   - Verify the provider service is working
   - Check network connectivity

2. **Models Not Loading**
   - Try refreshing models manually
   - Check provider API status
   - Verify API key permissions

3. **Provider Not Appearing**
   - Check if provider is in the allowed list
   - Verify the service class is properly registered
   - Check database connection

### Debug Mode

Enable debug logging by setting environment variables:
```bash
export DEBUG_PROVIDERS=true
export DEBUG_API=true
```
