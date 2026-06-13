## 2025-05-14 - [Analytics Aggregation Optimization]
**Learning:** In-memory aggregation of database records (fetching all records then processing in Python) was a significant bottleneck in the analytics module. Moving these computations to the database using SQL aggregation functions (func.avg, func.sum, func.count) reduces memory usage from O(N) to O(1) and minimizes data transfer.
**Action:** Always prefer SQL-level aggregation for reports and analytics endpoints instead of fetching and processing large result sets in the application layer.

## 2026-06-13 - [HTTP Client Centralization and FCM Batching]
**Learning:** Creating a new 'httpx.AsyncClient' for every outbound request (Face++, FCM) introduces significant latency due to repeated TCP and TLS handshakes. Centralizing the client in a shared utility managed by the FastAPI lifespan allows connection pooling. Additionally, the FCM Legacy HTTP protocol allows batching up to 1000 tokens in a single request, which is much more efficient than serial individual requests.
**Action:** Use a centralized HTTP client for all outbound service calls and always leverage batching capabilities of external APIs (like FCM) when sending to multiple recipients.
