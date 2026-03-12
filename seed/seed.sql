-- TechStart CRM Demo Data
-- Run this in Neon SQL editor after creating the tables
-- See README.md for full setup instructions

-- Add resolution column for close_ticket notes (Phase 3)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution text;

-- ============================================================================
-- CUSTOMERS (22 rows)
-- Status distribution: 15 active, 4 inactive, 3 lead
-- Timestamps spread across ~180 days
-- ============================================================================

INSERT INTO customers (name, email, company, status, created_at) VALUES
  ('Sarah Chen', 's.chen@meridianlog.com', 'Meridian Logistics', 'active', now() - interval '175 days'),
  ('James Okafor', 'j.okafor@cascadehealth.io', 'Cascade Health', 'active', now() - interval '162 days'),
  ('Priya Sharma', 'p.sharma@novabridge.dev', 'NovaBridge Software', 'active', now() - interval '150 days'),
  ('Marcus Reed', 'm.reed@apexmfg.com', 'Apex Manufacturing', 'active', now() - interval '140 days'),
  ('Elena Vasquez', 'e.vasquez@luminadesign.co', 'Lumina Design Co', 'active', now() - interval '130 days'),
  ('David Kim', 'd.kim@ironcladsec.com', 'Ironclad Security', 'active', now() - interval '120 days'),
  ('Rachel Foster', 'r.foster@summitfinance.com', 'Summit Finance Group', 'active', now() - interval '110 days'),
  ('Tom Nakamura', 't.nakamura@brightpathlearning.com', 'BrightPath Learning', 'active', now() - interval '98 days'),
  ('Amira Hassan', 'a.hassan@velvetretail.com', 'Velvet Retail', 'active', now() - interval '88 days'),
  ('Chris Lawson', 'c.lawson@peakpoint.io', 'PeakPoint Consulting', 'active', now() - interval '75 days'),
  ('Nadia Petrova', 'n.petrova@quantumleap.dev', 'QuantumLeap Analytics', 'active', now() - interval '65 days'),
  ('Ben Torres', 'b.torres@greencanopy.co', 'GreenCanopy Environmental', 'active', now() - interval '55 days'),
  ('Lisa Brennan', 'l.brennan@orbithq.com', 'OrbitHQ Technologies', 'active', now() - interval '42 days'),
  ('Oscar Lindgren', 'o.lindgren@northstarship.com', 'NorthStar Shipping', 'active', now() - interval '30 days'),
  ('Wei Zhang', 'w.zhang@ceruleanai.com', 'Cerulean AI Labs', 'active', now() - interval '18 days'),
  ('Grace Mbeki', 'g.mbeki@atlasventures.co', 'Atlas Ventures', 'inactive', now() - interval '160 days'),
  ('Dmitri Volkov', 'd.volkov@redpinedata.com', 'RedPine Data Systems', 'inactive', now() - interval '135 days'),
  ('Julia Hernandez', 'j.hernandez@crestwave.io', 'CrestWave Media', 'inactive', now() - interval '100 days'),
  ('Frank Adeyemi', 'f.adeyemi@terraforge.com', 'TerraForge Industries', 'inactive', now() - interval '80 days'),
  ('Ingrid Svensson', 'i.svensson@polarisgroup.eu', 'Polaris Group', 'lead', now() - interval '25 days'),
  ('Kenji Tanaka', 'k.tanaka@silverlinesys.com', 'Silverline Systems', 'lead', now() - interval '12 days'),
  ('Olivia Dumont', 'o.dumont@canvasworks.co', 'CanvasWorks Studio', 'lead', now() - interval '5 days');

-- ============================================================================
-- PRODUCTS (12 rows)
-- SaaS pricing tiers + add-ons
-- Prices in cents
-- ============================================================================

