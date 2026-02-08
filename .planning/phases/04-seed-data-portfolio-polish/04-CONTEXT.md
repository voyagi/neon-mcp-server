# Phase 4: Seed Data & Portfolio Polish - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>

## Phase Boundary

Make the project demo-ready for Upwork prospects: realistic seed data, setup documentation in the README, and a guided demo conversation script. All 12 tools are already built (Phases 1-3). This phase packages the work for presentation.

</domain>

<decisions>

## Implementation Decisions

### Seed data realism

- Believable fictional company names (e.g., "Meridian Logistics", "Cascade Health", "NovaBridge Software") — sound real but aren't
- Light narrative threads in tickets — some customers have 2-3 related tickets showing a journey (e.g., initial report, follow-up, escalation)
- Product catalog is SaaS plans and add-ons (Starter/Pro/Enterprise plans + add-ons like "Priority Support", "API Access") — fits the tech CRM theme
- Timestamps spread over 3-6 months — customers joined at different times, tickets created across the timeline — makes analytics summary look realistic

### Setup guide depth

- Target audience: technical developers comfortable with SQL, env vars, and CLI — concise steps, no hand-holding
- Link to Supabase docs for account/project creation, then focus on CRM-specific setup
- Everything lives in the README — single file has setup, config, and demo all in one place
- SQL file only for seeding (seed.sql) — user copies/pastes into Supabase SQL editor, no npm seed script

### README showcase style

- Lead with a demo screenshot/GIF showing Claude talking to the CRM — immediate visual impact before any text
- Feature list grouped by entity: Customers (list, get, create, update) / Tickets (list, get, create, close) / Products (list, search) / Analytics (summary)
- Include a simple text/mermaid architecture diagram showing Claude → MCP Server → Supabase flow
- No badges — clean look, let the content and demo speak for themselves

### Demo conversation script

- Problem-solving arc: start with "what's going on today?" → find issues → take action → verify results — shows Claude reasoning through a workflow
- Formatted as markdown User/Claude conversation exchanges in the README — prospects read through the natural flow
- Opens with schema introspection ("What data do you have access to?") — shows Claude discovering the database before querying
- 5-7 exchanges — quick and punchy, shows range without losing attention

### Claude's Discretion

- Exact company names, employee names, email addresses in seed data
- Specific ticket subjects and descriptions within the narrative threads
- Product pricing tiers and exact add-on names
- Architecture diagram format (ASCII vs mermaid) — whatever renders best in GitHub
- README section ordering after the lead visual and feature list
- Which specific tool calls to highlight in each demo exchange

</decisions>

<specifics>

## Specific Ideas

- Demo arc: schema discovery → overview summary → drill into an issue → take action → confirm result
- SaaS product catalog should feel like a real B2B software company's pricing page
- Seed data should make the analytics `get_summary` output look impressive (varied statuses, mix of priorities, spread of dates)

</specifics>

<deferred>

## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-seed-data-portfolio-polish*
*Context gathered: 2026-02-08*
