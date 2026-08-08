# Production Blockers: Empire OS Relay v2.0

## Critical / Blocking Issues
None currently block the vertical slice implementation.

## Pre-Launch Hardening Recommendations
1. **Authentication Integration**: Currently API endpoints rely on `x-tenant-id` header with fallback to `tenant_demo_1`. Integrate bearer token JWT claims before multi-tenant SaaS deployment.
2. **Real Email Provider SDKs**: Stale Lead Recovery currently operates in dry-run simulation. Wire production SendGrid/Twilio API keys when transitioning out of dry-run mode.
3. **External CRM Webhooks**: Incoming webhook listeners for HubSpot / Salesforce closed-won events should be connected to write directly to `outcome_events` table for live attribution.
