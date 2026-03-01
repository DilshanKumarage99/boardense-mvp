from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.document import Document
from app.models.company import Company
import os
from google import genai
from google.genai import types

sparring_bp = Blueprint('sparring', __name__, url_prefix='/api/sparring')

SPARRING_SYSTEM_PROMPT = """You are an independent systemic transformation intelligence designed to support boards, 
founders, and top management teams during periods of transformation (growth, renewal, pivot, 
innovation, or structural change). Your purpose is NOT to give advice or make decisions.

Your purpose is to improve decision quality by:
- Making assumptions explicit
- Identifying systemic risks
- Surfacing human and organizational constraints
- Challenging sequencing, pace, and coherence
- Preserving survivability and optionality

You operate at board and top-management level. You are strategic, systemic, long-term, and 
transformation-focused.

Core principles:
- Transformation is a system change, not a project.
- Decline, renewal, growth, and innovation cannot be managed with the same logic.
- Human capacity and attention are the primary constraints.
- Irreversible decisions must be treated with extreme care.
- Good transformation narratives must survive due diligence.

Rules:
- Be concise, direct, and board-grade.
- Avoid buzzwords, generic advice, and motivational language.
- Challenge assumptions rather than proposing solutions.
- Explicitly state risks, trade-offs, and what is not being discussed.
- Treat survivability as a first-class concern.
- Assume limited resources and real human constraints.
- Always use the same language to answer with which you receive the question.
- You act strictly as an observer and challenger; you do not recommend actions, assign tasks, or suggest execution steps.
- If information appears incomplete, sensitive, or ambiguous, state assumptions clearly rather than infer confidential facts.

The document context below is the basis for this sparring session. Use it to ground all responses.

Document context:
{document_context}"""

BUSINESS_SPARRING_SYSTEM_PROMPT = """You are an independent systemic transformation intelligence with full visibility 
of this company's submitted business documents. You support boards, founders, and top management teams 
during periods of transformation (growth, renewal, pivot, innovation, or structural change).

Your purpose is NOT to give advice or make decisions.

Your purpose is to improve decision quality by:
- Making assumptions explicit across ALL aspects of the business
- Identifying systemic risks visible across multiple documents
- Surfacing human and organizational constraints
- Challenging sequencing, pace, and coherence of the overall business direction
- Preserving survivability and optionality

You operate at board and top-management level. You are strategic, systemic, long-term, and 
transformation-focused. You have read ALL documents submitted for this company and can reason 
across them holistically.

Core principles:
- Transformation is a system change, not a project.
- Decline, renewal, growth, and innovation cannot be managed with the same logic.
- Human capacity and attention are the primary constraints.
- Irreversible decisions must be treated with extreme care.
- Good transformation narratives must survive due diligence.

Rules:
- Be concise, direct, and board-grade.
- Avoid buzzwords, generic advice, and motivational language.
- Challenge assumptions rather than proposing solutions.
- Explicitly state risks, trade-offs, and what is not being discussed.
- Treat survivability as a first-class concern.
- Assume limited resources and real human constraints.
- Always use the same language to answer with which you receive the question.
- You act strictly as an observer and challenger; you do not recommend actions, assign tasks, or suggest execution steps.
- Cross-reference information across documents when relevant.
- If information appears incomplete or absent across all documents, state this explicitly.

Full business context from all submitted documents ({doc_count} documents):
{business_context}"""

BOARD_INTELLIGENCE_PROMPT = """You are analyzing a document submitted to a board or executive team.

Based on the document content below, produce a structured board intelligence brief with these four sections:

1. **UNRESOLVED ISSUES**
List issues that are not yet addressed or decided at board/top management level. Be specific.

2. **RISK & DUE DILIGENCE GAP ANALYSIS**
Identify gaps in due diligence readiness and key risks from an investor or acquirer perspective.

3. **DIFFICULT QUESTIONS THE COMPANY MUST ANSWER**
List the hard questions the leadership team must be able to answer. These should be uncomfortable but necessary.

4. **RECOMMENDED FUTURE BOARD THEMES**
Based on what is present and absent in this document, what themes and decisions should be on the next board agenda?

Be concise, direct and board-grade. No generic advice. Only surface what is grounded in the document.
State clearly if there is not enough information to make an assessment in any section.

Document:
{content}"""


