# Security scanner technical evaluation — v0.17.0

All 41 categories preserved. Static rules are heuristics, passive HTTP/DNS require approved targets, and report-only checks require an external engine. Never scan a third party without authorization. Source: `packages/security/src/scanner.ts`, `report-adapters.ts`, `evidence-adapters.ts`.

| ID | Category | Execution | Acceptance / remaining work |
|---|---|---|---|
| SCAN-01 | SQL Injection Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-02 | Cross-Site Scripting (XSS) Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-03 | Security Headers Scanner | passive-http | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-04 | API Key Exposure Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-05 | SSL/TLS Security Scanner | static + passive-http | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-06 | CORS Misconfiguration Scanner | static + passive-http | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-07 | CSRF Protection Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-08 | Cookie & Session Security Scanner | static + passive-http | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-09 | Authentication Flow Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-10 | DNS & Email Security Scanner | static + dns (configured) | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-11 | Open Redirect Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-12 | GraphQL Security Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-13 | JWT Security Audit | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-14 | Tech Stack & CVE Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-15 | Threat Intelligence Scanner | offline IOC feed (configured) | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-16 | Legal Compliance Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-17 | DDoS Protection Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-18 | File Upload Security Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-19 | Audit Logging & Monitoring Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-20 | Mobile API Rate Limiting Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-21 | Domain Hijacking Detection | dns (configured) | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-22 | Debug Endpoints Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-23 | Input Validation Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-24 | Vercel Hosting Security Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-25 | Netlify Hosting Security Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-26 | Cloudflare Security Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-27 | Dependency Vulnerability Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-28 | Supabase Security Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-29 | Firebase Security Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-30 | GitHub Repository Security Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-31 | Browser Storage & Session Token Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-32 | Source Code SAST Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-33 | Webhook Signature Verification Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-34 | IDOR & Broken Access Control Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-35 | Tenant Isolation Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-36 | SEO Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-37 | AEO Scanner (AI Visibility) | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-38 | Uptime Monitoring & Status Pages | passive-http | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-39 | Performance & Core Web Vitals Scanner | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-40 | Accessibility Scanner (WCAG) | static | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |
| SCAN-41 | Domain Watchtower | dns (configured) | Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses. No verified full vendor check parity. |

