import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const elements = {
    volunteerName: document.getElementById("volunteerName"),
    profileName: document.getElementById("profileName"),
    profileInitial: document.getElementById("profileInitial"),
    pageMessage: document.getElementById("pageMessage"),
    logoutButton: document.getElementById("logoutButton"),
    sidebarStatus: document.getElementById("sidebarStatus"),
    sidebarStatusDot: document.getElementById("sidebarStatusDot"),
    heroTitle: document.getElementById("heroTitle"),
    heroDescription: document.getElementById("heroDescription"),
    assignedCount: document.getElementById("assignedCount"),
    activeCount: document.getElementById("activeCount"),
    completedCount: document.getElementById("completedCount"),
    unreadCount: document.getElementById("unreadCount"),
    navUnreadCount: document.getElementById("navUnreadCount"),
    activeTaskStatus: document.getElementById("activeTaskStatus"),
    activeTaskContent: document.getElementById("activeTaskContent"),
    taskFilter: document.getElementById("taskFilter"),
    taskList: document.getElementById("taskList"),
    availabilityBadge: document.getElementById("availabilityBadge"),
    availabilitySelect: document.getElementById("availabilitySelect"),
    saveAvailabilityButton: document.getElementById("saveAvailabilityButton"),
    availabilityHint: document.getElementById("availabilityHint"),
    notificationList: document.getElementById("notificationList"),
    markAllReadButton: document.getElementById("markAllReadButton"),
    profileForm: document.getElementById("profileForm"),
    profileNameInput: document.getElementById("profileNameInput"),
    profilePhoneInput: document.getElementById("profilePhoneInput"),
    profileLocationInput: document.getElementById("profileLocationInput"),
    profileSkillsInput: document.getElementById("profileSkillsInput"),
    profileBloodGroupInput: document.getElementById("profileBloodGroupInput"),
    profileEmergencyInput: document.getElementById("profileEmergencyInput"),
    saveProfileButton: document.getElementById("saveProfileButton"),
    taskModal: document.getElementById("taskModal"),
    closeTaskModal: document.getElementById("closeTaskModal"),
    modalCloseButton: document.getElementById("modalCloseButton"),
    modalTaskTitle: document.getElementById("modalTaskTitle"),
    modalStatus: document.getElementById("modalStatus"),
    modalPriority: document.getElementById("modalPriority"),
    modalCitizen: document.getElementById("modalCitizen"),
    modalContact: document.getElementById("modalContact"),
    modalLocation: document.getElementById("modalLocation"),
    modalDescription: document.getElementById("modalDescription"),
    modalTaskAction: document.getElementById("modalTaskAction")
};

let currentUser = null;
let currentProfile = null;
let taskRecords = [];
let notificationRecords = [];
let selectedTaskId = null;
let listenersStarted = false;
const unsubscribeListeners = [];

function normalise(value, fallback = "") {
    return String(value ?? fallback).trim().toLowerCase().replaceAll("_", "-").replace(/\s+/g, "-");
}

