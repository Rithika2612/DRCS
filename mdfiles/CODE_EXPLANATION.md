# DRCS — Complete Code Explanation (For Total Beginners)

> **Who this is for:** you have a viva tomorrow and you are *not* comfortable with JavaScript yet.
> Every keyword is explained before it is used. Every code block is real code from your project.
> Every section ends with **WHAT TO SAY IN THE VIVA** — memorise those.

---

# PART 0 — JavaScript Cheat Sheet (read this first, 10 minutes)

Everything below is used constantly in your project. Learn these 12 things and the rest is easy.

### 1. Variables — `const` and `let`
A variable is a labelled box that stores a value.
```js
const name = "Rithika";   // a box labelled "name" holding text
let count = 5;            // a box labelled "count" holding a number
```
- `const` = the value can never be **replaced** (the box is sealed).
- `let` = the value **can** be changed later.
- Rule of thumb: always start with `const`, use `let` only when you know you'll change it. Never use `var` (old style).

### 2. Functions — a named recipe
A function is a block of instructions you can run whenever you want, as many times as you want.
```js
function showName(name) {      // "name" here is a parameter — an input
    console.log(name);
}
showName("Rithika");           // calling it → prints Rithika
```

### 3. Arrow functions — the short way to write a function
Same thing, shorter syntax. Your project uses these *everywhere*.
```js
const showName = (name) => {
    console.log(name);
};
```
Read `(name) => {...}` as **"given `name`, do this"**.

### 4. `async` and `await` — waiting for slow things
Talking to a database over the internet takes time. You don't want to freeze the page while you wait.
```js
async function loadUser() {
    const snapshot = await getDoc(userReference);   // wait here until data arrives
    console.log(snapshot.data());
}
```
- `async` in front means **"this function will sometimes have to wait"**.
- `await` in front means **"pause right here until this finishes"**.
- Analogy: ordering food. `await` is you standing at the counter, not wandering off.

### 5. Promises — a value that will arrive later
Anything that talks to the network returns a **Promise**: a receipt promising you a value in the future.
```js
getBrowserCoordinates()          // returns a Promise
    .then(coords => useThem(coords))   // when it arrives, do this
    .catch(error => show(error));      // if it fails, do this
```
`await` is just the neater way to write `.then()`.

### 6. `try` / `catch` — the safety net
```js
try {
    await doSomethingRisky();
} catch (error) {
    console.log("Something went wrong:", error.message);
}
```
"Try this, and if it throws an error, run the catch block instead of crashing."

### 7. The DOM — `document.getElementById`
The **DOM** is the page as JavaScript sees it: a tree of objects you can read and change.
```js
const box = document.getElementById("userName");   // find the element with id="userName"
box.textContent = "Rithika";                        // change what it says
```

### 8. Events — `addEventListener`
Making the page react to what the user does.
```js
button.addEventListener("click", () => {
    console.log("clicked!");
});
```
"Hey `button`, when a `click` happens, run this code."

### 9. Template literals — backtick strings
Backticks let you put variables **inside** a string.
```js
const role = "citizen";
const page = `${role}.html`;    // → "citizen.html"
```
Much cleaner than `"citizen" + ".html"`.

### 10. Array methods
```js
items.filter(item => item.status === "pending")   // keep only matching items
items.map(item => item.name)                      // transform each into a new value
items.forEach(item => render(item))               // do something with each
items.sort((a, b) => b.time - a.time)             // order them
```

### 11. Optional chaining `?.` and `??`
```js
createdAt?.toMillis?.()        // "if createdAt exists, call toMillis; if not, return undefined"
name || "Citizen"              // "use name if it exists, otherwise use Citizen"
```
This prevents crashes when a field is missing from the database.

### 12. ES modules — `import` / `export`
Your files share code by **exporting** and **importing**. You need `<script type="module">` in the HTML.
```js
// firebase.js
export { auth, db };

// guard.js
import { auth, db } from "./firebase.js";
```
Analogy: `export` = putting a document in a shared folder. `import` = taking a copy to your desk.

**Bonus terms you'll hear:**
- **Callback** = a function passed to another function to run later (`onAuthStateChanged(auth, callback)`).
- **Event delegation** = instead of putting a listener on 50 buttons, put **one** listener on their parent and check which child was clicked.
- **XSS** = letting a user's typed text be treated as HTML/script — a security hole. Prevented here by `escapeHtml()`.

---

# PART 1 — CORE / INFRASTRUCTURE FILES

---

## 1.1 `js/firebase.js` — the whole file (25 lines)

This is the **smallest and most important** file. It is the only place the Firebase settings live.

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
```
**Line by line:**
- These three lines **import** three tools from Google's servers (this is the "CDN" — Google hosts the files, you don't download them into your folder).
- `initializeApp` = "start a Firebase app".
- `getAuth` = "give me the login service".
- `getFirestore` = "give me the database service".
- The `12.16.0` in the URL is the **version number**. Pinning a version means everyone runs exactly the same code.

```js
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "drcs-188d6.firebaseapp.com",
    projectId: "drcs-188d6",
    storageBucket: "drcs-188d6.firebasestorage.app",
    messagingSenderId: "921448195371",
    appId: "1:921448195371:web:d18cc7c83778dd4c54d16e",
    measurementId: "G-K6D7E646KC"
};
```
**Line by line:** a **constant** called `firebaseConfig` holding one big object (a set of key:value pairs). Think of it as an address label telling the code *which* Firebase project to talk to. `projectId: "drcs-188d6"` is the important one.

> **⭐ VERY LIKELY VIVA QUESTION: "Your API key is visible in the source code — isn't that a security problem?"**
> **No.** The Firebase API key is *designed* to be public. It only identifies **which** project to
> talk to, like a house number. It does **not** grant access. Access is controlled by
> `firestore.rules`, which check **who you are** (your login session) on every read and write. Even
> if someone copies my whole `firebase.js`, they still can't read my data — the rules say no.

```js
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export { auth, db };
```
**Line by line:**
- `initializeApp(firebaseConfig)` → actually starts the app using that config.
- `getAuth(app)` → creates the login service object and stores it in `auth`.
- `getFirestore(app)` → creates the database object and stores it in `db`.
- `export { auth, db }` → **publishes** both so other files can use them. This is why every other file starts with `import { auth, db } from "./firebase.js";`.

**WHAT TO SAY IN THE VIVA:** *"This 25-line module is the single point of Firebase configuration. It initialises the app and exports two objects — `auth` for authentication and `db` for Firestore — which every other module imports. Keeping the config in one file means I change it in one place, not fifty."*

---

## 1.2 `js/guard.js` — the security guard on every door (55 lines)

This file is included on the protected pages. Its only job: **are you logged in, and are you the right role for this page?**

```js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from ".../firebase-auth.js";
import { doc, getDoc } from ".../firebase-firestore.js";
```
Three imports: the shared `auth`/`db`, plus two tools — `onAuthStateChanged` (a listener) and `doc`+`getDoc` (reading a single document).

> **`onAuthStateChanged` explained:** Firebase keeps track of whether someone is logged in, even
> after they close and reopen the browser. This function takes a **callback** (a function to run
> later) and runs it **immediately** with the current user, and then **again every time the login
> state changes**. It's the standard way to say "whenever you know who the user is, tell me."

```js
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
```
- `async (user) => {...}` = "when Firebase tells me who the user is, run this code. It may need to wait, so it's `async`."
- `if (!user)` = "if there is **no** user (nobody logged in)..."
- `window.location.href = "login.html"` = **redirect** the browser to the login page.
- `return` = stop here, don't run the rest. This is called **fail-closed** — the safe default is to deny.

```js
    try {
        const userReference = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userReference);
```
- `doc(db, "users", user.uid)` builds a **reference** (an address, not the data) pointing at the document `users/{uid}`. `user.uid` is the unique ID Firebase Auth gives every account.
- `await getDoc(userReference)` **goes and fetches** the actual data. `await` because it's a network call.
- The result is a **snapshot** — a frozen copy of the document at that moment.

```js
        if (!userSnapshot.exists()) {
            window.location.href = "login.html";
            return;
        }
        const userData = userSnapshot.data();
```
- `.exists()` → did the document actually come back? Sometimes an account exists in the login system but has no profile document. If so, bounce to login.
- `.data()` → converts the snapshot into a normal JavaScript object, e.g. `{ name: "Rithika", role: "citizen", ... }`.

```js
        const currentPage = window.location.pathname.split("/").pop();
```
**Line by line — this is a chain of three steps, read it right to left:**
1. `window.location.pathname` = the current URL path, e.g. `/DRCS/report.html`
2. `.split("/")` = cut it into pieces at every `/` → `["", "DRCS", "report.html"]`
3. `.pop()` = take the **last** piece → `"report.html"`
So: *"which page am I on?"*

```js
        const allowedPages = {
            citizen: ["citizen.html", "report.html", "request.html", "my-requests.html"],
            volunteer: ["volunteer.html"],
            ngo: ["ngo.html"],
            hospital: ["hospital.html"],
            admin: ["admin.html"]
        };
```
A **whitelist**: which pages each role may open. Note citizens get **four** pages — they're the only role with more than one, because a citizen needs the dashboard plus the two forms plus the tracking page.

```js
        const rolePages = allowedPages[userData.role] || [];
        if (!rolePages.includes(currentPage)) {
            window.location.href = `${userData.role}.html`;
        }
    } catch (error) {
        console.error("Dashboard protection error:", error);
        window.location.href = "login.html";
    }
});
```
- `allowedPages[userData.role]` = look up the array for this user's role. `|| []` means "if the role isn't in the list, use an empty array" (an empty array allows nothing — safe).
- `.includes(currentPage)` = is the page I'm on in my allowed list?
- If **not** → redirect them to **their own** dashboard. So a volunteer clicking `admin.html` gets bounced to `volunteer.html`.
- The `catch` handles any error (network down, rules denying the read) and redirects to login — again **fail-closed**.

> **⭐ VIVA QUESTION: "Is this real security?"**
> **Honest answer:** No — it's **client-side**, so it's UX convenience. A hacker can delete
> `guard.js` from their browser. The **real** security is `firestore.rules`, which run on Google's
> servers and cannot be bypassed. This is a layered approach called **defense in depth**.

**WHAT TO SAY IN THE VIVA:** *"`guard.js` is a client-side route guard included on every protected page. It uses `onAuthStateChanged` to detect the session, reads the user's profile to get their role, and checks the current page against a role whitelist. Unknown users and wrong roles are redirected, and any error also redirects — a fail-closed design. Real enforcement, though, lives in the Firestore rules."*

---

## 1.3 `js/location-utils.js` — turning a place name into a pin on the map (87 lines)

**Why this file exists:** the database stores coordinates (latitude/longitude) so records can be shown on the Leaflet map. But a citizen types "Velachery, Chennai". Something must convert that text into numbers.

```js
const TAMIL_NADU_COORDINATES = {
    chennai: [13.0827, 80.2707],
    coimbatore: [11.0168, 76.9558],
    madurai: [9.9252, 78.1198],
    trichy: [10.7905, 78.7047],
    tiruchirappalli: [10.7905, 78.7047],
    ...
    velachery: [12.9815, 80.2180]
};
```
A **dictionary** (called an *object* in JS) mapping a place name to a `[latitude, longitude]` pair. This is the **offline table** — 25 Tamil Nadu places, including common aliases like `trichy`/`tiruchirappalli` and `tuticorin`/`thoothukudi` (two names for the same city).

```js
function knownCoordinates(location) {
    const value = String(location || "").trim().toLowerCase();
    for (const [place, coordinates] of Object.entries(TAMIL_NADU_COORDINATES)) {
        if (value.includes(place)) {
            return coordinates;
        }
    }
    return null;
}
```
**Line by line:**
- `String(location || "")` = if `location` is empty/undefined, use an empty string — prevents a crash.
- `.trim().toLowerCase()` = remove leading/trailing spaces and make it lowercase, so `" Chennai "` still matches `chennai`.
- `for (const [place, coordinates] of Object.entries(...))` = loop through every entry, giving me the name and its coordinates each time.
- `value.includes(place)` = **substring match**. So `"velachery, chennai"` matches the key `velachery`. This is why the table is checked *before* the internet — it's instant and free.
- Return `null` if nothing matched.

```js
async function geocodeLocation(location) {
    const known = knownCoordinates(location);
    if (known) { return known; }
```
**Step 1 of the two-tier strategy:** check the offline table. If we already know the answer, return it immediately — no network call at all.

```js
    try {
        const query = `${location}, Tamil Nadu, India`;
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(8000)
        });
