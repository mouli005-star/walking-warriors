# backend/app/services/cascade_engine.py
# Autonomous cascade engine — fires 10 days before transfusion
# Stages: BLOOD_FAMILY → BACKUP_POOL → EXPANDED → BLOOD_BANK → NGO_ALERT

import json
import boto3
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from geopy.distance import geodesic
from app.models.models import (
    Patient, Donor, BloodFamily, CascadeRun,
    CascadeContact, EventLog, CityScarcity
)
from app.services.ai_engine import ai_cascade_decision

LOCALSTACK_URL = os.getenv("LOCALSTACK_URL", "http://localhost:4566")
AWS_REGION     = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
ENVIRONMENT    = os.getenv("ENVIRONMENT", "local")

# compatibility map for blood groups
COMPAT_MAP = {
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

# SQS/SNS client — LocalStack locally, real AWS on deployment
def get_sqs_client():
    if ENVIRONMENT == "local":
        return boto3.client(
            "sqs",
            endpoint_url=LOCALSTACK_URL,
            region_name=AWS_REGION,
            aws_access_key_id="test",
            aws_secret_access_key="test"
        )
    return boto3.client("sqs", region_name=AWS_REGION)


def get_sns_client():
    if ENVIRONMENT == "local":
        return boto3.client(
            "sns",
            endpoint_url=LOCALSTACK_URL,
            region_name=AWS_REGION,
            aws_access_key_id="test",
            aws_secret_access_key="test"
        )
    return boto3.client("sns", region_name=AWS_REGION)

# ── DISTANCE SCORE ───────────────────────────────────────────────────────
def compute_distance_score(donor, patient):
    if not all([donor.latitude, donor.longitude,
                patient.latitude, patient.longitude]):
        return 0, None

    km = geodesic(
        (patient.latitude, patient.longitude),
        (donor.latitude,   donor.longitude)
    ).km
    if km <= 2:
        return 15, km
    elif km <= 5:
        return 12, km
    elif km <= 10:
        return 8, km
    elif km <= 25:
        return 4, km
    elif km <= 50:
        return 1, km
    return 0, km


def log_event(db: Session, event_type: str, entity_type: str, entity_id: str, payload: dict):
    db.add(EventLog(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        payload=json.dumps(payload, default=str)
    ))
    db.commit()


def send_whatsapp_message(phone: str, message: str, donor_id: str = None):
    # Placeholder: integrate with Twilio or WhatsApp sender later
    print(f"[WhatsApp] to={phone} message={message}")
    return True


def transfusion_date_str(dt):
    if dt:
        return dt.strftime("%d %B %Y")
    return "upcoming date"


def create_cascade(db: Session, patient_id: str, transfusion_date: datetime) -> dict:
    """
    Main entry point — called by EventBridge scheduler or manually.
    Creates cascade_run and starts Stage 1.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {"error": "Patient not found"}

    existing = db.query(CascadeRun).filter(
        CascadeRun.patient_id == patient_id,
        CascadeRun.transfusion_date == transfusion_date,
        CascadeRun.status.in_(["PENDING", "ACTIVE"])
    ).first()
    if existing:
        return {"error": "Cascade already active", "cascade_id": existing.id}

    cascade = CascadeRun(
        patient_id       = patient_id,
        transfusion_date = transfusion_date,
        current_stage    = "BLOOD_FAMILY",
        status           = "ACTIVE",
        units_needed     = patient.quantity_required or 2.0,
        units_confirmed  = 0.0,
    )
    db.add(cascade)
    db.commit()
    db.refresh(cascade)

    log_event(db, "CASCADE_TRIGGERED", "cascade_run", cascade.id, {
        "patient_id":       patient_id,
        "transfusion_date": str(transfusion_date),
        "units_needed":     cascade.units_needed,
        "stage":            "BLOOD_FAMILY"
    })

    result = run_stage_blood_family(cascade, patient, db)
    return {
        "cascade_id":      cascade.id,
        "patient_id":      patient_id,
        "stage":           "BLOOD_FAMILY",
        "donors_contacted": result["contacted"],
        "transfusion_date": str(transfusion_date),
        "status":          "ACTIVE"
    }

# ── STAGE 1: BLOOD FAMILY ────────────────────────────────────────────────
def run_stage_blood_family(cascade: CascadeRun, patient: Patient, db: Session) -> dict:
    """Contact the patient's permanent blood family first."""
    families = db.query(BloodFamily).filter(
        BloodFamily.patient_id == patient.id,
        BloodFamily.bridge_active == True
    ).all()

    contacted = 0
    for bf in families:
        donor = db.query(Donor).filter(
            Donor.id == bf.donor_id,
            Donor.eligibility_status == "eligible",
            Donor.active_status == "Active"
        ).first()
        if not donor:
            continue

        d_score, km = compute_distance_score(donor, patient)
        final_score = (donor.base_rfmt_score or 0) + d_score

        message = (
            f"Namaste! Aapke blood family patient ko {transfusion_date_str(cascade.transfusion_date)} "
            f"ko blood ki zaroorat hai. Kya aap donate kar sakte hain? Reply HAAN ya NAHI. - Blood Warriors"
        )

        contact = CascadeContact(
            cascade_run_id  = cascade.id,
            donor_id        = donor.id,
            stage           = "BLOOD_FAMILY",
            base_rfmt_score = donor.base_rfmt_score,
            distance_km     = km,
            d_score         = d_score,
            final_score     = final_score,
            message_sent    = message,
            response        = "NO_REPLY"
        )
        db.add(contact)
        send_whatsapp_message(donor.phone or "0000000000", message, donor.id)
        contacted += 1

    db.commit()
    log_event(db, "STAGE_BLOOD_FAMILY_STARTED", "cascade_run", cascade.id, {
        "donors_contacted": contacted
    })
    return {"contacted": contacted}

# ── STAGE 2: BACKUP POOL ─────────────────────────────────────────────────
def run_stage_backup_pool(cascade: CascadeRun, patient: Patient, db: Session) -> dict:
    """Contact top RFMTD-ranked eligible donors not in blood family."""
    required_bg = patient.required_blood_group or patient.blood_group
    compatible  = COMPAT_MAP.get(required_bg, [required_bg])

    already_contacted = {
        c.donor_id for c in db.query(CascadeContact).filter(
            CascadeContact.cascade_run_id == cascade.id
        ).all()
    }

    donors = db.query(Donor).filter(
        Donor.blood_group.in_(compatible),
        Donor.eligibility_status == "eligible",
        Donor.active_status == "Active",
        Donor.id.notin_(already_contacted)
    ).all()

    ranked = []
    for d in donors:
        ds, km = compute_distance_score(d, patient)
        ranked.append((d, ds, km, (d.base_rfmt_score or 0) + ds))
    ranked.sort(key=lambda x: x[3], reverse=True)

    contacted = 0
    for donor, ds, km, final in ranked[:10]:
        message = (
            f"Namaste! Ek Thalassemia patient ko {transfusion_date_str(cascade.transfusion_date)} "
            f"ko {required_bg} blood ki zaroorat hai. Kya aap madad kar sakte hain? Reply HAAN ya NAHI. - Blood Warriors"
        )
        contact = CascadeContact(
            cascade_run_id  = cascade.id,
            donor_id        = donor.id,
            stage           = "BACKUP_POOL",
            base_rfmt_score = donor.base_rfmt_score,
            distance_km     = km,
            d_score         = ds,
            final_score     = final,
            message_sent    = message,
            response        = "NO_REPLY"
        )
        db.add(contact)
        send_whatsapp_message(donor.phone or "0000000000", message, donor.id)
        contacted += 1

    from_stage = cascade.current_stage
    cascade.current_stage = "BACKUP_POOL"
    db.commit()

    log_event(db, "STAGE_BACKUP_POOL_STARTED", "cascade_run", cascade.id, {
        "from_stage": from_stage,
        "donors_contacted": contacted
    })
    return {"contacted": contacted}

# ── STAGE 3: EXPANDED ───────────────────────────────────────────────────
def run_stage_expanded(cascade: CascadeRun, patient: Patient, db: Session) -> dict:
    """Expand donor outreach beyond the backup pool."""
    required_bg = patient.required_blood_group or patient.blood_group
    compatible  = COMPAT_MAP.get(required_bg, [required_bg])

    already_contacted = {
        c.donor_id for c in db.query(CascadeContact).filter(
            CascadeContact.cascade_run_id == cascade.id
        ).all()
    }

    donors = db.query(Donor).filter(
        Donor.blood_group.in_(compatible),
        Donor.eligibility_status == "eligible",
        Donor.active_status == "Active",
        Donor.id.notin_(already_contacted)
    ).all()

    ranked = []
    for d in donors:
        ds, km = compute_distance_score(d, patient)
        ranked.append((d, ds, km, (d.base_rfmt_score or 0) + ds))
    ranked.sort(key=lambda x: x[3], reverse=True)

    contacted = 0
    for donor, ds, km, final in ranked[:20]:
        message = (
            f"Namaste! Ek patient ko {transfusion_date_str(cascade.transfusion_date)} "
            f"ko {required_bg} blood chahiye. Agar aap donate kar sakte hain, toh HAAN likhein. - Blood Warriors"
        )
        contact = CascadeContact(
            cascade_run_id  = cascade.id,
            donor_id        = donor.id,
            stage           = "EXPANDED",
            base_rfmt_score = donor.base_rfmt_score,
            distance_km     = km,
            d_score         = ds,
            final_score     = final,
            message_sent    = message,
            response        = "NO_REPLY"
        )
        db.add(contact)
        send_whatsapp_message(donor.phone or "0000000000", message, donor.id)
        contacted += 1

    from_stage = cascade.current_stage
    cascade.current_stage = "EXPANDED"
    db.commit()

    log_event(db, "STAGE_EXPANDED_STARTED", "cascade_run", cascade.id, {
        "from_stage": from_stage,
        "donors_contacted": contacted
    })
    return {"contacted": contacted}

# ── STAGE 4: BLOOD BANK ──────────────────────────────────────────────────
def run_stage_blood_bank(cascade: CascadeRun, patient: Patient, db: Session) -> dict:
    """Check blood bank inventory or alert partner banks."""
    message = (
        f"URGENT: Patient needs {patient.required_blood_group or patient.blood_group} blood "
        f"for {transfusion_date_str(cascade.transfusion_date)}. Please escalate to partner blood banks."
    )
    log_event(db, "STAGE_BLOOD_BANK_STARTED", "cascade_run", cascade.id, {
        "message": message
    })
    from_stage = cascade.current_stage
    cascade.current_stage = "BLOOD_BANK"
    db.commit()
    log_event(db, "STAGE_BLOOD_BANK_STAGE_SET", "cascade_run", cascade.id, {
        "from_stage": from_stage,
        "to_stage": "BLOOD_BANK"
    })
    return {"contacted": 0}

# ── STAGE 5: NGO ALERT ───────────────────────────────────────────────────
def run_stage_ngo_alert(cascade: CascadeRun, patient: Patient, db: Session) -> dict:
    """Notify NGO admins for manual intervention."""
    message = (
        f"ALERT: Cascade for patient {patient.id} is in NGO_ALERT stage. "
        f"Please review urgently. Transfusion date is {transfusion_date_str(cascade.transfusion_date)}."
    )
    log_event(db, "STAGE_NGO_ALERT_STARTED", "cascade_run", cascade.id, {
        "message": message
    })
    from_stage = cascade.current_stage
    cascade.current_stage = "NGO_ALERT"
    db.commit()
    log_event(db, "STAGE_NGO_ALERT_STAGE_SET", "cascade_run", cascade.id, {
        "from_stage": from_stage,
        "to_stage": "NGO_ALERT"
    })
    return {"alerted": True}

# ── ADVANCE CASCADE ──────────────────────────────────────────────────────
def advance_cascade(cascade_id: int, db: Session) -> dict:
    """
    AI agent decides whether to advance stage or wait.
    Called periodically or after donor reply processing.
    """
    cascade = db.query(CascadeRun).filter(
        CascadeRun.id == cascade_id
    ).first()
    if not cascade:
        return {"error": "Cascade not found"}

    patient = db.query(Patient).filter(
        Patient.id == cascade.patient_id
    ).first()

    contacts = db.query(CascadeContact).filter(
        CascadeContact.cascade_run_id == cascade_id
    ).all()

    confirmed = sum(1 for c in contacts if c.response == "CONFIRMED")
    declined  = sum(1 for c in contacts if c.response == "DECLINED")
    no_reply  = sum(1 for c in contacts if c.response == "NO_REPLY")
    days_until = (cascade.transfusion_date - datetime.now()).days

    cascade_context = {
        "cascade_id":            cascade_id,
        "current_stage":         cascade.current_stage,
        "units_needed":          cascade.units_needed,
        "units_confirmed":       cascade.units_confirmed,
        "donors_confirmed":      confirmed,
        "donors_declined":       declined,
        "donors_no_reply":       no_reply,
        "days_until_transfusion": days_until,
        "transfusion_date":      str(cascade.transfusion_date),
    }

    decision = ai_cascade_decision(cascade_context)

    log_event(db, "AI_CASCADE_DECISION", "cascade_run", cascade_id, {
        "decision": decision,
        "context":  cascade_context
    })

    stage_map = {
        "BLOOD_FAMILY": "BACKUP_POOL",
        "BACKUP_POOL":  "EXPANDED",
        "EXPANDED":     "BLOOD_BANK",
        "BLOOD_BANK":   "NGO_ALERT"
    }

    current_stage_contacts = [c for c in contacts if c.stage == cascade.current_stage]
    all_non_responsive = all(
        c.response in ["NO_REPLY", "DECLINED"]
        for c in current_stage_contacts
    ) if current_stage_contacts else True
    urgent = days_until <= 2

    action = decision.get("action")
    if action == "MARK_FULFILLED":
        cascade.status       = "FULFILLED"
        cascade.fulfilled_at = datetime.now()
        db.commit()
        return {"cascade_id": cascade_id, "action": "MARK_FULFILLED", "status": "FULFILLED"}

    if action == "ADVANCE_STAGE":
        should_advance = True
    else:
        should_advance = all_non_responsive or urgent

    if should_advance:
        from_stage = cascade.current_stage
        next_stage = stage_map.get(from_stage, "NGO_ALERT")
        reason = (
            "AI_DECISION_ADVANCE" if action == "ADVANCE_STAGE" else
            "FORCED_ADVANCE_NON_RESPONSIVE" if all_non_responsive else
            "FORCED_ADVANCE_URGENT"
        )

        cascade.current_stage = next_stage
        db.commit()

        log_event(db, "CASCADE_STAGE_ADVANCED", "cascade_run", cascade_id, {
            "from_stage": from_stage,
            "to_stage": next_stage,
            "reason": reason,
            "ai_action": action
        })

        if next_stage == "BACKUP_POOL":
            run_stage_backup_pool(cascade, patient, db)
        elif next_stage == "EXPANDED":
            run_stage_expanded(cascade, patient, db)
        elif next_stage == "BLOOD_BANK":
            run_stage_blood_bank(cascade, patient, db)
        elif next_stage == "NGO_ALERT":
            run_stage_ngo_alert(cascade, patient, db)

        return {"cascade_id": cascade_id, "action": "ADVANCE_STAGE", "to": next_stage, "reason": reason}

    return {"cascade_id": cascade_id, "action": "WAIT", "reason": "Still waiting for donor responses"}


def trigger_cascade(patient_id: str, transfusion_date: datetime, db: Session) -> dict:
    return create_cascade(db, patient_id, transfusion_date)
