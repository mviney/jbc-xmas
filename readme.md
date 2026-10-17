# Joondalup Bridge Club Christmas Function Table Sign-Up

## Overview

Build a production-ready web application called:

**JOONDALUP BRIDGE CLUB**
**Christmas Function Table Sign-Up**

The application allows club members and guests to reserve seats at Christmas function tables, view current seating allocations, find friends, and manage dietary requirements.

The visual design should be inspired by a physical bridge club noticeboard with numbered table sheets rather than a generic booking system.

The primary goal is registration.

The seating board is a secondary feature used for viewing attendance and finding friends.

---

# Technology Stack

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase
- React Query
- Zustand
- Framer Motion

Application should be fully mobile responsive and production ready.

---

# Visual Design

Theme:

- Dark green bridge club aesthetic
- Elegant Christmas event styling
- Physical noticeboard inspiration
- Modern but conservative appearance

Use `Screenshot 2026-10-16 233228.png` as the original visual inspiration for the application, especially its dark compact layout, numbered table sheets, and search and reservation controls. Treat the screenshot as visual reference; the written requirements in this README take precedence for workflow and behavior.

Background:

- #02110d

Accent colours:

- Emerald
- Teal

Use:

- Subtle glow effects
- Thin borders
- Rounded corners
- High contrast text

Avoid:

- Generic SaaS dashboard look
- Glassmorphism
- Excessive shadows
- Bright colours
- Gimmicky animations

---

# Page Layout

## Header

Display:

JOONDALUP BRIDGE CLUB

Large page title:

Table Sign-Up

Instruction text.

### Summary Statistics

Display:

- Total Capacity
- Reserved Places
- Remaining Places
- Members Attending
- Guests Attending

Example:

145 of 180 places reserved

---

## Search Section

Display directly below statistics.

Placeholder:

"Looking for a friend? Search by name or table number"

Search supports:

- Member Name
- Guest Name
- Table Number

Matching tables should be highlighted.

Auto-scroll to results.

---

# Registration Section

The registration form appears **above the seating board**.

Registration is the primary action of the application.

Users should not be required to scroll through seating layouts to register.

---

## Registration Form

### Member

Member Name

- Searchable member lookup
- Autocomplete

Member Ticket Number

### Optional Guest

Checkbox:

Add Guest

When enabled:

Guest Name

Guest Ticket Number

---

### Dietary Requirements

Allow multiple selections.

Options:

- Vegetarian
- Nut-Free
- Gluten-Free

Additional Dietary Notes

Optional free-text field.

Maximum 100 characters.

---

### Preferred Table

Dropdown list.

Example:

Table 1 (8 seats left)

Table 2 (12 seats left)

Table 3 (4 seats left)

---

### Submit

Buttons:

Reserve Place

or

Reserve 2 Places

depending on whether a guest is included.

---

# Registration Validation

Rules:

- Every attendee requires a ticket number.
- Ticket numbers must be unique.
- Duplicate registrations not allowed.
- Guest ticket number must be different from member ticket number.
- Capacity limits enforced.
- Registration cannot exceed table capacity.

---

# Member Lookup

Provide autocomplete lookup.

Search by:

- First Name
- Last Name
- Preferred Name
- Member Number

Examples:

Michael Viney

Michael Smith

Michelle Brown

Must support:

- Keyboard navigation
- Mobile use
- Fuzzy matching

If a selected member already has a registration:

Display:

Already seated at Table X

Provide:

- View Table
- Move Registration

---

# Database Design

## members

```sql
id
member_number
first_name
last_name
preferred_name
email
active
created_at
```

## tables

```sql
id
table_number
capacity
created_at
```

## attendees

```sql
id
member_id nullable
name
ticket_number
table_id
is_guest
registered_by_attendee_id nullable
dietary_requirements jsonb
dietary_notes
created_at
updated_at
```

---

# Attendee Model

Every person attending is an attendee.

Members and guests use the same structure.

Do NOT create a separate guest table.

Examples:

Michael Viney

Ticket #127

Guest = false

Karen Viney

Ticket #128

Guest = true

Registered By = Michael Viney

Every attendee:

- Occupies one seat
- Has one ticket number
- Can be searched
- Can be moved
- Appears in reports
- May have dietary requirements

---

# Seating Board

Display below the registration form.

Design inspiration:

Physical Bridge Club Noticeboard.

Each table displays as a vertical seating sheet.

Table card features:

- Table Number
- Capacity
- Seats Used
- Seats Available
- Large faded table number watermark
- Noticeboard style styling
- Lined-paper seating sheet effect

