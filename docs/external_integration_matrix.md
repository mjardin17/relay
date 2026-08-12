# Relay External Integration Readiness Matrix

## Overview

This document classifies every external integration, adapter, service dependency, and infrastructure interface in the Relay platform. Each integration is mapped to its current operational state, local verification level, production readiness, and required human credentials or external dependencies.

---

## Integration Classification Table

| Integration / Subsystem | Current State | Local Verification | Production Verification | Blockers / Required Human Action |
| :--- | :--- | :--- | :--- | :--- |
| **Google OAuth Client** | `SIMULATED` | Local Token Mock (`token_owner_tenant1`) | `UNVERIFIED` | Google Cloud Console OAuth Client ID, Client Secret, OAuth Consent Screen verification. |
| **Google Business Profile API** | `SIMULATED` | Boundary Suite Mock (9/9 PASS) | `UNVERIFIED` | Google Business Profile API enablement, OAuth scopes (`https://www.googleapis.com/auth/business.manage`), Account Access. |
| **SMS Outbound Dispatch** | `SIMULATED` (`DRY_RUN`) | Electrical Lead Suite Mock (17/17 PASS) | `UNVERIFIED` | Twilio / Telnyx API Account SID, Auth Token, Messaging Service SID, 10DLC registration, Owner Authorization. |
| **Database Storage Engine** | `IMPLEMENTED` | Node.js `DatabaseSync` SQLite (`relay.db`) | `LOCAL_ONLY` | Production PostgreSQL / Managed Cloud SQL instance, TLS configuration, migration runner setup. |
| **Job Execution Engine** | `IMPLEMENTED` | Idempotency & Hash Verification (19/19 PASS) | `LOCAL_ONLY` | Production Background Job Queue (BullMQ / Redis / Cloud Tasks) for asynchronous scheduling. |
| **Webhook Ingestion & Signatures**| `IMPLEMENTED` | Secret-Based HMAC Signature Verification | `LOCAL_ONLY` | Ingress TLS cert, public domain mapping, webhook secret provision in environment variables. |

---

## Detailed Adapter Status Summaries

### 1. Google OAuth & Business Profile API
* **Local Behavior**: The application operates in `DRY_RUN` mode. API calls simulate location search, verification status, review aggregation, and post draft creation without contacting Google endpoints.
* **Production Blocker**: Google Workspace OAuth client registration and Google Business Profile API production quota approval are unfulfilled.

### 2. SMS Outbound Telephony
* **Local Behavior**: Outbound SMS responses are drafted, hashed, placed into `pending` approval status, and recorded in `launch_audit_logs`. Execution logs record `DRY_RUN_SIMULATED_SMS_DISPATCH` without sending cellular signals.
* **Production Blocker**: Cellular carrier 10DLC registration and Twilio API keys are not loaded in the container environment.

### 3. Local SQLite Database vs. Production SQL
* **Local Behavior**: Relies on Node.js native `node:sqlite` (`DatabaseSync`) reading/writing `relay.db` with full foreign key constraints, WAL mode, and atomic transactions.
* **Production Blocker**: For multi-container scaling, production SQLite or managed Cloud SQL PostgreSQL must be configured.

---

## Adapter Mode Safety Rules

1. **Automatic Fail-Closed Simulation**: If external API credentials (`GOOGLE_CLIENT_ID`, `TWILIO_ACCOUNT_SID`) are absent or invalid, adapters MUST default to `DRY_RUN` simulation mode.
2. **Explicit Mode Header/Property**: All API responses and audit event records MUST explicitly set `executionMode: "simulated"` or `executionMode: "production"`.
3. **No Unauthenticated Dispatches**: Under no circumstances will a simulated adapter claim live execution or count simulated leads as settled actual revenue.
