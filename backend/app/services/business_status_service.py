import os
import json
from datetime import datetime
from google import genai
from google.genai import types
from app.models.document import Document
from app.services.document_processor import process_document
from app import db

BUSINESS_STATUS_PROMPT = """You are a senior business analyst reviewing multiple business documents submitted by a company's board or management team.

Based on all the documents provided below, generate a comprehensive Business Status Overview in structured JSON format.

DOCUMENTS:
{documents}

Return ONLY valid JSON (no markdown, no code blocks) with exactly this structure:
{{
  "business_summary": "A concise 2-3 sentence summary of the overall business status",
  "financial_health": {{
    "revenue_trend": "growing | stable | declining | unknown",
    "profitability_status": "Brief description of profitability",
    "cash_flow_status": "Brief description of cash flow",
    "funding_situation": "Brief description of funding/debt situation",
    "key_metrics": ["List of key financial metrics or figures mentioned"]
  }},
  "swot": {{
    "strengths": ["List of identified strengths"],
    "weaknesses": ["List of identified weaknesses"],
    "opportunities": ["List of identified opportunities"],
    "threats": ["List of identified threats"]
  }},
  "risks": [
    {{
      "description": "Risk description",
      "severity": "high | medium | low"
    }}
  ],
  "market_position": {{
    "competitive_landscape": "Summary of competitive position",
    "target_market": "Description of target market clarity",
    "usp": "Unique Selling Proposition identified"
  }},
  "strategic_outlook": {{
    "short_term": "Short-term goals and priorities",
    "long_term": "Long-term vision and goals",
    "growth_strategy": "Growth strategy described"
  }},
  "confidence_score": 0,
  "documents_analysed": 0
}}

Rules:
- confidence_score should be 0-100 based on how much relevant data was available across all documents
- documents_analysed should match the number of documents you were given
- If information is not available in the documents, state "Not mentioned in submitted documents"
- Extract only what is present; do not invent data
- Be concise and board-grade in language
"""

SYSTEM_INSTRUCTION = (
    'You are a senior business intelligence analyst supporting boards and top management. '
    'Analyse all provided documents holistically and produce structured, accurate business insights. '
    'Always return valid JSON only. Never add recommendations or opinions beyond what the documents state.'
)


def _strip_fences(text):
    text = (text or '').strip()
    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]
        text = text.strip()
    return text


def _extract_json_object(text):
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end <= start:
        return text
    return text[start:end + 1]


def _parse_json_strict_then_loose(raw_text):
    stripped = _strip_fences(raw_text)
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        candidate = _extract_json_object(stripped)
        return json.loads(candidate)


def _repair_json_response(client, model_name, raw_text):
    repair_prompt = (
        "Convert the following content into valid JSON only. "
        "Do not include markdown fences or extra commentary.\n\n"
        f"CONTENT:\n{raw_text}"
    )
    repair = client.models.generate_content(
        model=model_name,
        contents=repair_prompt,
        config=types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=3000
        )
    )
    return _parse_json_strict_then_loose(repair.text)


def get_or_generate_business_status(company):
    """
    Return the stored overview if it is still current (doc count unchanged).
    Otherwise regenerate, save, and return the new one.
    """
    from app.models.document import Document

    current_doc_count = Document.query.filter_by(company_id=company.id).count()

    # Return stored version if doc count hasn't changed
    if (
        company.business_status
        and company.business_status_doc_count == current_doc_count
        and current_doc_count > 0
    ):
        try:
            stored = json.loads(company.business_status)
            stored['_cached'] = True
            stored['_last_updated'] = company.business_status_updated_at.isoformat() if company.business_status_updated_at else None
            return stored
        except Exception:
            pass  # Fall through to regenerate if JSON is corrupt

    # Generate fresh overview
    result = generate_business_status(company)

    # Persist to DB
    if 'error' not in result:
        company.business_status = json.dumps(result)
        company.business_status_updated_at = datetime.utcnow()
        company.business_status_doc_count = current_doc_count
        db.session.commit()

    result['_cached'] = False
    result['_last_updated'] = company.business_status_updated_at.isoformat() if company.business_status_updated_at else None
    return result


