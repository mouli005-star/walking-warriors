# backend/app/services/ai_engine.py
# Uses Amazon Bedrock (Claude) — hackathon provided credentials

import os
import json
import boto3
from botocore.config import Config

AWS_REGION    = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
ENVIRONMENT   = os.getenv("ENVIRONMENT", "local")
BEDROCK_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

def get_bedrock_client():
    return boto3.client(
        service_name="bedrock-runtime",
        region_name=AWS_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        config=Config(
            connect_timeout=10,
            read_timeout=30,
            retries={"max_attempts": 2}
        )
    )

def call_bedrock(prompt: str, system: str = None, max_tokens: int = 500) -> str:
    """Single function for all Bedrock calls."""
    client = get_bedrock_client()

    messages = [{"role": "user", "content": prompt}]

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens":        max_tokens,
        "messages":          messages,
    }
    if system:
        body["system"] = system

    response = client.invoke_model(
        modelId     = BEDROCK_MODEL,
        body        = json.dumps(body),
        contentType = "application/json",
        accept      = "application/json"
    )

    result = json.loads(response["body"].read())
    return result["content"][0]["text"].strip()


# ── DB SCHEMA CONTEXT ────────────────────────────────────────────────────
DB_SCHEMA = """
PostgreSQL database for Blood Warriors NGO India.

patients(id, name, blood_group, required_blood_group, latitude, longitude,
         expected_next_transfusion_date, frequency_in_days, quantity_required,
         hospital_name, city_cluster, status, phone, guardian_name, age)

donors(id, name, role, blood_group, latitude, longitude, base_rfmt_score,
       churn_risk, eligibility_status, active_status, donations_till_date,
       last_donation_date, next_eligible_date, city_cluster, phone, age)

blood_families(id, donor_id, patient_id, donor_blood_group, bridge_active,
               last_bridge_donation_date)

cascade_runs(id, patient_id, transfusion_date, current_stage, status,
             units_needed, units_confirmed, triggered_at, fulfilled_at)

cascade_contacts(id, cascade_run_id, donor_id, stage, final_score,
                 distance_km, response, contacted_at, replied_at, raw_reply)

city_scarcity(id, city_cluster, blood_group, eligible_donor_count,
              scheduled_transfusions_14d, coverage_ratio, warning_level)

event_log(id, event_type, entity_type, entity_id, payload, created_at)

Roles: 'Bridge Donor', 'Emergency Donor', 'Guest'
Churn risk: 'LOW', 'MEDIUM', 'HIGH'
Eligibility: 'eligible', 'not eligible'
Cascade stages: 'BLOOD_FAMILY','BACKUP_POOL','EXPANDED','BLOOD_BANK','NGO_ALERT'
Warning levels: 'OK', 'WARNING', 'CRITICAL'
"""


# ── 1. INTENT PARSER ────────────────────────────────────────────────────
def parse_donor_intent(raw_reply: str, donor_name: str = "Donor") -> dict:
    prompt = f"""You are parsing a blood donor WhatsApp reply for Blood Warriors NGO India.
The donor was asked if they can donate blood for a Thalassemia patient.

Donor name: {donor_name}
Donor reply: "{raw_reply}"

Classify into exactly one:
- CONFIRMED: donor agrees (yes, haan, ok, sure, vastanu, baruttini, varuven, etc.)
- DECLINED: donor cannot (no, nahi, ledu, busy, sick, mudiyadu, etc.)
- RESCHEDULE: wants different time (later, kal, next week, munde, etc.)
- UNCLEAR: cannot determine

Reply ONLY with this JSON, nothing else:
{{
  "intent": "CONFIRMED|DECLINED|RESCHEDULE|UNCLEAR",
  "confidence": 0.95,
  "language_detected": "English|Hindi|Telugu|Kannada|Tamil|Malayalam|Mixed",
  "reasoning": "one sentence"
}}"""

    try:
        raw = call_bedrock(prompt, max_tokens=200)
        # Clean any markdown
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        return {
            "intent":           "UNCLEAR",
            "confidence":       0.0,
            "language_detected":"Unknown",
            "reasoning":        f"Parse error: {str(e)}"
        }


