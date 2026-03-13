import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.routers import queries, analytics, alerts, sources, content, audience, ethics, improvement, factcheck, scan, monitoring, hde, keys, webhooks
from app.services.scheduler import start_scheduler, stop_scheduler
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start automated monitoring on boot, stop on shutdown."""
    start_scheduler()
    yield
    stop_scheduler()


docs_url = "/docs" if os.environ.get("ENV") != "production" else None
app = FastAPI(
    title="T3 Sentinel API",
    docs_url=docs_url,
    redoc_url=None,
    openapi_url="/openapi.json" if os.environ.get("ENV") != "production" else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://t3tx.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)

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

# API key management
app.include_router(keys.router, prefix="/api/keys", tags=["API Keys"])

# Webhook notification system
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])


@app.get("/", tags=["System"])
def root():
    return {"status": "ok", "service": "T3 Sentinel API"}


@app.get("/api/brands", tags=["Brands"])
def get_brands():
    from app.database import get_supabase
    sb = get_supabase()
    result = sb.table("brands").select("*").execute()
    return result.data
