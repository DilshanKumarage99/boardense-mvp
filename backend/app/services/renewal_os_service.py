import os
import json
from google import genai
from google.genai import types
from app.models.document import Document

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — ROS Core Analysis Prompt
# ─────────────────────────────────────────────────────────────────────────────

ROS_CORE_PROMPT = """You are a senior board advisor and strategy expert specializing in organizational renewal, strategic transformation, and governance.

Your task is to analyze an organization using the Renewal Operating System (ROS) framework.
The Renewal Operating System evaluates an organization's ability to continuously renew itself in a rapidly changing environment.

COMPANY: {company_name} | STAGE: {company_stage} | INDUSTRY: {company_industry}

SUBMITTED DOCUMENTS:
{documents}

OBJECTIVE
Assess the organization's renewal capability and identify strengths, risks, and priority actions
that would improve its ability to adapt, innovate, and evolve over time.

INPUT INTERPRETATION RULES
- Base the analysis strictly on the information provided in the documents.
- If information is incomplete, make cautious and reasonable assumptions and clearly indicate them.
- Do not invent facts, metrics, or capabilities not supported by the input.
- Where evidence is limited, reflect this in the scoring and explanation.

FRAMEWORK DIMENSIONS
Evaluate the organization across four dimensions:

1. Strategic Renewal — ability to continuously evolve strategy, explore new opportunities, and
   respond to market disruption, technological change, and emerging trends.
2. Leadership Renewal — leadership team's ability to learn, adapt, make decisions under
   uncertainty, challenge assumptions, and enable renewal in the organization.
3. Business Model Renewal — capability to develop new value creation models, explore new revenue
   streams, experiment with innovation, and evolve its business model.
4. Organizational Renewal — ability to develop capabilities, adapt structures and processes,
   evolve culture, and learn from experimentation and change.

SCORING
Score each dimension 1.0–5.0 (one decimal):
1.0–2.0  Reactive
2.1–3.0  Adaptive
3.1–4.0  Strategic Renewal
4.1–5.0  Continuous Renewal

overall_score = average of the four dimension scores.

Return ONLY valid JSON (no markdown, no code blocks) with exactly this structure:
{{
  "scores": {{
    "strategic_renewal": 0.0,
    "leadership_renewal": 0.0,
    "business_model_renewal": 0.0,
    "organizational_renewal": 0.0,
    "overall_score": 0.0
  }},
  "maturity_level": "Reactive | Adaptive | Strategic Renewal | Continuous Renewal",
  "executive_summary": "Concise overview of the organization's renewal capability and the most important insight.",
  "dimension_analysis": {{
    "strategic_renewal": "Short assessment with reasoning for the score.",
    "leadership_renewal": "Short assessment with reasoning for the score.",
    "business_model_renewal": "Short assessment with reasoning for the score.",
    "organizational_renewal": "Short assessment with reasoning for the score."
  }},
  "key_renewal_strengths": ["List of main capabilities that support renewal and long-term adaptability"],
  "key_renewal_risks": ["List of structural weaknesses, strategic blind spots, or capability gaps that limit renewal"],
  "priority_renewal_actions": ["3-5 concrete actions to significantly strengthen renewal capability over the next 12-24 months"],
  "documents_analysed": 0,
  "confidence_score": 0
}}

confidence_score: 0-100 based on how much relevant data was available across all documents.
documents_analysed: number of documents provided."""


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2a — Executive Renewal Readiness Report Formatter
# ─────────────────────────────────────────────────────────────────────────────

