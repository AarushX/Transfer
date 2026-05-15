# Portal UI redesign — design

**Date:** 2026-05-15
**Scope:** Four areas — sidebar, dashboard, unified roster, mentor courses + skill-tree placement, team/subteam page progress treatment.
**Persona:** primary student / mentor / admin / parent (existing roles). Dashboard is now universal — parents land on the same `/dashboard` as students, sections adapt by role.

## Goals

1. Replace the plain text-only sidebar with a modern icon+label nav that holds the existing IA cleanly.
2. Make `/dashboard` actually useful for a high-school robotics student day-to-day, not just a course list.
3. Merge the people-directory pages (`/roster` + `/admin/users`) into one role-aware `/roster`; relocate the personal team settings on `/teams` into `/profile`.
4. Make `/mentor/courses` scale to many courses with prerequisites visible inline; surface the existing SkillTree graph in a place students can also use.
5. Make team/subteam-page completion status legible at a glance and add a mini course-relationship graph alongside.

## Non-goals

- No DB schema changes for this UI pass beyond what the existing surfaces already support. Lettering, hours, machine certifications, attendance, course statuses, and mentor-queue state all exist today.
- No new role types, RLS policies, or RPCs unless explicitly noted.
- No mobile-only redesign — designs are responsive but the desktop layout is the focus.

---

## 1 — Information architecture

### Routes after the merge

| Route                | Before                                                | After                                                                                                                         |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `/roster`            | Mentor people-directory with attendance expand        | Unified directory. Admin-only role/lead editor appears inside per-row expansion when the viewer is admin.                     |
| `/admin/users`       | Admin-only lead-assignment page                       | **Removed.** Sidebar link disappears. URL 302 → `/roster`. The lead-of-team-group / lead-of-subteam selects move into expand. |
| `/teams`             | User's primary-team picker + mentor-queue team picker | **Removed.** Both forms move to `/profile` as a "Team membership" + "Mentor checkoff teams" card. URL 302 → `/profile`.       |
| `/dashboard`         | Student / mentor only                                 | Universal. Parents land here too; the page renders role-adaptive sections.                                                    |
| `/parent/dashboard`  | Parent-only dashboard                                 | Kept as a redirect to `/dashboard` for one release, then removed.                                                             |
| `/courses/map`       | did not exist                                         | **New.** Full-page SkillTree for students + mentors. Scope query param supports filtering to a team / subteam.                |

### Sidebar item list after the merge

Order matches the new sidebar mockup (style A, section divider 1).

**Primary** (everyone)
- Dashboard
- ClickUp
- Scan

**Team** (section labeled with primary-team name, e.g. "Robotics 2056")
- Team Page
- _… subteam links indented underneath_

**Mentor** (visible when `is_mentor`)
- Checkoffs _(numeric badge with queue count)_
- Courses
- Machines
- Roster _(moved from its current "Roster" subsection)_
- Volunteer verification

**Admin** (visible when `is_admin`)
- Settings
- Teams _(this is the admin teams CRUD at `/admin/settings/teams`, not the old user-facing `/teams`)_
- Content
- Audit log
- Attendance
- Volunteering
- Lettering rules

Parents see only **Primary** + a parent-specific "Volunteering" item (replacing the current `/parent/volunteer` reachable from the parent sidebar).

---

## 2 — Sidebar (style A · section divider 1)

### Visual contract

- Fixed 256 px width on desktop, slide-over on mobile (existing pattern).
- Workspace header: tiny "Transfer" eyebrow + org name (existing data).
- Nav rows: `display:flex` icon (14 px) + label, 6 px y-padding, 7 px radius.
- Active row: `background: linear-gradient(90deg, accent-700, accent-900)`, icon brightens to accent-300.
- Hover: subtle glass-bg-hover wash.
- Section dividers: top hairline rule + sentence-case label in the existing muted color, with an optional small pill on the right (used today only for the "Team" section to display the primary-team designator).
- Sub-rows (subteam links under "Team Page"): same row component, indented 24 px, label dimmed.
- Badge: right-aligned, accent-tinted pill with a count. Used for the **Mentor → Checkoffs** row (pending queue count). Hidden when zero.
- Footer: avatar + name + role label, then a "Sign out" button — unchanged from current.

