#!/usr/bin/env python3
"""Extract text from DOCX files."""

import sys

try:
    from docx import Document
except ImportError:
    # Fallback to docx2txt if python-docx not available
    import docx2txt


def extract_text(docx_path: str) -> str:
    """Extract text from a DOCX file."""
    try:
        # Try python-docx first
        try:
            doc = Document(docx_path)
            text = []
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text.append(paragraph.text)
            
            return "\n\n".join(text)
        except NameError:
            # Fallback to docx2txt
            return docx2txt.process(docx_path)
    except Exception as e:
        return f"Error extracting DOCX: {e}"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_docx.py <path_to_docx>")
        sys.exit(1)
    
    docx_path = sys.argv[1]
    text = extract_text(docx_path)
    print(text)