function formatText(value, fallback = "Not available") {
    const text = String(value ?? "").trim().replaceAll("-", " ").replaceAll("_", " ");
    return text ? text.replace(/\b\w/g, character => character.toUpperCase()) : fallback;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function timestampToDate(timestamp) {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === "function") return timestamp.toDate();
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(timestamp) {
    const date = timestampToDate(timestamp);
    if (!date) return "Not available";
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function showMessage(message, type = "") {
    elements.pageMessage.textContent = message;
    elements.pageMessage.className = `page-message ${type}`.trim();
    if (message && type === "success") {
        window.setTimeout(() => showMessage(""), 3500);
    }
}

function taskStatus(task) {
    return normalise(task.status, "assigned");
}

function statusClass(status) {
    const valid = ["assigned", "accepted", "in-progress", "completed"];
    const value = normalise(status, "assigned");
    return valid.includes(value) ? `status-${value}` : "neutral-badge";
}

function priorityClass(priority) {
    const valid = ["low", "medium", "high", "critical"];
    const value = normalise(priority, "medium");
    return valid.includes(value) ? `priority-${value}` : "priority-medium";
}

function isAssignedToCurrentVolunteer(task) {
    const assignedValues = [
        task.assignedTo,
        task.assignedVolunteer,
        task.assignedVolunteerId,
        task.volunteerId
    ].filter(Boolean).map(String);
    return currentUser && assignedValues.includes(currentUser.uid);
}

function getNextAction(status) {
    const actions = {
        assigned: { label: "Accept task", nextStatus: "accepted" },
        accepted: { label: "Start response", nextStatus: "in-progress" },
        "in-progress": { label: "Mark completed", nextStatus: "completed" }
    };
    return actions[normalise(status)] || null;
}

function sortNewest(records) {
    return [...records].sort((a, b) => {
        const first = timestampToDate(a.updatedAt || a.createdAt)?.getTime() || 0;
        const second = timestampToDate(b.updatedAt || b.createdAt)?.getTime() || 0;
        return second - first;
    });
}

function requestIcon(type) {
    const icons = { medical: "✚", rescue: "⚑", food: "◫", water: "≈", shelter: "⌂", transport: "↗" };
    return icons[normalise(type)] || "+";
}

function activeTasks() {
    return taskRecords.filter(task => ["assigned", "accepted", "in-progress"].includes(taskStatus(task)));
}

function getPrimaryTask() {
    const priorityOrder = { "in-progress": 0, accepted: 1, assigned: 2 };
    return [...activeTasks()].sort((a, b) => {
        const statusDifference = priorityOrder[taskStatus(a)] - priorityOrder[taskStatus(b)];
        if (statusDifference !== 0) return statusDifference;
        return (timestampToDate(b.assignedAt || b.createdAt)?.getTime() || 0) -
            (timestampToDate(a.assignedAt || a.createdAt)?.getTime() || 0);
    })[0] || null;
}

function renderAvailability() {
    const hasActiveTask = activeTasks().length > 0;
    const stored = normalise(currentProfile?.availability);
    const availability = hasActiveTask ? "busy" : (stored || (currentProfile?.available === false ? "offline" : "available"));

    elements.sidebarStatus.textContent = formatText(availability);
    elements.sidebarStatusDot.className = `status-dot ${availability}`;
    elements.availabilityBadge.textContent = formatText(availability);
    elements.availabilityBadge.className = `availability-badge ${availability}`;
    elements.availabilitySelect.value = availability === "offline" ? "offline" : "available";
    elements.availabilitySelect.disabled = hasActiveTask;
    elements.saveAvailabilityButton.disabled = hasActiveTask;
    elements.availabilityHint.textContent = hasActiveTask
        ? "Your status stays Busy until all active tasks are completed."
        : "Status updates are saved instantly in Firestore.";

    if (hasActiveTask) {
        elements.heroTitle.textContent = "An emergency response needs your attention";
        elements.heroDescription.textContent = "Open your current assignment, contact the citizen and update each stage as you respond.";
    } else {
        elements.heroTitle.textContent = availability === "available"
            ? "You are ready for a new assignment"
            : "You are currently offline";
        elements.heroDescription.textContent = availability === "available"
            ? "Administrators can now assign an emergency request to you."
            : "Change your availability when you are ready to receive tasks.";
    }
}

function createActionButton(task, className = "small-button action") {
    const action = getNextAction(task.status);
    if (!action) return "";
    return `<button class="${className}" type="button" data-task-action="advance" data-task-id="${escapeHtml(task.id)}">${escapeHtml(action.label)}</button>`;
}

function renderCurrentTask() {
    const task = getPrimaryTask();
    if (!task) {
        elements.activeTaskStatus.textContent = "No active task";
        elements.activeTaskStatus.className = "badge neutral-badge";
        elements.activeTaskContent.className = "empty-state";
        elements.activeTaskContent.innerHTML = "<span>◇</span><h3>No active assignment</h3><p>Your next assigned request will appear here automatically.</p>";
        return;
    }

    const status = taskStatus(task);
    elements.activeTaskStatus.textContent = formatText(status);
    elements.activeTaskStatus.className = `badge ${statusClass(status)}`;
    elements.activeTaskContent.className = "current-task";
    elements.activeTaskContent.innerHTML = `
        <div class="current-task-top">
            <div><h3 class="task-type">${escapeHtml(formatText(task.requestType, "Assistance"))}</h3>
            <p class="task-description">${escapeHtml(task.description || "No description provided.")}</p></div>
            <span class="badge ${priorityClass(task.priority)}">${escapeHtml(formatText(task.priority, "Medium"))}</span>
        </div>
        <div class="task-meta">
            <div><small>Citizen</small><strong>${escapeHtml(task.requesterName || "Citizen")}</strong></div>
            <div><small>Location</small><strong>${escapeHtml(task.location || "Not provided")}</strong></div>
            <div><small>Contact</small><strong>${escapeHtml(task.contact || "Not provided")}</strong></div>
        </div>
        <div class="task-actions">
            <button class="small-button" type="button" data-task-action="view" data-task-id="${escapeHtml(task.id)}">View details</button>
            ${createActionButton(task)}
        </div>`;
}

function createTaskCard(task) {
    const status = taskStatus(task);
    return `
        <article class="task-card">
            <span class="task-card-icon">${requestIcon(task.requestType)}</span>
            <div class="task-card-main">
                <div class="task-card-title">
                    <h3>${escapeHtml(formatText(task.requestType, "Assistance"))}</h3>
                    <span class="badge ${statusClass(status)}">${escapeHtml(formatText(status))}</span>
                </div>
                <p>${escapeHtml(task.description || "No description provided.")}</p>
                <div class="task-card-meta">
                    <span>⌖ ${escapeHtml(task.location || "Location unavailable")}</span>
                    <span>Priority: ${escapeHtml(formatText(task.priority, "Medium"))}</span>
                </div>
            </div>
            <div class="task-card-buttons">
                <button class="small-button" type="button" data-task-action="view" data-task-id="${escapeHtml(task.id)}">View</button>
                ${createActionButton(task)}
            </div>
        </article>`;
}

function renderTaskList() {
    const filter = elements.taskFilter.value;
    let tasks = sortNewest(taskRecords);
    if (filter === "active") tasks = tasks.filter(task => taskStatus(task) !== "completed");
    if (!["active", "all"].includes(filter)) tasks = tasks.filter(task => taskStatus(task) === filter);

    if (!tasks.length) {
        elements.taskList.innerHTML = '<div class="empty-state"><span>✓</span><h3>No matching tasks</h3><p>Assignments will update here in real time.</p></div>';
        return;
    }
    elements.taskList.innerHTML = tasks.map(createTaskCard).join("");
}

function renderTaskSummary() {
    elements.assignedCount.textContent = taskRecords.filter(task => taskStatus(task) === "assigned").length;
    elements.activeCount.textContent = taskRecords.filter(task => ["accepted", "in-progress"].includes(taskStatus(task))).length;
    elements.completedCount.textContent = taskRecords.filter(task => taskStatus(task) === "completed").length;
    renderCurrentTask();
    renderTaskList();
    renderAvailability();
}

function isNotificationForVolunteer(notification) {
    if (!currentUser) return false;
    const directIds = [notification.userId, notification.targetUserId, notification.volunteerId, notification.assignedTo]
        .filter(Boolean).map(String);
    const role = normalise(notification.targetRole);
    return directIds.includes(currentUser.uid) || role === "volunteer" || role === "all";
}

function renderNotifications() {
    const notifications = sortNewest(notificationRecords).slice(0, 8);
    const unread = notificationRecords.filter(notification => notification.read !== true);
    elements.unreadCount.textContent = unread.length;
    elements.navUnreadCount.textContent = unread.length;
    elements.navUnreadCount.classList.toggle("hidden", unread.length === 0);
    elements.markAllReadButton.disabled = unread.length === 0;

    if (!notifications.length) {
        elements.notificationList.innerHTML = '<div class="empty-state"><span>◉</span><h3>No notifications</h3><p>New assignments and updates will appear here.</p></div>';
        return;
    }

    elements.notificationList.innerHTML = notifications.map(notification => `
        <article class="notification-item ${notification.read === true ? "" : "unread"}">
            <span class="notice-dot"></span>
            <div>
                <h3>${escapeHtml(notification.title || "DRCS update")}</h3>
                <p>${escapeHtml(notification.message || "A new update is available.")}</p>
                <time>${escapeHtml(formatDate(notification.createdAt))}</time>
            </div>
        </article>`).join("");
}

function populateProfile(profile) {
    const name = profile.name || currentUser?.displayName || "Volunteer";
    elements.volunteerName.textContent = name;
    elements.profileName.textContent = name;
    elements.profileInitial.textContent = name.charAt(0).toUpperCase();
    elements.profileNameInput.value = name;
    elements.profilePhoneInput.value = profile.phone || "";
    elements.profileLocationInput.value = profile.location || profile.address || "";
    elements.profileSkillsInput.value = Array.isArray(profile.skills) ? profile.skills.join(", ") : (profile.skills || "");
    elements.profileBloodGroupInput.value = profile.bloodGroup || "";
    elements.profileEmergencyInput.value = profile.emergencyContact || "";
}

function openTaskModal(taskId) {
    const task = taskRecords.find(record => record.id === taskId);
    if (!task) return showMessage("The selected task could not be found.", "error");
    selectedTaskId = task.id;
    elements.modalTaskTitle.textContent = `${formatText(task.requestType, "Assistance")} Request`;
    elements.modalStatus.textContent = formatText(task.status, "Assigned");
    elements.modalPriority.textContent = formatText(task.priority, "Medium");
    elements.modalCitizen.textContent = task.requesterName || task.requesterEmail || "Citizen";
    elements.modalContact.textContent = task.contact || "Not provided";
    elements.modalLocation.textContent = [task.location, task.landmark].filter(Boolean).join(" — ") || "Not provided";
    elements.modalDescription.textContent = task.description || "No description provided.";
    const action = getNextAction(task.status);
    elements.modalTaskAction.classList.toggle("hidden", !action);
    elements.modalTaskAction.textContent = action?.label || "Update task";
    elements.taskModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
}

function closeTaskModal() {
    selectedTaskId = null;
    elements.taskModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
}

async function advanceTask(taskId) {
    const task = taskRecords.find(record => record.id === taskId);
    const action = task && getNextAction(task.status);
    if (!task || !action || !currentUser) return;

    const confirmed = window.confirm(`Change this task to ${formatText(action.nextStatus)}?`);
    if (!confirmed) return;

    elements.modalTaskAction.disabled = true;
    try {
        const batch = writeBatch(db);
        const taskUpdate = {
            status: action.nextStatus,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
        };
        if (action.nextStatus === "accepted") taskUpdate.acceptedAt = serverTimestamp();
        if (action.nextStatus === "in-progress") taskUpdate.startedAt = serverTimestamp();
        if (action.nextStatus === "completed") taskUpdate.completedAt = serverTimestamp();
        batch.update(doc(db, "requests", taskId), taskUpdate);

        const otherActiveTasks = taskRecords.filter(record =>
            record.id !== taskId && ["assigned", "accepted", "in-progress"].includes(taskStatus(record))
        );
        const completedAllTasks = action.nextStatus === "completed" && otherActiveTasks.length === 0;
        batch.update(doc(db, "users", currentUser.uid), {
            availability: completedAllTasks ? "available" : "busy",
            available: completedAllTasks,
            currentTaskId: completedAllTasks ? null : taskId,
            updatedAt: serverTimestamp()
        });
        await batch.commit();
        closeTaskModal();
        showMessage(`Task updated to ${formatText(action.nextStatus)}.`, "success");
    } catch (error) {
        console.error("Task update failed:", error);
        showMessage("The task could not be updated. Check your Firestore rules.", "error");
    } finally {
        elements.modalTaskAction.disabled = false;
    }
}

async function updateAvailability() {
    if (!currentUser || activeTasks().length) return;
    const availability = elements.availabilitySelect.value;
    elements.saveAvailabilityButton.disabled = true;
    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            availability,
            available: availability === "available",
            updatedAt: serverTimestamp()
        });
        showMessage(`Availability changed to ${formatText(availability)}.`, "success");
    } catch (error) {
        console.error("Availability update failed:", error);
        showMessage("Availability could not be updated.", "error");
    } finally {
        elements.saveAvailabilityButton.disabled = false;
    }
}

