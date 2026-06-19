# StudyQuest Visual Responsive Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore every existing StudyQuest screen to a polished visual state and provide responsive mobile, tablet, and desktop layouts for tomorrow's presentation.

**Architecture:** Repair the Tailwind cascade first, then establish shared responsive layout/UI primitives, and finally migrate legacy-styled flows in feature groups. Preserve all service, state, routing, and backend behavior while replacing deleted CSS classes and layout-heavy inline styles.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 4, Vite 8, Vitest, Testing Library, Lucide React, React Router 7.

---

## File Structure

**Create**

- `frontend/src/components/AppShell.tsx`: responsive mobile/desktop navigation shell.
- `frontend/src/components/PagePrimitives.tsx`: page headers, cards, alerts, empty states, tabs, and content containers.
- `frontend/src/components/AppShell.test.tsx`: navigation and responsive shell contracts.
- `frontend/src/components/PagePrimitives.test.tsx`: shared visual component behavior.
- `frontend/src/test/designSystem.test.ts`: static regression tests for CSS layering and removed legacy classes.

**Modify**

- `frontend/src/index.css`: layered reset, semantic tokens, reduced motion, safe-area rules.
- `frontend/src/components/Layouts.tsx`: delegate layouts to the new responsive shell.
- `frontend/src/components/UI.tsx`: normalize buttons, inputs, selects, badges, and spinners.
- `frontend/src/pages/AuthPage.tsx`
- `frontend/src/components/AuthForms.tsx`
- `frontend/src/pages/SubjectExplorerPage.tsx`
- `frontend/src/components/SubjectComponents.tsx`
- `frontend/src/pages/FriendsPage.tsx`
- `frontend/src/pages/PartiesPage.tsx`
- `frontend/src/pages/PartyRoomPage.tsx`
- `frontend/src/components/PartyComponents.tsx`
- `frontend/src/components/party-chat/ChatBox.tsx`
- `frontend/src/components/party-chat/ChatComposer.tsx`
- `frontend/src/components/party-chat/ChatMessageItem.tsx`
- `frontend/src/pages/dashboard.tsx`
- `frontend/src/components/DashboardComponents.tsx`
- `frontend/src/components/DashboardAnalytics.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/pages/LeaderboardPage.tsx`
- `frontend/src/pages/MatchPage.tsx`
- `frontend/src/components/MatchComponents.tsx`
- `frontend/src/components/MatchmakingComponents.tsx`
- `frontend/src/pages/SkillTreePage.tsx`
- `frontend/src/components/SkillTreeComponents.tsx`
- `frontend/src/pages/QuizPage.tsx`
- `frontend/src/components/QuizComponents.tsx`
- `frontend/src/pages/TournamentsPage.tsx`
- `frontend/src/pages/TournamentLivePage.tsx`
- `frontend/src/pages/TournamentResultsPage.tsx`

---

### Task 1: Protect The Tailwind Cascade

**Files:**
- Create: `frontend/src/test/designSystem.test.ts`
- Modify: `frontend/src/index.css:1-210`