```
**Step 2 — ask the internet.**
- `query` uses a **template literal** (backticks) to build `"Velachery, Chennai, Tamil Nadu, India"`. Appending `, Tamil Nadu, India` keeps the search regional so we don't get a "Velachery" in another country.
- `Nominatim` is **OpenStreetMap's free search/geocoding service** — it converts place names into coordinates.
- `limit=1` → "just give me the best single answer" (polite, saves bandwidth).
- `countrycodes=in` → restrict results to India.
- `encodeURIComponent(query)` → escapes spaces and special characters into a safe URL format. Without this, a space would break the request.
- `await fetch(url, {...})` → actually performs the HTTP request. This is the slow part, hence `await`.
- `signal: AbortSignal.timeout(8000)` → **give up after 8 seconds.** Without this, a bad network would hang the form forever. Great thing to mention in a viva.

```js
        if (!response.ok) { return null; }
        const result = (await response.json())[0];
        if (!result) { return null; }
```
- `.ok` → was the HTTP status successful (200)? If not, return `null`.
- `await response.json()` → parse the JSON body. Nominatim returns an **array** of matches, so `[0]` takes the first.
- If the array was empty, `[0]` is `undefined` → return `null`.

```js
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);
        return Number.isFinite(latitude) && Number.isFinite(latitude)
            ? [latitude, longitude]
            : null;
    } catch (error) {
        console.warn("Typed location could not be converted to coordinates:", error);
        return null;
    }
}
```
- Nominatim sends coordinates as **text** (`"12.9815"`), so `Number(...)` converts them to real numbers.
- `Number.isFinite(x)` = "is this an actual usable number, not NaN?" This **validates** the data before trusting it.
- The ternary `condition ? valueIfTrue : valueIfFalse` → return coordinates if both are valid, otherwise `null`.
- The `catch` guarantees **this function never throws** — it always returns coordinates or `null`. That's a deliberate design choice: a failed geocode should not stop a citizen from reporting an emergency.

```js
function getBrowserCoordinates() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Location access is not supported by this browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            position => resolve([position.coords.latitude, position.coords.longitude]),
            () => reject(new Error("Location permission was denied or unavailable.")),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
        );
    });
}
export { geocodeLocation, getBrowserCoordinates };
```
**Why this is written this way:** the browser's built-in `getCurrentPosition` does **not** return a value — it takes two callbacks (one for success, one for failure) and calls one of them later. That's awkward to use with `await`. So this wraps it in a **Promise** so the rest of the code can write `await getBrowserCoordinates()`.
- `resolve(...)` = "the Promise succeeded, here's the value."
- `reject(...)` = "the Promise failed, here's the error."
- `{ enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }` = use GPS for best accuracy; give up after 12 seconds; it's fine to reuse a location found within the last 60 seconds (saves battery).

**WHAT TO SAY IN THE VIVA:** *"This module converts a location into coordinates using a two-tier approach. First I check a built-in table of 25 Tamil Nadu places — instant, free, and it avoids hammering a public API. If there's no match, I call the OpenStreetMap Nominatim geocoding API with an 8-second timeout, restricted to India. Every failure path returns `null` rather than throwing, so a citizen can still submit an emergency report even if geocoding fails. There's also a separate GPS function that wraps the browser Geolocation API in a Promise so it works with `await`."*

---

## 1.4 `js/auth.js` — signup, login, logout-by-error, password reset (~827 lines)

This one file powers **both** `login.html` and `signup.html`. The HTML decides which form exists; the JS checks for it and only wires up what it finds.

### The small helpers

```js
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
```
Removes accidental spaces and lowercases, so `" Rithika@Gmail.com "` and `"rithika@gmail.com"` are the **same** account. Without this you'd get duplicate accounts.

```js
function showFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(`${inputId}Error`);
    if (error) error.textContent = message;
    if (input) input.classList.add("invalid");
}
```
**Line by line:** finds the input box, finds the matching `<small id="...Error">` message under it, writes the message, and adds the CSS class `invalid` (which turns the border red). `if (error)` guards against the element not existing.

```js
function clearErrors(form) {
    form.querySelectorAll(".error").forEach(el => el.textContent = "");
    form.querySelectorAll(".invalid, .valid").forEach(el => el.classList.remove("invalid", "valid"));
}
```
Wipes every red message and every red/green border in a form — done at the start of a fresh submit.

```js
function showMessage(element, message, success = false) {
    element.textContent = message;
    element.style.color = success ? "#86efac" : "#fca5a5";
}
```
`success = false` is a **default parameter** — if the caller doesn't say otherwise, treat it as an error. Green for success, red for failure.

```js
function getFirebaseError(error) {
    const code = error?.code;
    const messages = {
        "auth/email-already-in-use": "An account already exists with this email.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "permission-denied": "Firestore denied this operation. Check your rules."
    };
    return messages[code] || error?.message || "Something went wrong.";
}
```
**Why this exists:** Firebase throws errors with programmer codes like `auth/invalid-credential`. End users can't read that. This maps codes to human sentences. The `||` chain is a **fallback**: try the friendly message, then the raw message, then a generic one.

```js
function redirectUser(role) {
    const destinations = {
        citizen: "citizen.html",
        volunteer: "volunteer.html",
        ngo: "ngo.html",
        hospital: "hospital.html",
        admin: "admin.html"
    };
    window.location.href = destinations[role] || "login.html";
}
```
**The role-based router.** One function decides where every kind of user lands after logging in. `|| "login.html"` is the safe fallback for an unknown role.

### Validation

```js
const phonePattern = /^[6-9][0-9]{9}$/;
```
A **regular expression** (regex) — a pattern-matching rule. Read it as: *start with 6, 7, 8 or 9, then exactly nine more digits.* That's a valid Indian mobile number. (`^[` = start, `{9}` = exactly nine times.)

```js
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,64}$/;
```
Looks scary but reads left to right: `(?=.*[a-z])` = "somewhere ahead there must be a lowercase letter", `(?=.*[A-Z])` = an uppercase letter, `(?=.*\d)` = a digit, `(?=.*[@$!%*?&#])` = a special symbol, `.{8,64}` = total length 8 to 64. So: **upper + lower + number + symbol, 8+ characters.**

### The signup flow

```js
signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
```
- `addEventListener("submit", ...)` = run this when the form is submitted (the Submit button is pressed).
- `event.preventDefault()` = **stop the browser's default behaviour**, which is to reload the page and send the data to a server. In a JavaScript app you handle it yourself.

```js
    const result = validateSignup();
    if (!result.valid) {
        showMessage(signupMessage, "Correct the highlighted fields.");
        return;
    }
    signupButton.disabled = true;
    signupButton.textContent = "Creating Account...";
```
- `validateSignup()` checks all seven fields with the regexes and returns `{ valid: true/false, values: {...} }`.
- If invalid, show a message and stop.
- Disable the button and change its text — this stops **double submission** (the user clicking twice and creating two accounts).

```js
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth, result.values.email, result.values.password);
        const user = userCredential.user;
```
The actual **Firebase Authentication** call. It creates the account in Google's auth system. The result contains a `user` object, and the most important property is `user.uid` — the permanent unique ID for this account.

```js
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: result.values.name,
            email: result.values.email,
            phone: result.values.phone,
            location: result.values.location,
            role: result.values.role,
            status: "active",
            available: result.values.role === "volunteer",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
```
**THIS IS THE MOST IMPORTANT WRITE IN THE PROJECT.** Line by line:
- `doc(db, "users", user.uid)` = the address `users/{uid}` — **the document ID is the Firebase Auth UID.** That's why this doubles as the primary key *and* the foreign key target everywhere else.
- `setDoc(...)` = create or overwrite that document.
- `role` = the field that drives the **entire** authorization system. `guard.js`, the dashboards and the security rules all read this one field.
- `status: "active"` = a **soft ban** mechanism. An admin can set this to something else to block a user without deleting them; login checks it.
- `available: role === "volunteer"` = a boolean that's `true` only for volunteers (used by the admin's assign dropdown).
- `serverTimestamp()` = **the timestamp is set by Google's server**, not the user's computer. ⭐ *If asked: this is essential because a user's device clock can be wrong or maliciously changed. Server time is trustworthy and consistent across all users.*

```js
        localStorage.setItem("drcsUserProfile", JSON.stringify({
            uid: user.uid, name: result.values.name, role: result.values.role, email: result.values.email
        }));
```
- `localStorage` = a small key:value store in the browser that **survives closing the tab**.
- `JSON.stringify(...)` = converts a JavaScript object into a text string (localStorage can only hold text).
- **Why:** so the dashboard can display "Welcome, Rithika" **instantly**, before the database read finishes. Without this the page briefly shows "Welcome, Citizen" and then flips — a flicker that looks broken. (This was the "Phase 1 name-loading fix".)

```js
        showMessage(signupMessage, "Account created successfully.", true);
        setTimeout(() => redirectUser(result.values.role), 700);
    } catch (error) {
        showMessage(signupMessage, getFirebaseError(error));
    } finally {
        signupButton.disabled = false;
        signupButton.textContent = "Create Account";
    }
});
```
- `setTimeout(..., 700)` = wait 700 milliseconds so the user actually **sees** the success message before being redirected. Without it the redirect is so fast the message never registers.
- `catch` = if anything failed, show the friendly mapped error.
- **`finally`** = runs **always**, success or failure. Here it re-enables the button. This is a best practice — buttons never get stuck disabled.

### The login flow

```js
await setPersistence(auth, rememberMe
    ? browserLocalPersistence
    : browserSessionPersistence);
```
**⭐ This is the "Remember me" checkbox, and it's a great viva answer.**
- `browserLocalPersistence` = the session is stored permanently; closing the browser doesn't log you out.
- `browserSessionPersistence` = the session dies when the browser closes.
- The `? :` is a **ternary**: `condition ? valueIfTrue : valueIfFalse`.

```js
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const user = userCredential.user;

const snapshot = await getDoc(doc(db, "users", user.uid));
if (!snapshot.exists()) {
    await signOut(auth);
    throw new Error("Your Firestore user profile was not found.");
}
const userData = snapshot.data();

if (userData.status !== "active") {
    await signOut(auth);
    throw new Error("Your account is not active.");
}
```
**Line by line — this is proper defence in depth:**
1. Sign in with Firebase Auth (proves the password).
2. Read the profile document.
3. If it **doesn't exist** → sign out and throw an error. An account without a profile is incomplete.
4. If `status` isn't `"active"` → sign out. This is how an admin bans someone.
5. Note the `signOut` before the `throw` — don't leave a half-authenticated session hanging around.

```js
function validateLogin() { ... }
```
Simpler than signup: email must be present and match the email pattern; password must be present. Returns the same `{ valid, values }` shape so the calling code is consistent.

**Password reset:** `#forgotPassword` validates the email field then calls `sendPasswordResetEmail(auth, email)` — Firebase emails the user a reset link. No password is ever seen or stored by your code; Firebase handles all of that.

**WHAT TO SAY IN THE VIVA:** *"`auth.js` powers both the login and signup pages using runtime checks — `if (signupForm)` and `if (loginForm)` — so the same file loads safely on either page. Signup does full client-side validation with regexes before any network call, then creates the account with Firebase Auth and writes a matching profile document in Firestore whose ID is the Auth UID — which is why that UID doubles as the primary key and the foreign key target throughout the system. Login uses `setPersistence` to implement Remember Me, reads the profile to check the role and an `active` status for soft-banning, and caches the profile in localStorage so dashboards show the user's name instantly without a flicker. All Firebase errors are mapped to human-readable messages, and a `finally` block guarantees the submit button is always re-enabled."*

---

---

## 1.5 `js/admin-auth.js` — the stricter admin login (~103 lines)

Admins get a **separate** login page (`admin-login.html`) and a **separate** script, because the
role check is stricter and happens *after* authentication.

```js
adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    const email = adminEmail.value.trim();
    const password = adminPassword.value;
```
Reads what the user typed. Note `.trim()` on the email (spaces break login) but **not** on the
password — a password might legitimately start or end with a space.

```js
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
```
Step 1: prove the credentials with Firebase Auth.

```js
        const snapshot = await getDoc(doc(db, "users", uid));
        if (!snapshot.exists()) {
            await signOut(auth);
            errorMessage.textContent = "User record not found.";
            return;
        }
        const userData = snapshot.data();
```
Step 2: read the profile. If there's no profile, sign out and stop.

```js
        localStorage.setItem("drcsUserProfile", JSON.stringify({
            uid,
            name: userData.name || "",
            role: userData.role || "admin",
            email: userData.email || email
        }));
```
Step 3: cache the profile so `admin.html` can paint the name instantly.
> **⚠ Honest viva note:** this cache write happens *before* the role check. A non-admin briefly gets
> a cache entry. It's harmless — `admin.js` re-verifies the role from Firestore — but if you want to
> look sharp, mention you'd move this below the role check.

```js
        if (userData.role !== "admin") {
            await signOut(auth);
            errorMessage.textContent = "Access denied. This account is not an administrator.";
            return;
        }
        window.location.href = "admin.html";
```
**Step 4 — the actual gate.** Authentication proved *who you are*; this proves *what you're allowed
to do*. If the role isn't `"admin"`, sign them out and refuse.
- **⭐ This is the perfect place to explain the difference between authentication and authorization:**
  - **Authentication** = *who are you?* (password check — `signInWithEmailAndPassword`)
  - **Authorization** = *what may you do?* (role check — `userData.role !== "admin"`)

The `catch` block maps `auth/invalid-email`, `auth/user-not-found`, `auth/wrong-password` and
`auth/invalid-credential` to friendly messages.

**WHAT TO SAY IN THE VIVA:** *"The admin portal is deliberately separate from the user login. It performs authentication first with Firebase Auth, then authorization by reading the profile and verifying the role is exactly `admin`, signing the user out otherwise. This is a clean demonstration of the difference between authentication and authorization."*

---

## 1.6 `js/dashboard-nav.js` — the sidebar highlighter (91 lines, **zero Firebase**)

Pure user-interface code. It highlights the sidebar link for whichever page section you're currently
looking at, like a table of contents that tracks your position. This is an excellent "I understand
performance" answer.

```js
(() => { ... })();
```
An **IIFE** — "Immediately Invoked Function Expression". Read it as: *wrap this code in a box and run
it right now*. The benefit is that every variable inside is **private** to this file and can't
collide with variables in other files. Very important when several scripts load on one page.

```js
const anchorLine = Math.min(180, window.innerHeight * 0.24);
```
The **scroll-spy anchor**: an imaginary horizontal line near the top of the screen. Whichever section
is closest to this line is "the current section". `Math.min(180, innerHeight * 0.24)` means "24% of
the screen height, but never more than 180 pixels" — so it behaves sensibly on both a small laptop
and a big monitor.

```js
function nearestSection() {
    let best = null, bestDistance = Infinity;
    sections.forEach(section => {
        const distance = Math.abs(section.getBoundingClientRect().top - anchorLine);
        if (distance < bestDistance) { bestDistance = distance; best = section; }
    });
    return best;
}
```
**Line by line:**
- `let best = null, bestDistance = Infinity` = start with nothing and an "impossibly large" distance.
- `section.getBoundingClientRect().top` = how far the top of this section is from the top of the
  screen, **right now**.
- `Math.abs(... - anchorLine)` = distance from our imaginary line.
- Keep whichever section has the **smallest** distance. This is a **linear search** — simple and fast
  for a handful of sections.

```js
let scrollFrame = null;
window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(updateFromScroll);
});
```
**⭐ This is your performance talking point.**
- The `scroll` event can fire **hundreds of times per second** while you scroll.
- Running the (comparatively heavy) `nearestSection()` every single time would waste CPU and make scrolling feel laggy.
- `requestAnimationFrame(callback)` asks the browser: *"run this just before the next screen repaint."*
- The `if (scrollFrame) return;` **guard** means: if a frame is already scheduled, do nothing. Net effect: **at most one calculation per screen frame**, no matter how fast you scroll. This technique is called **throttling**.

```js
link.addEventListener("click", (event) => {
    event.preventDefault();                       // don't jump instantly
    lockedLink = link;                            // remember which link we clicked
    link.classList.add("active");                 // highlight it immediately
    history.replaceState(null, "", hash);         // update the URL without jumping
    section.scrollIntoView({ behavior: "smooth", block: "start" });  // animate the scroll
    unlockTimer = setTimeout(releaseLock, 1100);  // hand control back after the animation
});
```
**Why the "lock"?** When you click a link, the smooth scroll animation itself triggers the `scroll`
event, which would immediately re-run the scroll-spy and fight with your click. So the code:
1. **Locks** the clicked link as active.
2. Animates the scroll (`behavior: "smooth"`).
3. **Unlocks** after 1100 ms — long enough for the animation to finish.
4. Also unlocks instantly if the user starts scrolling by hand (`wheel`/`touchstart`), so they stay in control.

`history.replaceState` updates the address bar to `#disasters` **without** the page jumping — the
best of both worlds.

**WHAT TO SAY IN THE VIVA:** *"This is a scroll-spy using an IIFE for variable privacy. It marks the sidebar link whose section is nearest an anchor line. The important detail is performance: scroll fires very rapidly, so I throttle with `requestAnimationFrame`, limiting recalculation to once per screen frame. Clicking a link temporarily locks the highlight for 1100 ms so the smooth-scroll animation doesn't fight the scroll listener, and manual scrolling releases the lock immediately."*

---

## 1.7 `firestore.rules` — the real security layer (~48 lines)

**This is the most impressive file to explain well**, because it shows you understand that
client-side checks aren't real security.

Rules are written in a language called **CEL** (Common Expression Language) and run on **Google's
servers** on every single read and write. Your JavaScript cannot override them.

```js
function signedIn() { return request.auth != null; }
```
A helper: "is someone logged in?" `request` describes the operation; `request.auth` is the logged-in
user, or `null` if nobody is.

```js
function userData() {
    return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}
```
This does a **server-side read** of the caller's own `users/{uid}` document, so rules can check the
caller's role. `$(database)` is rule-language syntax for inserting a variable into a path.

```js
function roleIs(role) { return signedIn() && userData().role == role; }
function isAdmin() {
    return signedIn() && (userData().role == "admin" || userData().role == "authority" || userData().role == "Authority");
}
function isNgo() { return roleIs("ngo"); }
```
`isAdmin()` deliberately accepts three spellings — `"admin"`, `"authority"` and `"Authority"` — so a
legacy or hand-typed role string doesn't lock an administrator out of their own system.

```js
match /users/{userId} {
    allow create, read, update: if request.auth.uid == userId || isAdmin();
}
```
**A citizen can touch only their own profile.** `request.auth.uid == userId` means "the document you
are reaching for belongs to you." Admins can touch anyone's. Notice there is **no `delete`** — user
accounts are never deleted through the client.

```js
match /disasters/{id} {
    allow create, read, update: if signedIn();
}
match /disasters/{id} {
    allow delete: if isAdmin();
}
```
Why **two separate blocks**? Because rules are **additive** — permissions from all matching blocks
are combined. The first block deliberately grants no delete, so it's placed in a second block that
grants delete to admins only. This is a neat way to keep each rule single-purpose.

> **⭐ The honest weakness to volunteer yourself:**
> "`disasters`, `requests` and `notifications` allow any **signed-in** user to create, read and
> update. So the 'only see your own reports' behaviour is enforced **client-side**, by
> `where("reportedBy","==",uid)` in `citizen.js` and `my-requests.js` — not by the rules. In
> production I'd tighten these to check `resource.data.reportedBy == request.auth.uid`. That's my
> top listed improvement." **Saying this yourself makes you look more competent than if they find it.**

### The best part — a state machine written in rules

```js
match /resourceRequests/{id} {
    allow create: if roleIs("hospital") && request.resource.data.hospitalId == request.auth.uid;
    allow read:   if signedIn() && (resource.data.hospitalId == request.auth.uid || isAdmin()
                   || (isNgo() && resource.data.status == "approved"));
    allow update: if isAdmin()
                   || (isNgo() && resource.data.status == "approved"
                       && request.resource.data.status == "fulfilled");
}
```
**Read this very carefully — it's a star answer.**
- `request.resource` = the document **as it will be after** the operation (the new version).
- `resource` = the document **as it currently is** (the existing version).
- **create:** you may only create a request claiming `hospitalId` is **your own** UID. You can't
  submit a request on behalf of another hospital.
- **read:** the owning hospital, an admin, **or an NGO — but an NGO only sees requests that are
  already `approved`.** So an NGO can never see unvetted demand.
- **update:** an admin, **or an NGO — but only if the request is currently `approved` AND the new
  status is exactly `fulfilled`.** So an NGO can't approve its own work, can't revert anything, and
  can't mark an unapproved request as fulfilled.

**This is a workflow enforced by the database, not just by the interface.** Even a hacker with
perfect knowledge of your database can't break the process.

```js
match /resourceAllocations/{id} {
    allow create: if isNgo() && request.resource.data.ngoId == request.auth.uid;
    allow read: if signedIn();
    allow update: if false;
    allow delete: if isAdmin();
}
```
**`allow update: if false`** — updates are **absolutely forbidden**. An allocation, once written,
is permanent. That makes it an **immutable audit trail**: you can always prove who gave what to
whom. An NGO can add records and an admin can delete one, but nobody can quietly edit history.

**WHAT TO SAY IN THE VIVA:** *"The rules run on Google's servers, so they can't be bypassed by editing client code — this is the real authorization layer, with `guard.js` merely as a usability convenience. I use helper functions to express intent, like `isAdmin()` and `isNgo()`. Two ideas I'm particularly happy with: first, the `resourceRequests` rules encode a workflow state machine — an NGO can only read approved requests and can only move them to `fulfilled`, so the database itself enforces the hospital → admin → NGO process. Second, `resourceAllocations` have `allow update: if false`, making them an immutable audit log. I also recognise that `disasters` and `requests` are scoped client-side rather than in the rules, and tightening that is my priority improvement."*

---

# PART 2 — CITIZEN FILES

---

## 2.1 `js/citizen.js` — the citizen dashboard feed (~251 lines)

This page shows "Welcome, [your name]" plus a live feed of everything **you** have submitted.

### The instant-name trick (fixes the flicker)

```js
try {
    const cachedProfile = JSON.parse(
        localStorage.getItem("drcsUserProfile") || "null"
    );
    showName(cachedProfile?.name || localStorage.getItem("drcsCitizenName") || "Citizen");
} catch (error) {
    showName(localStorage.getItem("drcsCitizenName") || "Citizen");
}
```
**Line by line — this runs immediately, before anything else:**
- `localStorage.getItem(...)` returns `null` if nothing is stored, so `|| "null"` gives `JSON.parse` valid text to work with.
- `JSON.parse` is the **opposite** of `JSON.stringify` — it turns a stored text string back into a JavaScript object.
- `cachedProfile?.name` uses **optional chaining**: "if `cachedProfile` exists, give me `name`; otherwise `undefined`."
- The `||` chain is a **three-level fallback**: cached profile name → the plain stored name → the word "Citizen".
- The `try/catch` means even malformed cached data can't break the page.

**Why this exists:** the database read takes time. Without this, the page would briefly show
**"Welcome, Citizen"** and then jump to **"Welcome, Rithika"** — a flicker that looks broken. Reading
the cache first paints the right name immediately. *(This is documented in your project as the
"Phase 1 name-loading fix".)*

### The two live listeners

```js
function listenToCitizenActivity(user) {
    const disasterQuery = query(
        collection(db, "disasters"),
        where("reportedBy", "==", user.uid)
    );

    const requestQuery = query(
        collection(db, "requests"),
        where("requestedBy", "==", user.uid)
    );
```
**Line by line:**
- `collection(db, "disasters")` = "the whole `disasters` collection."
- `where("reportedBy", "==", user.uid)` = **filter**: only documents whose `reportedBy` field equals
  this user's ID. This is how "see only your own reports" is achieved.
- `query(...)` = combine a collection with filters into a reusable query object.
- Two queries, because disasters and help requests are **two different collections** with two
  different field names (`reportedBy` vs `requestedBy`).

```js
    unsubscribeDisasters = onSnapshot(
        disasterQuery,
        snapshot => {
            disasterActivities = snapshot.docs.map(item => ({
                id: item.id,
                kind: "disaster",
                ...item.data()
            }));
            renderActivity();
        },
        error => { console.error(...); renderActivity(); }
    );
```
**⭐ THIS IS THE REAL-TIME MAGIC — explain it well.**
- `onSnapshot` attaches a **live listener**. It doesn't fetch once and leave — it **stays connected**.
  Whenever anyone anywhere changes this data, your callback runs again automatically with fresh data.
- **Analogy:** it's like a WhatsApp group. You don't keep re-opening the app to check; your phone
  buzzes the moment a new message arrives.
- `snapshot.docs` = an array of documents in the result.
- `.map(item => ({ id: item.id, kind: "disaster", ...item.data() }))` transforms each one:
  - `item.id` = the auto-generated document ID (from Firestore).
  - `kind: "disaster"` = a label I add so the renderer knows which **type** of card to build.
  - `...item.data()` = **spread operator** — dumps every field of the document into this new object.
- The **third argument** is an error callback. Note it still calls `renderActivity()` — so if one
  query fails, the page still shows the other one's data instead of dying.

```js
    unsubscribeDisasters = onSnapshot(...)
```
`onSnapshot` **returns a function**. Storing it in `unsubscribeDisasters` means we can later call
`unsubscribeDisasters()` to **detach** the listener. Your project does exactly this on logout and on
page unload — otherwise listeners leak and keep running in the background.

### Merging and sorting without an index

```js
function renderActivity() {
    const activities = [...disasterActivities, ...requestActivities]
        .sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));

    if (!activities.length) {
        activityContainer.innerHTML = "";
        activityContainer.classList.add("hidden");
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    activityContainer.classList.remove("hidden");
    activityContainer.innerHTML = activities.slice(0, 6).map(createActivityCard).join("");
}
```
**Line by line:**
- `[...disasterActivities, ...requestActivities]` = **spread** copies both arrays into one new array.
- `.sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt))` = sort **newest first**.
  Returning a **positive number** means `b` should come before `a`; **negative** means the opposite;
  **zero** means keep order. Because `b` is first in the subtraction, newer items rise to the top.
- `if (!activities.length)` = "if the array is empty" (`length` of 0 is falsy). Show the friendly
  empty state instead of a blank box.
- `.slice(0, 6)` = take only the **first six** — the dashboard shows the latest six activities.
- `.map(createActivityCard)` = build an HTML card for each.
- `.join("")` = glue all the card strings into one big HTML string.
- Assigning to `.innerHTML` injects it into the page.

> **⭐ WHY SORT IN JAVASCRIPT?** If you asked Firestore to sort *and* filter at the same time
> (`where(...)` + `orderBy(...)`), Firestore would require a **composite index**, which you must
> create manually in the console. Your project deliberately avoids composite indexes everywhere by
> doing sorting in JavaScript. That's a strong design answer. *(This is recorded in REVIEW_NOTES.md.)*

### XSS protection

```js
<p>${escapeHtml(description)}</p>
```
`escapeHtml()` converts dangerous characters into harmless entities (`<` → `&lt;`, `&` → `&amp;`).

> **⭐ Why does this matter?** If a user typed `<script>alert('hacked')</script>` into the description
> and you injected it with `innerHTML` unescaped, the browser would **execute** it. That's called
> **XSS (Cross-Site Scripting)**. Escaping means the text is *displayed* as text, never executed.
> Your project escapes **every** piece of user-generated content.

### The startup sequence

```js
onAuthStateChanged(auth, async (user) => {
    if (!user) return;                                  // guard.js handles the redirect
    const userSnapshot = await getDoc(doc(db, "users", user.uid));
    if (!userSnapshot.exists()) return;
    const userData = userSnapshot.data();
    const name = userData.name || user.displayName || "Citizen";
    showName(name);
    localStorage.setItem("drcsCitizenName", name);      // refresh the cache
    localStorage.setItem("drcsUserProfile", JSON.stringify({...}));
    listenToCitizenActivity(user);                      // start the live feed
});
```
Note `if (!user) return;` — it does **not** redirect. That's `guard.js`'s job. Each script has one
responsibility. After showing the authoritative name from the database, it **re-writes the cache**
(so the next visit is instant too), then starts the live feed.

**Logout** (the clean-shutdown pattern):
```js
logoutButton.addEventListener("click", async () => {
    unsubscribeDisasters?.();          // detach listener if it exists
    unsubscribeRequests?.();
    await signOut(auth);
    localStorage.removeItem("drcsUserProfile");
    localStorage.removeItem("drcsCitizenName");
    window.location.href = "login.html";
});
```
Order matters: **detach listeners first**, then sign out, then **clear the cache**. Clearing the
cache prevents the next user on the same computer seeing the previous user's name — a real-world bug.

**WHAT TO SAY IN THE VIVA:** *"`citizen.js` shows a live feed of the citizen's own submissions. It uses `onSnapshot` — a real-time listener — on two collections, filtered by `where("reportedBy","==",uid)`. I merge both results and sort them in JavaScript; that's deliberate, because combining `where` and `orderBy` in Firestore would require a composite index. It renders only the latest six. I also escape every user-supplied string with `escapeHtml` to prevent XSS, and I read the cached profile from localStorage first so the user's name appears instantly instead of flashing 'Citizen'. All listeners are unsubscribed on logout to avoid leaks."*

---

## 2.2 `js/report.js` — Report a Disaster (~240 lines)

**Where it sits:** `report.html` loads `js/guard.js` then `js/report.js`.
> **📌 Note:** `js/realreport.js` is a **byte-for-byte identical copy** of `report.js` and is
> referenced by **no file**. It's a leftover backup. If asked, say so plainly.

### The GPS button and the "typing invalidates GPS" rule

```js
reportLocationButton.addEventListener("click", async () => {
    reportLocationButton.disabled = true;
    try {
        selectedCoordinates = await getBrowserCoordinates();
        setLocationStatus("Exact coordinates captured. This report will appear on the map.", "success");
    } catch (error) {
        setLocationStatus(error.message, "error");
    } finally {
        reportLocationButton.disabled = false;
    }
});
```
- Calls the Promise-wrapped geolocation helper from `location-utils.js`.
- `finally` re-enables the button no matter what.

```js
reportLocation.addEventListener("input", () => {
    selectedCoordinates = null;
    setLocationStatus("Location changed. Use GPS again…", "info");
});
```
**A subtle but important detail.** If the user clicked the GPS button (getting coordinates for
*Velachery*) and then **overwrote the text** with *Madurai*, the old coordinates no longer match the
text. So any typing **clears** `selectedCoordinates`, forcing a fresh GPS capture or a fresh geocode.
Mentioning this shows you thought about correctness, not just features.

### The submit handler

```js
reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    reportMessage.textContent = "";

    if (!validateReport()) { showMessage("Correct the highlighted fields.", "error"); return; }
    if (!currentUser) { showMessage("Your session has expired. Please log in again.", "error"); return; }
```
Two guards before any network work: is the form valid, and is someone actually logged in?

```js
    const resolvedCoordinates = selectedCoordinates ||
        await geocodeLocation(reportLocation.value.trim());
```
**⭐ A clean one-liner worth memorising.** "Use the GPS fix if we have one, otherwise geocode what
they typed." The `||` operator short-circuits: if `selectedCoordinates` is truthy, `geocodeLocation`
is **never called**.

```js
    await addDoc(collection(db, "disasters"), {
        disasterType: disasterType.value,
        location: reportLocation.value.trim(),
        latitude:  resolvedCoordinates?.[0] ?? null,
        longitude: resolvedCoordinates?.[1] ?? null,
        coordinates: resolvedCoordinates
            ? { latitude: resolvedCoordinates[0], longitude: resolvedCoordinates[1] }
            : null,
        landmark: landmark.value.trim(),
        severity: severity.value,
        description: description.value.trim(),
        peopleAffected: Number(peopleAffected.value) || 0,
        immediateRescue: immediateRescue.checked,
        reportedBy: currentUser.uid,
        reporterName: currentUserData?.name || "Citizen",
        reporterEmail: currentUser.email || "",
        status: "pending",
        assignedTo: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
```
**The core write of this page. Explain each group:**
- **`addDoc` vs `setDoc`:** `addDoc` lets **Firestore generate** a random unique document ID. `setDoc`
  writes to an ID **you choose**. Here I want auto-generated IDs, so `addDoc`.
- **Type + text fields:** `disasterType`, `severity` (from dropdowns), `location`, `landmark`,
  `description`.
- **Coordinates stored three ways:** `latitude`/`longitude` as flat numbers, **and** a nested
  `coordinates` object, **and** `null` if geocoding failed. *Why redundant?* Because `map.js`'
  `coordinates()` helper tries **seven** different field shapes, so records remain mappable however
  they were written. It's defensive design for data arriving from different sources.
- `?.[0]` = "if `resolvedCoordinates` exists, give me element 0."
- `?? null` = **nullish coalescing** — "use `null` if the left side is `undefined` or `null`."
  (Subtle difference from `||`: `??` only falls back for null/undefined, not for 0.)
- `Number(peopleAffected.value) || 0` = convert the text input to a number; if that yields `NaN`,
  use 0. `NaN` is falsy, so this is a neat "invalid input → safe default".
- **`reportedBy: currentUser.uid`** = ⭐ **the foreign key.** This is the field every citizen query
  uses (`where("reportedBy","==",uid)`). Without it, nobody could filter to their own reports.
- `status: "pending"` = the record starts its life in the workflow's first state.
- `assignedTo: null` = explicitly empty, so the field exists and is queryable from the start.
- `serverTimestamp()` = ⭐ **timestamps set by Google's server**, not the user's device clock. Why not
  `new Date()`? Because a user's clock can be wrong or deliberately altered, and every user's clock
  would differ. Server time is consistent and trustworthy.

```js
    setTimeout(() => { window.location.href = "citizen.html"; }, 1200);
```
Waits 1.2 seconds so the success message is read, then returns to the dashboard — where the new
report appears **live**, which is a satisfying demo moment.

**WHAT TO SAY IN THE VIVA:** *"`report.js` submits a disaster report. The form has client-side validation, a GPS capture button, and a live character counter. A detail I'm proud of: if the user clicks GPS but then edits the location text, I clear the saved coordinates so stale coordinates can't be attached to a new location. For coordinates I use the GPS fix if available, otherwise I geocode the typed text. I store coordinates in three shapes so the map can always read them, and every report starts at `status: "pending"` with `reportedBy` set to the caller's UID — that's the foreign key every citizen query depends on. Timestamps use `serverTimestamp()` so time comes from Google's servers, not a possibly-wrong device clock."*

---

## 2.3 `js/request.js` — Request Help (~579 lines)

Structurally very similar to `report.js`, but **more defensive**. Good, because this form carries a
phone number and an urgency flag.

### Double protection

```js
async function loadUserProfile(user) {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    if (!snapshot.exists()) throw new Error("Your user profile was not found.");
    const profile = snapshot.data();
    if (profile.status !== "active") throw new Error("Your account is not active.");
    if (profile.role !== "citizen") throw new Error("Only citizen accounts can submit help requests.");
    return profile;
}
```
Note this page is protected **twice**: `guard.js` checks the page whitelist, *and* `request.js`
re-verifies the role itself. **Defense in depth** — and it explicitly rejects a volunteer or NGO
account even if they reached the page.

### Profile auto-fill (a nice UX touch)

```js
if (profile.phone && !contactInput.value) contactInput.value = profile.phone;
if (profile.location && !locationInput.value) locationInput.value = profile.location;
```
Reads the citizen's signup details into the empty boxes — **only if they're still empty**, so it
never overwrites something the user already typed. Small, but examiners notice thoughtful UX.

### Indian mobile validation

```js
const contactPattern = /^[6-9][0-9]{9}$/;
```
Same regex as signup — first digit 6–9, then exactly nine digits.

### The write

```js
await addDoc(collection(db, "requests"), {
    requestType, priority, peopleCount, contact, location,
    latitude, longitude, coordinates,
    landmark, description, immediate,
    requestedBy: currentUser.uid,        // ← foreign key
    requesterName, requesterEmail,
    status: "pending",
    assignedVolunteer: null,
    assignedBy: null,
    assignedAt: null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
});
```
Notice the fields that **anticipate the future workflow**: `assignedVolunteer`, `assignedBy`,
`assignedAt`, `completedAt` are all created as `null` right now, and will be filled in later by the
admin and the volunteer. Designing the schema around the whole lifecycle from the start is a good
practice to state.

**Focus-the-invalid-field trick:**
```js
const firstInvalid = requestForm.querySelector(".invalid");
if (firstInvalid) firstInvalid.focus();
```
After failed validation, jump the cursor to the first problem — much better than making the user hunt.

**WHAT TO SAY IN THE VIVA:** *"`request.js` handles help requests. It's deliberately more defensive than the report form because it collects a phone number and an urgency flag: it double-checks the role is exactly `citizen` even though `guard.js` already ran, auto-fills the citizen's saved phone and location without overwriting anything they've typed, and validates the Indian mobile number with a regex. The document it creates already contains all the workflow fields — `assignedVolunteer`, `assignedAt`, `completedAt` — as nulls, so the schema supports the full lifecycle from the start."*

---

## 2.4 `js/my-requests.js` — Track My Requests (~825 lines, the largest citizen file)

**Read-only page**: it never writes to the database. Its interesting parts are the **live query**,
**client-side filtering**, and **event delegation**.

### Live query sorted without an index

```js
function listenToRequests(user) {
    const q = query(collection(db, "requests"), where("requestedBy", "==", user.uid));

    unsubscribeRequests = onSnapshot(q, snapshot => {
        allRequests = snapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));
        updateSummary(allRequests);
        renderRequests();
    }, error => { ... });
}
```
Same pattern as `citizen.js`: one filter, then **sort in JavaScript** to dodge the composite-index
requirement.

Its error callback is unusually helpful:
```js
if (error.code === "failed-precondition") {
    showMessage("Firestore requires an index for this query…");
}
```
It **detects** Firestore's specific "you need an index" error and tells the user what to do — rather
than showing a generic failure. Nice robustness detail.

### Client-side filtering

```js
function getFilteredRequests() {
    const term = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;

    return allRequests.filter(request => {
        const haystack = [
            request.requestType, request.location, request.landmark,
            request.description, request.priority, request.status
        ].join(" ").toLowerCase();

        const matchesSearch = !term || haystack.includes(term);
        const matchesStatus = status === "all" || normalise(request.status) === status;
        return matchesSearch && matchesStatus;
    });
}
```
**Line by line:**
- `searchInput.value.trim().toLowerCase()` = the user's search text, normalised.
- `.filter(...)` = keep only the items where the callback returns `true`.
- `haystack` — join several fields into **one** lowercase string, so the user can search across type,
  location, description, priority and status in a single box.
- `!term || haystack.includes(term)` = "if the box is empty, everything matches; otherwise the text
  must appear somewhere."
- `status === "all"` = the "All statuses" option is a wildcard.
- **Key point:** this filtering runs entirely in the browser against data already loaded. It costs
  **zero** database reads, so search is instant.

### Event delegation

```js
requestsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".request-card-action");
    if (!button) return;
    openRequestModal(button.dataset.requestId);
});
```
**⭐ One of the best "I know real JavaScript" answers.**
- `event.target` = the exact element clicked — which could be an icon **inside** the button.
- `.closest(".request-card-action")` = walk **up** the DOM tree until you find the nearest ancestor
  (or the element itself) matching the selector. This elegantly handles clicks on inner icons.
- `if (!button) return` = the user clicked somewhere else in the container — ignore it.
- `button.dataset.requestId` reads the `data-request-id` attribute. In HTML, `data-foo="x"` is
  accessible in JS as `dataset.foo`.

**Why not put a listener on every button?** Because the cards are re-rendered constantly (every
live update). Old listeners would be destroyed with the old buttons, and you'd have to re-attach
them every render. **One listener on the permanent parent survives all re-renders.** That's event
delegation, and it's both faster and less error-prone.

### Summary counters

```js
function updateSummary(requests) {
    totalCount.textContent   = requests.length;
    pendingCount.textContent = requests.filter(r => r.status === "pending").length;
    activeCount.textContent  = requests.filter(r => ["assigned", "in-progress"].includes(r.status)).length;
    completedCount.textContent = requests.filter(r => r.status === "completed").length;
}
```
`.filter(...).length` = "count how many match". `["assigned","in-progress"].includes(...)` checks
against an array of two statuses — that's how "active" is defined (assigned but not yet done).

### Modal handling

```js
function closeRequestModal() {
    requestModal.classList.add("hidden");
    document.body.style.overflow = "";
}
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !requestModal.classList.contains("hidden")) closeRequestModal();
});
requestModal.addEventListener("click", (event) => {
    if (event.target === requestModal) closeRequestModal();   // clicked the dim backdrop
});
```
Three ways to close: the ✕ button, pressing **Escape**, and clicking the **backdrop**.
- `event.target === requestModal` means "the click landed on the overlay itself, not on the card
  inside it" — the standard backdrop-click test.
- `document.body.style.overflow = "hidden"` **locks page scrolling** while the modal is open; the
  empty string restores it.

**WHAT TO SAY IN THE VIVA:** *"`my-requests.js` is read-only: one live query filtered by the citizen's UID, sorted in JavaScript. Its two strongest points are the filtering and the click handling. Filtering happens entirely client-side on already-loaded data, so search is instant and costs no database reads — the search box matches across type, location, description, priority and status at once. For clicks I use **event delegation**: one listener on the container using `event.target.closest(...)`, which survives the constant re-rendering that per-button listeners would not. The modal closes via button, Escape, or backdrop click, and locks body scroll while open."*

---

# PART 3 — ADMIN FILES

---

## 3.1 `js/admin.js` — the command centre (~191 lines)

> **⚠ KNOWN BUG — read this before your demo.**
> `admin.js` currently contains an accidental **entire duplicate of the file pasted inside the
> `finally` block of `assignVolunteer()`**, including `import` statements. ES modules **cannot** have
> `import` inside a block, so the file throws `SyntaxError: Unexpected token '{'` and **never runs**.
> `js/realadmin.js` is the clean, identical, working version — but no HTML file references it.
> **Fix:** in `admin.html`, change `src="js/admin.js"` to `src="js/realadmin.js"`, or delete the
> duplicated block. *Mentioning this honestly in the viva shows integrity.*

### A tiny readability trick

```js
const $ = id => document.getElementById(id);
const adminName = $('adminName'), profileName = $('profileName'), pageMessage = $('pageMessage');
```
`$` is a one-letter **alias** for `getElementById`. The whole file uses `$('adminName')` instead of
`document.getElementById("adminName")`. It's shorter and much easier to scan. (Note `const a = x, b = y`
declares several constants in one line.)

### Five live listeners

```js
function listen() {
    onSnapshot(collection(db, "disasters"), snapshot => { ... });
    onSnapshot(collection(db, "requests"),  snapshot => { ... });
    onSnapshot(collection(db, "resourceRequests"), snapshot => { ... });
    onSnapshot(collection(db, "users"), snapshot => { ... });
    onSnapshot(collection(db, "resources"), snapshot => { ... });
}
```
Five `onSnapshot` listeners, each on a **whole collection** — no filters at all. ⭐ *Explain why:*
- Simple queries need **no index**, so nothing can fail with "index required".
- The dashboard needs **aggregate numbers** (total, pending, available volunteers) across the whole
  collection anyway, so filtering server-side wouldn't help.
- All the counting and sorting happens in JavaScript.

```js
onSnapshot(collection(db, "users"), snapshot => {
    const users = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    const citizens = users.filter(u => u.role === "citizen");
    const volunteers = users.filter(u => u.role === "volunteer");
    citizenCount.textContent = citizens.length;
    volunteerCount.textContent = volunteers.length;
    availableVolunteerText.textContent = `${volunteers.filter(available).length} available`;
    volunteerOptions();
});
```
**Line by line:** fetch all users → transform to plain objects → split into citizens and volunteers by
the `role` field → display the counts. `` `${...} available` `` is a template literal building
e.g. `"7 available"`. Then `volunteerOptions()` rebuilds the assign-a-volunteer dropdown.