async function saveProfile(event) {
    event.preventDefault();
    if (!currentUser) return;
    const name = elements.profileNameInput.value.trim();
    const phone = elements.profilePhoneInput.value.trim();
    if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone)) {
        return showMessage("Enter a valid name and a 10-digit Indian mobile number.", "error");
    }
    elements.saveProfileButton.disabled = true;
    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            name,
            phone,
            location: elements.profileLocationInput.value.trim(),
            skills: elements.profileSkillsInput.value.trim(),
            bloodGroup: elements.profileBloodGroupInput.value.trim().toUpperCase(),
            emergencyContact: elements.profileEmergencyInput.value.trim(),
            updatedAt: serverTimestamp()
        });
        showMessage("Volunteer profile updated successfully.", "success");
    } catch (error) {
        console.error("Profile update failed:", error);
        showMessage("Your profile could not be updated.", "error");
    } finally {
        elements.saveProfileButton.disabled = false;
    }
}

async function markAllNotificationsRead() {
    if (!currentUser) return;
    const unread = notificationRecords.filter(notification => notification.read !== true);
    if (!unread.length) return;
    elements.markAllReadButton.disabled = true;
    try {
        const batch = writeBatch(db);
        unread.forEach(notification => batch.update(doc(db, "notifications", notification.id), {
            read: true,
            readAt: serverTimestamp()
        }));
        await batch.commit();
    } catch (error) {
        console.error("Notification update failed:", error);
        showMessage("Notifications could not be marked as read.", "error");
    }
}

