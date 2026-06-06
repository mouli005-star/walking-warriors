from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import Donor, BloodFamily, EventLog
from typing import Optional
from geopy.distance import geodesic
from pydantic import BaseModel
from datetime import datetime
import json

router = APIRouter(prefix="/donors", tags=["donors"])

# ── PYDANTIC SCHEMAS ─────────────────────────────────────────────────────
class DonorCreate(BaseModel):
    name: str
    phone: str                          # WhatsApp number — 10 digits
    blood_group: str                    # "A Positive", "B Negative" etc
    gender: str
    age: int
    city_label: Optional[str] = None    # human readable — "Hyderabad"
    latitude: Optional[float] = None    # converted by frontend
    longitude: Optional[float] = None   # converted by frontend
    last_donation_date: Optional[datetime] = None
    willing_bridge_donor: Optional[bool] = False
    consent: bool

class DonorUpdate(BaseModel):
    eligibility_status: Optional[str] = None
    active_status: Optional[str] = None
    last_donation_date: Optional[datetime] = None
    next_eligible_date: Optional[datetime] = None

# ── ANALYTICS FIRST — before /{donor_id} to avoid routing conflict ────────
@router.get("/analytics/churn")
def get_churn_summary(db: Session = Depends(get_db)):
    result = {}
    for risk in ['LOW', 'MEDIUM', 'HIGH']:
        count = db.query(func.count(Donor.id))\
            .filter(Donor.churn_risk == risk).scalar()
        result[risk] = count
    total = sum(result.values())
    return {
        "churn_summary":  result,
        "total_donors":   total,
        "high_risk_pct":  round(result['HIGH'] / max(total, 1) * 100, 1),
        "medium_risk_pct":round(result['MEDIUM'] / max(total, 1) * 100, 1),
    }

@router.get("/analytics/by-role")
def get_donors_by_role(db: Session = Depends(get_db)):
    roles = ['Bridge Donor', 'Emergency Donor', 'Guest']
    result = {}
    for role in roles:
        count = db.query(func.count(Donor.id))\
            .filter(Donor.role == role).scalar()
        avg_score = db.query(func.avg(Donor.base_rfmt_score))\
            .filter(Donor.role == role).scalar()
        result[role] = {
            "count":     count,
            "avg_rfmt":  round(float(avg_score or 0), 2)
        }
    return result

@router.get("/analytics/blood-group-coverage")
def get_blood_group_coverage(db: Session = Depends(get_db)):
    groups = db.query(
        Donor.blood_group,
        func.count(Donor.id).label('total'),
        func.sum(
            func.cast(Donor.eligibility_status == 'eligible', db.bind.dialect.name == 'postgresql' and 'integer' or 'integer')
        ).label('eligible')
    ).group_by(Donor.blood_group).all()

    return [
        {
            "blood_group": g.blood_group,
            "total_donors": g.total,
        }
        for g in groups
    ]

