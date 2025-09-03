# Knowledge Base Inspector Script

This Python script allows you to inspect and analyze your knowledge bases, ChromaDB collections, and their contents.

## Features

- 🔍 **List all knowledge bases** with their metadata and content counts
- 📊 **Inspect individual knowledge bases** with detailed content information
- 🗄️ **Examine ChromaDB collections** including documents, metadata, and embeddings
- 🔎 **Test vector search** functionality with custom queries
- 📝 **View unified content** details and metadata

## Usage

### Basic Commands

```bash
# List all knowledge bases (default behavior)
python3 inspect_knowledge_bases.py

# Inspect a specific knowledge base by ID
python3 inspect_knowledge_bases.py --kb-id 27

# Inspect a specific ChromaDB collection by name
python3 inspect_knowledge_bases.py --collection kb_default_user_abc12345

# Search within a collection
python3 inspect_knowledge_bases.py --collection kb_default_user_abc12345 --search "medical records"

# Inspect a KB and search within it
python3 inspect_knowledge_bases.py --kb-id 1 --search "patient symptoms"
```

### Command Line Options

- `--kb-id <id>`: Inspect a specific knowledge base by ID
- `--collection <name>`: Inspect a specific ChromaDB collection by name
- `--search <query>`: Perform a vector search with the given query
- `--n-results <number>`: Number of search results to return (default: 5)

## Examples

### 1. Overview of All Knowledge Bases
```bash
python inspect_knowledge_bases.py
```
This will show:
- All knowledge bases with their names, descriptions, and content counts
- Summary of content items in each KB
- ChromaDB collection names

### 2. Detailed Inspection of a Specific KB
```bash
python inspect_knowledge_bases.py --kb-id 1
```
This will show:
- Complete KB metadata (name, description, creation date, etc.)
- All content items with their summaries and processing status
- ChromaDB collection information
- Document count and metadata

### 3. Test Vector Search
```bash
python inspect_knowledge_bases.py --kb-id 1 --search "medical diagnosis"
```
This will show:
- All the above KB information
- Search results with similarity scores
- Document content and metadata for each result

### 4. Inspect ChromaDB Collection Directly
```bash
python inspect_knowledge_bases.py --collection kb_default_user_abc12345
```
This will show:
- Collection metadata and document count
- All documents with their content and embeddings
- Document IDs and metadata

## What You'll See

### Knowledge Base Information
- **Basic Info**: ID, name, description, user ID
- **ChromaDB**: Collection name and status
- **Content Count**: Number of items in the KB
- **Content Summary**: List of all content with types and status

### Content Details
- **File Information**: Name, type, size, MIME type
- **Processing Status**: Pending, completed, or failed
- **Summary**: The generated summary text
- **Metadata**: For unified content, shows individual files/images
- **ChromaDB ID**: Vector database document identifier

### ChromaDB Collection Information
- **Document Count**: Total number of vectors in the collection
- **Collection Metadata**: Creation info, description, etc.
- **Documents**: Content, metadata, and embedding dimensions
- **Search Results**: Query results with similarity scores

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure you're running from the project root directory
2. **Database Connection**: Ensure your backend database is running
3. **ChromaDB Access**: Verify ChromaDB is accessible and collections exist

### Error Messages

- `"Collection not found"`: The ChromaDB collection doesn't exist
- `"Knowledge base not found"`: Invalid KB ID provided
- `"Error fetching contents"`: Database connection issue

## Use Cases

### For Development
- Verify that unified content is being stored correctly
- Check ChromaDB embeddings and metadata
- Test search functionality and relevance

### For Debugging
- Identify content processing issues
- Verify file uploads and storage
- Check ChromaDB indexing status

### For Monitoring
- Track knowledge base growth
- Monitor content processing success rates
- Verify search quality and performance

## Output Format

The script provides structured, readable output with:
- Clear section separators (`===`)
- Hierarchical information display
- JSON-formatted metadata where appropriate
- Truncated content previews for readability

## Security Notes

- This script has read-only access to your knowledge bases
- It will display content summaries and metadata
- No modifications are made to your data
- Use in development/testing environments only
