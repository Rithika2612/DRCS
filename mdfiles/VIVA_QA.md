# DRCS — Viva Voce Question Bank with Model Answers

**Student:** Rithika. P. S (23MSS038)
**Department:** Software Systems, PSG College of Arts & Science, Coimbatore
**Guide:** Dr. K. V. Rukmani (HOD)
**Project:** Disaster Resource Coordination System (DRCS)
**Exam:** Tomorrow — read this tonight, rehearse Section A out loud, skim the rest.

> How to use this file: Section A is your opening answer — memorise it. Section B maps to your 21 PPT slides.
> Section C is the scary technical stuff (but these are where marks live). Section D is where honesty wins.
> Section E is rapid-fire. Section F is exam-day behaviour. Every model answer cites a real file/function so
> you always sound like you actually built it — because you did.

---

# ⚠️ READ THIS FIRST — PPT vs REAL CODE MISMATCHES

Your PPT database-design slides (12–15) use **simplified field names**. The real code is stricter. Examiners
often catch students here. If they point at a slide and say "is this your field?", say:

> "That's the simplified version on the slide. In the actual Firestore code the field is called **`disasterType`** —
> let me walk you through the real document."

Keep this table in your head:

| PPT slide says | Real code actually has | Where |
|---|---|---|
| `disasters.type` | `disasterType` | `js/report.js` `addDoc(collection(db,"disasters"), {...disasterType...})` |
| `requests.type` | `requestType` | `js/request.js` `addDoc(collection(db,"requests"), {...requestType...})` |
| `resources.quantity` (only) | `quantity` **plus** `ngoName`, `createdAt`, `updatedAt` | `js/ngo.js` add-stock `addDoc` |
| `hospitalResources.bloodUnits INT` | `bloodInventory` **object** `{ "A+":12, "B+":9, "O+":16, "AB+":5, … }` | `js/hospital.js` / seeder `hospitalResources()` |
| `notifications` with `hospitalId / resourceType / quantity / priority / reason` | `{ message, targetRole, targetUserId, read, createdAt }` | seeder `notificationRecords()`; `volunteer.js` reads these |
| `users.availability BOOLEAN DEFAULT FALSE` | **TWO fields**: `available` (boolean) **and** `availability` (string: `"available"` / `"busy"` / `"offline"`) | `js/auth.js` signup, `js/admin.js` `available(v)`, `reports.js` reads both |
| `requests.assignedTo` (single) | **BOTH** `assignedTo` **and** `assignedVolunteer` / `assignedVolunteerName` / `assignedVolunteerEmail` | `js/admin.js` `assignVolunteer()` writes all of them; `volunteer.js` `isAssignedToCurrentVolunteer()` checks 4 spellings |

**Why the redundancy?** Honest answer: the project grew, and instead of a painful migration I made the code
**defensive** — it reads and writes several field spellings so old demo data and new data both still work.
Say this confidently: "I kept backward compatibility by accepting multiple field names."

---

# SECTION A — "TELL ME ABOUT YOURSELF / EXPLAIN YOUR PROJECT"

This is almost certainly your first question. Have this ready cold.

## A.1 The 60-Second Script (rehearse out loud, ~150 words)

> "Good morning, ma'am/sir. I'm **Rithika P. S**, from the Department of Software Systems, and my project is
> the **Disaster Resource Coordination System — DRCS**.
>
> DRCS is a **role-based web application** that connects the five groups who have to work together during a
> disaster: **citizens, volunteers, NGOs, hospitals and an administrator**. A **citizen** reports a disaster or
> requests help. The **admin** reviews it, approves it, and assigns an available **volunteer**, who then moves
> the task from *assigned* to *accepted*, *in-progress* and finally *completed*. On the resource side, a
> **hospital** raises an emergency request for blood, oxygen or medicine, the admin approves it, and an **NGO**
> fulfils it from its own stock — and records the allocation.
>
> Technically it's built with **HTML, CSS and vanilla JavaScript using ES modules**, backed by **Firebase
> Authentication** and **Cloud Firestore** for real-time data. The admin also gets a **live Leaflet map**,
> a **Chart.js analytics page with PDF export**, and a **demo-data seeder**. Security is layered — a
> client-side route guard for the user experience, and **server-side Firestore security rules** as the real
> boundary."

## A.2 The 3-Minute Expanded Version (if they say "tell me more" or "explain in detail")

> "Let me expand on that.
>
> **The problem.** During a disaster — say a flood in Chennai or a cyclone in Thoothukudi — the information is
> scattered. Citizens shout for help on different channels, hospitals don't know which blood banks have stock,
> NGOs don't know where the need actually is, and nobody has one shared view. The result is delays and duplicated
> or missed relief. DRCS is my attempt to put **one shared, live coordination platform** in front of all of them.
>
> **How it works — three core workflows.**
> First, the **disaster report**. A citizen files a report through `report.html`; `js/report.js` validates it,
> geocodes the location, and writes a document to the `disasters` collection with `status: 'pending'`. The admin
> approves or rejects it — and once decided, the buttons lock so it can't be flipped back and forth.
> Second, the **help request**. `js/request.js` writes to `requests`. The admin approves it and then uses
> `assignVolunteer()` in `js/admin.js`. That's an **atomic writeBatch** — it marks the request `assigned` and
> marks the volunteer `busy` in one all-or-nothing commit, so a volunteer can never be double-booked halfway.
> The volunteer's own page, `js/volunteer.js`, advances it through the status machine with timestamps.
> Third, the **resource flow**. A hospital raises an emergency request in `js/hospital.js`. The admin approves.
> An NGO, in `js/ngo.js`, allocates it — again a **writeBatch** that deducts stock, marks the request
> `fulfilled`, and creates a permanent **`resourceAllocations` audit record** — three operations, one commit.
>
> **Why it's genuinely real-time.** Every dashboard uses **`onSnapshot` listeners**, so when anything changes on
> the server the screen updates live — no refresh button. All listeners are unsubscribed on logout and
> `beforeunload` so we don't leak connections.
>
> **What I'm careful about.** Security is **defence in depth**. `js/guard.js` is a client-side page whitelist so
> the *user* gets bounced to the right dashboard, but the *real* enforcement is `firestore.rules` on the server —
> even if someone bypasses my JavaScript, Firestore rejects the read or write. I also escape all user-generated
> text through `escapeHtml()` to prevent **XSS**.
>
> **Extras.** The admin gets a live **Leaflet map** with colour-coded markers and overlap-spreading, a
> **Chart.js analytics page** that can export a **PDF via jsPDF**, and a **seeder** that generates 143
> realistic, connected, Tamil-Nadu-flavoured demo records — and it's **idempotent**, so running it twice updates
> the same documents instead of duplicating them.
>
> That's DRCS in a nutshell — one network, faster response. Thank you, I'm happy to take questions."

---

# SECTION B — SLIDE-BY-SLIDE QUESTIONS (21 slides)

## Slide 1 — Title