Display button:

Sit Here

When clicked:

- Preferred Table is selected
- User is scrolled to the registration form

---

# Desktop Behaviour

Show all tables.

Display occupied seats and available seats.

Example:

Michael Viney

Karen Viney

Available

Available

Available

Available

---

# Mobile Behaviour

Mobile optimisation is critical.

Rules:

- Show only occupied tables.
- Completely hide empty tables.
- If no registrations exist, show only the first table.
- Tables are collapsed by default.

---

## Mobile Collapsed View

Example:

Table 7

3 / 12 Seated

9 Places Available

[ View Seating Layout ]

[ Sit Here ]

---

## Mobile Expanded View

Example:

Michael Viney

Karen Viney

John Smith

Available

Available

Available

Available

Users may collapse or expand individual tables.

Remember expansion state using localStorage.

---

# Search Experience

Searching should:

- Highlight matching tables.
- Auto-scroll to matching table.
- Search attendee names and table numbers.

Examples:

Search "Michael"

→ Table 7

Search "7"

→ Table 7

Public seating results show names and table assignments only. Ticket numbers and dietary details remain private.

---

# Administration

Provide protected admin area.

Capabilities:

- Add Attendee
- Edit Attendee
- Delete Attendee
- Move Attendee
- Drag and Drop Between Tables
- Create Tables
- Change Capacities
- Lock Registrations
- Unlock Registrations

---

# Reporting

## Attendance Dashboard

Display:

- Members
- Guests
- Total Attendees

Example:

Members: 121

Guests: 27

Total: 148

---

## Occupancy Dashboard

Display:

- Tables Full
- Tables Partially Filled
- Tables Empty

---

# Catering Reports

Display counts for:

- Vegetarian
- Nut-Free
- Gluten-Free

Detailed report:

Name

Ticket Number

Table

Dietary Requirements

Exports:

- CSV
- Excel

Printable catering report.

---

# Printing

Generate:

- A4 Seating Chart
- A3 Seating Chart

Include:

- Event Name
- Event Date
- Table Allocations
- Generation Timestamp

---

# Realtime

Use Supabase Realtime.

Update instantly when:

- Registrations added
- Registrations changed
- Registrations cancelled
- Attendees moved
- Guest registrations added
- Dietary requirements changed

---

# Deployment Configuration

## Production

URL:

https://jbc-xmas.bridge.monster.viney.net.au

Branch:

main

Environment:

production

No environment banner.

---

## Test

URL:

https://jbc-xmas.test.bridge.monster.viney.net.au

Branch:

develop

Environment:

test

Display a visible banner:

TEST ENVIRONMENT

Registrations are not for the live event.

---

# Docker Requirements

Application must be fully Dockerised.

Provide:

- Dockerfile
- docker-compose.yml
- docker-compose.prod.yml
- docker-compose.test.yml
- nginx.conf
- .dockerignore

The image builds the Vite app and serves it from an unprivileged Nginx container. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`; these public browser values are injected at build time. The container does not receive the Supabase secret key.

Production and test use separate Supabase projects. Create a test project, apply the SQL migrations in `supabase/migrations/`, deploy `reserve-seats`, and configure its Turnstile function secrets before deploying the test stack. Copy `.env.test.example` to the ignored `.env.test` file and set `TEST_SUPABASE_URL` and `TEST_SUPABASE_ANON_KEY` from that test project. The test Compose overlay requires these separate variables, so it cannot silently fall back to production credentials. The currently authenticated Supabase account has no separate test project yet.

Traefik must be running with its external `traefik-public` network, `websecure` and `websecure-wan` entrypoints, and the `letsencrypt` certificate resolver. DNS for both hostnames must point to the Traefik host.

Build and start production:

```bash
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml -p jbc-xmas-prod up -d --build
```

Build and start test:

```bash
docker compose --env-file .env.test -f docker-compose.yml -f docker-compose.test.yml -p jbc-xmas-test up -d --build
```

Starting either stack registers its hostname with Traefik, which requests a certificate through the configured resolver.

---

# Supabase Setup

The public app reads the seating board and member lookup through database functions. Direct access to member and attendee tables is disabled for public roles. Reservations are inserted through a database function that checks ticket uniqueness and table capacity in one transaction.

## Configure

Set the browser-safe project values in the ignored `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Apply the SQL files in `supabase/migrations/` in filename order in the Supabase SQL Editor. Then add a Supabase secret key to `.env.local` for the one-time member import only. The legacy service-role key is also accepted:

