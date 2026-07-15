"""
Database seeding Lambda for CDK Custom Resource
Seeds the RDS PostgreSQL database with CRM data
"""

import json
import boto3
import psycopg2
from psycopg2.extras import execute_batch
import os
import random
from datetime import datetime, timezone, timedelta
import urllib3

http = urllib3.PoolManager()

def generate_random_date_range():
    """Generate random dates spanning the last 3 years for realistic historical data"""
    now = datetime.now(timezone.utc)
    
    # Generate created_date (1-3 years ago)
    created_days_ago = random.randint(30, 3*365)
    created_date = now - timedelta(days=created_days_ago)
    
    # Generate last_modified_date (between created_date and now)
    days_since_created = (now - created_date).days
    if days_since_created > 0:
        modify_days_ago = random.randint(0, min(days_since_created, 30))
        last_modified_date = now - timedelta(days=modify_days_ago)
    else:
        last_modified_date = created_date
    
    # Generate close_date (future date, 1-12 months from now)
    close_days_future = random.randint(30, 365)
    close_date = now + timedelta(days=close_days_future)
    
    # Generate recent_activity_date (within last 30 days)
    activity_days_ago = random.randint(0, 30)
    recent_activity_date = now - timedelta(days=activity_days_ago)
    
    return {
        'created_date': created_date,
        'last_modified_date': last_modified_date,
        'close_date': close_date.date(),
        'recent_activity_date': recent_activity_date
    }

def send_response(event, context, response_status, response_data):
    """Send response to CloudFormation"""
    response_body = json.dumps({
        'Status': response_status,
        'Reason': f'See CloudWatch Log Stream: {context.log_stream_name}',
        'PhysicalResourceId': context.log_stream_name,
        'StackId': event['StackId'],
        'RequestId': event['RequestId'],
        'LogicalResourceId': event['LogicalResourceId'],
        'Data': response_data
    })
    
    headers = {'Content-Type': 'application/json'}
    
    try:
        http.request('PUT', event['ResponseURL'], body=response_body, headers=headers)
    except Exception as e:
        print(f"Failed to send response: {e}")


def get_database_connection():
    """Create database connection"""
    db_endpoint = os.environ['DB_PROXY_ENDPOINT']
    db_name = os.environ['DB_NAME']
    db_username = os.environ['DB_USERNAME']
    db_password = os.environ['DB_PASSWORD']
    
    print(f"Connecting to {db_endpoint}/{db_name}...")
    
    conn = psycopg2.connect(
        host=db_endpoint,
        database=db_name,
        user=db_username,
        password=db_password,
        connect_timeout=30
    )
    
    return conn


def initialize_schema(conn):
    """Initialize database schema"""
    print("Initializing schema...")
    
    schema_sql = """
    DO $$ BEGIN
        CREATE TYPE health_status_enum AS ENUM ('Green', 'Yellow', 'Red');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE opportunity_stage_enum AS ENUM ('Launched', 'Qualified', 'Proof of Concept', 'Negotiation', 'Closed Won', 'Closed Lost');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE forecast_category_enum AS ENUM ('Pipeline', 'Best Case', 'Commit', 'Closed');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS industries (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT
    );

    CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role VARCHAR(100),
        quota NUMERIC(15, 2),
        pipeline_value NUMERIC(15, 2),
        closed_won_value NUMERIC(15, 2),
        quota_attainment NUMERIC(5, 2),
        win_rate NUMERIC(5, 2),
        opportunity_count INTEGER,
        avatar_url TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255),
        industry_id VARCHAR(50) REFERENCES industries(id),
        annual_revenue NUMERIC(15, 2),
        employee_count INTEGER,
        owner_id VARCHAR(50) REFERENCES team_members(id),
        owner_name VARCHAR(255),
        health_status health_status_enum,
        health_score INTEGER,
        opportunity_count INTEGER,
        total_opportunity_value NUMERIC(15, 2),
        last_activity_date TIMESTAMP WITH TIME ZONE,
        created_date TIMESTAMP WITH TIME ZONE,
        logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS opportunities (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        account_id VARCHAR(50) REFERENCES accounts(id),
        account_name VARCHAR(255),
        amount NUMERIC(15, 2),
        close_date DATE,
        stage opportunity_stage_enum,
        next_step TEXT,
        recent_activity TEXT,
        recent_activity_date TIMESTAMP WITH TIME ZONE,
        forecast_category forecast_category_enum,
        owner_id VARCHAR(50) REFERENCES team_members(id),
        owner_name VARCHAR(255),
        probability INTEGER,
        created_date TIMESTAMP WITH TIME ZONE,
        last_modified_date TIMESTAMP WITH TIME ZONE
    );

    -- Indexes for common CRM query patterns (filtering by owner, stage, industry)
    -- These are dropped/recreated by the RDS Index Drop failure simulator scenario.
    CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON opportunities(owner_id);
    CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
    CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_industry_id ON accounts(industry_id);
    """
    
    cursor = conn.cursor()
    cursor.execute(schema_sql)
    conn.commit()
    cursor.close()
    print("✓ Schema initialized")


