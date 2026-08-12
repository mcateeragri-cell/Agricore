# ADR-001 — AgriCore Platform Core Services

## Status
Accepted for Platform Pack 1.

## Context
AgriCore already contains working domain modules (Workshop, Stock, Billing, Communications, Atlas Intelligence and Enterprise Sales). As the platform grows, cross-cutting concerns such as authorisation, audit logging, event emission and background queue handling must not be reimplemented separately in each module.

## Decision
Introduce `lib/platform/core` as the shared home for cross-cutting platform services.

- `authorisation.ts` — shared company/platform administration checks.
- `audit.ts` — one audit writer using the existing `data_management_audit` table.
- `events.ts` — one application-level event emitter into the existing `atlas_events` stream.
- `queue.ts` — one queue claim/complete/retry/prune API backed by the existing Atlas queue RPCs and table.

Atlas remains the intelligence/background subsystem, but it consumes the shared Platform Core services instead of owning duplicate infrastructure.

## Compatibility
This pack deliberately does not rename database tables or remove existing Atlas triggers. Existing operational capture continues working. The refactor is additive and backwards-compatible.

## Consequences
Future Finance, Enterprise and Automation work should use Platform Core instead of adding new permission/audit/event/queue implementations.
