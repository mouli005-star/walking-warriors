# backend/app/services/engagement.py
# Automated engagement messages — runs daily via EventBridge Lambda
# EventBridge Scheduler → Lambda → this function → Bedrock → SNS → WhatsApp

import json
import os
import boto3
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import Donor, Patient, BloodFamily, CascadeRun, CascadeContact, EventLog
from app.services.ai_engine import call_bedrock

ENVIRONMENT = os.getenv("ENVIRONMENT", "local")
LOCALSTACK_URL = os.getenv("LOCALSTACK_URL", "http://localstack:4566")
SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN", "")
WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL", "")
WHATSAPP_API_TOKEN = os.getenv("WHATSAPP_API_TOKEN", "")


def get_sns_client():
    if ENVIRONMENT == "local":
        return boto3.client(
            "sns",
            endpoint_url=LOCALSTACK_URL,
            region_name="us-east-1",
            aws_access_key_id="test",
            aws_secret_access_key="test"
        )
    return boto3.client("sns", region_name="us-east-1")


def send_whatsapp(phone: str, message: str, db: Session, context: dict = {}):
    """
    Send WhatsApp message.
    Local: print mock message
    AWS with WhatsApp API: POST to WhatsApp Business API
    """
    print(f"\n[WhatsApp → +91{phone}]:\n{message}\n")

    if WHATSAPP_API_URL and WHATSAPP_API_TOKEN:
        import httpx
        try:
            httpx.post(
                WHATSAPP_API_URL,
                headers={"Authorization": f"Bearer {WHATSAPP_API_TOKEN}"},
                json={
                    "messaging_product": "whatsapp",
                    "to": f"91{phone}",
                    "type": "text",
                    "text": {"body": message}
                },
                timeout=10
            )
        except Exception as e:
            print(f"WhatsApp send error: {e}")

    # Log every message sent
    db.add(EventLog(
        event_type="WHATSAPP_SENT",
        entity_type="engagement",
        entity_id=phone,
        payload=json.dumps({
            "phone": phone,
            "message_preview": message[:100],
            "context": context,
            "sent_at": datetime.now().isoformat()
        })
    ))
    db.commit()


def generate_personalized_message(template_type: str, context: dict) -> str:
    """Use Bedrock to generate natural, personalized messages."""
    prompts = {
        "welcome_donor": f"""Generate a warm WhatsApp welcome message for a new blood donor who just registered with Blood Warriors NGO India.
Donor details: {json.dumps(context)}
Rules:
- Write in the donor's language preference (default Hindi/English mix)
- Maximum 3 sentences
- Mention their blood group and that patients are waiting
- Warm, grateful tone — not corporate
- No asterisks or markdown
- End with "- Blood Warriors Team" """,

        "welcome_patient": f"""Generate a compassionate WhatsApp message for a Thalassemia patient's family who just registered with Blood Warriors.
Patient details: {json.dumps(context)}
Rules:
- Write in simple Hindi/English
- Maximum 3 sentences  
- Mention that a blood family will be assigned within 24 hours
- Reassuring and caring tone
- No asterisks or markdown
- End with "- Blood Warriors Team" """,

        "post_donation": f"""Generate a heartfelt thank you WhatsApp message to a blood donor after their donation was confirmed for a Thalassemia patient.
Details: {json.dumps(context)}
Rules:
- Maximum 4 sentences
- Mention the specific patient (use first name only)
- Tell them when they can donate again (90 days)
- Deeply grateful tone — this is life-saving
- No asterisks or markdown
- End with "- Blood Warriors Team" """,

        "weekly_update": f"""Generate a weekly patient update WhatsApp message to send to a Bridge Donor about their assigned patient.
Details: {json.dumps(context)}
Rules:
- Maximum 4 sentences
- Personal, caring tone — donor knows this patient
- Mention the upcoming transfusion date
- Make donor feel their connection matters
- No asterisks or markdown
- End with "- Blood Warriors Team" """,

        "transfusion_reminder": f"""Generate a transfusion reminder WhatsApp message to a patient's guardian.
Details: {json.dumps(context)}
Rules:
- Maximum 3 sentences
- Mention the date and hospital
- Reassuring tone — they should feel supported
- No asterisks or markdown
- End with "- Blood Warriors Team" """
    }

    prompt = prompts.get(template_type, f"Generate a message for: {json.dumps(context)}")
    try:
        return call_bedrock(prompt, max_tokens=200)
    except:
        return fallback_message(template_type, context)


def fallback_message(template_type: str, context: dict) -> str:
    """Fallback messages if Bedrock fails."""
    templates = {
        "welcome_donor": f"Namaste {context.get('name', 'Donor')}! Blood Warriors mein aapka swagat hai. Aap ab {context.get('blood_group', '')} blood ke zarooratmand Thalassemia patients ki madad kar sakte hain. Jab bhi kisi ko zaroorat hogi, hum aapko WhatsApp karenge. - Blood Warriors Team",
        "welcome_patient": f"Namaste! {context.get('patient_name', 'Patient')} ka Blood Warriors program mein registration ho gaya hai. Agle 24 ghante mein unhe ek dedicated blood family assign ki jayegi. Hum aapke saath hain. - Blood Warriors Team",
        "post_donation": f"Bahut bahut shukriya {context.get('donor_name', 'Donor')}! Aapke donation se {context.get('patient_name', 'ek bachche')} ki zindagi bachi. Aap 90 din baad phir donate kar sakte hain. - Blood Warriors Team",
        "weekly_update": f"Namaste! {context.get('patient_name', 'Patient')} theek hain. Unka agle transfusion {context.get('next_transfusion', 'jald hi')} ko hai. Aapka yogdan unke liye bahut mayne rakhta hai. - Blood Warriors Team",
        "transfusion_reminder": f"Reminder: {context.get('patient_name', 'Patient')} ka transfusion {context.get('date', 'upcoming')} ko {context.get('hospital', 'hospital')} mein hai. - Blood Warriors Team"
    }
    return templates.get(template_type, "Blood Warriors: Aapke saath hain. - Blood Warriors Team")


