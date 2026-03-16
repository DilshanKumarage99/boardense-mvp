from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.company import Company
from app.models.decision import Decision
from app.models.risk import Risk
from app.models.analysis import Analysis
from app.services.report_generator import generate_exit_readiness_report, generate_investor_questions_report
from app.services.business_status_service import get_or_generate_business_status
from app.services.exit_readiness_service import get_or_generate_exit_readiness

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/companies/<company_id>/exit-readiness', methods=['GET'])
@jwt_required()
def get_exit_readiness(company_id):
    user_id = get_jwt_identity()
    
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        report = get_or_generate_exit_readiness(company)
        return jsonify(report), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reports_bp.route('/companies/<company_id>/strategy-summary', methods=['GET'])
@jwt_required()
def get_strategy_summary(company_id):
    user_id = get_jwt_identity()
    
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get all decisions, risks, and analyses
    decisions = Decision.query.filter_by(company_id=company_id).all()
    risks = Risk.query.filter_by(company_id=company_id).all()
    analyses = Analysis.query.filter_by(company_id=company_id).all()
    
    return jsonify({
        'company': company.to_dict(),
        'decisions_count': len(decisions),
        'risks_count': len(risks),
        'documents_analyzed': len(analyses),
        'decisions': [d.to_dict() for d in decisions[:10]],  # Last 10
        'recent_risks': [r.to_dict() for r in risks[-5:]],  # Last 5
    }), 200


@reports_bp.route('/companies/<company_id>/business-status', methods=['GET'])
@jwt_required()
def get_business_status(company_id):
    user_id = get_jwt_identity()

    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        status = get_or_generate_business_status(company)
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


