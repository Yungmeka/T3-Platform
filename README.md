# T3 -- Track. Trust. Transform.

**AI Brand Visibility & Trust Platform**
Lane College | HBCU Battle of the Brains 2026

```
  ╔══════════════════════════════════════════════════════════════════════╗
  ║                                                                    ║
  ║       ████████╗ ██████╗                                            ║
  ║          ██╔══╝      ██╗                                           ║
  ║          ██║    ██████╔╝                                           ║
  ║          ██║         ██╗                                           ║
  ║          ██║    ██████╔╝                                           ║
  ║          ╚═╝    ╚═════╝                                            ║
  ║                                                                    ║
  ║    Track what AI says about your brand.                            ║
  ║    Trust the data with verification.                               ║
  ║    Transform your AI presence.                                     ║
  ║                                                                    ║
  ╚══════════════════════════════════════════════════════════════════════╝
```

---

## Why This Matters

AI-powered shopping is exploding -- and so is the misinformation inside it.

| The Problem                                         | The Scale         |
|-----------------------------------------------------|-------------------|
| Consumers who encountered AI-generated misinformation | **64%**          |
| Consumers who made purchases based on AI misinformation | **43%**        |
| Estimated annual losses from AI-driven misinformation | **$67.4 Billion** |

When a customer asks ChatGPT _"What's the best laptop for video editing?"_ and it hallucmates specs, invents features, or omits your brand entirely -- **you lose revenue and trust without ever knowing it happened.**

T3 is the first platform that **monitors, verifies, and corrects** how brands appear across AI assistants in real time.

---

## Architecture: The Track - Trust - Transform Loop

```
                    ┌─────────────────────────────────────┐
                    │          CONSUMER QUERIES            │
                    │   "Best laptop for video editing?"   │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
              ┌────────────────────────────────────────────┐
              │              T R A C K                     │
              │                                            │
              │  ┌──────────────┐   ┌───────────────────┐  │
              │  │ Query Engine │──▶│ Response Parser   │  │
              │  └──────────────┘   └───────────────────┘  │
              │         │                    │              │
              │         ▼                    ▼              │
              │  ┌──────────────┐   ┌───────────────────┐  │
              │  │   Scan       │   │  Source            │  │
              │  │ Orchestrator │   │  Intelligence      │  │
              │  └──────────────┘   └───────────────────┘  │
              └────────────────┬───────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────────────────┐
              │              T R U S T                     │
              │                                            │
              │  ┌──────────────────┐  ┌────────────────┐  │
              │  │  Hallucination   │  │   Anomaly      │  │
              │  │  Detector        │  │   Detector     │  │
              │  └──────────────────┘  └────────────────┘  │
              │         │                    │              │
              │         ▼                    ▼              │
              │  ┌──────────────────┐  ┌────────────────┐  │
              │  │  Content         │  │   Ethics       │  │
              │  │  Validator       │  │   Monitor      │  │
              │  └──────────────────┘  └────────────────┘  │
              │         │                                  │
              │         ▼                                  │
              │  ┌──────────────────┐                      │
              │  │  Consumer        │                      │
              │  │  Fact-Checker    │                      │
              │  └──────────────────┘                      │
              └────────────────┬───────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────────────────┐
              │          T R A N S F O R M                 │
              │                                            │
              │  ┌──────────────────┐  ┌────────────────┐  │
              │  │  Content         │  │  Audience      │  │
              │  │  Generator       │  │  Targeting     │  │
              │  └──────────────────┘  └────────────────┘  │
              │         │                    │              │
              │         ▼                    ▼              │
              │  ┌──────────────────────────────────────┐  │
              │  │       Improvement Tracker            │  │
              │  └──────────────────────────────────────┘  │
              └────────────────┬───────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Optimized Brand     │
                    │  AI Presence         │
                    │  ───────────────     │
                    │  + Higher visibility │
                    │  + Accurate claims   │
                    │  + Better trust      │
                    └──────────────────────┘
```

---

## The 12 Engines

