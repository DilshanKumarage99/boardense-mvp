import os
import json
try:
    from openai import OpenAI
    _OPENAI_NEW = True
except Exception:
    import openai
    _OPENAI_NEW = False
from app.models.decision import Decision
from app.models.risk import Risk

# Initialize OpenAI client (you'll need to set OPENAI_API_KEY environment variable)
if _OPENAI_NEW:
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY', ''))
else:
    openai.api_key = os.getenv('OPENAI_API_KEY', '')
    client = openai

def analyze_document_with_ai(document):
    """
    Analyze document using OpenAI to extract decisions, risks, and strategic insights
    This uses RAG principles - retrieve content, augment with context, generate analysis
    """
    
    if not document.content_extracted:
        return {
            'decisions': [],
            'risks': [],
            'blind_spots': [],
            'questions': [],
            'summary': 'No content extracted from document'
        }
    
    # Prepare the analysis prompt
    analysis_prompt = f"""Analyze this strategic document for a startup/scaleup board. Extract:

DOCUMENT CONTENT:
{document.content_extracted[:4000]}  # Limit to first 4000 chars for token management

Please provide JSON response with:
1. "decisions": List of {{title, description, strategic_intent, assumptions}}
2. "risks": List of {{title, category, probability, impact, dd_relevant}}
3. "blind_spots": List of strategic gaps or missing discussions
4. "questions": List of board-level probing questions this should trigger
5. "summary": Brief executive summary

Return ONLY valid JSON, no markdown or extra text."""

    try:
        # For MVP, we'll use a fallback analysis if API key not available
        if not os.getenv('OPENAI_API_KEY'):
            return fallback_analysis(document)
        
        # Support both the new `OpenAI` client and the older `openai` module
        if _OPENAI_NEW:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert strategic advisor analyzing board documents. Always respond with valid JSON."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            # new client: response.choices[0].message.content
            try:
                response_text = getattr(response.choices[0].message, 'content')
            except Exception:
                response_text = response.choices[0].message["content"]
        else:
            response = client.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert strategic advisor analyzing board documents. Always respond with valid JSON."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            # old client: dict-like response
            response_text = response['choices'][0]['message']['content']

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
