from app import db
from datetime import datetime
import uuid

class Document(db.Model):
    __tablename__ = 'documents'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = db.Column(db.String(36), db.ForeignKey('companies.id'), nullable=False)
    
    filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50))  # pdf, docx, pptx, etc.
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)
    
    content_extracted = db.Column(db.Text)  # Raw text extracted from document
    content_summary = db.Column(db.Text)  # AI-generated summary of the document
    embedding = db.Column(db.Text, nullable=True)  # JSON array — Gemini text-embedding-004 vector

    document_type = db.Column(db.String(50))  # board_deck, strategy_doc, okr, decision_note, etc.
    
    uploaded_by_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    analyses = db.relationship('Analysis', backref='document', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'filename': self.filename,
            'file_type': self.file_type,
            'document_type': self.document_type,
            'created_at': self.created_at.isoformat(),
            'file_size': self.file_size,
            'content_extracted': self.content_extracted,
            'content_summary': self.content_summary
        }
