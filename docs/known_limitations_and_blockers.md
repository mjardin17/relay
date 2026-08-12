# Relay Known Limitations & Production Blockers

## Overview

This document explicitly details the known technical limitations, architectural constraints, and external production blockers for the current Relay release candidate.

---

## Technical Limitations & Environmental Constraints

### 1. External Integrations Are Currently Simulated (`DRY_RUN`)
* **Current State**: Google Business Profile location discovery, review management, profile updates, and SMS dispatches execute in local `DRY_RUN` simulation mode.
* **Impact**: No real external API traffic is generated, and no real customer devices are messaged until production credentials and owner authorization are loaded.

### 2. SQLite In-Process Database
* **Current State**: The local implementation uses `node:sqlite` (`DatabaseSync`) backed by `relay.db`.
* **Impact**: Suitable for single-instance, guided-manual pilot deployments. Multi-region scaling or multi-pod container deployments require transitioning to a managed relational store (e.g., Cloud SQL PostgreSQL).

### 3. SHA-256 Approval Binding Scope
* **Current State**: Human approval is bound to the normalized SHA-256 hash of the proposed response draft.
* **Impact**: SHA-256 hash matching provides **content integrity binding**, preventing modified drafts from executing. It is **not** asymmetric digital signature cryptography, identity proofing, or non-repudiation.

### 4. Direct SMS Carrier Delivery Limits
* **Current State**: Outbound SMS throttling and carrier compliance filtering rely on internal rate-limiting queues.
* **Impact**: High-volume messaging (>10 messages/sec) requires 10DLC campaign vetting and carrier queue management.

---

## Mandatory Status Statement

> “Relay’s Google Business Profile Launch and Electrical Company workflows have been locally verified for guided-manual use only. Real Google discovery, OAuth authorization, profile creation or claiming, verification, publishing, review management, external SMS dispatch, and production behavior remain unverified.”
