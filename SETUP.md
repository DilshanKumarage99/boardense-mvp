# Boardense MVP - Setup & Installation Guide

## Overview

Boardense is a **Strategic Board Intelligence System** for startups and scaleups. This MVP includes:
- Multi-tenant backend API (Flask + SQLAlchemy)
- React frontend with authentication
- Document upload and AI analysis
- Exit readiness and investor reporting
- Governance tracking

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Git
- OpenAI API key (optional for MVP)

## Installation

### Step 1: Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file with configuration:
```bash
cat > .env << EOF
FLASK_ENV=development
FLASK_DEBUG=true
JWT_SECRET_KEY=your-secret-key-change-in-production
DATABASE_URL=sqlite:///boardense.db
OPENAI_API_KEY=sk-your-openai-key-here
EOF
```

5. Initialize the database:
```bash
python -c "from app import create_app; app = create_app()"
```

6. Start the backend server:
```bash
python run.py
```

The API will be running at `http://localhost:5000`

### Step 2: Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional, for API base URL):
```bash
cat > .env << EOF
REACT_APP_API_URL=http://localhost:5000
EOF
```

4. Start the development server:
```bash
npm start
```

The frontend will be running at `http://localhost:3000`

## API Documentation

### Authentication Endpoints

**Register**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "founder@startup.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepassword"
}
```

**Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "founder@startup.com",
  "password": "securepassword"
}
```

### Company Endpoints

**Get current user**
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

### Document Upload

**Upload document**
```bash
POST /api/documents/companies/<company_id>/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form data:
- file: <document_file>
- document_type: board_deck|strategy_doc|okr|decision_note|general
```

**List documents**
```bash
GET /api/documents/companies/<company_id>/list
Authorization: Bearer <token>
```

### Analysis

**Analyze document**
```bash
POST /api/analysis/document/<document_id>/analyze
Authorization: Bearer <token>
```

Response includes:
- Extracted decisions
- Identified risks
- Strategic blind spots
- Board-level questions
- Executive summary

### Reports

**Exit Readiness Report**
```bash
GET /api/reports/companies/<company_id>/exit-readiness
Authorization: Bearer <token>
```

Returns:
- Readiness score (0-100)
- Key metrics
- Governance maturity assessment
- Due diligence gaps
- Recommended actions
- Red flags

**Investor Questions Report**
```bash
GET /api/reports/companies/<company_id>/investor-questions
Authorization: Bearer <token>
```

Returns:
- Strategic questions likely to be asked
- Risk questions
- Operational questions
- Exit positioning questions

## Database Schema

### Users
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'member',
  created_at DATETIME,
  updated_at DATETIME
);
```

### Companies (Multi-tenant)
```sql
CREATE TABLE companies (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stage VARCHAR(50),
  industry VARCHAR(100),
  created_by VARCHAR(36) FOREIGN KEY REFERENCES users(id),
  created_at DATETIME,
  updated_at DATETIME
);
```

### Documents
```sql
CREATE TABLE documents (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) FOREIGN KEY REFERENCES companies(id),
  filename VARCHAR(255),
  file_type VARCHAR(50),
  file_path VARCHAR(500),
  content_extracted TEXT,
  document_type VARCHAR(50),
  uploaded_by_id VARCHAR(36) FOREIGN KEY REFERENCES users(id),
  created_at DATETIME,
  updated_at DATETIME
);
```

### Decisions
```sql
CREATE TABLE decisions (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) FOREIGN KEY REFERENCES companies(id),
  title VARCHAR(255),
  description TEXT,
  strategic_intent TEXT,
  assumptions TEXT,
  rationale TEXT,
  decision_date DATETIME,
  status VARCHAR(50),
  impact_area VARCHAR(100),
  impact_level VARCHAR(50),
  created_at DATETIME,
  updated_at DATETIME
);
```

### Risks
```sql
CREATE TABLE risks (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) FOREIGN KEY REFERENCES companies(id),
  title VARCHAR(255),
  description TEXT,
  probability VARCHAR(50),
  impact VARCHAR(50),
  category VARCHAR(100),
  mitigation_plan TEXT,
  owner VARCHAR(100),
  dd_relevant BOOLEAN,
  dd_concern_level VARCHAR(50),
  status VARCHAR(50),
  created_at DATETIME,
  updated_at DATETIME
);
```

### Analyses
```sql
CREATE TABLE analyses (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) FOREIGN KEY REFERENCES companies(id),
  document_id VARCHAR(36) FOREIGN KEY REFERENCES documents(id),
  extracted_decisions JSON,
  extracted_risks JSON,
  strategic_blind_spots JSON,
  board_level_questions JSON,
  executive_summary TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