- [ ] **Step 1: Write the failing cascade regression test**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('design-system cascade', () => {
  it('keeps global margin and padding resets inside Tailwind base layer', () => {
    const baseLayer = css.match(/@layer base\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(baseLayer).toContain('box-sizing: border-box')
    expect(baseLayer).toContain('margin: 0')
    expect(baseLayer).toContain('padding: 0')
  })

  it('does not declare an unlayered universal spacing reset', () => {
    const beforeBaseLayer = css.split('@layer base')[0]
    expect(beforeBaseLayer).not.toMatch(/\*\s*,[\s\S]*padding:\s*0/)
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd frontend
pnpm test -- src/test/designSystem.test.ts
```

Expected: FAIL because the current universal reset is not inside `@layer base`.

- [ ] **Step 3: Move the reset into the Tailwind base layer**

Replace the current global element block with:

```css
@layer base {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    min-width: 320px;
    background: var(--bg-base);
    transition: background 0.2s ease, color 0.2s ease;
  }

  body {
    min-width: 320px;
    height: 100dvh;
    overflow: hidden;
    background: var(--bg-base);
    color: var(--text-primary);
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }
}
```

Keep scrollbar rules outside this block, but remove the duplicate unlayered `margin` and `padding` declarations.

- [ ] **Step 4: Add compatible semantic tokens and reduced motion**

Extend `@theme`:

```css
--color-content: var(--text-primary);
--color-faint: var(--text-muted);
```

Add:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Run the test and verify GREEN**

Run:

```bash
pnpm test -- src/test/designSystem.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/index.css frontend/src/test/designSystem.test.ts
git commit -m "fix(frontend): restore Tailwind spacing cascade"
```

---

### Task 2: Build Shared Page Primitives

**Files:**
- Create: `frontend/src/components/PagePrimitives.tsx`
- Create: `frontend/src/components/PagePrimitives.test.tsx`
- Modify: `frontend/src/components/UI.tsx`

- [ ] **Step 1: Write failing primitive tests**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Alert, EmptyState, PageHeader } from './PagePrimitives'

describe('page primitives', () => {
  it('renders a page header with title and action', () => {
    render(<PageHeader title="Materias" action={<button>Nueva</button>} />)
    expect(screen.getByRole('heading', { name: 'Materias' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva' })).toBeInTheDocument()
  })

  it('renders an actionable error state', () => {
    render(<Alert title="No pudimos cargar las quests" actionLabel="Reintentar" onAction={() => {}} />)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('renders one primary empty-state action', () => {
    render(<EmptyState icon="📚" title="Sin materias" action={<button>Explorar</button>} />)
    expect(screen.getByRole('button', { name: 'Explorar' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm test -- src/components/PagePrimitives.test.tsx
```

Expected: FAIL because `PagePrimitives.tsx` does not exist.

- [ ] **Step 3: Implement the primitives**

Create exports with these contracts:

```tsx
export function PageContainer({ children, width = 'wide' }: {
  children: ReactNode
  width?: 'narrow' | 'wide'
})

export function PageHeader({ title, subtitle, back, action }: {
  title: string
  subtitle?: string
  back?: () => void
  action?: ReactNode
})

export function Surface({ children, className }: {
  children: ReactNode
  className?: string
})

export function Alert({ title, description, actionLabel, onAction }: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
})

export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
})

export function SegmentedTabs<T extends string>(props: {
  tabs: Array<{ id: T; label: string; icon?: ReactNode }>
  active: T
  onChange: (id: T) => void
  label: string
})
```

Use `rounded-lg`, `border-edge`, `bg-surface`, `px-4 sm:px-5 lg:px-6`, visible focus rings, and minimum 44px controls.

- [ ] **Step 4: Normalize existing UI controls**

In `UI.tsx`:

- Change all button sizes to include `min-h-11`.
- Keep card/button radii at `rounded-lg`; reserve `rounded-xl` for large game actions.
- Add `aria-busy={isLoading}`.
- Add placeholder color and dark/light compatible focus rings to inputs/selects.
- Add optional `startIcon` and `endIcon` props rather than embedding emoji in command text.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm test -- src/components/PagePrimitives.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/PagePrimitives.tsx frontend/src/components/PagePrimitives.test.tsx frontend/src/components/UI.tsx
git commit -m "feat(frontend): add shared page primitives"
```

---

### Task 3: Add The Responsive Application Shell

**Files:**
- Create: `frontend/src/components/AppShell.tsx`
- Create: `frontend/src/components/AppShell.test.tsx`
- Modify: `frontend/src/components/Layouts.tsx`

- [ ] **Step 1: Write failing navigation tests**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('exposes primary destinations with correct names', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell><div>Content</div></AppShell>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link', { name: 'Inicio' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Match' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Parties' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Perfil' }).length).toBeGreaterThan(0)
  })

  it('marks the current destination', () => {
    render(
      <MemoryRouter initialEntries={['/parties']}>
        <AppShell><div>Content</div></AppShell>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link', { name: 'Parties' })[0]).toHaveAttribute('aria-current', 'page')
  })
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm test -- src/components/AppShell.test.tsx
```

Expected: FAIL because `AppShell` does not exist.

- [ ] **Step 3: Implement `AppShell`**

Use Lucide `Home`, `Swords`, `Shield`, and `User` icons.

Required shell classes:

```tsx
<div className="h-dvh w-full bg-base text-primary lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
  <aside className="hidden border-r border-edge bg-surface lg:flex lg:flex-col">...</aside>
  <main className="min-w-0 overflow-y-auto pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
    {children}
  </main>
  <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
    ...
  </nav>
</div>
```

Set `aria-current="page"` and tooltips for desktop icon buttons.

- [ ] **Step 4: Update layout wrappers**

- `MobileLayout` should render `AppShell`.
- `FullscreenLayout` should render `AppShell` with centered narrow content.
- `GameLayout` should remain focused but gain `w-full max-w-3xl`.
- Remove the duplicate old `BottomNav` implementation.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm test -- src/components/AppShell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/AppShell.tsx frontend/src/components/AppShell.test.tsx frontend/src/components/Layouts.tsx
git commit -m "feat(frontend): add responsive application shell"
```

---

### Task 4: Repair Authentication, Subjects, And Friends

**Files:**
- Modify: `frontend/src/pages/AuthPage.tsx`
- Modify: `frontend/src/components/AuthForms.tsx`
- Modify: `frontend/src/pages/SubjectExplorerPage.tsx`
- Modify: `frontend/src/components/SubjectComponents.tsx`
- Modify: `frontend/src/pages/FriendsPage.tsx`
- Modify: `frontend/src/components/UploadNoteCard.test.tsx` only if shared UI assertions change

- [ ] **Step 1: Extend the design-system regression test**

Add:

```ts
const migratedFiles = [
  'src/pages/AuthPage.tsx',
  'src/components/SubjectComponents.tsx',
  'src/pages/FriendsPage.tsx',
]

it.each(migratedFiles)('%s has no removed legacy layout classes', (file) => {
  const source = readFileSync(resolve(process.cwd(), file), 'utf8')
  expect(source).not.toMatch(/\b(search-bar|filter-chips|subject-list-item|page-header|card-body|row-gap|list-item|auth-switch|link-btn)\b/)
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm test -- src/test/designSystem.test.ts
```

Expected: FAIL listing the current legacy classes.

- [ ] **Step 3: Migrate auth**

- Keep one login/register switch, not two.
- Use `min-h-dvh`, `p-4 sm:p-6`, `max-w-md`, and responsive card padding.
- Ensure the card has visible 16px outer gutters at 320px.
- Replace `auth-switch` and `link-btn` with Tailwind classes.

- [ ] **Step 4: Migrate subjects**

- Use `PageHeader`, a search input with `Search` icon, horizontally scrollable semester chips, and responsive subject cards.
- Use `grid gap-3 md:grid-cols-2`.
- Put enrollment status and action in a stable right column.
- Make descriptions clamp to three lines.

- [ ] **Step 5: Migrate friends**

- Use `PageHeader`, `Surface`, and shared empty states.
- At `md`, show requests/invitations and friend list in a two-column grid.
- Keep the add-friend form in a full-width top surface.
- Use `@username` consistently.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
pnpm test -- src/test/designSystem.test.ts
```

Expected: PASS for the migrated file list.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/AuthPage.tsx frontend/src/components/AuthForms.tsx frontend/src/pages/SubjectExplorerPage.tsx frontend/src/components/SubjectComponents.tsx frontend/src/pages/FriendsPage.tsx frontend/src/test/designSystem.test.ts
git commit -m "fix(frontend): restore auth subjects and friends styling"
```

---

### Task 5: Repair Parties And Rich Chat

**Files:**
- Modify: `frontend/src/pages/PartiesPage.tsx`
- Modify: `frontend/src/pages/PartyRoomPage.tsx`
- Modify: `frontend/src/components/PartyComponents.tsx`
- Modify: `frontend/src/components/party-chat/ChatBox.tsx`
- Modify: `frontend/src/components/party-chat/ChatComposer.tsx`
- Modify: `frontend/src/components/party-chat/ChatMessageItem.tsx`
- Modify: `frontend/src/components/party-chat/ChatComposer.test.tsx`
- Modify: `frontend/src/components/party-chat/ChatMessageItem.test.tsx`

- [ ] **Step 1: Add failing chat accessibility/layout tests**

Add to `ChatComposer.test.tsx`:

```tsx
it('keeps the native file input hidden and exposes one attachment command', () => {
  renderComposer()
  expect(screen.getByLabelText('Adjuntar archivo')).toHaveClass('sr-only')
  expect(screen.getAllByRole('button', { name: 'Adjuntar archivo' })).toHaveLength(1)
})

it('exposes a send button after entering text', async () => {
  renderComposer()
  await userEvent.type(screen.getByRole('textbox', { name: 'Escribí un mensaje' }), 'Hola')
  expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm test -- src/components/party-chat/ChatComposer.test.tsx
```

Expected: FAIL because the legacy `chat-file-input` class no longer hides the native input.

- [ ] **Step 3: Migrate party lists and room header**

- Use `PageHeader`, responsive party cards, and a proper modal surface.
- Replace layout inline styles.
- Use `SegmentedTabs` for Quests, Chat, Miembros, and Actividad.
- Move injected `tabBarStyles` out of JavaScript and delete the runtime stylesheet injection.

- [ ] **Step 4: Migrate member, invite, quest, and activity components**

- Convert every legacy class in `PartyComponents.tsx` to Tailwind/shared primitives.
- Use responsive grids for members and quests at `md`.
- Make invite sheets bottom sheets on mobile and centered dialogs on desktop.
- Ensure destructive actions are visually separated and labeled.

- [ ] **Step 5: Migrate chat**

- Set the native file input to `className="sr-only"`.
- Use a sticky composer above the mobile nav.
- Give icon buttons `size-11`, consistent borders, focus rings, and Lucide icons.
- Set message bubbles to `max-w-[85%] sm:max-w-md`.
- Keep audio players and attachment names within the bubble width.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
pnpm test -- src/components/party-chat/ChatComposer.test.tsx src/components/party-chat/ChatMessageItem.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/PartiesPage.tsx frontend/src/pages/PartyRoomPage.tsx frontend/src/components/PartyComponents.tsx frontend/src/components/party-chat
git commit -m "fix(frontend): rebuild parties and rich chat layout"
```

---

### Task 6: Normalize Dashboard And Error States

**Files:**
- Modify: `frontend/src/pages/dashboard.tsx`
- Modify: `frontend/src/components/DashboardComponents.tsx`
- Modify: `frontend/src/components/DashboardAnalytics.tsx`
- Modify: relevant dashboard tests or create `frontend/src/pages/dashboard.test.tsx`

- [ ] **Step 1: Write a failing error-state test**

```tsx
it('shows a friendly retry state instead of the raw backend error', async () => {
  mockQuestService.getToday.mockRejectedValue(new Error('Internal server error'))
  renderDashboard()
  expect(await screen.findByText('No pudimos cargar tus quests')).toBeInTheDocument()
  expect(screen.queryByText('Internal server error')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm test -- src/pages/dashboard.test.tsx
```

Expected: FAIL because raw errors are currently rendered.

- [ ] **Step 3: Recompose dashboard sections**

- Use `PageContainer`.
- Desktop: `lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]`.
- Keep greeting/search/active-party full width.
- Place quests and recommendations in the main column.
- Place subjects, tournaments, and compact leaderboard in the secondary column.
- Preserve a single-column order on mobile.

- [ ] **Step 4: Replace raw errors**

Use `Alert` with:

```tsx
title="No pudimos cargar tus quests"
description="La API no respondió. Podés seguir usando el resto de StudyQuest."
actionLabel="Reintentar"
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm test -- src/pages/dashboard.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/dashboard.tsx frontend/src/components/DashboardComponents.tsx frontend/src/components/DashboardAnalytics.tsx frontend/src/pages/dashboard.test.tsx
git commit -m "fix(frontend): refine responsive dashboard states"
```

---

### Task 7: Make Profile, Settings, And Leaderboard Responsive

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/pages/SettingsPage.tsx`
- Modify: `frontend/src/pages/SettingsPage.test.tsx`
- Modify: `frontend/src/pages/LeaderboardPage.tsx`

- [ ] **Step 1: Add failing settings theme test**

```tsx
it('keeps profile text on semantic theme colors', async () => {
  renderSettings()
  await userEvent.click(screen.getByRole('tab', { name: 'Apariencia' }))
  await userEvent.click(screen.getByRole('switch', { name: 'Cambiar tema' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(screen.getByText('Tema claro')).toHaveClass('text-primary')
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm test -- src/pages/SettingsPage.test.tsx
```

Expected: FAIL while `text-content` remains in use.

- [ ] **Step 3: Recompose profile**

- Header/profile summary spans the page.
- Use `md:grid-cols-2` for stats and inventory.
- Use `lg:grid-cols-[1fr_340px]` for progression plus league panel.
- Remove horizontal overflow from league rows.
- Replace command emojis with Lucide icons.

- [ ] **Step 4: Recompose settings**

- Desktop: vertical tab rail plus content panel.
- Mobile/tablet: horizontal segmented tabs.
- Replace `text-content`/`text-faint` with registered semantic tokens.
- Keep every form control at least 44px high.

- [ ] **Step 5: Recompose leaderboard**

- Mobile podium remains compact.
- Desktop podium and ranked list share a two-column layout.
- Subject tabs scroll on mobile and wrap on desktop.
- Ensure all names truncate within stable widths.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
pnpm test -- src/pages/SettingsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx frontend/src/pages/SettingsPage.tsx frontend/src/pages/SettingsPage.test.tsx frontend/src/pages/LeaderboardPage.tsx
git commit -m "feat(frontend): make profile settings and leaderboard responsive"
```

---

### Task 8: Polish Matchmaking, Skill Tree, Quizzes, And Tournaments

**Files:**
- Modify: `frontend/src/pages/MatchPage.tsx`
- Modify: `frontend/src/components/MatchComponents.tsx`
- Modify: `frontend/src/components/MatchmakingComponents.tsx`
- Modify: `frontend/src/pages/SkillTreePage.tsx`
- Modify: `frontend/src/components/SkillTreeComponents.tsx`
- Modify: `frontend/src/pages/QuizPage.tsx`
- Modify: `frontend/src/components/QuizComponents.tsx`
- Modify: `frontend/src/pages/TournamentsPage.tsx`
- Modify: `frontend/src/pages/TournamentLivePage.tsx`
- Modify: `frontend/src/pages/TournamentResultsPage.tsx`
- Modify: associated existing tests

- [ ] **Step 1: Add the remaining legacy-class contract**

Extend `designSystem.test.ts` with:

```ts
const forbiddenClasses = [
  'btn-primary',
  'quiz-finished',
  'leaderboard-item',
  'skill-unlock-toast',
  'radar-sweep',
]

it.each(forbiddenClasses)('removes legacy class %s', (className) => {
  const sources = migratedFiles.map((file) =>
    readFileSync(resolve(process.cwd(), file), 'utf8'),
  ).join('\n')
  expect(sources).not.toContain(className)
})
```

Include every file listed in this task in `migratedFiles`.

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm test -- src/test/designSystem.test.ts
```

Expected: FAIL for current legacy class references.

- [ ] **Step 3: Polish matchmaking**

- Keep the swipe card constrained to `max-w-md`.
- Use stable card aspect ratios.
- Show action labels/tooltips on desktop.
- Replace disabled central action placeholder with a meaningful info control or remove it.

- [ ] **Step 4: Polish skill tree**

- Keep the canvas full-width and pan/zoom capable.
- Move controls to a stable toolbar.
- Keep selected-node detail as bottom sheet on mobile and side panel on desktop.
- Preserve node dimensions during hover/focus.

- [ ] **Step 5: Polish quiz**

- Replace legacy finished/loading classes.
- Constrain question width to readable measure.
- Use two-column answer grid at `md` only when answers remain readable.
- Make result stats responsive and maintain clear correct/incorrect states.

- [ ] **Step 6: Polish tournaments**

- Use responsive tournament cards and a clear primary action.
- Increase 8-10px labels to 11-12px minimum.
- Use stable scoreboard rows and podium columns.
- Prevent titles and party names from resizing layouts.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
pnpm test -- src/test/designSystem.test.ts src/pages/MatchPage.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/MatchPage.tsx frontend/src/components/MatchComponents.tsx frontend/src/components/MatchmakingComponents.tsx frontend/src/pages/SkillTreePage.tsx frontend/src/components/SkillTreeComponents.tsx frontend/src/pages/QuizPage.tsx frontend/src/components/QuizComponents.tsx frontend/src/pages/TournamentsPage.tsx frontend/src/pages/TournamentLivePage.tsx frontend/src/pages/TournamentResultsPage.tsx frontend/src/test/designSystem.test.ts
git commit -m "feat(frontend): polish game and tournament flows"
```

---

### Task 9: Run Automated Quality Gates

**Files:**
- Modify only files required by failures found in this task.

- [ ] **Step 1: Run all frontend tests**

```bash
cd frontend
pnpm test
```

Expected: all test files pass with zero failures.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run production build**

```bash
pnpm build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 4: Scan for legacy classes**

```bash
rg -n 'className="(search-bar|card|party-list|member-item|chat-composer|quiz-finished|btn )' src
```

Expected: no matches.

- [ ] **Step 5: Scan for tiny text and raw command emoji**

```bash
rg -n 'text-\[(8|9|10)px\]|button[^>]*>[^<]*[←+⚙]' src
```

Expected: only intentional decorative exceptions, each reviewed manually.

- [ ] **Step 6: Commit any verification fixes**

```bash
git add frontend
git commit -m "test(frontend): close visual regression gaps"
```

Skip the commit if verification required no edits.

---

### Task 10: Browser Verification Matrix

**Files:**
- Create: `docs/qa/visual-responsive-checklist.md`

- [ ] **Step 1: Start the complete application**

```bash
pnpm run dev
```

Expected:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`

- [ ] **Step 2: Authenticate with seed data**

Use:

```text
alice@studyquest.dev
Password123!
```

- [ ] **Step 3: Verify every route at mobile size**

Viewport: `320x844`, then `390x844`.

Check:

```text
/auth
/dashboard
/subjects
/match
/parties
/party/<seed-party-id> (Quests, Chat, Miembros, Actividad)
/friends
/profile
/settings (all tabs, dark and light)
/leaderboard
/subjects/<seed-subject-id>/skill-tree
/tournaments
```

Acceptance:

- no document-level horizontal overflow
- no clipped title or action
- 16px minimum gutters
- bottom nav does not cover content
- chat composer remains usable above navigation

- [ ] **Step 4: Verify tablet**

Viewport: `768x1024`.

Acceptance:

- two-column grids activate where planned
- dialogs are centered, not stretched bottom sheets
- content does not remain unnecessarily constrained to 480px

- [ ] **Step 5: Verify desktop**

Viewport: `1280x800`.

Acceptance:

- desktop navigation rail is visible
- mobile bottom nav is hidden
- dashboard/profile/leaderboard use available width
- focused game surfaces remain readable and centered

- [ ] **Step 6: Verify light theme**

At 390px and 1280px:

- switch theme in Settings
- revisit dashboard, subjects, party room, profile, and leaderboard
- confirm all text, borders, cards, disabled states, and focus rings remain legible

- [ ] **Step 7: Record results**

Create `docs/qa/visual-responsive-checklist.md`:

```md
# Visual Responsive QA

| Route | 320 | 390 | 768 | 1280 | Light | Notes |
|---|---:|---:|---:|---:|---:|---|
| Auth | Pass | Pass | Pass | Pass | Pass | |
| Dashboard | Pass | Pass | Pass | Pass | Pass | |
| Subjects | Pass | Pass | Pass | Pass | Pass | |
| Match | Pass | Pass | Pass | Pass | Pass | |
| Parties | Pass | Pass | Pass | Pass | Pass | |
| Party room | Pass | Pass | Pass | Pass | Pass | |
| Friends | Pass | Pass | Pass | Pass | Pass | |
| Profile | Pass | Pass | Pass | Pass | Pass | |
| Settings | Pass | Pass | Pass | Pass | Pass | |
| Leaderboard | Pass | Pass | Pass | Pass | Pass | |
| Skill tree | Pass | Pass | Pass | Pass | Pass | |
| Tournaments | Pass | Pass | Pass | Pass | Pass | |
```

- [ ] **Step 8: Final verification commit**

```bash
git add docs/qa/visual-responsive-checklist.md
git commit -m "docs: record responsive visual QA"
```

---

## Final Acceptance Checklist

- [ ] Global Tailwind spacing utilities compute correctly.
- [ ] No deleted legacy CSS class controls layout.
- [ ] All existing product flows remain functional.
- [ ] Dark and light themes are legible.
- [ ] Mobile bottom navigation and desktop rail work.
- [ ] No horizontal overflow at 320, 390, 768, or 1280 widths.
- [ ] Chat files/audio controls are polished and accessible.
- [ ] Raw backend errors are replaced by friendly recoverable states.
- [ ] Frontend tests, lint, and production build pass.
- [ ] Browser QA matrix is complete.

