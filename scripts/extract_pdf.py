#!/usr/bin/env python3
"""Extract text from PDF files."""

import sys
import pypdf


def extract_text(pdf_path: str) -> str:
    """Extract text from a PDF file."""
    try:
        with open(pdf_path, "rb") as file:
            reader = pypdf.PdfReader(file)
            text = []
            
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text.strip():
                    text.append(page_text)
            
            return "\n\n--- Page Break ---\n\n".join(text)
    except Exception as e:
        return f"Error extracting PDF: {e}"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf.py <path_to_pdf>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    text = extract_text(pdf_path)
    print(text)