def seed_data(conn):
    """Seed data with realistic volume"""
    cursor = conn.cursor()
    
    # Check if data exists
    cursor.execute("SELECT COUNT(*) FROM accounts")
    if cursor.fetchone()[0] > 0:
        print("Data already exists, skipping seed")
        cursor.close()
        return
    
    print("Seeding data...")
    random.seed(42)
    
    # Industries
    industries = [
        ('Technology', 'Technology', 'Technology sector'),
        ('Healthcare', 'Healthcare', 'Healthcare sector'),
        ('Finance', 'Finance', 'Finance sector'),
        ('Retail', 'Retail', 'Retail sector'),
        ('Manufacturing', 'Manufacturing', 'Manufacturing sector'),
    ]
    
    for industry in industries:
        cursor.execute(
            "INSERT INTO industries (id, name, description) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            industry
        )
    
    # Team members (12 members)
    team_members = [
        ('tm-001', 'Sarah Chen', 'sarah.chen@example.com', 'Sales Director', 5000000, 8500000, 4200000, 84, 65, 45, None),
        ('tm-002', 'Michael Rodriguez', 'michael.rodriguez@example.com', 'Senior AE', 3000000, 4500000, 2800000, 93, 72, 38, None),
        ('tm-003', 'Emily Watson', 'emily.watson@example.com', 'Account Executive', 2500000, 3200000, 2100000, 84, 68, 32, None),
        ('tm-004', 'David Kim', 'david.kim@example.com', 'Account Executive', 2500000, 2800000, 1900000, 76, 64, 28, None),
        ('tm-005', 'Jessica Martinez', 'jessica.martinez@example.com', 'Sales Manager', 4000000, 6200000, 3800000, 95, 70, 42, None),
        ('tm-006', 'James Anderson', 'james.anderson@example.com', 'Enterprise AE', 3500000, 5100000, 3200000, 91, 75, 35, None),
        ('tm-007', 'Lisa Thompson', 'lisa.thompson@example.com', 'Account Executive', 2500000, 2900000, 2000000, 80, 66, 30, None),
        ('tm-008', 'Robert Taylor', 'robert.taylor@example.com', 'Senior AE', 3000000, 4200000, 2700000, 90, 71, 36, None),
        ('tm-009', 'Amanda White', 'amanda.white@example.com', 'Account Executive', 2500000, 3100000, 2200000, 88, 69, 31, None),
        ('tm-010', 'Christopher Lee', 'christopher.lee@example.com', 'Sales Manager', 4000000, 5800000, 3600000, 90, 73, 40, None),
        ('tm-011', 'Michelle Brown', 'michelle.brown@example.com', 'Account Executive', 2500000, 2700000, 1800000, 72, 62, 27, None),
        ('tm-012', 'Daniel Garcia', 'daniel.garcia@example.com', 'Enterprise AE', 3500000, 4900000, 3100000, 89, 74, 34, None),
    ]
    
    for member in team_members:
        cursor.execute(
            """INSERT INTO team_members 
               (id, name, email, role, quota, pipeline_value, closed_won_value, 
                quota_attainment, win_rate, opportunity_count, avatar_url)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT DO NOTHING""",
            member
        )
    
    # Accounts (20 accounts)
    now = datetime.now(timezone.utc)
    base_accounts = [
        ('acc-001', 'Acme Corp', 'acmecorp.com', 'Technology', 50000000, 250, 'tm-001', 'Sarah Chen', 'Green', 85, 3, 450000),
        ('acc-002', 'TechVision Inc', 'techvision.io', 'Technology', 120000000, 600, 'tm-002', 'Michael Rodriguez', 'Green', 92, 4, 850000),
        ('acc-003', 'CloudFirst Solutions', 'cloudfirst.com', 'Technology', 85000000, 420, 'tm-003', 'Emily Watson', 'Yellow', 68, 2, 320000),
        ('acc-004', 'DataStream Tech', 'datastream.tech', 'Technology', 95000000, 480, 'tm-004', 'David Kim', 'Green', 88, 3, 620000),
        ('acc-005', 'HealthCare Systems', 'healthcaresys.com', 'Healthcare', 220000000, 1200, 'tm-005', 'Jessica Martinez', 'Green', 88, 3, 650000),
        ('acc-006', 'MedTech Innovations', 'medtech-innov.com', 'Healthcare', 150000000, 800, 'tm-006', 'James Anderson', 'Green', 90, 4, 780000),
        ('acc-007', 'Digital Health', 'digitalhealth.io', 'Healthcare', 95000000, 520, 'tm-007', 'Lisa Thompson', 'Yellow', 70, 2, 380000),
        ('acc-008', 'Global Banking', 'globalbanking.com', 'Finance', 280000000, 1500, 'tm-008', 'Robert Taylor', 'Green', 91, 4, 920000),
        ('acc-009', 'FinTech Innovations', 'fintech-innov.io', 'Finance', 145000000, 780, 'tm-009', 'Amanda White', 'Green', 88, 3, 680000),
        ('acc-010', 'Investment Analytics', 'investanalytics.com', 'Finance', 165000000, 890, 'tm-010', 'Christopher Lee', 'Green', 93, 4, 850000),
        ('acc-011', 'E-Commerce Giants', 'ecommerce-g.com', 'Retail', 320000000, 1800, 'tm-011', 'Michelle Brown', 'Green', 92, 4, 950000),
        ('acc-012', 'Retail Analytics', 'retailanalytics.io', 'Retail', 125000000, 680, 'tm-012', 'Daniel Garcia', 'Green', 86, 3, 570000),
        ('acc-013', 'Omnichannel Solutions', 'omnichannel.com', 'Retail', 185000000, 1000, 'tm-001', 'Sarah Chen', 'Green', 89, 3, 720000),
        ('acc-014', 'Smart Factory', 'smartfactory.io', 'Manufacturing', 210000000, 1150, 'tm-002', 'Michael Rodriguez', 'Green', 87, 3, 680000),
        ('acc-015', 'Industrial IoT', 'industrial-iot.com', 'Manufacturing', 175000000, 950, 'tm-003', 'Emily Watson', 'Green', 90, 4, 820000),
        ('acc-016', 'Supply Chain Auto', 'supplychain-auto.com', 'Manufacturing', 195000000, 1080, 'tm-004', 'David Kim', 'Yellow', 74, 2, 450000),
        ('acc-017', 'Quality Control', 'qualitycontrol.io', 'Manufacturing', 142000000, 780, 'tm-005', 'Jessica Martinez', 'Green', 85, 3, 590000),
        ('acc-018', 'Robotics Mfg', 'robotics-mfg.com', 'Manufacturing', 230000000, 1280, 'tm-006', 'James Anderson', 'Green', 92, 4, 890000),
        ('acc-019', 'Production Analytics', 'production-analytics.com', 'Manufacturing', 158000000, 860, 'tm-007', 'Lisa Thompson', 'Green', 88, 3, 640000),
        ('acc-020', 'Mfg Cloud Platform', 'mfg-cloud.io', 'Manufacturing', 188000000, 1020, 'tm-008', 'Robert Taylor', 'Green', 86, 3, 710000),
    ]
    
    accounts = []
    for base_account in base_accounts:
        created_days_ago = random.randint(365, 3*365)
        created_date = now - timedelta(days=created_days_ago)
        activity_days_ago = random.randint(0, 60)
        last_activity_date = now - timedelta(days=activity_days_ago)
        account_with_dates = base_account + (last_activity_date, created_date, None)
        accounts.append(account_with_dates)
    
    for account in accounts:
        cursor.execute(
            """INSERT INTO accounts 
               (id, name, domain, industry_id, annual_revenue, employee_count, 
                owner_id, owner_name, health_status, health_score, opportunity_count, 
                total_opportunity_value, last_activity_date, created_date, logo_url)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT DO NOTHING""",
            account
        )
    
    conn.commit()
    
    # Opportunities - Generate 50,000 from diverse base templates
    print("Generating opportunities...")
    
    base_opportunities = [
        ('opp-001', 'Cloud Migration Initiative', 'acc-001', 'Acme Corp', 150000, 'Launched', 'Schedule discovery call', 'Initial contact made with CTO', 'Pipeline', 'tm-001', 'Sarah Chen', 10),
        ('opp-002', 'Enterprise Platform Upgrade', 'acc-002', 'TechVision Inc', 280000, 'Launched', 'Send product overview deck', 'Responded to RFI', 'Pipeline', 'tm-002', 'Michael Rodriguez', 10),
        ('opp-003', 'Data Analytics Solution', 'acc-004', 'DataStream Tech', 195000, 'Launched', 'Qualify budget and timeline', 'Inbound lead from website', 'Pipeline', 'tm-004', 'David Kim', 10),
        ('opp-004', 'AI Platform Implementation', 'acc-002', 'TechVision Inc', 145000, 'Launched', 'Schedule technical deep dive', 'Referral from existing customer', 'Pipeline', 'tm-002', 'Michael Rodriguez', 10),
        ('opp-005', 'Healthcare Compliance System', 'acc-005', 'HealthCare Systems', 210000, 'Launched', 'Review compliance requirements', 'Initial meeting with VP of IT', 'Pipeline', 'tm-005', 'Jessica Martinez', 10),
        ('opp-031', 'Enterprise Security Suite', 'acc-001', 'Acme Corp', 185000, 'Qualified', 'Security audit presentation', 'Budget confirmed by CFO', 'Best Case', 'tm-001', 'Sarah Chen', 30),
        ('opp-032', 'Multi-Cloud Strategy', 'acc-002', 'TechVision Inc', 425000, 'Qualified', 'Architecture review session', 'Technical requirements documented', 'Best Case', 'tm-002', 'Michael Rodriguez', 30),
        ('opp-033', 'Data Governance Platform', 'acc-003', 'CloudFirst Solutions', 160000, 'Qualified', 'Compliance team demo', 'Stakeholder alignment meeting', 'Best Case', 'tm-003', 'Emily Watson', 30),
        ('opp-034', 'Real-Time Analytics Engine', 'acc-004', 'DataStream Tech', 245000, 'Qualified', 'Performance benchmarking', 'POC scope defined', 'Best Case', 'tm-004', 'David Kim', 30),
        ('opp-035', 'Banking Security Platform', 'acc-008', 'Global Banking', 470000, 'Qualified', 'Security team workshop', 'Budget approved', 'Best Case', 'tm-008', 'Robert Taylor', 30),
        ('opp-061', 'Healthcare Data Platform', 'acc-005', 'HealthCare Systems', 225000, 'Proof of Concept', 'POC environment setup', 'Technical validation in progress', 'Commit', 'tm-005', 'Jessica Martinez', 60),
        ('opp-062', 'Digital Health Records', 'acc-006', 'MedTech Innovations', 260000, 'Proof of Concept', 'Clinical workflow testing', 'POC showing positive results', 'Commit', 'tm-006', 'James Anderson', 60),
        ('opp-063', 'Telemedicine Integration', 'acc-007', 'Digital Health', 190000, 'Proof of Concept', 'Video quality assessment', 'Integration testing complete', 'Commit', 'tm-007', 'Lisa Thompson', 60),
        ('opp-064', 'Retail Personalization', 'acc-011', 'E-Commerce Giants', 430000, 'Proof of Concept', 'A/B testing in progress', 'POC metrics looking good', 'Commit', 'tm-011', 'Michelle Brown', 60),
        ('opp-065', 'Manufacturing Analytics', 'acc-014', 'Smart Factory', 270000, 'Proof of Concept', 'Factory floor testing', 'Positive feedback from ops team', 'Commit', 'tm-002', 'Michael Rodriguez', 60),
        ('opp-091', 'Financial Trading Platform', 'acc-008', 'Global Banking', 450000, 'Negotiation', 'Contract review with legal', 'Pricing negotiations ongoing', 'Commit', 'tm-008', 'Robert Taylor', 80),
        ('opp-092', 'Investment Analytics', 'acc-010', 'Investment Analytics', 380000, 'Negotiation', 'Final terms discussion', 'Executive approval pending', 'Commit', 'tm-010', 'Christopher Lee', 80),
        ('opp-093', 'FinTech Payment Gateway', 'acc-009', 'FinTech Innovations', 275000, 'Negotiation', 'SLA agreement finalization', 'Compliance review complete', 'Commit', 'tm-009', 'Amanda White', 80),
        ('opp-094', 'Robotics Control System', 'acc-018', 'Robotics Mfg', 445000, 'Negotiation', 'Contract terms finalization', 'Legal review in progress', 'Commit', 'tm-006', 'James Anderson', 80),
        ('opp-095', 'Production Optimization', 'acc-019', 'Production Analytics', 320000, 'Negotiation', 'Pricing discussion', 'Near final agreement', 'Commit', 'tm-007', 'Lisa Thompson', 80),
        ('opp-121', 'E-Commerce Platform', 'acc-011', 'E-Commerce Giants', 520000, 'Closed Won', 'Kickoff meeting scheduled', 'Contract signed', 'Closed', 'tm-011', 'Michelle Brown', 100),
        ('opp-122', 'Retail Analytics Dashboard', 'acc-012', 'Retail Analytics', 190000, 'Closed Won', 'Implementation planning', 'Deal closed successfully', 'Closed', 'tm-012', 'Daniel Garcia', 100),
        ('opp-123', 'Omnichannel Commerce', 'acc-013', 'Omnichannel Solutions', 360000, 'Closed Won', 'Project team assignment', 'Signed and sealed', 'Closed', 'tm-001', 'Sarah Chen', 100),
        ('opp-131', 'Smart Factory IoT', 'acc-014', 'Smart Factory', 410000, 'Closed Won', 'Site survey scheduled', 'Contract executed', 'Closed', 'tm-002', 'Michael Rodriguez', 100),
        ('opp-132', 'Industrial Automation', 'acc-015', 'Industrial IoT', 385000, 'Closed Won', 'Equipment procurement', 'Deal won', 'Closed', 'tm-003', 'Emily Watson', 100),
        ('opp-133', 'Quality Control AI', 'acc-017', 'Quality Control', 295000, 'Closed Won', 'Training materials prep', 'Successfully closed', 'Closed', 'tm-005', 'Jessica Martinez', 100),
        ('opp-141', 'Legacy System Migration', 'acc-003', 'CloudFirst Solutions', 160000, 'Closed Lost', 'Post-mortem scheduled', 'Budget constraints', 'Pipeline', 'tm-003', 'Emily Watson', 0),
        ('opp-142', 'Compliance Platform', 'acc-007', 'Digital Health', 190000, 'Closed Lost', 'Lessons learned review', 'Chose competitor', 'Pipeline', 'tm-007', 'Lisa Thompson', 0),
        ('opp-143', 'Supply Chain Visibility', 'acc-016', 'Supply Chain Auto', 205000, 'Closed Lost', 'Feedback session', 'Timeline mismatch', 'Pipeline', 'tm-004', 'David Kim', 0),
        ('opp-144', 'Customer Data Platform', 'acc-012', 'Retail Analytics', 175000, 'Closed Lost', 'Competitive analysis', 'Lost on features', 'Pipeline', 'tm-012', 'Daniel Garcia', 0),
    ]
    
    # Additional name variations for more diversity
    name_prefixes = ['Advanced', 'Next-Gen', 'Enterprise', 'Cloud-Native', 'AI-Powered', 'Digital', 'Smart', 'Integrated', 'Scalable', 'Modern']
    name_suffixes = ['Platform', 'Solution', 'System', 'Suite', 'Framework', 'Infrastructure', 'Service', 'Application', 'Portal', 'Hub']
    
    opportunities = []
    multiplier = 1667  # 30 base * 1667 = ~50,000
    
    for i in range(multiplier):
        for j, base_opp in enumerate(base_opportunities):
            new_opp = list(base_opp)
            new_opp[0] = f"{base_opp[0]}-{i}-{j}"
            
            # More varied naming
            if i % 3 == 0:
                prefix = name_prefixes[i % len(name_prefixes)]
                new_opp[1] = f"{prefix} {base_opp[1]}"
            elif i % 3 == 1:
                suffix = name_suffixes[i % len(name_suffixes)]
                new_opp[1] = f"{base_opp[1]} {suffix}"
            else:
                phase = ['Phase 1', 'Phase 2', 'Q1', 'Q2', 'Q3', 'Q4', 'v2.0', 'Expansion'][i % 8]
                new_opp[1] = f"{base_opp[1]} ({phase})"
            
            # Vary amount (±50%)
            base_amount = base_opp[4]
            new_opp[4] = int(base_amount * random.uniform(0.5, 1.5))
            
            # Generate dates
            dates = generate_random_date_range()
            
            # Build full opportunity tuple
            opp_tuple = (
                new_opp[0],  # id
                new_opp[1],  # name
                new_opp[2],  # account_id
                new_opp[3],  # account_name
                new_opp[4],  # amount
                dates['close_date'],  # close_date
                new_opp[5],  # stage
                new_opp[6],  # next_step
                new_opp[7],  # recent_activity
                dates['recent_activity_date'],  # recent_activity_date
                new_opp[8],  # forecast_category
                new_opp[9],  # owner_id
                new_opp[10],  # owner_name
                new_opp[11],  # probability
                dates['created_date'],  # created_date
                dates['last_modified_date'],  # last_modified_date
            )
            opportunities.append(opp_tuple)
    
    print(f"Inserting {len(opportunities)} opportunities in batches...")
    
    batch_size = 1000
    for i in range(0, len(opportunities), batch_size):
        batch = opportunities[i:i + batch_size]
        execute_batch(
            cursor,
            """INSERT INTO opportunities 
               (id, name, account_id, account_name, amount, close_date, stage, 
                next_step, recent_activity, recent_activity_date, forecast_category, 
                owner_id, owner_name, probability, created_date, last_modified_date)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            batch,
            page_size=500
        )
        conn.commit()
        if (i // batch_size + 1) % 10 == 0:  # Log every 10 batches
            print(f"  Inserted batch {i//batch_size + 1}/{(len(opportunities) + batch_size - 1)//batch_size}")
    
    cursor.close()
    print(f"✓ Seeded {len(opportunities)} opportunities")



def handler(event, context):
    """Custom Resource handler"""
    print(f"Event: {json.dumps(event)}")
    
    request_type = event.get('RequestType', 'Create')
    
    # Handle clear_data as string or boolean
    clear_data_value = event.get('ResourceProperties', {}).get('clear_data', event.get('clear_data', False))
    clear_data = clear_data_value in [True, 'true', 'True', 'TRUE']
    
    print(f"Clear data flag: {clear_data} (from value: {clear_data_value})")
    
    try:
        conn = get_database_connection()
        initialize_schema(conn)
        
        # Clear data if requested
        if clear_data:
            print("Clearing existing data...")
            cursor = conn.cursor()
            cursor.execute("TRUNCATE TABLE opportunities, accounts, team_members, industries CASCADE")
            conn.commit()
            cursor.close()
            print("✓ Data cleared")
        
        seed_data(conn)
        conn.close()
        
        if 'ResponseURL' in event:
            send_response(event, context, 'SUCCESS', {'Message': 'Database seeded'})
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Database seeded successfully'})
        }
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        
        if 'ResponseURL' in event:
            send_response(event, context, 'FAILED', {'Message': str(e)})
        
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
