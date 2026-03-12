# T3 — Track. Trust. Transform.

**AI Brand Visibility & Trust Platform**
Lane College | HBCU Battle of the Brains 2026

## What T3 Does

T3 is a platform that helps companies monitor, verify, and improve how their products and brand appear in AI-assisted shopping. When customers ask AI assistants like ChatGPT, Gemini, or Perplexity for shopping recommendations, T3 tracks whether your brand shows up, whether the information is accurate, and what you can do to fix it.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **Backend**: Python FastAPI
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API for response parsing, OpenAI API for live queries

## How to Run

```bash
chmod +x run.sh
./run.sh
```

This will:
1. Install backend Python dependencies
2. Install frontend npm packages
3. Start the backend API on `http://localhost:8000`
4. Start the frontend on `http://localhost:5173`

### Manual Start

**Backend:**
```bash
cd backend
pip3 install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## How to Tell If the App Started Successfully

```
============================================
  T3 is running!
  Frontend: http://localhost:5173
  Backend:  http://localhost:8000
  API Docs: http://localhost:8000/docs
============================================
```

Visit `http://localhost:5173` to see the dashboard. The app loads pre-seeded data for 7 sponsor companies (Dell, eBay, NFL, Home Depot, Cisco, Thrivent, HEB) with 30 days of analytics history, real AI response examples, and detected hallucinations.

## Features

### Dashboard
- Brand Trust Score, AI Inclusion Rate, Accuracy Score, Hallucination Rate
- Trend charts showing improvement over time
- Daily query volume tracking

### Alerts
- Data validation alerts when AI responses conflict with verified product data
- Anomaly detection for sudden visibility drops or accuracy changes
- Hallucination alerts with ground truth comparison
- Resolve/acknowledge workflow

### Claims Viewer
- Every AI-generated claim extracted and classified
- Status: Accurate, Hallucinated, Outdated, or Missing
- Side-by-side comparison with ground truth data
- Filter by status, platform, claim type

### Live Query
- Run real-time queries against AI platforms
- Automatic claim extraction and hallucination detection
- See exactly what AI says about your brand right now

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/brands` | List all monitored brands |
| `GET /api/analytics/overview` | All brands summary |
| `GET /api/analytics/snapshots/{brand_id}` | Historical analytics |
| `GET /api/analytics/summary/{brand_id}` | Brand detail summary |
| `GET /api/alerts/` | List alerts (filterable) |
| `PATCH /api/alerts/{id}/resolve` | Resolve an alert |
| `GET /api/queries/claims` | List extracted claims |
| `POST /api/queries/run` | Run a live AI query |

## Environment Variables (Optional)

```
OPENAI_API_KEY=sk-...      # For live ChatGPT queries
ANTHROPIC_API_KEY=sk-...   # For Claude-powered claim parsing
```

Without API keys, the system uses simulated responses with pre-built hallucination scenarios for demo purposes.

## Project Structure

```
T3/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── database.py          # Supabase connection
│   │   ├── routers/
│   │   │   ├── analytics.py     # Analytics endpoints
│   │   │   ├── alerts.py        # Alerts endpoints
│   │   │   └── queries.py       # Query + claims endpoints
│   │   └── services/
│   │       ├── query_engine.py  # AI platform querying
│   │       ├── parser.py        # Response claim extraction
│   │       ├── hallucination.py # Ground truth comparison
│   │       └── anomaly.py       # Anomaly detection
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── supabase.js
│       └── components/
│           ├── Sidebar.jsx
│           ├── Dashboard.jsx
│           ├── Alerts.jsx
│           ├── Claims.jsx
│           └── LiveQuery.jsx
├── run.sh
└── README.md
```
