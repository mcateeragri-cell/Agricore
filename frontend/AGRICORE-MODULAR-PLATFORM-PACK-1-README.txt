AgriCore Modular Platform Pack 1
================================

Extract over:
C:\projects\Agricore\frontend

Purpose
-------
Turns AgriCore's EXISTING platform feature infrastructure into the customer-facing
module system instead of creating a second toggle framework.

Security / entitlement hierarchy:
Subscription plan entitlement
  -> Company module choice
  -> Existing role permissions
  -> Existing depot/finance scopes
  -> User access

What this adds
--------------
- Administration > Modules
- Customer-facing module catalogue grouped into:
  Core Platform, Operations, Commercial, Intelligence, Enterprise, Administration
- Plan-aware module availability
- Company admins can enable/disable entitled modules
- Core Customers / Machines / Jobs remain protected and cannot be disabled
- Module dependencies are enforced
- Navigation automatically hides disabled modules
- Internal/demo companies can now tailor modules too
- Subscription customers can NEVER enable a module above their plan entitlement

New registered module feature keys:
- dispatch
- reports
- communications

These are mapped to all current plans in migration 030 to preserve today's product
behaviour; companies may then switch them off if they do not want them.

Examples
--------
Independent engineer:
Customers / Machines / Jobs / Calendar / Quotes / Invoices
AI, Stock, Service Programmes etc can be hidden if not wanted.

Dealer:
Can keep Stock, Service Programmes, AI, Reports, Financial Control,
Branches & Depots, Communications, Sales etc, subject to plan entitlement.

Important
---------
This pack is the MODULE FRAMEWORK. It does not invent Warranty, Workshop TV,
Customer Portal or other unfinished products and therefore does not advertise
unreleased features as available.

Migration
---------
Run after migrations 026-029:
supabase/migrations/20260814_030_modular_platform.sql

Expected:
Success. No rows returned

Build
-----
cd C:\projects\Agricore\frontend
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build

Smoke test
----------
1. Administration > Modules.
2. Confirm Customers, Machines and Jobs display as Core modules.
3. Disable a non-core module, e.g. Reports.
4. Refresh: Reports disappears from navigation.
5. Re-enable Reports: it returns.
6. Try disabling a dependency while a dependent module is enabled; AgriCore should block it.
7. Confirm Professional/Starter cannot enable Enterprise-only modules.
