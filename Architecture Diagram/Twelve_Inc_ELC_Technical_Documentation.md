# Twelve Inc. ELC B2B Customer Portal - Technical Architecture

Document date: 20 November 2026  
Architecture status: design blueprint; no implementation performed.

## 1. Evidence and confidence

### Verified from the supplied local theme

- BigCommerce Cornerstone/Stencil theme, version 6.21.0 (`package.json`).
- Custom Account Configurator page calls a PHP endpoint (`account-configurator/api.php`), uses storefront GraphQL for catalog data, searches companies, and reads/writes the exact company extra field `Account Configurator` as JSON.
- The storefront retrieves the signed-in customer context, exchanges a customer JWT with the BigCommerce B2B GraphQL service, resolves `companyInfo.companyId`, and reads company `extraFields`.
- The cart links to `/submit-order-request/`. The custom form posts multipart data to `order-request/request.php` and shows the returned reference.
- Current request fields visible in source: customer/cart identifiers; cart item IDs, quantities, images and summary; first name; registered email (hidden); Brand; Region of request; Requested delivery date; Delivery region; office/shipping address; Freight checkbox; optional multiple freight shipping addresses with per-item quantity allocation; Market; Order Notes; optional multiple attachments; and reCAPTCHA.
- The Account Configurator UI is gated in theme data by customer form field `Account Permissions`; server-side enforcement still needs verification.

### Verified from public access on 20 November 2026

The homepage, Account Configurator, and Submit Order Request URLs all returned a BigCommerce “Coming Soon” / Store Guest Access screen. No preview code was supplied. Header, footer, categories, listing/detail pages, registration UI, responsive layouts, authenticated configurator behavior, and end-to-end order creation could not be verified from the live storefront.

### Required but not verified

- Registration by matching the email domain to exact company extra field `Company Domain`.
- Creation of a BigCommerce order and the status mapping `Freight Request` / `Order Request`.
- Both emails and their shared reference.
- Backend enforcement at every catalog/cart/order boundary.
- The deployed PHP implementation, persistence model, retry behavior, mail provider, and API credentials/scopes were not available in this workspace.

## 2. Target architecture

The Stencil storefront remains the presentation layer. Sensitive operations must terminate at a server-side application layer (the existing PHP services may fill this role) that owns registration validation, company association, authorization, order orchestration, idempotency, and notifications. Browser-side filtering is only a presentation optimization.

BigCommerce is the system of record for customers, carts, catalog, orders, B2B companies, and the two required company fields. A small application database is recommended, not mandatory, for idempotency, stable references, retry/outbox state, and audit history. If no database is used, an equivalent durable store with uniqueness/atomicity guarantees is still required.

## 3. BigCommerce B2B Company - custom extra fields

| Exact field | Purpose | Example / shape | Owner | Consumers |
|---|---|---|---|---|
| `Company Domain` | Match an email to an existing eligible company during registration | `twelvenyc.com` | Twelve Inc. admin | Registration service |
| `Account Configurator` | Store company-specific brand/product access | Versioned JSON containing mode, brand IDs, product IDs and policy data | Twelve Inc. admin through Account Configurator | Backend authorization and storefront filtering |

Required flow 1: `BigCommerce B2B Company -> Extra Field: Company Domain -> Email Domain Validation -> Company Matching`.

Required flow 2: `Twelve Inc. Admin -> Account Configurator -> BigCommerce B2B Company -> Extra Field: Account Configurator -> Brand/Product Access Validation -> Customer Storefront`.

Use normalized lower-case domains, trim whitespace and reject malformed/consumer domains according to an approved policy. A match must select one existing active company; ambiguity fails closed. Never create a B2B company from public registration.

Recommended `Account Configurator` envelope:

```json
{
  "schemaVersion": 1,
  "type": "product",
  "brandIds": [101],
  "prohibitedBrandIds": [202],
  "products": [{"id": 3001, "sku": "SKU-1"}],
  "updatedAt": "2026-11-20T00:00:00Z",
  "updatedBy": "admin-customer-id"
}
```

The existing theme also stores category IDs and supports brand/product modes. The deployed JSON contract should be versioned before changes.

## 4. Registration and authentication

1. Accept and normalize email on the server.
2. Extract the domain and query existing active B2B company extra fields.
3. Require exactly one match on `Company Domain`.
4. Create the customer account and associate it to that company through supported B2B APIs.
5. On any no-match, ambiguous match, or safe failure, create no company and display exactly: “We cannot find company details in our records. Kindly contact on elcsupport@twelvenyc.com email address for submitting your sign up request.”
6. Protect pages with the BigCommerce session and re-resolve company membership server-side for sensitive operations.

