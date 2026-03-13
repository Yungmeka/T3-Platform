from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import queries, analytics, alerts, sources, content, audience, ethics, improvement, factcheck, scan, monitoring, hde
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start automated monitoring on boot, stop on shutdown."""
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(
    title="T3 - Track. Trust. Transform.",
    description="AI Brand Visibility & Trust Platform — Lane College HBCU BOTB 2026",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core monitoring
app.include_router(queries.router, prefix="/api/queries", tags=["Pillar 1: TRACK — Queries & Claims"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Pillar 3: TRANSFORM — Analytics"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Pillar 1: TRACK — Alerts & Anomalies"])

# Source intelligence
app.include_router(sources.router, prefix="/api/sources", tags=["Pillar 1: TRACK — Source Intelligence"])

# Content generation & validation
app.include_router(content.router, prefix="/api/content", tags=["Pillar 2: TRUST — Content Generation"])

# Audience targeting
app.include_router(audience.router, prefix="/api/audience", tags=["Audience Targeting"])

# Ethics monitoring
app.include_router(ethics.router, prefix="/api/ethics", tags=["Ethics Monitoring"])

# Improvement tracking
app.include_router(improvement.router, prefix="/api/improvement", tags=["Improvement Tracking"])

# Consumer fact-checker
app.include_router(factcheck.router, prefix="/api/factcheck", tags=["Consumer Fact-Checker"])

# Full scan orchestrator
app.include_router(scan.router, prefix="/api/scan", tags=["Full Scan Orchestrator"])

# Automated monitoring
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Automated Monitoring"])

# HDE — Hallucination Detection Engine (embeddable API)
app.include_router(hde.router, prefix="/api/hde", tags=["HDE — Hallucination Detection Engine"])


@app.get("/", tags=["System"])
def root():
    return {
        "name": "T3 - Track. Trust. Transform.",
        "description": "AI Brand Visibility & Trust Platform",
        "team": "Lane College",
        "competition": "HBCU Battle of the Brains 2026",
        "status": "running",
        "engines": {
            "query_engine": "Multi-platform AI query system (ChatGPT, Gemini, Perplexity, Copilot)",
            "parser": "AI response claim extraction (Claude-powered + regex fallback)",
            "hallucination_detector": "Ground truth comparison engine",
            "source_intelligence": "AI source identification and tracking",
            "content_generator": "Optimized content + schema.org generation",
            "content_validator": "3-step verification process",
            "audience_targeting": "Query-to-audience segment mapping",
            "ethics_monitor": "Hallucination tracking, actions, trust measurement",
            "improvement_tracker": "Before/after impact measurement + ROI",
            "consumer_factchecker": "Consumer-facing AI recommendation verification",
            "anomaly_detector": "Visibility drop and data anomaly detection",
            "orchestrator": "Full-scan pipeline across all platforms",
            "automated_scheduler": "APScheduler-powered daily/hourly automated monitoring",
            "hde": "Embeddable Hallucination Detection Engine — real-time fact-guard API",
        },
    }


@app.get("/api/brands", tags=["Brands"])
def get_brands():
    from app.database import get_supabase
    sb = get_supabase()
    result = sb.table("brands").select("*").execute()
    return result.data
