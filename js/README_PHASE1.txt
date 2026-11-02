DRCS Phase 1 - User Name Loading Fix

These are replacements for the existing files only. No new application scripts were created.

Modified existing files:
- auth.js
- admin-auth.js
- citizen.js
- volunteer.js
- ngo.js
- hospital.js
- admin.js

Change made:
- Cache the authenticated user profile in localStorage after login/signup.
- Dashboards display the cached name immediately, then continue using the existing Firestore profile loading as before.
- Clear the cache on logout to prevent an old user's name from appearing for the next user.

No Firebase collections, Firestore rules, HTML, CSS, Firebase configuration, or existing dashboard features were changed.