def generate_business_status(company):
    """
    Aggregate all company documents and generate a Business Status Overview using Gemini.
    Returns a structured dict.
    """
    documents = Document.query.filter_by(company_id=company.id).all()

    if not documents:
        return _empty_status(company, reason="No documents have been uploaded yet.")

    # Build a combined text from all documents using their summaries or extracted content
    doc_blocks = []
    for i, doc in enumerate(documents, 1):
        content = doc.content_summary or doc.content_extracted or ''
        if not content.strip():
            try:
                process_document(doc)
                content = doc.content_summary or doc.content_extracted or ''
            except Exception:
                content = ''
        if content.strip():
            # Limit each document to 3000 chars to stay within token limits
            snippet = content.strip()[:3000]
            doc_blocks.append(
                f"--- Document {i}: {doc.filename} (Type: {doc.document_type}) ---\n{snippet}"
            )

    if not doc_blocks:
        return _empty_status(company, reason="Documents uploaded but no content extracted yet.")

    combined = "\n\n".join(doc_blocks)
    prompt = BUSINESS_STATUS_PROMPT.format(documents=combined)

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return _fallback_status(company, documents, reason='GEMINI_API_KEY not configured')

    try:
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.3,
                max_output_tokens=3000
            )
        )

        raw = response.text or ''
        try:
            result = _parse_json_strict_then_loose(raw)
        except json.JSONDecodeError:
            result = _repair_json_response(client, model_name, raw)
        result['documents_analysed'] = len(doc_blocks)
        result['company_name'] = company.name
        result['company_industry'] = company.industry
        return result

    except json.JSONDecodeError as e:
        print(f'Business status JSON parse error: {e}')
        return _fallback_status(company, documents, reason='AI response parse error')
    except Exception as e:
        print(f'Business status generation error: {e}')
        return _fallback_status(company, documents, reason=f'AI service error: {str(e)}')


def _empty_status(company, reason="No data available."):
    return {
        'company_name': company.name,
        'company_industry': company.industry,
        'business_summary': reason,
        'financial_health': None,
        'swot': None,
        'risks': [],
        'market_position': None,
        'strategic_outlook': None,
        'confidence_score': 0,
        'documents_analysed': 0,
        'error': reason
    }


def _fallback_status(company, documents, reason='AI analysis unavailable'):
    """Basic fallback when Gemini is unavailable."""
    return {
        'company_name': company.name,
        'company_industry': company.industry,
        'business_summary': f'Business status based on {len(documents)} submitted document(s). AI analysis unavailable — {reason}.',
        'financial_health': {
            'revenue_trend': 'unknown',
            'profitability_status': 'Not available — AI analysis required',
            'cash_flow_status': 'Not available — AI analysis required',
            'funding_situation': 'Not available — AI analysis required',
            'key_metrics': []
        },
        'swot': {
            'strengths': ['AI analysis required to extract strengths'],
            'weaknesses': ['AI analysis required to extract weaknesses'],
            'opportunities': ['AI analysis required to extract opportunities'],
            'threats': ['AI analysis required to extract threats']
        },
        'risks': [],
        'market_position': {
            'competitive_landscape': 'Not available — AI analysis required',
            'target_market': 'Not available — AI analysis required',
            'usp': 'Not available — AI analysis required'
        },
        'strategic_outlook': {
            'short_term': 'Not available — AI analysis required',
            'long_term': 'Not available — AI analysis required',
            'growth_strategy': 'Not available — AI analysis required'
        },
        'confidence_score': 0,
        'documents_analysed': len(documents),
        'error': reason  # Prevents caching so it retries next time
    }
