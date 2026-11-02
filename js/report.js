import { auth, db } from "./firebase.js";

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

const reportForm = document.getElementById("reportForm");
const disasterType = document.getElementById("disasterType");
const severity = document.getElementById("severity");
const reportLocation = document.getElementById("reportLocation");
const landmark = document.getElementById("landmark");
const description = document.getElementById("description");
const peopleAffected = document.getElementById("peopleAffected");
const immediateRescue = document.getElementById("immediateRescue");
const descriptionCount = document.getElementById("descriptionCount");
const reportMessage = document.getElementById("reportMessage");
const reportButton = document.getElementById("reportButton");
const logoutButton = document.getElementById("logoutButton");
const locationButton = document.getElementById("reportLocationButton");
const locationStatus = document.getElementById("reportLocationStatus");

let currentUser = null;
let currentUserData = null;
let selectedCoordinates = null;

function setLocationStatus(message, type = "") {
    locationStatus.textContent = message;
    locationStatus.className = `location-status ${type}`.trim();
}

reportLocation.addEventListener("input", () => {
    selectedCoordinates = null;
    setLocationStatus("Location changed. Use GPS again for an exact map point.");
});

locationButton.addEventListener("click", async () => {
    locationButton.disabled = true;
    setLocationStatus("Getting your current location...");

    try {
        selectedCoordinates = await getBrowserCoordinates();
        setLocationStatus(
            "Exact coordinates captured. This report will appear on the map.",
            "success"
        );
    } catch (error) {
        selectedCoordinates = null;
        setLocationStatus(error.message, "error");
    } finally {
        locationButton.disabled = false;
    }
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        return;
    }

    currentUser = user;

    try {
        const userReference = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userReference);

        if (userSnapshot.exists()) {
            currentUserData = userSnapshot.data();
        }
    } catch (error) {
        console.error("Could not load user profile:", error);
    }
});

description.addEventListener("input", () => {
    descriptionCount.textContent =
        `${description.value.length} / 500`;
});

function showError(input, errorId, message) {
    input.classList.add("invalid");
    document.getElementById(errorId).textContent = message;
}

function clearError(input, errorId) {
    input.classList.remove("invalid");
    document.getElementById(errorId).textContent = "";
}

function validateReport() {
    let isValid = true;

    if (disasterType.value === "") {
        showError(
            disasterType,
            "disasterTypeError",
            "Please select a disaster type."
        );
        isValid = false;
    } else {
        clearError(disasterType, "disasterTypeError");
    }

    if (severity.value === "") {
        showError(
            severity,
            "severityError",
            "Please select the severity."
        );
        isValid = false;
    } else {
        clearError(severity, "severityError");
    }

    if (reportLocation.value.trim().length < 3) {
        showError(
            reportLocation,
            "reportLocationError",
            "Enter a valid location."
        );
        isValid = false;
    } else {
        clearError(reportLocation, "reportLocationError");
    }

    if (description.value.trim().length < 7) {
        showError(
            description,
            "descriptionError",
            "Description must contain at least 7 characters."
        );
        isValid = false;
    } else {
        clearError(description, "descriptionError");
    }

    return isValid;
}

reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    reportMessage.textContent = "";

    if (!validateReport()) {
        return;
    }

    if (!currentUser) {
        reportMessage.textContent =
            "Your session has expired. Please log in again.";

        reportMessage.style.color = "#dc3545";
        return;
    }

    reportButton.disabled = true;
    reportButton.textContent = "Submitting report...";

    try {
        const resolvedCoordinates =
            selectedCoordinates ||
            await geocodeLocation(reportLocation.value.trim());

        await addDoc(collection(db, "disasters"), {
            disasterType: disasterType.value,
            location: reportLocation.value.trim(),
            latitude: resolvedCoordinates?.[0] ?? null,
            longitude: resolvedCoordinates?.[1] ?? null,
            coordinates: resolvedCoordinates
                ? {
                    latitude: resolvedCoordinates[0],
                    longitude: resolvedCoordinates[1]
                }
                : null,
            landmark: landmark.value.trim(),
            severity: severity.value,
            description: description.value.trim(),
            peopleAffected:
                Number(peopleAffected.value) || 0,
            immediateRescue: immediateRescue.checked,
            reportedBy: currentUser.uid,
            reporterName:
                currentUserData?.name || "Citizen",
            reporterEmail:
                currentUser.email || "",
            status: "pending",
            assignedTo: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        reportMessage.textContent =
            "Disaster report submitted successfully.";

        reportMessage.style.color = "#198754";

        reportForm.reset();
        selectedCoordinates = null;
        setLocationStatus(
            "Add the city/district or use GPS for an exact map point."
        );
        descriptionCount.textContent = "0 / 500";

        setTimeout(() => {
            window.location.href = "citizen.html";
        }, 1200);
    } catch (error) {
        console.error("Report submission failed:", error);

        reportMessage.textContent =
            "Unable to submit the report. Please try again.";

        reportMessage.style.color = "#dc3545";

        reportButton.disabled = false;
        reportButton.textContent = "Submit Report";
    }
});

logoutButton.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout failed:", error);
    }
});