**Q: What does "Disaster Resource Coordination System" mean in one line?**
A: It's a platform that **coordinates** — it doesn't just store data, it connects the people who need help
(citizens), the people who provide it (NGOs, volunteers), the institutions that supply resources (hospitals)
and the person who oversees it all (the admin), all on one live shared system.

**Q: Why this title and not "Disaster Management System"?**
A: "Management" is broad and government-scale. My project specifically focuses on **coordinating resources** —
matching a hospital's blood request to an NGO's stock, and matching a citizen's need to an available volunteer.
The word *coordination* captures that matching role precisely.

**Q: What is your contribution / is this an individual or group project?**
A: (Be honest and confident.) "This is **my own project** under the guidance of Dr. K. V. Rukmani. I designed the
data model, wrote the Firestore rules, and implemented all five role dashboards."

## Slide 2 — Overview

**Q: What are the modules of your project?**
A: "There are **eight modules**: **Authentication, Admin, Citizen, Volunteer, NGO, Hospital, Map & Location, and
Notification.** Each is a distinct area — Authentication handles sign-up/login and roles; the four role modules are
the dashboards; Map & Location handles the Leaflet map and geocoding; Notification handles alerts."

**Q: How is the system architected?**
A: "It's a **three-layer** client–server app. The **browser** runs HTML/CSS and vanilla JS ES modules. Those import
`auth` and `db` from a single bootstrap file `js/firebase.js`. **Firebase Auth** handles login and stores the role
in `users/{uid}.role`. **Cloud Firestore** stores nine collections. And `firestore.rules` sits on the server as the
security boundary."

**Q: Who are the actors in the system?**
A: "Five — **Citizen, Volunteer, NGO, Hospital and Admin**. Each has its own dashboard page and its own set of
permissions, enforced both by the client-side guard and by the server-side rules."

## Slide 3 — Abstract (EXPECT HARD QUESTIONS HERE)

**Q: Why did you choose this project? What is the problem?**
A: "During real disasters in Tamil Nadu — floods in Chennai, cyclones in the coastal districts — relief information
is scattered across phone calls and social media. Hospitals don't know which NGOs have blood or oxygen, and NGOs
don't know where the need actually is. The problem is a **coordination gap**, not a shortage of goodwill. DRCS puts
citizens, volunteers, NGOs, hospitals and an authority on **one live platform** so a request made by a hospital is
seen instantly by an NGO that can fulfil it."

**Q: What is the novelty or what's new in your project?**
A: "A few things. First, it's genuinely **real-time** — every dashboard uses `onSnapshot`, so an approved request
appears on the NGO's screen without a refresh. Second, the resource allocation is **atomic** — a single writeBatch
deducts stock, marks the request fulfilled, and writes an audit record, so the data can never be left half-updated.
Third, I use **defence-in-depth security** — a client UX guard plus real server-side Firestore rules that encode a
**state machine**, so an NGO can literally only read *approved* requests and can only set them to *fulfilled*."

**Q: What is the scope / who is the end user?**
A: "The scope is **Tamil-Nadu-focused disaster coordination** — my geocoding table is built around TN cities. The end
users are district-level disaster authorities, local NGOs, hospitals and citizens. It's a web app, so it runs on any
device with a browser, which matters in the field."

**Q: What did you learn / what was hardest?**
A: "The hardest part was designing **Firestore security rules** that express *business logic* — not just 'is he
logged in' but 'can this NGO see this request only after admin approval'. Encoding that state machine in
`firestore.rules` taught me the most."

## Slide 4 — Software Specs (EXPECT HARD QUESTIONS HERE)

**Q: Why Firebase and not MySQL?**
A: "Three reasons. First, **real-time** — Firestore's `onSnapshot` pushes changes to every connected client
automatically. With MySQL I'd have had to build a whole polling or WebSocket layer myself. Second, **no server** —
this is a static site on Live Server; there's no backend to host or maintain. Third, **NoSQL flexibility** — my
documents have different shapes (a volunteer has `skills`, a hospital has `bloodInventory`), which fits a document
model better than fixed SQL tables. MySQL would have needed more tables and joins."

**Q: Why this vanilla JS / no framework? Why Live Server?**
A: "I used **vanilla JavaScript with ES modules** so the project has **zero build step** — it runs directly by
opening it on **Live Server** in VS Code. That makes it easy to demo and easy for anyone to run. Firebase SDK v12
is loaded straight from the **CDN** as ES modules. The trade-off is more manual DOM code, but for a project this size
a framework would have added complexity without enough benefit."

**Q: What are ES modules and why use them?**
A: "ES modules let me split logic into separate files and use `import`/`export`. For example every page does
`import { auth, db } from "./firebase.js"` — so the Firebase config lives in **exactly one place**. The browser loads
them natively with `<script type="module">`, no bundler needed."

**Q: What is CDN — why load Firebase/Chart.js/Leaflet from a CDN?**
A: "A **CDN** is a public server that hosts library files. Loading Firebase, Chart.js and Leaflet from a CDN means I
don't have to bundle or commit large libraries — the browser fetches them. The cost is that if the CDN is down, the
feature breaks — which is exactly why I added **graceful fallbacks**, like the text fallback in `reports.js` when
Chart.js doesn't load."

| Spec | Detail |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES modules) |
| Backend / DB | Firebase Auth + Cloud Firestore (SDK v12.16.0 via CDN) |
| Mapping | Leaflet 1.9.4 + OpenStreetMap tiles |
| Geocoding | OpenStreetMap Nominatim |
| Charts | Chart.js 4.4.9 |
| PDF export | jsPDF 2.5.2 |
| Server / runtime | VS Code Live Server (static hosting) |

## Slide 5 — Hardware Specs (they ask "what is hardware actually FOR?")

**Q: Why do you even have hardware specs for a web app?**
A: "Great question. The hardware specs describe the **minimum machine needed to run the development environment and
the browser** — VS Code, Live Server, a modern browser, and enough RAM to run Firebase's real-time listeners
smoothly. It's the client-side requirement, since the backend runs on Google's servers, not mine."

**Q: What are the actual minimums?**
A: "Roughly — any modern **1 GHz+ dual-core** processor, **4 GB RAM** (8 GB comfortable), a few hundred MB of disk for
the project plus browser cache, and any browser supporting ES modules and the Geolocation API — Chrome, Edge or
Firefox. You don't need a GPU; nothing is computed locally."

**Q: Since Firebase is cloud, why mention server hardware at all?**
A: "Because there **is no server hardware** — that's a selling point. Firebase is **serverless**; Google manages the
servers. My hardware specs are only about the **client** running the browser. That's a genuine advantage of this
architecture: near-zero infrastructure cost."

## Slide 6 — Modules Part 1 (Authentication + Admin)

**Q: How does Authentication work?**
A: "`js/auth.js` handles **sign-up, login, password reset and validation** for citizen/volunteer/NGO/hospital. On
sign-up it calls `createUserWithEmailAndPassword`, then writes a profile to `users/{uid}` with `setDoc`, then caches
it in `localStorage` and redirects by role via `redirectUser()`. On login, 'Remember me' works through
`setPersistence` — `browserLocalPersistence` if checked, `browserSessionPersistence` if not."

