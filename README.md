# 🩸 BloodBridge — AI-Powered Blood Coordination Platform

> **Every drop counts. Every life matters.**
>
> Built for Blood Warriors Foundation · AI4Good 2.0 Hackathon · Team Walking Warriors

[![Live Demo](https://img.shields.io/badge/Live-Demo-red?style=for-the-badge)](https://bloodbridge.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Swagger-blue?style=for-the-badge)](https://api.bloodbridge.in/docs)
[![AWS](https://img.shields.io/badge/Deployed-AWS-orange?style=for-the-badge)](https://aws.amazon.com)
[![Bedrock](https://img.shields.io/badge/AI-Amazon%20Bedrock-purple?style=for-the-badge)](https://aws.amazon.com/bedrock)

---

## 🎯 The Problem

Blood Warriors Foundation connects voluntary blood donors with over **1,00,000 Thalassemia patients** across India. Each patient requires **500–700 blood transfusions in their lifetime** — every 20–25 days, for life.

Today, this entire coordination runs **manually** — coordinators WhatsApp donors one by one, track responses in spreadsheets, and discover shortages only when emergencies hit. As Blood Warriors scales across cities, this model collapses.

**BloodBridge solves this completely.**

---

## 🚀 What We Built

An autonomous, AI-powered blood coordination system that:

- **Fires automatically** 10 days before every scheduled transfusion
- **Contacts the right donors** ranked by AI scoring — no human needed
- **Reads replies in Telugu, Hindi, Kannada, English** using Amazon Bedrock
- **Escalates through 5 stages** when donors don't respond — automatically
- **Predicts city-level shortages** 14 days before they become emergencies
- **Engages donors personally** with weekly patient updates to prevent churn

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BLOODBRIDGE PLATFORM                       │
├──────────────┬──────────────────┬──────────────┬────────────────┤
│   FRONTEND   │     BACKEND      │   AI LAYER   │   AWS CLOUD    │
│              │                  │              │                │
│  React PWA   │  FastAPI         │  Amazon      │  App Runner    │
│  Dashboard   │  Python 3.11     │  Bedrock     │  Aurora RDS    │
│  Patient     │  SQLAlchemy      │  Claude      │  EventBridge   │
│  Portal      │  APScheduler     │  Haiku 4.5   │  SQS Queues    │
│  Donor       │  Geopy           │              │  SNS Topics    │
│  Portal      │  JWT Auth        │  Intent      │  Amplify       │
│  Register    │  OTP via SNS     │  Parser      │  CloudWatch    │
│  Flow        │  Cascade Engine  │  Analytics   │  Secrets Mgr   │
│              │  RFMTD Scoring   │  Engagement  │                │
└──────────────┴──────────────────┴──────────────┴────────────────┘
```

---

## ✨ Six Capabilities That Make BloodBridge Unique

### 1. 🩸 Blood Family System
Every patient has a permanent group of 4–8 assigned Bridge Donors — their Blood Family. Donors know which patient they are connected to. They receive weekly updates: *"Arjun completed his 23rd transfusion. You contributed to 4 of them."* This creates identity and belonging — the proven reason donors stay long-term. **No existing platform builds donor-patient relationships.**

### 2. ⚡ Predictive Cascade Engine
EventBridge Scheduler fires **10 days before every scheduled transfusion** — automatically, without anyone pressing a button. The cascade contacts Blood Family donors first, waits 24 hours, then backup pool, then expands radius, then checks blood banks, then alerts NGO admin. Each stage uses durable SQS queues — **nothing drops, nothing is lost, even if the server crashes mid-cascade.**

### 3. 🧠 RFMTD Scoring Engine
Donors are ranked by **Recency, Frequency, Message-efficiency, Time-eligibility, Distance + Loyalty Bonus** for Bridge Donors. A donor who confirmed 3 times and showed up every time ranks above a donor who registered yesterday. A donor who hasn't responded in 45 days is flagged as churn risk. **No existing app scores donor reliability.**

### 4. 🌐 Multilingual AI Intent Parsing
When a donor replies to a WhatsApp message in Telugu, Hindi, Kannada, or mixed language, Amazon Bedrock (Claude) parses the intent in under 2 seconds:
- *"Haan bhai aa jaunga"* → **CONFIRMED** (0.98 confidence)
- *"Kal possible nahi"* → **DECLINED** → triggers next cascade stage
- *"Vastanu"* → **CONFIRMED** (Telugu)

**No keyword matching, no language-specific rules, no manual reading by NGO staff.**

### 5. 📍 City Scarcity Forecasting
Every 6 hours, a Lambda recomputes: for each city zone, how many confirmed available donors exist vs how many transfusions are scheduled in the next 14 days. If coverage drops below threshold, the city is flagged **WARNING** or **CRITICAL**. NGO admins can run a targeted donor recruitment drive in Hyderabad 10 days before the shortage hits — **not the morning of.**

### 6. 📋 Full Audit Event Log
Every action — message sent, donor replied, cascade advanced, donation completed — is written to an **append-only** `event_log` table. Nothing is ever deleted or updated, only appended. For a healthcare platform, this is a regulatory requirement. If a patient did not receive blood on time, you can replay exactly what happened, at what time, and why.

---

## 🛠️ Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI (Python 3.11) | REST API, async processing |
| SQLAlchemy + Alembic | ORM, database migrations |
| PostgreSQL / Aurora Serverless v2 | Primary database |
| APScheduler | Local cron jobs (EventBridge in production) |
| Geopy | Dynamic distance scoring (D in RFMTD) |
| JWT + OTP Auth | NGO admin login + donor/patient phone auth |
| Passlib/bcrypt | Password hashing |

### AI Layer
| Technology | Purpose |
|------------|---------|
| Amazon Bedrock (Claude Haiku 4.5) | Multilingual intent parsing |
| Amazon Bedrock (Claude Haiku 4.5) | NGO analytics — Text-to-SQL |
| Amazon Bedrock (Claude Haiku 4.5) | Raksha conversational AI |
| Amazon Bedrock (Claude Haiku 4.5) | Cascade AI decisions |
| Amazon Bedrock Vision | OCR — hospital document form filling |
| Amazon Bedrock | Personalized engagement message generation |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 + Vite 8 | PWA dashboard |
| Recharts | BI charts (bar, donut, line) |
| Leaflet + react-leaflet | Geographic scarcity map |
| React Router v6 | Multi-page routing |
| Axios | API communication |
| Lucide React | Icons |

### AWS Services Used
| Service | How Used |
|---------|---------|
| **App Runner** | Backend deployment — auto-scale, HTTPS |
| **Aurora Serverless v2** | Production PostgreSQL database |
| **Amazon Bedrock** | All AI/ML inference |
| **EventBridge Scheduler** | Cascade triggers, daily engagement |
| **Amazon SQS** | Durable cascade stage queues |
| **Amazon SNS** | OTP SMS + WhatsApp notification routing |
| **AWS Amplify** | Frontend hosting + CI/CD from GitHub |
| **AWS Cognito** | Authentication infrastructure |
| **CloudWatch** | Logging and monitoring |
| **Secrets Manager** | Secure credential storage |
| **Amazon S3** | Static assets and data backups |

---

## 📊 Data Foundation

Built on **Blood Warriors' real operational data**:
- **7,033 real records** — donors, patients, volunteers
- **84 Thalassemia patients** with real transfusion schedules
- **2,061 Bridge Donors** with donation history
- **474 Blood Family relationships** built using RFMTD scoring + blood compatibility
- **8 city zones** clustered by GPS coordinates
- **56 city scarcity records** across blood groups

### RFMTD Scoring Formula
```
Base Score (max 100) = R + F + M + T + Loyalty
  R: Recency    (max 30) — days since last donation
  F: Frequency  (max 25) — total lifetime donations
  M: Message    (max 20) — calls_to_donations_ratio (lower = better)
  T: Time       (max 15) — eligibility status + active status
  Loyalty       (max 10) — Bridge Donor relationship bonus

Final Match Score (max 115) = Base Score + D
  D: Distance   (max 15) — computed dynamically at cascade time
                            relative to patient's location
```

---

## 🔄 Cascade Flow

```
Transfusion scheduled in DB
         │
         ▼ (10 days before — EventBridge fires)
┌─────────────────────┐
│  STAGE 1            │  Contact Blood Family (4-8 assigned donors)
│  BLOOD_FAMILY       │  Message: personalized, multilingual
│  Wait: 24 hours     │  AI reads replies → CONFIRMED / DECLINED
└────────┬────────────┘
         │ (if insufficient confirmations)
         ▼
┌─────────────────────┐
│  STAGE 2            │  Top RFMTD-ranked eligible donors
│  BACKUP_POOL        │  Radius: same city cluster
│  Wait: 12 hours     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  STAGE 3            │  Expand radius to 50km
│  EXPANDED           │  All compatible blood groups
│  Wait: 6 hours      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  STAGE 4            │  Check eRaktKosh blood bank stock
│  BLOOD_BANK         │  Coordinate with nearby blood banks
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  STAGE 5            │  Alert NGO admin dashboard
│  NGO_ALERT          │  CRITICAL notification with full context
└─────────────────────┘
```

---

## 💬 WhatsApp AI Assistant — Raksha

Donors and patients can message the Blood Warriors WhatsApp number in any language. Raksha, powered by Amazon Bedrock, responds:

| Donor Messages | Raksha Responds |
|---------------|-----------------|
| "Haan bhai aa jaunga" (Hindi) | Confirms donation, updates cascade |
| "Nahi yaar busy hun" (Hindi) | Declines, advances cascade to next stage |
| "Vastanu" (Telugu) | Confirms, thanks donor in Telugu |
| "When can I donate again?" | Checks DB, tells exact date |
| "Mera patient kaisa hai?" | Fetches patient status from DB |
| "నా రక్తదానం ఎప్పుడు?" (Telugu) | Responds fully in Telugu |

**No scripted responses. All natural language, all from Bedrock, all from live DB context.**

---

## 🔐 Authentication

| User Type | Method | Redirects To |
|-----------|--------|-------------|
| NGO Admin | Email + Password + JWT | Full dashboard |
| Donor | Phone + WhatsApp OTP | Donor portal |
| Patient/Guardian | Phone + WhatsApp OTP | Patient portal |
| Volunteer | Phone + WhatsApp OTP | Volunteer profile |

First-time users → Registration flow
Returning users → Auto-detected by phone → Portal login

---

## 📱 User Interfaces

### NGO Admin Dashboard
- **Overview** — Live metrics: 84 patients, 5,485 eligible donors, active cascades, critical zones
- **Patients** — List with blood family panel, cascade trigger button
- **Donors** — RFMTD score bars, churn risk filter, role breakdown
- **Cascades** — Live cascade feed with stage progress, AI intent parser demo
- **Scarcity Map** — Leaflet geo map with city zone bubbles (red/yellow/green)
- **AI Analytics** — Natural language DB queries powered by Bedrock Text-to-SQL
- **Audit Log** — Append-only event timeline, filter by event type

### Patient Portal
- Next transfusion date with urgency indicator
- Blood family view — assigned donors with RFMT scores
- Raksha AI chat (floating widget) — in patient's language

### Donor Portal
- Eligibility status and next eligible date
- Bridge Donor badge and patient connection info
- Donation history
- Raksha AI chat (floating widget) — multilingual

### Registration Flow
- 3-step: Select Role → Verify WhatsApp OTP → Fill Details
- OCR upload — scan hospital document, AI pre-fills form
- Supports: Donor, Patient/Guardian, Volunteer

---

## 🚀 Local Development

### Prerequisites
- Docker Desktop
- Python 3.11+
- Node.js 22+
- AWS credentials (for Bedrock)

### Setup

```bash
# Clone repository
git clone https://github.com/mouli005-star/walking-warriors.git
cd walking-warriors

# Environment setup
cp .env.example .env
# Edit .env with your AWS credentials for Bedrock

# Start all services
docker-compose up -d

# Verify containers running
docker ps
# Should show: bloodbridge_backend, bloodbridge_db, bloodbridge_localstack

# Seed database with Blood Warriors real data
pip install psycopg2-binary pandas
python scripts/seed_database.py

# Seed admin account
curl -X POST http://localhost:8000/auth/seed-admin

# Start frontend
cd frontend
npm install
npm run dev
```

### Access Points
| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| NGO Admin Login | admin@bloodwarriors.in / BloodWarriors@2025 |

---

## ☁️ AWS Deployment Architecture

```
Internet
    │
    ▼
┌─────────────────┐      ┌──────────────────────┐
│   AWS Amplify   │      │    App Runner          │
│   (Frontend)    │─────▶│    (Backend API)       │
│   React PWA     │      │    FastAPI + Python    │
└─────────────────┘      └──────────┬─────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │    Aurora    │ │   Amazon     │ │  EventBridge │
           │  Serverless  │ │   Bedrock    │ │  + SQS + SNS │
           │  PostgreSQL  │ │  Claude AI   │ │  Scheduler   │
           └──────────────┘ └──────────────┘ └──────────────┘
```

### Deployment Steps

```bash
# 1. Build and push Docker image to ECR
aws ecr create-repository --repository-name bloodbridge-backend
docker build -t bloodbridge-backend ./backend
docker tag bloodbridge-backend:latest 209556026518.dkr.ecr.us-east-1.amazonaws.com/bloodbridge-backend:latest
docker push 209556026518.dkr.ecr.us-east-1.amazonaws.com/bloodbridge-backend:latest

# 2. Aurora Serverless v2 — create via AWS Console
#    Engine: Aurora PostgreSQL, Min 0.5 ACU, Max 4 ACU

# 3. App Runner — deploy from ECR image
#    Port: 8000, Health check: /health

# 4. Amplify — connect GitHub repo
#    Root: frontend/, Build: npm run build, Output: dist/

# 5. Seed production database
python scripts/seed_database.py  # Update host to Aurora endpoint

# 6. Configure WhatsApp webhook
#    Meta Business → Webhook URL: https://your-apprunner-url/webhook/whatsapp
#    Verify token: bloodbridge2025
```

---

## 📁 Repository Structure

```
walking-warriors/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py          # JWT + OTP authentication
│   │   │   ├── cascade.py       # Cascade + AI + WhatsApp endpoints
│   │   │   ├── donors.py        # Donor CRUD + RFMTD scoring
│   │   │   └── patients.py      # Patient CRUD + blood family
│   │   ├── core/
│   │   │   └── database.py      # SQLAlchemy connection
│   │   ├── models/
│   │   │   └── models.py        # 7 database tables
│   │   └── services/
│   │       ├── ai_engine.py     # Bedrock — all AI calls
│   │       ├── cascade_engine.py # 5-stage cascade logic
│   │       └── engagement.py    # Automated WhatsApp messages
│   ├── Dockerfile
│   ├── main.py                  # FastAPI app + APScheduler
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RakshaChat.jsx   # Floating AI chat widget
│   │   │   └── Sidebar.jsx      # Collapsible navigation
│   │   ├── pages/
│   │   │   ├── Overview.jsx     # NGO dashboard overview
│   │   │   ├── Patients.jsx     # Patient management
│   │   │   ├── Donors.jsx       # Donor management + RFMT
│   │   │   ├── Cascades.jsx     # Cascade engine + intent demo
│   │   │   ├── ScarcityMap.jsx  # Leaflet geo map
│   │   │   ├── AIChat.jsx       # NGO AI analytics chat
│   │   │   ├── AuditLog.jsx     # Event timeline
│   │   │   ├── Login.jsx        # NGO admin login
│   │   │   ├── Register.jsx     # 3-role registration + OTP
│   │   │   ├── UserLogin.jsx    # Donor/patient phone login
│   │   │   ├── PatientPortal.jsx # Patient self-service
│   │   │   └── DonorPortal.jsx  # Donor self-service
│   │   ├── services/
│   │   │   └── api.js           # Axios API client
│   │   └── App.jsx              # Router + layout
│   └── vite.config.js
├── data/
│   ├── donors_clean.csv         # 6,859 cleaned donor records
│   ├── patients_clean.csv       # 84 Thalassemia patients
│   ├── bridge_relationships.csv # 474 blood family pairs
│   ├── city_coverage.json       # 8 city zone scarcity data
│   └── data_summary.json        # Dataset statistics
├── scripts/
│   └── seed_database.py         # Database seeder
├── docker-compose.yml           # Local development stack
├── .env.example                 # Environment template
└── README.md
```

---

## 🗄️ Database Schema

```sql
patients          -- 84 Thalassemia patients with transfusion schedules
donors            -- 6,859 donors with RFMT scores and eligibility
blood_families    -- 474 permanent donor-patient assignments
cascade_runs      -- One per transfusion event, tracks stage progression
cascade_contacts  -- Each donor contacted per cascade with AI scores
event_log         -- Append-only audit trail (never deleted)
city_scarcity     -- Nightly recomputed zone coverage
ngo_admins        -- NGO admin accounts
```

---

## 🧪 Key API Endpoints

```bash
# Authentication
POST /auth/login              # NGO admin login → JWT
POST /auth/send-otp           # Send WhatsApp OTP
POST /auth/verify-otp         # Verify OTP → session

# Patients & Donors
GET  /patients/               # List all patients
GET  /patients/{id}/blood-family  # Patient's blood family
GET  /donors/score/ranked     # Dynamic RFMTD ranked donors

# Cascade Engine
POST /cascade/trigger         # Manually trigger cascade
POST /cascade/runs/{id}/advance   # AI advance cascade stage
POST /cascade/donor-reply     # Process donor response

# AI Layer
POST /ai/parse-intent         # Multilingual intent parsing
POST /ai/ngo-chat             # Natural language DB analytics
POST /ai/chat                 # Raksha conversational AI
POST /ai/ocr-extract          # Document OCR form filling

# WhatsApp
GET  /webhook/whatsapp        # Meta webhook verification
POST /webhook/whatsapp        # Receive & process WhatsApp messages

# Engagement
POST /engagement/run-daily    # Daily automated messages (EventBridge)

# Dashboard
GET  /dashboard/scarcity      # City zone blood availability
GET  /dashboard/audit-log     # Full event timeline
```

---

## 🆚 Why BloodBridge Wins Against Existing Solutions

| Feature | eRaktKosh | Sankalp | Facebook Blood | BloodBridge |
|---------|-----------|---------|---------------|-------------|
| Thalassemia-specific | ❌ | ✅ | ❌ | ✅ |
| Auto cascade trigger | ❌ | ❌ | ❌ | ✅ |
| Blood family system | ❌ | ❌ | ❌ | ✅ |
| Multilingual AI | ❌ | ❌ | ❌ | ✅ |
| Donor reliability scoring | ❌ | ❌ | ❌ | ✅ |
| Churn prediction | ❌ | ❌ | ❌ | ✅ |
| City scarcity forecast | ❌ | ❌ | ❌ | ✅ |
| Audit trail | ❌ | ❌ | ❌ | ✅ |
| WhatsApp-first | ❌ | ❌ | ❌ | ✅ |

---

## 🗺️ Roadmap — Phase 2

- **Amazon Connect + Lex** — Voice calls to donors who don't respond to WhatsApp after 6 hours, in their language
- **ABDM Integration** — Connect with Ayushman Bharat Digital Mission health records
- **SageMaker Model** — Train on 6 months of cascade data to predict donor availability by day, season, location
- **eRaktKosh API** — Live blood bank stock in Stage 4 of cascade
- **Multi-NGO Support** — Sankalp, other regional NGOs onboard with their patient networks

---

## 👨‍💻 Team

**Team Walking Warriors** — AI4Good 2.0 Hackathon

Built with 💙 for Blood Warriors Foundation, Hyderabad

---

## 📄 License

MIT License — Built for social good. Use freely to save lives.

---

*BloodBridge — Connecting blood to life through AI · Every drop counts. Every life matters.*
