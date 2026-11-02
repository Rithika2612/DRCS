# DRCS — Complete Viva Study Guide

**Project:** DRCS — Disaster Resource Coordination System
**Type:** Static web application (HTML + CSS + vanilla JavaScript ES modules) backed by Firebase
**Day of exam:** prepared 20 Oct 2026

---

## 1. ONE-MINUTE PROJECT SUMMARY (say this first)

> "DRCS is a **Disaster Resource Coordination System** — a role-based web platform that connects
> five kinds of users during a disaster: **citizens, volunteers, NGOs, hospitals and administrators**.
> A citizen reports a disaster or requests help; the admin reviews and approves it and assigns an
> available volunteer; the volunteer advances the task from *assigned* to *completed*. On the
> resource side, a hospital raises a resource request (blood, oxygen, medicine), the admin approves
> it, and an NGO fulfils it from its stock and records the allocation. Everything is stored in
> **Cloud Firestore**, authentication is **Firebase Auth**, and every page is protected both by a
> client-side route guard and by **server-side Firestore security rules**. The admin also gets a
> **live Leaflet map**, a **Chart.js analytics page with PDF export**, and a **demo-data seeder**
> that generates 143 realistic connected records."

**Tech stack:** vanilla HTML/CSS/JS (no framework, no build tool), Firebase JS SDK v12.16.0 loaded
as ES modules from the CDN, Leaflet 1.9.4 + OpenStreetMap, Chart.js 4.4.9, jsPDF 2.5.2,
OpenStreetMap Nominatim for geocoding.

**Inventory:** 15 HTML pages, 21 CSS files, ~20 JS modules, 1 Firestore rules file, 3 docs.

---

## 2. THE BIG PICTURE — ARCHITECTURE

```
Browser (HTML/CSS/JS ES modules)
        │  import { auth, db } from "./firebase.js"
        ▼
Firebase Auth ────── login/signup, session persistence, role stored in users/{uid}.role
        │
        ▼
Cloud Firestore ──── 9 collections, real-time onSnapshot listeners
        ▲
        │  firestore.rules  ← the REAL security boundary (server-side)
```

**Two protection layers:**
1. `js/guard.js` — client-side page whitelist (UX only; a hacker can bypass JS).
2. `firestore.rules` — server-side rules; even if JS is bypassed, Firestore rejects the read/write.

**Design rule used throughout:** *no composite indexes*. All queries are simple
`where("field","==",value)` or whole-collection reads; **sorting and filtering happen in
JavaScript**. (Stated in REVIEW_NOTES.md.)

### The three core workflows

```
A) DISASTER REPORT
citizen ──addDoc──▶ disasters{status:'pending'}
admin   ──approve/reject──▶ {status:'approved'|'rejected', reviewedAt, reviewedBy}

B) HELP REQUEST (citizen)
citizen ──addDoc──▶ requests{status:'pending'}
admin   ──approve──▶ status:'approved'
admin   ──assign volunteer (writeBatch)──▶ status:'assigned', assignedTo=<volunteer uid>
                                            + users/{vid}.availability='busy'
volunteer ──batch──▶ accepted → in-progress → completed
                      + users/{vid}.availability='available'

C) RESOURCE REQUEST (hospital → NGO)
hospital ──addDoc──▶ resourceRequests{status:'pending'}
admin    ──approve──▶ status:'approved'
ngo      ──writeBatch──▶ 1) resources.quantity -= n
                         2) resourceRequests{status:'fulfilled'}
                         3) new document in resourceAllocations  (audit trail)
```

### Firestore data model (9 collections)

| Collection | Created by | Key fields |
|---|---|---|
| `users` (doc id = Auth UID) | signup | `uid, name, email, phone, location, role, status:'active', available, availability, createdAt` |
| `disasters` | citizen (report.js) | `disasterType, severity, location, latitude, longitude, description, peopleAffected, immediateRescue, reportedBy, status, assignedTo` |
| `requests` | citizen (request.js) | `requestType, priority, peopleCount, contact, location, lat/lng, requestedBy, status, assignedVolunteer, assignedAt, completedAt` |
| `resourceRequests` | hospital | `hospitalId, resourceType, quantity, priority, details, status, fulfilledBy` |
| `resources` | ngo | `ngoId, category, quantity, unit, location` |
| `resourceAllocations` | ngo | `ngoId, hospitalId, requestId, resourceId, quantity, createdAt` |
| `distributionPoints` | ngo | `ngoId, name, address, contact, timings, active` |
| `hospitalResources` (doc id = hospital uid) | hospital | `totalBeds, availableBeds, totalIcu, oxygenUnits, ambulances, bloodInventory{}` |
| `notifications` | seeder only | `message, targetRole, targetUserId, read` |

