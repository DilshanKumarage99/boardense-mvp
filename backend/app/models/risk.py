from app import db
from datetime import datetime
import uuid

class Risk(db.Model):
    __tablename__ = 'risks'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = db.Column(db.String(36), db.ForeignKey('companies.id'), nullable=False)
    
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    
    # Risk assessment
    probability = db.Column(db.String(50))  # high, medium, low
    impact = db.Column(db.String(50))  # high, medium, low
    category = db.Column(db.String(100))  # market, financial, operational, team, regulatory, etc.
    
    # Mitigation
    mitigation_plan = db.Column(db.Text)
    owner = db.Column(db.String(100))
    
    # Due diligence relevance
    dd_relevant = db.Column(db.Boolean, default=True)  # Relevant for due diligence
    dd_concern_level = db.Column(db.String(50))  # high, medium, low - how much would acquirer care
    
    status = db.Column(db.String(50), default='active')  # active, mitigated, monitoring
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'title': self.title,
            'description': self.description,
            'probability': self.probability,
            'impact': self.impact,
            'category': self.category,
            'mitigation_plan': self.mitigation_plan,
            'owner': self.owner,
            'dd_relevant': self.dd_relevant,
            'dd_concern_level': self.dd_concern_level,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }
