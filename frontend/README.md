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
