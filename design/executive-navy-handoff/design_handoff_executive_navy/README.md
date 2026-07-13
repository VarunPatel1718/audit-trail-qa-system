# Handoff: Executive Navy — Login & Dashboard

## Overview
"Executive Navy" is the design system for the Audit Trail Q&A System, a fraud/compliance dashboard for financial auditors (RBI regulatory context, India). This package covers two screens: **Login** and **Dashboard** (stat cards + flagged-transactions table), each with a toggleable **dark** and **light** mode that share one visual system.

## About the Design Files
The bundled file (`Executive Navy.dc.html`) is a **design reference built in HTML**, not production code to copy directly. It's a single interactive file with a dev-only Login/Dashboard switcher (top-right) and a real sun/moon theme toggle so you can inspect all four states (login/dashboard × dark/light) live in a browser.

Target stack (from the codebase): **React + TypeScript + Tailwind**. Recreate these designs as React components using Tailwind, matching the tokens and structure below pixel-for-pixel — don't port the raw HTML/inline-style markup as-is.

## Fidelity
**High-fidelity.** Colors, spacing, type, and component structure below are final — implement them precisely.

## Design Tokens

### Color — Dark mode
- Background: `#0A0F1C`
- Card surface: `rgba(255,255,255,0.03)` fill, `rgba(255,255,255,0.08)` border, `backdrop-filter: blur(14px)`
- Sidebar/input surface: `rgba(255,255,255,0.02–0.04)`
- Divider: `rgba(255,255,255,0.08)`
- Accent (gold): `#E8C877`
- Body text: `#CBD5E1`; high-emphasis text: `#F1F5F9`; muted labels: `#5B6685`
- Shadow: `0 24px 60px -20px rgba(0,0,0,0.6)`

### Color — Light mode
- Background: `#F7F5EF`
- Card surface: `#FFFFFF` fill, `#E8E4D8` border
- Input surface: `#FBFAF6`
- Divider: `#E8E4D8`
- Accent (gold, deepened): `#B8860B`
- Body text: `#1E2438`; high-emphasis text: `#12162A`; muted labels: `#8A8878`
- Shadow: `0 20px 44px -24px rgba(30,36,56,0.14)`

### Risk badge colors (pill: `border-radius: 999px`, `padding: 3px 10px`, `font-size: 12px`, `font-weight: 600`, border `1px solid`)
Dark mode:
- Critical: bg `rgba(226,75,74,0.14)`, border `rgba(226,75,74,0.4)`, text `#F0827E`
- High: bg `rgba(232,200,119,0.14)`, border `rgba(232,200,119,0.4)`, text `#E8C877`
- Medium: bg `rgba(91,102,133,0.20)`, border `rgba(91,102,133,0.45)`, text `#A6B0D1`
- Low: bg `rgba(107,153,130,0.16)`, border `rgba(107,153,130,0.4)`, text `#8FCBAA`

Light mode:
- Critical: bg `rgba(178,58,58,0.08)`, border `rgba(178,58,58,0.3)`, text `#B23A3A`
- High: bg `rgba(184,134,11,0.10)`, border `rgba(184,134,11,0.35)`, text `#8A6508`
- Medium: bg `rgba(91,102,133,0.10)`, border `rgba(91,102,133,0.3)`, text `#5B6685`
- Low: bg `rgba(79,122,94,0.10)`, border `rgba(79,122,94,0.3)`, text `#4F7A5E`

### Typography
- Sans (all UI text/labels): **IBM Plex Sans**, weights 400/500/600/700 — Google Fonts
- Mono (ALL numeric data — amounts, transaction refs, risk scores): **IBM Plex Mono**, weights 400/500/600 — Google Fonts
- Scale in use: 11–12.5px (labels/meta/badges), 13–14.5px (body/table cells), 15.5–16.5px (card titles), 26px (page title), 30px (stat values, mono)

### Shape & spacing
- Card radius: 12–14px; small controls (buttons/avatars): full circle or 7–8px
- Card border width: 1px throughout
- Card padding: ~20–22px (stat cards), 22px (table), 32–36px (login card)
- Grid gaps: 16–24px between cards/columns

## Screens

### 1. Login
- Centered card, 420px wide, on full-viewport background.
- Card: glass surface (see tokens), 14px radius, theme toggle button (circular, top-right of card).
- Brand row: 42×42px rounded-square logo mark (tinted gold bg + border, 16px gold inner square) + "Audit Trail Q&A System" (16.5px/700) with subtitle "Internal Audit & Compliance Platform" (12.5px, muted) beside it.
- Divider line.
- Form: Email field, Password field (each a muted 12.5px/600 label above a full-width input, 8px radius, 10px/12px padding), a row with "Remember this device" checkbox (left) and "Forgot password?" link in gold (right), then a full-width gold primary button "Sign in" (8px radius, bold).
- Below card: small security notice with a green dot — "Access is logged and monitored per RBI audit & compliance guidelines."
- Footer line beneath the card: "© 2026 Audit Trail Q&A System · Role-based access · Auditor / Finance Manager / Admin".

### 2. Dashboard
- App shell: fixed 216px left sidebar + fluid main column.
- **Sidebar**: small logo mark + "Audit Trail Q&A System" wordmark at top; nav list (Dashboard [active], Ledger, Audit Notes, Reports, Admin) — active item has gold text + tinted gold background + gold dot, inactive items are muted text + muted dot; footer pinned to bottom shows role tag ("AUDITOR", uppercase gold 11px/700) and user name.
- **Header** (main column top): page title "Dashboard" (26px/700) + subtitle "Overview of flagged transactions and audit activity" (13.5px muted) on the left; theme toggle (circular button) + circular initials avatar ("RD") on the right.
- **Stat row**: 3 equal-width cards — Flagged Transactions (128, "+14 this week"), Avg Risk Score (62.4, "Medium-High band"), Notes Drafted (73, "55 pending review"). Each card: muted 12.5px/600 label, then a large 30px IBM Plex Mono gold value, then a small meta line (red-tinted for "up"/negative-risk trend, green for "down"/improving, muted for flat).
- **Table card**: header row with "Recent Flagged Transactions" title + "View all →" gold link. Column grid: Ref (mono) | Vendor | Department (muted) | Amount ₹ (mono, right-aligned) | Risk (badge pill). Header cells: 11.5px/700 uppercase muted with letter-spacing. Rows separated by 1px divider.

## Interactions & Behavior
- **Theme toggle** (sun/moon icon button, header/login card): flips all tokens between dark/light instantly — no page reload, same layout.
- **Sign in button** navigates to the Dashboard (in the real app this should trigger auth + redirect).
- No other interactive states were specified (hover/focus states can follow standard patterns: subtle brightness/opacity shift on hover, gold focus ring on inputs).

## State Management
- `theme: 'dark' | 'light'` — persists per session/user preference (recommend localStorage or user profile setting in the real app).
- Dashboard data (stat values, transaction rows) is currently static/sample — wire to real ledger/risk-scoring API endpoints per `docs/requirements.md` in the backend repo.

## Assets
No external image assets — the logo mark is a simple two-layer rounded-square (CSS only, no SVG). Fonts are loaded from Google Fonts (IBM Plex Sans, IBM Plex Mono).

## Files
- `Executive Navy.dc.html` — the interactive design reference (open in a browser; use the top-right switcher and the sun/moon toggle to see all 4 states).
- `screenshots/login-dark.png`, `screenshots/login-light.png`, `screenshots/dashboard-dark.png`, `screenshots/dashboard-light.png` — static captures of all four states for quick reference.
