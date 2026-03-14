"""
Text Chunker — LangChain RecursiveCharacterTextSplitter.
Adapted from PDF_to_Vector reference project.
"""

import logging

from langchain_text_splitters import RecursiveCharacterTextSplitter

from config.settings import CHUNK_OVERLAP, CHUNK_SIZE

logger = logging.getLogger(__name__)

SEPARATORS = ["\n\n", "\n", ".\u200c", ". ", "\u061f ", "! ", "? ", " ", ""]


def _build_page_section_map(toc: list[dict]) -> dict[int, str]:
    """Build a mapping from page_num -> section_title from TOC entries.

    For each page, the section title is the last TOC entry whose page_num
    is <= that page number.
    """
    if not toc:
        return {}
    # Sort by page_num to ensure correct ordering
    sorted_toc = sorted(toc, key=lambda e: e["page_num"])
    return {e["page_num"]: e["title"] for e in sorted_toc}


def _get_section_for_page(page_num: int, toc_map: dict[int, str]) -> str | None:
    """Find the section title that applies to a given page number."""
    if not toc_map:
        return None
    # Find the latest TOC entry whose page_num <= our page_num
    best = None
    for toc_page, title in toc_map.items():
        if toc_page <= page_num:
            best = title
    return best


def create_chunks(
    pages: list[dict],
    source_file: str = "",
    toc: list[dict] | None = None,
    table_chunks: list[dict] | None = None,
) -> list[dict]:
    """
    Split extracted pages into overlapping chunks.
    Tables (if provided) are injected as atomic chunks bypassing the character splitter.

    Args:
        pages: list of {page_num, text} from extractor
        source_file: PDF filename for metadata
        toc: optional list of {level, title, page_num} from extract_toc()
        table_chunks: optional list of {page_num, table_text, bbox} from extract_tables()

    Returns:
        list of {text, page_numbers, chunk_index, section_title, chunk_type}
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=SEPARATORS,
    )

    toc_map = _build_page_section_map(toc or [])

    all_chunks = []
    chunk_index = 0

    # Track page numbers that have tables so we can skip those pages in text splitting
    table_page_nums: set[int] = set()
    if table_chunks:
        for tc in table_chunks:
            table_page_nums.add(tc["page_num"])

    for page in pages:
        page_num = page["page_num"]
        page_text = page["text"]
        if not page_text.strip():
            continue

        section_title = _get_section_for_page(page_num, toc_map)

        # If this page has tables, inject the table chunks for this page first
        if table_chunks and page_num in table_page_nums:
            for tc in table_chunks:
                if tc["page_num"] == page_num:
                    all_chunks.append(
                        {
                            "text": tc["table_text"].strip(),
                            "page_numbers": str(page_num),
                            "chunk_index": chunk_index,
                            "section_title": section_title,
                            "chunk_type": "table",
                        }
                    )
                    chunk_index += 1
            # Still process remaining text on the page (non-table paragraphs)

        splits = splitter.split_text(page_text)
        for split_text in splits:
            if split_text.strip():
                all_chunks.append(
                    {
                        "text": split_text.strip(),
                        "page_numbers": str(page_num),
                        "chunk_index": chunk_index,
                        "section_title": section_title,
                        "chunk_type": "text",
                    }
                )
                chunk_index += 1

    logger.info(
        f"Created {len(all_chunks)} chunks from {len(pages)} pages ({source_file})"
    )
    return all_chunks
