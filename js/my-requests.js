import {
    auth,
    db
} from "./firebase.js";

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


const requestsContainer =
    document.getElementById("requestsContainer");

const loadingState =
    document.getElementById("loadingState");

const emptyState =
    document.getElementById("emptyState");

const emptyTitle =
    document.getElementById("emptyTitle");

const emptyMessage =
    document.getElementById("emptyMessage");

const pageMessage =
    document.getElementById("pageMessage");

const requestSearch =
    document.getElementById("requestSearch");

const statusFilter =
    document.getElementById("statusFilter");

const totalCount =
    document.getElementById("totalCount");

const pendingCount =
    document.getElementById("pendingCount");

const activeCount =
    document.getElementById("activeCount");

const completedCount =
    document.getElementById("completedCount");

const profileName =
    document.getElementById("profileName");

const profileInitial =
    document.getElementById("profileInitial");

const logoutButton =
    document.getElementById("logoutButton");

const requestModal =
    document.getElementById("requestModal");

const closeModalButton =
    document.getElementById("closeModalButton");


let allRequests = [];
let currentUser = null;
let unsubscribeRequests = null;


function showMessage(message, type = "") {
    pageMessage.textContent = message;
    pageMessage.className =
        `page-message ${type}`.trim();
}


function normaliseStatus(status) {
    return String(status || "pending")
        .trim()
        .toLowerCase()
        .replace(/_/g, "-")
        .replace(/\s+/g, "-");
}


function formatText(value) {
    const text =
        String(value || "")
            .trim()
            .replace(/-/g, " ");

    if (!text) {
        return "Not available";
    }

    return text.replace(
        /\b\w/g,
        character => character.toUpperCase()
    );
}


function getRequestIcon(type) {
    const icons = {
        food: "🍲",
        water: "💧",
        medical: "🏥",
        rescue: "🚑",
        shelter: "🏠",
        other: "📦"
    };

    return icons[
        String(type || "")
            .toLowerCase()
    ] || "🆘";
}


