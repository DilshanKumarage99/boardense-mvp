import os
from google import genai
from google.genai import types

SUMMARY_PROMPT = """You are analyzing a document submitted to a board or executive team.

Extract and structure the following from the document:

1. **Context** - What is this document about? What situation or period does it cover?
2. **Key Decisions Made or Required** - Any decisions already made or pending approval
3. **Critical Assumptions** - What is being assumed explicitly or implicitly?
4. **Risks & Concerns** - Any risks, warnings or concerns mentioned
5. **Important Dates & Deadlines** - Any time-sensitive items
6. **Financial Figures** - Any key numbers, budgets or financial data mentioned
7. **Action Items** - Any tasks, responsibilities or next steps mentioned
8. **Unresolved Issues** - Anything flagged as uncertain or incomplete

Be concise, direct and board-grade. Do not add opinions or recommendations.
Only extract what is present in the document.
If something is missing or unclear, state it explicitly.

Document:
{content}"""

SYSTEM_INSTRUCTION = (
    'You are an independent systemic transformation intelligence supporting boards and top management. '
    'Be concise, direct and board-grade. '
    'Do not give advice or recommendations — only extract and surface what is in the document.'
)


def summarize_document(document):
    """
    Generate a structured summary of a document using Google Gemini.
    Returns the summary string.
    """
    if not document.content_extracted:
        return 'No content available to summarize.'

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return _fallback_summary(document)

    # Limit content to ~6000 chars to stay within token limits
    content_snippet = document.content_extracted[:6000]
    prompt = SUMMARY_PROMPT.format(content=content_snippet)

    try:
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.3,
                max_output_tokens=1500
            )
        )
        return response.text.strip()

    except Exception as e:
        print(f'Summarization error: {e}')
        return f'Summarization failed: {str(e)}'


def _fallback_summary(document):
    """Simple fallback summary when no API key is set."""
    content = document.content_extracted or ''
    lines = [l.strip() for l in content.splitlines() if l.strip()]
    preview = ' '.join(lines[:10])
    return (
        f'[Summary unavailable — GEMINI_API_KEY not set]\n\n'
        f'Document preview: {preview[:500]}...' if len(preview) > 500 else f'Document preview: {preview}'
    )