**Status state machines:**
- Disaster: `pending → approved | rejected` (locked after decision)
- Help request: `pending → approved → assigned → accepted → in-progress → completed`
  (also `rejected`, `cancelled`)
- Resource request: `pending → approved → fulfilled`

---

## 3. FILE-BY-FILE EXPLANATION

### 3.1 CORE / INFRASTRUCTURE

#### `js/firebase.js` — ~25 lines
**The single Firebase bootstrap.** The only place the Firebase config lives.
- Imports `initializeApp`, `getAuth`, `getFirestore` from the Firebase CDN (v12.16.0, ES module style — no bundler).
- Config: `projectId: "drcs-188d6"`, authDomain, apiKey, appId, measurementId.
- Exports `auth` and `db`. Every other module does `import { auth, db } from "./firebase.js"`.
- **Viva point:** exposing the apiKey in client code is *normal* for Firebase — security comes from
  the rules file, not from hiding the key.

#### `js/auth.js` — ~827 lines (shared by login.html AND signup.html)
Handles citizen/volunteer/NGO/hospital sign-up, login, password reset, validation and post-auth routing.

Key functions:
- `normalizeEmail()` → `trim().toLowerCase()` so whitespace/case don't create duplicate accounts.
- `showFieldError()`, `clearErrors()`, `showMessage()` — per-field inline validation UI (`.invalid`/`.valid` classes; green `#86efac` success / red `#fca5a5` error).
- `getFirebaseError(error)` — maps Firebase codes to friendly text:
  `auth/email-already-in-use` → "An account already exists…", `auth/invalid-credential` → "Incorrect email or password.", `auth/too-many-requests`, `permission-denied`.
- `redirectUser(role)` — role → dashboard map: citizen→citizen.html, volunteer→volunteer.html, ngo→ngo.html, hospital→hospital.html, admin→admin.html.
- `validateSignup()` — regex checks: name `^[A-Za-z][A-Za-z .'-]{1,49}$`,
  phone `^[6-9][0-9]{9}$` (Indian mobile), password `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,64}$`, confirm must match.
- `validateLogin()` — email + password present.

**Signup flow:** validate → disable button → `createUserWithEmailAndPassword` →
**write Firestore profile** `setDoc(doc(db,"users", uid), {uid, name, email, phone, location, role, status:"active", available: role==="volunteer", createdAt, updatedAt})` →
cache profile in `localStorage["drcsUserProfile"]` → success message → 700 ms → `redirectUser(role)`.

**Login flow:** validate → `setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)` ← *this is how "Remember me" works* →
`signInWithEmailAndPassword` → `getDoc(users/{uid})` (missing doc ⇒ sign out + throw) →
`status !== "active"` ⇒ sign out + throw ("Your account is not active" = soft ban) →
cache to localStorage → 500 ms → redirect by role.

Also: `sendPasswordResetEmail` for forgot-password, show/hide password toggle, button loading states.