```js
const available = v => v.availability === "available" || v.available === true;
```
Accepts **either** field spelling. (Your schema has both a boolean `available` and a string
`availability` — this is why the check is tolerant.)

### Approve / Reject — a status state machine

```js
function updateDisaster(id, status) {
    if (!confirm(`Mark this disaster report as ${status}?`)) return;
    updateDoc(doc(db, "disasters", id), {
        status,
        reviewedAt: serverTimestamp(),
        reviewedBy: currentAdmin.uid,
        reviewedByEmail: currentAdmin.email || "",
        updatedAt: serverTimestamp()
    });
}
```
- `confirm(...)` = a native browser popup ("OK / Cancel"). Cheap but effective protection against a
  mis-click on a destructive action.
- `updateDoc` = **modify an existing document**, keeping fields you don't mention. Contrast with
  `setDoc` (overwrite/create at a chosen ID) and `addDoc` (create with a generated ID).
- `reviewedBy: currentAdmin.uid` = **an audit trail.** You can always answer "who approved this?"

The UI **locks** decided records:
```js
const locked = ["approved", "rejected", "assigned", "accepted", "in-progress", "completed"]
    .includes(normalise(request.status));
```
If the status is already decided, the Approve/Reject buttons render as `disabled`. So a request can
only move forward — it's a **one-way state machine**, and the UI reflects that.