**Q: How is the admin login different?**
A: "Admins have a **separate portal** — `admin-login.html` with `js/admin-auth.js`. It signs in, reads
`users/{uid}`, and then applies **the gate**: if `role !== 'admin'` it signs the user out and shows 'Access denied'.
Admins also **cannot self-register** — there is no admin option in the signup dropdown. A role must be set by
another admin in Firestore."

**Q: What validation do you do on signup?**
A: "Per-field **regex** checks before any Firebase call — name is letters/spaces/dots, phone is Indian mobile
`^[6-9][0-9]{9}$`, and password must have upper, lower, digit and a special symbol with 8–64 length. Errors show
inline per field via `showFieldError()`."

## Slide 7 — Modules Part 2 (Citizen + Volunteer + NGO + Hospital)

**Q: What does the Citizen module do?**
A: "It's the citizen's dashboard (`citizen.html` + `js/citizen.js`). It shows their name instantly from
`localStorage`, then attaches **two live listeners** — one on their disasters, one on their requests, both filtered
by `where("reportedBy","==",uid)`. It merges and sorts them newest-first **in JavaScript** and shows the latest six.
From there they can file a report, request help, or track requests in `my-requests.js`."

**Q: What does the Volunteer module do?**
A: "`volunteer.js` shows the emergency task assigned to that volunteer and **advances the status machine**:
`assigned → accepted → in-progress → completed`. It uses **three real-time listeners** — profile, their requests,
and notifications. The `advanceTask()` function is a **writeBatch** that updates the request with audit timestamps
(`acceptedAt`, `startedAt`, `completedAt`) and flips the volunteer's availability back to `available` in the same
atomic commit. It also **blocks** changing availability while a task is active."

**Q: What does the NGO module do?**
A: "`js/ngo.js` is relief logistics — the NGO manages its **stock** (`resources`), **distribution points**, and
**allocates** approved hospital requests. The key flow: it lists only `status == "approved"` requests, the NGO picks
matching stock, and the **allocation writeBatch** does three things at once — deducts `quantity`, marks the request
`fulfilled`, and creates a new `resourceAllocations` document as a permanent audit trail."

**Q: What does the Hospital module do?**
A: "`js/hospital.js` manages hospital capacity and resource requests. It has **one live listener** on
`hospitalResources/{uid}` — and note the **document id is the hospital's uid**, which exactly matches the security
rule `hospitalId == auth.uid`. The hospital edits beds, oxygen, blood inventory, and raises an **emergency resource
request** via `addDoc` on `resourceRequests` with `status:'pending'` — that's what the admin approves and the NGO
fulfils."

## Slide 8 — DFD Level 0

**Q: What is a DFD Level 0 (context diagram)?**
A: "It shows the **whole system as one process** with its external entities and the data flows in and out. My Level 0
has the central process **'DRCS'**, external entities **Citizen, Volunteer, NGO, Hospital, Admin**, and the data store
**Firestore**. Citizen sends a *disaster report* / *help request* in; the system sends notifications and task
assignments out."

**Q: Why is Firestore shown as a data store not an entity?**
A: "Because Firestore is **not a human actor** — it's where data rests. In DFD terms it's a **data store**. The
entities are the people/organisations that produce or consume data; Firestore just stores it."

**Q: What are the main data flows at Level 0?**
A: "In: report, help request, resource request, credentials. Out: assignments, approvals, notifications, map markers,
analytics. Between them sits the single highest-level process."

## Slide 9 — DFD Level 1

**Q: What does Level 1 add over Level 0?**
A: "Level 1 **decomposes** the single process into its sub-processes. For me they are roughly: **1.0 Authenticate
User**, **2.0 Report/Request Handling**, **3.0 Review & Assign (Admin)**, **4.0 Resource Allocation (NGO)**, and
**5.0 Generate Reports/Map**. Each shows its own data flows to and from the Firestore data stores."

**Q: What's the difference between Level 0 and Level 1 in your words?**
A: "Level 0 answers *what goes in and out of the system overall*. Level 1 answers *what happens inside* — it breaks
the black box into the functional steps. You could go deeper to Level 2, e.g. decomposing 'Review & Assign' into
approve and assign separately."

**Q: Are these levels balanced?**
A: "Yes — **balancing** means Level 1's inputs/outputs match Level 0's. The same flows that enter the Level 0 process
appear on the Level 1 sub-processes; nothing is invented or lost."

## Slide 10 — E-R Diagram

**Q: What is an E-R diagram?**
A: "An **Entity-Relationship diagram** models the data as **entities** (things), their **attributes** (properties),
and the **relationships** between them. It's designed before touching the database."

**Q: What are your entities, attributes and relationships?**
A: "My main entities are **User, Disaster, Request, Resource, ResourceRequest, DistributionPoint, Allocation and
Notification**. A User has attributes like `name, email, role, phone, location`. Relationships: a **Citizen reports
many Disasters** and **raises many Requests** (one-to-many); a **Hospital raises many ResourceRequests**; an **NGO
has many Resources and Allocations**; an **Allocation links an NGO, a Hospital, a Request and a Resource** — a
many-to-many bridge resolved into its own entity."

**Q: How does the E-R diagram map to Firestore?**
A: "Each entity becomes a **collection**, each attribute becomes a **field**. Relationships are mostly modelled by
**storing the foreign id** — e.g. a request stores `requestedBy = <citizen uid>` rather than a SQL join. That's the
NoSQL way: **denormalise for reads**."

## Slide 11 — System Flow Diagram

**Q: What does the system flow diagram show?**
A: "It shows the **sequence of steps a user takes** through the system — start → login → role detected → dashboard →
perform action → data written to Firestore → UI updates. It's the *behavioural* view, whereas the DFD/E-R are the
*data* views."

**Q: What is the main happy-path flow?**
A: "Login → choose role dashboard → citizen submits report/request (`status:pending`) → admin reviews and approves →
admin assigns a volunteer (`writeBatch`) → volunteer accepts → starts → completes → status and audit timestamps
recorded. On the resource side: hospital requests → admin approves → NGO allocates → fulfilled + audit record."

**Q: How does the system decide which dashboard to show?**
A: "`redirectUser(role)` in `auth.js` maps role → page: citizen→citizen.html, volunteer→volunteer.html,
ngo→ngo.html, hospital→hospital.html, admin→admin.html. And `guard.js` enforces the same mapping on every protected
page via a **whitelist**."

## Slide 12 — Database Design: users ⚠️ (PPT/REAL MISMATCH)