| #  | Engine                 | What It Does                                                        |
|----|------------------------|---------------------------------------------------------------------|
| 1  | **Query Engine**       | Sends brand queries to ChatGPT, Gemini, Perplexity and captures raw AI responses |
| 2  | **Response Parser**    | Extracts individual claims, facts, and recommendations from AI output |
| 3  | **Hallucination Detector** | Compares AI claims against verified ground truth data to flag inaccuracies |
| 4  | **Anomaly Detector**   | Identifies sudden drops in visibility, accuracy spikes, or unusual AI behavior |
| 5  | **Source Intelligence** | Traces which data sources AI platforms are pulling brand information from |
| 6  | **Content Generator**  | Creates AI-optimized brand content designed to improve AI representation |
| 7  | **Content Validator**  | Verifies generated content for factual accuracy before deployment |
| 8  | **Audience Targeting** | Analyzes which consumer segments are asking AI about your brand and products |
| 9  | **Ethics Monitor**     | Flags bias, fairness concerns, and ethical issues in AI brand representations |
| 10 | **Improvement Tracker** | Measures how brand trust scores and AI accuracy change over time |
| 11 | **Consumer Fact-Checker** | Lets end consumers verify AI shopping claims against ground truth |
| 12 | **Scan Orchestrator**  | Coordinates all engines into a unified scan pipeline across multiple AI platforms |

---

## Demo Walkthrough (For Judges)

> Follow these steps to see T3 in action in under 5 minutes.

### Step 1: Launch the app
```bash
chmod +x run.sh && ./run.sh
```
Open **http://localhost:5173** in your browser.

### Step 2: Explore the Dashboard
The dashboard loads with pre-seeded data for **7 sponsor companies** (Dell, eBay, NFL, Home Depot, Cisco, Thrivent, HEB). You will see:
- **Brand Trust Score** -- composite metric across all AI platforms
- **AI Inclusion Rate** -- how often AI mentions the brand
- **Accuracy Score** -- percentage of correct claims
- **Hallucination Rate** -- percentage of fabricated or wrong claims
- Trend charts showing 30 days of analytics history

### Step 3: View Alerts
Navigate to **Alerts** to see detected issues:
- Hallucination alerts with side-by-side ground truth comparison
- Anomaly alerts for sudden visibility or accuracy changes
- Resolve/acknowledge workflow for alert management

### Step 4: Inspect Claims
Open **Claims** to see every extracted AI claim classified as:
- Accurate / Hallucinated / Outdated / Missing
- Filter by status, platform, or claim type

### Step 5: Run a Live Query
Go to **Live Query**, pick a brand and a question like _"What are the best Dell laptops for students?"_
- Watch T3 query AI platforms in real time
- See claims extracted and hallucinations flagged instantly

### Step 6: Generate Optimized Content
Open **Content Generator** to create AI-optimized brand content that corrects misinformation.

### Step 7: Explore Sources, Audience, Ethics, and Fact-Checker
- **Sources** -- see where AI platforms pull brand data from
- **Audience** -- understand which consumer segments ask about the brand
- **Ethics** -- review bias and fairness flags
- **Fact-Checker** -- verify any AI shopping claim against ground truth

---

## 9 Frontend Pages

| Page                  | Description                                                         |
|-----------------------|---------------------------------------------------------------------|
| **Dashboard**         | KPI cards, trend charts, brand overview with 30-day analytics       |
| **Alerts**            | Real-time alerts for hallucinations, anomalies, and data conflicts  |
| **Claims**            | Every AI-generated claim extracted, classified, and compared        |
| **Live Query**        | Run real-time queries against AI platforms with instant analysis     |
| **Content Generator** | Generate AI-optimized content to correct brand misinformation       |
| **Sources**           | Trace and audit the data sources AI uses for brand information      |
| **Audience**          | Consumer segment analysis for AI-driven brand queries               |
| **Ethics**            | Bias detection, fairness monitoring, and ethical compliance flags    |
| **Fact Checker**      | Consumer-facing tool to verify AI shopping claims against truth     |

---

## Screenshots

### Dashboard
<!-- Replace with actual screenshot -->
![Dashboard](frontend/src/assets/dashboard-screenshot.png)
> _Brand trust scores, AI inclusion rates, accuracy metrics, and 30-day trend charts for all sponsor brands._

### Live Query
<!-- Replace with actual screenshot -->
![Live Query](frontend/src/assets/livequery-screenshot.png)
> _Real-time AI query execution with instant claim extraction and hallucination detection._