### ⭐ `assignVolunteer()` — the atomic two-document batch

This is the single best technical answer in your project. Learn it cold.

```js
async function assignVolunteer() {
    const request  = requestRecords.find(x => x.id === selectedRequestId);
    const volunteer = volunteerRecords.find(x => x.id === volunteerSelect.value);
```
`.find(x => x.id === ...)` searches an array for the **first** item whose `id` matches — i.e. locating
the record in the already-loaded local copy.

```js
    if (normalise(request.status) !== "approved" || hasAssignment(request))
        return showMessage("This request has already been assigned or is not ready for assignment.", "error");
    if (!volunteer) return showMessage("Select an available volunteer.", "error");
    if (!available(volunteer)) return showMessage("That volunteer is no longer available.", "error");
```
**Five validation guards before writing anything.** Only approved, unassigned requests may be
assigned; the volunteer must exist and be free. Guard clauses that `return` early keep the code flat
and readable.

```js
    const batch = writeBatch(db);

    batch.update(doc(db, "requests", request.id), {
        status: "assigned",
        assignedTo: volunteerAuthUid,
        assignedVolunteer: volunteerAuthUid,
        assignedVolunteerName: volunteer.name || "Volunteer",
        assignedVolunteerEmail: volunteer.email || "",
        assignedAt: serverTimestamp(),
        assignedBy: currentAdmin.uid,
        assignedByEmail: currentAdmin.email || "",
        updatedAt: serverTimestamp()
    });

    batch.update(doc(db, "users", volunteer.id), {
        availability: "busy",
        available: false,
        currentTaskId: request.id,
        currentTaskType: "help-request",
        updatedAt: serverTimestamp()
    });

    await batch.commit();
```
**Explain every part of this:**
- `writeBatch(db)` starts a **batch** — a group of operations that will be committed together.
- **Operation 1** updates the *request*: mark it `assigned`, record **which** volunteer (three fields
  for redundancy — ID plus denormalised name/email so the UI doesn't need a second read), when, and
  who assigned them.
- **Operation 2** updates the *volunteer's user document*: flip them to `busy`, and store
  `currentTaskId` so the system knows what they're doing.
- `await batch.commit()` sends **all of it at once**.

> **⭐ WHY IS THIS ESSENTIAL? Explain atomicity.**
> Firestore guarantees a batch is **atomic**: either **every** operation succeeds, or **none** of
> them do. Without it, suppose operation 1 succeeded but operation 2 failed (network dropped). The
> request would say "assigned to Rithika" while Rithika still showed "available" — so the admin
> could assign her a **second** simultaneous task. The system would be inconsistent, and there's no
> way to undo it. **Batches make half-completion impossible.**
> This is exactly the same reason banks don't debit one account and forget to credit the other.

**WHAT TO SAY IN THE VIVA:** *"`assignVolunteer()` is my clearest example of atomicity. Assigning a volunteer means changing two documents: the request becomes 'assigned', and the volunteer becomes 'busy'. I use a Firestore `writeBatch` so both changes commit together or not at all. Without it, a network failure between the two writes would mark a request assigned while leaving the volunteer free, allowing them to be double-booked. Before writing, I run five guard clauses — only approved and unassigned requests can be assigned, and the volunteer must exist and be available."*

---

## 3.2 `js/reports.js` — Analytics, charts and PDF export

Loads two extra CDN libraries: **Chart.js** (charts) and **jsPDF** (PDF generation).

### Graceful degradation — a strong talking point

```js
function draw(id, labels, values, colors, type = "doughnut") {
    const canvas = document.getElementById(id);
    if (!window.Chart) {
        canvas.style.display = "none";
        const fallback = document.createElement("div");
        fallback.className = "chart-fallback";
        fallback.innerHTML = labels.map((l, i) => `<div>${esc(l)}: <b>${values[i]}</b></div>`).join("");
        canvas.after(fallback);
        return;
    }
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(canvas, { type, data: { labels, datasets: [{ data: values, backgroundColor: colors }] } });
}
```
**Line by line — and note the design thinking:**
- `if (!window.Chart)` = "did the Chart.js library actually load?" `window.Chart` is `undefined` if
  the CDN was blocked, offline, or slow.
- If it's missing: **hide the canvas and print the same numbers as plain text.** The page degrades
  from "charts" to "a table" instead of throwing an error or showing a blank box.
- This is called **graceful degradation** — a core robustness principle.
- `if (charts[id]) charts[id].destroy()` — Chart.js keeps an internal object attached to the canvas.
  Creating a new one without destroying the old causes memory leaks and rendering artefacts.
  **Always destroy before re-creating.**

### Live statistics recomputed on every change

```js
function render() {
    const totalDisasters = data.disasters.length;
    const pendingDisasters = data.disasters.filter(d => norm(d.status) === "pending").length;
    const completed = data.requests.filter(r => norm(r.status) === "completed").length;
    const completionRate = data.requests.length
        ? Math.round((completed / data.requests.length) * 100) : 0;
    ...
}
```
- `Math.round((completed / total) * 100)` = percentage, rounded to a whole number.
- `data.requests.length ? ... : 0` = a **guard against division by zero**. Dividing by zero gives
  `NaN`, which would display as "NaN%" — ugly. This is a small but real detail.
- Called after **every** snapshot, so all figures are always current with zero page refresh.

### PDF export — pure client-side

```js
function exportPdf() {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("DRCS Reports & Analytics", 14, 18);
    pdf.setFontSize(11);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);
    pdf.text(`Total disasters: ${data.disasters.length}`, 14, 40);
    ...
    pdf.save(`DRCS_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}
