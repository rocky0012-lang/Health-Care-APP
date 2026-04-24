# NetCareFlow System Architecture and User Workflow

## 1. Project Overview

### Mission
NetCareFlow is a healthcare operations platform focused on reducing care friction across three core journeys:

- Patient access and appointment scheduling
- Clinical record visibility (vitals, diagnoses, prescriptions)
- Institutional management for administrators and practitioners

The platform is designed as a role-aware, portal-based system where each user type (Patient, Doctor, Admin) experiences a purpose-built workflow.

### Product Scope

- Public landing experience at `/landingPage` for discovery and onboarding
- Patient portal for profile completion, appointments, records, messages, and billing preferences
- Doctor portal for schedule management and clinical documentation
- Admin portal for doctor onboarding, operational oversight, and governance workflows
- Support capabilities through email notifications and AI-assisted patient guidance

### Core Outcomes

- Shorten the path from account creation to booked appointment
- Improve continuity and quality of medical record updates
- Ensure institution-level control with secure role-based access

---

## 2. Authentication Workflow

### Entry and Route Flow

- Root route `/` redirects to `/landingPage` while preserving query parameters.
- Landing page supports admin passkey launch (`?admin=true`) and standard user onboarding links.

### Session Model

Authentication is implemented using signed, role-typed HTTP-only cookies:

- `netcare_admin_access`
- `netcare_doctor_session`
- `netcare_patient_session`
- `netcare_patient_pending`

These tokens are HMAC-signed, include expiry, and are verified at the edge in request guards.

### Patient Registration and Login

1. Patient signs up from `/auth/signup`.
2. `createUser` creates the Appwrite user account.
3. System starts a pending patient session (`patient-pending`) until profile registration is completed.
4. Patient registration flow is scoped to `/patients/[userId]/register`.
5. On completion, session is promoted to active patient (`patient`).
6. Patient is routed into `/patientsDashboard`.

### Secure Transition from Landing to Portal

- Landing page CTAs route users to `/auth/signup` or `/auth/login`.
- Session creation and route access are enforced via signed cookies plus edge guard logic.
- Protected routes are redirected to login/root when required role tokens are missing.

### Multi-Role Login Behavior

- Unified login flow determines role (doctor/patient) and applies role-specific session creation.
- Doctor users are routed to `/doctor/dashboard`.
- Patient users are routed to profile completion or dashboard based on registration state.

---

## 3. Patient Journey

### Step-by-Step Journey

1. Discover platform on `/landingPage`.
2. Create account on `/auth/signup`.
3. Complete profile on `/patients/[userId]/register`.
4. Enter patient dashboard at `/patientsDashboard`.
5. Navigate appointments, records, billing, and messages.

### Dashboard Navigation

Patient shell presents dedicated routes:

- `/patientsDashboard`
- `/patientsDashboard/appointments`
- `/patientsDashboard/records`
- `/patientsDashboard/billing`
- `/patientsDashboard/messages`

### Viewing Vitals and Clinical History

Patient records aggregate from Appwrite-backed data services:

- Vitals timeline
- Diagnoses
- Prescriptions
- Appointment-linked history

Data retrieval patterns are parallelized to reduce waiting time and improve dashboard responsiveness.

### Booking Appointments with Specialists

Booking flow is implemented in patient appointments journey:

1. Load active doctor roster and patient context.
2. Select practitioner and time slot.
3. Submit appointment request.
4. Appointment appears in patient timeline and admin/doctor views.

Patients can also manage future appointments and see booking status updates.

---

## 4. Administrative Management

### Admin Access

- Admin access is passkey-gated and session-backed.
- Unauthorized admin route requests are redirected to landing with admin mode query.

### Core Admin Responsibilities

- Create and provision doctor accounts
- Maintain provider records and status
- Oversee appointments and institutional reporting
- Configure platform-level operational settings

### Doctor Account Provisioning Flow

1. Admin creates doctor account credentials.
2. System creates Appwrite user + doctor record.
3. Doctor welcome email is sent with login credentials and portal URL.
4. Doctor can access `/doctor/login` and complete secure onboarding.

### Data Oversight

Admin pages provide visibility into:

- Patient and doctor datasets
- Appointment operations
- Reports and high-level platform health indicators

---

## 5. Practitioner Workflow

### Doctor Authentication and Entry

- Doctors authenticate via `/doctor/login`.
- Session token (`netcare_doctor_session`) is required for protected doctor routes.

### Doctor Portal Navigation

Typical route map:

- `/doctor/dashboard`
- `/doctor/appointments`
- `/doctor/patients`
- `/doctor/schedule`
- `/doctor/profile`
- `/doctor/settings`

### Schedule Management

Doctors maintain weekly availability and appointment handling through schedule workflows and appointment modules.

### Clinical Record Authoring

Doctors update patient records through structured actions for:

- Prescriptions
- Vitals
- Diagnoses

These updates are persisted in dedicated Appwrite data tables and surfaced back to patient and admin views.

---

## 6. Technical Infrastructure

### Frontend and Application Layer

- Framework: Next.js App Router (TypeScript)
- UI: React + componentized route shells by role
- Routing: static + dynamic routes with edge-protected areas

### Appwrite Services

NetCareFlow integrates Appwrite as the primary backend platform:

- Auth/User identity via `Users` and session/cookie orchestration
- Database/Tables via `TablesDB` and domain table IDs
- File storage via `Storage` for patient/clinical artifacts
- Messaging for institution-style notification emails
- Functions for externalized service logic (including AI support invocation)

### Email/Notification Architecture

The platform uses dual-capability notification paths:

- Appwrite Messaging templates (transactional platform notices)
- Branded outbound emails (e.g., onboarding and support workflows)

This allows operational notifications and user-facing branded communication to evolve independently.

### AI Assistant Integration

Patient support assistant is exposed at `POST /api/patient-assistant`:

- Builds contextual snapshot from patient records, appointments, billing, and clinical data
- Attempts AI function execution via Appwrite Functions when configured
- Falls back to deterministic local assistant responses when AI path or dependencies are unavailable
- Returns structured payload (`reply`, optional matches/filter, fallback indicator)

### Reliability and Security Controls

- Retry wrappers for transient Appwrite/network failures
- Signed auth cookies with expiry and typed scopes
- Role-based route guards at edge middleware
- Degraded-mode assistant responses to avoid hard failures in patient UX

---

## Recommended Documentation Placement

For portfolio and stakeholder handover, this architecture document should be maintained as a dedicated file (this file), with the README linking to it as an index entry.

- README remains concise for quick project orientation.
- Architecture/workflow doc remains detailed for delivery, handover, audits, and onboarding.