# ── DYNAMIC RFMTD RANKING ─────────────────────────────────────────────────
@router.get("/score/ranked")
def get_ranked_donors(
    patient_lat: float,
    patient_lon: float,
    blood_group: str,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    compat_map = {
        'O Negative':  ['O Negative'],
        'O Positive':  ['O Negative','O Positive'],
        'A Negative':  ['O Negative','A Negative'],
        'A Positive':  ['O Negative','O Positive','A Negative','A Positive'],
        'B Negative':  ['O Negative','B Negative'],
        'B Positive':  ['O Negative','O Positive','B Negative','B Positive'],
        'AB Negative': ['O Negative','A Negative','B Negative','AB Negative'],
        'AB Positive': ['O Negative','O Positive','A Negative','A Positive',
                        'B Negative','B Positive','AB Negative','AB Positive'],
    }
    compatible = compat_map.get(blood_group, [blood_group])

    donors = db.query(Donor).filter(
        Donor.blood_group.in_(compatible),
        Donor.eligibility_status == 'eligible',
        Donor.active_status == 'Active',
        Donor.has_location == True
    ).all()

    def d_score(donor):
        if not donor.latitude or not donor.longitude:
            return 0, None
        km = geodesic(
            (patient_lat, patient_lon),
            (donor.latitude, donor.longitude)
        ).km
        if km <= 2:    return 15, km
        elif km <= 5:  return 12, km
        elif km <= 10: return 8,  km
        elif km <= 25: return 4,  km
        elif km <= 50: return 1,  km
        return 0, km

    ranked = []
    for d in donors:
        ds, km   = d_score(d)
        final    = (d.base_rfmt_score or 0) + ds
        ranked.append({
            "donor_id":        d.id,
            "role":            d.role,
            "blood_group":     d.blood_group,
            "base_rfmt_score": d.base_rfmt_score,
            "d_score":         ds,
            "final_score":     round(final, 2),
            "distance_km":     round(km, 2) if km else None,
            "churn_risk":      d.churn_risk,
            "eligibility":     d.eligibility_status,
            "donations":       d.donations_till_date,
            "city_cluster":    d.city_cluster,
        })

    ranked.sort(key=lambda x: x['final_score'], reverse=True)
    return {
        "patient_location":       {"lat": patient_lat, "lon": patient_lon},
        "required_blood_group":   blood_group,
        "compatible_groups":      compatible,
        "total_eligible":         len(ranked),
        "ranked_donors":          ranked[:limit]
    }

# ── GET ALL DONORS ────────────────────────────────────────────────────────
@router.get("/")
def get_donors(
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    blood_group: Optional[str] = None,
    eligibility_status: Optional[str] = None,
    churn_risk: Optional[str] = None,
    city_cluster: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Donor)
    if role:               query = query.filter(Donor.role == role)
    if blood_group:        query = query.filter(Donor.blood_group == blood_group)
    if eligibility_status: query = query.filter(Donor.eligibility_status == eligibility_status)
    if churn_risk:         query = query.filter(Donor.churn_risk == churn_risk)
    if city_cluster is not None:
        query = query.filter(Donor.city_cluster == city_cluster)

    return query.order_by(Donor.base_rfmt_score.desc())\
                .offset(skip).limit(limit).all()

# ── REGISTER NEW DONOR (POST) ─────────────────────────────────────────────
@router.post("/register")
def register_donor(donor: DonorCreate, db: Session = Depends(get_db)):
    import uuid, json

    if not donor.consent:
        raise HTTPException(status_code=400, detail="Consent is required")
    if not donor.phone.isdigit() or len(donor.phone) != 10:
        raise HTTPException(status_code=400, detail="Valid 10-digit WhatsApp number required")
    if donor.age < 18 or donor.age > 65:
        raise HTTPException(status_code=400, detail="Donor must be between 18 and 65 years old")

    role = "Bridge Donor" if donor.willing_bridge_donor else "Guest"
    base_score = 15.0

    new_donor = Donor(
        id=str(uuid.uuid4()).replace('-', ''),
        name=donor.name,
        phone=donor.phone,
        age=donor.age,
        role=role,
        blood_group=donor.blood_group,
        gender=donor.gender,
        latitude=donor.latitude,
        longitude=donor.longitude,
        has_location=bool(donor.latitude and donor.longitude),
        donor_type="One-Time Donor",
        registration_date=datetime.now(),
        last_donation_date=donor.last_donation_date,
        eligibility_status='eligible',
        active_status='Active',
        base_rfmt_score=base_score,
        churn_risk='MEDIUM',
        status='active'
    )
    db.add(new_donor)

    db.add(EventLog(
        event_type='DONOR_REGISTERED',
        entity_type='donor',
        entity_id=new_donor.id,
        payload=json.dumps({
            'name': donor.name,
            'phone': donor.phone,
            'blood_group': donor.blood_group,
            'role': role,
            'city': donor.city_label,
            'registered_at': datetime.now().isoformat()
        })
    ))
    db.commit()
    db.refresh(new_donor)

    return {
        "message":   "Donor registered successfully",
        "donor_id":  new_donor.id,
        "role":      role,
        "whatsapp":  donor.phone,
        "next_step": "You will receive a WhatsApp message when a patient near you needs your blood group"
    }

# ── GET SINGLE DONOR — LAST to avoid conflict ─────────────────────────────
@router.get("/{donor_id}")
def get_donor(donor_id: str, db: Session = Depends(get_db)):
    donor = db.query(Donor).filter(Donor.id == donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    return donor
