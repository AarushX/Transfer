# Transfer — Complete Feature Inventory

A SvelteKit + Supabase robotics team management portal. Every user-facing capability is listed below, grouped by role and area.

---

## Table of Contents

1. [Roles & Access Model](#roles--access-model)
2. [Authentication & Onboarding](#authentication--onboarding)
3. [Member / Student Features](#member--student-features)
4. [Mentor Features](#mentor-features)
5. [Admin Features](#admin-features)
6. [Parent Features](#parent-features)
7. [Volunteer Management System](#volunteer-management-system)
8. [Attendance & Kiosk](#attendance--kiosk)
9. [Machine Shop & QR Scanning](#machine-shop--qr-scanning)
10. [Announcements & Email](#announcements--email)
11. [Theming & Branding](#theming--branding)
12. [API Endpoints](#api-endpoints)
13. [Cross-Cutting Systems](#cross-cutting-systems)

---

## Roles & Access Model

- **Student / Member** — Default role. Access to courses, surveys, scan, lettering.
- **Mentor** — Boolean flag `is_mentor`. Adds checkoff queue, course/survey/form/carpool/machine management, hours verification, roster.
- **Lead** — Boolean flag `is_lead`. Student leadership badge.
- **Admin** — `base_role = 'admin'`. Adds workspace settings, parent approvals, lettering rules, volunteer management, attendance overrides, audit log.
- **Parent / Guardian** — `is_parent_guardian = true`. Separate parent portal with carpool, volunteer, hours. Uses personal (non-team-domain) emails.
- **Role badges** — Profile shows tier badges (Rookie → Master) based on RR, track expertise (Novice/Skilled/Expert per track), and special titles (Cross-Track Ace, Multi-Track Legend).

---

## Authentication & Onboarding

### `/login`

- Email/password sign-in (parents)
- OAuth (Google etc.) for team-domain accounts
- Domain restriction enforced for non-parents
- Friendly error messages for failed attempts (domain mismatch, bad credentials)

### `/onboarding`

- Required for new students before portal access
- Select main team group (Build / Programming / Business / etc.)
- Choose required subteams per category
- Validates category coverage before allowing completion
- Triggers `sync_profile_courseloads_for_user` RPC to assign courses

### `/auth/signout`

- Sign out endpoint (form POST)

---

## Member / Student Features

### `/dashboard` — Student Hub

- Hero course card with step-by-step progress indicator
- Stats: modules certified, in progress, completion %
- Courses grouped by team / team-group
- Filter by team assignment
- Search by title
- Collapsible "Completed courses" section
- Onboarding prompts if team selection incomplete
- Parent link management (generate 8-char code, view/revoke linked guardians)
- Team-specific course paths with progress bars

### `/graph` — Skill Tree

- Interactive zoom/pan SVG graph of all course nodes
- Adaptive zoom speed (trackpad-friendly)
- Pinch-to-zoom on mobile
- Fit-to-view button + zoom in/out controls
- Visualizes prerequisite chains between courses
- Color-coded by completion status
- Click a node to see details and jump to course
- Text-selection prevented during drag

### `/ranked` — Public Leaderboard

- All members ranked by RR (Robotics Ranking points)
- Personal placement, RR total, segment completions, attendance hours
- Next rank tier with progress bar
- Scoring model display (3 RR per course segment, 2 RR per attendance hour)
- Valorant-style rank tiers

### `/surveys` — Applications Hub

- Browse all available surveys/applications
- See description, visibility windows, submission caps
- Track submission status (pending, completed, capped)
- Filter to prerequisite-met surveys

### `/surveys/[slug]`

- Submit responses (multiple choice, multi-select, text, matrix, grid types)
- Prerequisite gating (must complete listed courses first)
- Edit prior submission (if allowed by mentor)
- View submission history (last 50)
- See mentor feedback/notes
- Deadline awareness

### `/lettering` — Season Tracking (renamed "Season" in nav)

- Active season name + dates
- Progress per requirement category (outreach hours, competition attendance, shop hours, parent volunteer, etc.)
- Per-category completion percentage

### `/outreach` — Community Event Signups

- View outreach events for active season
- Event details (date, deadline, capacity, description)
- Sign up / cancel signup
- Log outreach hours with description (pending mentor verification)
- View own logged hours with verification status

### `/scan` — QR Scanner

- Camera-based QR scanner
- Auto-routes scanned tokens to:
  - Checkoff approval (mentor passport scans student)
  - Machine authorization (student passport scans machine)
  - Attendance kiosk activation (admin token)
  - Attendance check-in / check-out (student passport at kiosk)
- Manual attendance entry (no-RR fallback) for members who can't scan
- Mentor-only manual attendance form

### `/profile`

- Edit full name, bio (500 char max), avatar URL (https only)
- View profile badges and achievements
- Overall rank tier and per-track expertise
- Special titles display
- Set primary team assignment
- Mentor-only: select subteams to mentor
- Generate parent link code (8-char, 15-min TTL)
- Revoke linked parents
- View linked parent list

### `/passport`

- Personal QR code containing student identity (for mentor checkoffs, machine scans, attendance)
- Refresh QR (increments version, invalidates old codes)
- Module completion count by track
- Overall rank tier display

### `/teams`

- Browse all team groups and subteams
- See color assignments
- Read-only display

### `/machines`

- View machine subteam assignments
- Set primary subteam preference

### `/learn` / `/courseloads` / `/demo`

- Internal course pages (per-course content rendering with video, quiz, checkoff, reading blocks)

---

## Mentor Features

### `/mentor` — Checkoff Queue

- Queue of pending checkoffs (students awaiting mentor approval)
- Filter by own assigned subteams or all
- Student name, module title, submission details
- Mentor checklist with required items
- Photo evidence display
- One-tap approve → issues certification
- "Needs review" / redo action
- "Block checkoff" with notes
- Pagination through history (approved/needs_review/blocked)
- Bottleneck modules indicator (most pending)

### `/mentor/courses`

- Browse all courses
- Filter by team, search by title
- Create new course (title, slug, description) or from template
- Assign to teams and categories

### `/mentor/courses/[slug]`

- Edit course metadata (title, description, slug)
- Manage blocks: video, quiz, checkoff, reading
- **Video blocks**: URL, start/end timestamps
- **Quiz blocks**: question editor with MC, multi-select, true/false, short answer, matrix, grid types; passing score; attempt limits
- **Checkoff blocks**: title, directions, mentor checklist, resource links, evidence mode (none/optional/required photos)
- **Reading blocks**: rich content, resource links
- Reorder, delete blocks
- Manage course prerequisites
- Save course as template
- Delete course

### `/mentor/surveys`

- Browse all surveys
- Filter by active status
- Create new survey or from template

### `/mentor/surveys/[slug]`

- Edit title, description, questions
- Set visibility windows (visible_from / visible_until)
- Toggle `show_when_inactive`
- Set max submissions per user
- Manage prerequisites
- Save as template
- Delete survey

### `/mentor/forms`

- Browse form types
- Create form type (name, slug, description, Google Drive template link)
- Edit form metadata, delete
- View submission queue
- Approve / reject submissions with review notes
- Change status (submitted / approved / rejected / needs_changes)

### `/mentor/carpool`

- View carpool events
- Create carpool event with day/role/capacity configuration
- Signup modes: slot-based or capacity-based
- Create roles with descriptions and capacity
- Edit / delete events
- Create from template, save as template
- View signups with attendee counts

### `/mentor/machines`

- View all machines
- Generate machine QR codes and access URLs
- Create machine (name, description, location, required course prerequisites)
- Edit / delete machines
- Machine usage log (last 120 events)
- Audit who used each machine and authorization outcome

### `/mentor/outreach` — Hours Verification

- Outreach hours queue (pending / verified / rejected)
- Verify or reject with reason
- (Parent volunteer hours verification has moved to `/admin/volunteer`)

### `/roster`

- All team members listed with role / mentor / lead status
- Course completion progress per member
- Checkoff bottlenecks view (modules with most pending approvals)
- Daily attendance session logs

---

## Admin Features

### `/admin/settings`

- Workspace branding: 25+ color properties (background, surface, accent, success, danger, etc.)
- Organization name
- Organization icon upload
- Live theme preview

### `/admin/settings/teams`

- Create / edit / delete team groups (name, color hex, sort order)
- Create / edit / delete subteams (assigned to categories)
- Create / edit / delete subteam categories (mark required for onboarding)
- Link subteams to multiple team groups
- Assign courses to team groups or specific subteams

### `/admin/content`

- Assign courses to team groups
- Assign courses to subteams
- Delete courses (created by mentors)
- Template library: courses, surveys, carpool events
- Delete templates

### `/admin/parents`

- View all submitted parent applications
- See parent details (name, email, phone, relationship, application payload)
- Per-application status: submitted / approved / rejected
- Approve / reject parent applications
- View parent-application course completion (quiz score, photo upload, etc.)

### `/admin/lettering` — Season Rules

- Create lettering seasons (label, start/end dates, active flag)
- Activate / deactivate season (only one active at a time)
- Create lettering requirements per category (label, required value, sort order)
- Delete requirements
- Create outreach events (date, time, location, max signups, deadline)
- Delete outreach events
- Create competition events (name, location, dates, type: regional/state/nationals)
- Delete competitions

### `/admin/volunteer` — Volunteer Management

See dedicated [Volunteer Management System](#volunteer-management-system) section below.

### `/admin/attendance`

- View daily attendance sessions
- See active attendance displays (student / mentor / guest)
- Manual session adjustments
- Override check-in / check-out times

### `/admin/audit`

- Read-only audit log
- Track all system actions (who did what, when)

### `/admin/users`

- All users with role / mentor / lead status
- Change user role (member / admin)
- Toggle mentor flag
- Toggle lead flag
- View per-user course completion
- Per-user quiz scores and checkoff dates

### `/admin/organization`

- Organization-level settings and configuration

---

## Parent Features

### `/parent` and `/parent/dashboard`

- Submit parent guardian application (full Google Form parity: parent 1 + parent 2 info, rookie year, leadership matrix, skills matrix, mentoring interests, commitment acknowledgements, typed signatures)
- Link student accounts via 8-character code (15-min TTL, generated by student)
- View linked students
- Application status display (not_started / submitted / approved)
- Revoke student links

### `/parent/course`

- Parent application as a course-style flow with video blocks and quiz checkpoints
- Save draft or submit for approval

### `/parent/carpool` (still accessible, hidden from nav)

- Select which student to view carpool for
- View active carpool events
- Sign up for driving / chaperone roles
- Cancel signup
- View per-role capacity

### `/parent/volunteer` — Main Parent Portal

Three tabs: **Dashboard**, **Events**, **Log Hours**.

#### Dashboard tab

- Pinned announcements at top
- Summary cards (pledged categories, categories met, verified hours, pending hours)
- Pledge form (matrix: yes/no/maybe per category, notes column, min 3 "Yes" required)
- Progress bars per category (verified vs target, with pending overlay)
- Active signups list with cancel option

#### Events tab (SignupGenius-style)

- Event selector dropdown
- **Category sub-tabs** appear per category the event needs:
  - **Carpool** — Driver table (driver, seats, vehicle, notes). Sign up form with seats / vehicle / pickup location.
  - **Equipment Transport** — Same UI as Carpool.
  - **Food** — Item-bringing table (family, items, servings, dietary). Sign-up form with items / servings / dietary notes.
  - **Chaperone** — Name pills + experience notes signup.
  - **Shop Supervision** — Time-slot shift list with one-click claim.
  - **Generic** (mentor / outreach / sponsorship / etc.) — Standard slot list.

#### Log Hours tab

- Self-report by category (amount, date, description, optional opportunity link)
- View own hour log with verification status (pending / verified / rejected with reason)

### `/parent/hours` (legacy, still accessible)

- Per-student volunteer hour log
- Hours / date / description
- Verification status tracking

---

## Volunteer Management System

A complete SignupGenius replacement built into the portal.

### Data Model

- **Families** — First-class entity linking parents and students. Auto-created when parent links a student.
- **Family members** — Profile membership with parent / student role.
- **Volunteer categories** (10 seeded): field_build_hours, travel_planning, chaperone, transport_to_comp, mentor, shop_supervision, outreach, food, sponsorship, equipment_transport. Each has unit (hours / occasions / shifts / trips / count), target value, optional prereq, approval-required flag.
- **Commitments** — Season pledge per family per category (yes / no / maybe + notes).
- **Volunteer events** — Competitions / trips / build days. Groups opportunities.
- **Opportunities** — Specific volunteer slots within an event for a category.
- **Signups** — Family claims an opportunity. JSONB payload stores category-specific data (seats, food items, vehicle info, dietary notes).
- **Hour logs** — Self-reported fulfillment with mentor verification.
- **Family progress view** — Computed: pledged vs signed-up vs completed vs verified per category, with target-met flag.

### Admin volunteer page (`/admin/volunteer`)

Six tabs:

#### Events tab

- Create event with checkbox category selection (each checked = auto-created opportunity)
- Per-category slot input during creation
- Edit event inline (title, dates, location, description, re-check categories)
- Edit opportunities inline (title, slots, date, times, location, description, deadline)
- Hide / show opportunities (toggle is_active)
- Delete events (cascades to opportunities)

#### Verify tab

- Queue of pending hour logs
- One-tap verify or reject with reason
- Family / reporter / activity info displayed

#### Announcements tab

- Create announcement (title, body, audience, pin to top, send email blast)
- Inline edit (title, body, audience, pinned status)
- Delete
- Audience targeting: all / parents / students / mentors
- Email sent count + timestamp tracked
- Warning banner if email not configured

#### Gaps tab

- Opportunities needing more volunteers
- Slots needed count, current fill ratio

#### Families tab

- Leaderboard sorted by verified category count
- All families list with member badges (parent / student roles)

#### Categories tab

- Edit target value per category
- Toggle active status

---

## Attendance & Kiosk

### `/attendance` — Public Kiosk Display

- Big QR code for students to scan with passports
- Shows current "open / closed" state
- Activated via admin scan or manual control

### `/api/attendance/scan` — QR Token Processing

- Routes student passport scans to check-in or check-out
- Routes admin attendance tokens to activate / deactivate kiosk

### `/api/attendance/manual` — Mentor Override

- Manually record attendance for a student (excluded from RR)

### `/api/attendance/admin/manual` — Admin Override

- Force check in / out, activate kiosk, etc.

### `/api/attendance/public/state` & `/refresh`

- Cache-friendly endpoints for kiosk display polling
- Returns current QR codes and active state

### `/api/attendance/public/guest`

- Register guest sign-in with name + reason

---

## Machine Shop & QR Scanning

### Machine access flow

1. Student completes prerequisite courses
2. Student scans machine QR with their passport
3. System validates prereqs and authorization
4. Session opened (logged for hours, audit)
5. Mentor scans student passport to close session

### `/api/machines/use` — Student authorization

- Validates passport against machine prereqs
- Returns authorized + machine details, or denial

### `/api/machines/checkin` / `checkout`

- Open / close machine session
- Logs to usage history

### `/api/machines/create` / `update` / `delete`

- Mentor CRUD for machines

### `/api/shop-availability`

- Real-time shop open/closed state

---

## Announcements & Email

### In-portal announcements

- Pinned to top of parent dashboard (or member dashboard for non-parent audience)
- Title, body, audience filter
- Created and managed in `/admin/volunteer` → Announcements tab

### Google Workspace email blast

- Uses nodemailer with Gmail SMTP
- Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` env vars
- Setup: enable 2-Step Verification on the Workspace account, generate an App Password
- Branded HTML email matching portal theme
- BCC-based bulk send (privacy)
- 2000 messages/day free Workspace limit
- Recipient filtering by audience (all / parents / students / mentors)
- Send count and timestamp recorded per announcement

---

## Theming & Branding

- 25+ color variables exposed for org customization (background, surface, accent, danger, warning, success, info, table colors, button colors, focus ring, etc.)
- Org name + icon configurable
- Theme applied via CSS custom properties globally
- Live preview in `/admin/settings`
- All UI components use theme variables, no hardcoded colors

---

## API Endpoints

### Authentication & profile

- `POST /auth/signout` — Sign out

### Certifications & courses

- `POST /api/nodes/video-complete` — Mark video block watched
- `POST /api/nodes/block-complete` — Complete any block (video / quiz / checkoff)
- `POST /api/quiz/grade` — Submit quiz answers, grade, update cert status

### Checkoffs

- `POST /api/mentor/checkoff` — Approve / reject / redo / block (with passport QR token handling)
- `POST /api/mentor/resolve-qr` — Resolve passport QR to student identity

### Passport

- `POST /api/passport/refresh-qr` — Invalidate old QR, generate new version

### Machines

- `POST /api/machines/create` / `update` / `delete`
- `POST /api/machines/use` — Student passport authorization
- `POST /api/machines/checkin` / `checkout` — Open / close session

### Attendance

- `POST /api/attendance/scan` — QR token processing
- `POST /api/attendance/manual` — Mentor manual entry
- `POST /api/attendance/admin/manual` — Admin override
- `GET /api/attendance/public/state` — Kiosk poll
- `POST /api/attendance/public/refresh` — Force refresh
- `POST /api/attendance/public/guest` — Guest sign-in

### Shop

- `GET /api/shop-availability` — Open / closed state

---

## Cross-Cutting Systems

### Skill graph & prerequisites

- Course nodes link via prerequisite chains
- Quiz prerequisites (must complete listed courses to take quiz)
- Survey prerequisites (must complete listed courses to submit)
- Machine prerequisites (must complete listed courses to authorize)
- Implicit team gating (assigned subteams determine visible courses)

### Ranking / gamification (RR)

- 3 RR per course segment completed
- 2 RR per attendance hour
- Valorant-style tier ranks
- Public leaderboard
- Profile badges and titles
- Track-level expertise (Novice / Skilled / Expert)
- Special titles for multi-track mastery

### Parent linking

- Student generates 8-char alphanumeric code (15-min TTL) from dashboard or profile
- Parent enters code in their portal to link
- Parent can be linked to multiple students; student can have multiple parent guardians
- Active / revoked status per link
- Auto-creates Family record on first link

### Lettering progression

- Active season concept (only one at a time)
- Multiple requirement categories with thresholds
- Outreach events, competitions, hours, attendance all roll up
- Parent volunteer commitment integrated

### Survey workflow types

- Generic surveys / applications
- Leadership applications
- School outreach forms
- Custom mentor-built surveys
- Carpool signup surveys
- Per-survey: visibility window, max submissions, prerequisites, editable submissions, mentor feedback

### Audit log

- All admin actions tracked
- Read-only `/admin/audit` viewer

### Background RPCs / triggers

- `sync_profile_courseloads_for_user` — Assign courses on team selection
- `auto_create_family` — Create family record on parent-student link
- `transition_certification` — Move cert status through pipeline
- `try_auto_complete_node` — Check if all blocks done and cert complete
- Backfill scripts in migrations populate families for existing parent-student links

### Service vs anon client

- Anon Supabase client (`locals.supabase`) — User-scoped, subject to RLS
- Service client (`createSupabaseServiceClient`) — Bypasses RLS for admin operations and parent portal queries that can't be expressed cleanly in RLS

### Roles helper functions

- `isAdmin(profile)` — base_role admin OR role admin
- `isMentor(profile)` — is_mentor flag OR role mentor
- `isParentGuardian(profile)` — is_parent_guardian flag

### Route guards (in `hooks.server.ts`)

- Domain restriction for non-parents
- Parent-only route prefix list (only `/parent/*` accessible)
- Admin-only `/admin/*`
- Mentor-only `/mentor/*` and `/roster`
- Onboarding gate for incomplete student profiles

### PWA / installable

- Service worker via `vite-plugin-pwa`
- Install prompt on mobile
- Offline-capable for cached pages

### Telemetry

- Vercel Speed Insights injected

---

## Statistics

- **~30 main routes** across student, mentor, admin, parent, auth
- **~20 API endpoints**
- **5 role types** with distinct feature sets
- **10 seeded volunteer categories**
- **70+ database migrations**
- **25+ themeable color properties**
- Built on **SvelteKit 2.57 + Svelte 5 + Tailwind CSS 4.2 + Supabase**
