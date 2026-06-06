import os
import json
import datetime
import psycopg2
import pandas as pd
from psycopg2.extras import execute_values

CONN = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="bloodbridge",
    user="bloodbridge_user",
    password="bloodbridge_pass"
)
CURSOR = CONN.cursor()

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

def safe_val(val):
    """Convert NaN/NaT to None for postgres"""
    if pd.isna(val):
        return None
    return val


def safe_date(val):
    """Convert pandas timestamp to python datetime"""
    if pd.isna(val):
        return None
    try:
        return pd.Timestamp(val).to_pydatetime()
    except:
        return None


def safe_float(val):
    if pd.isna(val):
        return None
    return float(val)


def safe_int(val):
    if pd.isna(val):
        return None
    return int(val)


def safe_bool(val):
    if pd.isna(val):
        return False
    return bool(val)

# ── SEED PATIENTS ────────────────────────────────────────────────────────
print("Seeding patients...")
patients = pd.read_csv(os.path.join(DATA_DIR, 'patients_clean.csv'))

patient_rows = []
for _, row in patients.iterrows():
    patient_rows.append((
        str(row['patient_uuid']),
        safe_val(row.get('blood_group')),
        safe_val(row.get('required_blood_group')),
        safe_val(row.get('gender')),
        safe_float(row.get('latitude')),
        safe_float(row.get('longitude')),
        safe_bool(row.get('has_location')),
        safe_float(row.get('quantity_required')),
        safe_date(row.get('last_transfusion_date')),
        safe_date(row.get('expected_next_transfusion_date')),
        safe_int(row.get('frequency_in_days')),
        safe_date(row.get('registration_date')),
        safe_int(row.get('city_cluster')),
        safe_val(row.get('status')) or 'active',
    ))

execute_values(CURSOR, """
    INSERT INTO patients (
        id, blood_group, required_blood_group, gender,
        latitude, longitude, has_location,
        quantity_required, last_transfusion_date,
        expected_next_transfusion_date, frequency_in_days,
        registration_date, city_cluster, status
    ) VALUES %s
    ON CONFLICT (id) DO NOTHING
""", patient_rows)
CONN.commit()
print(f"  ✓ {len(patient_rows)} patients seeded")


# ── SEED DONORS ──────────────────────────────────────────────────────────
print("Seeding donors...")
donors = pd.read_csv(os.path.join(DATA_DIR, 'donors_clean.csv'))

donor_rows = []
for _, row in donors.iterrows():
    donor_rows.append((
        str(row['donor_uuid']),
        safe_val(row.get('role')),
        safe_val(row.get('blood_group')),
        safe_val(row.get('gender')),
        safe_float(row.get('latitude')),
        safe_float(row.get('longitude')),
        safe_bool(row.get('has_location')),
        safe_val(row.get('donor_type')),
        safe_date(row.get('registration_date')),
        safe_date(row.get('last_donation_date')),
        safe_date(row.get('next_eligible_date')),
        safe_date(row.get('last_contacted_date')),
        safe_float(row.get('donations_till_date')),
        safe_val(row.get('eligibility_status')) or 'eligible',
        safe_int(row.get('total_calls')) or 0,
        safe_float(row.get('calls_to_donations_ratio')),
        safe_int(row.get('cycle_of_donations')) or 90,
        safe_val(row.get('active_status')) or 'Active',
        safe_float(row.get('base_rfmt_score')) or 0.0,
        safe_val(row.get('churn_risk')) or 'LOW',
        safe_int(row.get('city_cluster')),
        safe_val(row.get('status')) or 'active',
    ))

# Insert in batches of 500
batch_size = 500
for i in range(0, len(donor_rows), batch_size):
    batch = donor_rows[i:i+batch_size]
    execute_values(CURSOR, """
        INSERT INTO donors (
            id, role, blood_group, gender,
            latitude, longitude, has_location,
            donor_type, registration_date,
            last_donation_date, next_eligible_date,
            last_contacted_date, donations_till_date,
            eligibility_status, total_calls,
            calls_to_donations_ratio, cycle_of_donations,
            active_status, base_rfmt_score, churn_risk,
            city_cluster, status
        ) VALUES %s
        ON CONFLICT (id) DO NOTHING
    """, batch)
    CONN.commit()
    print(f"  batch {i//batch_size + 1} done ({min(i+batch_size, len(donor_rows))}/{len(donor_rows)})")