**Viva points:** role is chosen by the user at signup and trusted afterwards; localStorage cache
exists so the dashboard shows the name instantly instead of flashing "Citizen" (the "Phase 1
name-loading fix" in README_PHASE1.txt).

#### `js/admin-auth.js` — ~103 lines (admin-login.html → admin.html)
Stricter, separate admin login:
1. `signInWithEmailAndPassword`
2. `getDoc(users/{uid})` → missing record ⇒ sign out + error
3. Cache to localStorage
4. **The gate:** `if (userData.role !== "admin") { await signOut(); show "Access denied…"; }`
5. Success → `admin.html`
Error switch handles `auth/invalid-email`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`.
**Known quirk (honest viva answer):** the profile is cached to localStorage *before* the role check,
so a non-admin briefly gets a cache entry — but the admin dashboard re-verifies role, so access is still denied.

#### `js/guard.js` — ~54 lines (the route guard)
Loaded on citizen.html, report.html, request.html, my-requests.html.
1. `onAuthStateChanged(auth, user => …)` — fires immediately with the persisted session.
2. No user → redirect `login.html`.
3. `getDoc(users/{uid})` → missing → `login.html`.
4. `currentPage = location.pathname.split("/").pop()`
5. Role → allowed-page **whitelist**:
   ```js
   citizen: ["citizen.html","report.html","request.html","my-requests.html"],
   volunteer: ["volunteer.html"], ngo: ["ngo.html"],
   hospital: ["hospital.html"], admin: ["admin.html"]
   ```
6. Not in whitelist → bounce to `${role}.html`. Any exception → `login.html` (**fail-closed**).
**Viva point:** citizens are the only role with multi-page access. The guard is client-side only;
`firestore.rules` is the real enforcement. Note admin/volunteer/NGO/hospital pages don't load guard.js —
they do their own inline role check.

#### `js/dashboard-nav.js` — ~91 lines (pure UI, no Firebase)
An **IIFE scroll-spy**: highlights the sidebar link for the section currently in view.
- Collects `a[href^="#"]` in `.sidebar`, maps to sections in `.dashboard-main`.
- `nearestSection()` picks the section closest to an anchor line (`min(180px, 24% of viewport)`).
- Click → `preventDefault()`, lock the link, `history.replaceState`, `scrollIntoView({behavior:"smooth"})`,
  unlock after **1100 ms**; `wheel`/`touchstart` release the lock immediately.
- Scroll handler throttled with `requestAnimationFrame` (max one recalculation per frame).
- Honours `data-no-active="true"` (used on the admin "Dashboard" link) and sets `aria-current` for accessibility.

#### `js/location-utils.js` — ~87 lines (exports `geocodeLocation`, `getBrowserCoordinates`)
Two-tier geocoding for the Tamil-Nadu-focused app:
1. **Offline table first:** a dictionary of ~25 TN places → `[lat, lng]` (chennai, coimbatore, madurai,
   trichy/trichirappalli, salem, tuticorin/thoothukudi, tambaram, avadi, koyambedu, velachery, perambur…),
   matched by substring against the normalised input.
2. **Network fallback:** OpenStreetMap **Nominatim**
   `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=…, Tamil Nadu, India`
   with an 8-second `AbortSignal.timeout`. Result converted with `Number()` and validated with `Number.isFinite`.
   **Every failure path returns `null` — the function never throws**, so callers degrade gracefully.
`getBrowserCoordinates()` wraps `navigator.geolocation.getCurrentPosition` in a Promise
(`enableHighAccuracy: true, timeout: 12000, maximumAge: 60000`).

#### `firestore.rules` — ~48 lines (the REAL security layer, rules_version '2')
Helper functions:
```js
function signedIn(){ return request.auth != null; }
function userData(){ return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
function roleIs(role){ return signedIn() && userData().role == role; }
function isAdmin(){ return signedIn() && (userData().role == "admin" || userData().role == "authority" || userData().role == "Authority"); }
function isNgo(){ return roleIs("ngo"); }
```
Permissions summary:

| Collection | create | read | update | delete |
|---|---|---|---|---|
| users | self or admin | self or admin | self or admin | (none) |
| disasters / requests / notifications | signed-in | signed-in | signed-in | admin only |
| hospitalResources | own doc or admin | signed-in | own doc or admin | admin only |
| resourceRequests | own hospital or admin | owner-hospital / admin / **NGO only if status=="approved"** | admin / **NGO only approved→fulfilled** | admin only |
| resources, distributionPoints | own ngo or admin | signed-in | admin or owning ngo | admin or owning ngo |
| resourceAllocations | own ngo or admin | signed-in | **`if false` (immutable)** | admin only |

**Excellent viva material:** the rules encode a *state machine* — an NGO can only read resource
requests that are approved and can only move them to `fulfilled`. `resourceAllocations` are
write-once (audit log). Ownership is checked with `request.resource.data.X == request.auth.uid`
(new doc) vs `resource.data.X == request.auth.uid` (existing doc).
**Honest weakness to admit:** `disasters`/`requests`/`notifications` allow *any signed-in user* to
read/update any document — scoping "only my reports" is done client-side with
`where("reportedBy","==",uid)`; the rules don't enforce it.

---

### 3.2 PUBLIC PAGES

#### `index.html` — 103 lines, **zero JavaScript** (static landing page)
Header + hero ("One network. Faster response."), 5 role cards (Citizens / Volunteers / Hospitals /
NGOs / Authorities), 3 feature rows, 4-step workflow **Report → Review → Respond → Resolve**
(the conceptual pipeline the app implements), trust row, footer → login.
Styling: `css/style.css` (navy/teal). Pure CSS animation (`.pulse` dots).

#### `login.html` (252 lines) + `signup.html` (196 lines) — both use `js/auth.js`, styled by `css/auth.css`
Split-screen layout: dark branding panel with 3 feature cards on the left, form card on the right.
- Login: `#loginEmail`, `#loginPassword` (show/hide), `#rememberMe`, `#forgotPassword`, link to
  **`admin-login.html`** (admins have a dedicated portal), link to signup.
- Signup: name / email / phone / location / **role select (citizen, volunteer, ngo, hospital — no admin
  option; admins are not self-serve)** / password + confirm with strength hint.
- Per-field `<small class="error">` slots with regex validation before any Firebase call.

---

### 3.3 CITIZEN PAGES

#### `citizen.html` (269) + `js/citizen.js` (251) + `guard.js` + `dashboard-nav.js` — **Dashboard**
Sidebar (Dashboard / Report Disaster / Request Help / Track Requests / Notifications / Profile + logout),
emergency banner, 4 quick-action cards, recent-activity feed.
Logic:
- **Instant name:** reads `localStorage.drcsUserProfile` first (no flash), then `onAuthStateChanged` →
  `getDoc(users/{uid})` → `showName()` → re-writes the cache.
- **Two live listeners:**
  `query(disasters, where("reportedBy","==",uid))` and `query(requests, where("requestedBy","==",uid))`,
  both `onSnapshot`, unsubscribe handles kept.
- `renderActivity()` merges the two arrays, **sorts descending by `createdAt` in JavaScript**
  (avoids a composite index — see REVIEW_NOTES.md) and renders only the **latest 6**.
- `createActivityCard(item)` — `item.kind` decides 🚨 disaster (red) vs 🆘 help request (blue);
  status pill from `getStatusClass()`. All output through `escapeHtml()` (XSS-safe).
- Logout: unsubscribe both listeners → `signOut` → clear localStorage keys → `login.html`.

#### `report.html` (330) + `js/report.js` (240) — **Report a Disaster**
Form: disasterType (flood/fire/earthquake/landslide/cyclone/building-collapse/other),
severity (low/medium/high/critical), location + **"Use my current location" GPS button**,
landmark, description (500 char live counter), peopleAffected, immediateRescue checkbox.
Flow:
1. GPS button → `getBrowserCoordinates()`; typing in the location box **invalidates** the GPS fix.
2. `onAuthStateChanged` → store `currentUser` + `getDoc(users/{uid})` for `reporterName`.
3. `validateReport()` — type & severity selected, location ≥ 3 chars, description ≥ 7 chars.
4. Coordinates: `selectedCoordinates || await geocodeLocation(text)` (TN table → Nominatim).
5. **`addDoc(collection(db,"disasters"), {disasterType, location, latitude, longitude, coordinates,
   landmark, severity, description, peopleAffected, immediateRescue, reportedBy: uid, reporterName,
   reporterEmail, status:"pending", assignedTo:null, createdAt, updatedAt})`**
6. Reset form → 1200 ms → `citizen.html` (the new doc appears live in the feed).

> **`js/realreport.js` is byte-for-byte identical to `js/report.js` (same SHA256) and is referenced
> by nothing.** It is an unused backup copy. `report.html` loads only `report.js`.

#### `request.html` (147) + `js/request.js` (579) — **Request Help**
Form: requestType (food/water/medical/rescue/shelter/other), priority, peopleCount (1–10000),
contact (Indian mobile regex), location + GPS, landmark, description (600 chars), "immediate" card.
Notable logic:
- **Double-guarded:** `guard.js` *and* its own auth listener that redirects and explicitly
  re-verifies `role === "citizen"` and `status === "active"` via `loadUserProfile()`.
- **Auto-fill:** the citizen's signup `phone` and `location` pre-populate empty fields.
- `validateForm()` focuses the **first invalid field**; `aria-live="polite"` status region.
- **`addDoc(collection(db,"requests"), {requestType, priority, peopleCount, contact, location,
  latitude, longitude, coordinates, landmark, description, immediate, requestedBy: uid,
  requesterName, requesterEmail, status:"pending", assignedVolunteer:null, assignedBy:null,
  assignedAt:null, completedAt:null, createdAt, updatedAt})`** → 1200 ms → `citizen.html`.

#### `my-requests.html` (609) + `js/my-requests.js` (825) — **Track My Requests (read-only)**
4 summary counters (total / pending / active / completed), search box + status filter,
request cards, and a **details modal**.
- One live query: `query(requests, where("requestedBy","==",uid))` + `onSnapshot`, **sorted
  newest-first in JS** (deliberately avoiding a composite index). Its error callback even tells the
  user if Firestore reports `failed-precondition` (missing index).
- `updateSummary()` — active = `assigned` **or** `in-progress`.
- **Client-side filtering:** `getFilteredRequests()` searches a lowercase blob of
  type/location/landmark/description/priority/status AND the status select.
- Modal: open/close via **event delegation** on `#requestsContainer`
  (`event.target.closest(".request-card-action")`), closes on backdrop click and **Escape**,
  locks `document.body.style.overflow` while open.
- Two distinct empty states (no data vs no filter match).
- (`my-requests.html` links `dashboard.css` and `my-requests.css` twice each — harmless duplicate tags.)

---

### 3.4 ADMIN SIDE

#### `admin-login.html` (68) + `js/admin-auth.js` (103) — described in §3.1.

#### `admin.html` (268) + `js/admin.js` (191) — **Admin Command Centre**
Sidebar: Dashboard `#overview`, Hospital Requests `#resourceRequests`, Disaster Reports `#disasters`,
Help Requests `#helpRequests`, Live Disaster Map → `map.html`, Reports & Analytics → `reports.html`, logout.
Six stat cards; three review tables; three detail modals with Approve / Reject / Assign buttons.

Logic:
- `showCachedAdminName()` paints the header instantly from localStorage, then `onAuthStateChanged`
  → no user ⇒ `admin-login.html`; else `loadAdmin()` verifies `users/{uid}.role === "admin"` →
  `listen()` starts **five whole-collection `onSnapshot` listeners**: `disasters`, `requests`,
  `resourceRequests`, `users`, `resources`. All stats/counts/sorting computed in JS (no aggregates,
  no indexes).
- `renderDisasters()` top 8, `renderRequests()` top 8, `renderResourceRequests()` top 10;
  approve/reject buttons are **disabled once a record is decided** ("locked").
- `updateDisaster/updateRequest/updateResourceRequest(id, status)` → `updateDoc` with
  `{status, reviewedAt, reviewedBy: admin.uid, reviewedByEmail, updatedAt}` (guarded by `confirm()`).
- **`assignVolunteer()` — atomic 2-document `writeBatch`:**
  1. `requests/{id}` → `{status:'assigned', assignedTo, assignedVolunteer(Name/Email), assignedAt, assignedBy, …}`
  2. `users/{volunteerId}` → `{availability:'busy', available:false, currentTaskId, …}`
  → commit is all-or-nothing, so a volunteer is **never double-booked halfway**.
  (Assignment allowed only if status is `approved` and the request has no assignment yet.)
- Logout unsubscribes all listeners, `signOut`, clears localStorage.

> **⚠ CRITICAL FOR YOUR DEMO:** `js/admin.js` currently contains an accidental whole-file
> copy-paste pasted *inside* the `finally` block of `assignVolunteer()`, which introduces an
> **illegal nested `import`** statement. ES modules cannot import inside a block, so the module
> **fails to parse and nothing on the admin dashboard would work in a live demo**.
> `js/realadmin.js` is the clean, working original (identical logic) but no page references it.
> Fix = make `admin.html` load `js/realadmin.js`, or delete the duplicated block from `admin.js`.

#### `reports.html` (60) + `js/reports.js` (Chart.js 4.4.9 + jsPDF 2.5.2) — **Reports & Analytics (admin-only)**
- Filters: from-date, to-date, status; **6 KPI tiles** (disasters, requests, completion rate,
  volunteers, hospital requests, allocated units); **4 charts** (request status doughnut, disaster
  severity *bar*, resource-request doughnut, volunteer availability doughnut); a latest-20 table.
- `listen(name)` = 5 `onSnapshot` on `disasters, requests, users, resourceRequests,
  resourceAllocations`; `render()` recomputes everything on every snapshot → "Live report updated."
- `draw()` **degrades gracefully**: if the Chart.js CDN failed it hides the canvas and prints the
  numbers as a text fallback instead of crashing.
- `exportPdf()` builds a jsPDF document (title, timestamp, 8 stat lines, first 12 requests) and
  saves `DRCS_Report_YYYY-MM-DD.pdf`.
- Auth: self-contained check — must be `admin` or `authority`, else redirect to `admin-login.html`.

#### `map.html` (99) + `js/map.js` (307) — **Live Disaster Map (admin-only), Leaflet 1.9.4**
- India view `[20.5937, 78.9629]` zoom 5, OpenStreetMap tiles, colour-coded `L.divIcon` markers
  (disaster / request / hospital / NGO distribution point).
- **`coordinates(record)` tries 7 field shapes** (`latitude/longitude`, `lat/lng`, nested
  `location{}`, `coordinates{}`, `geoPoint{}`) with range validation — this is why the forms store
  coordinates redundantly.
- **`spreadOverlappingMarkers()`** — records in the same city are pushed onto concentric rings
  (radius `.012 + ring*.009`, 10 per ring, longitude scaled by `cos(lat)`) so markers never stack.
- `toItems()` normalises 4 sources; excludes completed/rejected/closed records → only *active* items.
- `geocode(place)` = cached + de-duplicated in-flight Nominatim lookups; unresolved records are
  listed in an "Unmapped records" panel instead of vanishing.
- 5 `onSnapshot` listeners (`disasters, requests, hospitalResources, distributionPoints,
  users` filtered client-side to hospitals) → 120 ms debounced rebuild.
- Filters (type / status / free text), fit-to-bounds, card↔marker bi-directional navigation,
  graceful failure if Leaflet CDN is down.

#### `seed-data.html` (47) + `js/seed-data.js` (48 dense lines) — **Demo Data Manager (admin-only)**
Creates **143 connected, fictional, Tamil-Nadu-flavoured records** for demos:
20 users · 15 disasters · 40 requests · 25 resources · 18 notifications · 10 hospital requests ·
6 distribution points · 6 allocations · 3 hospitalResources.
Key design decisions (great viva answers):
- **Deterministic IDs** `demo_user_001 … demo_allocation_006` + `batch.set(..., {merge:true})`
  ⇒ **idempotent**: re-running *updates* the same 143 docs, never duplicates them.
- Every doc is stamped `{demoData:true, seedBatch:"drcs-demo-v1"}`.
- `clear()` runs `query(where("demoData","==",true))` on each of the 9 collections and batch-deletes
  in chunks of 400 ⇒ **genuine user records are never touched**.
- One `writeBatch` for 143 ops stays under Firestore's 500-operation batch limit.
- **No Firebase Auth accounts are created** — the 20 demo users are dashboard-only profiles
  (they cannot be logged into).
- Access gate: `admin`/`authority` role, both buttons disabled until the confirmation checkbox is ticked.

---

### 3.5 THE THREE ROLE DASHboards

#### `volunteer.html` (176) + `js/volunteer.js` (565) + `css/volunteer.css` (1828) — **fully implemented**
Shows the emergency task assigned to you and advances it.
- Boot: `onAuthStateChanged` → `getDoc(users/{uid})` → must be `role === "volunteer"` → 3 listeners.
- **3 real-time `onSnapshot` listeners:** profile doc, **whole `requests` collection filtered in JS**
  by `isAssignedToCurrentVolunteer()` (accepts 4 field spellings: `assignedTo`,
  `assignedVolunteer`, `assignedVolunteerId`, `volunteerId`), and **whole `notifications`
  collection** filtered by `userId|targetUserId|volunteerId|assignedTo == uid` or `targetRole ∈ {volunteer, all}`.
- **Status machine:** `assigned →(Accept)→ accepted →(Start)→ in-progress →(Complete)→ completed`.
- **`advanceTask()` uses a `writeBatch`** that updates the request (with `acceptedAt`/`startedAt`/
  `completedAt` audit timestamps) **and** the volunteer's own availability
  (`busy` ⇄ `available` + `currentTaskId`) in one atomic commit.
- `updateAvailability()` is **blocked while an active task exists**; `saveProfile()` validates name
  and Indian mobile; `markAllNotificationsRead()` is a batch of `notifications` updates.
- All rendering goes through `escapeHtml()`; filter dropdown (active/all/each status); task modal.
- **Honest viva caveat:** nothing in the app *creates* notifications (only the seeder does), and
  seeded assignments use demo IDs that can't match a real Auth UID.

#### `ngo.html` (56) + `js/ngo.js` (48 very dense lines ≈ 400+ readable) + `css/ngo.css` — **fully implemented**
Relief-resource logistics.
- 4 listeners: `resources` (client-filter `ngoId === uid`),
  `resourceRequests` (**server-side** `where("status","==","approved")` — matching the rules),
  `distributionPoints` (`ngoId`), `resourceAllocations` (`ngoId`, sorted in JS).
- Writes: add stock (`addDoc resources`), edit stock quantity (`prompt()` → `updateDoc`),
  add distribution point, edit profile (`setDoc users, {merge:true}`).
- **The key flow — allocate:** stock must match the requested category → native `<dialog>` →
  validate `1 ≤ qty ≤ stock.quantity` → **`writeBatch` of 3 operations:**
  1. `resources/{stockId}` → `quantity -= qty`
  2. `resourceRequests/{id}` → `{status:'fulfilled', fulfilledBy, fulfilledQuantity, fulfilledAt}`
  3. **new `resourceAllocations` document** (audit trail linking ngo, hospital, request, resource)
- `render()` fills 4 tables + 4 stat counters and toggles empty states.

#### `hospital.html` (96) + `js/hospital.js` (184) + `css/hospital.css` — **fully implemented**
Hospital capacity & resource requests.
- Boot: `renderBloodInputs()` builds the 8 blood-group inputs (A+ … O-) → instant cached name →
  auth → `loadProfile()` must be `role === "hospital"`.
- **1 live listener:** `onSnapshot(doc(hospitalResources, uid))` — note the document id **is** the
  hospital's uid, exactly matching the security rule `hospitalId == auth.uid`.
- Writes: capacity form (`setDoc … {merge:true}` with validation *available ≤ total*),
  blood inventory, **emergency resource request** (`addDoc resourceRequests` with
  `status:'pending'` → this is what the admin approves and the NGO fulfils), and profile
  (updates `users/{uid}` **and** syncs `hospitalResources/{uid}`).

---

### 3.6 CSS (21 files in `css/`)

**Linked & used (16):**
| File | Purpose | Used by |
|---|---|---|
| `style.css` (32) | Landing page, navy/teal | index.html |
| `auth.css` (958) | Login + signup split-screen | login, signup |
| `admin-auth.css` (448) | Admin login, dark blurred backdrop | admin-login |
| `admin.css` (15, minified) | Admin tables/modals, deep-plum theme | admin |
| `dashboard.css` (580) | **Shared citizen shell**: sidebar, header, cards, empty states | citizen, report, request, my-requests |
| `my-requests.css` (613) | Request cards, toolbar, modal | my-requests |
| `form.css` (772) | **Shared citizen form foundation** (indigo/violet) | imported by report.css & request.css |
| `report.css` (95) | Report-page overrides (mauve) | report |
| `request.css` (292) | Request-page overrides (purple) | request |
| `reports.css` (5) | Analytics charts/table | reports |
| `map.css` (747) | Map shell, markers, legend | map |
| `seed-data.css` (2) | Seeder page | seed-data |
| `volunteer.css` (1828) | Entire volunteer UI (indigo → pastel violet) | volunteer |
| `ngo.css` (3, minified) | NGO UI, teal | ngo |
| `hospital.css` (50, minified) | Hospital UI, blue/navy | hospital |
| `section-nav.css` (12) | scroll-margin + active-link gradient | hospital, ngo |

**Orphaned / never linked (5) — mention only if asked:** `core-ui.css`, `final-ui.css`,
`polished-ui.css`, `drcs-theme.css`, `drcs-v3.css`. These were abandoned attempts at a global
"loaded last" design layer; their comments claim otherwise, but no HTML file references them.

**Theme:** no single shared stylesheet — each page defines its own `:root` variables, but all belong
to one **blue → indigo → violet/purple family with teal accents** ("the blue/purple DRCS theme"),
with a role accent per dashboard (citizen lavender, volunteer violet, hospital blue, NGO teal,
admin plum). Shared components are **repeated by convention**: fixed 245–270 px dark sidebar with 🛡
brand + `.nav-link.active` pill + logout button, topbar with eyebrow label and profile chip,
`.stats-grid` of `.stat-card`, `.panel` cards, `#pageMessage` toast, `status-*` / `priority-*`
badges, empty/loading/spinner states.

---

## 4. LIKELY VIVA QUESTIONS & ANSWERS

**Q: Why no framework?**
Vanilla ES modules keep the project dependency-free and directly runnable on Live Server; Firebase
SDK is loaded from CDN. Trade-off: more manual DOM code.

**Q: Where is authorization enforced?**
Two layers: `guard.js` (client-side page whitelist — UX only) and `firestore.rules` (server-side —
the real boundary). Defense in depth.

**Q: How do you avoid Firestore composite indexes?**
By never using `where()` + `orderBy()` together: queries are single-field filters or full-collection
reads, and sorting/filtering is done in JavaScript (e.g. `my-requests.js`, `citizen.js`, `admin.js`).

**Q: Why does the admin use a different login page?**
Separation of concern + explicit role gate: `admin-auth.js` verifies `users/{uid}.role === "admin"`
and signs out otherwise. Admins also can't self-register (no admin option in signup).

**Q: How do you prevent a volunteer being assigned two tasks at once?**
Assignment is a single `writeBatch` (request → assigned, volunteer → `availability:'busy'`) which
commits atomically; and `volunteer.js` blocks availability changes while an active task exists.

**Q: What is real-time in this app?**
`onSnapshot` listeners on 5–9 collections per page; the UI re-renders on every server-side change.
Listeners are always unsubscribed on logout and `beforeunload`.

**Q: How do you handle security/XSS?**
All user-generated content is rendered through `escapeHtml()`; input is regex-validated client-side;
the real protection is Firestore rules; passwords are handled only by Firebase Auth (never stored).

**Q: How does geocoding work?**
Offline Tamil-Nadu coordinate table first (fast, no rate limit) → OpenStreetMap Nominatim API
fallback with an 8 s timeout → returns `null` on failure so submission still works without
coordinates. GPS capture uses the browser Geolocation API.

**Q: What is the demo data seeder?**
143 deterministic records with fixed IDs + `{merge:true}` ⇒ idempotent (re-run updates, never
duplicates); every doc marked `demoData:true` so removal never touches real records.

**Q: What would you improve?**
- Tighten rules so `disasters`/`requests` are owner-scoped server-side (currently only client-side).
- Add `orderBy` + proper indexes once data grows; add pagination.
- Add real-time notifications generation (currently only seeded).
- Move the ML "Personnel Requirement Estimator" panel in the disaster modal from UI to working code.
- Remove dead files (`realadmin.js`, `realreport.js`, 5 orphaned CSS layers) or wire them up.

---

## 5. KNOWN BUGS — be ready to answer honestly

1. **`js/admin.js` fails to parse** (an entire copy of the file, including `import`, was pasted
   inside `assignVolunteer()`'s `finally` block → illegal nested import). **This breaks the admin
   dashboard in a live demo.** `realadmin.js` is the clean copy but unreferenced.
2. **`realreport.js` / `realadmin.js`** are unused duplicates.
5. `firestore.rules` has **no delete rule for `users`**, so the seeder's "Remove demo data" will be
   denied on the first collection (the other 8 delete fine).
6. `firestore.rules` lets any signed-in user read/update **any** disaster/request/notification.
7. `REVIEW_NOTES.md` is **stale** — it lists files as "placeholders" that are now fully implemented.
8. Minor: `my-requests.html` links its CSS twice; a mojibake string in `admin.js`'s `resources`
   listener error callback.
