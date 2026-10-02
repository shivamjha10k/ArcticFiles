from typing import List
import re

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Semantic chunking that respects sentence boundaries and context.
    
    Args:
        text: Input text to chunk
        chunk_size: Target size in characters (not words)
        overlap: Overlap size in characters
        
    Returns:
        List of semantically coherent chunks
    """
    if not text.strip():
        return []
    
    # First, split into sentences using multiple delimiters
    sentence_endings = r'[.!?]\s+|[\n\r]+\s*[\n\r]+|\n\s*-\s*|\n\s*\*\s*|\n\s*\d+\.\s*'
    sentences = re.split(sentence_endings, text)
    
    # Clean up sentences
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        return [text]
    
    chunks = []
    current_chunk = ""
    
    i = 0
    while i < len(sentences):
        sentence = sentences[i]
        
        # If current chunk is empty, start with this sentence
        if not current_chunk:
            current_chunk = sentence
            i += 1
            continue
        
        # Check if adding this sentence would exceed chunk size
        potential_chunk = current_chunk + " " + sentence
        
        if len(potential_chunk) <= chunk_size:
            # Safe to add this sentence
            current_chunk = potential_chunk
            i += 1
        else:
            # Current chunk is full, finalize it
            if current_chunk:
                chunks.append(current_chunk.strip())
            
            # Start new chunk with overlap
            if overlap > 0 and chunks:
                # Find sentences to include in overlap
                overlap_text = ""
                overlap_chars = 0
                
                # Work backwards from current position to build overlap
                for j in range(i - 1, -1, -1):
                    prev_sentence = sentences[j]
                    if overlap_chars + len(prev_sentence) + 1 <= overlap:
                        overlap_text = prev_sentence + " " + overlap_text if overlap_text else prev_sentence
                        overlap_chars += len(prev_sentence) + 1
                    else:
                        break
                
                # Start new chunk with overlap + current sentence
                if overlap_text:
                    current_chunk = overlap_text.strip() + " " + sentence
                else:
                    current_chunk = sentence
            else:
                current_chunk = sentence
            
            i += 1
    
    # Don't forget the last chunk
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    # Handle very long sentences that exceed chunk_size
    final_chunks = []
    for chunk in chunks:
        if len(chunk) <= chunk_size:
            final_chunks.append(chunk)
        else:
            # Split long chunk at paragraph or clause boundaries
            split_chunks = _split_long_chunk(chunk, chunk_size)
            final_chunks.extend(split_chunks)
    
    return [chunk for chunk in final_chunks if chunk.strip()]


def _split_long_chunk(text: str, max_size: int) -> List[str]:
    """
    Split a chunk that's too long while preserving context.
    
    Args:
        text: Text to split
        max_size: Maximum chunk size
        
    Returns:
        List of smaller chunks
    """
    if len(text) <= max_size:
        return [text]
    
    # Try to split at paragraph breaks first
    paragraphs = re.split(r'\n\s*\n', text)
    if len(paragraphs) > 1:
        chunks = []
        current = ""
        for para in paragraphs:
            if not current:
                current = para
            elif len(current + "\n\n" + para) <= max_size:
                current += "\n\n" + para
            else:
                if current:
                    chunks.append(current)
                current = para
        if current:
            chunks.append(current)
        
        # Recursively handle any remaining long chunks
        final_chunks = []
        for chunk in chunks:
            if len(chunk) <= max_size:
                final_chunks.append(chunk)
            else:
                final_chunks.extend(_split_long_chunk(chunk, max_size))
        return final_chunks
    
    # If no paragraph breaks, split at clause boundaries
    clause_breaks = r'[,;:]\s+|(?<=\w)\s+(?=and|but|or|however|therefore|thus|moreover|furthermore)\s+'
    clauses = re.split(clause_breaks, text)
    
    if len(clauses) > 1:
        chunks = []
        current = ""
        for clause in clauses:
            if not current:
                current = clause
            elif len(current + " " + clause) <= max_size:
                current += " " + clause
            else:
                if current:
                    chunks.append(current)
                current = clause
        if current:
            chunks.append(current)
        return chunks
    
    # Last resort: split by words but try to end at word boundaries
    words = text.split()
    chunks = []
    current_words = []
    current_length = 0
    
    for word in words:
        word_length = len(word) + 1  # +1 for space
        if current_length + word_length <= max_size:
            current_words.append(word)
            current_length += word_length
        else:
            if current_words:
                chunks.append(" ".join(current_words))
            current_words = [word]
            current_length = len(word)
    
    if current_words:
        chunks.append(" ".join(current_words))
    
    return chunks
