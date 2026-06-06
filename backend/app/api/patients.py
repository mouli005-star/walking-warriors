from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import Patient, BloodFamily, Donor, CascadeRun, EventLog
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json

router = APIRouter(prefix="/patients", tags=["patients"])

class PatientCreate(BaseModel):
    name: str
    guardian_name: str
    phone: str                          # Guardian WhatsApp
    age: int
    gender: str
    blood_group: str                    # patient's own blood group
    required_blood_group: str           # blood group needed for transfusion
    quantity_required: float            # units per transfusion
    hospital_name: str
    city_label: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_transfusion_date: Optional[datetime] = None
    frequency_in_days: int = 21
    expected_next_transfusion_date: Optional[datetime] = None
    consent: bool

# ── GET ALL PATIENTS ─────────────────────────────────────────────────────
@router.get("/")
def get_patients(
    skip: int = 0,
    limit: int = 50,
    blood_group: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Patient)
    if blood_group:
        query = query.filter(Patient.blood_group == blood_group)
    patients = query.offset(skip).limit(limit).all()

    result = []
    for p in patients:
        family_count = db.query(func.count(BloodFamily.id))\
            .filter(BloodFamily.patient_id == p.id).scalar()
        active_cascades = db.query(func.count(CascadeRun.id))\
            .filter(
                CascadeRun.patient_id == p.id,
                CascadeRun.status == 'ACTIVE'
            ).scalar()
        result.append({
            "id":                             p.id,
            "blood_group":                    p.blood_group,
            "required_blood_group":           p.required_blood_group,
            "gender":                         p.gender,
            "latitude":                       p.latitude,
            "longitude":                      p.longitude,
            "quantity_required":              p.quantity_required,
            "last_transfusion_date":          p.last_transfusion_date,
            "expected_next_transfusion_date": p.expected_next_transfusion_date,
            "frequency_in_days":              p.frequency_in_days,
            "city_cluster":                   p.city_cluster,
            "status":                         p.status,
            "blood_family_count":             family_count,
            "active_cascades":                active_cascades,
        })
    return result

# ── GET SINGLE PATIENT ───────────────────────────────────────────────────
@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

# ── GET PATIENT BLOOD FAMILY ─────────────────────────────────────────────
@router.get("/{patient_id}/blood-family")
def get_blood_family(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    families = db.query(BloodFamily)\
        .filter(BloodFamily.patient_id == patient_id)\
        .all()

    result = []
    for bf in families:
        donor = db.query(Donor).filter(Donor.id == bf.donor_id).first()
        if donor:
            result.append({
                "blood_family_id":          bf.id,
                "donor_id":                 donor.id,
                "donor_blood_group":        donor.blood_group,
                "donor_role":               donor.role,
                "base_rfmt_score":          donor.base_rfmt_score,
                "eligibility_status":       donor.eligibility_status,
                "active_status":            donor.active_status,
                "churn_risk":               donor.churn_risk,
                "last_donation_date":       donor.last_donation_date,
                "bridge_active":            bf.bridge_active,
                "last_bridge_donation":     bf.last_bridge_donation_date,
            })

    return {
        "patient_id":    patient_id,
        "blood_group":   patient.blood_group,
        "family_size":   len(result),
        "blood_family":  result
    }

# ── GET PATIENT CASCADE HISTORY ──────────────────────────────────────────
@router.get("/{patient_id}/cascades")
def get_patient_cascades(patient_id: str, db: Session = Depends(get_db)):
    cascades = db.query(CascadeRun)\
        .filter(CascadeRun.patient_id == patient_id)\
        .order_by(CascadeRun.triggered_at.desc())\
        .all()
    return cascades


# ── REGISTER PATIENT (POST) ─────────────────────────────────────────────
@router.post("/register")
def register_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    import uuid

    if not patient.consent:
        raise HTTPException(status_code=400, detail="Consent is required")
    if not patient.phone.isdigit() or len(patient.phone) != 10:
        raise HTTPException(status_code=400, detail="Valid 10-digit WhatsApp number required")

    existing_phone = db.query(Patient).filter(Patient.phone == patient.phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Account already exists. Please login.")

    existing_donor = db.query(Donor).filter(Donor.phone == patient.phone).first()
    if existing_donor:
        raise HTTPException(status_code=400, detail="Account already exists. Please login.")

    next_transfusion = patient.expected_next_transfusion_date
    if not next_transfusion and patient.last_transfusion_date:
        from datetime import timedelta
        next_transfusion = patient.last_transfusion_date + timedelta(days=patient.frequency_in_days)

    new_patient = Patient(
        id=str(uuid.uuid4()).replace('-', ''),
        name=patient.name,
        guardian_name=patient.guardian_name,
        phone=patient.phone,
        age=patient.age,
        gender=patient.gender,
        blood_group=patient.blood_group,
        required_blood_group=patient.required_blood_group,
        quantity_required=patient.quantity_required,
        hospital_name=patient.hospital_name,
        latitude=patient.latitude,
        longitude=patient.longitude,
        has_location=bool(patient.latitude and patient.longitude),
        last_transfusion_date=patient.last_transfusion_date,
        expected_next_transfusion_date=next_transfusion,
        frequency_in_days=patient.frequency_in_days,
        registration_date=datetime.now(),
        status='active'
    )
    db.add(new_patient)

    db.add(EventLog(
        event_type='PATIENT_REGISTERED',
        entity_type='patient',
        entity_id=new_patient.id,
        payload=json.dumps({
            'name': patient.name,
            'guardian': patient.guardian_name,
            'phone': patient.phone,
            'blood_group': patient.blood_group,
            'required_blood_group': patient.required_blood_group,
            'hospital': patient.hospital_name,
            'next_transfusion': str(next_transfusion),
            'registered_at': datetime.now().isoformat()
        })
    ))
    db.commit()
    db.refresh(new_patient)

    return {
        "message":            "Patient registered successfully",
        "patient_id":         new_patient.id,
        "name":               patient.name,
        "next_transfusion":   str(next_transfusion),
        "whatsapp":           patient.phone,
        "next_step":          "Blood family will be assigned within 24 hours"
    }
