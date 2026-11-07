"""AGROTRACK AI - API.  Arranque:  uvicorn backend.main:app --reload"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .database import init_db
from .routes import analytics, dashboard, videos
from .services import repository

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    n = repository.fail_interrupted()
    if n:
        logging.getLogger("agrotrack").warning("%s video(s) interrumpidos marcados como 'failed'", n)
    yield


app = FastAPI(title="AGROTRACK AI", description="Livestock Operations Intelligence", version="0.1.0",
              lifespan=lifespan)
app.include_router(videos.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}