**Q: Explain the users collection.**
A: "The **document id is the Firebase Auth UID**. Fields: `uid, name, email, phone, location, role, status:'active',
available, availability, createdAt, updatedAt`."

**Q: ⚠️ Your slide says `availability BOOLEAN DEFAULT FALSE`. Is that the real field?**
A: "That's the simplified slide. In the real code there are **two fields**: `available` (a **boolean**) *and*
`availability` (a **string** — `"available"`, `"busy"` or `"offline"`). The code is defensive and reads both — for
example `admin.js` `available(v)` and `reports.js` check `availability == 'available' || available === true`. I keep
both for compatibility with the seeded demo data."

**Q: Why store the role in the user document and not just in Auth?**
A: "Firebase Auth stores identity and credentials, but **custom attributes like role** belong in Firestore so
**security rules can read them**. My rules use `userData().role == 'admin'` — they literally look up
`users/{uid}.role`. If the role only lived in Auth I'd need custom claims, which are harder to manage."

## Slide 13 — Database Design: disasters + requests ⚠️ (PPT/REAL MISMATCH)

**Q: Explain the disasters collection.**
A: "`disasterType, severity, location, latitude, longitude, description, peopleAffected, immediateRescue,
reportedBy, reporterName, status:'pending', assignedTo`, plus `createdAt/updatedAt`."

**Q: ⚠️ The slide says `type`. Which is correct?**
A: "The **real code uses `disasterType`** in `js/report.js`. The slide shows a shortened `type` for space. Same for
requests — the real field is **`requestType`**, not `type`. I'd rather you know the code name."

**Q: Explain the requests collection and its assignment fields.**
A: "`requestType, priority, peopleCount, contact, location, lat/lng, requestedBy, requesterName, status` and the
assignment fields."

**Q: ⚠️ The slide only shows `assignedTo`. Does the code have more?**
A: "Yes — the code has **both** `assignedTo` **and** `assignedVolunteer`, plus `assignedVolunteerName` and
`assignedVolunteerEmail`. `assignVolunteer()` writes all of them, and `volunteer.js`'s
`isAssignedToCurrentVolunteer()` defensively checks **four spellings** (`assignedTo`, `assignedVolunteer`,
`assignedVolunteerId`, `volunteerId`) so both old and new data still work."

## Slide 14 — Database Design: resources + hospitalResources + resourceRequests ⚠️ (PPT/REAL MISMATCH)

**Q: Explain the resources collection.**
A: "`resources` is NGO stock: `ngoId, ngoName, category, quantity, unit, location` plus `createdAt/updatedAt`."

**Q: ⚠️ The slide only lists `quantity`. Anything missing?**
A: "The real doc adds **`ngoName`** (so the UI can show the NGO name without a join), plus **`createdAt`** and
**`updatedAt`** for auditing. The slide just didn't show them."

**Q: ⚠️ The slide shows `hospitalResources.bloodUnits INT`. Is that right?**
A: "No — that's the simplification. In the real code blood is a **`bloodInventory` object** — a map of blood group to
count, like `{ "A+":12, "B+":9, "O+":16, "AB+":5, … }`. A single INT can't represent eight blood groups, so an object
is the correct model. `hospital.js` builds the eight blood-group inputs and stores them in that object."

**Q: Explain resourceRequests.**
A: "`hospitalId, hospitalName, resourceType, quantity, priority, details, status, location/city`, and once fulfilled,
`fulfilledBy, fulfilledByName, fulfilledQuantity, fulfilledAt`. The status machine is `pending → approved →
fulfilled`."

## Slide 15 — Database Design: distribution points, allocations, notifications ⚠️ (PPT/REAL MISMATCH)

**Q: Explain distributionPoints and resourceAllocations.**
A: "`distributionPoints` is an NGO's relief centre: `ngoId, name, address, contact, timings, active`. "
"`resourceAllocations` is the **audit trail** — `ngoId, ngoId, hospitalId, hospitalName, requestId, resourceId,
resourceType, quantity, unit, createdAt`. It permanently records who gave what to whom. The rules make it
**write-once/immutable** (`update` is `if false`)."

**Q: ⚠️ The slide shows notifications with hospitalId/resourceType/quantity/priority/reason. Is that real?**
A: "No — the slide is misleading there. The **real notification** is much simpler: `{ message, targetRole,
targetUserId, read, createdAt }`. It's a generic alert — a message string, who it targets (by role or by user id),
and a read flag. The seeder creates them, and `volunteer.js` filters them by `targetUserId` or `targetRole`."

**Q: Who actually creates notifications?**
A: "Honest answer — in the current build **only the seeder creates them**. The UI can read and mark them read
(`markAllNotificationsRead()` is a batch update), but no live code path generates a new one yet. That's on my
'future work' list — wiring notifications to fire on real approval/assignment events."

## Slide 16 — UI: Landing + Login

**Q: What's on the landing page?**
A: "`index.html` — it has **zero JavaScript**, it's a purely static hero page. Header, a hero ('One network, faster
response'), five role cards explaining each user type, three feature rows, and a four-step workflow — **Report →
Review → Respond → Resolve** — which is exactly the pipeline the app implements."

**Q: How is login styled / any security notes?**
A: "Login and signup share `js/auth.js` and `css/auth.css` in a split-screen layout. There's a **show/hide password
toggle**, a **'Remember me'** checkbox that toggles Firebase persistence, a **forgot-password** link using
`sendPasswordResetEmail`, and a separate link to the **admin portal**."

## Slide 17 — UI: Admin Dashboard

**Q: Walk me through the admin dashboard.**
A: "`admin.html` — a sidebar (Overview, Hospital Requests, Disasters, Help Requests, Live Map, Reports, Logout),
six stat cards, three review tables, and modals with Approve/Reject/Assign. `admin.js` starts **five whole-collection
`onSnapshot` listeners** — disasters, requests, resourceRequests, users, resources — and computes all the counts and
sorting **in JavaScript**, so no aggregates or composite indexes are needed."

**Q: What happens after the admin approves something?**
A: "`updateDisaster/updateRequest/updateResourceRequest` call `updateDoc` writing `{status, reviewedAt, reviewedBy:
admin.uid, reviewedByEmail, updatedAt}`, guarded by a `confirm()`. Once a record is decided, the Approve/Reject
buttons are **disabled** so the decision is locked."

**Q: How does the admin assign a volunteer?**
A: "The request modal shows only **available** volunteers. `assignVolunteer()` builds a **two-document writeBatch**:
it sets the request to `assigned` (writing `assignedTo`, the volunteer's name/email, `assignedAt`, `assignedBy`) and
sets the volunteer to `availability:'busy'` / `available:false` with `currentTaskId`. One commit, all-or-nothing, so
a volunteer is never half-booked."

## Slide 18 — UI: Live Map

**Q: How does the live map work?**
A: "`map.html` + `js/map.js` using **Leaflet 1.9.4** with OpenStreetMap tiles, starting at an India view. It attaches
**five `onSnapshot` listeners** (disasters, requests, hospitalResources, distributionPoints, users) and rebuilds
markers on a **120 ms debounce**. Markers are colour-coded by type using `L.divIcon`."

**Q: Why does `coordinates(record)` try seven different field shapes?**
A: "Because different collections store location slightly differently — `latitude/longitude`, `lat/lng`, a nested
`location{}`, a `coordinates{}` or a `geoPoint{}`. The `coordinates()` helper normalises all of them with **range
validation**, which is *why* the forms store coordinates redundantly — so the map always finds something valid."

**Q: What is `spreadOverlappingMarkers()` and why?**
A: "Records in the same city would stack on top of each other and be unusable. That function pushes overlapping
markers onto **concentric rings** (10 per ring, radius growing by `.009`, longitude scaled by `cos(lat)`) so you can
always click each one. It's a nice usability touch."

## Slide 19 — UI: Citizen / Hospital / Volunteer dashboards

**Q: How does the citizen dashboard stay live?**
A: "Two `onSnapshot` listeners filtered by the current uid. On any change it re-renders the merged activity feed,
sorted newest-first **in JS** — deliberately, to avoid a composite index."

**Q: How does the hospital dashboard know which blood to show?**
A: "`renderBloodInputs()` builds the **eight blood-group inputs** (A+ … O-) from the `bloodInventory` object, and a
single listener on `hospitalResources/{uid}` keeps them live. It validates `available ≤ total` before saving."

**Q: How does the volunteer page prevent over-assignment?**
A: "Availability changes are **blocked while an active task exists**, and assignment itself is atomic — the admin's
writeBatch flips the volunteer to `busy` at the same instant the request becomes `assigned`. So there's no window
where a second admin could double-book them."

## Slide 20 — Conclusion

**Q: What is your conclusion / conclusion of the project?**
A: "DRCS demonstrates that a **lightweight, serverless, real-time** web app can genuinely coordinate disaster
resources between five stakeholder groups with **strong security rules and atomic updates** — and it runs on
essentially zero backend infrastructure. It's a working prototype that could be extended to a real district rollout."

**Q: What are the limitations?** (See Section D for the full version.)
A: "Three honest ones: **notifications aren't generated by live code yet** (only seeded); **the rules for
disasters/requests are permissive** — any signed-in user can read/update them, with scoping done only client-side;
and it **needs internet**, with no offline queue."

**Q: What would you add in future?**
A: "Tighter owner-scoped Firestore rules, live notification generation, `orderBy` with proper indexes and
pagination for large data, an **offline queue** using Firestore's local persistence, and turning the static
'Personnel Requirement Estimator' panel into working logic."

## Slide 21 — Thank You

**Q: Any questions for us? / Do you have questions?**
A: (Have one ready.) "Yes — thank you. I was curious, given this is a coordination system, whether you'd suggest
prioritising **offline support** or **tighter security rules** first for a real deployment?" (Flatters the panel and
shows you know your next steps.)

---

# SECTION C — TECHNICAL DEEP-DIVE QUESTIONS (the scary ones)

## C.1 SQL vs NoSQL — why Firestore?

**Q: What's the difference between SQL and NoSQL? Why Firestore?**
A: "SQL databases are **relational** — fixed tables with rows and columns, linked by joins, great for structured
data. **NoSQL** is schema-flexible — Firestore stores **documents** in **collections**, and each document can have
its own fields. I chose Firestore because my entities are genuinely different shapes (a volunteer has `skills`, a
hospital has a `bloodInventory` object), it gives me **real-time listeners** for free, and it's serverless — no
server to run. The trade-off is I do more filtering/sorting in JavaScript instead of SQL queries."

## C.2 Primary key / foreign key

**Q: What is a primary key in your project?**
A: "In Firestore the **document id** is the primary key. For `users` and `hospitalResources` the doc id is literally
the **Firebase Auth UID** — one unique id per person. For auto-created docs like a new request, `addDoc` generates a
unique id automatically."

**Q: Where are foreign keys?**
A: "NoSQL doesn't have formal foreign keys, but I store **reference ids**. `requests.requestedBy` holds the citizen's
uid; `disasters.reportedBy` holds the reporter's uid; `resources.ngoId` holds the NGO's uid;
`resourceRequests.hospitalId` holds the hospital's uid; and `resourceAllocations` holds `ngoId, hospitalId, requestId,
resourceId` — linking four entities together. These are the logical foreign keys."

## C.3 Normalization

**Q: What is normalization? Is your design normalized?**
A: "Normalization is **removing data duplication** so each fact is stored once. Honestly, my Firestore design is
**partially denormalised on purpose** — a request stores `requesterName` and `requesterEmail` even though that lives
in `users`. I did that so the admin table renders **without a join** — one read gets everything. Same reason `resources`
stores `ngoName`. That's a normal NoSQL trade-off: **duplicate a little to read fast**. The `resourceAllocations`
collection is a clean bridge entity, which is a normalised idea."

**Q: Isn't duplication bad?**
A: "In SQL, yes. In NoSQL it's a **read-vs-write trade-off**. I accept slight duplication to avoid expensive joins.
The risk is a stale name if a user changes it — a real limitation I'd handle by updating dependents or reading live."

## C.4 DFD — Level 0 and Level 1

**Q: What is a DFD? Explain Level 0 and 1 of yours.**
A: "A **Data Flow Diagram** shows how data moves through a system. **Level 0 (context diagram)** is the system as one
box — for me, DRCS surrounded by Citizen/Volunteer/NGO/Hospital/Admin entities and the Firestore data store, with the
flows going in and out. **Level 1** decomposes that box into sub-processes: authentication, report/request handling,
admin review & assign, NGO allocation, and reports/map. Balancing means the Level 1 flows match the Level 0 ones."

## C.5 E-R diagram

**Q: What is an E-R diagram? Entities, attributes, relationships in your project?**
A: "An **Entity-Relationship diagram** models data as entities, their attributes, and the relationships. My entities:
**User, Disaster, Request, Resource, ResourceRequest, DistributionPoint, Allocation, Notification**. Attributes are
their fields — e.g. Request has `requestType, priority, peopleCount, location`. Relationships: **one Citizen reports
many Disasters**; **one Hospital raises many ResourceRequests**; **one NGO has many Resources**; and **Allocation** is
a many-to-many bridge connecting NGO↔Hospital↔Request↔Resource."

## C.6 Authentication vs Authorization

**Q: What's the difference, and where is each implemented?**
A: "**Authentication** is *who are you* — verifying identity. That's **Firebase Auth**: `signInWithEmailAndPassword`
in `auth.js` and `admin-auth.js`. **Authorization** is *what are you allowed to do* — and I implement it in **two
layers**. First, `js/guard.js` is a **client-side page whitelist** — it reads the role and bounces the user to the
right dashboard (purely UX; a hacker can bypass JS). Second, and this is the real one, **`firestore.rules`** on the
server — even if JS is bypassed, Firestore rejects the read/write based on `users/{uid}.role`. That's **defence in
depth**."

## C.7 Real-time listener (onSnapshot) vs one-time read (getDoc)

**Q: What's the difference and why listeners?**
A: "`getDoc` is a **one-time read** — you ask once and get the data back. `onSnapshot` is a **live listener** — the
callback fires immediately *and again every time that data changes on the server*. I use listeners everywhere the UI
must stay current: the admin's five listeners, the volunteer's three, the NGO's four, so an approved request appears
instantly without a refresh. `getDoc` is used for **one-off checks**, like reading a user's profile at login.
Listeners are always **unsubscribed** on logout and `beforeunload` to avoid leaks."

## C.8 writeBatch — the three use cases

**Q: What is a writeBatch and why use it?**
A: "A `writeBatch` groups several writes into **one atomic commit** — either **all succeed or none do**. I use it
wherever a business action spans multiple documents, so the data can never end up half-updated."

**Q: Give the use cases.**
A: "Three. **1. `assignVolunteer()` in `admin.js`** — marks the request `assigned` *and* the volunteer `busy` in one
commit, so a volunteer is never double-booked halfway. **2. NGO allocation in `ngo.js`** — deducts stock, marks the
request `fulfilled`, and creates the audit record — three ops, one commit. **3. `advanceTask()` in `volunteer.js`** —
advances the request status with audit timestamps *and* flips the volunteer back to `available`. Also the seeder uses
one batch for 143 records, staying under Firestore's **500-operation limit**."

## C.9 Firestore security rules — the state machine

**Q: What are Firestore security rules?**
A: "They're a rules file (`firestore.rules`, `rules_version '2'`) that runs **on Google's servers** before any read or
write. Even if someone bypasses my JavaScript entirely, Firestore **rejects** anything the rules don't allow. My file
has helpers like `signedIn()`, `roleIs(role)`, `isAdmin()`, `isNgo()`."

**Q: Explain the state machine encoded for resourceRequests.**
A: "The rules encode **business logic**, not just 'logged in'. For `resourceRequests`: an NGO can **only read a
request if its `status == "approved"`** — so they can't see pending ones before admin sign-off. And an NGO can
**only update it to move it to `fulfilled`** — they can't set it to anything else. `resourceAllocations` is
write-once (`update` is `if false`), making it a true **immutable audit log**. Ownership is checked by comparing
`request.resource.data.ngoId == request.auth.uid` for new docs vs `resource.data.ngoId` for existing ones."

## C.10 How did you avoid composite indexes?

**Q: What is a composite index and how did you avoid it?**
A: "A **composite index** is Firestore's multi-field index — it's needed if you combine `where()` **with**
`orderBy()` on a collection, and Firestore makes you create it manually. To avoid that dependency I **never combine
`where` with `orderBy`** — I use single-field filters or whole-collection reads, then **sort and filter in
JavaScript**. For example `citizen.js`, `my-requests.js` and `admin.js` all sort newest-first in JS. My
`my-requests.js` error callback even surfaces Firestore's `failed-precondition` (missing index) if it ever occurs."

## C.11 XSS and escapeHtml

**Q: What is XSS and how did you prevent it?**
A: "**XSS — Cross-Site Scripting** — is when a user types malicious script (e.g. `<script>` in a description) and it
gets rendered and executed in someone else's browser. I prevent it by passing **all user-generated content through
`escapeHtml()`** before inserting it into the DOM — it replaces `& < > " '` with their entities, so `<script>` is
displayed as *text*, never executed. Every dashboard — `admin.js`, `volunteer.js`, `my-requests.js`, `ngo.js`,
`map.js` (as `esc()`) — uses it. Input is also regex-validated, and passwords never touch my code — Firebase Auth
handles them."

