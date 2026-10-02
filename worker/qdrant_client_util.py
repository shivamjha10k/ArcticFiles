"""
Qdrant client utilities for vector database operations.

This module provides helper functions for managing Qdrant collections,
upserting embeddings, and performing similarity searches.
"""

from qdrant_client import QdrantClient
from qdrant_client.http import models as qm
from typing import Sequence, List, Dict, Any, Optional
import numpy as np
from config import get_settings
import logging

logger = logging.getLogger(__name__)

_settings = get_settings()
_client = QdrantClient(url=_settings.QDRANT_URL, api_key=_settings.QDRANT_API_KEY)

def ensure_collection(vector_size: int) -> bool:
    """
    Ensure the collection exists, create if it doesn't.
    
    Args:
        vector_size: Dimension of the embedding vectors
        
    Returns:
        bool: True if collection exists or was created successfully
    """
    name = _settings.QDRANT_COLLECTION
    
    try:
        existing = [c.name for c in _client.get_collections().collections]
        
        if name in existing:
            logger.info(f"Collection '{name}' already exists")
            
            # Verify vector configuration
            collection_info = _client.get_collection(name)
            if hasattr(collection_info.config, 'params') and hasattr(collection_info.config.params, 'vectors'):
                existing_size = collection_info.config.params.vectors.size
                if existing_size != vector_size:
                    logger.warning(
                        f"Collection '{name}' exists but has different vector size: "
                        f"existing={existing_size}, required={vector_size}"
                    )
                    return False
            return True
        
        # Create collection with cosine similarity
        _client.recreate_collection(
            collection_name=name,
            vectors_config=qm.VectorParams(size=vector_size, distance=qm.Distance.COSINE),
        )
        
        logger.info(f"Created collection '{name}' with vector size {vector_size}")
        return True
        
    except Exception as e:
        logger.error(f"Error ensuring collection '{name}': {e}")
        return False

def upsert_embeddings(ids: Sequence[str], vectors: np.ndarray, payloads: list[dict]) -> bool:
    """
    Upsert embeddings into the collection.
    
    Args:
        ids: List of unique identifiers for the vectors
        vectors: Numpy array of normalized embedding vectors
        payloads: List of metadata dictionaries for each vector
        
    Returns:
        bool: True if upsert was successful
    """
    name = _settings.QDRANT_COLLECTION
    
    if len(ids) != len(vectors) or len(ids) != len(payloads):
        logger.error("Mismatch in lengths of ids, vectors, and payloads")
        return False
    
    try:
        operation_info = _client.upsert(
            collection_name=name,
            points=qm.Batch(
                ids=list(ids),
                vectors=vectors.tolist(),
                payloads=payloads,
            ),
        )
        
        logger.info(f"Upserted {len(ids)} points to collection '{name}'")
        return True
        
    except Exception as e:
        logger.error(f"Error upserting embeddings to '{name}': {e}")
        return False

def search(
    query_vector: np.ndarray, 
    top_k: Optional[int] = None,
    score_threshold: Optional[float] = None,
    filter_conditions: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Search for similar vectors in the collection using cosine similarity.
    
    Args:
        query_vector: Query embedding vector
        top_k: Maximum number of results to return (uses MAX_TOP_K if None)
        score_threshold: Minimum similarity score for results
        filter_conditions: Optional filter conditions for metadata
        
    Returns:
        List of search results with scores and payloads
    """
    name = _settings.QDRANT_COLLECTION
    
    if top_k is None:
        top_k = _settings.MAX_TOP_K
    
    try:
        # Build filter if provided
        search_filter = None
        if filter_conditions:
            conditions = []
            for field, value in filter_conditions.items():
                conditions.append(
                    qm.FieldCondition(
                        key=field,
                        match=qm.MatchValue(value=value)
                    )
                )
            search_filter = qm.Filter(must=conditions)
        
        # Perform search
        search_results = _client.search(
            collection_name=name,
            query_vector=query_vector.tolist(),
            limit=top_k,
            score_threshold=score_threshold,
            query_filter=search_filter,
            with_payload=True,
            with_vectors=False,
        )
        
        # Format results
        results = []
        for result in search_results:
            results.append({
                "id": result.id,
                "score": result.score,
                "payload": result.payload or {}
            })
        
        logger.info(f"Found {len(results)} results for search query")
        return results
        
    except Exception as e:
        logger.error(f"Error searching in collection '{name}': {e}")
        return []

def delete_points(ids: List[str]) -> bool:
    """
    Delete points from the collection by IDs.
    
    Args:
        ids: List of point IDs to delete
        
    Returns:
        bool: True if deletion was successful
    """
    name = _settings.QDRANT_COLLECTION
    
    try:
        operation_info = _client.delete(
            collection_name=name,
            points_selector=qm.PointIdsList(
                points=ids
            )
        )
        
        logger.info(f"Deleted {len(ids)} points from collection '{name}'")
        return True
        
    except Exception as e:
        logger.error(f"Error deleting points from '{name}': {e}")
        return False

def get_collection_info() -> Optional[Dict[str, Any]]:
    """
    Get information about the collection.
    
    Returns:
        Dictionary with collection information or None if error
    """
    name = _settings.QDRANT_COLLECTION
    
    try:
        collection_info = _client.get_collection(name)
        
        return {
            "name": name,
            "vector_size": collection_info.config.params.vectors.size,
            "distance": collection_info.config.params.vectors.distance.value,
            "points_count": collection_info.points_count,
            "status": collection_info.status.value
        }
        
    except Exception as e:
        logger.error(f"Error getting collection info for '{name}': {e}")
        return None

def search_by_file_path(file_path: str) -> List[Dict[str, Any]]:
    """
    Search for all points associated with a specific file path.
    
    Args:
        file_path: Absolute path to the file
        
    Returns:
        List of all points/chunks for the specified file
    """
    name = _settings.QDRANT_COLLECTION
    
    try:
        # Use scroll to get all points with matching file_path
        scroll_filter = qm.Filter(
            must=[
                qm.FieldCondition(
                    key="file_path",
                    match=qm.MatchValue(value=file_path)
                )
            ]
        )
        
        points, _ = _client.scroll(
            collection_name=name,
            scroll_filter=scroll_filter,
            limit=10000,  # Large limit to get all chunks for a file
            with_payload=True,
            with_vectors=False
        )
        
        results = []
        for point in points:
            results.append({
                "id": point.id,
                "payload": point.payload or {}
            })
        
        logger.info(f"Found {len(results)} chunks for file: {file_path}")
        return results
        
    except Exception as e:
        logger.error(f"Error searching by file path '{file_path}': {e}")
        return []
