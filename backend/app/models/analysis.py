from app import db
from datetime import datetime
import uuid

class Analysis(db.Model):
    __tablename__ = 'analyses'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = db.Column(db.String(36), db.ForeignKey('companies.id'), nullable=False)
    document_id = db.Column(db.String(36), db.ForeignKey('documents.id'), nullable=False)
    
    # Analysis results
    extracted_decisions = db.Column(db.JSON)  # List of decisions from this document
    extracted_risks = db.Column(db.JSON)  # List of risks identified
    strategic_blind_spots = db.Column(db.JSON)  # List of strategic gaps
    
    # Strategic sparring questions
    board_level_questions = db.Column(db.JSON)  # Array of probing questions
    
    # Summary
    executive_summary = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'document_id': self.document_id,
            'extracted_decisions': self.extracted_decisions,
            'extracted_risks': self.extracted_risks,
            'strategic_blind_spots': self.strategic_blind_spots,
            'board_level_questions': self.board_level_questions,
            'executive_summary': self.executive_summary,
            'created_at': self.created_at.isoformat()
        }