```
- `new jsPDF()` creates an empty A4 document.
- `pdf.text(text, x, y)` writes a line at coordinates in millimetres from the top-left.
- `pdf.save(filename)` triggers a **download** in the browser.
- **Key point:** no server involved. The PDF is assembled in the browser. That's a neat answer for
  "where does the file get generated?"

---

## 3.3 `js/map.js` — the live Leaflet map (~307 lines)

### Reading coordinates from seven possible shapes

```js
function coordinates(record) {
    const candidates = [
        [record.latitude, record.longitude],
        [record.lat, record.lng],
        [record.location?.latitude, record.location?.longitude],
        [record.coordinates?.latitude, record.coordinates?.longitude],
        [record.geoPoint?.latitude, record.geoPoint?.longitude]
    ];
    for (const [lat, lng] of candidates) {
        if (Number.isFinite(lat) && Number.isFinite(lng) &&
            Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            return [lat, lng];
        }
    }
    return null;
}
```
**Line by line — this is defensive programming, and a great answer:**
- Different records arrive from different sources (citizen reports, the seeder, hospitals), so the
  coordinates may be stored under different field names.
- Rather than assume one format, it **tries several shapes in order** and takes the first that works.
- `Number.isFinite(lat)` rejects `NaN`/`undefined`/`null`.
- `Math.abs(lat) <= 90` and `Math.abs(lng) <= 180` **range-check** the values — because
  "latitude 900" is syntactically a number but geographically nonsense.
- Returns `null` if nothing valid is found, so unmappable records can be listed separately rather
  than silently dropped.

### Why markers don't pile up on top of each other

```js
function spreadOverlappingMarkers(items) {
    const groups = {};
    items.forEach(item => { const key = item.key; (groups[key] ||= []).push(item); });
    Object.values(groups).forEach(group => {
        group.forEach((item, index) => {
            if (index === 0) return;                     // first one stays in place
            const ring = Math.floor(index / 10);         // 10 per ring
            const angle = (index % 10) * 0.6283;
            const radius = 0.012 + ring * 0.009;
            item.latitude  += Math.cos(angle) * radius;
            item.longitude += Math.sin(angle) * radius / Math.cos(item.latitude);
        });
    });
}
```
**Line by line — a genuinely clever piece of code, explain it proudly:**
- `groups[key] ||= []` = **logical OR assignment**: if `groups[key]` is undefined, make it an empty
  array. Nice compact initialisation.
- If five reports all say "Chennai", they'd all get the same coordinates and their markers would sit
  exactly on top of each other — only the top one visible, which looks like there's only one report.
- **Solution:** place the first marker on the true point, then push the others onto **concentric
  rings** around it, up to 10 per ring, using trigonometry (`Math.cos`/`Math.sin`) to distribute
  them evenly in a circle.
- `radius / Math.cos(latitude)` — this corrects for the fact that **one degree of longitude is a
  shorter distance near the poles than at the equator**, so the circle looks like a circle on the map
  rather than a squashed ellipse. (This detail alone will impress an examiner.)
- Crucially, the **original** coordinates are kept separately for display in the side list.

### Caching and de-duplicating network calls

```js
const geocodeCache = new Map();
const geocodePending = new Map();

