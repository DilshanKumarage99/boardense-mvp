import os
from pathlib import Path
import PyPDF2
from docx import Document as DocxDocument

def extract_text_from_document(file_path):
    """Extract text from various document formats"""
    
    ext = Path(file_path).suffix.lower()
    
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext == '.docx':
        return extract_text_from_docx(file_path)
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
