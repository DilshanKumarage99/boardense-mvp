from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.company import Company
from app.models.user import User

companies_bp = Blueprint('companies', __name__, url_prefix='/api/companies')

@companies_bp.route('/create', methods=['POST'])
@jwt_required()
def create_company():
    """Create a new company for the authenticated user"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Company name required'}), 400
    
    company = Company(
        name=data['name'],
        description=data.get('description', ''),
        industry=data.get('industry', ''),
        created_by=user_id
    )
    
    db.session.add(company)
    db.session.commit()
    
    return jsonify(company.to_dict()), 201

@companies_bp.route('/list', methods=['GET'])
@jwt_required()
def list_companies():
    """Get all companies for the authenticated user"""
    user_id = get_jwt_identity()
    
    companies = Company.query.filter_by(created_by=user_id).all()
    return jsonify([company.to_dict() for company in companies]), 200

@companies_bp.route('/<company_id>', methods=['GET'])
@jwt_required()
def get_company(company_id):
    """Get a specific company (user must be creator or member)"""
    user_id = get_jwt_identity()
    
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(company.to_dict()), 200

@companies_bp.route('/<company_id>', methods=['PUT'])
@jwt_required()
def update_company(company_id):
    """Update a company (only creator can update)"""
    user_id = get_jwt_identity()
    
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    company.name = data.get('name', company.name)
    company.description = data.get('description', company.description)
    company.industry = data.get('industry', company.industry)
    
    db.session.commit()
    return jsonify(company.to_dict()), 200

@companies_bp.route('/<company_id>', methods=['DELETE'])
@jwt_required()
def delete_company(company_id):
    """Delete a company (only creator can delete)"""
    user_id = get_jwt_identity()
    
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(company)
    db.session.commit()
    
    return jsonify({'message': 'Company deleted'}), 200