def _call_gemini(system_instruction, prompt):
    api_key = os.getenv('GEMINI_API_KEY')
    model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.4,
            max_output_tokens=2000
        )
    )
    return response.text.strip()


@sparring_bp.route('/document/<document_id>/board-intelligence', methods=['GET'])
@jwt_required()
def get_board_intelligence(document_id):
    """Generate board intelligence brief for a document."""
    user_id = get_jwt_identity()

    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404

    company = document.company
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    if not document.content_extracted:
        return jsonify({'error': 'No content available for analysis'}), 400

    if not os.getenv('GEMINI_API_KEY'):
        return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500

    try:
        content_snippet = document.content_extracted[:8000]
        prompt = BOARD_INTELLIGENCE_PROMPT.format(content=content_snippet)
        result = _call_gemini(
            'You are a board-level transformation intelligence. Be direct, concise and board-grade.',
            prompt
        )
        return jsonify({'intelligence': result}), 200
    except Exception as e:
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500


@sparring_bp.route('/document/<document_id>/chat', methods=['POST'])
@jwt_required()
def sparring_chat(document_id):
    """Send a message in the sparring session for a document."""
    user_id = get_jwt_identity()

    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404

    company = document.company
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    if not os.getenv('GEMINI_API_KEY'):
        return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500

    data = request.get_json() or {}
    user_message = data.get('message', '').strip()
    history = data.get('history', [])  # [{role: 'user'|'model', text: '...'}]

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    try:
        api_key = os.getenv('GEMINI_API_KEY')
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        client = genai.Client(api_key=api_key)

        document_context = (document.content_extracted or '')[:6000]
        system_instruction = SPARRING_SYSTEM_PROMPT.format(document_context=document_context)

        # Build conversation history for Gemini
        gemini_history = []
        for msg in history:
            role = 'user' if msg.get('role') == 'user' else 'model'
            gemini_history.append(types.Content(role=role, parts=[types.Part(text=msg.get('text', ''))]))

        chat = client.chats.create(
            model=model_name,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
                max_output_tokens=1500
            ),
            history=gemini_history
        )
        response = chat.send_message(user_message)
        return jsonify({'reply': response.text.strip()}), 200

    except Exception as e:
        return jsonify({'error': f'Chat failed: {str(e)}'}), 500


@sparring_bp.route('/companies/<company_id>/business-chat', methods=['POST'])
@jwt_required()
def business_sparring_chat(company_id):
    """Business-level sparring using ALL company documents as context."""
    user_id = get_jwt_identity()

    company = Company.query.get(company_id)
    if not company or company.created_by != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    if not os.getenv('GEMINI_API_KEY'):
        return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500

    data = request.get_json() or {}
    user_message = data.get('message', '').strip()
    history = data.get('history', [])

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    # Aggregate content from all company documents
    documents = Document.query.filter_by(company_id=company_id).all()
    if not documents:
        return jsonify({'error': 'No documents available for this company'}), 400

    doc_blocks = []
    for i, doc in enumerate(documents, 1):
        content = doc.content_summary or doc.content_extracted or ''
        if content.strip():
            snippet = content.strip()[:2500]
            doc_blocks.append(
                f"--- Document {i}: {doc.filename} (Type: {doc.document_type}) ---\n{snippet}"
            )

    if not doc_blocks:
        return jsonify({'error': 'No extracted content found in documents'}), 400

    business_context = "\n\n".join(doc_blocks)
    system_instruction = BUSINESS_SPARRING_SYSTEM_PROMPT.format(
        doc_count=len(doc_blocks),
        business_context=business_context
    )

    try:
        api_key = os.getenv('GEMINI_API_KEY')
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        client = genai.Client(api_key=api_key)

        gemini_history = []
        for msg in history:
            role = 'user' if msg.get('role') == 'user' else 'model'
            gemini_history.append(types.Content(role=role, parts=[types.Part(text=msg.get('text', ''))]))

        chat = client.chats.create(
            model=model_name,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
                max_output_tokens=1500
            ),
            history=gemini_history
        )
        response = chat.send_message(user_message)
        return jsonify({'reply': response.text.strip(), 'documents_used': len(doc_blocks)}), 200

    except Exception as e:
        return jsonify({'error': f'Business chat failed: {str(e)}'}), 500