EXECUTIVE_REPORT_PROMPT = """You are a strategic advisor helping executive teams strengthen their organization's ability to continuously renew itself.

Use the Renewal Operating System (ROS) analysis results below to produce a Renewal Readiness Report for the executive team.

COMPANY: {company_name} | STAGE: {company_stage} | INDUSTRY: {company_industry}

ROS CORE ANALYSIS:
{core_analysis}

Do NOT recalculate scores. Use the provided analysis as the basis for the report.
Focus on insights and actions relevant to the executive leadership team.

Return ONLY valid JSON (no markdown, no code blocks) with exactly this structure:
{{
  "executive_summary": "Concise overview of how well the organization currently renews itself and the most important insight.",
  "renewal_maturity_snapshot": {{
    "strategic_renewal": 0.0,
    "leadership_renewal": 0.0,
    "business_model_renewal": 0.0,
    "organizational_renewal": 0.0,
    "overall_score": 0.0,
    "maturity_level": "...",
    "interpretation": "Brief explanation of what these scores indicate for the executive team."
  }},
  "key_renewal_strengths": ["Main capabilities that support renewal"],
  "key_renewal_risks": ["Structural or strategic risks that may limit the organization's ability to renew itself"],
  "leadership_priorities": ["3-5 practical priorities for the leadership team over the next 12-24 months"],
  "renewal_outlook": "Short conclusion describing whether the organization is likely to stagnate, adapt gradually, or actively renew itself."
}}"""


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2b — Board Renewal Brief Formatter
# ─────────────────────────────────────────────────────────────────────────────

BOARD_BRIEF_PROMPT = """You are a board advisor preparing a Renewal Brief for the board of directors.

Use the Renewal Operating System (ROS) analysis results below to prepare a Board Renewal Brief.
Focus on governance implications and strategic oversight.

COMPANY: {company_name} | STAGE: {company_stage} | INDUSTRY: {company_industry}

ROS CORE ANALYSIS:
{core_analysis}

Do NOT recalculate scores. Use the provided analysis as the basis for the brief.

Return ONLY valid JSON (no markdown, no code blocks) with exactly this structure:
{{
  "overall_renewal_assessment": "Short assessment of the organization's renewal capability and maturity level from a governance perspective.",
  "renewal_maturity_snapshot": {{
    "strategic_renewal": 0.0,
    "leadership_renewal": 0.0,
    "business_model_renewal": 0.0,
    "organizational_renewal": 0.0,
    "overall_score": 0.0,
    "maturity_level": "...",
    "governance_interpretation": "Brief interpretation of scores from a governance perspective."
  }},
  "strategic_renewal_risks": ["Strategic risks related to the organization's ability to adapt to industry change, technological disruption, or market shifts"],
  "governance_implications": "What the board should be aware of or challenge management on.",
  "key_questions_for_board": ["5 questions the board should ask management to strengthen renewal capability"],
  "priority_areas_for_board_oversight": ["3 areas where board attention is most important over the next 12-24 months"]
}}"""


