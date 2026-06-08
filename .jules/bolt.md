## 2025-05-14 - [Analytics Aggregation Optimization]
**Learning:** In-memory aggregation of database records (fetching all records then processing in Python) was a significant bottleneck in the analytics module. Moving these computations to the database using SQL aggregation functions (func.avg, func.sum, func.count) reduces memory usage from O(N) to O(1) and minimizes data transfer.
**Action:** Always prefer SQL-level aggregation for reports and analytics endpoints instead of fetching and processing large result sets in the application layer.
