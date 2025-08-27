# File Handling Documentation

## Overview

The prompt optimization system now supports file upload and text extraction functionality, allowing users to include document content in their prompts. This feature supports PDF, DOCX, and PPTX file formats.

## Supported File Types

- **PDF** (.pdf) - Extracted using PyMuPDF
- **DOCX** (.docx) - Extracted using unstructured library
- **PPTX** (.pptx) - Extracted using unstructured library

## New API Endpoints

### 1. Extract Files
**Endpoint:** `POST /extract-files`

Extract text content from uploaded files without running a prompt.

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

### 2. Run Prompt with Files
**Endpoint:** `POST /run-with-files`

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

### 3. Get Supported File Types
**Endpoint:** `GET /supported-file-types`

Get information about supported file types.

**Response:**
```json
{
  "supported_extensions": [".pdf", ".docx", ".pptx"],
  "supported_formats": ["PDF", "DOCX", "PPTX"]
}
```

## File Content Integration

When files are uploaded and `include_file_content` is true, the extracted text is automatically included in the prompt context. The format is:

```
File content:
[Extracted text from all files]

User prompt: [User's prompt text]
```

## Implementation Details

### File Extraction Service

The `FileExtractionService` class handles all file processing:

```python
class FileExtractionService:
    async def extract_text_from_files(self, files: List[UploadFile]) -> List[str]:
        # Extracts text from multiple files
        
    async def extract_text_from_single_file(self, file: UploadFile) -> str:
        # Extracts text from a single file
        
    def get_supported_extensions(self) -> List[str]:
        # Returns list of supported file extensions
```

### Provider Service Integration

Both OpenAI and Groq services have been updated to handle file content:

- File content is prepended to user prompts
- Configurable prefix for file content
- Maintains existing prompt structure and metadata

### Error Handling

- Unsupported file types return error messages
- File processing errors are captured and reported
- Failed extractions don't prevent prompt execution
- Graceful degradation when files can't be processed

## Usage Examples

### Using cURL

```bash
# Extract files only
curl -X POST "http://localhost:8000/extract-files" \
  -F "files=@document.pdf" \
  -F "files=@presentation.pptx"

# Run prompt with files
curl -X POST "http://localhost:8000/run-with-files" \
  -F "provider_id=1" \
  -F "model_id=2" \
  -F "text=Summarize the key points from the documents" \
  -F "files=@document.pdf" \
  -F "files=@presentation.pptx"
```

### Using Python requests

```python
import requests

# Extract files
with open('document.pdf', 'rb') as f:
    files = {'files': f}
    response = requests.post('http://localhost:8000/extract-files', files=files)
    print(response.json())

# Run prompt with files
with open('document.pdf', 'rb') as f:
    data = {
        'provider_id': 1,
        'model_id': 2,
        'text': 'Summarize the key points from the documents',
        'include_file_content': True
    }
    files = {'files': f}
    response = requests.post('http://localhost:8000/run-with-files', data=data, files=files)
    print(response.json())
```

## Dependencies

The following new dependencies have been added:

- `PyMuPDF==1.23.8` - For PDF processing
- `unstructured==0.11.8` - For DOCX and PPTX processing
- `python-docx==1.2.0` - DOCX support
- `python-pptx==1.0.2` - PPTX support

## Security Considerations

- File uploads are processed in memory
- No files are permanently stored on the server
- File size limits should be configured in the web server
- Supported file types are strictly validated

## Performance Notes

- Large files may impact response times
- File extraction happens before prompt execution
- Consider implementing file size limits
- Multiple files are processed sequentially

## Future Enhancements

Potential improvements for future versions:

- Support for more file formats (TXT, RTF, etc.)
- Batch file processing optimization
- File content caching
- Configurable file content formatting
- Support for images and OCR
- File metadata extraction
