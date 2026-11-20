# Sapling API Gateway — Product Specification v0.13.0

## Vision
A multi-service, centrally managed ingress/router for Sapling SaaS platforms, inspired by the *design concepts* of Kong Gateway. Source of truth: uploaded `GatewayConfig.json` (full school-platform example) and `GatewayConfig.yaml` (minimal orders example). Not a fork or replacement for Kong's entire gateway/plugin ecosystem.

## Personas and use cases
- **Platform administrator:** install GitOps-managed declarative configuration for services, upstreams, routes, credentials and observability.
- **API consumer:** access documented, versioned APIs using approved API key or realm-scoped bearer identity; receive consistent errors, limits and correlation IDs.
- **Security/SRE:** audit routing, manage trust boundaries, enforce quota/IP/ACL policy, inspect upstream health, fail over unhealthy targets and respond to incidents.
- **Developer:** define routes, add pluggable body validation and use a shared multi-tenant realm issuer.

## Source-config user journeys
1. Load `GatewayConfig.json` from a trusted deployment artifact or parse `GatewayConfig.yaml` with `yaml` dependency installed. Validate gateway version, service/upstream linkage, route methods/path and declared plugins before running.
2. Bind `api.school.com`/`auth.school.com` via a real TLS listener or explicitly trusted ingress. Choose service and longest matching path + optional host/method; never use a client-supplied upstream destination.
3. Apply global, consumer-group, consumer, service and route plugin overrides; check JWT and ACL, limits, request validation and size; proxy to healthy upstream and transform configured safe response fields.
4. On failure, emit sanitized status and structured metadata, retry **safe methods only** and open circuit when unhealthy. Use status/reconnect/deprecation headers.
5. Expose health probes and review security/operations evidence. Provider-specific threat feeds, edge bot challenge, geo database and log sinks require additional adapters.

## Functional acceptance
- Identity token route uses the auth host, strict POST method, bounded payload and rate policy.
- Student read/write routes are differentiated by method and claim roles; student cannot submit writes; teacher/admin can submit schema-valid writes.
- Read route masks `phone` and removes `ssn`, `internalNotes`. Versioned legacy route emits deprecation metadata.
- Canary `students-upstream` preserves configured target weights; `identity-upstream` supports health probes and circuit breaker. Requests never route to arbitrary client-supplied hosts.
- Fail closed on missing identity verifier, required threat-feed adapter, invalid consumer credential, unsupported external engine and disallowed geography.
- Gateway is not considered production ready until live gateway/TLS/Redis/topology evidence and security review pass.

## Non-goals in this version
Complete Kong plugin parity, Kong Admin API, decK, proxying gRPC/TCP/WebSocket, proven multi-node high availability, automatic certificates and trust-zone policy distribution. See GAPS_AND_IMPROVEMENTS.md.