function formatDate(timestamp) {
    if (!timestamp) {
        return "Not available";
    }

    let date;

    if (
        typeof timestamp.toDate === "function"
    ) {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
}


function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getStatusClass(status) {
    const normalised =
        normaliseStatus(status);

    const supportedStatuses = [
        "pending",
        "assigned",
        "in-progress",
        "completed",
        "cancelled",
        "rejected"
    ];

    if (
        supportedStatuses.includes(normalised)
    ) {
        return `status-${normalised}`;
    }

    return "status-default";
}


function getPriorityClass(priority) {
    const normalised =
        String(priority || "medium")
            .toLowerCase();

    const supportedPriorities = [
        "low",
        "medium",
        "high",
        "critical"
    ];

    if (
        supportedPriorities.includes(
            normalised
        )
    ) {
        return `priority-${normalised}`;
    }

    return "priority-medium";
}


function updateSummary(requests) {
    const pending =
        requests.filter(request => {
            return normaliseStatus(
                request.status
            ) === "pending";
        }).length;

    const active =
        requests.filter(request => {
            const status =
                normaliseStatus(
                    request.status
                );

            return (
                status === "assigned" ||
                status === "in-progress"
            );
        }).length;

    const completed =
        requests.filter(request => {
            return normaliseStatus(
                request.status
            ) === "completed";
        }).length;

    totalCount.textContent =
        requests.length;

    pendingCount.textContent =
        pending;

    activeCount.textContent =
        active;

    completedCount.textContent =
        completed;
}


function createRequestCard(request) {
    const status =
        normaliseStatus(request.status);

    const requestType =
        formatText(request.requestType);

    const priority =
        formatText(request.priority);

    const description =
        request.description ||
        "No description provided.";

    const location =
        request.location ||
        "Location not provided";

    const peopleCount =
        request.peopleCount || 1;

    const date =
        formatDate(request.createdAt);

    return `
        <article class="request-card">

            <div class="request-type-icon">
                ${getRequestIcon(request.requestType)}
            </div>

            <div class="request-card-content">

                <div class="request-card-heading">

                    <h3>
                        ${escapeHtml(requestType)}
                    </h3>

                    <span
                        class="status-badge ${getStatusClass(status)}"
                    >
                        ${escapeHtml(formatText(status))}
                    </span>

                    <span
                        class="priority-badge ${getPriorityClass(request.priority)}"
                    >
                        ${escapeHtml(priority)}
                    </span>

                </div>

                <p class="request-description">
                    ${escapeHtml(description)}
                </p>

                <div class="request-meta">

                    <span>
                        📍 ${escapeHtml(location)}
                    </span>

                    <span>
                        👥 ${escapeHtml(peopleCount)} people
                    </span>

                    <span>
                        🕒 ${escapeHtml(date)}
                    </span>

                </div>

            </div>

            <button
                type="button"
                class="request-card-action"
                data-request-id="${escapeHtml(request.id)}"
            >
                View Details
            </button>

        </article>
    `;
}


function getFilteredRequests() {
    const searchValue =
        requestSearch.value
            .trim()
            .toLowerCase();

    const selectedStatus =
        statusFilter.value;

    return allRequests.filter(request => {
        const requestStatus =
            normaliseStatus(request.status);

        const searchableText = [
            request.requestType,
            request.location,
            request.landmark,
            request.description,
            request.priority,
            request.status
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !searchValue ||
            searchableText.includes(
                searchValue
            );

        const matchesStatus =
            selectedStatus === "all" ||
            requestStatus === selectedStatus;

        return (
            matchesSearch &&
            matchesStatus
        );
    });
}


function renderRequests() {
    loadingState.classList.add("hidden");

    const filteredRequests =
        getFilteredRequests();

    requestsContainer.innerHTML = "";

    if (allRequests.length === 0) {
        requestsContainer.classList.add(
            "hidden"
        );

        emptyState.classList.remove(
            "hidden"
        );

        emptyTitle.textContent =
            "No requests submitted";

        emptyMessage.textContent =
            "Your help requests will appear here after submission.";

        return;
    }

    if (filteredRequests.length === 0) {
        requestsContainer.classList.add(
            "hidden"
        );

        emptyState.classList.remove(
            "hidden"
        );

        emptyTitle.textContent =
            "No matching requests";

        emptyMessage.textContent =
            "Try changing your search text or status filter.";

        return;
    }

    emptyState.classList.add("hidden");

    requestsContainer.classList.remove(
        "hidden"
    );

    requestsContainer.innerHTML =
        filteredRequests
            .map(createRequestCard)
            .join("");
}


function openRequestModal(requestId) {
    const request =
        allRequests.find(item => {
            return item.id === requestId;
        });

    if (!request) {
        showMessage(
            "The selected request could not be found.",
            "error"
        );

        return;
    }

    const status =
        normaliseStatus(request.status);

    const modalTitle =
        document.getElementById(
            "modalTitle"
        );

    const modalStatus =
        document.getElementById(
            "modalStatus"
        );

    const modalPriority =
        document.getElementById(
            "modalPriority"
        );

    modalTitle.textContent =
        `${formatText(request.requestType)} Request`;

    modalStatus.textContent =
        formatText(status);

    modalStatus.className =
        `status-badge ${getStatusClass(status)}`;

    modalPriority.textContent =
        `${formatText(request.priority)} Priority`;

    modalPriority.className =
        `priority-badge ${getPriorityClass(request.priority)}`;

    document.getElementById(
        "modalPeople"
    ).textContent =
        request.peopleCount || "1";

    document.getElementById(
        "modalContact"
    ).textContent =
        request.contact ||
        "Not provided";

    document.getElementById(
        "modalLocation"
    ).textContent =
        request.location ||
        "Not provided";

    document.getElementById(
        "modalLandmark"
    ).textContent =
        request.landmark ||
        "Not provided";

    document.getElementById(
        "modalImmediate"
    ).textContent =
        request.immediate
            ? "Yes"
            : "No";

    document.getElementById(
        "modalVolunteer"
    ).textContent =
        request.assignedVolunteerName ||
        request.volunteerName ||
        request.assignedVolunteer ||
        "Not assigned";

    document.getElementById(
        "modalDate"
    ).textContent =
        formatDate(request.createdAt);

    document.getElementById(
        "modalUpdated"
    ).textContent =
        formatDate(request.updatedAt);

    document.getElementById(
        "modalDescription"
    ).textContent =
        request.description ||
        "No description provided.";

    requestModal.classList.remove(
        "hidden"
    );

    document.body.style.overflow =
        "hidden";
}


function closeRequestModal() {
    requestModal.classList.add("hidden");

    document.body.style.overflow = "";
}


async function loadUserProfile(user) {
    const userReference =
        doc(
            db,
            "users",
            user.uid
        );

    const userSnapshot =
        await getDoc(userReference);

    if (!userSnapshot.exists()) {
        throw new Error(
            "Citizen profile was not found."
        );
    }

    const profile =
        userSnapshot.data();

    const name =
        profile.name ||
        user.displayName ||
        "Citizen";

    profileName.textContent =
        name;

    profileInitial.textContent =
        name
            .charAt(0)
            .toUpperCase();

    return profile;
}


function listenToRequests(user) {
    const requestsQuery =
        query(
            collection(
                db,
                "requests"
            ),

            where(
                "requestedBy",
                "==",
                user.uid
            )
        );

    unsubscribeRequests =
        onSnapshot(
            requestsQuery,

            snapshot => {
                allRequests =
                    snapshot.docs
                        .map(requestDocument => ({
                            id: requestDocument.id,
                            ...requestDocument.data()
                        }))
                        .sort((first, second) => {
                            const firstTime = first.createdAt?.toMillis?.() || 0;
                            const secondTime = second.createdAt?.toMillis?.() || 0;
                            return secondTime - firstTime;
                        });

                updateSummary(allRequests);
                renderRequests();
                showMessage("");
            },

            error => {
                console.error(
                    "Request loading error:",
                    error
                );

                loadingState.classList.add(
                    "hidden"
                );

                requestsContainer.classList.add(
                    "hidden"
                );

                emptyState.classList.remove(
                    "hidden"
                );

                emptyTitle.textContent =
                    "Unable to load requests";

                emptyMessage.textContent =
                    "Check your connection and Firestore permissions.";

                if (
                    error.code ===
                    "failed-precondition"
                ) {
                    showMessage(
                        "Firestore requires an index for this query. Open the index link shown in the browser console.",
                        "error"
                    );
                } else {
                    showMessage(
                        "Your requests could not be loaded.",
                        "error"
                    );
                }
            }
        );
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

        currentUser = user;

        try {
            const profile =
                await loadUserProfile(user);

            if (
                profile.role !== "citizen"
            ) {
                window.location.replace(
                    "login.html"
                );

                return;
            }

            listenToRequests(user);

        } catch (error) {
            console.error(
                "Profile error:",
                error
            );

            loadingState.classList.add(
                "hidden"
            );

            showMessage(
                error.message ||
                "Your profile could not be loaded.",
                "error"
            );
        }
    }
);


requestSearch.addEventListener(
    "input",
    renderRequests
);


statusFilter.addEventListener(
    "change",
    renderRequests
);


requestsContainer.addEventListener(
    "click",

    event => {
        const viewButton =
            event.target.closest(
                ".request-card-action"
            );

        if (!viewButton) {
            return;
        }

        openRequestModal(
            viewButton.dataset.requestId
        );
    }
);


closeModalButton.addEventListener(
    "click",
    closeRequestModal
);


requestModal.addEventListener(
    "click",

    event => {
        if (
            event.target === requestModal
        ) {
            closeRequestModal();
        }
    }
);


document.addEventListener(
    "keydown",

    event => {
        if (
            event.key === "Escape" &&
            !requestModal.classList.contains(
                "hidden"
            )
        ) {
            closeRequestModal();
        }
    }
);


logoutButton.addEventListener(
    "click",

    async () => {
        try {
            if (unsubscribeRequests) {
                unsubscribeRequests();
            }

            await signOut(auth);

            window.location.replace(
                "login.html"
            );

        } catch (error) {
            console.error(
                "Logout error:",
                error
            );

            showMessage(
                "Logout failed. Please try again.",
                "error"
            );
        }
    }
);