---

## Tech Stack

| Layer      | Technology                           |
|------------|--------------------------------------|
| Frontend   | React + Vite + Tailwind CSS + Recharts |
| Backend    | Python FastAPI                       |
| Database   | Supabase (PostgreSQL)                |
| AI         | Claude API (claim parsing) + OpenAI API (live queries) |

---

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

### How to Tell If the App Started Successfully

```
============================================
  T3 is running!
  Frontend: http://localhost:5173
  Backend:  http://localhost:8000
  API Docs: http://localhost:8000/docs
============================================
```

Visit `http://localhost:5173` to see the dashboard. The app loads pre-seeded data for 7 sponsor companies (Dell, eBay, NFL, Home Depot, Cisco, Thrivent, HEB) with 30 days of analytics history, real AI response examples, and detected hallucinations.

---

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
| `GET /api/sources/{brand_id}` | Source intelligence data |
| `POST /api/content/generate` | Generate optimized content |
| `GET /api/audience/{brand_id}` | Audience targeting data |
| `GET /api/ethics/{brand_id}` | Ethics monitoring flags |
| `GET /api/improvement/{brand_id}` | Improvement tracking |
| `POST /api/factcheck/verify` | Consumer fact-check a claim |
| `POST /api/scan/{brand_id}` | Run full orchestrated scan |

---

## Environment Variables (Optional)

```
OPENAI_API_KEY=sk-...      # For live ChatGPT queries
ANTHROPIC_API_KEY=sk-...   # For Claude-powered claim parsing
```

Without API keys, the system uses simulated responses with pre-built hallucination scenarios for demo purposes.

---

## Project Structure

```
T3/
├── backend/
│   ├── app/
│   │   ├── main.py                          # FastAPI application
│   │   ├── database.py                      # Supabase connection
│   │   ├── routers/
│   │   │   ├── analytics.py                 # Analytics endpoints
│   │   │   ├── alerts.py                    # Alerts endpoints
│   │   │   ├── queries.py                   # Query + claims endpoints
│   │   │   ├── sources.py                   # Source intelligence endpoints
│   │   │   ├── content.py                   # Content generation endpoints
│   │   │   ├── audience.py                  # Audience targeting endpoints
│   │   │   ├── ethics.py                    # Ethics monitoring endpoints
│   │   │   ├── improvement.py               # Improvement tracking endpoints
│   │   │   ├── factcheck.py                 # Consumer fact-check endpoints
│   │   │   └── scan.py                      # Scan orchestrator endpoints
│   │   └── services/
│   │       ├── query_engine.py              # AI platform querying
│   │       ├── parser.py                    # Response claim extraction
│   │       ├── hallucination.py             # Ground truth comparison
│   │       ├── anomaly.py                   # Anomaly detection
│   │       ├── source_intelligence.py       # Source tracing
│   │       ├── content_generator.py         # AI-optimized content creation
│   │       ├── audience_targeting.py        # Consumer segment analysis
│   │       ├── ethics_monitor.py            # Bias & fairness detection
│   │       ├── improvement_tracker.py       # Score tracking over time
│   │       ├── consumer_factcheck.py        # Claim verification
│   │       └── orchestrator.py              # Multi-engine scan pipeline
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx                          # Main app with routing
│       ├── supabase.js                      # Supabase client config
│       └── components/
│           ├── Sidebar.jsx                  # Navigation sidebar
│           ├── Dashboard.jsx                # KPI cards + trend charts
│           ├── Alerts.jsx                   # Alert management
│           ├── Claims.jsx                   # Claim viewer + filters
│           ├── LiveQuery.jsx                # Real-time AI querying
│           ├── ContentGenerator.jsx         # Content creation UI
│           ├── Sources.jsx                  # Source intelligence UI
│           ├── Audience.jsx                 # Audience targeting UI
│           ├── Ethics.jsx                   # Ethics monitoring UI
│           └── FactChecker.jsx              # Consumer fact-check UI
├── run.sh
└── README.md
```

---

<p align="center">
  <b>T3 -- Track. Trust. Transform.</b><br>
  Built by Lane College for HBCU Battle of the Brains 2026
</p>
