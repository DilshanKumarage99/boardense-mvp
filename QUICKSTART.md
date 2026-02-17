# Quick Start Guide for Boardense MVP

## What is Boardense?

Boardense turns data into board sense. It's a lightweight Strategic Board Intelligence system for early-stage startups that want to:
- Document strategic decisions systematically
- Identify and track risks
- Prepare for investor due diligence
- Get board-level feedback without expensive consultants

## Quick Start (5 minutes)

### Prerequisites
- Python 3.8+ and Node.js 16+
- A terminal (PowerShell, bash, etc.)

### 1. Start the Backend

```bash
# Open terminal in boardense-mvp\backend
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the server
python run.py
```

**Expected output:** Backend running on http://localhost:5000 ✓

### 2. Start the Frontend

```bash
# Open new terminal in boardense-mvp\frontend
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm start
```

**Expected output:** Frontend opens at http://localhost:3000 ✓

### 3. Use Boardense

1. **Register** - Create a new account at http://localhost:3000
2. **Add Company** - Create your first company
3. **Upload Document** - Upload a board deck or strategy document (PDF, DOCX, or TXT)
4. **View Analysis** - See extracted decisions, risks, and strategic blind spots
5. **Generate Reports** - Get exit-readiness snapshot and investor questions

## Project Overview

```
Boardense MVP
├── Backend (Flask + SQLAlchemy)
│   └── REST API for documents, analysis, and reports
├── Frontend (React)
│   └── Web interface for upload and viewing
└── Database (SQLite for MVP)
    └── Multi-tenant structure ready for scale
```

## Core Features

### 📤 Document Upload
- Upload board decks, strategy docs, OKRs, decision notes
- Supports PDF, DOCX, TXT formats
- Automatic text extraction

### 🤖 AI Analysis  
- Extracts key strategic decisions
- Identifies risks and opportunities
- Finds strategic blind spots
- Generates board-level probing questions

### 📊 Exit Readiness Report
- Governance maturity assessment
- Readiness score (0-100)
- Due diligence gaps identified
- Actionable recommendations

### 💡 Investor Questions
- Likely questions from acquirers
- Strategic, financial, and operational angles
- Exit positioning talking points

## API Endpoints (for testing)

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### Documents
```
POST   /api/documents/companies/<id>/upload
GET    /api/documents/companies/<id>/list
GET    /api/documents/<id>
```

### Analysis
```
POST   /api/analysis/document/<id>/analyze
GET    /api/analysis/companies/<id>/all-analyses
GET    /api/analysis/<id>
```

### Reports
```
GET    /api/reports/companies/<id>/exit-readiness
GET    /api/reports/companies/<id>/investor-questions
GET    /api/reports/companies/<id>/strategy-summary
```

## Environment Setup

### Backend Config (backend/.env)
```
FLASK_ENV=development
JWT_SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///boardense.db
OPENAI_API_KEY=sk-your-key-here  # Optional
```

### Optional: OpenAI Integration
To use LLM-powered analysis (instead of fallback):
1. Get API key from https://openai.com
2. Add to backend/.env: `OPENAI_API_KEY=sk-...`
3. Restart backend

## Database

The MVP uses **SQLite** for simplicity. Data is stored in `backend/boardense.db`.

Key tables:
- `users` - User accounts
- `companies` - Founder companies (multi-tenant)
- `documents` - Uploaded files
- `decisions` - Extracted strategic decisions
- `risks` - Identified risks
- `analyses` - AI analysis results

## File Uploads

Uploaded files are saved to `backend/uploads/` directory.

Supported formats:
- ✅ PDF (.pdf)
- ✅ Word (.docx)
- ✅ Text (.txt)
- ❌ PowerPoint (.pptx) - currently in backlog

## Troubleshooting

### "Port 5000/3000 already in use"
```bash
# Kill process using port 5000 (backend)
# On Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process using port 3000 (frontend)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Backend crashes on startup
- Delete `backend/boardense.db`
- Delete `backend/venv` and reinstall
- Ensure `backend/.env` exists

### Frontend shows "Cannot connect to API"
- Verify backend is running (`http://localhost:5000`)
- Check browser console (F12) for CORS errors
- Verify JWT token in localStorage

### Document upload fails
- Check file size (MVP has no limit, but ~50MB recommended)
- Verify file format is supported (PDF, DOCX, TXT)
- Check `backend/uploads/` folder exists and is writable

## Next Steps

After getting familiar with the MVP:

1. **Add OpenAI API key** for better LLM analysis
2. **Explore the code** - Backend logic is in `backend/app/services/`
3. **Read SETUP.md** for detailed technical documentation
4. **Check README.md** for full feature list and architecture

## Architecture

```
Frontend (React)
     ↓ HTTP/JSON
Backend API (Flask)
     ↓
Database (SQLite)
     ↓
External Services (OpenAI, Google Drive - future)
```

## Support

- 📖 See [SETUP.md](SETUP.md) for detailed setup
- 📚 See [README.md](README.md) for feature overview
- 🔧 Backend code: `backend/app/`
- 🎨 Frontend code: `frontend/src/`

## What's Included

✅ Multi-tenant SaaS architecture  
✅ User authentication with JWT  
✅ Document upload & text extraction  
✅ AI-powered analysis (with fallback)  
✅ Strategic decision tracking  
✅ Risk identification  
✅ Exit readiness reporting  
✅ Investor question generation  
✅ Responsive React UI  
✅ SQLite database  

## What's Next (Roadmap)

🚀 Google Drive connector  
🚀 Notion & Notion integration  
🚀 More AI models (Anthropic, open source)  
🚀 Team collaboration features  
🚀 Real-time document sync  
🚀 Export to PDF/CSV  
🚀 Mobile app  
🚀 Advanced analytics  
🚀 Payment integration  

---

**Ready to turn your data into board sense?** Start by registering and uploading your first document! 🚀
