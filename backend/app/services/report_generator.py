from app.models.decision import Decision
from app.models.risk import Risk
from app.models.analysis import Analysis
from datetime import datetime
import json

def generate_exit_readiness_report(company):
    """Generate an exit-readiness snapshot for due diligence preparation"""
    
    decisions = Decision.query.filter_by(company_id=company.id).all()
    risks = Risk.query.filter_by(company_id=company.id).all()
    analyses = Analysis.query.filter_by(company_id=company.id).all()
    
    # Calculate readiness metrics
    dd_risks = [r for r in risks if r.dd_relevant]
    high_concern_risks = [r for r in dd_risks if r.dd_concern_level == 'high']
    
    decisions_with_rationale = len([d for d in decisions if d.rationale])
    risks_with_mitigation = len([r for r in risks if r.mitigation_plan])
    
    readiness_score = calculate_readiness_score(
        len(decisions),
        len(risks),
        decisions_with_rationale,
        risks_with_mitigation,
        len(high_concern_risks)
    )
    
    return {
        'company_name': company.name,
        'stage': company.stage,
        'industry': company.industry,
        'readiness_score': readiness_score,
        'timestamp': datetime.utcnow().isoformat(),
        'key_metrics': {
            'decisions_documented': len(decisions),
            'decisions_with_rationale': decisions_with_rationale,
            'total_risks_identified': len(risks),
            'dd_relevant_risks': len(dd_risks),
            'high_concern_risks': len(high_concern_risks),
            'risks_with_mitigation': risks_with_mitigation,
            'documents_analyzed': len(analyses)
        },
        'governance_maturity': assess_governance_maturity(company),
        'due_diligence_gaps': identify_dd_gaps(decisions, risks),
        'recommended_actions': generate_recommendations(company, readiness_score),
        'exit_narrative': generate_exit_narrative(company, decisions, risks),
        'red_flags': identify_red_flags(high_concern_risks, risks_with_mitigation, len(decisions))
    }

def generate_investor_questions_report(company):
    """Generate likely investor/acquirer questions based on company data"""
    
    decisions = Decision.query.filter_by(company_id=company.id).all()
    risks = Risk.query.filter_by(company_id=company.id).all()
    
    return {
        'company_name': company.name,
        'timestamp': datetime.utcnow().isoformat(),
        'strategic_questions': [
            "Walk us through your key strategic decisions over the past 12 months.",
            "What were the main assumptions underlying each decision?",
            "How have you validated your market hypothesis?",
            "What's your total addressable market and how do you capture it?"
        ],
        'risk_questions': [
            f"You identified {len(risks)} material risks - which are the most material?",
            "What's your mitigation strategy for competitive threats?",
            "How dependent is the business on key personnel?",
            "What regulatory or compliance risks should we be aware of?"
        ],
        'operational_questions': [
            "What are your core unit economics?",
            "How does your customer acquisition compare to retention?",
            "What's your capital efficiency (revenue per dollar raised)?",
            "What's your runway with current burn rate?"
        ],
        'exit_questions': [
            "How does your strategy position you for an exit?",
            "Who are your potential acquirers?",
            "What would make your company attractive to a buyer?",
            "How defensible is your competitive position?"
        ]
    }

def calculate_readiness_score(decisions_count, risks_count, decisions_with_rationale, 
                               risks_with_mitigation, high_concern_risks):
    """Calculate a governance readiness score (0-100)"""
    
    # Scoring logic
    score = 50  # Base score
    
    # Positive factors
    if decisions_count >= 5:
        score += 10
    if risks_count >= 3:
        score += 10
    if decisions_with_rationale >= decisions_count * 0.7:
        score += 10
    if risks_with_mitigation >= risks_count * 0.7:
        score += 10
    
    # Negative factors
    if high_concern_risks > 5:
        score -= 15
    
    # Cap at 100
    return min(100, max(0, score))

def assess_governance_maturity(company):
    """Assess governance maturity level"""
    
    decisions = Decision.query.filter_by(company_id=company.id).count()
    analyses = Analysis.query.filter_by(company_id=company.id).count()
    
    if decisions >= 10 and analyses >= 5:
        return "Mature"
    elif decisions >= 5 and analyses >= 2:
        return "Developing"
    else:
        return "Emerging"

def identify_dd_gaps(decisions, risks):
    """Identify gaps in due diligence documentation"""
    
    gaps = []
    
    if len(decisions) < 5:
        gaps.append("Limited strategic decision documentation")
    
    decisions_with_rationale = len([d for d in decisions if d.rationale])
    if decisions_with_rationale < len(decisions) * 0.7:
        gaps.append("Many decisions lack documented rationale")
    
    risks_with_mitigation = len([r for r in risks if r.mitigation_plan])
    if risks_with_mitigation < len(risks) * 0.7:
        gaps.append("Most risks lack documented mitigation plans")
    
    if len(risks) < 3:
        gaps.append("Insufficient risk identification and assessment")
    
    return gaps if gaps else ["All major areas covered"]

def generate_recommendations(company, readiness_score):
    """Generate actionable recommendations"""
    
    recommendations = []
    
    if readiness_score < 60:
        recommendations.append("Establish quarterly board meeting cadence with documented agendas")
        recommendations.append("Document strategic rationale for all major decisions")
        recommendations.append("Conduct comprehensive risk assessment workshop")
    elif readiness_score < 80:
        recommendations.append("Enhance risk mitigation documentation")
        recommendations.append("Add financial stress-testing scenarios")
    else:
        recommendations.append("Prepare executive summary for investor meetings")
        recommendations.append("Update exit optionality scenarios")
    
    return recommendations

def generate_exit_narrative(company, decisions, risks):
    """Generate a compelling exit narrative based on decisions"""
    
    narrative = f"We built {company.name} by making focused strategic decisions on"
    
    if decisions:
        decision_areas = set(d.impact_area for d in decisions if d.impact_area)
        if decision_areas:
            narrative += f" {', '.join(list(decision_areas)[:3])}"
    
    narrative += ". Our governance approach ensures we've identified and mitigated key risks. We're positioned for acquisition by delivering clear strategic value."
    
    return narrative

def identify_red_flags(high_concern_risks, risks_with_mitigation, decisions_count):
    """Identify red flags that would concern buyers"""
    
    flags = []
    
    if len(high_concern_risks) > 3:
        flags.append("Multiple high-concern risks identified")
    
    if decisions_count == 0:
        flags.append("No documented strategic decisions")
    
    if len(high_concern_risks) > 0 and risks_with_mitigation == 0:
        flags.append("High-concern risks without mitigation plans")
    
    return flags if flags else ["No major red flags identified"]
