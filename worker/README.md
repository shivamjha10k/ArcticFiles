# Semantic Worker API

A FastAPI-based service for indexing documents and performing semantic search using sentence transformers and Qdrant vector database.

## 🚀 Quick Start

### 1. Start the Server
```bash
cd /Users/shivam/Desktop/arcticfiles/worker
/Users/shivam/Desktop/arcticfiles/venv/bin/python app.py
```

### 2. Access the API
- **API Base URL**: `http://localhost:8081`
- **Interactive Docs**: `http://localhost:8081/docs`
- **OpenAPI Schema**: `http://localhost:8081/openapi.json`

## 📋 API Endpoints

### 1. Health Check
**GET** `/health`

Check if the API and embedding model are loaded and healthy.

**Response:**
```json
{
  "status": "healthy",
  "model_info": {
    "model_name": "sentence-transformers/all-MiniLM-L6-v2",
    "vector_size": 384,
    "is_loaded": true,
    "qdrant_collection": "files_chunks"
  }
}
```

### 2. Root Endpoint
**GET** `/`

Basic health check endpoint.

**Response:**
```json
{
  "message": "Semantic Worker API is running",
  "status": "healthy"
}
```

### 3. Index Files
**POST** `/index`

Index multiple files by parsing, chunking, embedding, and storing in Qdrant.

**Request Body:**
```json
{
  "paths": [
    "/path/to/document1.txt",
    "/path/to/document2.pdf",
    "/path/to/document3.docx"
  ]
}
```

**Response:**
```json
{
  "files_indexed": 3,
  "chunks_indexed": 45,
  "points": 45
}
```

**Supported File Types:**
- `.txt`, `.md` - Plain text files
- `.pdf` - PDF documents
- `.docx` - Microsoft Word documents
- `.py`, `.js`, `.ts`, `.json`, `.csv`, `.log` - Code and data files
- `.png`, `.jpg`, `.jpeg`, `.tiff` - Images (with OCR)

### 4. Semantic Search
**POST** `/search`

Perform semantic search using query embedding and Qdrant vector search.

**Request Body:**
```json
{
  "query": "machine learning algorithms",
  "top_k": 5
}
```

**Response:**
```json
{
  "query": "machine learning algorithms",
  "top_k": 5,
  "results": [
    {
      "score": 0.8567,
      "file_path": "/path/to/document.pdf",
      "file_name": "document.pdf",
      "chunk": "Machine learning algorithms are...",
      "chunk_index": 2,
      "file_type": ".pdf",
      "file_size": 1048576,
      "chunk_size": 450
    }
  ],
  "total_results": 1
}
```

## 🧪 Testing with Postman

### Import the Collection
1. Open Postman
2. Click **Import**
3. Choose **File** and select `Semantic_Worker_API.postman_collection.json`
4. The collection will be imported with all endpoints pre-configured

### Environment Variables
Set the following variable in your Postman environment:
- `base_url`: `http://localhost:8081`

### Test Sequence
1. **Health Check** - Verify the API is running
2. **Index Files** - Index some sample documents
3. **Semantic Search** - Search for relevant content

## 🧪 Testing with curl

### Health Check
```bash
curl -X GET "http://localhost:8081/health" \
  -H "accept: application/json"
```

### Index Files
```bash
curl -X POST "http://localhost:8081/index" \
  -H "Content-Type: application/json" \
  -d '{
    "paths": ["/path/to/your/document.txt"]
  }'
```

### Semantic Search
```bash
curl -X POST "http://localhost:8081/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning",
    "top_k": 3
  }'
```

## 🧪 Testing with Python

Use the provided `test_api.py` script:

```bash
cd /Users/shivam/Desktop/arcticfiles/worker
/Users/shivam/Desktop/arcticfiles/venv/bin/python test_api.py
```

## ⚙️ Configuration

The API uses settings from `config.py` which can be customized via environment variables:

```python
# Key settings
QDRANT_URL = "http://localhost:6333"
QDRANT_COLLECTION = "files_chunks"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
MAX_TOP_K = 8
```

## 🏗️ How It Works

### 1. Document Processing Pipeline
1. **File Parsing**: Extract text from various file formats
2. **Text Chunking**: Split text into overlapping chunks
3. **Embedding Generation**: Convert chunks to vector embeddings
4. **Vector Storage**: Store embeddings in Qdrant database

### 2. Search Process
1. **Query Embedding**: Convert search query to vector
2. **Similarity Search**: Find similar vectors in Qdrant
3. **Result Formatting**: Return ranked results with metadata

### 3. Architecture Components
- **FastAPI**: Web framework for API endpoints
- **SentenceTransformers**: Generate semantic embeddings
- **Qdrant**: Vector database for similarity search
- **PyMuPDF**: PDF text extraction
- **python-docx**: Word document processing
- **Tesseract**: OCR for image text extraction

## 🔧 Troubleshooting

### Common Issues

1. **Model Loading Errors**
   - Ensure sufficient memory (>2GB) for embedding model
   - Check internet connection for model download

2. **Qdrant Connection Issues**
   - Verify Qdrant is running on `localhost:6333`
   - Check QDRANT_URL in configuration

3. **File Processing Errors**
   - Ensure file paths are absolute and accessible
   - Check file permissions and formats

### Logs
The API provides detailed logging. Check console output for:
- Model loading status
- File processing progress
- Search request details
- Error messages

## 📊 Performance Notes

- **Embedding Model**: Uses `all-MiniLM-L6-v2` (384 dimensions)
- **Chunk Size**: 800 characters with 120 character overlap
- **Search**: Cosine similarity with configurable top-k results
- **Concurrency**: FastAPI supports async operations

## 🔐 Security Considerations

- API runs on all interfaces (`0.0.0.0:8081`)
- No authentication implemented (add as needed)
- File path validation recommended for production
- Consider rate limiting for public deployments