INSERT INTO products (name, category, price_cents, description) VALUES
  ('Starter Plan', 'subscription', 4900, 'Up to 5 users, 1GB storage, email support, basic reporting dashboard'),
  ('Professional Plan', 'subscription', 14900, 'Up to 25 users, 10GB storage, priority support, advanced analytics and custom reports'),
  ('Enterprise Plan', 'subscription', 49900, 'Unlimited users, 100GB storage, 24/7 dedicated support, SSO, audit logs, SLA guarantee'),
  ('Priority Support', 'add-on', 2900, '4-hour response SLA, dedicated support channel, weekend coverage'),
  ('API Access', 'add-on', 7900, 'REST and GraphQL API access, 10K requests/day, webhook integrations'),
  ('Custom Integrations', 'add-on', 14900, 'Custom API integrations with your existing tools (Salesforce, HubSpot, Jira, etc.)'),
  ('Data Analytics Suite', 'add-on', 9900, 'Advanced dashboards, predictive analytics, exportable reports, scheduled email digests'),
  ('White-Label Package', 'add-on', 19900, 'Custom branding, your own domain, removal of TechStart branding from all interfaces'),
  ('Onboarding Package', 'service', 49900, 'Dedicated onboarding specialist, data migration, team training (up to 20 users)'),
  ('Security Audit', 'service', 29900, 'Comprehensive security review, penetration testing report, compliance checklist'),
  ('Data Migration', 'service', 19900, 'Full data import from your existing CRM, mapping, validation, and deduplication'),
  ('Training Workshop', 'service', 9900, '2-hour virtual training session for your team, recorded for future reference');

-- ============================================================================
-- TICKETS (32 rows)
-- Status distribution: 14 open, 9 in_progress, 9 closed
-- Priority distribution: 5 urgent, 10 high, 11 medium, 6 low
-- 4 narrative threads with 2-3 related tickets each
-- ============================================================================

