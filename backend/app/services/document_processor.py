import os
from pathlib import Path
import PyPDF2
from docx import Document as DocxDocument

# Import Presentation from python-pptx optionally so the app can start
# even if python-pptx isn't installed. If missing, handle it when
# attempting to extract from .pptx files and provide a clear error.
try:
    from pptx import Presentation
except Exception:
    Presentation = None

def extract_text_from_document(file_path):
    """Extract text from various document formats"""
    
    ext = Path(file_path).suffix.lower()
    
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext == '.docx':
        return extract_text_from_docx(file_path)
    elif ext == '.pptx':
        return extract_text_from_pptx(file_path)
    elif ext == '.txt':
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    else:
        raise ValueError(f"Unsupported file format: {ext}")

def extract_text_from_pdf(file_path):
    """Extract text from PDF"""
    text = []
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text.append(page.extract_text())
    except Exception as e:
        raise ValueError(f"Error reading PDF: {e}")
    
    return '\n'.join(text)

def extract_text_from_docx(file_path):
    """Extract text from DOCX"""
    text = []
    try:
        doc = DocxDocument(file_path)
        for para in doc.paragraphs:
            if para.text.strip():
                text.append(para.text)
    except Exception as e:
        raise ValueError(f"Error reading DOCX: {e}")
    
    return '\n'.join(text)

def extract_text_from_pptx(file_path):
    """Extract text from PowerPoint presentation"""
    if Presentation is None:
        raise ImportError(
            "python-pptx is not installed. Install it with: pip install python-pptx"
        )
    text = []
    try:
        presentation = Presentation(file_path)
        for slide_num, slide in enumerate(presentation.slides, 1):
            slide_text = [f"\n--- SLIDE {slide_num} ---"]
            
            # Extract text from shapes
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_text.append(shape.text)
                
                # Extract text from tables
                if shape.has_table:
                    table = shape.table
                    for row in table.rows:
                        row_data = []
                        for cell in row.cells:
                            if cell.text.strip():
                                row_data.append(cell.text)
                        if row_data:
                            slide_text.append(" | ".join(row_data))
            
            # Add slide text if found
            if len(slide_text) > 1:
                text.extend(slide_text)
    
    except Exception as e:
        raise ValueError(f"Error reading PPTX: {e}")
    
    return '\n'.join(text) if text else ""

def process_document(document):
    """Process uploaded document and extract text"""
    try:
        text = extract_text_from_document(document.file_path)
        document.content_extracted = text
        from app import db
        db.session.commit()
        return True
    except Exception as e:
        print(f"Error processing document {document.id}: {e}")
        return False
