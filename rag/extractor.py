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
        from pdf2image import convert_from_path
        import pytesseract

        images = convert_from_path(
            pdf_path,
            first_page=page_num + 1,
            last_page=page_num + 1,
            dpi=300,
        )
        if images:
            text = pytesseract.image_to_string(images[0], lang='fas+eng')
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
                    pages.append({
                        'page_num': page_num + 1,  # 1-indexed
                        'text': text,
                    })
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
