import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const userName = document.getElementById("userName");
const profileName = document.getElementById("profileName");
const profileInitial = document.getElementById("profileInitial");
const logoutButton = document.getElementById("logoutButton");
const activityContainer = document.getElementById("activityContainer");
const emptyState = document.getElementById("emptyState");

let unsubscribeDisasters = null;
let unsubscribeRequests = null;
let disasterActivities = [];
let requestActivities = [];

function showName(name) {
    const safeName = name?.trim() || "Citizen";
    userName.textContent = safeName;
    profileName.textContent = safeName;
    profileInitial.textContent = safeName.charAt(0).toUpperCase();
}

function formatText(value) {
    const text = String(value || "").trim().replace(/[-_]/g, " ");
    if (!text) return "Not available";
    return text.replace(/\b\w/g, character => character.toUpperCase());
}

function normaliseStatus(status) {
    return String(status || "pending")
        .trim()
        .toLowerCase()
        .replace(/_/g, "-")
        .replace(/\s+/g, "-");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
    if (!timestamp) return "Date not available";

    const date = typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "Date not available";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function getTimeValue(timestamp) {
    if (!timestamp) return 0;
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();

    const time = new Date(timestamp).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function getStatusClass(status) {
    const value = normaliseStatus(status);
    const supported = ["pending", "assigned", "in-progress", "completed", "cancelled", "rejected"];
    return supported.includes(value) ? `activity-status-${value}` : "activity-status-default";
}

function createActivityCard(item) {
    const isDisaster = item.kind === "disaster";
    const status = normaliseStatus(item.status);

    const title = isDisaster
        ? `${formatText(item.disasterType || "Disaster")} Report`
        : `${formatText(item.requestType || "Help")} Request`;

    const description = item.description ||
        (isDisaster ? "Disaster report submitted." : "Help request submitted.");

    const icon = isDisaster ? "🚨" : "🆘";
    const label = isDisaster ? "Disaster Report" : "Help Request";

    return `
        <article class="activity-card">
            <div class="activity-icon ${isDisaster ? "activity-danger" : "activity-help"}">
                ${icon}
            </div>

            <div class="activity-content">
                <div class="activity-topline">
                    <div>
                        <span class="activity-type">${label}</span>
                        <h3>${escapeHtml(title)}</h3>
                    </div>
                    <span class="activity-status ${getStatusClass(status)}">
                        ${escapeHtml(formatText(status))}
                    </span>
                </div>

                <p>${escapeHtml(description)}</p>

                <div class="activity-meta">
                    <span>📍 ${escapeHtml(item.location || "Location not provided")}</span>
                    <span>🕒 ${escapeHtml(formatDate(item.createdAt))}</span>
                </div>
            </div>
        </article>
    `;
}

function renderActivity() {
    if (!activityContainer || !emptyState) return;

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

function listenToCitizenActivity(user) {
    const disasterQuery = query(
        collection(db, "disasters"),
        where("reportedBy", "==", user.uid)
    );

    const requestQuery = query(
        collection(db, "requests"),
        where("requestedBy", "==", user.uid)
    );

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
        error => {
            console.error("Citizen disaster activity loading error:", error);
            renderActivity();
        }
    );

    unsubscribeRequests = onSnapshot(
        requestQuery,
        snapshot => {
            requestActivities = snapshot.docs.map(item => ({
                id: item.id,
                kind: "request",
                ...item.data()
            }));
            renderActivity();
        },
        error => {
            console.error("Citizen request activity loading error:", error);
            renderActivity();
        }
    );
}

try {
    const cachedProfile = JSON.parse(
        localStorage.getItem("drcsUserProfile") || "null"
    );

    showName(
        cachedProfile?.name ||
        localStorage.getItem("drcsCitizenName") ||
        "Citizen"
    );
} catch (error) {
    showName(localStorage.getItem("drcsCitizenName") || "Citizen");
}

onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
        const userReference = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userReference);

        if (!userSnapshot.exists()) return;

        const userData = userSnapshot.data();
        const name = userData.name || user.displayName || "Citizen";
        showName(name);

        localStorage.setItem("drcsCitizenName", name);
        localStorage.setItem(
            "drcsUserProfile",
            JSON.stringify({
                uid: user.uid,
                name,
                role: userData.role || "citizen",
                email: userData.email || user.email || ""
            })
        );

        listenToCitizenActivity(user);
    } catch (error) {
        console.error("Could not load citizen profile:", error);
    }
});

logoutButton.addEventListener("click", async () => {
    try {
        unsubscribeDisasters?.();
        unsubscribeRequests?.();
        await signOut(auth);
        localStorage.removeItem("drcsUserProfile");
        localStorage.removeItem("drcsCitizenName");
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout failed:", error);
        alert("Unable to log out. Please try again.");
    }
});
