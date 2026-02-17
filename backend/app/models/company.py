from app import db
from datetime import datetime
import uuid

class Company(db.Model):
    __tablename__ = 'companies'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    stage = db.Column(db.String(50))  # seed, series-a, series-b, etc.
    industry = db.Column(db.String(100))
    
    # Multi-tenancy
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = db.relationship('User', secondary='company_users', backref='companies')
    documents = db.relationship('Document', backref='company', cascade='all, delete-orphan')
    decisions = db.relationship('Decision', backref='company', cascade='all, delete-orphan')
    risks = db.relationship('Risk', backref='company', cascade='all, delete-orphan')
    analyses = db.relationship('Analysis', backref='company', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'stage': self.stage,
            'industry': self.industry,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


# Association table for many-to-many relationship
company_users = db.Table(
    'company_users',
    db.Column('company_id', db.String(36), db.ForeignKey('companies.id'), primary_key=True),
    db.Column('user_id', db.String(36), db.ForeignKey('users.id'), primary_key=True)
)