## C.12 Geocoding — offline table then Nominatim

**Q: What is geocoding?**
A: "Converting a **place name into latitude/longitude** so it can be shown on the map."

**Q: Explain your offline-table-then-Nominatim fallback.**
A: "`geocodeLocation()` in `js/location-utils.js` is **two-tier**. First it checks an **offline table** — a dictionary
of ~25 Tamil Nadu places (chennai, coimbatore, madurai, trichy…) matched by substring. That's **instant and free of
rate limits**. Only if that misses does it call the **OpenStreetMap Nominatim API** with an **8-second
`AbortSignal.timeout`**, appending 'Tamil Nadu, India' and restricting to India. Crucially, **every failure path
returns `null` — the function never throws** — so the submission still succeeds even without coordinates. There's
also `getBrowserCoordinates()` wrapping the browser Geolocation API for the GPS button."

## C.13 localStorage vs sessionStorage vs Firebase — why cache the profile?

**Q: What's the difference between localStorage, sessionStorage and Firebase?**
A: "**localStorage** persists across sessions and tabs until explicitly cleared. **sessionStorage** lives only per-tab
and dies when the tab closes. **Firebase/Firestore** is remote server storage, shared and real-time. I use
localStorage to **cache the user profile** under `drcsUserProfile`."

**Q: Why cache the profile?**
A: "Two reasons. **Instant paint** — the dashboard shows the user's name immediately from cache instead of flashing a
default 'Citizen' while Firestore loads (this was my 'Phase 1 name-loading fix'). And it survives short network blips.
The cache is always **re-verified** against Firestore, and cleared on logout — so it's a UX optimisation, not a
security source of truth."

