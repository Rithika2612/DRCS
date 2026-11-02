import {
    auth,
    db
} from "./firebase.js";

import {
    browserLocalPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const signupForm =
    document.getElementById("signupForm");

const loginForm =
    document.getElementById("loginForm");

const namePattern =
    /^[A-Za-z][A-Za-z .'-]{1,49}$/;

const phonePattern =
    /^[6-9][0-9]{9}$/;

const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,64}$/;

function showFieldError(inputId, message) {

    const input =
        document.getElementById(inputId);

    const error =
        document.getElementById(
            `${inputId}Error`
        );

    if (error) {
        error.textContent = message;
    }

    if (input) {
        input.classList.toggle(
            "invalid",
            Boolean(message)
        );

        input.classList.toggle(
            "valid",
            !message &&
            input.value.trim() !== ""
        );
    }
}

function clearErrors(form) {

    form
        .querySelectorAll(".error")
        .forEach(error => {
            error.textContent = "";
        });

    form
        .querySelectorAll("input, select")
        .forEach(input => {
            input.classList.remove(
                "invalid",
                "valid"
            );
        });
}

function showMessage(
    element,
    message,
    success = false
) {

    element.textContent = message;

    element.style.color =
        success
            ? "#86efac"
            : "#fca5a5";
}

function normalizeEmail(email) {

    return email
        .trim()
        .toLowerCase();
}

function getFirebaseError(error) {

    const messages = {

        "auth/email-already-in-use":
            "An account already exists with this email.",

        "auth/invalid-email":
            "Enter a valid email address.",

        "auth/weak-password":
            "The password is too weak.",

        "auth/invalid-credential":
            "Incorrect email or password.",

        "auth/user-disabled":
            "This account has been disabled.",

        "auth/network-request-failed":
            "Check your internet connection.",

        "auth/too-many-requests":
            "Too many attempts. Try again later.",

        "auth/operation-not-allowed":
            "Email and password authentication is not enabled.",

        "permission-denied":
            "Firestore denied this operation. Check your rules.",

        "firestore/permission-denied":
            "Firestore denied this operation. Check your rules.",

        "unavailable":
            "Firebase is temporarily unavailable."
    };

    return messages[error.code] ||
        error.message ||
        "Something went wrong.";
}

function redirectUser(role) {

    const pages = {

        citizen:
            "citizen.html",

        volunteer:
            "volunteer.html",

        ngo:
            "ngo.html",

        hospital:
            "hospital.html",

        admin:
            "admin.html"
    };

    window.location.href =
        pages[role] || "login.html";
}

function validateSignup() {

    clearErrors(signupForm);

    const name =
        document
            .getElementById("fullName")
            .value
            .trim();

    const email =
        normalizeEmail(
            document
                .getElementById("signupEmail")
                .value
        );

    const phone =
        document
            .getElementById("phone")
            .value
            .trim();

    const location =
        document
            .getElementById("location")
            .value
            .trim();

    const role =
        document
            .getElementById("role")
            .value;

    const password =
        document
            .getElementById("signupPassword")
            .value;

    const confirmPassword =
        document
            .getElementById("confirmPassword")
            .value;

    let valid = true;

    if (!name) {

        showFieldError(
            "fullName",
            "Full name is required."
        );

        valid = false;

    } else if (!namePattern.test(name)) {

        showFieldError(
            "fullName",
            "Enter a valid full name."
        );

        valid = false;
    }

    if (!email) {

        showFieldError(
            "signupEmail",
            "Email address is required."
        );

        valid = false;

    } else if (!emailPattern.test(email)) {

        showFieldError(
            "signupEmail",
            "Enter a valid email address."
        );

        valid = false;
    }

    if (!phone) {

        showFieldError(
            "phone",
            "Phone number is required."
        );

        valid = false;

    } else if (!phonePattern.test(phone)) {

        showFieldError(
            "phone",
            "Enter a valid 10-digit Indian mobile number."
        );

        valid = false;
    }

    if (location.length < 2) {

        showFieldError(
            "location",
            "Enter your city or district."
        );

        valid = false;
    }

    if (!role) {

        showFieldError(
            "role",
            "Select your role."
        );

        valid = false;
    }

    if (!password) {

        showFieldError(
            "signupPassword",
            "Password is required."
        );

        valid = false;

    } else if (!passwordPattern.test(password)) {

        showFieldError(
            "signupPassword",
            "Use uppercase, lowercase, number and special character."
        );

        valid = false;
    }

    if (!confirmPassword) {

        showFieldError(
            "confirmPassword",
            "Confirm your password."
        );

        valid = false;

    } else if (password !== confirmPassword) {

        showFieldError(
            "confirmPassword",
            "Passwords do not match."
        );

        valid = false;
    }

    return {
        valid,
        values: {
            name,
            email,
            phone,
            location,
            role,
            password
        }
    };
}

function validateLogin() {

    clearErrors(loginForm);

    const email =
        normalizeEmail(
            document
                .getElementById("loginEmail")
                .value
        );

    const password =
        document
            .getElementById("loginPassword")
            .value;

    let valid = true;

    if (!email) {

        showFieldError(
            "loginEmail",
            "Email address is required."
        );

        valid = false;

    } else if (!emailPattern.test(email)) {

        showFieldError(
            "loginEmail",
            "Enter a valid email address."
        );

        valid = false;
    }

    if (!password) {

        showFieldError(
            "loginPassword",
            "Password is required."
        );

        valid = false;
    }

    return {
        valid,
        values: {
            email,
            password
        }
    };
}

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const message =
                document.getElementById(
                    "signupMessage"
                );

            const button =
                document.getElementById(
                    "signupButton"
                );

            showMessage(message, "");

            const result =
                validateSignup();

            if (!result.valid) {

                showMessage(
                    message,
                    "Correct the highlighted fields."
                );

                return;
            }

            try {

                button.disabled = true;

                button.textContent =
                    "Creating Account...";

                const credential =
                    await createUserWithEmailAndPassword(
                        auth,
                        result.values.email,
                        result.values.password
                    );

                const user =
                    credential.user;

                await setDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    ),
                    {
                        uid:
                            user.uid,

                        name:
                            result.values.name,

                        email:
                            result.values.email,

                        phone:
                            result.values.phone,

                        location:
                            result.values.location,

                        role:
                            result.values.role,

                        status:
                            "active",

                        available:
                            result.values.role ===
                            "volunteer",

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()
                    }
                );

                localStorage.setItem(
                    "drcsUserProfile",
                    JSON.stringify({
                        uid: user.uid,
                        name: result.values.name,
                        role: result.values.role,
                        email: result.values.email
                    })
                );

                if (result.values.role === "citizen") {
                    localStorage.setItem(
                        "drcsCitizenName",
                        result.values.name
                    );
                }

                showMessage(
                    message,
                    "Account created successfully.",
                    true
                );

                setTimeout(() => {

                    redirectUser(
                        result.values.role
                    );

                }, 700);

            } catch (error) {

                console.error(
                    "Signup error:",
                    error
                );

                showMessage(
                    message,
                    getFirebaseError(error)
                );

            } finally {

                button.disabled = false;

                button.textContent =
                    "Create Account";
            }
        }
    );
}

