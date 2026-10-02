# New Worker Service Endpoints

This document describes the new endpoints that have been added to the Semantic Worker API to provide comprehensive file indexing and management capabilities.

## Overview

The following endpoints have been implemented to match your requirements:

1. `POST /index-directory` - Index all supported files in a directory
2. `POST /index-file` - Index a single file
3. `POST /reindex-file` - Re-process a modified file (removes old entries first)
4. `DELETE /remove-file` - Remove a file from the index
5. `POST /search` - Search indexed content (enhanced existing endpoint)

## Endpoint Details

### 1. POST /index-directory

**Purpose**: Process an entire directory, indexing all supported files recursively.

**Request Body**:
```json
{
  "path": "/path/to/directory"
}
```

**Response**:
```json
{
  "success": true,
  "filesProcessed": 123,
  "chunksIndexed": 456,
  "totalFiles": 150,
  "directory": "/absolute/path/to/directory"
}
```

**Supported File Types**: .txt, .md, .py, .js, .ts, .json, .csv, .log, .pdf, .docx, .png, .jpg, .jpeg, .tiff

### 2. POST /index-file

**Purpose**: Process a single file and add it to the index.

**Request Body**:
```json
{
  "path": "/path/to/file.txt"
}
```

**Response**:
```json
{
  "success": true,
  "checksum": "abc123def456",
  "size": 1024,
  "chunksIndexed": 5,
  "filePath": "/absolute/path/to/file.txt",
  "fileName": "file.txt",
  "fileType": ".txt"
}
```

### 3. POST /reindex-file

**Purpose**: Re-process a modified file by removing old entries and adding new ones.

**Request Body**:
```json
{
  "path": "/path/to/modified/file.txt"
}
```

**Response**:
```json
{
  "success": true,
  "checksum": "def456ghi789",
  "size": 2048,
  "chunksIndexed": 8,
  "filePath": "/absolute/path/to/file.txt",
  "fileName": "file.txt",
  "fileType": ".txt",
  "reindexed": true
}
```

### 4. DELETE /remove-file

**Purpose**: Remove all indexed content for a specific file.

**Request Body**:
```json
{
  "path": "/path/to/file.txt"
}
```

**Response**:
```json
{
  "success": true,
  "chunksRemoved": 5,
  "filePath": "/absolute/path/to/file.txt",
  "fileName": "file.txt"
}
```

### 5. POST /search

**Purpose**: Search indexed content using semantic similarity.

**Request Body**:
```json
{
  "query": "machine learning algorithms",
  "top_k": 5
}
```

**Response**:
```json
{
  "query": "machine learning algorithms",
  "top_k": 5,
  "results": [
    {
      "score": 0.95,
      "file_path": "/path/to/document.pdf",
      "file_name": "document.pdf",
      "chunk": "Machine learning algorithms are...",
      "chunk_index": 0,
      "file_type": ".pdf",
      "file_size": 1024,
      "chunk_size": 256
    }
  ],
  "total_results": 1
}
```

## Implementation Details

### File Processing Pipeline

1. **Parse**: Extract text content based on file extension
2. **Chunk**: Split text into manageable pieces with overlap
3. **Embed**: Generate vector embeddings using SentenceTransformer
4. **Store**: Save embeddings and metadata to Qdrant vector database

### Metadata Stored

For each chunk, the following metadata is stored:
- `file_path`: Absolute path to the source file
- `file_name`: Name of the file
- `file_hash`: SHA256 hash for deduplication
- `file_size`: Size of the file in bytes
- `file_type`: File extension
- `chunk`: The actual text content
- `chunk_index`: Position of chunk within the file
- `chunk_size`: Length of the chunk text

### Error Handling

All endpoints include comprehensive error handling for:
- File not found (404)
- Invalid file paths (400)
- Processing failures (500)
- Database connection issues

### Performance Optimizations

- **Efficient File Search**: Uses Qdrant's filter capabilities for file-specific operations
- **Batch Processing**: Directory indexing processes files in batches
- **Normalized Embeddings**: All vectors are normalized for cosine similarity
- **Duplicate Prevention**: File hashes help identify and handle duplicates

## Testing

### Using the Test Script

Run the provided test script to verify all endpoints:

```bash
python test_new_endpoints.py
```

### Using Postman

Import the provided Postman collection (`New_Endpoints.postman_collection.json`) and set the `base_url` variable to your service URL (default: `http://localhost:8081`).

### Manual Testing with curl

```bash
# Index a directory
curl -X POST http://localhost:8081/index-directory \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/your/directory"}'

# Index a single file
curl -X POST http://localhost:8081/index-file \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/your/file.txt"}'

# Search content
curl -X POST http://localhost:8081/search \
  -H "Content-Type: application/json" \
  -d '{"query": "your search query", "top_k": 5}'

# Remove a file
curl -X DELETE http://localhost:8081/remove-file \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/your/file.txt"}'
```

## Dependencies

The implementation uses the existing dependencies:
- FastAPI for the web framework
- Qdrant for vector storage
- SentenceTransformers for embeddings
- Existing parsing and chunking utilities

No additional dependencies are required.

## Configuration

The service uses the existing configuration from `config.py`:
- `EMBEDDING_MODEL`: SentenceTransformer model name
- `CHUNK_SIZE`: Maximum chunk size for text splitting
- `CHUNK_OVERLAP`: Overlap between chunks
- `QDRANT_URL`: Vector database connection
- `QDRANT_COLLECTION`: Collection name for storage
- `MAX_TOP_K`: Default maximum search results

## Compatibility

These new endpoints are fully compatible with the existing service and do not modify or break any existing functionality. The original `/index` and `/search` endpoints continue to work as before.