## C.14 Idempotent operations — the seeder

**Q: What is an idempotent operation? Point to your seeder.**
A: "An **idempotent** operation gives the **same result if run multiple times** — running it twice doesn't create a
duplicate or a mess. My **`js/seed-data.js`** seeder is idempotent because it uses **deterministic ids**
(`demo_user_001 … demo_allocation_006`) with `batch.set(..., { merge:true })` — so re-running it **updates the same
143 documents** rather than duplicating them. Every doc is also stamped `demoData:true`, so 'Remove demo data' queries
`where("demoData","==",true)` and deletes **only** demo records, never real ones."

## C.15 Graceful degradation — reports.js and map.js

**Q: What is graceful degradation?**
A: "When a dependency fails, the app **still works in a reduced way** instead of crashing."

**Q: Point to where you do it.**
A: "Two places. In **`reports.js` `draw()`** — if the Chart.js CDN didn't load (`!window.Chart`), it hides the canvas
and prints the numbers as a **text fallback** ('Chart preview unavailable — Pending: 3 · Approved: 5…') instead of
throwing. In **`map.js`** — if Leaflet fails to load, the map gracefully fails with a message rather than a blank
crash, and unmappable records are listed in an 'Unmapped records' panel instead of vanishing. `geocodeLocation()`
returning `null` instead of throwing is the same philosophy."

## C.16 addDoc vs setDoc vs updateDoc vs writeBatch

**Q: Explain the difference.**
A: "`addDoc` creates a **new document with an auto-generated id** — used for a new request or report. `setDoc`
**writes to a specific document id**, creating or overwriting — used for user profiles (`users/{uid}`) and the seeder
(which uses `setDoc` with `{merge:true}` to update-without-wipe). `updateDoc` **modifies fields on an existing doc** —
used when the admin approves something. `writeBatch` **groups many of these into one atomic commit** — used for
assignment and allocation."

## C.17 serverTimestamp() vs new Date()

**Q: Why `serverTimestamp()` instead of `new Date()`?**
A: "`new Date()` uses the **client's clock**, which a user could tamper with or which might be wrong if their device
is set to the wrong time. `serverTimestamp()` uses **Google's server clock**, so every record's `createdAt` is
consistent and trustworthy across all users. I use it for `createdAt`, `updatedAt`, `assignedAt`, `completedAt` —
all the audit timestamps."

