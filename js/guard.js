import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

//checks whether the user is logged in and has the correct role to access the page. 
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        const userReference = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userReference);

        if (!userSnapshot.exists()) {
            window.location.href = "login.html";
            return;
        }

        const userData = userSnapshot.data();
        const currentPage = window.location.pathname
            .split("/")
            .pop();

        const allowedPages = {
            citizen: [
                "citizen.html",
                "report.html",
                "request.html",
                "my-requests.html"
            ],
            volunteer: ["volunteer.html"],
            ngo: ["ngo.html"],
            hospital: ["hospital.html"],
            admin: ["admin.html"]
        };

        const rolePages = allowedPages[userData.role] || [];

        if (!rolePages.includes(currentPage)) {
            window.location.href = `${userData.role}.html`;
        }
    } catch (error) {
        console.error("Dashboard protection error:", error);
        window.location.href = "login.html";
    }
});