### Icons

Single icon system, stroke-only Lucide-style 14 px:

| Item                  | Icon hint                          |
| --------------------- | ---------------------------------- |
| Dashboard             | 4-square grid                      |
| ClickUp               | check-clipboard                    |
| Scan                  | qr-grid                            |
| Team Page             | users                              |
| Checkoffs             | checklist                          |
| Courses               | play-circle                        |
| Machines              | settings-gear                      |
| Roster                | user-circle                        |
| Volunteer verification| shield-check                       |
| Settings              | sliders                            |
| Teams (admin CRUD)    | building                           |
| Content               | file                               |
| Audit log             | list                               |
| Attendance            | calendar-check                     |
| Volunteering          | heart-handshake                    |
| Lettering rules       | award                              |

Icons live as inline SVG in the layout file (consistent with existing inline-SVG pattern) — no icon library dependency.

### Behavior

- Active match: existing `match: (p) => p.startsWith('/x')` predicates carry over verbatim.
- Mentor-section "Roster" link active when `pathname.startsWith('/roster')`.
- Badge count for Checkoffs: derived from the same mentor-queue query that already powers `/mentor`; loaded server-side in `+layout.server.ts` and passed via `data.mentorQueueCount`.

---

## 3 — Dashboard (layout B)

`/dashboard` becomes one page for every role. Sections appear / hide based on the loaded `profile` and derived data. No conditional routes.

### Layout (logged-in, non-parent)

```
┌────────────────────────────────────────────────────────────────┐
│  Hi {first name}        Checked in · 1h 47m   |  Mentor q: 4   │   ← greeting + role-aware status pills
├──────────────────────────────────────┬─────────────────────────┤
│                                      │  Passport QR (centered)  │
│  Continue learning · {hero course}   │                         │
│    progress dots / resume button     ├─────────────────────────┤
│                                      │  Hours · 87.5            │
├──────────────────────────────────────┤    progress bar          │
│  Announcements                       ├─────────────────────────┤
│    • Team note                       │  Lettering progress      │
│    • Subteam note                    │    progress bar to 100%  │
├──────────────────────────────────────┤    (allowed past 100% —  │
│  Up next · 4 courses (horizontal)    │     show overflow glow)  │
│  [course][course][course][course]    │                         │
│  "See all courses →"                 │                         │
└──────────────────────────────────────┴─────────────────────────┘
```

### Sections

1. **Greeting strip**
   - Left: "Hi {first name}" with the existing gradient text.
   - Right: status pills.
     - **Checked-in pill** — green when attendance has an open session, shows elapsed time. Otherwise hidden.
     - **Mentor queue pill** — amber, shown only when viewer `is_mentor` AND queue count > 0. Click → `/mentor`.

2. **Hero (left column, 2/3 width)**
   - "Continue learning" card with the same `heroNode` logic as today.
   - Resume button + step-pip strip (existing). Status chip ("Awaiting mentor", etc.).
   - If `heroNode` is null but there are non-completed courses, show "Pick something to start" CTA linking to `/courses/map` and a list of 3 available courses.
   - If there are no courses (parent / not onboarded), this card is replaced by the **parent volunteer block** (see role variants below) or the **onboarding prompt**.

3. **Announcements (left column)**
   - Pulls from `team_notes` for the user's primary team-group AND each of their subteams.
   - Most-recent-first, each item shows a "Team" or "Subteam · {name}" chip.
   - Max 4 visible, "See all" link to the relevant team / subteam page.

4. **Up next (left column)**
   - Horizontal-scroll strip of 4–6 cards.
   - Source: `inProgressPrimary` first, then `takeablePrimary` (top by `prereqDependentsCount`), capped at 6.
   - "See all courses →" footer link → `/courses/map` (full-page graph view; users can switch to a grid layout there).

