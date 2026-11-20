# cashfree-payment-gateway — Cashfree payment gateway

Release: 0.17.0 · Product specification

## Purpose and users
Cashfree payment gateway

**Primary consumer:** Integration / platform engineer.

## Functional contract
Order creation, checkout session, signed capture and refund polling; INR only.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Complete sandbox checkout and refund state matrix, reconciliation worker and merchant-account binding; add Cashfree subscriptions separately.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Complete sandbox checkout and refund state matrix, reconciliation worker and merchant-account binding; add Cashfree subscriptions separately. Record real provider or runtime evidence and failure/recovery behavior.

## Scope and non-goals
Implemented integration path; live verification and remaining feature-specific engineering open.

## Status
Reference code present; not production validated. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