print(f"  ✓ {len(donor_rows)} donors seeded")


# ── SEED BLOOD FAMILIES ──────────────────────────────────────────────────
print("Seeding blood families...")
bridges = pd.read_csv(os.path.join(DATA_DIR, 'bridge_relationships.csv'))

# Only insert bridges where both donor and patient exist in DB
CURSOR.execute("SELECT id FROM donors")
donor_ids = set(r[0] for r in CURSOR.fetchall())

CURSOR.execute("SELECT id FROM patients")
patient_ids = set(r[0] for r in CURSOR.fetchall())

bridge_rows = []
for _, row in bridges.iterrows():
    d_id = str(row['donor_uuid'])
    p_id = str(row['patient_uuid'])
    if d_id in donor_ids and p_id in patient_ids:
        bridge_rows.append((
            d_id,
            p_id,
            safe_val(row.get('donor_blood_group')),
            safe_bool(row.get('bridge_active')),
            safe_date(row.get('last_bridge_donation_date')),
        ))

if bridge_rows:
    execute_values(CURSOR, """
        INSERT INTO blood_families (
            donor_id, patient_id, donor_blood_group,
            bridge_active, last_bridge_donation_date
        ) VALUES %s
    """, bridge_rows)
    CONN.commit()
print(f"  ✓ {len(bridge_rows)} blood family relationships seeded")


# ── SEED CITY SCARCITY ───────────────────────────────────────────────────
print("Seeding city scarcity...")
coverage = pd.read_csv(os.path.join(DATA_DIR, 'city_coverage.csv'))

scarcity_rows = []
for _, row in coverage.iterrows():
    cluster = safe_int(row.get('city_cluster'))
    bg      = safe_val(row.get('blood_group'))
    count   = safe_int(row.get('eligible_donor_count')) or 0

    if cluster is None or bg is None:
        continue

    # Simple scarcity logic seeded from Colab data
    # Nightly Lambda will recompute this dynamically
    if count < 5:
        warning = 'CRITICAL'
    elif count < 10:
        warning = 'WARNING'
    else:
        warning = 'OK'

    scarcity_rows.append((
        cluster, bg, count, 0, 0.0, warning
    ))

execute_values(CURSOR, """
    INSERT INTO city_scarcity (
        city_cluster, blood_group, eligible_donor_count,
        scheduled_transfusions_14d, coverage_ratio, warning_level
    ) VALUES %s
""", scarcity_rows)
CONN.commit()
print(f"  ✓ {len(scarcity_rows)} city scarcity records seeded")


# ── SEED INITIAL EVENT LOG ───────────────────────────────────────────────
print("Seeding initial event log...")
CURSOR.execute("""
    INSERT INTO event_log (event_type, entity_type, entity_id, payload)
    VALUES (%s, %s, %s, %s)
""", (
    'SYSTEM_SEED',
    'system',
    'initial',
    json.dumps({
        'message': 'Database seeded from Blood Warriors dataset',
        'patients': len(patient_rows),
        'donors': len(donor_rows),
        'blood_families': len(bridge_rows),
        'seeded_at': datetime.datetime.now().isoformat()
    })
))
CONN.commit()
print("  ✓ Seed event logged")


# ── FINAL VERIFICATION ───────────────────────────────────────────────────
print()
print("=== FINAL VERIFICATION ===")
for table in ['patients','donors','blood_families','cascade_runs',
              'cascade_contacts','event_log','city_scarcity']:
    CURSOR.execute(f"SELECT COUNT(*) FROM {table}")
    count = CURSOR.fetchone()[0]
    print(f"  {table}: {count} rows")

CURSOR.close()
CONN.close()
print()
print("✓ PHASE 1 COMPLETE — Database fully seeded")
print("✓ Ready for Phase 2 — Core Backend APIs")