## File Structure

```
boardense-mvp/
├── backend/
│   ├── app/
│   │   ├── __init__.py           # Flask app factory
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py           # User model
│   │   │   ├── company.py        # Company model (multi-tenant)
│   │   │   ├── document.py       # Document model
│   │   │   ├── decision.py       # Decision model
│   │   │   ├── risk.py           # Risk model
│   │   │   └── analysis.py       # Analysis results model
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # Authentication endpoints
│   │   │   ├── documents.py      # Document upload/list endpoints
│   │   │   ├── analysis.py       # Analysis endpoints
│   │   │   └── reports.py        # Report generation endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── document_processor.py  # Extract text from files
│   │   │   ├── ai_analysis.py        # LLM analysis
│   │   │   └── report_generator.py   # Generate reports
│   │   └── connectors/
│   │       └── (Google Drive, Notion, etc.)
│   ├── requirements.txt          # Python dependencies
│   ├── run.py                    # Entry point
│   ├── .env                      # Environment variables
│   └── boardense.db              # SQLite database (auto-created)
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CompanyDashboard.jsx
│   │   │   └── ReportPage.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   └── index.css
│   ├── package.json
│   └── .env (optional)
│
└── README.md                     # Project documentation

```

## Testing the MVP

### 1. Register a user

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "password": "password123"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "created_at": "2024-01-01T00:00:00"
  },
  "access_token": "jwt_token"
}
```

### 2. Use the React app

1. Open `http://localhost:3000`
2. Register or login
3. Create a company
4. Upload a board deck, strategy document, or other materials
5. View the analysis results
6. Generate exit readiness report
7. Review investor questions

## Key Features Implemented

✅ **Multi-tenant architecture** - Multiple companies per user  
✅ **JWT authentication** - Secure API access  
✅ **Document upload** - PDF, DOCX, TXT support  
✅ **AI analysis** - Extract decisions, risks, blind spots (with OpenAI or fallback)  
✅ **Strategic sparring** - Board-level questioning engine  
✅ **Exit readiness reporting** - Governance maturity assessment  
✅ **Investor questions** - Likely questions from acquirers  
✅ **Responsive UI** - React + Tailwind CSS  

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Environment mode | development |
| `FLASK_DEBUG` | Debug mode | true |
| `JWT_SECRET_KEY` | JWT signing key | change-in-production |
| `DATABASE_URL` | Database connection | sqlite:///boardense.db |
| `OPENAI_API_KEY` | OpenAI API key | (optional) |

### Frontend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | http://localhost:5000 |

## Next Steps to Production

1. **Database**: Migrate from SQLite to PostgreSQL
2. **OpenAI Integration**: Add full LLM integration for better analysis
3. **Cloud Storage**: Use S3 or similar for document storage
4. **Authentication**: Add OAuth2, SSO support
5. **Monitoring**: Add error tracking (Sentry) and analytics
6. **Security**: Implement encryption, RBAC, audit logs
7. **Deployment**: Docker, AWS/GCP/Azure deployment configurations
8. **Scaling**: Add caching, job queues, etc.

## Troubleshooting

### Backend won't start
- Ensure Python virtual environment is activated
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify `.env` file exists with correct values

### Frontend won't start
- Delete `node_modules` and `package-lock.json`, then run `npm install`
- Clear npm cache: `npm cache clean --force`
- Ensure Node.js version is 16+

### Database errors
- Delete `boardense.db` to reset the database
- Database will be recreated on next server start

### API connection issues
- Verify backend is running on `http://localhost:5000`
- Check CORS configuration if cross-origin errors occur
- Ensure JWT token is being sent in Authorization header

## Support & Questions

For more information, see the main [README.md](README.md)
