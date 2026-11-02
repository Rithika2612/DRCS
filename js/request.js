import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    geocodeLocation,
    getBrowserCoordinates
} from "./location-utils.js";

const requestForm =
    document.getElementById("requestForm");

const logoutButton =
    document.getElementById("logoutButton");

const submitButton =
    document.getElementById("submitRequestButton");

const messageElement =
    document.getElementById("requestMessage");

const descriptionInput =
    document.getElementById("description");

const descriptionCount =
    document.getElementById("descriptionCount");

const locationInput =
    document.getElementById("location");

const locationButton =
    document.getElementById("requestLocationButton");

const locationStatus =
    document.getElementById("requestLocationStatus");

const phonePattern =
    /^[6-9][0-9]{9}$/;

let currentUser = null;
let currentProfile = null;
let selectedCoordinates = null;

function setLocationStatus(message, type = "") {
    locationStatus.textContent = message;
    locationStatus.className = `location-status ${type}`.trim();
}

locationInput.addEventListener("input", () => {
    selectedCoordinates = null;
    setLocationStatus("Location changed. Use GPS again for an exact map point.");
});

locationButton.addEventListener("click", async () => {
    locationButton.disabled = true;
    setLocationStatus("Getting your current location...");

    try {
        selectedCoordinates = await getBrowserCoordinates();
        setLocationStatus(
            "Exact coordinates captured. This request will appear on the map.",
            "success"
        );
    } catch (error) {
        selectedCoordinates = null;
        setLocationStatus(error.message, "error");
    } finally {
        locationButton.disabled = false;
    }
});

function showFieldError(fieldId, message) {
    const field =
        document.getElementById(fieldId);

    const error =
        document.getElementById(
            `${fieldId}Error`
        );

    if (error) {
        error.textContent = message;
    }

    if (field) {
        field.classList.toggle(
            "invalid",
            Boolean(message)
        );

        field.classList.toggle(
            "valid",
            !message &&
            field.value.trim() !== ""
        );
    }
}

function clearErrors() {
    requestForm
        .querySelectorAll(".field-error")
        .forEach(error => {
            error.textContent = "";
        });

    requestForm
        .querySelectorAll(
            "input, select, textarea"
        )
        .forEach(field => {
            field.classList.remove(
                "invalid",
                "valid"
            );
        });
}

function showMessage(message, type = "") {
    messageElement.textContent = message;
    messageElement.className =
        `form-message ${type}`.trim();
}

function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent =
        isLoading
            ? "Submitting..."
            : "Submit Request";
}

function validateForm() {
    clearErrors();

    const requestType =
        document
            .getElementById("requestType")
            .value;

    const priority =
        document
            .getElementById("priority")
            .value;

    const peopleCountValue =
        document
            .getElementById("peopleCount")
            .value
            .trim();

    const contact =
        document
            .getElementById("contact")
            .value
            .trim();

    const location =
        document
            .getElementById("location")
            .value
            .trim();

    const landmark =
        document
            .getElementById("landmark")
            .value
            .trim();

    const description =
        document
            .getElementById("description")
            .value
            .trim();

    const immediate =
        document
            .getElementById("immediate")
            .checked;

    const peopleCount =
        Number(peopleCountValue);

    let valid = true;

    if (!requestType) {
        showFieldError(
            "requestType",
            "Select the type of help required."
        );
        valid = false;
    }

    if (!priority) {
        showFieldError(
            "priority",
            "Select a priority level."
        );
        valid = false;
    }

    if (!peopleCountValue) {
        showFieldError(
            "peopleCount",
            "Enter the number of people."
        );
        valid = false;
    } else if (
        !Number.isInteger(peopleCount) ||
        peopleCount < 1 ||
        peopleCount > 10000
    ) {
        showFieldError(
            "peopleCount",
            "Enter a whole number between 1 and 10000."
        );
        valid = false;
    }

    if (!contact) {
        showFieldError(
            "contact",
            "Contact number is required."
        );
        valid = false;
    } else if (!phonePattern.test(contact)) {
        showFieldError(
            "contact",
            "Enter a valid 10-digit Indian mobile number."
        );
        valid = false;
    }

    if (!location) {
        showFieldError(
            "location",
            "Location is required."
        );
        valid = false;
    } else if (location.length < 3) {
        showFieldError(
            "location",
            "Enter a clearer location."
        );
        valid = false;
    }

    if (landmark.length > 120) {
        showFieldError(
            "landmark",
            "Landmark must be within 120 characters."
        );
        valid = false;
    }

    if (!description) {
        showFieldError(
            "description",
            "Describe the help you need."
        );
        valid = false;
    } else if (description.length < 10) {
        showFieldError(
            "description",
            "Description must contain at least 10 characters."
        );
        valid = false;
    }

    return {
        valid,
        values: {
            requestType,
            priority,
            peopleCount,
            contact,
            location,
            landmark,
            description,
            immediate
        }
    };
}

