# Boardense MVP - Testing Guide

## Complete API Testing Reference

This guide provides curl commands and instructions for testing all Boardense endpoints.

## Prerequisites

- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:3000`
- Or use API directly with curl/Postman

## 1. Authentication Tests

### 1.1 Register New User

**Command:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "founder@startup.com",
    "first_name": "Sarah",
    "last_name": "Chen",
    "password": "SecurePassword123"
  }'
```

**Expected Response (201):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "founder@startup.com",
    "first_name": "Sarah",
    "last_name": "Chen",
    "role": "member",
    "created_at": "2024-01-15T10:30:00"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the `access_token` - you'll need it for all other requests!**

### 1.2 Login User

**Command:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "founder@startup.com",
    "password": "SecurePassword123"
  }'
```

**Expected Response (200):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "founder@startup.com",
    "first_name": "Sarah",
    "last_name": "Chen",
    "role": "member",
    "created_at": "2024-01-15T10:30:00"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.3 Get Current User

**Command:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Replace `YOUR_ACCESS_TOKEN` with the token from registration/login.

**Expected Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "email": "founder@startup.com",
  "first_name": "Sarah",
  "last_name": "Chen",
  "role": "member",
  "created_at": "2024-01-15T10:30:00"
}
```

## 2. Frontend Testing (Recommended)

The easiest way to test is through the web UI:

1. Open **http://localhost:3000**
2. Click **"Register"**
3. Fill in details and create account
4. Click **"Add Company"**
5. Create a company with name, stage, and industry
6. Upload a document
7. View analysis results
8. Generate reports

## 3. Document Upload Testing

### 3.1 Create a Sample Document

Create a file called `sample_board_deck.txt`:

```
QUARTERLY BOARD MEETING - Q4 2024

Strategic Initiatives:
1. Expand market presence in Europe - Key assumption is regulatory approval by Q1 2025
2. Launch v2.0 product - Risk: development might take 2 more months
3. Hire 10 new engineers - Assumes market conditions remain stable

Key Decisions:
- Decided to pivot away from B2B2C model after customer feedback
- Committed $500K to marketing in Q1 2025
- Approved hiring freeze due to market conditions

Identified Risks:
- Customer churn increased 5% this quarter
- Top engineer considering departure
- New competitor raised $50M Series B

Financial Metrics:
- Revenue: $2.3M (vs $1.8M target)
- CAC: $5,200 (vs $4,500 last quarter)
- Churn: 3.2% monthly (vs 2.8% target)

Next Quarter Priorities:
- Achieve product-market fit in new segment
- Reduce customer acquisition cost by 10%
- Complete Series A fundraising
```

### 3.2 Upload Document via API

First, get a company ID. For MVP testing, use this command to get a sample ID:

```bash
# Set variables (replace with real token and company ID)
TOKEN="your_access_token"
COMPANY_ID="sample-company-id"  # You'll get this when creating company

curl -X POST http://localhost:5000/api/documents/companies/$COMPANY_ID/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample_board_deck.txt" \
  -F "document_type=board_deck"
```

**Expected Response (201):**
```json
{
  "id": "doc-550e8400-e29b-41d4-a716-446655440002",
  "company_id": "sample-company-id",
  "filename": "sample_board_deck.txt",
  "file_type": "txt",
  "document_type": "board_deck",
  "file_size": 1024,
  "created_at": "2024-01-15T10:35:00"
}
```

### 3.3 List Documents

```bash
TOKEN="your_access_token"
COMPANY_ID="sample-company-id"

curl -X GET http://localhost:5000/api/documents/companies/$COMPANY_ID/list \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
[
  {
    "id": "doc-550e8400-e29b-41d4-a716-446655440002",
    "company_id": "sample-company-id",
    "filename": "sample_board_deck.txt",
    "file_type": "txt",
    "document_type": "board_deck",
    "file_size": 1024,
    "created_at": "2024-01-15T10:35:00"
  }
]
```

