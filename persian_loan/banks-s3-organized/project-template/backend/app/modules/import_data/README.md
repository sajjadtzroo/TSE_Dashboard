# Import Data Module

This module provides web scraping and OCR capabilities for importing loan data from various sources.

## Features

### 1. OCR Processing
- Upload images (PNG, JPEG) or PDFs
- Extract Persian/Farsi text using Tesseract OCR
- Support for multiple languages (Persian, English, or both)
- Extract structured loan data from unstructured text
- Confidence scoring for OCR results

### 2. Web Scraping
- Scrape Iranian bank websites for loan information
- Parse HTML content and extract loan details
- Support for deep scraping (following links)
- Persian keyword detection for relevant data
- Batch processing of multiple URLs

### 3. Import Logging
- Track all import operations in MongoDB
- Status monitoring (pending, processing, completed, failed)
- Historical data and statistics
- Detailed error tracking

## API Endpoints

### Upload File for OCR
```
POST /api/import/upload
Content-Type: multipart/form-data

Body:
- file: File to upload (PNG, JPEG, PDF)

Response:
{
  "fileId": "string",
  "filename": "string",
  "contentType": "string",
  "size": number
}
```

### Process OCR
```
POST /api/import/ocr/{fileId}
Content-Type: multipart/form-data

Body:
- language: "fas" | "eng" | "fas+eng" (default: "fas+eng")

Response:
{
  "fileId": "string",
  "language": "string",
  "text": "string",
  "confidence": number,
  "pageCount": number
}
```

### Web Scraping
```
POST /api/import/web
Content-Type: application/json

Body:
{
  "urls": ["string"],
  "bankId": "string" (optional),
  "deepScrape": boolean (optional, default: false)
}

Response:
{
  "importId": "string",
  "results": [
    {
      "url": "string",
      "status": "success" | "failed",
      "data": object,
      "error": "string" (if failed)
    }
  ]
}
```

### Get Import Status
```
GET /api/import/status/{importId}

Response:
{
  "importId": "string",
  "importType": "ocr" | "web_scraping" | "manual",
  "status": "pending" | "processing" | "completed" | "failed",
  "source": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "completedAt": "string" (optional),
  "error": "string" (optional),
  "data": object (optional)
}
```

### List All Imports
```
GET /api/import/list?limit=50&import_type=ocr

Query Parameters:
- limit: Maximum number of results (1-100, default: 50)
- import_type: Filter by type (optional)

Response:
{
  "total": number,
  "imports": [ImportStatus]
}
```

### Get Statistics
```
GET /api/import/stats

Response:
{
  "total": number,
  "byType": {
    "ocr": number,
    "web_scraping": number
  },
  "byStatus": {
    "pending": number,
    "processing": number,
    "completed": number,
    "failed": number
  }
}
```

## Dependencies

### Python Packages
- `beautifulsoup4`: HTML parsing for web scraping
- `lxml`: Fast XML/HTML parser
- `pytesseract`: Python wrapper for Tesseract OCR
- `Pillow`: Image processing
- `pdf2image`: PDF to image conversion
- `python-magic`: File type detection
- `httpx`: Async HTTP client

### System Dependencies
- Tesseract OCR: Install via system package manager
  ```bash
  # Ubuntu/Debian
  sudo apt-get install tesseract-ocr tesseract-ocr-fas

  # macOS
  brew install tesseract tesseract-lang
  ```

## Configuration

### Environment Variables
- `TESSERACT_CMD`: Path to tesseract executable (optional)

## Usage Example

### OCR Processing
```python
from app.modules.import_data.service import ImportService

# Upload file
file_info = await service.upload_file(file)

# Process with OCR
result = await service.process_ocr(
    file_id=file_info['file_id'],
    language=OCRLanguage.PERSIAN_ENGLISH
)

print(f"Extracted text: {result.text}")
print(f"Confidence: {result.confidence}%")
```

### Web Scraping
```python
from app.modules.import_data.schemas import WebScrapingRequest

# Scrape bank websites
request = WebScrapingRequest(
    urls=["https://bank.ir/loans"],
    deep_scrape=True
)

result = await service.scrape_web(request)
print(f"Scraped {len(result['results'])} pages")
```

## Persian Text Support

The module includes special handling for Persian/Farsi text:
- OCR language detection supports Persian
- Web scraper uses Persian keywords for loan data extraction
- Persian date and number format handling

### Persian Keywords
The following Persian keywords are used to extract loan information:
- مبلغ تسهیلات (Loan amount)
- نرخ سود (Interest rate)
- مدت بازپرداخت (Repayment period)
- ضامن (Guarantor)
- وثیقه (Collateral)
- سقف تسهیلات (Loan ceiling)
- شرایط (Conditions)

## Future Enhancements

1. **Advanced NLP**: Use Persian NLP libraries for better text extraction
2. **Image Preprocessing**: Enhance images before OCR for better accuracy
3. **Automatic Bank Detection**: Identify bank from logo/website
4. **Structured Data Validation**: Validate extracted data against schema
5. **Bulk Import**: Support importing multiple files at once
6. **Export**: Export imported data in various formats (CSV, Excel)
7. **API Rate Limiting**: Add rate limiting for web scraping
8. **Caching**: Cache scraped data to reduce redundant requests