5. **Right column (always-visible status rail, ~1/3 width)**
   - **Passport QR card** — uses existing `PassportQR.svelte` component, centered, "v{qr_version} · current" caption underneath. Tap on mobile opens an enlarged dialog.
   - **Hours card** — total season hours (sum of completed attendance sessions) + a small progress bar to a configurable target ("12 of 26 sessions"). If no lettering rules exist, just show the hours total.
   - **Lettering progress card** — a single horizontal progress bar that fills to 100% based on requirements met (the union of completed courses, hours, and any custom rules from `/admin/lettering`). Allowed to overflow past 100% — render the bar in two layers: base bar capped at 100%, then an "extension" segment shown to the right with an accent glow. Numeric "{pct}%" label is shown, no tier name.

### Role variants

- **Parent (`is_parent_guardian`)** — replace Hero, Announcements, and Up-next with:
  - **Parent linking card** (existing from `/dashboard/+page.svelte` parent branch — keep it).
  - **Volunteer hours card** — total hours per linked student + "Log hours" CTA (already implemented under `/parent/volunteer`; link to it).
  - **Linked students roster** — same data as `data.linkedStudents` today.
  - The right column collapses: no QR (parents don't have one), no lettering. Keep Hours card showing the *volunteer* hours instead of attendance hours.

- **Mentor (`is_mentor`)** — the greeting strip's "Mentor queue: N" pill appears when N > 0. The dashboard otherwise looks identical to a student's. (Mentors still have their own learning track.)

- **Admin** — no extra dashboard widgets. Admin tools live on `/roster` and `/admin/*`. The role chip in the greeting strip reflects "Admin".

### Data loading

All counts and lists are loaded server-side in `+page.server.ts` so the page renders without JS spinners. Existing queries cover everything; the new pieces are:

- `attendance_sessions` — fetch the *open* session for the user (no `check_out_at`) and the sum of completed-session durations this season.
- `team_notes` — limited to user's primary team-group + subteams, ordered by `updated_at desc`, limit 4.
- Lettering progress — `letteringProgress(userId)` helper that takes the rules from `lettering_rules` (or whatever the existing source is at `/admin/lettering`) and returns `{ pct, completedCount, totalRequired, overflow }`.

---

## 4 — Roster (option A · dense table)

Single page, route `/roster`. Mentor or admin can access (mentor sees view-only of admin-only data; admin sees + edits inline).

### Header

- Eyebrow "Team"
- Big gradient title "Roster"
- Sub-line: "{N} members · {M} mentors · {L} leads"
- **Admin-active strip** (right-aligned, rose-tinted) appears only when viewer `is_admin`: "● Admin tools active". Provides the affordance that the row-expansion controls are special.

### Filter bar

- **Search** — name or email, instant filter.
- **Role chips** — "All", "Leads", "Mentors", "Pending checkoffs". Single-select. Chip selected = filter active.
- **Subteam dropdown** — populated from `teams`.
- **Group-by-subteam toggle** — on by default. When on, the table is split by subteam group with a section header per group.

### Table

Columns: avatar, member (name + email), roles (pills), progress (small bar + %), pending checkoffs (number, amber when > 0), hours, expand caret.

- Rows are clickable: clicking anywhere except the expand caret opens the user's profile (`/roster/[userId]`) in a new tab — preserves the current "details" link semantic.
- Clicking the caret opens the inline expand.

### Inline expand

Two-column layout inside the expansion:

- **Left (attendance + activity)** — last 4 attendance sessions as chips (day + duration). If the member is a mentor, also show mentor activity over the last 30 days (checkoffs done, marked needs-review). "Open full profile →" link.
- **Right (admin controls, admin-only)** — grid of 2x2 editors:
  - Base role: `select(member | admin)` (mirrors existing `?/setRole` action in `/roster/+page.server.ts`).
  - Lead of team: `select(team_group)`.
  - Lead of subteam: `select(team)`.
  - Flags: `checkbox(Mentor)` + `checkbox(Lead)`.
  - "Save changes" button submits a single form to `?/updateMemberAccess` — server-side action that takes the union of the existing `?/setRole` and `/admin/users` `?/updateLeadership` actions.

Non-admins see only the left column.

### Server actions

Combine into one route file:

- `?/updateMemberAccess` — supersedes `?/setRole` (roster) and `?/updateLeadership` (admin/users). Body: `user_id`, `base_role?`, `is_mentor?`, `is_lead?`, `lead_team_group_id?`, `lead_subteam_id?`. Admin-only guard.
- All other reads (`profiles`, `attendance_sessions`, `pendingCheckoffs`, `lead_team_group_id`, `lead_subteam_id`, `subteams`, `teamGroups`) merge into `+page.server.ts` load.

### Migration notes

- `/admin/users/+page.svelte` and its `+page.server.ts` get deleted. Sidebar removes the entry. A redirect handler at `/admin/users` issues 302 → `/roster`.

---

## 5 — Mentor Courses (option B · list + live mini-graph)

Route stays `/mentor/courses`. View now has a two-panel body.

### Header

- Eyebrow "Mentor" + title "Courses · {count}"
- Right: **"Open full graph"** button → `/courses/map?scope=all` (graph filtered to nothing).
- "+ New course" primary button.

### Filter row

Above the panels:

- Search by title / slug.
- Subteam dropdown.
- Status filter: All / Published / Draft / No team targets. (Published is the default; "Draft" and "No team targets" are derived — "Draft" = no published blocks; "No team targets" = no `node_team_targets` AND no `node_team_group_targets`.)
- Sort: most-completed / least-completed / recently-edited / alphabetical.

### Body

```
┌──────────────────────────────────┬──────────────────────────────┐
│ List, grouped by subteam         │ Mini-graph (sticky)          │
│                                  │                              │
│ ┌── Programming · 14 · 78% avg ─┐│  Neighborhood:               │
│ │ [icon] Git workflow basics    ││  "{selected course}"         │
│ │        86% finished           ││                              │
│ │ [icon] CAN bus debugging  ●   ││  ┌─ Prereqs ──┐              │
│ │        36% finished  (selected)│   │  Git workflow│              │
│ └────────────────────────────────┘│  └────────────┘              │
│ ┌── Mechanical · 10 ─────────────┐│        ↓                      │
│ │ [icon] Drill press safety      ││   ┌──────────────────┐        │
│ │        86% finished            ││   │  CAN bus debug   │← cur  │
│ └────────────────────────────────┘│   └──────────────────┘        │
│                                   │      ↙        ↘                │
│                                   │ Subsys ctl  PID tuning         │
│                                   │ (avail)     (locked)            │
└───────────────────────────────────┴────────────────────────────────┘
```

- **List item** rendering: icon (first letter on a tinted square), title, subteam chip, prereq count text ("Unlocks 3 · Requires Git workflow"). Right side: aggregate completion stat ("X / Y · 86%").
- Aggregate completion calc: for each course node, count distinct users assigned (via existing team-target tables) and how many have `computed_status = 'completed'`. New helper RPC `course_completion_aggregate(node_ids[])` returning `{ node_id, assigned, completed }`. Loaded once for the whole page.
- **Selected** course = first row by default. Click any row to swap selection. Mini-graph re-renders.
- **Mini-graph** is a reduced SkillTree showing the selected node + its direct prereqs (1 hop in) + direct dependents (1 hop out). Reuses `SkillTree.svelte` with a new `scope` prop that filters to a subset of nodes; layout falls back gracefully on 1–5 nodes.
- Selecting a course is a client-only state, no URL change. (URL state would conflict with the existing search/filter params.)

### "Open full graph" → `/courses/map`

- New route, no path params. Optional query params: `scope=team:{id}` or `scope=teamgroup:{id}` or `scope=user`.
- Uses existing `SkillTree.svelte` at full-page width with zoom/pan controls.
- For students, defaults to `scope=user` (only nodes targeted at one of their teams / team-groups).
- For mentors / admins, no default scope — they see the whole DAG.
- Top bar has a scope dropdown and an "Edit course" deep link that only appears for mentors.

---

## 6 — Team / subteam pages (option 2 · donut headline)

`/team` and `/team/[subteam]` share a layout. Differences are which `team_group_id` / `team.id` scope they fetch.

### Headline strip

```
┌──────────────────────────────────────────────┬───────────────────┐
│ [Donut 130px]   Subteam progress             │   Skill map       │
│                 7  of 12 courses             │   ┌──────────┐    │
│                 +2 this week                 │   │ mini DAG │    │
│  58% complete   ● done       7               │   └──────────┘    │
│                 ● in progress 2              │   "Your view"      │
│                 ● awaiting    1              │                   │
│                 ● blocked     1              │                   │
│                 ● locked      1              │                   │
└──────────────────────────────────────────────┴───────────────────┘
```

- Headline panel is two-column inside one card: a 130 px segmented donut on the left, breakdown labels + counts on the right.
- Donut segments are drawn via inline `<svg>`, using stroke dasharray. Five colors map to the five status buckets — same palette as the per-course pills.
- "+2 this week" comes from counting `certifications` rows where `granted_at >= now() - interval '7 days'` for users in this team/subteam.
- The "Open full graph →" link (right of the header, not inside the panel) goes to `/courses/map?scope=team:{id}` (or `teamgroup:{id}` on the team-level page).

### Mini-graph (right rail, ~280 px wide on desktop)

- Reuses `SkillTree.svelte` with a scope filter.
- Shows the courses targeted at this team-group (on `/team`) or at this team (on `/team/[subteam]`).
- Node colors derived from *the viewing user's* status, not the team's. Caption underneath: "Your view".
- Click a node → opens that course (`/learn/{slug}`).
- Collapses to a horizontal strip below the headline on narrow screens.

### Course grid (below)

- Existing grid layout, now with per-card **status tinting**:
  - Completed → green-tinted background + check icon
  - In progress / quiz / video → cyan-tinted + step counter (e.g. "3 of 5 steps")
  - Awaiting mentor → amber-tinted + "Awaiting" badge
  - Blocked / needs-review → rose-tinted + "Blocked" badge
  - Available → violet-tinted + "Available" badge
  - Locked → grey, less visible
- A small horizontal progress bar inside each card (full, partial, or empty) reinforces the state.
- Big status badge in the top-left corner of each card (a circular icon: ✓ for done, step number for in-progress, ! for awaiting, etc.) replaces today's small status chip.

### Notes section (unchanged)

Existing team / subteam notes block stays as it is — already working and consistent with the new tone.

### Roster section (unchanged)

The team-page roster (lead-only) and subteam-page roster (lead-only) stay. They are not the same surface as the new unified `/roster`; these are scope-limited snapshots, not editors.

---

## Shared design tokens

No new tokens. All work fits inside the existing CSS custom-properties already in `+layout.svelte` (`--app-bg`, `--app-glass-bg`, `--app-accent`, `--app-success`, `--app-warning`, `--app-danger`, `--app-info`, etc.).

Status colors used uniformly:

| Status              | Variable                            |
| ------------------- | ----------------------------------- |
| Completed           | `--app-success`                     |
| In progress         | `--app-info`                        |
| Awaiting mentor     | `--app-warning`                     |
| Blocked / needs-review | `--app-danger`                   |
| Available           | `--app-accent`                      |
| Locked              | `var(--app-text-dim)` / desaturated |

---

## Implementation order (rough)

1. Sidebar (lowest risk, big visual impact).
2. Unified `/roster` (delete `/admin/users`, fold logic). Lands the IA cleanup early.
3. `/teams` → `/profile` move (small).
4. Team / subteam page redesign (donut + status tinting + mini-graph). Unlocks the new `SkillTree` `scope` prop that mentor Courses also needs.
5. Mentor Courses two-panel.
6. `/courses/map` full-page route.
7. Dashboard redesign — last, since it depends on the lettering-progress helper and the parent-merge logic.

Each chunk is an independent PR. None of them touches the data model.

---

## Open follow-ups (not blocking)

- The aggregate course-completion RPC (`course_completion_aggregate`) needs to be added as a migration. Spec'd in section 5 but not detailed here.
- Lettering progress helper (`letteringProgress(userId)`) — needs to read whatever shape `/admin/lettering` currently writes. Worth a quick exploration before dashboard work starts.
- Mobile: confirm the donut + mini-graph layout collapses gracefully on phones. The dashboard's right rail likely stacks above the hero on narrow screens.
