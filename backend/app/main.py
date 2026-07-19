from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.audit_notes import review_router as audit_note_review_router
from app.api.audit_notes import router as audit_notes_router
from app.api.auth import router as auth_router
from app.api.cases import router as cases_router
from app.api.policies import router as policies_router
from app.api.rule_engine import router as rule_engine_router
from app.api.transactions import router as transactions_router
from app.core.config import settings
from app.core.logging import get_logger, setup_logging
from app.db.session import engine
from app.middleware.exception_handler import register_exception_handlers
from app.middleware.logging_middleware import RequestLoggingMiddleware

setup_logging()
logger = get_logger("app.main")

app = FastAPI(title=settings.app_name, debug=settings.debug)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_middleware(RequestLoggingMiddleware)
register_exception_handlers(app)

app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(transactions_router, prefix=settings.api_v1_prefix)
app.include_router(rule_engine_router, prefix=settings.api_v1_prefix)
app.include_router(policies_router, prefix=settings.api_v1_prefix)
app.include_router(audit_notes_router, prefix=settings.api_v1_prefix)
app.include_router(audit_note_review_router, prefix=settings.api_v1_prefix)
app.include_router(cases_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health_check() -> dict:
    db_status = "ok"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        logger.exception("database health check failed")
        db_status = "unreachable"

    return {
        "status": "ok",
        "app_name": settings.app_name,
        "environment": settings.app_env,
        "database": db_status,
    }


@app.on_event("startup")
def on_startup() -> None:
    logger.info("application startup", extra={"environment": settings.app_env})
