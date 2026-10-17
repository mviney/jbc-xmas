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

"Looking for a friend? Search by name or ticket number"

Search supports:

- Member Name
- Guest Name
- Ticket Number
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

Michael Viney (#127)

Karen Viney (#128)

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

Michael Viney (#127)

Karen Viney (#128)

John Smith (#129)

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
- Search tickets, names and tables.

Examples:

Search "Michael"

→ Table 7

Search "128"

→ Karen Viney

→ Table 7

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
- docker-compose.test.yml
- docker-compose.override.yml
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
