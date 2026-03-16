import os
import json
from datetime import datetime
from google import genai
from google.genai import types
from app.models.document import Document
from app.services.document_processor import process_document
from app import db

EXIT_READINESS_PROMPT = """You are a senior M&A advisor and due diligence expert reviewing all submitted business documents for a company considering an exit (sale, acquisition, or investor event).

Analyse all the documents below and produce a comprehensive Exit Readiness Report in structured JSON.

COMPANY: {company_name} | STAGE: {company_stage} | INDUSTRY: {company_industry}

SUBMITTED DOCUMENTS:
{documents}

Return ONLY valid JSON (no markdown, no code blocks) with exactly this structure:
{{
  "overall_readiness_score": 0,
  "readiness_verdict": "Not Ready | Early Stage | Developing | Good | Strong",
  "executive_summary": "2-3 sentence overall assessment from an M&A advisor perspective",
  "document_coverage": {{
    "financial_statements": "found | partial | missing",
    "business_strategy": "found | partial | missing",
    "market_analysis": "found | partial | missing",
    "legal_structure": "found | partial | missing",
    "operational_documentation": "found | partial | missing",
    "customer_contracts": "found | partial | missing",
    "ip_documentation": "found | partial | missing",
    "management_team": "found | partial | missing"
  }},
  "readiness_by_category": {{
    "financial": {{
      "score": 0,
      "status": "weak | developing | good | strong",
      "summary": "Brief assessment",
      "gaps": ["List of specific gaps"]
    }},
    "legal": {{
      "score": 0,
      "status": "weak | developing | good | strong",
      "summary": "Brief assessment",
      "gaps": ["List of specific gaps"]
    }},
    "operational": {{
      "score": 0,
      "status": "weak | developing | good | strong",
      "summary": "Brief assessment",
      "gaps": ["List of specific gaps"]
    }},
    "market": {{
      "score": 0,
      "status": "weak | developing | good | strong",
      "summary": "Brief assessment",
      "gaps": ["List of specific gaps"]
    }},
    "strategic": {{
      "score": 0,
      "status": "weak | developing | good | strong",
      "summary": "Brief assessment",
      "gaps": ["List of specific gaps"]
    }}
  }},
  "red_flags": [
    {{
      "description": "Red flag description",
      "severity": "critical | high | medium | low",
      "impact": "How this would affect exit value or process"
    }}
  ],
  "preparation_recommendations": [
    {{
      "action": "Specific action to take",
      "priority": "critical | high | medium | low",
      "category": "financial | legal | operational | market | strategic"
    }}
  ],
  "estimated_timeline": {{
    "months_to_ready": 0,
    "narrative": "Explanation of timeline estimate"
  }},
  "confidence_score": 0,
  "documents_analysed": 0
}}

Scoring rules:
- overall_readiness_score: 0-100 based on exit readiness across all categories
- Category scores: 0-100 each
- confidence_score: 0-100 based on how much usable data was in the documents
- months_to_ready: realistic estimate to address all critical and high priority gaps
- Be honest and direct — if documentation is weak, say so clearly
- Only assess what is present in the documents; do not invent data
"""

SYSTEM_INSTRUCTION = (
    'You are a senior M&A advisor and due diligence expert. '
    'Analyse business documents objectively from an acquirer and investor perspective. '
    'Be direct, honest, and board-grade. Always return valid JSON only.'
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
      max_output_tokens=3500
    )
  )
  return _parse_json_strict_then_loose(repair.text)


def get_or_generate_exit_readiness(company):
    """
    Return stored exit readiness if doc count unchanged, otherwise regenerate and save.
    """
    current_doc_count = Document.query.filter_by(company_id=company.id).count()

    if (
        company.exit_readiness
        and company.exit_readiness_doc_count == current_doc_count
        and current_doc_count > 0
    ):
        try:
            stored = json.loads(company.exit_readiness)
            stored['_cached'] = True
            stored['_last_updated'] = company.exit_readiness_updated_at.isoformat() if company.exit_readiness_updated_at else None
            return stored
        except Exception:
            pass

    result = generate_exit_readiness(company)

    if 'error' not in result:
        company.exit_readiness = json.dumps(result)
        company.exit_readiness_updated_at = datetime.utcnow()
        company.exit_readiness_doc_count = current_doc_count
        db.session.commit()

    result['_cached'] = False
    result['_last_updated'] = company.exit_readiness_updated_at.isoformat() if company.exit_readiness_updated_at else None
    return result


def generate_exit_readiness(company):
    """Generate a fresh AI-powered exit readiness report from all company documents."""
    documents = Document.query.filter_by(company_id=company.id).all()

    if not documents:
        return _empty_report(company, reason="No documents have been uploaded yet.")

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
            snippet = content.strip()[:2500]
            doc_blocks.append(
                f"--- Document {i}: {doc.filename} (Type: {doc.document_type}) ---\n{snippet}"
            )

    if not doc_blocks:
        return _empty_report(company, reason="Documents uploaded but no content extracted yet.")

    combined = "\n\n".join(doc_blocks)
    prompt = EXIT_READINESS_PROMPT.format(
        company_name=company.name,
        company_stage=company.stage or 'Unknown',
        company_industry=company.industry or 'Unknown',
        documents=combined
    )

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
      return _fallback_report(company, documents, reason='GEMINI_API_KEY not configured')

    try:
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.3,
                max_output_tokens=3500
            )
        )

        raw = response.text or ''
        try:
          result = _parse_json_strict_then_loose(raw)
        except json.JSONDecodeError:
          result = _repair_json_response(client, model_name, raw)
        result['documents_analysed'] = len(doc_blocks)
        result['company_name'] = company.name
        result['company_stage'] = company.stage
        result['company_industry'] = company.industry
        return result

    except json.JSONDecodeError as e:
      print(f'Exit readiness JSON parse error: {e}')
      return _fallback_report(company, documents, reason='AI response parse error')
    except Exception as e:
      print(f'Exit readiness generation error: {e}')
      return _fallback_report(company, documents, reason=f'AI service error: {str(e)}')


def _empty_report(company, reason="No data available."):
    return {
        'company_name': company.name,
        'company_stage': company.stage,
        'company_industry': company.industry,
        'overall_readiness_score': 0,
        'readiness_verdict': 'Not Ready',
        'executive_summary': reason,
        'document_coverage': None,
        'readiness_by_category': None,
        'red_flags': [],
        'preparation_recommendations': [],
        'estimated_timeline': None,
        'confidence_score': 0,
        'documents_analysed': 0,
        'error': reason
    }


def _fallback_report(company, documents, reason='AI analysis unavailable'):
    return {
        'company_name': company.name,
        'company_stage': company.stage,
        'company_industry': company.industry,
        'overall_readiness_score': 0,
        'readiness_verdict': 'Unknown',
    'executive_summary': f'Exit readiness analysis unavailable — {reason}. {len(documents)} document(s) submitted.',
        'document_coverage': None,
        'readiness_by_category': None,
        'red_flags': [],
        'preparation_recommendations': [],
        'estimated_timeline': None,
        'confidence_score': 0,
        'documents_analysed': len(documents),
    'error': reason  # Prevents caching so it retries next time
    }
