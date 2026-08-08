# Decision Log: Empire OS Relay v2.0 Growth Engine

## Architecture Decisions

### Decision 1: Use `node:sqlite` over `better-sqlite3`
- **Context**: `better-sqlite3` native compilation failed during npm build in the Linux execution container.
- **Decision**: Standardized on Node v20 built-in `node:sqlite` (`DatabaseSync`).
- **Impact**: Zero external native dependencies required; clean cross-platform execution and fast startup.

### Decision 2: Express Server + Client API Layer
- **Context**: Node native modules cannot be bundled into browser Vite SPA builds.
- **Decision**: Placed SQLite persistence service in Express backend (`server.ts` + `/api/growth/*`). Frontend `GrowthEvidenceEngine` communicates with API while keeping local fallback state.
- **Impact**: Full separation of concerns, browser compatibility, and real HTTP API communication.

### Decision 3: Append-Only Execution Ledger with Idempotency Unique Constraints
- **Context**: Actions must be traceable, auditable, and idempotent.
- **Decision**: Enforced `idempotency_key TEXT UNIQUE` in `execution_events` SQLite schema.
- **Impact**: Retrying activations or dry-runs returns the existing record without duplicate side-effects.

### Decision 4: Financial Calculation Truth Requirements
- **Context**: UI previously contained hardcoded mock percentages (1420% ROI, 3.5 payback days).
- **Decision**: Dynamic calculation based on actual `actual_realized_monthly_value` and `cost_incurred` in SQLite DB.
- **Impact**: Accurately shows `N/A (Zero Execution Cost)` or `Awaiting Data` when costs/outcomes are zero or absent.
