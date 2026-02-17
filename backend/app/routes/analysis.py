from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.document import Document
from app.models.company import Company
from app.models.analysis import Analysis
from app.services.ai_analysis import analyze_document_with_ai

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/analysis')

@analysis_bp.route('/document/<document_id>/analyze', methods=['POST'])
@jwt_required()
def analyze_document(document_id):
    user_id = get_jwt_identity()
    
    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    company = document.company
    if company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Check if analysis already exists
    existing_analysis = Analysis.query.filter_by(document_id=document_id).first()
    if existing_analysis:
        return jsonify(existing_analysis.to_dict()), 200
    
    # Perform AI analysis
    try:
        analysis_results = analyze_document_with_ai(document)
        
        analysis = Analysis(
            company_id=company.id,
            document_id=document_id,
            extracted_decisions=analysis_results.get('decisions'),
            extracted_risks=analysis_results.get('risks'),
            strategic_blind_spots=analysis_results.get('blind_spots'),
            board_level_questions=analysis_results.get('questions'),
            executive_summary=analysis_results.get('summary')
        )
        
        db.session.add(analysis)
        db.session.commit()
        
        return jsonify(analysis.to_dict()), 201
    
    except Exception as e:
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@analysis_bp.route('/companies/<company_id>/all-analyses', methods=['GET'])
@jwt_required()
def get_company_analyses(company_id):
    user_id = get_jwt_identity()
    
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    analyses = Analysis.query.filter_by(company_id=company_id).all()
    return jsonify([a.to_dict() for a in analyses]), 200

@analysis_bp.route('/<analysis_id>', methods=['GET'])
@jwt_required()
def get_analysis(analysis_id):
    user_id = get_jwt_identity()
    
    analysis = Analysis.query.get(analysis_id)
    if not analysis:
        return jsonify({'error': 'Analysis not found'}), 404
    
    company = analysis.company
    if company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(analysis.to_dict()), 200


@analysis_bp.route('/companies/<company_id>/analyze-batch', methods=['POST'])
@jwt_required()
def analyze_batch(company_id):
    user_id = get_jwt_identity()
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json() or {}
    doc_ids = data.get('document_ids')

    if not doc_ids:
        return jsonify({'error': 'No document_ids provided'}), 400

    analyses_created = []
    aggregated = {
        'decisions': [],
        'risks': [],
        'questions': [],
        'documents_analyzed': 0
    }

    for doc_id in doc_ids:
        document = Document.query.get(doc_id)
        if not document or document.company_id != company_id:
            continue

        existing = Analysis.query.filter_by(document_id=doc_id).first()
        if existing:
            analyses_created.append(existing.to_dict())
            continue

        try:
            results = analyze_document_with_ai(document)

            analysis = Analysis(
                company_id=company_id,
                document_id=doc_id,
                extracted_decisions=results.get('decisions'),
                extracted_risks=results.get('risks'),
                strategic_blind_spots=results.get('blind_spots'),
                board_level_questions=results.get('questions'),
                executive_summary=results.get('summary')
            )
            db.session.add(analysis)
            db.session.commit()

            analyses_created.append(analysis.to_dict())

            aggregated['decisions'].extend(results.get('decisions') or [])
            aggregated['risks'].extend(results.get('risks') or [])
            aggregated['questions'].extend(results.get('questions') or [])
            aggregated['documents_analyzed'] += 1

        except Exception as e:
            print(f"Analysis failed for {doc_id}: {e}")
            continue

    summary = {
        'documents_analyzed': aggregated['documents_analyzed'],
        'decisions_count': len(aggregated['decisions']),
        'risks_count': len(aggregated['risks']),
        'questions_count': len(aggregated['questions'])
    }

    return jsonify({'analyses': analyses_created, 'summary': summary}), 201