async function geocode(place) {
    if (geocodeCache.has(place)) return geocodeCache.get(place);
    if (geocodePending.has(place)) return geocodePending.get(place);
    const promise = fetch(...).then(r => r.json()).then(d => d?.[0] ? [d[0].lat, d[0].lon] : null);
    geocodePending.set(place, promise);
    const result = await promise;
    geocodeCache.set(place, result);
    geocodePending.delete(place);
    return result;
}
```
**Two layers of protection against hitting a public API too hard:**
1. **Cache:** once "Chennai" is resolved, remember it in a `Map` — never ask again.
2. **Pending de-duplication:** if three markers all need "Madurai" *at the same time*, only **one**
   request is made; the others wait on the **same Promise**. Without this, a single map rebuild could
   fire twenty identical requests.
   *Analogy:* one person calls the restaurant; the other four friends wait for their answer instead of
   all dialling.

### The rest
- `L.map("map").setView([20.5937, 78.9629], 5)` — India's centre, zoom 5.
- `L.divIcon(...)` — a marker made of **HTML** rather than a PNG, so the coloured dots with letters
  (`!`, `+`, `H`, `N`) are pure CSS and easily themed.
- `filteredRecords()` applies type, status and free-text filters.
- 120 ms **debounce** on rebuilding: rapid updates wait until things settle, instead of rebuilding
  the map fifty times.

**WHAT TO SAY IN THE VIVA:** *"`map.js` renders disasters, active help requests, hospitals and NGO distribution points on a Leaflet map over OpenStreetMap tiles. Three things I'm happy with. First, reading coordinates defensively — I try seven field shapes and range-check the result, because data arrives from several sources. Second, markers in the same city are spread onto concentric rings using trigonometry, with a longitude correction for latitude, so overlapping reports are all visible instead of stacked. Third, geocoding is protected by both a cache and in-flight de-duplication, so one map rebuild never fires duplicate requests to a public API. If Leaflet itself fails to load, the location list still works."*

---

## 3.4 `js/seed-data.js` — the demo data generator (~48 very dense lines)

Written in a compressed style — few lines, but each does a lot. Written **on purpose** for a demo
environment.

### Idempotency — the headline concept

```js
const id = (group, index) => `demo_${group}_${String(index + 1).padStart(3, "0")}`;
```
Generates **fixed, predictable** IDs like `demo_user_001`, `demo_request_040`.
```js
batch.set(doc(db, group, item.id), item.data, { merge: true });
```
- `doc(db, group, item.id)` = the document at that exact ID — not a random one.
- `{ merge: true }` = **merge** the new data into the existing document instead of replacing it.

**Together these make the seeder idempotent:** running it a second time **updates the same 143
documents** rather than creating 143 more. *Analogy:* filling in the same form twice doesn't make
two people — it just updates one record.
> **⭐ In an SQL comparison:** this is equivalent to `INSERT ... ON DUPLICATE KEY UPDATE`, or an
> "upsert".

### The removable-demo-data flag

```js
const base = () => ({ demoData: true, seedBatch: "drcs-demo-v1" });
```
Every one of the 143 records is stamped with a `demoData: true` marker. Removal then queries exactly
those:

```js
async function clear() {
    if (!confirm("Remove every DRCS record marked as demo data? Real records will remain untouched.")) return;
    for (const group of collections) {
        const snapshot = await getDocs(query(collection(db, group), where("demoData", "==", true)));
        const batch = writeBatch(db);
        snapshot.docs.forEach(item => batch.delete(item.ref));
        await batch.commit();
    }
}
```
- `where("demoData", "==", true)` — **the only `where` filter used anywhere in the admin side.**
- `snapshot.docs.forEach(item => batch.delete(item.ref))` — queue a delete for each, then commit.
- **Safety property:** genuine records submitted through the app have no `demoData` field, so they're
  never selected. You can wipe the demo and your real data survives.
- Chunked into batches of 400 because Firestore caps a batch at **500 operations**.

```js
function ago(hours) { return Timestamp.fromDate(new Date(Date.now() - hours * 3600000)); }
```
Creates a timestamp in the past — so records look like they were submitted over the last few days
rather than all at once. `3600000` is the number of milliseconds in an hour.

**Total: 143 records** — 20 users (8 citizens, 7 volunteers, 2 NGOs, 3 hospitals), 15 disasters,
40 requests, 25 resources, 18 notifications, 10 hospital resource requests, 6 distribution points,
6 allocations, 3 hospital-resource documents. All with realistic Indian names and Tamil Nadu cities.

**WHAT TO SAY IN THE VIVA:** *"The seeder creates 143 connected, fictional records so the system can be demonstrated without waiting for real data. Two design decisions matter. First, it uses deterministic document IDs plus `setDoc` with `merge: true`, which makes it **idempotent** — re-running it updates the same documents instead of duplicating them. Second, every record is stamped `demoData: true`, so the 'remove' function queries exactly those and can never delete genuine user submissions. No Firebase Authentication accounts are created, so the demo users can't be logged into — they exist only as dashboard profiles."*

---

# PART 4 — THE THREE ROLE DASHBOARDS

---

## 4.1 `js/volunteer.js` — accepting and completing tasks (~565 lines)

The volunteer sees **their** assigned task and moves it forward.

### Three live listeners, filtered in JavaScript

```js
onSnapshot(collection(db, "requests"), snapshot => {
    const all = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    myTasks = all.filter(isAssignedToCurrentVolunteer);
    renderTaskList();
});

onSnapshot(collection(db, "notifications"), snapshot => {
    const all = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    myNotifications = all.filter(isNotificationForVolunteer);
    renderNotifications();
});
```
Each listens to the **whole collection** and filters locally. Note the rule that allows this: any
signed-in user may read `requests` and `notifications`.

```js
const isAssignedToCurrentVolunteer = request =>
    [request.assignedTo, request.assignedVolunteer, request.assignedVolunteerId, request.volunteerId]
        .includes(currentUser.uid);
```
**A very practical, defensive check.** It accepts **four** different field spellings, so a request
assigned by any part of the system (or by the seeder) is still recognised. Rather than assume one
exact schema, it tolerates variations. Worth mentioning — it shows real-world thinking.

### The task state machine

```js
function getNextAction(task) {
    const status = normalise(task.status);
    if (status === "assigned")   return { label: "Accept task",   next: "accepted" };
    if (status === "accepted")   return { label: "Start response", next: "in-progress" };
    if (status === "in-progress")return { label: "Mark completed", next: "completed" };
    return null;
}
```
This is a **one-way state machine** — a system that can only move through a fixed sequence:

```
assigned → accepted → in-progress → completed
```

There is **no path back**. The function returns the label of the *only* valid next button, or `null`
if the task is finished. The UI can't offer an invalid action because the action is *derived* from
the status, not chosen freely. That's the cleanest way to prevent bad transitions.

### `advanceTask()` — another atomic batch

```js
async function advanceTask(taskId, nextStatus) {
    if (!confirm(`Mark this task as ${nextStatus}?`)) return;

    const batch = writeBatch(db);
    batch.update(doc(db, "requests", taskId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
    });

    if (nextStatus === "accepted")   batch.update(taskRef, { acceptedAt: serverTimestamp() });
    if (nextStatus === "in-progress")batch.update(taskRef, { startedAt:  serverTimestamp() });
    if (nextStatus === "completed")  batch.update(taskRef, { completedAt: serverTimestamp() });

    const remaining = myTasks.filter(t => t.id !== taskId && isActive(t));
    batch.update(doc(db, "users", currentUser.uid), {
        availability: remaining.length ? "busy" : "available",
        available: !remaining.length,
        currentTaskId: remaining.length ? taskId : null,
        updatedAt: serverTimestamp()
    });

    await batch.commit();
}
```
**Three things happen atomically:**
1. The **status** advances.
2. A **timestamp specific to that milestone** is recorded (`acceptedAt`, `startedAt` or
   `completedAt`). This gives a full audit trail of how long each stage took.
3. The volunteer's **availability is recalculated** — `busy` if they still have other active work,
   otherwise flipped back to `available` and their `currentTaskId` cleared.

> **⭐ Why does the availability recalculation matter?** A volunteer can be given a second task while
> still busy on the first. When they finish one, they shouldn't become "available" if another is
> still open. `remaining.length ? "busy" : "available"` handles that correctly — it looks at
> remaining active work rather than assuming this was their only task.

```js
availabilitySelect.disabled = hasActiveTask;
```
And symmetrically, the volunteer **cannot change their own availability while they have an active
task** — the select box is disabled. Both directions are guarded: the system can't accidentally
consider a busy volunteer free.

**WHAT TO SAY IN THE VIVA:** *"`volunteer.js` uses three real-time listeners and filters them locally — the assignment check deliberately accepts four different field spellings so it's robust to data written by different parts of the system. The task lifecycle is a one-way state machine — assigned, accepted, in-progress, completed — and the next action is derived from the current status rather than offered freely, so an invalid transition is simply impossible. `advanceTask()` commits three changes in one batch: the new status, a milestone timestamp, and a recalculated availability, which correctly stays 'busy' if the volunteer still has other active work."*

---

## 4.2 `js/ngo.js` — the resource allocation logic (~48 dense lines)

Written in a compressed single-statement style, but the logic inside is the most interesting in the
project.

### Reads — filtered differently per collection

```js
onSnapshot(query(collection(db, "resourceRequests"), where("status", "==", "approved")), snapshot => {
    requests = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    render();
});
```
**Note this is the one place in the admin/role side that uses a server-side filter.** And it mirrors
the security rule exactly — the rules say an NGO may only *read* approved resource requests, so the
query asks for precisely that. The code and the rules agree.

```js
onSnapshot(collection(db, "resources"), snapshot => {
    resources = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
        .filter(item => item.ngoId === user.uid);
});
```
Here the filter is **client-side**, because the rules allow an NGO to read all `resources` — so the
code narrows to its own stock by `ngoId`.

### ⭐ The three-document allocation batch

```js
const batch = writeBatch(db);