INSERT INTO tickets (customer_id, subject, description, status, priority, created_at) VALUES
  -- === NARRATIVE THREAD 1: Sarah Chen @ Meridian Logistics ===
  -- Login issues (closed, 45 days ago) -> Account migration (in_progress, 5 days ago)
  ((SELECT id FROM customers WHERE email = 's.chen@meridianlog.com'),
   'Persistent login failures across team',
   'Multiple team members reporting authentication errors since Monday. Clearing cookies does not help. Affects Chrome and Firefox.',
   'closed', 'high', now() - interval '45 days'),
  ((SELECT id FROM customers WHERE email = 's.chen@meridianlog.com'),
   'Account migration to SSO',
   'Following the login issues last month, we want to migrate our team to SSO via Okta. Need guidance on Enterprise Plan upgrade and SSO setup.',
   'in_progress', 'medium', now() - interval '5 days'),

  -- === NARRATIVE THREAD 2: Priya Sharma @ NovaBridge Software ===
  -- API rate limiting (closed, 30 days ago) -> API quota upgrade (open, 2 days ago)
  ((SELECT id FROM customers WHERE email = 'p.sharma@novabridge.dev'),
   'API rate limiting hitting our CI pipeline',
   'Our automated tests are being rate-limited at 10K requests/day. We run ~15K test calls during nightly builds. Need higher quota or burst allowance.',
   'closed', 'high', now() - interval '30 days'),
  ((SELECT id FROM customers WHERE email = 'p.sharma@novabridge.dev'),
   'API quota upgrade request',
   'Rate limit was fixed last month but we have scaled up CI and need 50K requests/day. Can we get a custom API plan or enterprise-tier limits?',
   'open', 'medium', now() - interval '2 days'),

  -- === NARRATIVE THREAD 3: Marcus Reed @ Apex Manufacturing ===
  -- Data export broken (open, 10 days ago) -> Follow-up (open, 3 days ago) -> Escalation (open, 1 day ago)
  ((SELECT id FROM customers WHERE email = 'm.reed@apexmfg.com'),
   'Data export returning empty CSV files',
   'Exporting customer list from the dashboard produces a CSV with headers only. No data rows. Tried different browsers and date ranges.',
   'open', 'high', now() - interval '10 days'),
  ((SELECT id FROM customers WHERE email = 'm.reed@apexmfg.com'),
   'Follow-up: data export still failing',
   'Reported this 7 days ago (ticket about empty CSV exports). Issue persists. Our quarterly report deadline is in 4 days. Please prioritize.',
   'open', 'high', now() - interval '3 days'),
  ((SELECT id FROM customers WHERE email = 'm.reed@apexmfg.com'),
   'URGENT: data export blocking quarterly report',
   'Third report on this issue. Empty CSV export is blocking our Q4 financial reconciliation. Need immediate resolution or a manual data extract.',
   'open', 'urgent', now() - interval '1 day'),

  -- === NARRATIVE THREAD 4: Rachel Foster @ Summit Finance Group ===
  -- Billing discrepancy (closed, 60 days ago) -> New billing question (open, 1 day ago)
  ((SELECT id FROM customers WHERE email = 'r.foster@summitfinance.com'),
   'Invoice shows wrong subscription tier',
   'Our January invoice charged Enterprise Plan rate ($499/mo) but we are on Professional Plan ($149/mo). Need immediate correction and refund.',
   'closed', 'urgent', now() - interval '60 days'),
  ((SELECT id FROM customers WHERE email = 'r.foster@summitfinance.com'),
   'Question about upcoming plan renewal pricing',
   'Our annual renewal is coming up next month. Want to confirm pricing for Professional Plan and ask about volume discount for adding 10 more seats.',
   'open', 'low', now() - interval '1 day'),

  -- === STANDALONE TICKETS (remaining 22 rows) ===

  -- James Okafor @ Cascade Health
  ((SELECT id FROM customers WHERE email = 'j.okafor@cascadehealth.io'),
   'HIPAA compliance documentation request',
   'We need your HIPAA BAA and compliance documentation for our annual audit. Legal team needs this by end of month.',
   'in_progress', 'high', now() - interval '8 days'),

  -- Elena Vasquez @ Lumina Design Co
  ((SELECT id FROM customers WHERE email = 'e.vasquez@luminadesign.co'),
   'Custom branding not applying to reports',
   'We purchased the White-Label Package but our logo is not showing on exported PDF reports. Dashboard branding works fine.',
   'in_progress', 'medium', now() - interval '12 days'),

  -- David Kim @ Ironclad Security
  ((SELECT id FROM customers WHERE email = 'd.kim@ironcladsec.com'),
   'SSL certificate renewal failing',
   'Auto-renewal for our custom domain SSL cert failed. Dashboard shows "certificate expired" warning. Customers seeing browser security warnings.',
   'open', 'urgent', now() - interval '2 days'),

  -- Tom Nakamura @ BrightPath Learning
  ((SELECT id FROM customers WHERE email = 't.nakamura@brightpathlearning.com'),
   'Bulk user import not parsing CSV correctly',
   'Uploading a CSV with 200 student accounts. Import says "completed" but only 43 users were created. No error details shown.',
   'in_progress', 'medium', now() - interval '14 days'),
  ((SELECT id FROM customers WHERE email = 't.nakamura@brightpathlearning.com'),
   'Feature request: student progress dashboard',
   'Would love a dashboard showing course completion rates per student. Currently we export data and build charts in Excel manually.',
   'open', 'low', now() - interval '7 days'),

  -- Amira Hassan @ Velvet Retail
  ((SELECT id FROM customers WHERE email = 'a.hassan@velvetretail.com'),
   'Inventory sync delays with Shopify',
   'Inventory counts are taking 4-6 hours to sync from Shopify. Should be near real-time per our integration docs.',
   'in_progress', 'high', now() - interval '6 days'),

  -- Chris Lawson @ PeakPoint Consulting
  ((SELECT id FROM customers WHERE email = 'c.lawson@peakpoint.io'),
   'Need to add 5 more user seats mid-cycle',
   'We just hired 5 new consultants who need access. How does mid-cycle seat addition work for billing? Do we get prorated?',
   'closed', 'low', now() - interval '20 days'),

  -- Nadia Petrova @ QuantumLeap Analytics
  ((SELECT id FROM customers WHERE email = 'n.petrova@quantumleap.dev'),
   'Webhook delivery failures to our endpoint',
   'About 30% of webhooks are failing with timeout errors. Our endpoint is up and responding within 200ms. Suspect your retry logic is too aggressive.',
   'in_progress', 'high', now() - interval '4 days'),

  -- Ben Torres @ GreenCanopy Environmental
  ((SELECT id FROM customers WHERE email = 'b.torres@greencanopy.co'),
   'Two-factor authentication setup issues',
   'Cannot enable 2FA for our admin account. The QR code does not scan in Google Authenticator or Authy. Tried regenerating multiple times.',
   'open', 'medium', now() - interval '9 days'),

  -- Lisa Brennan @ OrbitHQ Technologies
  ((SELECT id FROM customers WHERE email = 'l.brennan@orbithq.com'),
   'Performance degradation on dashboard load',
   'Main dashboard taking 12-15 seconds to load since last week. Was previously under 3 seconds. We have about 5000 records.',
   'in_progress', 'high', now() - interval '3 days'),
  ((SELECT id FROM customers WHERE email = 'l.brennan@orbithq.com'),
   'Request for dedicated staging environment',
   'We want to test new integrations without affecting production data. Is there a sandbox or staging environment option?',
   'closed', 'low', now() - interval '25 days'),

  -- Oscar Lindgren @ NorthStar Shipping
  ((SELECT id FROM customers WHERE email = 'o.lindgren@northstarship.com'),
   'Incorrect timezone in automated reports',
   'Scheduled reports show timestamps in UTC but we configured Europe/Stockholm timezone. Affects all exported data.',
   'open', 'medium', now() - interval '5 days'),

  -- Wei Zhang @ Cerulean AI Labs
  ((SELECT id FROM customers WHERE email = 'w.zhang@ceruleanai.com'),
   'GraphQL API returning stale cached data',
   'After updating records via REST API, the GraphQL endpoint returns old data for about 10 minutes. Cache invalidation seems broken.',
   'open', 'high', now() - interval '1 day'),

  -- Grace Mbeki @ Atlas Ventures (inactive)
  ((SELECT id FROM customers WHERE email = 'g.mbeki@atlasventures.co'),
   'Account deactivation request',
   'We are moving to a different platform. Please deactivate our account and provide a final data export by end of this week.',
   'closed', 'medium', now() - interval '55 days'),

  -- Dmitri Volkov @ RedPine Data Systems (inactive)
  ((SELECT id FROM customers WHERE email = 'd.volkov@redpinedata.com'),
   'Final invoice dispute',
   'We were charged for a month after cancellation. Please review and issue a refund for the overcharge.',
   'closed', 'high', now() - interval '40 days'),

  -- Julia Hernandez @ CrestWave Media (inactive)
  ((SELECT id FROM customers WHERE email = 'j.hernandez@crestwave.io'),
   'Data retention policy question',
   'After account closure, how long is our data retained? Need to confirm for our compliance team before completing the transition.',
   'closed', 'medium', now() - interval '35 days'),

  -- Frank Adeyemi @ TerraForge Industries (inactive)
  ((SELECT id FROM customers WHERE email = 'f.adeyemi@terraforge.com'),
   'Cannot access archived reports after downgrade',
   'We downgraded from Enterprise to Starter but now cannot view reports from the Enterprise period. Is this expected or a bug?',
   'closed', 'medium', now() - interval '28 days'),

  -- Ingrid Svensson @ Polaris Group (lead)
  ((SELECT id FROM customers WHERE email = 'i.svensson@polarisgroup.eu'),
   'Pre-sales: Enterprise Plan security features',
   'Evaluating TechStart for our 200-person team. Need detailed info on SSO, audit logging, data residency options, and your SOC 2 status.',
   'in_progress', 'medium', now() - interval '4 days'),

  -- Kenji Tanaka @ Silverline Systems (lead)
  ((SELECT id FROM customers WHERE email = 'k.tanaka@silverlinesys.com'),
   'Demo request: API integration capabilities',
   'We build custom ERP solutions and want to understand how TechStart API integrates with legacy systems. Can we schedule a technical demo?',
   'open', 'low', now() - interval '3 days'),

  -- Olivia Dumont @ CanvasWorks Studio (lead)
  ((SELECT id FROM customers WHERE email = 'o.dumont@canvasworks.co'),
   'Trial extension request',
   'Our team has not had time to fully evaluate the platform. Can we extend our 14-day trial by another two weeks?',
   'open', 'low', now() - interval '2 days'),

  -- David Kim @ Ironclad Security (second ticket)
  ((SELECT id FROM customers WHERE email = 'd.kim@ironcladsec.com'),
   'Suspicious login attempts from unknown IPs',
   'Security logs show 47 failed login attempts from three IP ranges in Eastern Europe over the past 24 hours. Need to verify no accounts were compromised.',
   'open', 'urgent', now() - interval '1 day'),

  -- Amira Hassan @ Velvet Retail (second ticket)
  ((SELECT id FROM customers WHERE email = 'a.hassan@velvetretail.com'),
   'Checkout integration dropping orders during peak hours',
   'Between 6-9 PM when traffic spikes, approximately 5% of orders fail to sync. Customers see payment confirmed but orders do not appear in our system.',
   'open', 'urgent', now() - interval '2 days'),

  -- Chris Lawson @ PeakPoint Consulting (second ticket)
  ((SELECT id FROM customers WHERE email = 'c.lawson@peakpoint.io'),
   'Monthly usage report formatting issues',
   'The PDF usage reports have overlapping text in the charts section. Makes them unusable for client presentations. Started after the last update.',
   'in_progress', 'medium', now() - interval '6 days');

