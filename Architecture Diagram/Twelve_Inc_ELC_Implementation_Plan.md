# Twelve Inc. ELC B2B Customer Portal - Implementation Plan

This is a proposed delivery plan only; no development has been performed.

## Phase 0 - Discovery and tenant validation

- Obtain preview/authenticated access and deployed PHP sources.
- Inventory BigCommerce B2B/API versions, scopes, company extra-field definitions, custom order statuses and numeric IDs.
- Confirm `Account Configurator` JSON contract, existing data samples and conflict semantics.
- Confirm registration/email verification policy, mail provider, attachment retention, reference format and operational owners.
- Acceptance: signed interface/data contract and verified API spike in a non-production store.

## Phase 1 - Security and data foundations

- Establish server-side configuration/secrets, RBAC, CSRF, rate limiting, validation and structured logging.
- Add durable request ledger/outbox (database or equivalent) with unique idempotency key and reference constraints.
- Define migrations, retention, backup and monitoring.
- Acceptance: threat model reviewed; credentials unavailable to browser; duplicate concurrency test passes.

## Phase 2 - Registration and authentication

- Implement normalized email-domain extraction and exact `Company Domain` lookup against existing active companies.
- Implement unique-match association, email verification and exact failure copy; never create companies.
- Enforce authenticated company context on protected routes.
- Acceptance: match, no-match, ambiguous, inactive, malformed, API-failure and replay scenarios tested.

## Phase 3 - Account Configurator

- Enforce backend admin role; load existing company configuration; validate catalog IDs and versioned JSON.
- Save exact field `Account Configurator` with optimistic concurrency and audit trail; invalidate policy cache.
- Acceptance: unauthorized customer cannot read/change admin operations; concurrent edit and invalid-ID tests pass.

## Phase 4 - Authorization across storefront

- Centralize default-deny company/brand/product policy evaluation.
- Apply to homepage, brand/category/PLP/PDP, search, cart and direct/API access.
- Revalidate all cart items at every mutation and submission.
- Acceptance: automated cross-company matrix confirms no restricted metadata, pricing or product access leaks.

## Phase 5 - Order orchestration

- Validate server-side identity, company, cart, permissions, fields, shipping allocation and attachments.
- Reserve idempotency/reference; map freight boolean to configured status ID; create one BigCommerce order; reconcile ambiguous outcomes.
- Acceptance: checked -> `Freight Request`; unchecked -> `Order Request`; same submission/retry produces one order/reference.

## Phase 6 - Notifications

- Implement outbox-driven customer/internal templates using the stored reference and order snapshot.
- Retry provider failures independently from order creation; record delivery metadata.
- Acceptance: both messages contain identical reference and correct details; email failure never duplicates an order.

## Phase 7 - QA, release and operations

- Unit, contract, integration, authorization, concurrency, failure-injection, accessibility and responsive testing.
- Rehearse status/API/mail outages, rollback and reconciliation.
- Deploy behind feature flags; observe dashboards; complete runbooks and administrator training.
- Acceptance: UAT sign-off, security review, backup/restore test and production readiness review.

## Suggested test matrix

| Area | Critical cases |
|---|---|
| Registration | exact domain, case/whitespace, subdomain policy, no match, duplicate/ambiguous, inactive company, API outage |
| Permissions | brand only, product only, conflicts, empty config, stale/deleted IDs, direct URL, search/cart tampering |
| Orders | freight yes/no, empty cart, unauthorized SKU, concurrent double click, timeout before/after API commit, retry |
| Email | one/both provider failures, retry, template rendering, same reference, PII/log redaction |
| Admin | customer denial, role denial, stale edit, invalid JSON/IDs, audit record, cache invalidation |

## Release gates

1. Custom statuses exist and their IDs are configuration, not hard-coded guesses.
2. API permissions have least privilege and are stored server-side.
3. `Company Domain` and `Account Configurator` are present with exact spelling.
4. Idempotency and ambiguous-response reconciliation pass load/concurrency tests.
5. Cross-company penetration tests pass.
6. Monitoring, alerting and runbooks are live before customer enablement.
