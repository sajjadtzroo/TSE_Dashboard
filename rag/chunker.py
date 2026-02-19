"""
Text Chunker — LangChain RecursiveCharacterTextSplitter.
Adapted from PDF_to_Vector reference project.
"""

import logging

from langchain_text_splitters import RecursiveCharacterTextSplitter

from config.settings import CHUNK_OVERLAP, CHUNK_SIZE

logger = logging.getLogger(__name__)

SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


def create_chunks(pages: list[dict], source_file: str = "") -> list[dict]:
    """
    Split extracted pages into overlapping chunks.

    Args:
        pages: list of {page_num, text} from extractor
        source_file: PDF filename for metadata

    Returns:
        list of {text, page_numbers, chunk_index}
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=SEPARATORS,
    )

    # Build full text with page markers for tracking
    all_chunks = []
    chunk_index = 0

    for page in pages:
        page_text = page["text"]
        if not page_text.strip():
            continue

        splits = splitter.split_text(page_text)
        for split_text in splits:
            if split_text.strip():
                all_chunks.append(
                    {
                        "text": split_text.strip(),
                        "page_numbers": str(page["page_num"]),
                        "chunk_index": chunk_index,
                    }
                )
                chunk_index += 1

    logger.info(
        f"Created {len(all_chunks)} chunks from {len(pages)} pages ({source_file})"
    )
    return all_chunks