## 4. Analysis Testing

### 4.1 Analyze Document

```bash
TOKEN="your_access_token"
DOC_ID="doc-550e8400-e29b-41d4-a716-446655440002"

curl -X POST http://localhost:5000/api/analysis/document/$DOC_ID/analyze \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (201):**
```json
{
  "id": "analysis-550e8400-e29b-41d4-a716-446655440003",
  "company_id": "sample-company-id",
  "document_id": "doc-550e8400-e29b-41d4-a716-446655440002",
  "extracted_decisions": [
    {
      "title": "Pivot away from B2B2C model",
      "description": "Decided to pivot away from B2B2C model after customer feedback",
      "strategic_intent": "Focus on core competency",
      "assumptions": "B2C market is more defensible"
    }
  ],
  "extracted_risks": [
    {
      "title": "Customer churn increased",
      "category": "market",
      "probability": "high",
      "impact": "high",
      "dd_relevant": true
    }
  ],
  "strategic_blind_spots": [
    "Competitive response to strategy not discussed",
    "Long-term sustainability metrics not defined"
  ],
  "board_level_questions": [
    "What breaks if growth slows by 20%?",
    "Which risks would an acquirer care about most?",
    "What story does this decision tell in a due diligence room?"
  ],
  "executive_summary": "Document contains strategic decisions, identified risks, and gaps.",
  "created_at": "2024-01-15T10:40:00"
}
```

### 4.2 Get All Analyses for Company

```bash
TOKEN="your_access_token"
COMPANY_ID="sample-company-id"

curl -X GET http://localhost:5000/api/analysis/companies/$COMPANY_ID/all-analyses \
  -H "Authorization: Bearer $TOKEN"
```

## 5. Reports Testing

### 5.1 Exit Readiness Report

```bash
TOKEN="your_access_token"
COMPANY_ID="sample-company-id"

curl -X GET http://localhost:5000/api/reports/companies/$COMPANY_ID/exit-readiness \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "company_name": "TechStartup Inc",
  "stage": "series-a",
  "industry": "SaaS",
  "readiness_score": 75,
  "timestamp": "2024-01-15T10:45:00",
  "key_metrics": {
    "decisions_documented": 3,
    "decisions_with_rationale": 2,
    "total_risks_identified": 3,
    "dd_relevant_risks": 3,
    "high_concern_risks": 1,
    "risks_with_mitigation": 1,
    "documents_analyzed": 1
  },
  "governance_maturity": "Developing",
  "due_diligence_gaps": [
    "Many decisions lack documented rationale",
    "Most risks lack documented mitigation plans"
  ],
  "recommended_actions": [
    "Enhance risk mitigation documentation",
    "Add financial stress-testing scenarios"
  ],
  "exit_narrative": "We built TechStartup Inc by making focused strategic decisions on market positioning and product development. Our governance approach ensures we've identified and mitigated key risks.",
  "red_flags": [
    "High-concern risks without mitigation plans"
  ]
}
```

### 5.2 Investor Questions Report

```bash
TOKEN="your_access_token"
COMPANY_ID="sample-company-id"

curl -X GET http://localhost:5000/api/reports/companies/$COMPANY_ID/investor-questions \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "company_name": "TechStartup Inc",
  "timestamp": "2024-01-15T10:45:00",
  "strategic_questions": [
    "Walk us through your key strategic decisions over the past 12 months.",
    "What were the main assumptions underlying each decision?",
    "How have you validated your market hypothesis?"
  ],
  "risk_questions": [
    "You identified 3 material risks - which are the most material?",
    "What's your mitigation strategy for competitive threats?",
    "How dependent is the business on key personnel?"
  ],
  "operational_questions": [
    "What are your core unit economics?",
    "How does your customer acquisition compare to retention?",
    "What's your capital efficiency?"
  ],
  "exit_questions": [
    "How does your strategy position you for an exit?",
    "Who are your potential acquirers?",
    "What would make your company attractive to a buyer?"
  ]
}
```

### 5.3 Strategy Summary

```bash
TOKEN="your_access_token"
COMPANY_ID="sample-company-id"

