# Relay Rollback & Incident Response Plan

## Overview

This document defines standard operating procedures (SOP) for emergency response, system rollback, data recovery, and containment in the event of an anomaly or security incident.

---

## 1. Emergency Circuit Breakers

Relay contains built-in emergency controls that can be triggered instantly without redeploying code:

### A. Global Emergency Kill Switch
* **Action**: Set environment variable `RELAY_EMERGENCY_STOP=true`.
* **Effect**: Instantly blocks all outbound execution requests (`/api/growth/electrical-leads/*/execute`), returning `503 Service Unavailable`.
* **Audit**: Records `emergency_stop_triggered` event in `launch_audit_logs`.

### B. Single-Tenant Isolation Lock
* **Action**: Update tenant status in `tenants` database table to `suspended`:
  `UPDATE tenants SET status = 'suspended' WHERE id = 'tenant_id_to_isolate';`
* **Effect**: All subsequent API calls for that tenant are immediately rejected with `403 Forbidden`.

---

## 2. Automated Rollback Procedures

If a deployment introduces a defect or fails a release gate in production:

1. **Immediate Container Rollback**:
   - Revert traffic routing in Cloud Run / container orchestrator to the previous verified container revision.
   - Execution command: `gcloud run services update-traffic relay-service --to-revisions=PREVIOUS_REVISION=100`
2. **Database Rollback**:
   - If a migration caused database schema instability, execute down migration or restore SQLite / Cloud SQL point-in-time snapshot.
3. **Draft Approval Invalidation**:
   - Invalidate all active approved response hashes to force human re-review:
     `UPDATE electrical_leads SET approval_status = 'pending' WHERE approval_status = 'approved';`

---

## 3. Incident Response Escalation Matrix

| Severity | Definition | Target Resolution Time | Primary Responder | Escalation Contact |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Unapproved response dispatch or privacy leak | < 15 minutes | Lead Security Engineer | Joshua / System Owner |
| **SEV-2 (High)** | Cross-tenant data leak attempt or auth failure | < 1 hour | Backend Lead | Lead Security Engineer |
| **SEV-3 (Medium)** | Financial metric discrepancy or calculation error | < 4 hours | Financial Workflow Engineer | Product Owner |
| **SEV-4 (Low)** | Minor UI or non-blocking logging issue | < 24 hours | On-Call Engineer | Engineering Lead |

---

## 4. Post-Incident Review Protocol

1. Preserve log files (`captured_stdout.log`, `captured_stderr.log`, `launch_audit_logs`).
2. Execute the Privacy Gate Scanner (`npx tsx scripts/verify-privacy-gate.ts`).
3. Conduct root-cause analysis (RCA) and document corrective action items.
4. Update unit test boundary suites to prevent regression.
