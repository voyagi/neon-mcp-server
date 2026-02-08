-- TechStart CRM Demo Data
-- Run this in Supabase SQL editor after creating the tables from CLAUDE.md

-- Add resolution column for close_ticket notes (Phase 3)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution text;

-- Customers
INSERT INTO customers (name, email, company, status) VALUES
  ('Alice Johnson', 'alice@acmecorp.com', 'Acme Corp', 'active'),
  ('Bob Smith', 'bob@techflow.io', 'TechFlow', 'active'),
  ('Carol Davis', 'carol@greenleaf.nl', 'GreenLeaf BV', 'active'),
  ('Dan Wilson', 'dan@rapidbytes.com', 'RapidBytes', 'lead'),
  ('Eva Martinez', 'eva@cloudnine.eu', 'CloudNine', 'active'),
  ('Frank Lee', 'frank@datastream.nl', 'DataStream', 'inactive'),
  ('Grace Kim', 'grace@brightpath.com', 'BrightPath', 'active'),
  ('Henry Brown', 'henry@netshift.io', 'NetShift', 'lead'),
  ('Iris Chen', 'iris@solveware.nl', 'SolveWare', 'active'),
  ('Jack Taylor', 'jack@codebridge.eu', 'CodeBridge', 'active');

-- Products
INSERT INTO products (name, category, price_cents, description) VALUES
  ('Basic IT Support', 'support', 4900, 'Email support during business hours, 24h response time'),
  ('Pro IT Support', 'support', 14900, 'Priority support with 4h response time, phone + email'),
  ('Enterprise Support', 'support', 49900, '24/7 support, dedicated account manager, 1h response SLA'),
  ('Cloud Migration', 'service', 299900, 'Full cloud migration including assessment, planning, and execution'),
  ('Security Audit', 'service', 149900, 'Comprehensive security assessment and vulnerability report'),
  ('Network Setup', 'service', 79900, 'Office network design and installation'),
  ('Backup Solution', 'product', 2900, 'Monthly automated backup with 30-day retention'),
  ('VPN Access', 'product', 990, 'Secure VPN per user per month'),
  ('Monitoring Dashboard', 'product', 5900, 'Real-time infrastructure monitoring and alerts'),
  ('Training Workshop', 'service', 49900, 'Half-day cybersecurity awareness training for teams');

-- Tickets
INSERT INTO tickets (customer_id, subject, description, status, priority) VALUES
  ((SELECT id FROM customers WHERE email = 'alice@acmecorp.com'), 'Cannot access email', 'Outlook keeps showing authentication errors since this morning', 'open', 'high'),
  ((SELECT id FROM customers WHERE email = 'alice@acmecorp.com'), 'New employee laptop setup', 'Need a laptop configured for new hire starting Monday', 'in_progress', 'medium'),
  ((SELECT id FROM customers WHERE email = 'bob@techflow.io'), 'VPN connection drops', 'VPN disconnects every 30 minutes, need stable connection for remote work', 'open', 'high'),
  ((SELECT id FROM customers WHERE email = 'carol@greenleaf.nl'), 'Printer not working', 'Office printer shows offline, already tried restarting', 'open', 'low'),
  ((SELECT id FROM customers WHERE email = 'eva@cloudnine.eu'), 'Slow internet in office', 'Internet speed has been very slow since the weekend', 'in_progress', 'medium'),
  ((SELECT id FROM customers WHERE email = 'eva@cloudnine.eu'), 'Software license renewal', 'Microsoft 365 licenses expiring next month, need renewal quote', 'open', 'medium'),
  ((SELECT id FROM customers WHERE email = 'grace@brightpath.com'), 'Data recovery request', 'Accidentally deleted important project folder from shared drive', 'open', 'urgent'),
  ((SELECT id FROM customers WHERE email = 'iris@solveware.nl'), 'Website SSL certificate', 'SSL certificate expired, website showing security warnings', 'open', 'urgent'),
  ((SELECT id FROM customers WHERE email = 'jack@codebridge.eu'), 'Monthly maintenance', 'Regular monthly system maintenance and updates', 'in_progress', 'low'),
  ((SELECT id FROM customers WHERE email = 'bob@techflow.io'), 'Backup verification', 'Please verify last month backups are complete and restorable', 'closed', 'medium');

-- Close the resolved ticket
UPDATE tickets SET closed_at = now() WHERE status = 'closed';
