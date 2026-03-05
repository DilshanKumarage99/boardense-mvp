from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.document import Document
from app.models.company import Company, company_users
from app.services.document_processor import process_document, extract_text_from_document
from app.services.summarization_service import summarize_document
from app.services.business_status_service import get_or_generate_business_status
from app.services.exit_readiness_service import get_or_generate_exit_readiness
from app.services.embedding_service import embed_document
import os
from werkzeug.utils import secure_filename
import tempfile

documents_bp = Blueprint('documents', __name__, url_prefix='/api/documents')

# On Azure App Service, /home is persistent storage. Use UPLOAD_FOLDER env var to override.
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
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

    # Generate embedding for semantic search
    try:
        embed_document(document)
    except Exception as e:
        print(f"Error embedding document: {e}")

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

    # Generate embeddings for semantic search (after processing so summaries exist)
    for doc in saved_documents:
        try:
            embed_document(doc)
        except Exception as e:
            print(f"Error embedding document {doc.id}: {e}")

    # Auto-regenerate business status overview since new documents were added
    try:
        # Force invalidate stored count so it regenerates
        company.business_status_doc_count = -1
        company.exit_readiness_doc_count = -1
        db.session.commit()
        get_or_generate_business_status(company)
        get_or_generate_exit_readiness(company)
    except Exception as e:
        print(f"Business status auto-update failed: {e}")

    return jsonify([d.to_dict() for d in saved_documents]), 201


@documents_bp.route('/extract', methods=['POST'])
@jwt_required()
def extract_document_content():
    """Extract content from an uploaded file without saving to DB"""
    user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed. Allowed: pdf, docx, pptx, txt'}), 400
    
    try:
        # Save file to temporary location
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"temp_{filename}")
        file.save(filepath)
        
        # Extract content
        extracted_content = extract_text_from_document(filepath)
        
        # Clean up temp file
        try:
            os.remove(filepath)
        except:
            pass
        
        return jsonify({
            'filename': file.filename,
            'file_type': filename.rsplit('.', 1)[1].lower(),
            'content': extracted_content,
            'char_count': len(extracted_content)
        }), 200
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Extraction failed: {str(e)}'}), 500


@documents_bp.route('/companies/<company_id>/save-and-analyze', methods=['POST'])
@jwt_required()
def save_extracted_and_analyze(company_id):
    """Save extracted content as a document and optionally analyze it"""
    user_id = get_jwt_identity()
    
    # Check access
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    if not data or 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    filename = secure_filename(file.filename)
    
    if not allowed_file(filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    try:
        # Save file
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        # Ensure unique filename
        base, ext = os.path.splitext(filename)
        i = 1
        while os.path.exists(filepath):
            filename = f"{base}_{i}{ext}"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            i += 1
        
        file.save(filepath)
        
        # Create document record
        document = Document(
            company_id=company_id,
            filename=filename,
            file_type=filename.rsplit('.', 1)[1].lower(),
            file_path=filepath,
            file_size=os.path.getsize(filepath),
            uploaded_by_id=user_id,
            document_type=data.get('document_type', 'general'),
            content_extracted=data.get('content', '')  # Save the edited content
        )
        
        db.session.add(document)
        db.session.commit()
        
        # Process document if analysis_requested
        if data.get('analyze', False):
            try:
                process_document(document)
            except Exception as e:
                print(f"Error processing document: {e}")
        
        return jsonify(document.to_dict()), 201
    
    except Exception as e:
        return jsonify({'error': f'Failed to save document: {str(e)}'}), 500


@documents_bp.route('/<document_id>/update-content', methods=['PUT'])
@jwt_required()
def update_document_content(document_id):
    """Update a document's extracted content (and optionally run analysis)."""
    user_id = get_jwt_identity()

    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404

    company = document.company
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json() or {}
    content = data.get('content')
    analyze = data.get('analyze', False)

    if content is None:
        return jsonify({'error': 'No content provided'}), 400

    try:
        document.content_extracted = content
        from app import db
        db.session.commit()

        if analyze:
            # Generate AI summary
            try:
                summary = summarize_document(document)
                document.content_summary = summary
                db.session.commit()
            except Exception as e:
                print(f"Error summarizing document {document.id}: {e}")

            # Run full analysis
            try:
                process_document(document)
            except Exception as e:
                print(f"Error processing document {document.id}: {e}")

        return jsonify(document.to_dict()), 200
    except Exception as e:
        return jsonify({'error': f'Failed to update document: {str(e)}'}), 500


@documents_bp.route('/<document_id>/summarize', methods=['POST'])
@jwt_required()
def summarize_document_route(document_id):
    """Generate or regenerate AI summary for a document."""
    user_id = get_jwt_identity()

    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404

    company = document.company
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        summary = summarize_document(document)
        document.content_summary = summary
        db.session.commit()
        return jsonify({'summary': summary, 'document': document.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': f'Summarization failed: {str(e)}'}), 500


@documents_bp.route('/companies/<company_id>/save-extracted', methods=['POST'])
@jwt_required()
def save_extracted_content(company_id):
    """Save extracted content as a document record without storing the original file."""
    user_id = get_jwt_identity()

    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json() or {}
    filename = data.get('filename', 'extracted.txt')
    content = data.get('content', '')
    document_type = data.get('document_type', 'general')

    if not content:
        return jsonify({'error': 'No content provided'}), 400

    try:
        file_type = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'txt'

        document = Document(
            company_id=company_id,
            filename=filename,
            file_type=file_type,
            file_path=None,
            file_size=0,
            uploaded_by_id=user_id,
            document_type=document_type,
            content_extracted=content
        )

        db.session.add(document)
        db.session.commit()

        return jsonify(document.to_dict()), 201
    except Exception as e:
        return jsonify({'error': f'Failed to save extracted content: {str(e)}'}), 500


@documents_bp.route('/<document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    user_id = get_jwt_identity()
    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404

    company = document.company
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        # Remove file on disk if present
        if document.file_path and os.path.exists(document.file_path):
            try:
                os.remove(document.file_path)
            except Exception:
                pass

        db.session.delete(document)
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to delete document: {str(e)}'}), 500


@documents_bp.route('/companies/<company_id>/embed-all', methods=['POST'])
@jwt_required()
def backfill_embeddings(company_id):
    """Generate embeddings for all documents that don't have one yet."""
    user_id = get_jwt_identity()
    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    from app.services.embedding_service import embed_all_company_docs
    result = embed_all_company_docs(company_id)
    return jsonify(result), 200


@documents_bp.route('/delete-batch', methods=['POST'])
@jwt_required()
def delete_documents_batch():
    """Delete multiple documents by id list."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    ids = data.get('document_ids') or []

    if not isinstance(ids, list) or not ids:
        return jsonify({'error': 'No document_ids provided'}), 400

    deleted = []
    errors = []
    for doc_id in ids:
        try:
            document = Document.query.get(doc_id)
            if not document:
                errors.append({'id': doc_id, 'error': 'Not found'})
                continue

            company = document.company
            if not company or company.created_by != user_id:
                errors.append({'id': doc_id, 'error': 'Unauthorized'})
                continue

            # Remove file on disk if present
            if document.file_path and os.path.exists(document.file_path):
                try:
                    os.remove(document.file_path)
                except Exception:
                    pass

            db.session.delete(document)
            deleted.append(doc_id)
        except Exception as e:
            errors.append({'id': doc_id, 'error': str(e)})

    try:
        db.session.commit()
    except Exception as e:
        return jsonify({'error': f'Failed to commit deletions: {str(e)}'}), 500

    return jsonify({'deleted': deleted, 'errors': errors}), 200
