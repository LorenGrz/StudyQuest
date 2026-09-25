# Visual Responsive QA

> Status: **PENDING MANUAL/BROWSER PASS.** The automated gates (Task 9) are green
> — 45/45 component tests, production build, legacy-class scan, and tiny-text
> scan. This matrix still needs a real browser pass at the listed viewports and
> themes before any cell can be marked `Pass`. Do not mark `Pass` without
> actually observing the screen.

## How to run

```bash
pnpm run dev
# Frontend: http://localhost:5173
# API:      http://localhost:3000/api/v1
# Swagger:  http://localhost:3000/docs
```

Seed login:

```text
alice@studyquest.dev
Password123!
```

Viewports: 320x844, 390x844, 768x1024, 1280x800. Toggle light theme in Settings.

### Acceptance per width
- **Mobile (320 / 390):** no document-level horizontal overflow; no clipped title/action; ≥16px gutters; bottom nav does not cover content; chat composer usable above the nav.
- **Tablet (768):** two-column grids activate where planned; dialogs centered (not stretched bottom sheets); content not over-constrained to 480px.
- **Desktop (1280):** desktop rail visible; mobile bottom nav hidden; dashboard/profile/leaderboard use available width; focused game surfaces remain centered.
- **Light theme (390 + 1280):** text, borders, cards, disabled states, and focus rings all legible.

## Results

Legend: `-` = not yet checked.

| Route | 320 | 390 | 768 | 1280 | Light | Notes |
|---|---:|---:|---:|---:|---:|---|
| /auth | - | - | - | - | - | |
| /dashboard | - | - | - | - | - | |
| /subjects | - | - | - | - | - | |
| /match | - | - | - | - | - | |
| /parties | - | - | - | - | - | |
| /party/&lt;id&gt; (Quests/Chat/Miembros/Actividad) | - | - | - | - | - | verify sticky composer clears bottom nav; SegmentedTabs overflow on narrow |
| /friends | - | - | - | - | - | |
| /profile | - | - | - | - | - | |
| /settings (all tabs, dark + light) | - | - | - | - | - | |
| /leaderboard | - | - | - | - | - | |
| /subjects/&lt;id&gt;/skill-tree | - | - | - | - | - | check pan/zoom + node detail sheet |
| /tournaments | - | - | - | - | - | |
| /tournament live + results | - | - | - | - | - | |

## Known deferred cosmetics (from per-task reviews — verify or fix during this pass)
- PartyRoom SegmentedTabs row can clip on very narrow screens with no scroll-affordance hint.
- Sticky chat composer should visually clear the mobile bottom nav — confirm.
- FullscreenLayout content is no longer width-constrained on wide desktop.
- ProfilePage stats grid is 2-col on all widths (could be 1-col on small phones).
- A few pre-existing hardcoded hex colors and inline styles remain (tournament live red, bronze, dashboard search panel).