curl -X GET http://localhost:5000/api/reports/companies/$COMPANY_ID/strategy-summary \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "company": {
    "id": "sample-company-id",
    "name": "TechStartup Inc",
    "stage": "series-a",
    "industry": "SaaS"
  },
  "decisions_count": 3,
  "risks_count": 3,
  "documents_analyzed": 1,
  "decisions": [
    {
      "id": "decision-1",
      "title": "Pivot away from B2B2C model",
      "description": "Decided to pivot after customer feedback",
      "status": "active"
    }
  ],
  "recent_risks": [
    {
      "id": "risk-1",
      "title": "Customer churn increased",
      "category": "market",
      "probability": "high",
      "impact": "high"
    }
  ]
}
```

## 6. Error Scenarios

### 6.1 Missing Authorization Token

**Command:**
```bash
curl -X GET http://localhost:5000/api/auth/me
```

**Expected Response (401):**
```json
{
  "error": "Missing Authorization Header"
}
```

### 6.2 Invalid Credentials

**Command:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "wrong@email.com",
    "password": "wrongpassword"
  }'
```

**Expected Response (401):**
```json
{
  "error": "Invalid email or password"
}
```

### 6.3 Duplicate Email Registration

**Command:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "founder@startup.com",  # Already registered
    "first_name": "John",
    "last_name": "Doe",
    "password": "password"
  }'
```

**Expected Response (400):**
```json
{
  "error": "Email already exists"
}
```

## 7. Using Postman

### Import Collection

1. Open Postman
2. Create new collection "Boardense"
3. Add requests:

**Auth - Register**
```
POST localhost:5000/api/auth/register
Body: JSON
{
  "email": "test@example.com",
  "first_name": "Test",
  "last_name": "User",
  "password": "password123"
}
```

**Auth - Login**
```
POST localhost:5000/api/auth/login
Body: JSON
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Auth - Me**
```
GET localhost:5000/api/auth/me
Headers: Authorization: Bearer {token}
```

Add more requests following the same pattern for documents, analysis, and reports.

## 8. Troubleshooting

### Backend Not Responding
```bash
# Check if backend is running
curl http://localhost:5000/api/auth/me

# If connection refused, start backend:
cd backend
python run.py
```

### Database Locked Error
```bash
# Reset database
rm backend/boardense.db
# Restart backend - database will be recreated
python run.py
```

### CORS Errors
Verify `Authorization` header is being sent correctly for all requests.

### Token Expired
- Register/login again to get new token
- Token is valid for 24 hours

## 9. Test Checklist

- [ ] User can register
- [ ] User can login
- [ ] Can retrieve current user
- [ ] Can create document upload (needs company first)
- [ ] Can list documents
- [ ] Can analyze document
- [ ] Can retrieve analysis
- [ ] Can get exit readiness report
- [ ] Can get investor questions report
- [ ] Can get strategy summary
- [ ] All error scenarios handled

## 10. Performance Testing

### Load Test (Simple)

```bash
# Test with 10 concurrent requests
for i in {1..10}; do
  curl -X GET http://localhost:5000/api/auth/me \
    -H "Authorization: Bearer $TOKEN" &
done
wait
```

### Response Time Test

```bash
# Measure API response time
time curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Next Steps

1. **Test with frontend** - Use the React UI at localhost:3000
2. **Upload real documents** - Test with actual board decks
3. **Test with OpenAI** - Add OpenAI API key for enhanced analysis
4. **Scale testing** - Test with multiple users and documents
5. **Deploy** - Ready for production deployment

All tests should pass without errors. Report any issues for debugging.
