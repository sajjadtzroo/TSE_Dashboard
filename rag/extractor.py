"""
PDF Text Extractor — PyMuPDF with Tesseract OCR fallback.
Adapted from PDF_to_Vector reference project.
"""

import logging
from pathlib import Path

import fitz  # PyMuPDF

from config.settings import OCR_FALLBACK_THRESHOLD

logger = logging.getLogger(__name__)


def _ocr_page(pdf_path: str, page_num: int) -> str:
    """OCR a single page using pytesseract + pdf2image."""
    try:
        import pytesseract
        from pdf2image import convert_from_path

        images = convert_from_path(
            pdf_path,
            first_page=page_num + 1,
            last_page=page_num + 1,
            dpi=300,
        )
        if images:
            text = pytesseract.image_to_string(images[0], lang="fas+eng")
            return text.strip()
    except ImportError:
        logger.debug("pytesseract/pdf2image not available, skipping OCR")
    except Exception as e:
        logger.warning(f"OCR failed for page {page_num} of {pdf_path}: {e}")
    return ""


def extract_text(pdf_path: str) -> list[dict]:
    """
    Extract text from a PDF file.

    Returns list of {page_num: int, text: str} dicts.
    Falls back to OCR for pages with very little text.
    """
    pages = []
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        logger.error(f"Cannot open PDF {pdf_path}: {e}")
        return pages

    try:
        for page_num in range(len(doc)):
            try:
                page = doc[page_num]
                text = page.get_text().strip()

                # OCR fallback for scanned pages
                if len(text) < OCR_FALLBACK_THRESHOLD:
                    ocr_text = _ocr_page(pdf_path, page_num)
                    if len(ocr_text) > len(text):
                        text = ocr_text

                if text:
                    pages.append(
                        {
                            "page_num": page_num + 1,  # 1-indexed
                            "text": text,
                        }
                    )
            except Exception as e:
                logger.warning(f"Error extracting page {page_num} from {pdf_path}: {e}")
                continue
    finally:
        doc.close()

    logger.info(f"Extracted {len(pages)} pages from {Path(pdf_path).name}")
    return pages


def get_page_count(pdf_path: str) -> int:
    """Get number of pages in a PDF."""
    try:
        doc = fitz.open(pdf_path)
        count = len(doc)
        doc.close()
        return count
    except Exception:
        return 0


def extract_toc(pdf_path: str) -> list[dict]:
    """Extract table of contents from a PDF using PyMuPDF.

    Returns list of {level, title, page_num} dicts (1-indexed page numbers).
    """
    try:
        doc = fitz.open(pdf_path)
        toc = doc.get_toc()
        doc.close()
    except Exception as e:
        logger.debug(f"Cannot extract TOC from {pdf_path}: {e}")
        return []

    entries = []
    for level, title, page_num in toc:
        if title and title.strip():
            entries.append({
                "level": level,
                "title": title.strip(),
                "page_num": page_num,  # already 1-indexed in PyMuPDF TOC
            })

    if entries:
        logger.info(f"Extracted {len(entries)} TOC entries from {Path(pdf_path).name}")
    return entries


def extract_tables(pdf_path: str) -> list[dict]:
    """Extract tables from a PDF using pdfplumber.

    Returns list of {page_num: int, table_text: str, bbox: tuple} dicts.
    Each table is formatted as pipe-delimited rows for readability.
    Falls back to empty list if pdfplumber is not installed.
    """
    try:
        import pdfplumber
    except ImportError:
        logger.debug("pdfplumber not available, table extraction disabled")
        return []

    tables = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                try:
                    page_tables = page.extract_tables()
                    for tbl in page_tables:
                        if not tbl:
                            continue
                        rows = []
                        for row in tbl:
                            # Replace None cells with empty string, preserve 0 values
                            cells = [str(cell).strip() if cell is not None else "" for cell in row]
                            rows.append(" | ".join(cells))
                        table_text = "\n".join(rows)
                        if table_text.strip():
                            bbox = page.bbox  # (x0, top, x1, bottom) of the page
                            tables.append({
                                "page_num": page_num,
                                "table_text": table_text,
                                "bbox": bbox,
                            })
                except Exception as e:
                    logger.warning(f"Table extraction failed for page {page_num}: {e}")
    except Exception as e:
        logger.warning(f"pdfplumber failed to open {pdf_path}: {e}")

    if tables:
        logger.info(f"Extracted {len(tables)} tables from {Path(pdf_path).name}")
    return tables
