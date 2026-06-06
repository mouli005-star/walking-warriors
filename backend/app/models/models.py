from sqlalchemy import (
    Column, String, Float, Integer, Boolean, 
    DateTime, Text, ForeignKey, Enum
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class BloodGroup(str, enum.Enum):
    A_POS    = "A Positive"
    A_NEG    = "A Negative"
    B_POS    = "B Positive"
    B_NEG    = "B Negative"
    AB_POS   = "AB Positive"
    AB_NEG   = "AB Negative"
    O_POS    = "O Positive"
    O_NEG    = "O Negative"
    UNKNOWN  = "Unknown"
    BOMBAY   = "Bombay"

class CascadeStage(str, enum.Enum):
    BLOOD_FAMILY  = "BLOOD_FAMILY"   # Stage 1: assigned bridge donors
    BACKUP_POOL   = "BACKUP_POOL"    # Stage 2: high RFMT eligible donors
    EXPANDED      = "EXPANDED"       # Stage 3: wider radius, other blood groups
    BLOOD_BANK    = "BLOOD_BANK"     # Stage 4: check eRaktKosh stock
    NGO_ALERT     = "NGO_ALERT"      # Stage 5: human admin intervention

class CascadeStatus(str, enum.Enum):
    PENDING    = "PENDING"
    ACTIVE     = "ACTIVE"
    FULFILLED  = "FULFILLED"
    FAILED     = "FAILED"

class DonorResponse(str, enum.Enum):
    CONFIRMED  = "CONFIRMED"
    DECLINED   = "DECLINED"
    RESCHEDULE = "RESCHEDULE"
    NO_REPLY   = "NO_REPLY"
    UNCLEAR    = "UNCLEAR"

class ChurnRisk(str, enum.Enum):
    LOW            = "LOW"
    MEDIUM         = "MEDIUM"
    HIGH           = "HIGH"
    NOT_APPLICABLE = "NOT_APPLICABLE"

# ── PATIENTS ────────────────────────────────────────────────────────────
class Patient(Base):
    __tablename__ = "patients"

    id                           = Column(String, primary_key=True)  # patient_uuid from CSV
    name                         = Column(String, nullable=True)
    guardian_name                = Column(String, nullable=True)
    phone                        = Column(String, nullable=True)   # Guardian WhatsApp
    age                          = Column(Integer, nullable=True)
    hospital_name                = Column(String, nullable=True)
    blood_group                  = Column(String, nullable=True)
    required_blood_group         = Column(String, nullable=True)
    gender                       = Column(String, nullable=True)
    latitude                     = Column(Float, nullable=True)   # used for dynamic D score
    longitude                    = Column(Float, nullable=True)   # used for dynamic D score
    has_location                 = Column(Boolean, default=False)
    quantity_required            = Column(Float, nullable=True)
    last_transfusion_date        = Column(DateTime, nullable=True)
    expected_next_transfusion_date = Column(DateTime, nullable=True)  # triggers cascade
    frequency_in_days            = Column(Integer, nullable=True)
    registration_date            = Column(DateTime, nullable=True)
    city_cluster                 = Column(Integer, nullable=True)
    status                       = Column(String, default="active")
    churn_risk                   = Column(String, default="LOW")
    created_at                   = Column(DateTime, server_default=func.now())
    updated_at                   = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    cascade_runs   = relationship("CascadeRun", back_populates="patient")
    blood_families = relationship("BloodFamily", back_populates="patient")

# ── DONORS ──────────────────────────────────────────────────────────────
class Donor(Base):
    __tablename__ = "donors"

    id                     = Column(String, primary_key=True)  # donor_uuid from CSV
    name                   = Column(String, nullable=True)
    phone                  = Column(String, nullable=True)   # WhatsApp number
    age                    = Column(Integer, nullable=True)
    role                   = Column(String, nullable=False)    # Bridge Donor / Emergency Donor / Guest
    blood_group            = Column(String, nullable=True)
    gender                 = Column(String, nullable=True)
    latitude               = Column(Float, nullable=True)      # stored for dynamic D score at cascade
    longitude              = Column(Float, nullable=True)      # stored for dynamic D score at cascade
    has_location           = Column(Boolean, default=False)
    donor_type             = Column(String, nullable=True)
    registration_date      = Column(DateTime, nullable=True)
    last_donation_date     = Column(DateTime, nullable=True)
    next_eligible_date     = Column(DateTime, nullable=True)
    last_contacted_date    = Column(DateTime, nullable=True)
    donations_till_date    = Column(Float, nullable=True)
    eligibility_status     = Column(String, default="eligible")
    total_calls            = Column(Integer, default=0)
    calls_to_donations_ratio = Column(Float, nullable=True)
    cycle_of_donations     = Column(Integer, default=90)
    active_status          = Column(String, default="Active")
    base_rfmt_score        = Column(Float, default=0.0)        # R+F+M+T+Loyalty, max 100
    churn_risk             = Column(String, default="LOW")
    city_cluster           = Column(Integer, nullable=True)
    status                 = Column(String, default="active")
    created_at             = Column(DateTime, server_default=func.now())
    updated_at             = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    blood_families      = relationship("BloodFamily", back_populates="donor")
    cascade_contacts    = relationship("CascadeContact", back_populates="donor")

# ── BLOOD FAMILY (donor-patient permanent assignment) ────────────────────
class BloodFamily(Base):
    __tablename__ = "blood_families"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    donor_id                = Column(String, ForeignKey("donors.id"), nullable=False)
    patient_id              = Column(String, ForeignKey("patients.id"), nullable=False)
    donor_blood_group       = Column(String, nullable=True)
    bridge_active           = Column(Boolean, default=True)
    last_bridge_donation_date = Column(DateTime, nullable=True)
    created_at              = Column(DateTime, server_default=func.now())

    donor   = relationship("Donor",   back_populates="blood_families")
    patient = relationship("Patient", back_populates="blood_families")

# ── CASCADE RUN (one per transfusion event) ──────────────────────────────
class CascadeRun(Base):
    __tablename__ = "cascade_runs"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    patient_id          = Column(String, ForeignKey("patients.id"), nullable=False)
    transfusion_date    = Column(DateTime, nullable=False)
    current_stage       = Column(String, default=CascadeStage.BLOOD_FAMILY)
    status              = Column(String, default=CascadeStatus.PENDING)
    units_needed        = Column(Float, nullable=True)
    units_confirmed     = Column(Float, default=0.0)
    triggered_at        = Column(DateTime, server_default=func.now())
    fulfilled_at        = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient  = relationship("Patient", back_populates="cascade_runs")
    contacts = relationship("CascadeContact", back_populates="cascade_run")

# ── CASCADE CONTACT (each donor contacted per cascade) ───────────────────
class CascadeContact(Base):
    __tablename__ = "cascade_contacts"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    cascade_run_id   = Column(Integer, ForeignKey("cascade_runs.id"), nullable=False)
    donor_id         = Column(String, ForeignKey("donors.id"), nullable=False)
    stage            = Column(String, nullable=False)
    base_rfmt_score  = Column(Float, nullable=True)   # snapshot at time of contact
    distance_km      = Column(Float, nullable=True)   # dynamic D calculation
    d_score          = Column(Float, nullable=True)   # 0-15 pts
    final_score      = Column(Float, nullable=True)   # base_rfmt + d_score
    message_sent     = Column(Text, nullable=True)
    raw_reply        = Column(Text, nullable=True)    # exact donor reply text
    parsed_intent    = Column(String, nullable=True)  # Bedrock output
    response         = Column(String, nullable=True)  # CONFIRMED/DECLINED/etc
    contacted_at     = Column(DateTime, server_default=func.now())
    replied_at       = Column(DateTime, nullable=True)

    cascade_run = relationship("CascadeRun", back_populates="contacts")
    donor       = relationship("Donor",      back_populates="cascade_contacts")

# ── EVENT LOG (append-only audit trail — nothing ever deleted) ───────────
class EventLog(Base):
    __tablename__ = "event_log"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    event_type  = Column(String, nullable=False)   # CASCADE_TRIGGERED, DONOR_REPLIED, etc
    entity_type = Column(String, nullable=True)    # patient / donor / cascade_run
    entity_id   = Column(String, nullable=True)
    payload     = Column(Text, nullable=True)      # JSON string of full event data
    created_at  = Column(DateTime, server_default=func.now())
    # NEVER add UPDATE or DELETE operations on this table
    # This is the regulatory audit trail

# ── CITY SCARCITY SNAPSHOT (updated nightly by Lambda) ──────────────────
class CityScarcity(Base):
    __tablename__ = "city_scarcity"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    city_cluster         = Column(Integer, nullable=False)
    blood_group          = Column(String, nullable=False)
    eligible_donor_count = Column(Integer, default=0)
    scheduled_transfusions_14d = Column(Integer, default=0)
    coverage_ratio       = Column(Float, default=0.0)  # eligible/scheduled
    warning_level        = Column(String, default="OK")  # OK / WARNING / CRITICAL
    computed_at          = Column(DateTime, server_default=func.now())


class NGOAdmin(Base):
    __tablename__ = "ngo_admins"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role          = Column(String, default="admin")
    created_at    = Column(DateTime, server_default=func.now())