```env
SUPABASE_SECRET_KEY=your-secret-key
```

Run `npm run import:members` after applying the migration. This elevated key is only read by the Node import script; never use it in a `VITE_` variable or client-side code, and remove it from `.env.local` after importing.

The migration creates 15 tables with 12 seats each. To change that layout, update the migration and the `TABLES` constant in `src/App.tsx` together.

The public board displays attendee names, guest/member status, and table numbers. Ticket numbers and dietary details are not returned by its public database function. The member search function returns at most eight matches for public registration.

## Turnstile

The form uses the existing Turnstile site key in `src/lib/turnstile.ts`. The browser sends its one-use token to the `reserve-seats` Supabase Edge Function; that function verifies the token with Cloudflare Siteverify, checking the `signup` action and exact request hostname before calling the database reservation function. Migration `202610170004_protect_reservation_rpc.sql` prevents public roles from bypassing the Edge Function.

In Supabase Dashboard, add these Edge Function secrets:

- `TURNSTILE_SECRET`: the secret for the existing Turnstile widget. Do not put it in `.env.local`, a `VITE_` variable, source control, or chat.
- `TURNSTILE_ALLOWED_HOSTNAMES`: comma-separated hostnames for this deployment, without schemes or paths. Production should contain only its approved public hostname; do not include `localhost` or `127.0.0.1` in production.

Ensure the existing widget allows the deployment hostname. Apply all SQL migrations in filename order, then deploy with `supabase functions deploy reserve-seats`. The project must have the Supabase Edge Functions runtime variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` available; the secret key is used only server-side.

For local testing against a local Supabase stack, set its function hostname allowlist to `localhost,127.0.0.1` and ensure those hostnames are enabled on the Turnstile widget. Do not add those local hostnames to the production function allowlist.
- .dockerignore
- Makefile

Support:

```bash
docker compose up -d
```

Development support:

- Hot Reload
- Tailwind Reload
- TypeScript Rebuild

Use:

- Multi-stage builds
- Non-root containers
- Health checks
- Small production images

Compatible with:

- Docker Compose
- Portainer
- Docker Swarm

---

# Reverse Proxy

Assume operation behind:

- Traefik
- Nginx Proxy Manager

Hostnames:

Production:

jbc-xmas.bridge.monster.viney.net.au

Test:

jbc-xmas.test.bridge.monster.viney.net.au

Generated URLs must be environment aware.

---

# Secret Management

Use 1Password CLI exclusively.

Do NOT:

- Commit secrets
- Hardcode credentials
- Store live secrets in Git

Required secrets:

SUPABASE_URL

SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

ADMIN_PASSWORD

SESSION_SECRET

Use references such as:

op://Bridge Monster/JBC-XMAS-PROD/SUPABASE_URL

Support execution via:

```bash
op run -- docker compose up -d
```

Application startup must:

- Validate all required secrets
- Fail fast if missing
- Never log secrets

---

# Documentation

Generate:

- Local Development Guide
- Docker Development Guide
- Production Deployment Guide
- Portainer Deployment Guide
- Traefik Deployment Guide
- 1Password Setup Guide
- Supabase Setup Guide
- Backup Procedures
- Restore Procedures
- Upgrade Procedures

---

# Operations

Provide:

```bash
make dev
make build
make docker
make backup
make restore
make lint
make test
```

and equivalent npm scripts.

---

# Observability

Provide:

- Health Endpoint
- Readiness Endpoint
- Structured Logging
- Audit Logging

Audit:

- Registrations
- Cancellations
- Table Changes
- Dietary Changes

Never log secrets.

---

# Security

Implement:

- Secure Headers
- Rate Limiting
- Input Validation
- Input Sanitisation
- Supabase RLS Policies
- Least Privilege Access
- Admin Authentication

---

# Future Enhancement Support

Architect for future support of:

- Payments
- QR Tickets
- Event Check-In
- Name Badge Printing
- Prize Draws
- Wait Lists
- Multiple Events
- Sponsor Tables

---

# Success Criteria

Registration should be achievable on a phone in under 30 seconds.

Organisers should understand occupancy within 3 seconds.

Users should instantly see where friends are sitting.

The application should feel polished, professional and appropriate for a Joondalup Bridge Club Christmas function.

Generate:

- Complete database schema
- Migrations
- Supabase RLS policies
- Seed data
- React pages
- Components
- Hooks
- Docker assets
- Admin dashboard
- Reports
- Tests
- Deployment documentation

Deliver production-ready code.
