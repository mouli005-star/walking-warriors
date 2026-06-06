from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.core.database import create_tables
from app.api import patients, donors, auth, cascade

app = FastAPI(
    title="BloodBridge API",
    description="Agentic AI blood coordination platform for Thalassemia patients",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-amplify-url.amplifyapp.com",
        "https://video2blogger.tech",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def check_upcoming_transfusions():
    """Runs every hour - triggers cascades 10 days before transfusion."""
    db = SessionLocal()
    try:
        from app.models.models import Patient, CascadeRun
        from app.services.cascade_engine import trigger_cascade

        target_date = datetime.now() + timedelta(days=10)
        window_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        window_end = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        patients = db.query(Patient).filter(
            Patient.expected_next_transfusion_date.between(window_start, window_end),
            Patient.status == 'active'
        ).all()

        for patient in patients:
            existing = db.query(CascadeRun).filter(
                CascadeRun.patient_id == patient.id,
                CascadeRun.status.in_(["ACTIVE", "PENDING"])
            ).first()
            if not existing:
                trigger_cascade(patient.id, patient.expected_next_transfusion_date, db)
                print(f"Auto-triggered cascade for patient {patient.id}")
    finally:
        db.close()


def check_cascade_advances():
    """Runs every 2 hours - advances stalled cascades."""
    db = SessionLocal()
    try:
        from app.models.models import CascadeRun
        from app.services.cascade_engine import advance_cascade

        active = db.query(CascadeRun).filter(
            CascadeRun.status == "ACTIVE"
        ).all()
        for cascade in active:
            advance_cascade(cascade.id, db)
    finally:
        db.close()


def recompute_city_scarcity():
    db = SessionLocal()
    try:
        from app.models.models import Donor, CityScarcity
        from sqlalchemy import func, text

        db.execute(text("DELETE FROM city_scarcity"))

        results = db.query(
            Donor.city_cluster,
            Donor.blood_group,
            func.count(Donor.id).label('count')
        ).filter(
            Donor.eligibility_status == 'eligible',
            Donor.active_status == 'Active',
            Donor.city_cluster.isnot(None)
        ).group_by(Donor.city_cluster, Donor.blood_group).all()

        for r in results:
            warning = 'CRITICAL' if r.count < 5 else 'WARNING' if r.count < 10 else 'OK'
            db.add(CityScarcity(
                city_cluster=r.city_cluster,
                blood_group=r.blood_group,
                eligible_donor_count=r.count,
                warning_level=warning
            ))
        db.commit()
        print("City scarcity recomputed")
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(check_upcoming_transfusions, 'interval', hours=1)
scheduler.add_job(check_cascade_advances, 'interval', hours=2)
scheduler.add_job(recompute_city_scarcity, 'interval', hours=6)

@app.on_event("startup")
async def startup():
    create_tables()
    scheduler.start()
    print("✓ BloodBridge API started with scheduler")

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(donors.router)
app.include_router(cascade.router)

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