## C.18 Event delegation — my-requests.js

**Q: What is event delegation?**
A: "Instead of attaching a click listener to **every** button, you attach **one** listener to a **parent container**
and use `event.target.closest(...)` to figure out which child was clicked. It's efficient and works for elements added
later."

**Q: Where do you use it?**
A: "`my-requests.js` puts a single listener on `#requestsContainer` and uses
`event.target.closest(".request-card-action")` to detect which card button was clicked — so it works even though the
cards are **re-rendered dynamically** from live data. `admin.js` does the same on its three table bodies with
`closest('[data-disaster]')`, and `volunteer.js` uses `closest("[data-task-action]")`."

## C.19 State machine — the request lifecycle

**Q: What is a state machine? Map your request lifecycle.**
A: "A **state machine** is a model where an object is in one **state** and moves between states only via defined
**transitions** — invalid jumps are blocked. My help-request lifecycle is:
`pending → approved → assigned → accepted → in-progress → completed`
(with `rejected` and `cancelled` as other terminal branches). Each transition is driven by a specific action — admin
approve, admin assign, volunteer accept/start/complete — and once a request is decided the admin's Approve/Reject
buttons are **disabled** (locked). The same idea applies to disasters (`pending → approved | rejected`) and resource
requests (`pending → approved → fulfilled`). Even the **security rules** enforce part of this state machine."

## C.20 Atomicity — why a half-completed assignment breaks the system

**Q: What is atomicity?**
A: "**Atomicity** means a multi-step operation happens **all or nothing** — if any part fails, the whole thing is
rolled back as if it never happened."

**Q: Why would a half-completed assignment break the system?**
A: "Consider assigning a volunteer with **two separate writes**: first set the request to `assigned`, then set the
volunteer to `busy`. If the network dies **between** them, you get a request that says 'assigned' but a volunteer who
still looks 'available' — so the admin assigns them **again** to a second request. Now one volunteer is booked twice
for an emergency. By using a single **`writeBatch`** in `assignVolunteer()`, both documents change together or not at
all — that's exactly the atomicity guarantee that prevents the double-booking."

---

# SECTION D — TRICKY / CRITICAL-THINKING QUESTIONS (honest answers)

## D.1 What is the limitation of your project?

A: "Three honest limitations. First, **notifications are only seeded** — the UI reads and marks them read, but no
live code path generates a new one on approval/assignment yet. Second, my **Firestore rules for `disasters` and
`requests` are permissive** — any signed-in user can read or update them, with 'only see my own' enforced only
client-side. Third, it **requires internet** — there's no offline queue, which is a real concern in a disaster."

## D.2 What is the biggest security weakness? (be honest — this wins marks)

A: "Honestly, the biggest weakness is in **`firestore.rules`**: for `disasters`, `requests` and `notifications`, the
rules allow **any signed-in user to read or update any document**. The 'citizen only sees their own reports' logic is
done **client-side** with `where("reportedBy","==",uid)` — which a determined attacker could bypass. The fix would be
to scope those rules server-side, e.g. `allow read: if request.auth.uid == resource.data.reportedBy || isAdmin()`.
I know this is the gap because I wrote the rules and know exactly where they're loose."

## D.3 What happens if there is no internet?

A: "Firestore and Firebase Auth both **need the network**, so with no internet the app can't read or write — the
dashboards would show their loading or error states. I made the failure modes **graceful** — geocoding falls back to
the offline TN table and returns `null` rather than crashing, and error callbacks show friendly messages instead of
breaking. For a real deployment the improvement would be enabling **Firestore's offline persistence** so writes queue
locally and sync when connectivity returns."

## D.4 What if 1000 people use it at once? (scaling)

A: "**Firestore itself scales automatically** — it's a managed Google service that handles huge concurrency, so raw
traffic isn't the problem. The **bottleneck in my code** is that several dashboards use **whole-collection
`onSnapshot` listeners** — e.g. the admin listens to all of `disasters` and `requests`. At scale that's a lot of data
streaming to each client. I'd move to **server-side queries with `where` + `orderBy`, proper composite indexes, and
pagination** so each client only receives the subset it needs. That's the realistic answer — the platform scales, but
my query strategy would need tightening."

## D.5 Can a citizen become an admin?

A: "**No.** The signup dropdown offers only **citizen, volunteer, NGO, hospital** — there is deliberately **no admin
option**, so admins can't self-register. The role must be set to `'admin'` in `users/{uid}` by another admin in
Firestore. And the separate `admin-auth.js` gate re-verifies `role === 'admin'` and signs out anyone who isn't. That's
a deliberate security design, not an accident."

## D.6 Client-side guard vs real security

A: "`js/guard.js` is **client-side** — it reads the role and redirects the user to the right page. But client-side JS
runs in the **user's browser**, so a hacker can bypass it (edit the JS, call Firestore directly). That's why it's only
for **user experience**. The **real security** is `firestore.rules`, which runs **on Google's servers** before every
read/write — it can't be bypassed from the client. I treat the guard as UX and the rules as enforcement. That's
**defence in depth** — two independent layers."

## D.7 Why did you not use a framework?

A: "For a project of this size, **vanilla JS with ES modules** keeps it dependency-free and directly runnable on
Live Server — no build step, no toolchain, anyone can open and run it. The Firebase, Leaflet, Chart.js and jsPDF
libraries cover the hard parts. The trade-off is more manual DOM code, which I accepted. A framework like React would
help at much larger scale, but here it would add complexity without enough payoff."

## D.8 What would you add in future?

A: "Priority one — **tighten the Firestore rules** so `disasters`/`requests` are owner-scoped server-side. Two —
**live notification generation** wired to real approval/assignment events. Three — **pagination with proper indexes**
for large datasets. Four — an **offline queue** using Firestore persistence for disaster conditions. Five — turn the
static 'Personnel Requirement Estimator' panel into **working logic**. And clean up dead files like `realadmin.js`,
`realreport.js` and the five orphaned CSS layers."

## D.9 What is the cost model of Firebase?

A: "Firebase has a **generous free tier (Spark plan)** — a daily quota of reads, writes and deletes, plus free Auth
users. My project sits comfortably in it for development and demos. Beyond that, the **Blaze plan is pay-as-you-go** —
you're charged per document read/write/delete and for bandwidth, and it scales down to zero when unused. Since
Firestore is **serverless**, there's no fixed server cost — you pay for actual usage. For a district-scale rollout
you'd monitor reads carefully, because my whole-collection listeners are the main read consumer."

## D.10 One bug in your project? (say this honestly — shows integrity)

A: "Yes — I'll be honest about one. **`js/admin.js` has a paste error**: an accidental copy of the file got pasted
*inside* the `finally` block of `assignVolunteer()`, which introduced an **illegal nested `import`** statement. ES
modules can't import inside a code block, so that file **fails to parse**. The clean, working version is
**`js/realadmin.js`** with identical logic, but no page currently references it. The fix is simply to point
`admin.html` at `realadmin.js`, or delete the duplicated block. I'd rather flag it than pretend it isn't there — and
it's a one-line fix."

