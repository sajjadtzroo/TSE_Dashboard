"""
OCR Processing Service
"""

import io
import os
from pathlib import Path
from typing import Optional, Tuple

import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes

from app.core.logger import get_logger
from app.modules.import_data.schemas import OCRLanguage, OCRResult

logger = get_logger(__name__)


class OCRService:
    """Service for OCR processing."""

    def __init__(self):
        """Initialize OCR service."""
        # Configure Tesseract path if needed
        tesseract_cmd = os.getenv("TESSERACT_CMD")
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    async def process_image(
        self, image_bytes: bytes, language: OCRLanguage = OCRLanguage.PERSIAN_ENGLISH
    ) -> OCRResult:
        """
        Process image with OCR.

        Args:
            image_bytes: Image file bytes
            language: OCR language code

        Returns:
            OCRResult with extracted text
        """
        try:
            logger.info(f"Processing image with OCR (language: {language.value})")

            # Open image
            image = Image.open(io.BytesIO(image_bytes))

            # Perform OCR with confidence data
            ocr_data = pytesseract.image_to_data(
                image, lang=language.value, output_type=pytesseract.Output.DICT
            )

            # Extract text
            text = pytesseract.image_to_string(image, lang=language.value)

            # Calculate average confidence
            confidences = [
                float(conf) for conf in ocr_data["conf"] if conf != -1 and conf != "-1"
            ]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

            logger.success(
                f"OCR completed. Text length: {len(text)}, Confidence: {avg_confidence:.2f}%"
            )

            return OCRResult(
                text=text.strip(),
                confidence=avg_confidence,
                language=language.value,
                page_count=1,
            )

        except Exception as e:
            logger.error(f"OCR processing failed: {e}")
            raise

    async def process_pdf(
        self, pdf_bytes: bytes, language: OCRLanguage = OCRLanguage.PERSIAN_ENGLISH
    ) -> OCRResult:
        """
        Process PDF with OCR.

        Args:
            pdf_bytes: PDF file bytes
            language: OCR language code

        Returns:
            OCRResult with extracted text from all pages
        """
        try:
            logger.info(f"Processing PDF with OCR (language: {language.value})")

            # Convert PDF to images
            images = convert_from_bytes(pdf_bytes)
            logger.info(f"Converted PDF to {len(images)} images")

            all_text = []
            all_confidences = []

            # Process each page
            for idx, image in enumerate(images, 1):
                logger.info(f"Processing page {idx}/{len(images)}")

                # Perform OCR
                ocr_data = pytesseract.image_to_data(
                    image, lang=language.value, output_type=pytesseract.Output.DICT
                )

                text = pytesseract.image_to_string(image, lang=language.value)
                all_text.append(text.strip())

                # Calculate confidence for this page
                confidences = [
                    float(conf)
                    for conf in ocr_data["conf"]
                    if conf != -1 and conf != "-1"
                ]
                if confidences:
                    all_confidences.extend(confidences)

            # Combine all pages
            combined_text = "\n\n--- Page Break ---\n\n".join(all_text)

            # Calculate overall confidence
            avg_confidence = (
                sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
            )

            logger.success(
                f"PDF OCR completed. Pages: {len(images)}, Text length: {len(combined_text)}, Confidence: {avg_confidence:.2f}%"
            )

            return OCRResult(
                text=combined_text,
                confidence=avg_confidence,
                language=language.value,
                page_count=len(images),
            )

        except Exception as e:
            logger.error(f"PDF OCR processing failed: {e}")
            raise

    async def process_file(
        self,
        file_bytes: bytes,
        content_type: str,
        language: OCRLanguage = OCRLanguage.PERSIAN_ENGLISH,
    ) -> OCRResult:
        """
        Process file based on content type.

        Args:
            file_bytes: File bytes
            content_type: MIME type of the file
            language: OCR language code

        Returns:
            OCRResult with extracted text
        """
        logger.info(f"Processing file with content type: {content_type}")

        if content_type == "application/pdf":
            return await self.process_pdf(file_bytes, language)
        elif content_type.startswith("image/"):
            return await self.process_image(file_bytes, language)
        else:
            raise ValueError(f"Unsupported file type: {content_type}")

    def extract_loan_data(self, text: str) -> dict:
        """
        Extract structured loan data from OCR text.

        This is a basic implementation that can be enhanced with NLP.

        Args:
            text: OCR extracted text

        Returns:
            Dictionary with extracted loan data
        """
        logger.info("Extracting loan data from OCR text")

        extracted_data = {
            "raw_text": text,
            "detected_fields": {},
        }

        # Persian keywords for loan data extraction
        keywords = {
            "مبلغ": "amount",
            "نرخ سود": "interest_rate",
            "نرخ": "rate",
            "سود": "interest",
            "مدت": "duration",
            "بازپرداخت": "repayment",
            "ضامن": "guarantor",
            "وثیقه": "collateral",
            "سقف": "ceiling",
            "حداکثر": "maximum",
            "حداقل": "minimum",
        }

        # Simple keyword extraction (can be enhanced with regex and NLP)
        lines = text.split("\n")
        for line in lines:
            for persian_key, english_key in keywords.items():
                if persian_key in line:
                    extracted_data["detected_fields"][english_key] = line.strip()

        logger.info(
            f"Extracted {len(extracted_data['detected_fields'])} fields from text"
        )

        return extracted_data
