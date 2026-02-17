"""
File Upload Validators
Validation for file uploads including size, type, and content verification.
"""

import magic
from fastapi import HTTPException, UploadFile, status

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes

# Allowed MIME types
ALLOWED_IMAGE_TYPES = {
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
}

ALLOWED_DOCUMENT_TYPES = {
    "application/pdf": [".pdf"],
}

ALL_ALLOWED_TYPES = {**ALLOWED_IMAGE_TYPES, **ALLOWED_DOCUMENT_TYPES}


async def validate_file_upload(
    file: UploadFile,
    max_size: int = MAX_FILE_SIZE,
    allowed_types: dict = None,
) -> None:
    """
    Validate uploaded file for size and content type.

    Args:
        file: Uploaded file
        max_size: Maximum allowed file size in bytes
        allowed_types: Dictionary of allowed MIME types and extensions

    Raises:
        HTTPException: If validation fails
    """
    if allowed_types is None:
        allowed_types = ALL_ALLOWED_TYPES

    # Read file content for validation
    content = await file.read()
    file_size = len(content)

    # Reset file pointer for later use
    await file.seek(0)

    # Validate file size
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if file_size > max_size:
        size_mb = max_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size / (1024 * 1024):.2f}MB) exceeds maximum allowed size ({size_mb}MB)",
        )

    # Validate file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    file_ext = "." + file.filename.split(".")[-1].lower()
    valid_extensions = [ext for exts in allowed_types.values() for ext in exts]

    if file_ext not in valid_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{file_ext}' is not allowed. Allowed extensions: {', '.join(valid_extensions)}",
        )

    # Validate actual file content type using python-magic
    try:
        mime = magic.from_buffer(content, mime=True)

        if mime not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File content type '{mime}' does not match allowed types. Allowed: {', '.join(allowed_types.keys())}",
            )

        # Verify extension matches content type
        if file_ext not in allowed_types[mime]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{file_ext}' does not match content type '{mime}'",
            )

    except Exception as e:
        # If python-magic fails, fall back to declared content type
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Content type '{file.content_type}' is not allowed. Allowed: {', '.join(allowed_types.keys())}",
            )


async def validate_image_upload(file: UploadFile) -> None:
    """
    Validate uploaded image file.

    Args:
        file: Uploaded file

    Raises:
        HTTPException: If validation fails
    """
    await validate_file_upload(file, allowed_types=ALLOWED_IMAGE_TYPES)


async def validate_pdf_upload(file: UploadFile) -> None:
    """
    Validate uploaded PDF file.

    Args:
        file: Uploaded file

    Raises:
        HTTPException: If validation fails
    """
    await validate_file_upload(file, allowed_types=ALLOWED_DOCUMENT_TYPES)