SYSTEM_INSTRUCTION = (
    'You are a senior board advisor and organizational renewal expert. '
    'Analyse business documents objectively from a strategic transformation perspective. '
    'Be direct, honest, and board-grade. Always return valid JSON only.'
)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_or_generate_renewal_os(company, report_type='executive'):
    """
    Generate Renewal OS report for the given report_type.
    Stateless by design to avoid schema-coupled cache columns in Company.

    report_type: 'executive' | 'board'
    """
    result = _generate_renewal_os(company, report_type)
    result.pop('_core', None)
    result['_cached'] = False
    result['_last_updated'] = None
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _generate_renewal_os(company, report_type):
    """Run the full two-step ROS pipeline: core analysis → report formatter."""
    documents = Document.query.filter_by(company_id=company.id).all()

    if not documents:
        return _empty_report(company, report_type, reason="No documents have been uploaded yet.")

    doc_blocks = []
    for i, doc in enumerate(documents, 1):
        content = doc.content_summary or doc.content_extracted or ''
        if content.strip():
            snippet = content.strip()[:2500]
            doc_blocks.append(
                f"--- Document {i}: {doc.filename} (Type: {doc.document_type}) ---\n{snippet}"
            )

    if not doc_blocks:
        return _empty_report(company, report_type, reason="Documents uploaded but no content extracted yet.")

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return _fallback_report(company, report_type, documents)

    combined = "\n\n".join(doc_blocks)

    try:
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        client = genai.Client(api_key=api_key)

        # ── Step 1: Core ROS Analysis ─────────────────────────────────────
        core_prompt = ROS_CORE_PROMPT.format(
            company_name=company.name,
            company_stage=company.stage or 'Unknown',
            company_industry=company.industry or 'Unknown',
            documents=combined
        )
        core_response = client.models.generate_content(
            model=model_name,
            contents=core_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.3,
                max_output_tokens=8192
            )
        )
        raw_core = _strip_fences(core_response.text)
        core_analysis = json.loads(raw_core)
        core_analysis['documents_analysed'] = len(doc_blocks)

        # ── Step 2: Report Formatter ──────────────────────────────────────
        prompt_template = EXECUTIVE_REPORT_PROMPT if report_type == 'executive' else BOARD_BRIEF_PROMPT
        report_prompt = prompt_template.format(
            company_name=company.name,
            company_stage=company.stage or 'Unknown',
            company_industry=company.industry or 'Unknown',
            core_analysis=json.dumps(core_analysis, indent=2)
        )
        report_response = client.models.generate_content(
            model=model_name,
            contents=report_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.3,
                max_output_tokens=8192
            )
        )
        raw_report = _strip_fences(report_response.text)
        report = json.loads(raw_report)

        # Attach metadata for caching
        report['_core'] = core_analysis
        report['_core_scores'] = core_analysis.get('scores')
        report['_maturity_level'] = core_analysis.get('maturity_level')
        report['_documents_analysed'] = core_analysis.get('documents_analysed', len(doc_blocks))
        report['_confidence_score'] = core_analysis.get('confidence_score', 0)
        report['company_name'] = company.name
        return report

    except json.JSONDecodeError as e:
        print(f'Renewal OS JSON parse error: {e}')
        return _fallback_report(company, report_type, documents)
    except Exception as e:
        print(f'Renewal OS generation error: {e}')
        return _fallback_report(company, report_type, documents)


def _strip_fences(text):
    """Remove markdown code fences from a Gemini response."""
    text = text.strip()
    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]
        text = text.strip()
    return text


def _empty_report(company, report_type, reason="No data available."):
    base = {
        'company_name': company.name,
        '_core_scores': None,
        '_maturity_level': None,
        '_documents_analysed': 0,
        '_confidence_score': 0,
        'error': reason
    }
    if report_type == 'executive':
        base.update({
            'executive_summary': reason,
            'renewal_maturity_snapshot': None,
            'key_renewal_strengths': [],
            'key_renewal_risks': [],
            'leadership_priorities': [],
            'renewal_outlook': reason
        })
    else:
        base.update({
            'overall_renewal_assessment': reason,
            'renewal_maturity_snapshot': None,
            'strategic_renewal_risks': [],
            'governance_implications': reason,
            'key_questions_for_board': [],
            'priority_areas_for_board_oversight': []
        })
    return base


def _fallback_report(company, report_type, documents):
    msg = (
        f'Renewal OS analysis unavailable — AI response could not be parsed. '
        f'{len(documents)} document(s) submitted. Please try again.'
    )
    base = {
        'company_name': company.name,
        '_core_scores': None,
        '_maturity_level': None,
        '_documents_analysed': len(documents),
        '_confidence_score': 0,
        'error': msg
    }
    if report_type == 'executive':
        base.update({
            'executive_summary': msg,
            'renewal_maturity_snapshot': None,
            'key_renewal_strengths': [],
            'key_renewal_risks': [],
            'leadership_priorities': [],
            'renewal_outlook': 'Analysis unavailable.'
        })
    else:
        base.update({
            'overall_renewal_assessment': msg,
            'renewal_maturity_snapshot': None,
            'strategic_renewal_risks': [],
            'governance_implications': 'Analysis unavailable.',
            'key_questions_for_board': [],
            'priority_areas_for_board_oversight': []
        })
    return base
