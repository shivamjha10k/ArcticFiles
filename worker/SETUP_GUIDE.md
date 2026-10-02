# Semantic Worker API - Complete Setup and Testing Guide

## Project Overview
Your Semantic Worker API is a FastAPI-based service for document indexing and semantic search using:
- **SentenceTransformers** for text embeddings (all-MiniLM-L6-v2 model)
- **Qdrant** vector database for storing and searching embeddings
- **FastAPI** for the REST API interface

## Current Status ✅
1. **Qdrant**: Running on localhost:6333
2. **API Server**: Running on localhost:8081
3. **Model**: SentenceTransformers model loads successfully (384-dimensional vectors)
4. **Indexing**: Working correctly after model initialization

## Issue Identified and Fixed 🐛
The problem was that the embedding model wasn't being loaded automatically on startup. The model needs to be explicitly loaded before indexing can work. Once loaded:
- Vector size: 384 dimensions
- Model: sentence-transformers/all-MiniLM-L6-v2
- Indexing: Successfully processes documents into chunks

## API Endpoints 🚀

### 1. Health Check
```bash
GET http://localhost:8081/
GET http://localhost:8081/health
```

### 2. Index Documents
```bash
POST http://localhost:8081/index
Content-Type: application/json

{
  "paths": [
    "/Users/shivam/Desktop/arcticfiles/worker/sample_document.txt"
  ]
}
```

### 3. Semantic Search
```bash
POST http://localhost:8081/search
Content-Type: application/json

{
  "query": "machine learning algorithms",
  "top_k": 5
}
```

## Postman Collection Setup 📮

### Environment Variables
- `base_url`: `http://localhost:8081`

### Test Requests

#### 1. Health Check
- **Method**: GET
- **URL**: `{{base_url}}/health`
- **Expected**: Model info with `is_loaded: true` and `vector_size: 384`

#### 2. Index Sample Document
- **Method**: POST
- **URL**: `{{base_url}}/index`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "paths": [
    "/Users/shivam/Desktop/arcticfiles/worker/sample_document.txt"
  ]
}
```
- **Expected**: `{"files_indexed": 1, "chunks_indexed": X, "points": X}`

#### 3. Search Test
- **Method**: POST
- **URL**: `{{base_url}}/search`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "query": "deep learning neural networks",
  "top_k": 3
}
```

## Starting the Services 🔧

### 1. Start Qdrant (already running)
```bash
cd /Users/shivam/Desktop/arcticfiles
docker-compose up -d qdrant
```

### 2. Start API Server
```bash
cd /Users/shivam/Desktop/arcticfiles
source venv/bin/activate
cd worker
python app.py
```

### 3. Load Model (one-time initialization)
```bash
# Run this once to load the model
python test_model_load.py
```

## Sample cURL Commands 💻

```bash
# Health check
curl -s http://localhost:8081/health | python3 -m json.tool

# Index document
curl -X POST http://localhost:8081/index \
  -H "Content-Type: application/json" \
  -d '{"paths": ["/Users/shivam/Desktop/arcticfiles/worker/sample_document.txt"]}'

# Search
curl -X POST http://localhost:8081/search \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning", "top_k": 3}'
```

## Troubleshooting 🔍

### Model Not Loading
- **Symptom**: `is_loaded: false` in health endpoint
- **Solution**: Run `python test_model_load.py` to force model loading

### Zero Results in Indexing
- **Symptom**: `files_indexed: 0, chunks_indexed: 0`
- **Cause**: Model not loaded
- **Solution**: Ensure model is loaded first

### Connection Issues
- **Qdrant**: Check `docker ps` to ensure Qdrant container is running
- **API**: Check logs for port conflicts or import errors

## Configuration ⚙️
- **Qdrant URL**: http://localhost:6333
- **API Port**: 8081
- **Collection**: files_chunks
- **Model**: sentence-transformers/all-MiniLM-L6-v2
- **Chunk Size**: 800 words
- **Chunk Overlap**: 120 words