-- ============================================================================
-- CLOSE RESOLVED TICKETS
-- Each closed ticket gets a specific resolution and realistic closed_at
-- ============================================================================

-- Thread 1: Sarah Chen - login failures
UPDATE tickets SET
  closed_at = created_at + interval '3 days',
  resolution = 'Resolved: Root cause was an expired OAuth token cache. Cleared server-side token cache and deployed a fix to auto-refresh tokens before expiry. All team members confirmed access restored.'
WHERE status = 'closed'
  AND customer_id = (SELECT id FROM customers WHERE email = 's.chen@meridianlog.com')
  AND subject = 'Persistent login failures across team';

-- Thread 2: Priya Sharma - API rate limiting
UPDATE tickets SET
  closed_at = created_at + interval '2 days',
  resolution = 'Resolved: Increased CI pipeline rate limit to 25K requests/day and added burst allowance of 5K requests over 5-minute windows. Customer confirmed nightly builds passing.'
WHERE status = 'closed'
  AND customer_id = (SELECT id FROM customers WHERE email = 'p.sharma@novabridge.dev')
  AND subject = 'API rate limiting hitting our CI pipeline';

-- Thread 4: Rachel Foster - billing discrepancy
UPDATE tickets SET
  closed_at = created_at + interval '1 day',
  resolution = 'Resolved: Billing system had incorrect plan mapping after migration. Corrected to Professional Plan rate, issued refund of $350 for the difference. Customer confirmed corrected invoice received.'
