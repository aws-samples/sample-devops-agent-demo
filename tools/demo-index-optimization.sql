-- ============================================================================
-- CRM Database Index Optimization Demo Script
-- ============================================================================
-- Purpose: Demonstrate the performance impact of missing indexes on the
--          opportunities table, specifically the account_id column.
--
-- This script shows:
-- 1. Slow query performance WITHOUT index (full table scan)
-- 2. How to add the missing index
-- 3. Improved query performance WITH index (index seek)
--
-- Requirements: 3.1, 3.2, 3.3, 3.4
-- ============================================================================

-- ============================================================================
-- PART 1: Demonstrate Slow Performance (Missing Index)
-- ============================================================================

-- Query 1: Get all opportunities for a specific account
-- Expected: Full table scan, high latency (~100-500ms for 150 records)
EXPLAIN ANALYZE
SELECT 
    id,
    name,
    account_id,
    account_name,
    amount,
    close_date,
    stage,
    owner_name,
    probability
FROM opportunities
WHERE account_id = 'acc-001'
ORDER BY close_date DESC;

-- Expected EXPLAIN ANALYZE output (WITHOUT index):
-- Seq Scan on opportunities  (cost=0.00..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--   Filter: ((account_id)::text = 'acc-001'::text)
--   Rows Removed by Filter: XXX
-- Planning Time: X.XXX ms
-- Execution Time: X.XXX ms (typically 50-200ms for 150 records)


-- Query 2: Count opportunities by account
-- Expected: Full table scan for aggregation
EXPLAIN ANALYZE
SELECT 
    account_id,
    account_name,
    COUNT(*) as opportunity_count,
    SUM(amount) as total_value,
    AVG(probability) as avg_probability
FROM opportunities
WHERE account_id IN ('acc-001', 'acc-002', 'acc-003', 'acc-004', 'acc-005')
GROUP BY account_id, account_name
ORDER BY total_value DESC;

-- Expected EXPLAIN ANALYZE output (WITHOUT index):
-- HashAggregate  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--   Seq Scan on opportunities  (cost=0.00..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--     Filter: ((account_id)::text = ANY ('{acc-001,acc-002,...}'::text[]))
--     Rows Removed by Filter: XXX
-- Execution Time: X.XXX ms (typically 100-300ms)


-- Query 3: Join opportunities with accounts (common query pattern)
-- Expected: Sequential scan on opportunities, nested loop join
EXPLAIN ANALYZE
SELECT 
    a.id as account_id,
    a.name as account_name,
    a.industry_id,
    a.annual_revenue,
    COUNT(o.id) as opportunity_count,
    SUM(o.amount) as total_opportunity_value,
    AVG(o.probability) as avg_probability
FROM accounts a
LEFT JOIN opportunities o ON a.id = o.account_id
WHERE a.industry_id = 'technology'
GROUP BY a.id, a.name, a.industry_id, a.annual_revenue
ORDER BY total_opportunity_value DESC NULLS LAST
LIMIT 10;

-- Expected EXPLAIN ANALYZE output (WITHOUT index):
-- Limit  (cost=X.XX..X.XX rows=10 width=XXX) (actual time=X.XXX..X.XXX rows=10 loops=1)
--   ->  Sort  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=10 loops=1)
--         ->  HashAggregate  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--               ->  Hash Right Join  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--                     ->  Seq Scan on opportunities o  (cost=0.00..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--                     ->  Hash  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--                           ->  Seq Scan on accounts a  (cost=0.00..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
-- Execution Time: X.XXX ms (typically 200-500ms)


-- ============================================================================
-- Performance Baseline Summary (WITHOUT Index)
-- ============================================================================
-- Query Type                    | Expected Execution Time | Query Plan
-- ------------------------------|-------------------------|------------------
-- Single account filter         | 50-200ms                | Seq Scan
-- Multiple account filter       | 100-300ms               | Seq Scan
-- Account-Opportunity join      | 200-500ms               | Seq Scan + Hash Join
--
-- Key Indicators of Missing Index:
-- - "Seq Scan on opportunities" in query plan
-- - "Rows Removed by Filter" shows many rows scanned unnecessarily
-- - Execution time increases linearly with table size
-- - CloudWatch ReadLatency alarm may trigger (threshold: 100ms)
-- ============================================================================


-- ============================================================================
-- PART 2: Create the Missing Index
-- ============================================================================

-- Create index on opportunities.account_id
-- This is the PRIMARY missing index that causes performance issues
CREATE INDEX idx_opportunities_account_id ON opportunities(account_id);

-- Optional: Create additional indexes for common query patterns
-- (Uncomment these for comprehensive optimization)

-- CREATE INDEX idx_opportunities_owner_id ON opportunities(owner_id);
-- CREATE INDEX idx_opportunities_stage ON opportunities(stage);
-- CREATE INDEX idx_opportunities_close_date ON opportunities(close_date);
-- CREATE INDEX idx_opportunities_forecast_category ON opportunities(forecast_category);

-- Composite index for common filtering patterns
-- CREATE INDEX idx_opportunities_account_stage ON opportunities(account_id, stage);

-- Analyze table to update statistics after index creation
ANALYZE opportunities;


-- ============================================================================
-- PART 3: Demonstrate Improved Performance (With Index)
-- ============================================================================

-- Query 1 (Repeated): Get all opportunities for a specific account
-- Expected: Index scan, low latency (~5-20ms)
EXPLAIN ANALYZE
SELECT 
    id,
    name,
    account_id,
    account_name,
    amount,
    close_date,
    stage,
    owner_name,
    probability
FROM opportunities
WHERE account_id = 'acc-001'
ORDER BY close_date DESC;

-- Expected EXPLAIN ANALYZE output (WITH index):
-- Index Scan using idx_opportunities_account_id on opportunities  (cost=0.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--   Index Cond: ((account_id)::text = 'acc-001'::text)
-- Planning Time: X.XXX ms
-- Execution Time: X.XXX ms (typically 5-20ms - 10-40x improvement!)


-- Query 2 (Repeated): Count opportunities by account
-- Expected: Index scan with bitmap heap scan
EXPLAIN ANALYZE
SELECT 
    account_id,
    account_name,
    COUNT(*) as opportunity_count,
    SUM(amount) as total_value,
    AVG(probability) as avg_probability
FROM opportunities
WHERE account_id IN ('acc-001', 'acc-002', 'acc-003', 'acc-004', 'acc-005')
GROUP BY account_id, account_name
ORDER BY total_value DESC;

-- Expected EXPLAIN ANALYZE output (WITH index):
-- HashAggregate  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--   ->  Bitmap Heap Scan on opportunities  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--         Recheck Cond: ((account_id)::text = ANY ('{acc-001,acc-002,...}'::text[]))
--         ->  Bitmap Index Scan on idx_opportunities_account_id  (cost=0.00..X.XX rows=N width=0) (actual time=X.XXX..X.XXX rows=N loops=1)
--               Index Cond: ((account_id)::text = ANY ('{acc-001,acc-002,...}'::text[]))
-- Execution Time: X.XXX ms (typically 10-30ms - 10-30x improvement!)


-- Query 3 (Repeated): Join opportunities with accounts
-- Expected: Index scan on opportunities, efficient nested loop or hash join
EXPLAIN ANALYZE
SELECT 
    a.id as account_id,
    a.name as account_name,
    a.industry_id,
    a.annual_revenue,
    COUNT(o.id) as opportunity_count,
    SUM(o.amount) as total_opportunity_value,
    AVG(o.probability) as avg_probability
FROM accounts a
LEFT JOIN opportunities o ON a.id = o.account_id
WHERE a.industry_id = 'technology'
GROUP BY a.id, a.name, a.industry_id, a.annual_revenue
ORDER BY total_opportunity_value DESC NULLS LAST
LIMIT 10;

-- Expected EXPLAIN ANALYZE output (WITH index):
-- Limit  (cost=X.XX..X.XX rows=10 width=XXX) (actual time=X.XXX..X.XXX rows=10 loops=1)
--   ->  Sort  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=10 loops=1)
--         ->  HashAggregate  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--               ->  Hash Right Join  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--                     ->  Seq Scan on opportunities o  (cost=0.00..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--                           (Note: May still use Seq Scan if joining all opportunities, but faster due to better statistics)
--                     ->  Hash  (cost=X.XX..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
--                           ->  Seq Scan on accounts a  (cost=0.00..X.XX rows=N width=XXX) (actual time=X.XXX..X.XXX rows=N loops=1)
-- Execution Time: X.XXX ms (typically 50-150ms - 4-10x improvement!)


-- ============================================================================
-- Performance Improvement Summary (WITH Index)
-- ============================================================================
-- Query Type                    | Before Index | After Index | Improvement
-- ------------------------------|--------------|-------------|-------------
-- Single account filter         | 50-200ms     | 5-20ms      | 10-40x faster
-- Multiple account filter       | 100-300ms    | 10-30ms     | 10-30x faster
-- Account-Opportunity join      | 200-500ms    | 50-150ms    | 4-10x faster
--
-- Key Indicators of Successful Optimization:
-- - "Index Scan" or "Bitmap Index Scan" in query plan
-- - No "Rows Removed by Filter" (all rows retrieved are needed)
-- - Execution time remains constant regardless of table size
-- - CloudWatch ReadLatency alarm no longer triggers
-- ============================================================================


-- ============================================================================
-- PART 4: Additional Verification Queries
-- ============================================================================

-- Check if index exists
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'opportunities'
ORDER BY indexname;

-- Check index usage statistics (run after some queries)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'opportunities'
ORDER BY idx_scan DESC;

-- Check table statistics
SELECT 
    schemaname,
    tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'opportunities';


-- ============================================================================
-- PART 5: Demo Script Usage Instructions
-- ============================================================================
-- 
-- How to run this demo:
-- 
-- 1. Connect to the RDS PostgreSQL database:
--    psql -h <database-endpoint> -U <username> -d <database-name>
--    
--    Or retrieve connection details from SSM:
--    aws ssm get-parameter --name "/@anycompany/crm-database-endpoint" --query "Parameter.Value" --output text
--    aws ssm get-parameter --name "/@anycompany/crm-database-name" --query "Parameter.Value" --output text
--
-- 2. Run PART 1 queries to establish baseline performance (WITHOUT index)
--    - Copy and paste each EXPLAIN ANALYZE query
--    - Record the "Execution Time" from each output
--    - Note the "Seq Scan" in the query plans
--
-- 3. Run PART 2 to create the index
--    - Execute the CREATE INDEX statement
--    - Wait for index creation to complete (should be fast for 150 records)
--
-- 4. Run PART 3 queries to measure improved performance (WITH index)
--    - Copy and paste the same queries from PART 1
--    - Record the new "Execution Time" values
--    - Note the "Index Scan" in the query plans
--    - Calculate the performance improvement ratio
--
-- 5. Run PART 4 verification queries
--    - Confirm index exists and is being used
--    - Check index usage statistics
--
-- Expected Demo Talking Points:
-- - "Notice the Seq Scan in the query plan - PostgreSQL is scanning all 150 rows"
-- - "The execution time is 100-200ms, which triggers our CloudWatch alarm"
-- - "After adding the index, we see Index Scan instead of Seq Scan"
-- - "Execution time drops to 5-20ms - a 10-40x improvement"
-- - "This demonstrates why proper indexing is critical for query performance"
-- - "In production with millions of records, the difference would be even more dramatic"
--
-- ============================================================================


-- ============================================================================
-- PART 6: Cleanup (Optional)
-- ============================================================================
-- 
-- To remove the index and return to the "broken" state for another demo:
-- DROP INDEX idx_opportunities_account_id;
-- ANALYZE opportunities;
--
-- ============================================================================