Avoid relying on the domain alone as proof of identity: email ownership verification and normal account authentication remain necessary. Define handling for aliases, subdomains, multiple approved domains, company status, and existing customers.

## 5. Authorization and catalog

Apply default-deny authorization to homepage merchandising, brand/category/listing pages, PDPs, search, cart mutations, cart reads, and order submission. Every product ID must be resolved to current catalog attributes and checked against the current company configuration. Direct URLs and manipulated requests must return 404 or 403 without leaking restricted names, prices, inventory, or images.

Cache parsed company policy briefly by company ID and configuration hash. Invalidate on configuration save. Do not put privileged B2B tokens or management credentials in browser code.

## 6. Account Configurator

Only an authenticated Twelve Inc. administrator with an explicit role may search companies or change permissions. The backend must re-check the role; the theme’s `Account Permissions` UI condition is not sufficient authorization.

On save: validate company ID; validate schema and catalog IDs; detect brand/product conflicts; update only exact extra field `Account Configurator`; use optimistic concurrency/version checking; record actor, before/after hashes, time and outcome; invalidate caches. Customers have read/evaluate access only and can never update their company policy.

## 7. Order Request and BigCommerce integration

The server must ignore client-supplied identity, price, status and company as authoritative. It should reload the session customer, company, cart, SKUs, quantities and prices; re-evaluate permission; validate shipping allocation and attachments; then reserve an idempotency key and reference.

Status decision:

| Freight checkbox | Required BigCommerce status |
|---|---|
| Checked | `Freight Request` |
| Unchecked | `Order Request` |

Resolve names to tenant-configured numeric status IDs at deployment. BigCommerce order APIs typically assign an existing status/status ID; creation and availability of these custom statuses must be confirmed in the target control panel/API version. Do not assume the order API can create custom status definitions.

Use a unique constraint on the idempotency key and reference. On timeout, reconcile by stored request/reference before retrying. Persist the BigCommerce order ID before queuing email. Email retries must operate on an outbox record and must never call order creation again.

## 8. Email

After successful order creation, enqueue two messages using the same stored reference:

- Customer registered email: confirmation, reference, and request details.
- `ELC_NACR_GLOBAL@twelvenyc.com`: new request, same reference, customer, company, items/quantities, and `Freight Request` or `Order Request`.

Store recipient, template/version, provider message ID, attempt count, last error, and sent time. Redact unnecessary PII from logs.

## 9. Logical storage ownership

- BigCommerce: B2B companies; exact extra fields `Company Domain` and `Account Configurator`; customer/company association; catalog; carts; orders; status IDs.
- Recommended application storage: order-request state, idempotency key, reference, order ID mapping, retry/reconciliation data, email outbox, notification results, admin audit events.
- API-derived/cacheable: parsed authorization policy and catalog projections. Cache is not authoritative.

## 10. Security and operations

- TLS everywhere; secure/HttpOnly/SameSite session cookies; CSRF protection.
- Admin RBAC and recommended MFA; least-privilege BigCommerce and mail credentials held server-side in a secret manager.
- Allow-list validation, output encoding, upload type/size/scanning policy, rate limits and reCAPTCHA as defense-in-depth.
- Default-deny cross-company authorization on every object lookup.
- Structured logs with correlation ID, company ID, customer ID, request reference and order ID; redact secrets and minimize PII.
- Metrics/alerts for registration failures, policy-load failures, denied access, order latency/errors, reconciliation backlog and email failures.
- Backups/retention for the optional application store; documented incident response and key rotation.

## 11. Decisions and dependencies before build

Confirm the deployed PHP source and hosting; B2B API operations/scopes for customer-company association and extra-field updates; exact status IDs; reference sequencing; mail provider; attachment storage/retention; registration email verification; `Account Configurator` schema semantics; cache invalidation; and privacy/log retention. Perform an authenticated desktop/mobile review once preview access is supplied.

## 12. Traceability to required workflows

The consolidated Mermaid/PDF covers overall architecture; registration; domain validation; company matching; authentication; admin configuration; brand/product permission; browsing; cart; order submission; freight decision; order creation; status assignment; reference generation; both emails; end-to-end journey; logical data; and security. Closely related workflows are intentionally combined into connected diagrams rather than repeated as disconnected pictures.
