# T3 — Track. Trust. Transform.

**[www.T3tx.com](https://www.T3tx.com)**

AI Brand Visibility & Trust Platform that tracks how your brand appears across ChatGPT, Gemini, Perplexity, and Copilot — then helps you take action to improve your AI presence.

Built for the **HBCU Battle of the Brains 2026** hackathon by Lane College.

## Tech Stack

- **React 19** + **Vite 8** — fast dev & builds
- **Tailwind CSS 3** — utility-first styling with a violet/pink design system
- **Recharts 3** — data visualization
- **Supabase** — PostgreSQL database, Edge Functions, auth, Vault for secure API key storage
- **OpenAI API** (GPT-4o-mini) — powers ChatGPT & Copilot platform queries
- **Anthropic API** (Claude Sonnet) — powers Gemini & Perplexity queries, content generation, fact checking
- **react-simple-maps** — interactive world map for live query tracking
- **Vercel** — production deployment

## Getting Started

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and expects the backend API at `http://localhost:8000`.

## Architecture

### Auth & Registration Flow

Businesses register their own brand through the app — no pre-loaded brands.

1. **Loading** — spinner while checking session
2. **AuthPage** — sign in or register (no session)
   - Registration requires **Full Name**, **Company / Brand Name**, **Email**, and **Password**
   - On signup, the brand is automatically created in the database and linked to the user
3. **HomePage** — shows only the brands belonging to the logged-in user
4. **Dashboard** — full analytics view after selecting a brand

Each user only sees their own registered brands. Brand colors are generated dynamically from the brand name.

### Pages

| Page | Component | Description |
|------|-----------|-------------|
| Auth | `AuthPage.jsx` | Sign in / register with company name |
| Home | `HomePage.jsx` | User's brand selection grid with trust scores |
| Dashboard | `Dashboard.jsx` | Overview stats, world map, trend charts |
| Visibility Scan | `VisibilityScan.jsx` | Query all 4 AI platforms side-by-side |
| Claims | `Claims.jsx` | Extracted claims with accuracy status |
| Sources | `Sources.jsx` | Content sources AI relies on |
| Content Generator | `ContentGenerator.jsx` | AI-powered content suggestions |
| Fact Checker | `FactChecker.jsx` | Verify claims against ground truth |
| Live Query | `LiveQuery.jsx` | Real-time AI platform querying |
| Ethics | `Ethics.jsx` | Ethics compliance monitoring |
| Alerts | `Alerts.jsx` | Notification center for brand issues |
| Audience | `Audience.jsx` | Audience sentiment analysis |
| HDE | `HDE.jsx` | Hallucination Detection Engine |
| Monitoring | `Monitoring.jsx` | Automated scan scheduling & history |

### Shared Components

- **`Sidebar.jsx`** — Navigation with brand selector, back-to-brands, and sign-out
- **`WorldMap.jsx`** — Animated SVG world map showing live AI query activity

## Design System

- **Primary**: Violet (`#7C3AED`) → Pink (`#EC4899`) gradients
- **Background**: `#F5F7FA`
- **Cards**: White, 20px radius, shadow-only (no borders)
- **Font**: Outfit (headings), system sans-serif (body)
- **Status colors**: Green (accurate), Red (hallucinated), Amber (outdated)

## Build

```bash
npm run build   # production build → dist/
npm run preview # preview production build locally
```

## Contributors

- **Jayblair2004** — Lead Developer
- **Yungmeka** — Developer

## Two Products

### T3 Web Hub (Main Platform)

The web dashboard helps brands monitor and improve their AI visibility across ChatGPT, Gemini, Perplexity, and Copilot.

**What it does:**
- Queries all 4 AI platforms in real-time about your brand
- Extracts and verifies every claim AI makes (prices, features, availability)
- Detects hallucinations by comparing AI responses against your product database
- Generates ready-to-publish content (Schema.org JSON-LD, press releases, Reddit posts, FAQ markup, blogger pitches)
- Tracks visibility score, inclusion rate, and trust score over time
- One-click Full AI Pipeline: scan all platforms → extract claims → generate all content types

### T3 Sentinel (Integration API)

An embeddable API that intercepts AI responses, fact-checks them against ground truth, and returns corrected text.

**Demo:** The HDE (Hallucination Detection Engine) page is Sentinel's live playground — paste any AI text and watch it get verified in real-time.

## Features Implemented

- **Real AI Platform Queries** — OpenAI GPT-4o-mini for ChatGPT/Copilot, Anthropic Claude for Gemini/Perplexity
- **Secure API Keys** — All keys stored in Supabase Vault, accessed via Edge Functions (never exposed in frontend)
- **Content Generation** — 5 content types powered by Claude AI
- **Fact Checking** — Real-time claim analysis with trust scoring
- **Auto Product Discovery** — When adding a brand with a website URL, T3 automatically scrapes and populates products
- **Full Pipeline** — One-click scan + content generation across all platforms and products
- **Live Monitoring** — Run real scans on-demand with full results tracking
- **16 Dashboard Pages** — Complete analytics, monitoring, content creation, and integration tools

## Roadmap

### Completed (v1)

- [x] Multi-platform AI querying (ChatGPT, Gemini, Perplexity, Copilot)
- [x] Claim extraction and hallucination detection
- [x] AI-powered content generation (5 formats)
- [x] Real-time fact checking with trust scores
- [x] Supabase Edge Functions for secure API routing
- [x] Auto product discovery from brand websites
- [x] Full AI Pipeline (one-click end-to-end)
- [x] On-demand monitoring with real scan results

### Next Up (v2)

- [ ] **Scheduled Scans** — Cron-based automated daily/hourly monitoring via Supabase pg_cron
- [ ] **Analytics Trends** — Historical charts showing visibility score, inclusion rate, and trust score over time (data already being collected in analytics_snapshots table)
- [ ] **Alert Notifications** — Email/webhook alerts when hallucinations spike or visibility drops (alert data already generated during scans)
- [ ] **API Key Management** — Full CRUD for Sentinel API keys with rate limiting and usage tracking
- [ ] **Webhook Delivery** — Real webhook endpoint delivery for Sentinel API events
- [ ] **Competitor Tracking** — Dedicated competitor comparison dashboard (competitor data already extracted during scans)
- [ ] **Mobile Responsive** — Collapsible sidebar and mobile-optimized layouts
- [ ] **Export Reports** — PDF/CSV export of scan results and analytics

## System Architecture

```
Frontend (React 19 + Vite)
    ├── src/services/sentinel.js    → Core AI engine (client-side)
    ├── src/components/             → 26 React components
    └── src/supabase.js             → Supabase client

Supabase Backend
    ├── Edge Functions
    │   ├── ai-query                → Routes to OpenAI or Anthropic APIs
    │   ├── generate-content        → Claude-powered content generation
    │   └── fact-check              → Claude-powered claim analysis
    ├── Vault                       → Secure API key storage
    ├── PostgreSQL                  → Brands, products, claims, alerts, analytics
    └── Auth                        → User authentication + brand ownership

Deployment
    ├── Vercel                      → Frontend at www.T3tx.com
    └── Supabase Cloud              → Database + Edge Functions
```
