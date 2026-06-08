## 2025-05-14 - [Analytics Aggregation Optimization]
**Learning:** In-memory aggregation of database records (fetching all records then processing in Python) was a significant bottleneck in the analytics module. Moving these computations to the database using SQL aggregation functions (func.avg, func.sum, func.count) reduces memory usage from O(N) to O(1) and minimizes data transfer.
**Action:** Always prefer SQL-level aggregation for reports and analytics endpoints instead of fetching and processing large result sets in the application layer.

## 2025-06-08 - [FCM Push Notification Batching]
**Learning:** Sending push notifications sequentially in a loop was creating a new HTTP client for every token, resulting in massive overhead (TLS handshakes and network latency). Using the FCM Legacy multicast feature (registration_ids) allows batching up to 1000 tokens in a single request and reusing the client across batches.
**Action:** Always batch outbound API calls when the provider supports it, and reuse HTTP clients across multiple requests to leverage connection pooling.