# ── DAILY ENGAGEMENT RUNNER ──────────────────────────────────────────────
def run_daily_engagement(db: Session):
    """
    Called by EventBridge Lambda every day at 8 AM IST.
    Handles all automated engagement messages.
    """
    today = datetime.now()
    results = {
        "welcome_donors": 0,
        "welcome_patients": 0,
        "post_donation": 0,
        "weekly_updates": 0,
        "transfusion_reminders": 0
    }

    # 1. Welcome new donors registered in last 24 hours
    new_donors = db.query(Donor).filter(
        Donor.registration_date >= today - timedelta(days=1),
        Donor.phone.isnot(None),
        Donor.role.in_(["Bridge Donor", "Emergency Donor"])
    ).all()

    for donor in new_donors:
        msg = generate_personalized_message("welcome_donor", {
            "name": donor.name or "Donor",
            "blood_group": donor.blood_group,
            "role": donor.role
        })
        send_whatsapp(donor.phone, msg, db, {"type": "welcome", "donor_id": donor.id})
        results["welcome_donors"] += 1

    # 2. Post-donation thank you — donors who donated yesterday
    recent_confirmed = db.query(CascadeContact).filter(
        CascadeContact.response == "CONFIRMED",
        CascadeContact.replied_at >= today - timedelta(days=1),
        CascadeContact.replied_at.isnot(None)
    ).all()

    for contact in recent_confirmed:
        donor = db.query(Donor).filter(Donor.id == contact.donor_id).first()
        cascade = db.query(CascadeRun).filter(
            CascadeRun.id == contact.cascade_run_id
        ).first()
        patient = db.query(Patient).filter(
            Patient.id == cascade.patient_id
        ).first() if cascade else None

        if donor and donor.phone:
            msg = generate_personalized_message("post_donation", {
                "donor_name": donor.name or "Donor",
                "patient_name": patient.name or "the patient",
                "blood_group": donor.blood_group,
                "next_eligible": "90 days from today"
            })
            send_whatsapp(donor.phone, msg, db, {
                "type": "post_donation",
                "donor_id": donor.id,
                "cascade_id": contact.cascade_run_id
            })
            results["post_donation"] += 1

    # 3. Weekly patient updates to Bridge Donors (every 7 days)
    bridge_families = db.query(BloodFamily).filter(
        BloodFamily.bridge_active == True
    ).all()

    for bf in bridge_families:
        donor = db.query(Donor).filter(Donor.id == bf.donor_id).first()
        patient = db.query(Patient).filter(Patient.id == bf.patient_id).first()

        if not donor or not donor.phone or not patient:
            continue

        # Only send on Mondays (weekday == 0) or every 7 days
        if today.weekday() != 0:
            continue

        next_transfusion = patient.expected_next_transfusion_date
        days_until = (next_transfusion - today).days if next_transfusion else None

        msg = generate_personalized_message("weekly_update", {
            "donor_name": donor.name or "Donor",
            "patient_name": patient.name or "your patient",
            "next_transfusion": next_transfusion.strftime("%d %B") if next_transfusion else "soon",
            "days_until": days_until,
            "blood_group": patient.required_blood_group or patient.blood_group
        })
        send_whatsapp(donor.phone, msg, db, {
            "type": "weekly_update",
            "donor_id": donor.id,
            "patient_id": patient.id
        })
        results["weekly_updates"] += 1

    # 4. Transfusion reminders to patients (3 days before)
    upcoming_patients = db.query(Patient).filter(
        Patient.expected_next_transfusion_date >= today,
        Patient.expected_next_transfusion_date <= today + timedelta(days=3),
        Patient.phone.isnot(None)
    ).all()

    for patient in upcoming_patients:
        msg = generate_personalized_message("transfusion_reminder", {
            "patient_name": patient.name or "Patient",
            "date": patient.expected_next_transfusion_date.strftime("%d %B %Y") if patient.expected_next_transfusion_date else "upcoming",
            "hospital": patient.hospital_name or "your hospital",
            "blood_group": patient.required_blood_group or patient.blood_group
        })
        send_whatsapp(patient.phone, msg, db, {
            "type": "transfusion_reminder",
            "patient_id": patient.id
        })
        results["transfusion_reminders"] += 1

    print(f"Daily engagement complete: {results}")
    return results


# ── INSTANT TRIGGERS (called immediately on events) ──────────────────────
def send_welcome_donor(donor: Donor, db: Session):
    """Called immediately after donor registers."""
    if not donor.phone:
        return
    msg = generate_personalized_message("welcome_donor", {
        "name": donor.name or "Donor",
        "blood_group": donor.blood_group,
        "role": donor.role
    })
    send_whatsapp(donor.phone, msg, db, {"type": "welcome_donor"})


def send_welcome_patient(patient: Patient, db: Session):
    """Called immediately after patient registers."""
    if not patient.phone:
        return
    msg = generate_personalized_message("welcome_patient", {
        "patient_name": patient.name or "Patient",
        "guardian_name": patient.guardian_name,
        "blood_group": patient.required_blood_group or patient.blood_group
    })
    send_whatsapp(patient.phone, msg, db, {"type": "welcome_patient"})