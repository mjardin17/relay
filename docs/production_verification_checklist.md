# Relay Production Verification Checklist

## Overview

This checklist outlines the exact step-by-step human actions required for Joshua and the system owner to transition Relay from guided-manual local verification to a live production-verified deployment.

---

## Pre-Requisite Action Checklist for Joshua / System Owner

### Step 1: Google Cloud & OAuth Credential Provisioning
- [ ] Log in to Google Cloud Console and select/create the Relay Production GCP Project.
- [ ] Enable the **Google Business Profile Performance API** and **My Business Business Information API**.
- [ ] Configure the OAuth Consent Screen:
  - App Name: `Relay Growth Engine`
  - Support Email: `joshua@relay.com` (or designated owner email)
  - Scopes requested: `https://www.googleapis.com/auth/business.manage`
- [ ] Create an OAuth 2.0 Web Application Client ID:
  - Authorized Redirect URIs: `https://app.relay.com/api/auth/google/callback`
- [ ] Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to production environment variables.

### Step 2: Telephony & Outbound SMS Credentials
- [ ] Register Relay business entity for 10DLC (10-Digit Long Code) Brand & Campaign registration.
- [ ] Provision Twilio / Telnyx Account SID and Auth Token.
- [ ] Configure outbound Messaging Service SID with opt-out keywords (`STOP`, `UNSUBSCRIBE`).
- [ ] Set environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_MESSAGING_SERVICE_SID`

### Step 3: Production Managed Database Setup
- [ ] Provision Cloud SQL PostgreSQL or managed SQLite cluster with SSL/TLS enforced.
- [ ] Apply database migration schema (`initializeDatabaseSchema`).
- [ ] Configure connection string in `DATABASE_URL`.
- [ ] Verify automated database backup and point-in-time recovery schedule (24-hour RPO).

### Step 4: Security & KMS Column-Level Encryption
- [ ] Configure Cloud KMS or HashiCorp Vault key ring for encrypting PII at rest.
- [ ] Set `RELAY_ENCRYPTION_KEY` in production secrets manager.
- [ ] Ensure non-root container execution and strict HTTPS/TLS 1.3 termination.

### Step 5: Guided Pilot Execution Protocol
- [ ] Execute initial pilot run in `DRY_RUN` mode for first 5 test leads.
- [ ] Manually inspect draft response hashes in `launch_approvals` table.
- [ ] Perform 1 live operator approval via human dashboard.
- [ ] Confirm single live outbound SMS delivery to authorized internal test device.
- [ ] Verify corresponding audit log in `launch_audit_logs`.
- [ ] Run full release audit (`npx tsx scripts/run-release-audit.ts`) and confirm zero privacy gate violations.