function listenToProfile() {
    const unsubscribe = onSnapshot(doc(db, "users", currentUser.uid), snapshot => {
        if (!snapshot.exists()) return;
        currentProfile = snapshot.data();
        populateProfile(currentProfile);
        renderAvailability();
    }, error => {
        console.error("Profile listener error:", error);
        showMessage("Your volunteer profile could not be loaded.", "error");
    });
    unsubscribeListeners.push(unsubscribe);
}

function listenToTasks() {
    const unsubscribe = onSnapshot(collection(db, "requests"), snapshot => {
        taskRecords = snapshot.docs
            .map(requestDocument => ({ id: requestDocument.id, ...requestDocument.data() }))
            .filter(isAssignedToCurrentVolunteer);
        renderTaskSummary();
    }, error => {
        console.error("Task listener error:", error);
        elements.taskList.innerHTML = '<div class="empty-state"><span>!</span><h3>Tasks could not be loaded</h3><p>Check the Firestore rules and try again.</p></div>';
    });
    unsubscribeListeners.push(unsubscribe);
}

function listenToNotifications() {
    const unsubscribe = onSnapshot(collection(db, "notifications"), snapshot => {
        notificationRecords = snapshot.docs
            .map(notificationDocument => ({ id: notificationDocument.id, ...notificationDocument.data() }))
            .filter(isNotificationForVolunteer);
        renderNotifications();
    }, error => {
        console.error("Notification listener error:", error);
        elements.notificationList.innerHTML = '<div class="empty-state"><span>!</span><h3>Alerts could not be loaded</h3><p>Check the Firestore rules and try again.</p></div>';
    });
    unsubscribeListeners.push(unsubscribe);
}

