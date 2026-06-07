import sqlite3
import time
import uuid
import random
import statistics

def setup_db(conn):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE attendance_records (
            record_id TEXT PRIMARY KEY,
            session_id TEXT,
            student_id TEXT,
            attendance_pct REAL,
            mark REAL
        )
    """)

    records = []
    student_ids = [str(uuid.uuid4()) for _ in range(100)]
    session_ids = [str(uuid.uuid4()) for _ in range(200)]

    for _ in range(20000):
        records.append((
            str(uuid.uuid4()),
            random.choice(session_ids),
            random.choice(student_ids),
            random.uniform(0, 100),
            random.uniform(0, 10)
        ))

    cursor.executemany("INSERT INTO attendance_records VALUES (?, ?, ?, ?, ?)", records)
    conn.commit()
    return student_ids, session_ids

def benchmark_student_analytics_original(conn, student_id):
    cursor = conn.cursor()
    start = time.time()

    # Simulate select(AttendanceRecord).where(...)
    cursor.execute("SELECT * FROM attendance_records WHERE student_id = ?", (student_id,))
    rows = cursor.fetchall()

    # Python-based logic
    records = [{"attendance_pct": r[3], "mark": r[4]} for r in rows]

    sessions_attended = sum(1 for r in records if r["attendance_pct"] is not None and float(r["attendance_pct"]) > 0)
    total_records = len(records)
    cumulative_pct = sum(float(r["attendance_pct"] or 0) for r in records) / total_records if total_records else 0
    cumulative_mark = sum(float(r["mark"] or 0) for r in records) / total_records if total_records else 0

    res = {
        "sessions_attended": sessions_attended,
        "cumulative_pct": cumulative_pct,
        "cumulative_mark": cumulative_mark,
        "percentage": round(cumulative_pct, 1),
        "total_sessions": total_records
    }

    end = time.time()
    return end - start, res

def benchmark_student_analytics_optimized(conn, student_id):
    cursor = conn.cursor()
    start = time.time()

    # SQL-based logic
    cursor.execute("""
        SELECT
            COUNT(*),
            SUM(CASE WHEN attendance_pct > 0 THEN 1 ELSE 0 END),
            AVG(COALESCE(attendance_pct, 0)),
            AVG(COALESCE(mark, 0))
        FROM attendance_records
        WHERE student_id = ?
    """, (student_id,))
    row = cursor.fetchone()

    total_records = row[0]
    sessions_attended = row[1] or 0
    cumulative_pct = row[2] or 0
    cumulative_mark = row[3] or 0

    res = {
        "sessions_attended": sessions_attended,
        "cumulative_pct": cumulative_pct,
        "cumulative_mark": cumulative_mark,
        "percentage": round(cumulative_pct, 1),
        "total_sessions": total_records
    }

    end = time.time()
    return end - start, res

def benchmark_reports_summary_original(conn):
    cursor = conn.cursor()
    start = time.time()

    cursor.execute("SELECT * FROM attendance_records")
    rows = cursor.fetchall()

    records = [{"attendance_pct": r[3]} for r in rows]
    total = len(records)
    avg_attendance = sum(float(r["attendance_pct"] or 0) for r in records) / total if total else 0
    res = {"total_records": total, "avg_attendance": avg_attendance}

    end = time.time()
    return end - start, res

def benchmark_reports_summary_optimized(conn):
    cursor = conn.cursor()
    start = time.time()

    cursor.execute("SELECT COUNT(*), AVG(COALESCE(attendance_pct, 0)) FROM attendance_records")
    row = cursor.fetchone()
    res = {"total_records": row[0], "avg_attendance": row[1] or 0}

    end = time.time()
    return end - start, res

def benchmark_reports_by_student_original(conn):
    cursor = conn.cursor()
    start = time.time()

    cursor.execute("SELECT * FROM attendance_records")
    rows = cursor.fetchall()

    grouped = {}
    for r in rows:
        student_id = r[2]
        pct = r[3] or 0
        grouped.setdefault(student_id, []).append(pct)

    res = {
        "attendance_by_student": [
            {"student_id": sid, "average_pct": sum(vals) / len(vals)}
            for sid, vals in grouped.items()
        ]
    }

    end = time.time()
    return end - start, res

def benchmark_reports_by_student_optimized(conn):
    cursor = conn.cursor()
    start = time.time()

    cursor.execute("""
        SELECT student_id, AVG(COALESCE(attendance_pct, 0))
        FROM attendance_records
        GROUP BY student_id
    """)
    rows = cursor.fetchall()

    res = {
        "attendance_by_student": [
            {"student_id": row[0], "average_pct": row[1]}
            for row in rows
        ]
    }

    end = time.time()
    return end - start, res

def benchmark_export_original(conn):
    cursor = conn.cursor()
    start = time.time()

    cursor.execute("SELECT * FROM attendance_records")
    rows = cursor.fetchall()

    data = [
        {
            "record_id": r[0],
            "session_id": r[1],
            "student_id": r[2],
            "attendance_pct": r[3],
            "mark": r[4],
        }
        for r in rows
    ]

    end = time.time()
    return end - start

def benchmark_export_optimized(conn):
    cursor = conn.cursor()
    start = time.time()

    # Select only needed columns
    cursor.execute("SELECT record_id, session_id, student_id, attendance_pct, mark FROM attendance_records")
    rows = cursor.fetchall()

    data = [
        {
            "record_id": r[0],
            "session_id": r[1],
            "student_id": r[2],
            "attendance_pct": r[3],
            "mark": r[4],
        }
        for r in rows
    ]

    end = time.time()
    return end - start

def main():
    conn = sqlite3.connect(":memory:")
    student_ids, session_ids = setup_db(conn)

    test_student = student_ids[0]

    print(f"Benchmarking with 20,000 records...\n")

    # Student Analytics
    t_orig, res_orig = benchmark_student_analytics_original(conn, test_student)
    t_opt, res_opt = benchmark_student_analytics_optimized(conn, test_student)
    print(f"Student Analytics:")
    print(f"  Original:  {t_orig:.6f}s")
    print(f"  Optimized: {t_opt:.6f}s")
    print(f"  Speedup:   {t_orig/t_opt:.2f}x")
    assert res_orig["total_sessions"] == res_opt["total_sessions"]

    # Reports Summary
    t_orig, res_orig = benchmark_reports_summary_original(conn)
    t_opt, res_opt = benchmark_reports_summary_optimized(conn)
    print(f"\nReports Summary:")
    print(f"  Original:  {t_orig:.6f}s")
    print(f"  Optimized: {t_opt:.6f}s")
    print(f"  Speedup:   {t_orig/t_opt:.2f}x")
    assert res_orig["total_records"] == res_opt["total_records"]

    # Reports by Student
    t_orig, res_orig = benchmark_reports_by_student_original(conn)
    t_opt, res_opt = benchmark_reports_by_student_optimized(conn)
    print(f"\nReports by Student:")
    print(f"  Original:  {t_orig:.6f}s")
    print(f"  Optimized: {t_opt:.6f}s")
    print(f"  Speedup:   {t_orig/t_opt:.2f}x")
    assert len(res_orig["attendance_by_student"]) == len(res_opt["attendance_by_student"])

    # Export
    t_orig = benchmark_export_original(conn)
    t_opt = benchmark_export_optimized(conn)
    print(f"\nExport (Data prep):")
    print(f"  Original:  {t_orig:.6f}s")
    print(f"  Optimized: {t_opt:.6f}s")
    print(f"  Speedup:   {t_orig/t_opt:.2f}x")

if __name__ == "__main__":
    main()