WHERE status = 'closed'
  AND customer_id = (SELECT id FROM customers WHERE email = 'r.foster@summitfinance.com')
  AND subject = 'Invoice shows wrong subscription tier';

-- Chris Lawson - mid-cycle seat addition
UPDATE tickets SET
  closed_at = created_at + interval '1 day',
  resolution = 'Resolved: Added 5 seats with prorated billing for the remaining 18 days in the cycle. Sent updated invoice breakdown via email. New users activated immediately.'
WHERE status = 'closed'
  AND customer_id = (SELECT id FROM customers WHERE email = 'c.lawson@peakpoint.io')
  AND subject = 'Need to add 5 more user seats mid-cycle';

-- Lisa Brennan - staging environment request
UPDATE tickets SET
  closed_at = created_at + interval '4 days',
  resolution = 'Resolved: Provisioned a dedicated staging environment at staging.orbithq.techstart.io. Provided separate API keys and documented the sandbox limitations. Data resets weekly.'
WHERE status = 'closed'
  AND customer_id = (SELECT id FROM customers WHERE email = 'l.brennan@orbithq.com')
  AND subject = 'Request for dedicated staging environment';

-- Grace Mbeki - account deactivation
UPDATE tickets SET
  closed_at = created_at + interval '2 days',
  resolution = 'Resolved: Account deactivated per request. Full data export (JSON + CSV) sent to g.mbeki@atlasventures.co. Data will be retained for 90 days per our retention policy before permanent deletion.'
WHERE status = 'closed'
  AND customer_id = (SELECT id FROM customers WHERE email = 'g.mbeki@atlasventures.co')
  AND subject = 'Account deactivation request';

-- Dmitri Volkov - final invoice dispute
UPDATE tickets SET
  closed_at = created_at + interval '3 days',
  resolution = 'Resolved: Confirmed billing error — auto-renewal charged after cancellation date. Full refund of $149 issued to original payment method. Processing time 3-5 business days.'
WHERE status = 'closed'
  AND customer_id = (SELECT id FROM customers WHERE email = 'd.volkov@redpinedata.com')
  AND subject = 'Final invoice dispute';

-- Julia Hernandez - data retention question
UPDATE tickets SET
  closed_at = created_at + interval '2 days',
  resolution = 'Resolved: Per our data retention policy, all customer data is retained for 90 days after account closure, then permanently deleted. Provided written confirmation letter for their compliance team.'
WHERE status = 'closed'
  AND customer_id = (SELECT id FROM customers WHERE email = 'j.hernandez@crestwave.io')
  AND subject = 'Data retention policy question';

-- Frank Adeyemi - archived reports access
UPDATE tickets SET
  closed_at = created_at + interval '5 days',
  resolution = 'Resolved: This was expected behavior — Starter Plan does not include historical Enterprise-tier reports. Exported all Enterprise-period reports as PDF bundle and sent to customer. Recommended upgrading to Pro Plan for ongoing access to advanced reporting.'
WHERE status = 'closed'
  AND customer_id = (SELECT id FROM customers WHERE email = 'f.adeyemi@terraforge.com')
  AND subject = 'Cannot access archived reports after downgrade';
