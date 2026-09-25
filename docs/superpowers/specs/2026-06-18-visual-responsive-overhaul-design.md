# StudyQuest Visual Responsive Overhaul Design

## Context

StudyQuest already implements authentication, dashboard, subject enrollment, matchmaking, parties, rich chat, friends, profile cosmetics, settings, leaderboard, skill tree, quizzes, and tournaments. The current visual regression comes from the Tailwind migration merged in `dev`.

The primary defect is the global universal reset in `frontend/src/index.css`. Its unlayered `margin: 0` and `padding: 0` declarations override Tailwind spacing utilities. A second defect is that many components still reference legacy semantic class names whose definitions were removed during the migration.

## Goal

Restore every existing flow to a polished, presentation-ready state and make the application usable at 320px mobile, 768px tablet, and 1280px desktop widths without changing backend behavior.

## Visual Direction

- Preserve the dark gaming identity, purple accent, league colors, and playful competitive tone.
- Use readable spacing and typography instead of adding decorative effects.
- Keep cards at 8px or less where practical; reserve larger radii for modals, profile framing, and game surfaces.
- Replace emoji-only command controls with Lucide icons when a matching icon exists. Decorative status emoji may remain.
- Maintain the light theme with equivalent contrast and hierarchy.
- Use a bottom navigation on mobile and a left navigation rail on desktop.
- Let operational pages use the available desktop width while focused game flows remain constrained.

## Architecture

### 1. Design-system foundation

`frontend/src/index.css` remains the single token and animation source. Global element rules move into Tailwind's `@layer base`, so utilities win the cascade. Missing semantic color aliases are either mapped explicitly or replaced with existing `primary`, `secondary`, and `muted` tokens.

Reusable primitives in `frontend/src/components/UI.tsx` gain consistent spacing, focus states, icon support, cards, page headers, alerts, empty states, and segmented tabs. Components should not depend on deleted global classes.

### 2. Responsive shell

`frontend/src/components/Layouts.tsx` becomes the shared application shell:

- Mobile: full-width content plus fixed bottom navigation.
- Tablet: centered content with larger gutters.
- Desktop: left navigation rail plus a flexible content region.
- Focused quiz and matchmaking surfaces use a constrained game container.

Every page receives predictable horizontal padding through the shell or a `PageContainer`; pages stop inventing gutters independently.

### 3. Flow migration

Legacy CSS consumers are migrated in coherent groups:

1. Auth, subjects, and friends.
2. Parties, party room, member list, invite sheets, rich chat, quests, and activity.
3. Dashboard, profile, settings, leaderboard, match, skill tree, quizzes, and tournaments.

Inline styles that encode layout or theme are replaced with utilities or shared components. Data behavior and service calls remain unchanged.

## Responsive Rules

- `320-479px`: single column, 16px gutters, bottom navigation, minimum 44px interactive targets.
- `480-767px`: single column, 20-24px gutters, wider cards and modal sheets.
- `768-1023px`: two-column grids where content permits, 24px gutters.
- `1024px+`: desktop rail, content width up to 1180px, two- or three-column dashboard/profile sections.
- Chat composer and bottom navigation respect safe-area insets.
- No horizontal document overflow at any target width.

## Error And Empty States

- Raw backend strings such as `Internal server error` are not rendered as dominant full-width bars.
- Shared alerts provide a concise title, supportive copy, and retry action when available.
- Empty states have a single icon, title, explanation, and one primary action.
- Loading states preserve layout dimensions to avoid jumps.

## Accessibility

- All icon-only buttons have accessible names and tooltips.
- Focus rings remain visible in dark and light themes.
- Tabs retain `tablist`, `tab`, and `aria-selected`.
- Color is not the only status signal.
- Text remains at least 12px for supplemental labels and 14px for normal content.
- Reduced-motion preferences disable nonessential animations.

## Testing

- Vitest component tests protect layout contracts and interactive states.
- Static design-system tests prevent the spacing cascade regression and reject known legacy class names.
- Existing frontend tests must pass.
- `pnpm build` and `pnpm lint` must pass.
- Browser verification covers auth, dashboard, subjects, match, parties, party room tabs, friends, profile, settings themes, leaderboard, skill tree, quizzes, and tournaments at 320x844, 390x844, 768x1024, and 1280x800.

## Out Of Scope

- Backend changes.
- New product functionality.
- Rebranding or replacing the established purple gaming identity.
- A separate marketing landing page.
- Rewriting feature state management or service APIs.

