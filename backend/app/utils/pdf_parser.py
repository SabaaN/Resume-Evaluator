import io
import pdfplumber


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from a PDF file's bytes. Raises ValueError if no text found."""
    text_parts = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {e}")

    full_text = "\n".join(text_parts).strip()
    if not full_text:
        raise ValueError("No extractable text found in PDF (it may be scanned/image-based).")

    return full_text