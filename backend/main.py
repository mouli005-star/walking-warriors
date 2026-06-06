from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_tables
from app.api import patients, donors, auth

app = FastAPI(
    title="BloodBridge API",
    description="AI-powered blood coordination platform for Thalassemia patients",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    create_tables()
    print("✓ BloodBridge API started")

# ── ROUTERS ──────────────────────────────────────────────────────────────
app.include_router(patients.router)
app.include_router(donors.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {
        "app":     "BloodBridge",
        "status":  "running",
        "version": "1.0.0",
        "docs":    "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