if (loginForm) {

    const rememberMeInput =
        document.getElementById(
            "rememberMe"
        );

    const loginEmailInput =
        document.getElementById(
            "loginEmail"
        );

    const rememberedEmail =
        localStorage.getItem(
            "drcsRememberedEmail"
        );

    if (
        rememberMeInput &&
        loginEmailInput &&
        rememberedEmail
    ) {

        rememberMeInput.checked = true;
        loginEmailInput.value = rememberedEmail;
    }

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const message =
                document.getElementById(
                    "loginMessage"
                );

            const button =
                document.getElementById(
                    "loginButton"
                );

            const rememberMe =
                rememberMeInput?.checked ||
                false;

            showMessage(message, "");

            const result =
                validateLogin();

            if (!result.valid) {

                showMessage(
                    message,
                    "Correct the highlighted fields."
                );

                return;
            }

            button.disabled = true;

            button.textContent =
                "Logging In...";

            try {

                await setPersistence(
                    auth,
                    rememberMe
                        ? browserLocalPersistence
                        : browserSessionPersistence
                );

                const credential =
                    await signInWithEmailAndPassword(
                        auth,
                        result.values.email,
                        result.values.password
                    );

                const userReference =
                    doc(
                        db,
                        "users",
                        credential.user.uid
                    );

                const userSnapshot =
                    await getDoc(
                        userReference
                    );

                if (!userSnapshot.exists()) {

                    await signOut(auth);

                    throw new Error(
                        "Your Firestore user profile was not found."
                    );
                }

                const userData =
                    userSnapshot.data();

                localStorage.setItem(
                    "drcsUserProfile",
                    JSON.stringify({
                        uid: credential.user.uid,
                        name: userData.name || "",
                        role: userData.role || "",
                        email: userData.email || credential.user.email || ""
                    })
                );

                if (userData.name) {
                    localStorage.setItem(
                        "drcsCitizenName",
                        userData.name
                    );
                }

                if (
                    userData.status !==
                    "active"
                ) {

                    await signOut(auth);

                    throw new Error(
                        "Your account is not active."
                    );
                }

                if (rememberMe) {

                    localStorage.setItem(
                        "drcsRememberedEmail",
                        result.values.email
                    );

                } else {

                    localStorage.removeItem(
                        "drcsRememberedEmail"
                    );
                }

                showMessage(
                    message,
                    "Login successful.",
                    true
                );

                setTimeout(() => {

                    redirectUser(
                        userData.role
                    );

                }, 500);

            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                showMessage(
                    message,
                    getFirebaseError(error)
                );

                button.disabled = false;

                button.textContent =
                    "Login";
            }
        }
    );
}


const forgotPasswordButton =
    document.getElementById(
        "forgotPassword"
    );

if (forgotPasswordButton) {

    forgotPasswordButton.addEventListener(
        "click",
        async () => {

            const emailInput =
                document.getElementById(
                    "loginEmail"
                );

            const message =
                document.getElementById(
                    "loginMessage"
                );

            const email =
                normalizeEmail(
                    emailInput.value
                );

            if (!emailPattern.test(email)) {

                showFieldError(
                    "loginEmail",
                    "Enter your email address first."
                );

                return;
            }

            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );

                showMessage(
                    message,
                    "Password reset email sent.",
                    true
                );

            } catch (error) {

                console.error(
                    "Reset password error:",
                    error
                );

                showMessage(
                    message,
                    getFirebaseError(error)
                );
            }
        }
    );
}

document
    .querySelectorAll(".show-password")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const input =
                    document.getElementById(
                        button.dataset.target
                    );

                const currentlyHidden =
                    input.type === "password";

                input.type =
                    currentlyHidden
                        ? "text"
                        : "password";

                button.textContent =
                    currentlyHidden
                        ? "Hide"
                        : "Show";
            }
        );
    });
