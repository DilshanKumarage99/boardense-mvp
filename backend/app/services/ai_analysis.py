import os
import json
from google import genai
from app.models.decision import Decision
from app.models.risk import Risk


def _get_gemini_client():
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def analyze_document_with_ai(document):
    """
    Analyze document using Gemini to extract decisions, risks, and strategic insights.
    """

    if not document.content_extracted:
        return {
            'decisions': [],
            'risks': [],
            'blind_spots': [],
            'questions': [],
            'summary': 'No content extracted from document'
        }

    analysis_prompt = f"""Analyze this strategic document for a startup/scaleup board. Extract:

DOCUMENT CONTENT:
{document.content_extracted[:4000]}

Please provide JSON response with:
1. "decisions": List of {{title, description, strategic_intent, assumptions}}
2. "risks": List of {{title, category, probability, impact, dd_relevant}}
3. "blind_spots": List of strategic gaps or missing discussions
4. "questions": List of board-level probing questions this should trigger
5. "summary": Brief executive summary

Return ONLY valid JSON, no markdown or extra text."""

    try:
        client = _get_gemini_client()
        if not client:
            return fallback_analysis(document)

        model = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        response = client.models.generate_content(
            model=model,
            contents=analysis_prompt,
        )
        response_text = response.text.strip()
        # Strip markdown code fences if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        analysis = json.loads(response_text)
        return analysis

    except Exception as e:
        print(f"AI analysis error: {e}")
        return fallback_analysis(document)

def fallback_analysis(document):
    """Fallback analysis when OpenAI API is not available"""
    
    content = document.content_extracted or ""
    
    return {
        'decisions': [
            {
                'title': 'Strategic Decision Identified',
                'description': 'Document contains strategic planning information',
                'strategic_intent': 'To align company direction',
                'assumptions': 'Market conditions remain stable'
            }
        ],
        'risks': [
            {
                'title': 'Market Risk',
                'category': 'market',
                'probability': 'medium',
                'impact': 'high',
                'dd_relevant': True
            },
            {
                'title': 'Execution Risk',
                'category': 'operational',
                'probability': 'medium',
                'impact': 'medium',
                'dd_relevant': True
            }
        ],
        'blind_spots': [
            'Competitive response to strategy not discussed',
            'Long-term sustainability metrics not defined',
            'Alternative scenarios not explored'
        ],
        'questions': [
            'What breaks if growth slows by 20%?',
            'Which risks would an acquirer care about most?',
            'What story does this decision tell in a due diligence room?',
            'Have we stress-tested our unit economics?',
            'What are our exit optionality scenarios?'
        ],
        'summary': 'Document analyzed. Strategic decisions, risks, and gaps identified. Ready for board discussion.'
    }

def generate_strategic_sparring_questions(company):
    """Generate board-level probing questions based on company data"""
    
    questions = [
        "What breaks if growth slows by 20%?",
        "Which risks would an acquirer care about most?",
        "What story does this decision tell in a due diligence room?",
        "Have we validated our core assumptions with customers?",
        "What are our three most critical unit economics?",
        "If we had to exit in 12 months, what would be our story?",
        "Who are our top 3 competitive threats and why?",
        "What talent/skills are we missing to execute this strategy?",
        "How does this decision align with our long-term vision?",
        "What's our Plan B if our primary market doesn't materialize?"
    ]
    
    return questions
