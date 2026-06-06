from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.models.models import (
    CascadeRun, CascadeContact, Donor,
    Patient, EventLog, CityScarcity
)
from app.services.cascade_engine import trigger_cascade, advance_cascade
from app.services.ai_engine import (
    parse_donor_intent, answer_ngo_question,
    convert_result_to_answer, donor_patient_chat,
    call_bedrock
)
from app.api.auth import get_current_admin
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json

router = APIRouter(tags=["cascade & AI"])

# ══════════════════════════════════════════════════════════════════════════
# CASCADE ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════

class TriggerRequest(BaseModel):
    patient_id:       str
    transfusion_date: datetime

class DonorReplyRequest(BaseModel):
    cascade_contact_id: int
    raw_reply:          str
    donor_id:           str

# ── TRIGGER CASCADE MANUALLY (also called by EventBridge Lambda) ──────────
@router.post("/cascade/trigger")
def trigger_cascade_endpoint(
    req: TriggerRequest,
    db: Session = Depends(get_db)
):
    result = trigger_cascade(req.patient_id, req.transfusion_date, db)
    return result

# ── PROCESS DONOR REPLY ───────────────────────────────────────────────────
@router.post("/cascade/donor-reply")
def process_donor_reply(
    req: DonorReplyRequest,
    db: Session = Depends(get_db)
):
    contact = db.query(CascadeContact).filter(
        CascadeContact.id == req.cascade_contact_id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    donor = db.query(Donor).filter(Donor.id == req.donor_id).first()
    donor_name = donor.name if donor else "Donor"

    parsed = parse_donor_intent(req.raw_reply, donor_name)

    contact.raw_reply     = req.raw_reply
    contact.parsed_intent = parsed["intent"]
    contact.response      = parsed["intent"]
    contact.replied_at    = datetime.now()

    cascade = db.query(CascadeRun).filter(
        CascadeRun.id == contact.cascade_run_id
    ).first()

    if parsed["intent"] == "CONFIRMED" and cascade:
        cascade.units_confirmed += 1.0
        if cascade.units_confirmed >= cascade.units_needed:
            cascade.status       = "FULFILLED"
            cascade.fulfilled_at = datetime.now()

    db.commit()

    db.add(EventLog(
        event_type  = "DONOR_REPLIED",
        entity_type = "cascade_contact",
        entity_id   = str(contact.id),
        payload     = json.dumps({
            "donor_id":          req.donor_id,
            "raw_reply":         req.raw_reply,
            "parsed_intent":     parsed["intent"],
            "confidence":        parsed.get("confidence"),
            "language_detected": parsed.get("language_detected"),
            "reasoning":         parsed.get("reasoning")
        })
    ))
    db.commit()

    advance_result = None
    if parsed["intent"] in ["DECLINED", "NO_REPLY"] and cascade:
        advance_result = advance_cascade(cascade.id, db)

    return {
        "contact_id":        req.cascade_contact_id,
        "raw_reply":         req.raw_reply,
        "parsed_intent":     parsed["intent"],
        "confidence":        parsed.get("confidence"),
        "language_detected": parsed.get("language_detected"),
        "reasoning":         parsed.get("reasoning"),
        "cascade_advanced":  advance_result
    }

# ── GET ALL CASCADES ──────────────────────────────────────────────────────
@router.get("/cascade/runs")
def get_cascade_runs(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CascadeRun)
    if status:
        query = query.filter(CascadeRun.status == status)
    runs = query.order_by(CascadeRun.triggered_at.desc()).all()

    result = []
    for run in runs:
        contacts = db.query(CascadeContact).filter(
            CascadeContact.cascade_run_id == run.id
        ).all()
        confirmed = sum(1 for c in contacts if c.response == "CONFIRMED")
        result.append({
            "id":               run.id,
            "patient_id":       run.patient_id,
            "transfusion_date": run.transfusion_date,
            "current_stage":    run.current_stage,
            "status":           run.status,
            "units_needed":     run.units_needed,
            "units_confirmed":  run.units_confirmed,
            "donors_contacted": len(contacts),
            "donors_confirmed": confirmed,
            "triggered_at":     run.triggered_at,
            "fulfilled_at":     run.fulfilled_at,
        })
    return result

# ── GET SINGLE CASCADE DETAIL ─────────────────────────────────────────────
@router.get("/cascade/runs/{cascade_id}")
def get_cascade_detail(cascade_id: int, db: Session = Depends(get_db)):
    cascade = db.query(CascadeRun).filter(CascadeRun.id == cascade_id).first()
    if not cascade:
        raise HTTPException(status_code=404, detail="Cascade not found")

    contacts = db.query(CascadeContact).filter(
        CascadeContact.cascade_run_id == cascade_id
    ).order_by(CascadeContact.final_score.desc()).all()

    contact_list = []
    for c in contacts:
        donor = db.query(Donor).filter(Donor.id == c.donor_id).first()
        contact_list.append({
            "contact_id":    c.id,
            "donor_id":      c.donor_id,
            "donor_name":    donor.name if donor else "Unknown",
            "donor_bg":      donor.blood_group if donor else None,
            "stage":         c.stage,
            "final_score":   c.final_score,
            "distance_km":   c.distance_km,
            "response":      c.response,
            "raw_reply":     c.raw_reply,
            "parsed_intent": c.parsed_intent,
            "contacted_at":  c.contacted_at,
            "replied_at":    c.replied_at,
        })

    return {
        "cascade":  cascade,
        "contacts": contact_list,
        "summary": {
            "total_contacted": len(contacts),
            "confirmed": sum(1 for c in contacts if c.response == "CONFIRMED"),
            "declined":  sum(1 for c in contacts if c.response == "DECLINED"),
            "no_reply":  sum(1 for c in contacts if c.response == "NO_REPLY"),
        }
    }

# ── ADVANCE CASCADE MANUALLY ──────────────────────────────────────────────
@router.post("/cascade/runs/{cascade_id}/advance")
def advance_cascade_endpoint(cascade_id: int, db: Session = Depends(get_db)):
    return advance_cascade(cascade_id, db)

# ══════════════════════════════════════════════════════════════════════════
# AI ANALYTICS — NGO INTELLIGENCE CHAT
# ══════════════════════════════════════════════════════════════════════════

class NGOChatRequest(BaseModel):
    question: str

class ConversationRequest(BaseModel):
    question:             str
    user_type:            str  # 'donor' or 'patient'
    user_id:              Optional[str] = None
    conversation_history: Optional[List[dict]] = None

# ── NGO ADMIN ANALYTICS CHAT ──────────────────────────────────────────────
@router.post("/ai/ngo-chat")
def ngo_analytics_chat(
    req: NGOChatRequest,
    db: Session = Depends(get_db)
):
    sql_result = answer_ngo_question(req.question)
    generated_sql = sql_result["sql"]

    try:
        if not generated_sql.strip().upper().startswith("SELECT"):
            return {
                "question": req.question,
                "answer": "I can only answer questions that read data.",
                "sql": generated_sql,
                "suggestions": []
            }

        result = db.execute(text(generated_sql))
        rows   = [dict(row._mapping) for row in result]

    except Exception as e:
        rows = []
        generated_sql = f"Error: {str(e)}"

    answer = convert_result_to_answer(req.question, generated_sql, rows)

    # Generate dynamic follow-up suggestions
    followup_prompt = f"""Based on this question and answer about Blood Warriors NGO data:
Question: {req.question}
Answer: {answer}

Generate 3 short follow-up questions the admin might want to ask next.
Return ONLY a JSON array of 3 strings, nothing else:
["question 1", "question 2", "question 3"]"""

    try:
        raw = call_bedrock(followup_prompt, max_tokens=200)
        raw = raw.replace("```json", "").replace("```", "").strip()
        suggestions = json.loads(raw)
    except Exception:
        suggestions = [
            "Which city has the most critical shortage?",
            "Show me donors eligible to donate this week",
            "How many cascades were fulfilled last month?"
        ]

    return {
        "question":  req.question,
        "answer":    answer,
        "data":      rows[:20],
        "sql_used":  generated_sql,
        "row_count": len(rows),
        "suggestions": suggestions
    }

# ── DONOR/PATIENT CONVERSATIONAL AI ──────────────────────────────────────
@router.post("/ai/chat")
def conversational_chat(req: ConversationRequest, db: Session = Depends(get_db)):
    user_context = {}
    if req.user_id:
        if req.user_type == "donor":
            donor = db.query(Donor).filter(Donor.id == req.user_id).first()
            if donor:
                families = db.query(CascadeContact).filter(
                    CascadeContact.donor_id == req.user_id
                ).count()
                user_context = {
                    "name":              donor.name,
                    "blood_group":       donor.blood_group,
                    "role":              donor.role,
                    "eligibility":       donor.eligibility_status,
                    "donations":         donor.donations_till_date,
                    "next_eligible":     str(donor.next_eligible_date),
                    "rfmt_score":        donor.base_rfmt_score,
                    "times_contacted":   families,
                    "last_donation":     str(donor.last_donation_date),
                }
        elif req.user_type == "patient":
            patient = db.query(Patient).filter(Patient.id == req.user_id).first()
            if patient:
                family_count = db.query(CascadeContact).filter(
                    CascadeContact.cascade_run_id.in_(
                        db.query(CascadeRun.id).filter(
                            CascadeRun.patient_id == req.user_id
                        )
                    )
                ).count()
                user_context = {
                    "name":                  patient.name,
                    "blood_group":           patient.blood_group,
                    "required_blood_group":  patient.required_blood_group,
                    "next_transfusion":      str(patient.expected_next_transfusion_date),
                    "frequency_days":        patient.frequency_in_days,
                    "hospital":              patient.hospital_name,
                    "blood_family_size":     family_count,
                }

    answer = donor_patient_chat(
        question             = req.question,
        user_type            = req.user_type,
        user_context         = user_context,
        conversation_history = req.conversation_history or []
    )

    return {
        "question":     req.question,
        "answer":       answer,
        "user_type":    req.user_type,
        "user_context": user_context
    }

# ── SCARCITY DASHBOARD DATA ──────────────────────────────────────────────
@router.get("/dashboard/scarcity")
def get_scarcity_dashboard(db: Session = Depends(get_db)):
    scarcity = db.query(CityScarcity).order_by(
        CityScarcity.warning_level.desc()
    ).all()

    critical = [s for s in scarcity if s.warning_level == "CRITICAL"]
    warning  = [s for s in scarcity if s.warning_level == "WARNING"]
    ok       = [s for s in scarcity if s.warning_level == "OK"]

    return {
        "summary": {
            "critical_zones": len(critical),
            "warning_zones":  len(warning),
            "ok_zones":       len(ok),
            "total_zones":    len(scarcity)
        },
        "critical": [{"city_cluster": s.city_cluster,
                      "blood_group": s.blood_group,
                      "eligible_donors": s.eligible_donor_count,
                      "warning_level": s.warning_level} for s in critical],
        "warning":  [{"city_cluster": s.city_cluster,
                      "blood_group": s.blood_group,
                      "eligible_donors": s.eligible_donor_count,
                      "warning_level": s.warning_level} for s in warning],
    }

# ── AUDIT LOG ─────────────────────────────────────────────────────────────
@router.get("/dashboard/audit-log")
def get_audit_log(
    limit: int = 50,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(EventLog)
    if event_type:
        query = query.filter(EventLog.event_type == event_type)
    logs = query.order_by(EventLog.created_at.desc()).limit(limit).all()

    return [{
        "id":          log.id,
        "event_type":  log.event_type,
        "entity_type": log.entity_type,
        "entity_id":   log.entity_id,
        "payload":     json.loads(log.payload) if log.payload else {},
        "created_at":  log.created_at
    } for log in logs]

# ── INTENT PARSER TEST ENDPOINT ─────────────────────────────────────────────
@router.post("/ai/parse-intent")
def test_intent_parser(
    raw_reply: str,
    donor_name: str = "Donor"
):
    result = parse_donor_intent(raw_reply, donor_name)
    return {
        "raw_reply":         raw_reply,
        "parsed_intent":     result["intent"],
        "confidence":        result["confidence"],
        "language_detected": result["language_detected"],
        "reasoning":         result["reasoning"]
    }