## D.11 How would you test it?

A: "At several levels. **Manual/functional testing** of each workflow end-to-end — report→approve, request→assign→
complete, hospital→approve→NGO-allocate — using the demo-data seeder to populate realistic records. **Validation
testing** of the regex and the `available ≤ total` rules. **Security testing** — trying to access another role's page
and confirming the guard and rules block it. **Idempotency testing** — running the seeder twice and confirming no
duplicates. For a more rigorous approach I'd add **automated tests** with the Firebase Emulator Suite so tests run
against a fake Firestore without touching real data, plus unit tests for helpers like `escapeHtml` and
`geocodeLocation`."

## D.12 Did you do this project yourself?

A: (Answer with confidence and honesty.) "Yes — this is **my own work**, developed under the guidance of our guide
Dr. K. V. Rukmani. I designed the data model, wrote the Firestore security rules, and implemented all five role
dashboards, the map, and the analytics. I used documentation — Firebase, Leaflet, Chart.js — as any developer does,
and I'm happy to walk you through any part of the code."

---

# SECTION E — QUICK-FIRE ONE-LINERS (rapid revision)

1. **Firebase** — Google's app-development platform offering Auth, Firestore, hosting and more as managed backend services.
2. **Firestore** — Firebase's NoSQL **document database**, storing documents in collections with real-time sync.
3. **ES module** — a JavaScript file using `import`/`export`, loaded natively by the browser with `<script type="module">`.
4. **CDN** — Content Delivery Network; a public server hosting libraries (Firebase, Leaflet, Chart.js) loaded over the web.
5. **Leaflet** — a lightweight open-source JavaScript library for interactive maps; I use it with OpenStreetMap tiles.
6. **Nominatim** — OpenStreetMap's free **geocoding** service that converts a place name into latitude/longitude.
7. **Chart.js** — a JavaScript charting library; I use it for the admin's doughnut/bar analytics charts.
8. **jsPDF** — a JavaScript library that generates PDFs client-side; used for the admin's `exportPdf()` report download.
9. **CORS** — Cross-Origin Resource Sharing; the browser rule that lets a page call an API on another domain (like Nominatim).
10. **API** — Application Programming Interface; a defined way for programs to talk — e.g. `fetch()` to Nominatim.
11. **JSON** — JavaScript Object Notation; the lightweight key-value text format used for API data and Firestore fields.
12. **CRUD** — Create, Read, Update, Delete — the four basic database operations; my app's core actions.
13. **NoSQL** — non-relational, schema-flexible database model (vs fixed SQL tables) — Firestore is NoSQL.
14. **Document database** — a NoSQL store where each record is a JSON-like **document** (Firestore) rather than a table row.
15. **Collection** — Firestore's folder of documents (e.g. `requests`); roughly a table.
16. **Document** — a single Firestore record with fields and an id; roughly a row.
17. **Snapshot** — a frozen copy of Firestore data delivered to an `onSnapshot` callback.
18. **Unsubscribe** — calling the function returned by `onSnapshot` to stop listening (I do this on logout/`beforeunload`).
19. **Fail-closed** — defaulting to *deny/deny access* on error; my `guard.js` redirects to `login.html` on any exception.
20. **Idempotent** — safe to run repeatedly with the same result; my seeder's fixed ids + `{merge:true}` make it idempotent.
21. **Atomic** — all-or-nothing; a `writeBatch` either fully commits or fully rolls back.
22. **Debounce** — delaying a handler until calls stop (my map rebuilds on a **120 ms** debounce) to avoid over-processing.

---

# SECTION F — WHAT NOT TO DO (exam-day tips)

## F.1 Never say "I don't know" without attempting

If a question stumps you, **bridge into something adjacent you do know**:
> "I'm not 100% certain about that specific term, but the way I approached a similar idea in my project was…"

Always try to land on a **real file or function**. "I'm not sure about the exact term, but in
`assignVolunteer()` I used a `writeBatch` for an all-or-nothing commit" is infinitely better than silence.

## F.2 When unsure, say "the design choice was…"

When you can't recall a definition, describe **why you built it that way**:
> "The design choice there was to sort in JavaScript instead of using `orderBy`, to avoid needing a composite index."

Examiners respect a reasoned design decision far more than a guessed dictionary definition.

## F.3 Always connect the answer back to a real file or function

This is your single biggest advantage — you actually built it. Every answer should try to cite something concrete:
`js/admin.js` `assignVolunteer()`, `js/ngo.js` allocation `writeBatch`, `firestore.rules` for resourceRequests,
`js/location-utils.js` `geocodeLocation()`, `reports.js` `draw()` fallback, `seed-data.js` deterministic ids.
It proves understanding, not memorisation.

## F.4 Be honest about limitations — it wins marks

When asked about weaknesses (Section D), **name them plainly**. Saying "the Firestore rules for disasters and requests
are permissive — any signed-in user can read them, and I'd scope them server-side" makes you sound like a senior
engineer who knows their system. Hiding a known bug and being caught is far worse. The `admin.js` paste bug is a
**feature** in the viva — volunteering it shows integrity.

## F.5 Watch the PPT-vs-code mismatches

If the examiner points at a slide and asks "is this your field?", **gently correct**:
> "That's the simplified version on the slide — in the actual code it's `disasterType`, and here's why…"

Have the mismatch table at the top of this file memorised: `disasterType`/`requestType`, `bloodInventory` object not
`bloodUnits INT`, the simple `notifications` shape, the two availability fields, and the multiple `assigned*` fields.

## F.6 Speak about *your* project, not "a project"

Say "**my** geocoding falls back to Nominatim", not "the system can use Nominatim". Own it. Confidence + honesty is
the winning combination.

## F.7 If asked to show code, narrate as you go

If they say "open the code and explain `assignVolunteer`", walk them through it **step by step and out loud**:
> "Here's the function. It finds the request and the volunteer, checks the request is approved and unassigned, then
> creates a `writeBatch` — first op sets the request to `assigned` with all the assignment fields, second op sets the
> volunteer to `busy`. Then one `commit()`. All-or-nothing."

## F.8 Prepare your "What would you improve?" and "biggest challenge" answers cold

These are near-guaranteed. Rehearse D.1, D.8, and A.2's "hardest part" (the security rules state machine).

## F.9 Manage your time and breathe

If a question is long, it's fine to say "let me think about that for a second." A 3-second pause looks far better
than a panicked ramble. Structure long answers as **"It's X. The reason is Y. In my project, Z."**

## F.10 Close strong

End the viva the way you started — with the one-line summary:
> "So in short, DRCS is a real-time, role-based coordination platform with atomic writes and server-side security
> rules. Thank you."

---

*Good luck, Rithika — you built a genuinely impressive system. You know this material better than you think.
Sleep well, rehearse Section A out loud once tomorrow morning, and be proud of the work.*
