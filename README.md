# Boardense MVP

## Strategic Board Intelligence for Startups

Boardense is a lightweight system designed to help founder-led companies build governance discipline, capture strategic decisions, and prepare for investor due diligence without expensive consultants.

## Features

### 1. Strategy-First Decision Memory
- Upload board decks, strategy documents, OKRs, and decision notes
- Automatic extraction of strategic intent, assumptions, and risks
- Structured decision trail for investor discussions

### 2. Built-in Strategic Sparring
- AI-powered board-level questioning
- Challenges company assumptions
- Identifies strategic blind spots
- Mimics experienced external board members

### 3. Exit-Aware Board Rhythm
- Quarterly agenda suggestions
- Tracks missing discussions
- Builds governance credibility without bureaucracy

### 4. Due Diligence Readiness
- Continuously organizes decisions, risks, and strategy pivots
- No scramble when due diligence begins
- No rewriting history

## Project Structure

```
boardense-mvp/
├── backend/              # Python Flask API
│   ├── app/
│   │   ├── models/      # Database models
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   └── connectors/  # Document connectors
│   ├── requirements.txt
│   ├── run.py
│   └── .env
└── frontend/            # React web app
    ├── src/
    │   ├── pages/       # React components
    │   ├── context/     # State management
    │   └── App.jsx
    ├── public/
    └── package.json
```

## Quick Start

### Backend

1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Set environment variables in `.env`:
```
OPENAI_API_KEY=your_api_key_here
JWT_SECRET_KEY=your_secret_key
DATABASE_URL=sqlite:///boardense.db
```

3. Run the server:
```bash
python run.py
```

The API will be available at `http://localhost:5000`

### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Documents
- `POST /api/documents/companies/<id>/upload` - Upload document
- `GET /api/documents/companies/<id>/list` - List company documents
- `GET /api/documents/<id>` - Get document details

### Analysis
- `POST /api/analysis/document/<id>/analyze` - Analyze document
- `GET /api/analysis/companies/<id>/all-analyses` - Get all analyses
- `GET /api/analysis/<id>` - Get analysis details

### Reports
- `GET /api/reports/companies/<id>/exit-readiness` - Exit readiness report
- `GET /api/reports/companies/<id>/investor-questions` - Investor questions report
- `GET /api/reports/companies/<id>/strategy-summary` - Strategy summary

## Key Components

### Database Models
- **User** - User accounts with authentication
- **Company** - Multi-tenant company profiles
- **Document** - Uploaded documents
- **Decision** - Extracted strategic decisions
- **Risk** - Identified risks
- **Analysis** - AI analysis results

### Services
- **DocumentProcessor** - Extract text from PDF, DOCX, TXT
- **AIAnalysis** - LLM-powered document analysis
- **ReportGenerator** - Generate exit readiness and investor reports

### Frontend
- **Authentication** - Login/register with JWT
- **Dashboard** - Manage companies
- **CompanyDashboard** - Upload and analyze documents
- **Reports** - View exit readiness and investor question reports

## Technology Stack

### Backend
- Flask (Python web framework)
- SQLAlchemy (ORM)
- OpenAI API (LLM for analysis)
- JWT authentication

### Frontend
- React 18
- React Router
- Axios (HTTP client)
- Tailwind CSS
- Zustand (state management)

## MVP Features Implemented

✓ Multi-tenant architecture
✓ User registration and authentication
✓ Company management
✓ Document upload (PDF, DOCX, TXT)
✓ Text extraction from documents
✓ AI-powered analysis with fallback
✓ Decision and risk extraction
✓ Strategic sparring questions
✓ Exit readiness reporting
✓ Investor questions reporting
✓ Responsive web UI

## Next Steps for Production

1. **LLM Integration**: Full OpenAI API integration
2. **Google Drive Connector**: Connect to Google Drive for document access
3. **More Connectors**: Notion, SharePoint, Dropbox integration
4. **Team Collaboration**: Real-time collaboration features
5. **Advanced Analytics**: More sophisticated governance metrics
6. **Payment**: Stripe integration for SaaS model
7. **Security**: Enhanced security, compliance, data encryption
8. **Notifications**: Email and in-app notifications
9. **Export**: PDF, CSV export capabilities
10. **Mobile**: Mobile app for iOS/Android

## Development Notes

- The MVP uses a SQLite database (easily upgradeable to PostgreSQL)
- Document analysis includes a fallback mode when OpenAI API is not available
- The system is designed for easy scaling to multi-cloud deployment
- All sensitive data is encrypted in transit and at rest

## License

MIT License - See LICENSE file for details