function startListeners() {
    if (listenersStarted) return;
    listenersStarted = true;
    listenToProfile();
    listenToTasks();
    listenToNotifications();
}

elements.taskList.addEventListener("click", event => {
    const button = event.target.closest("[data-task-action]");
    if (!button) return;
    button.dataset.taskAction === "view" ? openTaskModal(button.dataset.taskId) : advanceTask(button.dataset.taskId);
});
elements.activeTaskContent.addEventListener("click", event => {
    const button = event.target.closest("[data-task-action]");
    if (!button) return;
    button.dataset.taskAction === "view" ? openTaskModal(button.dataset.taskId) : advanceTask(button.dataset.taskId);
});
elements.taskFilter.addEventListener("change", renderTaskList);
elements.saveAvailabilityButton.addEventListener("click", updateAvailability);
elements.profileForm.addEventListener("submit", saveProfile);
elements.markAllReadButton.addEventListener("click", markAllNotificationsRead);
elements.closeTaskModal.addEventListener("click", closeTaskModal);
elements.modalCloseButton.addEventListener("click", closeTaskModal);
elements.modalTaskAction.addEventListener("click", () => selectedTaskId && advanceTask(selectedTaskId));
elements.taskModal.addEventListener("click", event => event.target === elements.taskModal && closeTaskModal());
document.addEventListener("keydown", event => event.key === "Escape" && closeTaskModal());

elements.logoutButton.addEventListener("click", async () => {
    try {
        unsubscribeListeners.forEach(unsubscribe => unsubscribe());
        await signOut(auth);
        window.location.replace("login.html");
    } catch (error) {
        console.error("Logout failed:", error);
        showMessage("Logout failed. Please try again.", "error");
    }
});

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }
    currentUser = user;
    try {
        const profileSnapshot = await getDoc(doc(db, "users", user.uid));
        if (!profileSnapshot.exists()) throw new Error("Volunteer profile was not found.");
        currentProfile = profileSnapshot.data();
        if (normalise(currentProfile.role) !== "volunteer") throw new Error("This account does not have volunteer access.");
        populateProfile(currentProfile);
        if (!currentProfile.availability) {
            await updateDoc(doc(db, "users", user.uid), {
                availability: currentProfile.available === false ? "offline" : "available",
                updatedAt: serverTimestamp()
            });
        }
        startListeners();
    } catch (error) {
        console.error("Volunteer access error:", error);
        showMessage(error.message || "Volunteer access could not be verified.", "error");
        window.setTimeout(() => window.location.replace("login.html"), 1400);
    }
});

window.addEventListener("beforeunload", () => unsubscribeListeners.forEach(unsubscribe => unsubscribe()));
