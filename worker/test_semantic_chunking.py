#!/usr/bin/env python3
"""
Test semantic chunking functionality
"""

from chunker import chunk_text

def test_semantic_chunking():
    """Test that chunking respects sentence boundaries"""
    
    # Test text with clear sentence boundaries
    test_text = """
    Machine learning is a subset of artificial intelligence. It enables computers to learn automatically from data. 
    Deep learning is a subset of machine learning that uses neural networks. These networks can have many layers.
    
    Natural language processing helps computers understand human language. It combines computational linguistics with machine learning.
    Computer vision allows machines to interpret visual information. This field has applications in medical imaging.
    
    Reinforcement learning trains agents through trial and error. The agent receives rewards for good actions.
    Supervised learning uses labeled training data. Unsupervised learning finds patterns in unlabeled data.
    """
    
    print("🧪 Testing Semantic Chunking")
    print("=" * 50)
    
    # Test with different chunk sizes
    for chunk_size in [300, 500, 800]:
        print(f"\n📊 Chunk Size: {chunk_size} characters")
        print("-" * 30)
        
        chunks = chunk_text(test_text.strip(), chunk_size=chunk_size, overlap=100)
        
        print(f"Number of chunks: {len(chunks)}")
        
        for i, chunk in enumerate(chunks, 1):
            print(f"\n🔸 Chunk {i} ({len(chunk)} chars):")
            print(f"'{chunk[:100]}...'" if len(chunk) > 100 else f"'{chunk}'")
            
            # Check if chunk ends with complete sentence
            chunk_stripped = chunk.strip()
            if chunk_stripped and chunk_stripped[-1] in '.!?':
                print("✅ Ends with complete sentence")
            else:
                print("⚠️  Does not end with complete sentence")
    
    print("\n" + "=" * 50)

def test_long_sentence_handling():
    """Test handling of very long sentences"""
    
    print("\n🧪 Testing Long Sentence Handling")
    print("=" * 50)
    
    # Very long sentence that exceeds typical chunk size
    long_text = """This is an extremely long sentence that contains multiple clauses, subclauses, and detailed explanations about various topics including machine learning algorithms, natural language processing techniques, computer vision applications, data preprocessing methods, feature engineering approaches, model evaluation metrics, cross-validation strategies, hyperparameter tuning procedures, ensemble learning methods, and deep learning architectures that are commonly used in modern artificial intelligence applications across different industries and domains."""
    
    chunks = chunk_text(long_text, chunk_size=200, overlap=50)
    
    print(f"Long text length: {len(long_text)} characters")
    print(f"Number of chunks: {len(chunks)}")
    
    for i, chunk in enumerate(chunks, 1):
        print(f"\n🔸 Chunk {i} ({len(chunk)} chars):")
        print(f"'{chunk}'")

def test_paragraph_chunking():
    """Test chunking with paragraph structure"""
    
    print("\n🧪 Testing Paragraph Structure Preservation")
    print("=" * 50)
    
    paragraph_text = """Introduction to Machine Learning

Machine learning is revolutionizing how we process and understand data. It provides systems the ability to automatically learn and improve from experience without being explicitly programmed.

Types of Machine Learning

There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning. Each type serves different purposes and uses different approaches.

Supervised Learning
This approach uses labeled training data to learn a mapping function from input to output. Common algorithms include linear regression, decision trees, and neural networks.

Unsupervised Learning  
This finds hidden patterns in data without labeled examples. Clustering and dimensionality reduction are common unsupervised techniques.

Applications
Machine learning has applications in healthcare, finance, transportation, and many other fields. It powers recommendation systems, fraud detection, and autonomous vehicles."""

    chunks = chunk_text(paragraph_text, chunk_size=400, overlap=80)
    
    print(f"Number of chunks: {len(chunks)}")
    
    for i, chunk in enumerate(chunks, 1):
        print(f"\n🔸 Chunk {i} ({len(chunk)} chars):")
        print(f"'{chunk}'")
        print()

if __name__ == "__main__":
    test_semantic_chunking()
    test_long_sentence_handling()
    test_paragraph_chunking()
    print("\n✅ Semantic chunking tests completed!")
