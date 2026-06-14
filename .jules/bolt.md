## 2025-05-14 - [Analytics Aggregation Optimization]
**Learning:** In-memory aggregation of database records (fetching all records then processing in Python) was a significant bottleneck in the analytics module. Moving these computations to the database using SQL aggregation functions (func.avg, func.sum, func.count) reduces memory usage from O(N) to O(1) and minimizes data transfer.
**Action:** Always prefer SQL-level aggregation for reports and analytics endpoints instead of fetching and processing large result sets in the application layer.

## 2025-05-15 - [HTTP Client Connection Pooling and FCM Batching]
**Learning:** Creating ephemeral `httpx.AsyncClient` instances for every external request (Face++, FCM, Notifications) introduces significant overhead due to repeated TCP/TLS handshakes. Centralizing the client in a singleton and managing its lifecycle via FastAPI's lifespan ensures connection reuse. Additionally, the FCM Legacy API supports batching up to 1000 tokens per request via `registration_ids`, reducing complexity from O(N) to O(N/1000).
**Action:** Use a centralized `HTTPClient` for all external service calls and batch payloads whenever the downstream API supports it.
