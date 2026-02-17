from app import db
from datetime import datetime
import uuid

class Decision(db.Model):
    __tablename__ = 'decisions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = db.Column(db.String(36), db.ForeignKey('companies.id'), nullable=False)
    
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    
    # Strategic context
    strategic_intent = db.Column(db.Text)  # What does this decision aim to achieve strategically?
    assumptions = db.Column(db.Text)  # Key assumptions underlying this decision
    rationale = db.Column(db.Text)  # Why this decision was made
    
    decision_date = db.Column(db.DateTime)
    status = db.Column(db.String(50), default='active')  # active, archived, under_review
    
    # Impact
    impact_area = db.Column(db.String(100))  # product, market, team, finance, etc.
    impact_level = db.Column(db.String(50))  # high, medium, low
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'title': self.title,
            'description': self.description,
            'strategic_intent': self.strategic_intent,
            'assumptions': self.assumptions,
            'rationale': self.rationale,
            'decision_date': self.decision_date.isoformat() if self.decision_date else None,
            'status': self.status,
            'impact_area': self.impact_area,
            'impact_level': self.impact_level,
            'created_at': self.created_at.isoformat()
        }
