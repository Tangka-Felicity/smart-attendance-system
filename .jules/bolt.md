## 2025-05-14 - [Analytics Aggregation Optimization]
**Learning:** In-memory aggregation of database records (fetching all records then processing in Python) was a significant bottleneck in the analytics module. Moving these computations to the database using SQL aggregation functions (func.avg, func.sum, func.count) reduces memory usage from O(N) to O(1) and minimizes data transfer.
**Action:** Always prefer SQL-level aggregation for reports and analytics endpoints instead of fetching and processing large result sets in the application layer.

## 2025-05-15 - [HTTP Client and FCM Batching Optimization]
**Learning:** The application was creating a new `httpx.AsyncClient` for every external HTTP request (FCM, Face++, etc.). This adds significant overhead due to repeated TCP/TLS handshakes. Additionally, FCM notifications were sent sequentially, leading to O(N) requests for N recipients.
**Action:** Use a centralized HTTP client managed by the FastAPI lifespan to enable connection pooling. Always utilize batching for notification services (e.g., FCM `registration_ids`) to reduce the number of network round-trips from O(N) to O(N/1000).
