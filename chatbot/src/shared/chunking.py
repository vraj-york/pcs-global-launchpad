"""
Shared Chunking Utilities

Text chunking logic used by both the main app and ingestion lambda.
Single source of truth for all chunking operations.
"""

import logging
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 100,
    min_chunk_chars: int = 50,
) -> List[Dict]:
    """
    Split text into overlapping chunks

    Args:
        text: Text to chunk
        chunk_size: Maximum characters per chunk
        chunk_overlap: Overlap between chunks
        min_chunk_chars: Minimum characters for valid chunk

    Returns:
        List of chunk dictionaries
    """
    if not text or len(text) < min_chunk_chars:
        logger.debug(f"Text too short to chunk (length: {len(text) if text else 0})")
        return []

    chunks = []
    words = text.split()
    current_chunk = []
    current_size = 0
    chunk_index = 0

    for word in words:
        current_chunk.append(word)
        current_size += len(word) + 1

        if current_size >= chunk_size:
            chunk_text = " ".join(current_chunk)
            chunks.append(
                {
                    "chunk_index": chunk_index,
                    "chunk_text": chunk_text,
                    "token_count": len(current_chunk),
                }
            )

            # Calculate overlap
            overlap_words = int(len(current_chunk) * (chunk_overlap / chunk_size))
            current_chunk = current_chunk[-overlap_words:] if overlap_words > 0 else []
            current_size = sum(len(w) + 1 for w in current_chunk)
            chunk_index += 1

    # Add remaining chunk
    if current_chunk:
        chunk_text = " ".join(current_chunk)
        if len(chunk_text) >= min_chunk_chars:
            chunks.append(
                {
                    "chunk_index": chunk_index,
                    "chunk_text": chunk_text,
                    "token_count": len(current_chunk),
                }
            )

    logger.info(f"Chunked text into {len(chunks)} chunks (text length: {len(text)} chars)")
    return chunks


def chunk_sections(
    sections: List[Tuple[int, str, str]],
    chunk_size: int = 1000,
    section_type: str = "slide",
) -> List[Dict]:
    """
    Chunk sections (slides, paragraphs, etc.)

    Args:
        sections: List of (index, title, content) tuples
        chunk_size: Maximum chunk size
        section_type: Type of section for metadata

    Returns:
        List of chunk dictionaries with section metadata
    """
    logger.info(f"Chunking {len(sections)} {section_type}s")
    
    chunks = []
    chunk_index = 0

    for section_num, title, content in sections:
        full_text = f"{title}\n\n{content}" if title else content

        if not full_text or len(full_text) < 50:
            logger.debug(f"Skipping {section_type} {section_num} (too short)")
            continue

        # If fits in one chunk, keep together
        if len(full_text) <= chunk_size:
            chunks.append(
                {
                    "chunk_index": chunk_index,
                    "chunk_text": full_text,
                    "section_number": section_num,
                    "section_title": title,
                    "section_type": section_type,
                    "token_count": len(full_text.split()),
                }
            )
            chunk_index += 1
        else:
            # Split large sections
            logger.debug(f"{section_type.capitalize()} {section_num} too large, splitting")
            section_chunks = chunk_text(full_text, chunk_size)
            for chunk in section_chunks:
                chunk["chunk_index"] = chunk_index
                chunk["section_number"] = section_num
                chunk["section_title"] = title
                chunk["section_type"] = section_type
                chunks.append(chunk)
                chunk_index += 1

    logger.info(f"Created {len(chunks)} total chunks from {len(sections)} {section_type}s")
    return chunks