# ── 2. NGO ANALYTICS — GENERATE SQL ─────────────────────────────────────
def answer_ngo_question(question: str) -> dict:
    sql_prompt = f"""{DB_SCHEMA}

NGO Admin question: "{question}"

Generate ONE safe SELECT SQL query for PostgreSQL to answer this.
Rules: SELECT only. Use exact column names above. No markdown. No explanation.
If unanswerable, return: SELECT 'Data not available' as answer"""

    try:
        sql = call_bedrock(sql_prompt, max_tokens=300)
        sql = sql.replace("```sql", "").replace("```", "").strip()
        return {"sql": sql, "step": "sql_generated"}
    except Exception as e:
        return {"sql": f"SELECT 'Error: {str(e)}' as answer", "step": "error"}


def convert_result_to_answer(question: str, sql: str, db_result: list) -> str:
    prompt = f"""You are an assistant for Blood Warriors NGO India.

Admin asked: "{question}"
Database result: {json.dumps(db_result[:10], default=str)}

Give a clear answer in 1-2 sentences. Be specific with numbers.
If empty result, say what information is unavailable.
Never mention SQL or technical terms.
IMPORTANT: Reply in plain text only. No markdown, no asterisks, no bold, no bullet points."""

    try:
        return call_bedrock(prompt, max_tokens=200)
    except Exception as e:
        return f"Could not generate answer: {str(e)}"


# ── 3. DONOR/PATIENT CONVERSATIONAL AI ──────────────────────────────────
def donor_patient_chat(
    question: str,
    user_type: str,
    user_context: dict = None,
    conversation_history: list = None
) -> str:
    context_str = ""
    if user_context:
        context_str = f"\nUser profile: {json.dumps(user_context, default=str)}"

    system = f"""You are Raksha, an assistant for Blood Warriors NGO India.
You help {user_type}s in the Blood Bridge program for Thalassemia patients.

Language rule: Always respond in the same language the user writes in.
Telugu → Telugu. Hindi → Hindi. Tamil → Tamil.
Kannada → Kannada. Malayalam → Malayalam.
Mixed languages → match their mix naturally.

Tone:
- Speak like a warm caring person, not a chatbot
- Maximum one emoji per response, only when natural
- Never start with "Certainly!" or "Of course!" or "Great question!"
- Donors: be grateful and encouraging
- Patients and families: be compassionate and reassuring
{context_str}

Facts:
- Thalassemia patients need blood every 20-25 days for life
- Donors can give blood every 90 days
- Blood Bridge connects specific donors to specific patients permanently
- For medical questions always refer to their doctor or Blood Warriors team"""

    # Build conversation
    messages_text = ""
    if conversation_history:
        for msg in conversation_history[-6:]:  # last 6 exchanges for memory
            role = msg.get("role", "user")
            content = msg.get("content", "")
            messages_text += f"\n{role}: {content}"

    full_prompt = f"{messages_text}\nuser: {question}"

    try:
        return call_bedrock(full_prompt, system=system, max_tokens=400)
    except Exception as e:
        return f"Sorry, I could not process your message. Please try again."


# ── 4. CASCADE DECISION AI ───────────────────────────────────────────────
def ai_cascade_decision(cascade_context: dict) -> dict:
    prompt = f"""You are an autonomous AI agent managing blood donation for Blood Warriors NGO.

Current cascade state:
{json.dumps(cascade_context, default=str, indent=2)}

Decide the next action. Reply ONLY with this JSON:
{{
  "action": "WAIT|ADVANCE_STAGE|MARK_FULFILLED|ALERT_ADMIN",
  "reason": "one sentence",
  "urgency": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommended_message": "next WhatsApp message if advancing"
}}"""

    try:
        raw = call_bedrock(prompt, max_tokens=300)
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        return {
            "action":               "WAIT",
            "reason":               f"AI decision error: {str(e)}",
            "urgency":              "MEDIUM",
            "recommended_message":  ""
        }