---
phase: 04-seed-data-portfolio-polish
plan: 01
subsystem: database
tags: [sql, seed-data, supabase, postgresql, demo]

requires:
  - phase: 01-foundation-infrastructure
    provides: Database schema (customers, products, tickets tables)
  - phase: 03-write-operations-analytics
    provides: Resolution column on tickets table (ALTER TABLE)
provides:
  - Realistic demo dataset with 22 customers, 12 products, 32 tickets
  - Narrative ticket threads showing issue progression for demo storytelling
  - Varied status/priority distributions for impressive analytics output
affects: [04-02, 04-03]

tech-stack:
  added: []
  patterns: [subquery FK resolution, interval timestamp spread, individual UPDATE resolutions]

key-files:
  created: []
  modified: [seed/seed.sql]

key-decisions:
  - "22 fictional companies spanning 10+ industries for diversity"
  - "SaaS pricing model: 3 subscription tiers + 5 add-ons + 4 services"
  - "4 narrative threads with 2-3 tickets each showing issue progression"
  - "Individual UPDATE statements per closed ticket for specific resolution text"

patterns-established:
  - "Subquery FK resolution: (SELECT id FROM customers WHERE email = '...') for all ticket inserts"
  - "Timestamp distribution: now() - interval 'X days' spread across 180 days"
  - "Narrative threads: related tickets for same customer showing journey (report -> follow-up -> escalation)"

duration: 6min
completed: 2026-02-08
---

# Phase 4 Plan 1: Seed Data Expansion Summary

**Expanded TechStart CRM seed data from 10/10/10 to 22 customers, 12 SaaS products, 32 tickets with narrative threads and resolution text**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-08T20:07:36Z
- **Completed:** 2026-02-08T20:14:04Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- 22 customers across 10+ industries (logistics, health, software, manufacturing, design, security, finance, education, retail, consulting, AI) with realistic names and email patterns
- 12 SaaS products: Starter/Professional/Enterprise subscription tiers ($49-$499/mo) plus add-ons (Priority Support, API Access, Custom Integrations, Data Analytics Suite, White-Label) and services (Onboarding, Security Audit, Data Migration, Training)
- 32 tickets with 4 narrative threads showing issue progression (login failures -> SSO migration, API rate limiting -> quota upgrade, data export failure -> escalation, billing error -> renewal question)
- 9 closed tickets each with specific resolution text and realistic closed_at offsets (1-5 days after creation)
- Status distributions designed for impressive analytics: 15 active / 4 inactive / 3 lead customers; 14 open / 9 in_progress / 9 closed tickets; 5 urgent / 10 high / 11 medium / 6 low priorities

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite seed.sql with expanded realistic data** - `2040581` (feat)

## Files Created/Modified

- `seed/seed.sql` - Complete demo dataset: 22 customers, 12 products, 32 tickets with narrative threads and resolution text

## Decisions Made

- Used 22 fictional companies (not real) spanning diverse industries for broad appeal to Upwork prospects
- SaaS pricing model with subscription tiers + add-ons + services matches the TechStart CRM narrative better than IT support pricing
- 4 primary narrative threads with additional multi-ticket customers for depth
- Individual UPDATE statements per closed ticket rather than batch UPDATE, giving each a unique resolution description
- Status/priority distributions weighted toward interesting analytics output rather than perfectly even splits

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed FK email typo for David Kim**

- **Found during:** Task 1 (verification step)
- **Issue:** David Kim email was `d.kim@ironcladec.com` (missing 's') but customer email was `d.kim@ironcladsec.com` -- would cause FK violation
- **Fix:** Corrected ticket subquery to `d.kim@ironcladsec.com`
- **Files modified:** seed/seed.sql
- **Verification:** All ticket subquery emails cross-checked against customer emails, zero orphans
- **Committed in:** 2040581 (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Caught during self-review before commit. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Seed data is ready for deployment to Supabase SQL editor
- Analytics `get_summary` will return varied, impressive numbers with this dataset
- README and demo conversation script (Plans 02-03) can reference specific customers, tickets, and products from this dataset

---

*Phase: 04-seed-data-portfolio-polish*
*Completed: 2026-02-08*