function getErrorMessage(error) {
    const messages = {
        "permission-denied":
            "Firestore denied this request. Check your security rules.",
        "firestore/permission-denied":
            "Firestore denied this request. Check your security rules.",
        "unavailable":
            "Firebase is temporarily unavailable. Try again.",
        "auth/network-request-failed":
            "Check your internet connection and try again."
    };

    return messages[error.code] ||
        error.message ||
        "The request could not be submitted.";
}

async function loadUserProfile(user) {
    const profileReference =
        doc(
            db,
            "users",
            user.uid
        );

    const profileSnapshot =
        await getDoc(profileReference);

    if (!profileSnapshot.exists()) {
        throw new Error(
            "Your Firestore profile was not found."
        );
    }

    const profile =
        profileSnapshot.data();

    if (profile.status !== "active") {
        throw new Error(
            "Your account is not active."
        );
    }

    if (profile.role !== "citizen") {
        throw new Error(
            "Only citizen accounts can submit help requests."
        );
    }

    return profile;
}

onAuthStateChanged(
    auth,
    async user => {
        if (!user) {
            window.location.replace(
                "login.html"
            );
            return;
        }

        try {
            currentUser = user;
            currentProfile =
                await loadUserProfile(user);

            const contactInput =
                document.getElementById(
                    "contact"
                );

            const locationInput =
                document.getElementById(
                    "location"
                );

            if (
                currentProfile.phone &&
                !contactInput.value
            ) {
                contactInput.value =
                    currentProfile.phone;
            }

            if (
                currentProfile.location &&
                !locationInput.value
            ) {
                locationInput.value =
                    currentProfile.location;
            }

        } catch (error) {
            console.error(
                "Profile loading error:",
                error
            );

            showMessage(
                getErrorMessage(error),
                "error"
            );

            setLoading(false);
        }
    }
);

descriptionInput.addEventListener(
    "input",
    () => {
        descriptionCount.textContent =
            `${descriptionInput.value.length} / 600`;
    }
);

requestForm.addEventListener(
    "submit",
    async event => {
        event.preventDefault();
        showMessage("");

        if (!currentUser || !currentProfile) {
            showMessage(
                "Your account is still loading. Please try again.",
                "error"
            );
            return;
        }

        const result =
            validateForm();

        if (!result.valid) {
            showMessage(
                "Correct the highlighted fields.",
                "error"
            );

            const firstInvalid =
                requestForm.querySelector(
                    ".invalid"
                );

            firstInvalid?.focus();
            return;
        }

        try {
            setLoading(true);

            const resolvedCoordinates =
                selectedCoordinates ||
                await geocodeLocation(result.values.location);

            await addDoc(
                collection(
                    db,
                    "requests"
                ),
                {
                    requestType:
                        result.values.requestType,

                    priority:
                        result.values.priority,

                    peopleCount:
                        result.values.peopleCount,

                    contact:
                        result.values.contact,

                    location:
                        result.values.location,

                    latitude:
                        resolvedCoordinates?.[0] ?? null,

                    longitude:
                        resolvedCoordinates?.[1] ?? null,

                    coordinates:
                        resolvedCoordinates
                            ? {
                                latitude: resolvedCoordinates[0],
                                longitude: resolvedCoordinates[1]
                            }
                            : null,

                    landmark:
                        result.values.landmark,

                    description:
                        result.values.description,

                    immediate:
                        result.values.immediate,

                    requestedBy:
                        currentUser.uid,

                    requesterName:
                        currentProfile.name ||
                        "Citizen",

                    requesterEmail:
                        currentUser.email ||
                        currentProfile.email ||
                        "",

                    status:
                        "pending",

                    assignedVolunteer:
                        null,

                    assignedBy:
                        null,

                    assignedAt:
                        null,

                    completedAt:
                        null,

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()
                }
            );

            showMessage(
                "Help request submitted successfully.",
                "success"
            );

            requestForm.reset();
            selectedCoordinates = null;
            setLocationStatus(
                "Add the city/district or use GPS for an exact map point."
            );

            descriptionCount.textContent =
                "0 / 600";

            setTimeout(() => {
                window.location.href =
                    "citizen.html";
            }, 1200);

        } catch (error) {
            console.error(
                "Request submission error:",
                error
            );

            showMessage(
                getErrorMessage(error),
                "error"
            );

            setLoading(false);
        }
    }
);


if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.replace("login.html");
        } catch (error) {
            console.error("Logout error:", error);
            showMessage("Logout failed. Please try again.", "error");
        }
    });
}
