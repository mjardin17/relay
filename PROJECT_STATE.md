# Project State: Empire OS Relay v2.0 Growth Engine

## System Status
- **Phase**: Phase 3 (Durable Foundation Verified)
- **Runtime**: Node.js v20 (Express + Vite + SQLite via `node:sqlite`)
- **Persistence Layer**: Native `node:sqlite` database (`relay.db`) with foreign key enforcement and WAL mode enabled.
- **Backend API**: Express router (`/api/growth/*`) serving durable CRUD and engine operations.
- **Automated Test Suite**: Passed 9/9 tests via `npm test` (`src/tests/growth.test.ts`).
- **Compilation**: Clean TypeScript build (`compile_applet` passed, `lint_applet` clean).

## Key Components
1. **Database Layer (`src/db/database.ts`)**: SQLite schema for 15 core entities (tenants, leads, opportunities, approval_requests, execution_events, outcome_events, attribution_records, suppression_decisions, audit_events, etc.).
2. **Growth Persistence Service (`src/services/growthPersistenceService.ts`)**: Data access layer enforcing tenant isolation, state transitions, idempotency keys, and ROI calculations.
3. **Stale Lead Recovery Engine (`src/services/staleLeadRecoveryEngine.ts`)**: Business logic engine performing dry-runs, suppression rule checks, audience filtering, and execution logging.
4. **Growth API Router (`src/routes/growthApi.ts`)**: Express endpoints powering frontend UI components.
5. **UI Integration (`src/services/growthEvidenceEngine.ts`)**: Client-side API client maintaining instant cached rendering while syncing state with Express endpoints.