// 1. Reduce stock
batch.update(doc(db, "resources", stock.id), {
    quantity: stock.quantity - quantity,
    updatedAt: serverTimestamp()
});

// 2. Mark the hospital's request fulfilled
batch.update(doc(db, "resourceRequests", request.id), {
    status: "fulfilled",
    fulfilledBy: user.uid,
    fulfilledByName: profile.name || "NGO",
    fulfilledQuantity: quantity,
    fulfilledAt: serverTimestamp(),
    updatedAt: serverTimestamp()
});

// 3. Write an immutable audit record
batch.set(doc(collection(db, "resourceAllocations")), {
    ngoId: user.uid,
    ngoName: profile.name || "",
    hospitalId: request.hospitalId,
    hospitalName: request.hospitalName || "",
    requestId: request.id,
    resourceId: stock.id,
    resourceType: request.resourceType,
    quantity,
    unit: stock.unit || "",
    note,
    createdAt: serverTimestamp()
});

await batch.commit();
```
**Walk through the three operations:**
1. **Stock goes down.** `stock.quantity - quantity` — computed on the server-side value we read.
2. **The hospital's request becomes `fulfilled`**, recording who did it, how much, and when. Note the
   rules permit *only* this exact transition (`approved` → `fulfilled`) for an NGO.
3. **A brand-new allocation document** links all four parties together: the NGO, the hospital, the
   original request, and the resource. This is the **audit trail**.

**Why must all three be in one batch?** Consider the failure modes:
- If stock decreased but the request wasn't fulfilled, the hospital would keep waiting and the
  material would have vanished from the inventory.
- If the request was marked fulfilled but stock wasn't decremented, the NGO would **over-promise**
  material it no longer has — and a later allocation could send stock **below zero**.
- With a batch, **none of this can happen** — the database guarantees all three land together.

### Input validation before the batch

```js
if (quantity < 1 || quantity > stock.quantity) return show("Enter a quantity within available stock.");
```
Two-sided check: at least one unit, and **no more than what's in stock**. This is the client-side
guard; the atomic batch is the systemic guarantee. Mentioning both layers shows you understand that
validation and integrity are different concerns.

**WHAT TO SAY IN THE VIVA:** *"`ngo.js` manages relief logistics. The key operation is fulfilling a hospital's resource request, which must change three documents: decrease the NGO's stock, mark the request as fulfilled, and write a new allocation record linking NGO, hospital, request and resource. I commit all three as one Firestore batch, because otherwise a failure between writes could either lose material from inventory or let the NGO over-promise stock it no longer has — potentially driving quantity negative. The allocation record is write-once and immutable in the security rules, so it serves as a permanent audit trail."*

---

## 4.3 `js/hospital.js` — capacity and medical requests (~184 lines)

The simplest of the three, and that's a deliberate design choice.

### One listener, one document

```js
onSnapshot(doc(db, "hospitalResources", currentUser.uid), snapshot => {
    renderResources(snapshot.data());
});
```
**⭐ Note the document ID is the hospital's own UID.** That's not a coincidence — it's chosen so it
matches the security rule exactly:

```js
match /hospitalResources/{hospitalId} {
    allow create, update: if request.auth.uid == hospitalId || isAdmin();
}
```
By keying the document by the UID, ownership checking becomes trivially simple and there's no need
to scan a collection. **Designing your data model to match your authorization rules** is a genuinely
good point to make.

```js
function validCapacity() {
    if (Number(availableBeds.value) > Number(totalBeds.value)) return false;
    if (Number(availableIcu.value) > Number(totalIcu.value)) return false;
    return true;
}
```
A real business rule: you can't have more *available* beds than *total* beds. Cheap to check,
obviously correct — examiners like seeing domain logic, not just CRUD.

### Keeping two documents consistent

```js
capacityForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validCapacity()) { showMessage("Available cannot exceed total.", "error"); return; }
    await setDoc(doc(db, "hospitalResources", currentUser.uid), { ...fields, updatedAt: serverTimestamp() }, { merge: true });
});

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await updateDoc(doc(db, "users", currentUser.uid), { hospitalName, phone, city, ... });
    await setDoc(doc(db, "hospitalResources", currentUser.uid), { hospitalName, city, updatedAt: serverTimestamp() }, { merge: true });
});
```
- `setDoc(..., { merge: true })` = **merge** the given fields into the existing document, leaving
  everything else untouched. This is why editing just the hospital name doesn't wipe the bed counts.
  Contrast with a plain `setDoc`, which would **replace** the whole document.
- The profile submit updates **two** documents — the user profile and the capacity document — because
  both display the hospital's name. Denormalised for display, so both must be kept in sync.
  *(An honest viva note: these two writes aren't batched, so a failure between them could
  desynchronise them briefly — that's exactly why I'd use a batch in production.)*

### The resource request

```js
await addDoc(collection(db, "resourceRequests"), {
    hospitalId: currentUser.uid,
    hospitalName: profile.hospitalName || "",
    hospitalEmail: user.email || "",
    resourceType, quantity, priority, details, location, city,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
});
```
This is the document that kicks off the **entire resource pipeline**: hospital creates it as
`pending` → admin approves it → NGO fulfils it. Note `hospitalId: currentUser.uid` — again matching
the rule `roleIs("hospital") && request.resource.data.hospitalId == request.auth.uid`, which stops a
hospital submitting a request on behalf of another one.

---

# PART 5 — CSS (the styling)

Your project has **21 CSS files**, but there is **no single shared stylesheet**. Each page pulls in
what it needs.

### The layering pattern

The clearest example is the citizen forms:

```html
<!-- report.html -->
<link rel="stylesheet" href="css/dashboard.css">
<link rel="stylesheet" href="css/report.css">
```

```css
/* report.css — the very first line */
@import "./form.css";
```
**Three layers, applied in order:**
1. **`dashboard.css`** (580 lines) — the shared citizen **shell**: the sidebar grid, header, cards,
   badges, empty states. Any page using it looks like part of the same app.
2. **`form.css`** (772 lines) — imported by `report.css`, provides the shared **form foundation**:
   field groups, buttons, information cards, indigo/violet theme.
3. **`report.css`** (95 lines) — **page-specific overrides**: the rose/mauve palette, the two-column
   layout, the GPS button styling.

This is a **cascade** — the most specific file wins because it loads last. It's the same principle as
CSS specificity, applied across files. `request.css` uses the identical three-layer structure with a
purple palette instead.

### The theme

Every page defines its own `:root` CSS variables, but they all belong to one **blue → indigo →
violet/purple family with teal accents**:

```css
:root {
    --primary: #6257e8;      /* volunteer — indigo */
    --sidebar: #21163f;      /* dark violet sidebar */
}
```
A **CSS custom property** (variable) declared with `--` and used with `var(--primary)`. Declaring
them at `:root` (the top-level element) makes them available everywhere in that file, and easy to
re-theme.

Role accents: citizen = lavender/mauve, volunteer = violet, hospital = blue/navy, NGO = teal,
admin = deep plum.

### Shared components — by convention, not by a shared file

The same structures appear across pages, repeated in each HTML file:

| Component | Classes used |
|---|---|
| **Sidebar** | `.sidebar`, `.brand` (🛡 DRCS + role subtitle), `.nav-link` / `nav a.active`, `.logout-button` |
| **Stat cards** | `.stats-grid` containing `.stat-card` with `.stat-icon` |
| **Panels** | `.panel` + `.panel-heading` |
| **Status badges** | `.status-pending`, `.status-approved`, `.status-assigned`, `.status-in-progress`, `.status-completed`, `.status-rejected` |
| **Priority badges** | `.priority-low`, `.priority-medium`, `.priority-high`, `.priority-critical` |
| **Feedback** | `#pageMessage` with `.success` / `.error`, auto-cleared after 3.5 s |
| **States** | `.empty-state` / `.empty`, `.loading-state` + `.spinner`, `.hidden` |
| **Modal** | `.modal-overlay` + `.modal-card` (volunteer/admin); native `<dialog>` (NGO) |

The consistent naming of `status-*` and `priority-*` across volunteer, admin, NGO and reports CSS is
why a badge looks identical on every dashboard — **convention as a substitute for a shared library.**

### The five orphaned files

These exist in `css/` but are referenced by **no** HTML file:

`core-ui.css`, `final-ui.css`, `polished-ui.css`, `drcs-theme.css`, `drcs-v3.css`

They were abandoned experiments at a single global "loaded last" design layer. Their header comments
still claim they should be loaded on every page, but no page loads them.

> **If asked about them:** *"Those are leftover from an earlier attempt at a unified design system. I
> moved to per-page theming because each role needed a distinct identity, and the global layer would
> have recoloured everything to a single palette. They're kept as reference but aren't in the build."*
> Saying this deliberately, rather than being surprised by it, makes you look organised.

**WHAT TO SAY IN THE VIVA:** *"I used a layered CSS approach. Each page loads a shared base stylesheet — `dashboard.css` for the citizen shell — then a page-specific file, which `@import`s a shared form foundation. Because of the cascade, the most specific file wins, so a page can change the palette and layout without touching the shared components. Every page declares CSS custom properties at `:root`, which is why re-theming is a one-line change. The status and priority badge class names are identical across all dashboards, so a pending request looks the same whether it's on the admin, volunteer or NGO page."*

---

# APPENDIX — QUICK REVISION (the night before)

**The five sentences worth memorising word-for-word:**

1. *"Assignment is a **two-document atomic batch** — the request becomes 'assigned' and the volunteer becomes 'busy' — so a volunteer can never be double-booked."*
2. *"The security lives in **Firestore rules**, not the interface. `guard.js` is just UX; the rules run on Google's servers and encode the workflow itself — an NGO can only read approved requests and only mark them fulfilled."*
3. *"I **sort in JavaScript** instead of using Firestore's `orderBy`, because combining a filter and a sort would require a composite index I'd have to create manually."*
4. *"Timestamps use **`serverTimestamp()`**, not the device clock, so time is consistent and can't be manipulated."*
5. *"The demo seeder is **idempotent** — deterministic document IDs plus `merge: true` mean re-running it updates the same records rather than duplicating them."*

**Three bugs to admit before they find them:**
- `js/admin.js` has an accidental whole-file duplicate pasted inside `assignVolunteer()`'s `finally` block, creating an illegal nested `import`. The clean copy is `js/realadmin.js`.
- `js/realreport.js` is an unused byte-identical copy of `report.js`.
- `firestore.rules` allow any signed-in user to read any disaster/request — ownership is enforced client-side only, which is my top improvement.

**Good luck tomorrow.** You built this — you know more about it than anyone in the room.

