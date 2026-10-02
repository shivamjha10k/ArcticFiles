#!/usr/bin/env python3
"""
Postman-style test examples for the Semantic Worker API.
This demonstrates all endpoints with example requests and responses.
"""

import json

def show_postman_examples():
    """Display Postman-style examples for all API endpoints."""
    
    print("📋 SEMANTIC WORKER API - POSTMAN EXAMPLES")
    print("=" * 60)
    print()
    
    # Base Configuration
    print("🔧 ENVIRONMENT SETUP")
    print("-" * 30)
    print("Base URL: http://localhost:8081")
    print("Content-Type: application/json")
    print()
    
    # 1. Health Check
    print("1️⃣ HEALTH CHECK")
    print("-" * 30)
    print("Method: GET")
    print("URL: {{base_url}}/health")
    print("Headers: None required")
    print()
    print("Expected Response (200 OK):")
    health_response = {
        "status": "healthy",
        "model_info": {
            "model_name": "sentence-transformers/all-MiniLM-L6-v2",
            "vector_size": 384,
            "is_loaded": True,
            "qdrant_collection": "files_chunks"
        }
    }
    print(json.dumps(health_response, indent=2))
    print()
    
    # 2. Root Endpoint
    print("2️⃣ ROOT ENDPOINT")
    print("-" * 30)
    print("Method: GET")
    print("URL: {{base_url}}/")
    print("Headers: None required")
    print()
    print("Expected Response (200 OK):")
    root_response = {
        "message": "Semantic Worker API is running",
        "status": "healthy"
    }
    print(json.dumps(root_response, indent=2))
    print()
    
    # 3. Index Files
    print("3️⃣ INDEX FILES")
    print("-" * 30)
    print("Method: POST")
    print("URL: {{base_url}}/index")
    print("Headers: Content-Type: application/json")
    print()
    print("Request Body:")
    index_request = {
        "paths": [
            "/Users/shivam/Desktop/arcticfiles/worker/sample_document.txt",
            "/path/to/your/document.pdf",
            "/path/to/another/file.docx"
        ]
    }
    print(json.dumps(index_request, indent=2))
    print()
    print("Expected Response (200 OK):")
    index_response = {
        "files_indexed": 3,
        "chunks_indexed": 15,
        "points": 15
    }
    print(json.dumps(index_response, indent=2))
    print()
    
    # 4. Semantic Search with top_k
    print("4️⃣ SEMANTIC SEARCH (with top_k)")
    print("-" * 30)
    print("Method: POST")
    print("URL: {{base_url}}/search")
    print("Headers: Content-Type: application/json")
    print()
    print("Request Body:")
    search_request = {
        "query": "machine learning algorithms",
        "top_k": 5
    }
    print(json.dumps(search_request, indent=2))
    print()
    print("Expected Response (200 OK):")
    search_response = {
        "query": "machine learning algorithms",
        "top_k": 5,
        "results": [
            {
                "score": 0.8567,
                "file_path": "/Users/shivam/Desktop/arcticfiles/worker/sample_document.txt",
                "file_name": "sample_document.txt",
                "chunk": "Machine learning is a subset of artificial intelligence (AI) that enables computer systems to automatically learn and improve from experience without being explicitly programmed. It focuses on the development of algorithms that can access data and use it to learn for themselves.",
                "chunk_index": 0,
                "file_type": ".txt",
                "file_size": 2048,
                "chunk_size": 245
            }
        ],
        "total_results": 1
    }
    print(json.dumps(search_response, indent=2))
    print()
    
    # 5. Semantic Search without top_k
    print("5️⃣ SEMANTIC SEARCH (default top_k)")
    print("-" * 30)
    print("Method: POST")
    print("URL: {{base_url}}/search")
    print("Headers: Content-Type: application/json")
    print()
    print("Request Body:")
    search_default_request = {
        "query": "deep learning neural networks"
    }
    print(json.dumps(search_default_request, indent=2))
    print()
    print("Expected Response (200 OK):")
    search_default_response = {
        "query": "deep learning neural networks",
        "top_k": 8,  # Uses MAX_TOP_K from config
        "results": [
            {
                "score": 0.7891,
                "file_path": "/Users/shivam/Desktop/arcticfiles/worker/sample_document.txt",
                "file_name": "sample_document.txt",
                "chunk": "Deep learning is a specialized subset of machine learning that uses artificial neural networks with multiple layers (deep neural networks). It has revolutionized many fields including:",
                "chunk_index": 3,
                "file_type": ".txt",
                "file_size": 2048,
                "chunk_size": 178
            }
        ],
        "total_results": 1
    }
    print(json.dumps(search_default_response, indent=2))
    print()
    
    # Error Examples
    print("❌ ERROR RESPONSES")
    print("-" * 30)
    print("404 Not Found (Invalid endpoint):")
    error_404 = {
        "detail": "Not Found"
    }
    print(json.dumps(error_404, indent=2))
    print()
    
    print("422 Validation Error (Invalid request body):")
    error_422 = {
        "detail": [
            {
                "loc": ["body", "paths"],
                "msg": "field required",
                "type": "value_error.missing"
            }
        ]
    }
    print(json.dumps(error_422, indent=2))
    print()
    
    print("500 Internal Server Error (Processing failed):")
    error_500 = {
        "detail": "Indexing failed: File not found"
    }
    print(json.dumps(error_500, indent=2))
    print()
    
    # curl Examples
    print("🌐 CURL COMMAND EXAMPLES")
    print("-" * 30)
    print("# Health Check")
    print("curl -X GET \"http://localhost:8081/health\"")
    print()
    
    print("# Index Files")
    print("curl -X POST \"http://localhost:8081/index\" \\")
    print("  -H \"Content-Type: application/json\" \\")
    print("  -d '{\"paths\": [\"/path/to/document.txt\"]}'")
    print()
    
    print("# Semantic Search")
    print("curl -X POST \"http://localhost:8081/search\" \\")
    print("  -H \"Content-Type: application/json\" \\")
    print("  -d '{\"query\": \"machine learning\", \"top_k\": 3}'")
    print()
    
    # Test queries
    print("🔍 EXAMPLE SEARCH QUERIES")
    print("-" * 30)
    example_queries = [
        "machine learning algorithms",
        "deep learning neural networks", 
        "supervised learning examples",
        "artificial intelligence applications",
        "reinforcement learning games",
        "computer vision image processing",
        "natural language processing",
        "predictive maintenance manufacturing"
    ]
    
    for i, query in enumerate(example_queries, 1):
        print(f"{i}. \"{query}\"")
    print()
    
    print("📝 NOTES")
    print("-" * 30)
    print("• All POST requests require Content-Type: application/json header")
    print("• File paths must be absolute and accessible to the server")
    print("• Search scores range from 0.0 to 1.0 (higher = more similar)")
    print("• Default top_k is configured in config.py (MAX_TOP_K = 8)")
    print("• Supported file types: .txt, .md, .pdf, .docx, .py, .js, .ts, .json, .csv, .log, .png, .jpg, .jpeg, .tiff")
    print("• API documentation available at: http://localhost:8081/docs")

if __name__ == "__main__":
    show_postman_examples()
