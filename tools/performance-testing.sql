-- ============================================================================
-- CRM Database Performance Testing Script
-- ============================================================================
-- Purpose: Test and analyze query performance on the opportunities table
--
-- This script shows:
-- 1. Query performance analysis
-- 2. Index management
-- 3. Performance comparison
--
-- Requirements: 3.1, 3.2, 3.3, 3.4
-- ============================================================================

-- ============================================================================
-- PART 1: Performance Baseline Analysis
-- ============================================================================

-- Query 1: Get all opportunities for a specific account
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


-- Query 2: Count opportunities by account
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


-- Query 3: Join opportunities with accounts
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
WHERE a.industry_id = 'Technology'
GROUP BY a.id, a.name, a.industry_id, a.annual_revenue
ORDER BY total_opportunity_value DESC NULLS LAST
LIMIT 10;


-- ============================================================================
-- PART 2: Index Management
-- ============================================================================

-- Create index on opportunities.account_id
CREATE INDEX IF NOT EXISTS idx_opportunities_account_id ON opportunities(account_id);

-- Optional: Create additional indexes for common query patterns
-- CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON opportunities(owner_id);
-- CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
-- CREATE INDEX IF NOT EXISTS idx_opportunities_close_date ON opportunities(close_date);
-- CREATE INDEX IF NOT EXISTS idx_opportunities_forecast_category ON opportunities(forecast_category);

-- Composite index for common filtering patterns
-- CREATE INDEX IF NOT EXISTS idx_opportunities_account_stage ON opportunities(account_id, stage);

-- Update table statistics after index creation
ANALYZE opportunities;


-- ============================================================================
-- PART 3: Performance Analysis With Index
-- ============================================================================

-- Query 1 (Repeated): Get all opportunities for a specific account
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


-- Query 2 (Repeated): Count opportunities by account
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


-- Query 3 (Repeated): Join opportunities with accounts
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
WHERE a.industry_id = 'Technology'
GROUP BY a.id, a.name, a.industry_id, a.annual_revenue
ORDER BY total_opportunity_value DESC NULLS LAST
LIMIT 10;


-- ============================================================================
-- PART 4: Verification Queries
-- ============================================================================

-- Check existing indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'opportunities'
ORDER BY indexname;

-- Check index usage statistics
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
-- PART 5: Usage Instructions
-- ============================================================================
-- 
-- How to run this script:
-- 
-- 1. Connect to the RDS PostgreSQL database:
--    psql -h <database-endpoint> -U <username> -d <database-name>
--    
--    Or retrieve connection details from SSM:
--    aws ssm get-parameter --name "/@anycompany/crm-database-endpoint" --query "Parameter.Value" --output text
--    aws ssm get-parameter --name "/@anycompany/crm-database-name" --query "Parameter.Value" --output text
--
-- 2. Run PART 1 queries to establish baseline performance
--    - Execute each EXPLAIN ANALYZE query
--    - Record the "Execution Time" from each output
--    - Note the query plan details
--
-- 3. Run PART 2 to create indexes
--    - Execute the CREATE INDEX statements
--    - Wait for index creation to complete
--
-- 4. Run PART 3 queries to measure performance with indexes
--    - Execute the same queries from PART 1
--    - Record the new "Execution Time" values
--    - Compare query plans
--
-- 5. Run PART 4 verification queries
--    - Confirm indexes exist and are being used
--    - Check index usage statistics
--
-- ============================================================================


-- ============================================================================
-- PART 6: Index Removal (Optional)
-- ============================================================================
-- 
-- To remove the index:
-- DROP INDEX IF EXISTS idx_opportunities_account_id;
-- ANALYZE opportunities;
--
-- ============================================================================
