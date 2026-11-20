# Preliminary source scan triage — v0.8.1

Five findings remain in the raw source-scan.json report. Four EVAL_INPUT matches in expanded/valkey.ts refer to the Redis client eval interface and constant Lua scripts with keys/arguments passed separately; not JavaScript eval. The SQL_INTERPOLATION match at integrations.ts:54 is HMAC string construction, not SQL. These are preliminary false-positive assessments, not independent sign-off. No scanner rules were disabled. Five categories did not execute: SCAN-03, SCAN-15, SCAN-21, SCAN-38, SCAN-41. Scanner-triage and independent audit remain open.
