## 2025-05-14 - [Analytics Aggregation Optimization]
**Learning:** In-memory aggregation of database records (fetching all records then processing in Python) was a significant bottleneck in the analytics module. Moving these computations to the database using SQL aggregation functions (func.avg, func.sum, func.count) reduces memory usage from O(N) to O(1) and minimizes data transfer.
**Action:** Always prefer SQL-level aggregation for reports and analytics endpoints instead of fetching and processing large result sets in the application layer.

## 2026-06-10 - [FCM Notification & HTTP Client Optimization]
**Learning:** Instantiating a new `httpx.AsyncClient` for every request introduces significant overhead due to TCP and TLS handshakes, especially for services called frequently like FCM or Face++. Additionally, sending push notifications one-by-one is highly inefficient for large groups (e.g., announcing a class).
**Action:** Use a singleton-pattern shared HTTP client managed by the application lifespan to reuse connections. Batch notifications using multi-recipient endpoints (like FCM Legacy `registration_ids`) to reduce complexity from O(N) connections to O(1) connection and O(N/batch_size) requests.
