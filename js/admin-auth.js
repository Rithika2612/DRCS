import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const form = document.getElementById("adminLoginForm");
const errorMessage = document.getElementById("errorMessage");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    errorMessage.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const uid = userCredential.user.uid;

        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {

            await signOut(auth);

            errorMessage.textContent =
                "User record not found.";

            return;

        }

        const userData = userSnap.data();

        localStorage.setItem(
            "drcsUserProfile",
            JSON.stringify({
                uid: uid,
                name: userData.name || "",
                role: userData.role || "admin",
                email: userData.email || userCredential.user.email || ""
            })
        );

        if (userData.role !== "admin") {

            await signOut(auth);

            errorMessage.textContent =
                "Access denied. This account is not an administrator.";

            return;

        }

        window.location.href = "admin.html";

    }

    catch (error) {

        switch (error.code) {

            case "auth/invalid-email":
                errorMessage.textContent = "Invalid email address.";
                break;

            case "auth/user-not-found":
                errorMessage.textContent = "Administrator account not found.";
                break;

            case "auth/wrong-password":
                errorMessage.textContent = "Incorrect password.";
                break;

            case "auth/invalid-credential":
                errorMessage.textContent = "Invalid email or password.";
                break;

            default:
                errorMessage.textContent = error.message;

        }

    }

});