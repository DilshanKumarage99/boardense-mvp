from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.document import Document
from app.models.company import Company, company_users
from app.services.document_processor import process_document
import os
from werkzeug.utils import secure_filename

documents_bp = Blueprint('documents', __name__, url_prefix='/api/documents')

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@documents_bp.route('/companies/<company_id>/upload', methods=['POST'])
@jwt_required()
def upload_document(company_id):
    user_id = get_jwt_identity()
    
    # Check if user has access to this company
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    filename = secure_filename(file.filename)
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    document = Document(
        company_id=company_id,
        filename=filename,
        file_type=filename.rsplit('.', 1)[1].lower(),
        file_path=filepath,
        file_size=os.path.getsize(filepath),
        uploaded_by_id=user_id,
        document_type=request.form.get('document_type', 'general')
    )
    
    db.session.add(document)
    db.session.commit()
    
    # Process document asynchronously (for MVP, we'll do it synchronously)
    try:
        process_document(document)
    except Exception as e:
        print(f"Error processing document: {e}")
    
    return jsonify(document.to_dict()), 201

@documents_bp.route('/companies/<company_id>/list', methods=['GET'])
@jwt_required()
def list_documents(company_id):
    user_id = get_jwt_identity()
    
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    documents = Document.query.filter_by(company_id=company_id).all()
    return jsonify([doc.to_dict() for doc in documents]), 200

@documents_bp.route('/<document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    user_id = get_jwt_identity()
    
    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    company = document.company
    if company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(document.to_dict()), 200


@documents_bp.route('/companies/<company_id>/upload-batch', methods=['POST'])
@jwt_required()
def upload_documents_batch(company_id):
    user_id = get_jwt_identity()

    # Check access
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    files = request.files.getlist('files')
    types = request.form.getlist('types')

    if not files or len(files) != len(types):
        return jsonify({'error': 'Files and types mismatch'}), 400

    saved_documents = []
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    for f, doc_type in zip(files, types):
        if f.filename == '':
            continue
        if not allowed_file(f.filename):
            continue
        filename = secure_filename(f.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        # ensure unique
        base, ext = os.path.splitext(filename)
        i = 1
        while os.path.exists(filepath):
            filename = f"{base}_{i}{ext}"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            i += 1

        f.save(filepath)

        document = Document(
            company_id=company_id,
            filename=filename,
            file_type=filename.rsplit('.', 1)[1].lower(),
            file_path=filepath,
            file_size=os.path.getsize(filepath),
            uploaded_by_id=user_id,
            document_type=doc_type
        )
        db.session.add(document)
        saved_documents.append(document)

    db.session.commit()

    # Process each document (synchronously for MVP)
    for doc in saved_documents:
        try:
            process_document(doc)
        except Exception as e:
            print(f"Error processing document {doc.id}: {e}")

    return jsonify([d.to_dict() for d in saved_documents]), 201
