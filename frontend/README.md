# T3 — Track. Trust. Transform.

**Live App: [www.T3tx.com](https://www.T3tx.com)**

Built for the **HBCU Battle of the Brains 2026** hackathon — Lane College.

---

## What T3 Does

T3 is an **AI Brand Visibility & Trust Platform** that solves a critical emerging problem: brands have no control over how AI systems (ChatGPT, Gemini, Perplexity, Copilot) represent them. T3 provides two products:

### Product 1 — T3 Web Hub (Main Dashboard)

The web dashboard lets brands monitor, verify, and improve how they appear in AI-generated responses.

- **Visibility Scan** — Queries all 4 major AI platforms in real-time about your brand
- **Claim Extraction** — Automatically pulls out every factual claim AI makes (prices, features, availability)
- **Hallucination Detection** — Compares AI responses against your actual product data to catch inaccuracies
- **Content Generation** — Creates 5 types of AI-optimized content (Schema.org JSON-LD, press releases, Reddit posts, FAQ markup, blogger pitches)
- **Full Pipeline** — One-click: scan all platforms → extract claims → fact-check → generate content
- **Analytics Dashboard** — Trust score, inclusion rate, visibility tracking with interactive world map
- **Auto Product Discovery** — Enter a website URL and T3 automatically scrapes and populates your product catalog

### Product 2 — T3 Sentinel (Integration API)

An embeddable API that intercepts AI responses, fact-checks them against ground truth, and returns corrected text. The **HDE (Hallucination Detection Engine)** page is Sentinel's live playground — paste any AI-generated text and watch it get verified in real-time.

---

## Tech Stack / Frameworks

| Layer | Technology |
|-------|-----------|
| Frontend | **React 19** + **Vite 8** |
| Styling | **Tailwind CSS 3** (violet/pink design system) |
| Charts | **Recharts 3** + **react-simple-maps** |
| Database | **Supabase** (PostgreSQL + Row Level Security) |
| Auth | **Supabase Auth** (email/password) |
| API Security | **Supabase Vault** + **Edge Functions** (API keys never exposed to frontend) |
| AI — ChatGPT/Copilot | **OpenAI API** (GPT-4o-mini) |
| AI — Gemini/Perplexity | **Anthropic API** (Claude Sonnet) |
| Deployment | **Vercel** (frontend at www.T3tx.com) + **Supabase Cloud** (backend) |

---

## Demo Walkthrough (For Judges)

The app is **live at [www.T3tx.com](https://www.T3tx.com)** — no local setup needed to evaluate it.

### Step-by-step:

1. **Visit [www.T3tx.com](https://www.T3tx.com)**
2. **Register** — Click "Register", enter your name, a company/brand name, email, and password
3. **Select your brand** — You'll land on the Home page showing your brand card. Click it.
4. **Dashboard** — See the analytics overview with trust score, inclusion rate, and world map
5. **Visibility Scan** (sidebar) — Type a query about your brand and watch T3 query all 4 AI platforms live
6. **Claims** — See extracted claims from AI responses with accuracy status
7. **Content Generator** — Generate AI-optimized content in 5 formats
8. **Fact Checker** — Paste any claim and verify it against your product data
9. **Full AI Pipeline** (sidebar) — One-click to run the entire scan → extract → fact-check → generate pipeline
10. **HDE / T3 Sentinel** (sidebar) — Paste AI-generated text to see hallucination detection in action
11. **Monitoring** — Trigger a real scan and see results with claim counts and hallucination stats

### What to look for:

- **Real AI responses** — Visibility Scan actually calls ChatGPT, Gemini, Perplexity, and Copilot via secure Edge Functions
- **Real claim extraction** — Claims are parsed from live AI responses, not mock data
- **Real content generation** — Content Generator produces actual AI-written content for your brand
- **Secure architecture** — All API keys are in Supabase Vault, accessed only through server-side Edge Functions
- **Mobile responsive** — Try it on your phone — collapsible sidebar, responsive grids

---

## How to Run Locally

### Prerequisites

- Node.js 18+
- npm

### Quick Start

```bash
./run.sh
```

Or manually:

```bash
npm install
npm run dev
```

### Verifying it started successfully

After running, you should see:

```
  VITE v8.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

The app will open at `http://localhost:5173`. You should see the T3 landing page with the purple/pink gradient hero section.

> **Note:** The live version at [www.T3tx.com](https://www.T3tx.com) is the recommended way to evaluate — it connects to the full Supabase backend with real AI platform queries. Running locally still works for the UI but requires Supabase environment variables for full functionality.

---

## Project Structure

```
frontend/
├── public/
│   └── logos/t3-logo.png           → T3 brand logo
├── src/
│   ├── components/                 → 26 React components
│   │   ├── LandingPage.jsx         → Landing page with hero, features, pricing
│   │   ├── AuthPage.jsx            → Sign in / register
│   │   ├── HomePage.jsx            → Brand selection grid
│   │   ├── Dashboard.jsx           → Analytics overview + world map
│   │   ├── VisibilityScan.jsx      → Multi-platform AI querying
│   │   ├── Claims.jsx              → Extracted claims with accuracy
│   │   ├── ContentGenerator.jsx    → AI content generation (5 types)
│   │   ├── FactChecker.jsx         → Claim verification
│   │   ├── FullPipeline.jsx        → One-click end-to-end pipeline
│   │   ├── HDE.jsx                 → Hallucination Detection Engine (Sentinel demo)
│   │   ├── LiveQuery.jsx           → Real-time AI platform querying
│   │   ├── Monitoring.jsx          → Scan scheduling & history
│   │   ├── Sidebar.jsx             → Navigation + brand selector
│   │   └── ...                     → Alerts, Sources, Audience, Ethics, Integrations, API Keys, Webhooks
│   ├── services/
│   │   └── sentinel.js             → Core AI engine (claim extraction, verification, web scraping)
│   ├── supabase.js                 → Supabase client configuration
│   ├── App.jsx                     → Main app router (auth → home → dashboard)
│   └── index.css                   → Global styles + animations
├── run.sh                          → Build/run script for judges
├── package.json
└── vite.config.js
```

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React 19 + Vite)                         │
│  Deployed on Vercel → www.T3tx.com                  │
│                                                     │
│  src/services/sentinel.js → Core AI engine          │
│  src/components/ → 26 React components              │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────┐
│  Supabase Backend (Cloud)                           │
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │  Edge Functions (Deno)                  │        │
│  │  ├── ai-query → OpenAI / Anthropic APIs │        │
│  │  ├── generate-content → Claude AI       │        │
│  │  └── fact-check → Claude AI             │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐ │
│  │  PostgreSQL   │  │  Vault    │  │  Auth        │ │
│  │  brands       │  │  API keys │  │  users       │ │
│  │  products     │  │  (secure) │  │  sessions    │ │
│  │  claims       │  │           │  │              │ │
│  │  analytics    │  │           │  │              │ │
│  └──────────────┘  └───────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Contributors

- **Yungmeka** — Developer
