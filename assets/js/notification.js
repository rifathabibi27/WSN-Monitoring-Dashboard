/* =====================================================
    NOTIFICATION CENTER
===================================================== */
const NotificationCenter = {
    initialized: false,
    opened: false,
    unread: 0,
    badgeVisible: false,
    notifications: [],
    maxNotifications: 50,
    lastEventState: {},
    collapsedLimit: 5,
    expanded: false,
    toggle: null,
    panel: null,
    todayContainer: null,
    yesterdayContainer: null,
    markAllReadButton: null,
    badge: null,
    pulseTimeout: null
};
const ActivityStore = {
    activities: [],
    activityCache: new Set()
};
function getNotificationLocale() {
    return Language.current === "en"
        ? "en-US"
        : "id-ID";
}
/* =====================================================
    INITIALIZE NOTIFICATION
===================================================== */
function initializeNotification() {
    if (NotificationCenter.initialized) {
        return;
    }
    NotificationCenter.toggle = document.getElementById("notificationToggle");
    NotificationCenter.panel = document.getElementById("notificationPanel");
    NotificationCenter.todayContainer = document.getElementById("todayNotificationList");
    NotificationCenter.yesterdayContainer = document.getElementById("yesterdayNotificationList");
    NotificationCenter.markAllReadButton = document.getElementById("markAllRead");
    NotificationCenter.badge = document.getElementById("notificationBadge");
    NotificationCenter.viewAllButton = document.getElementById("notificationViewAll");
    NotificationCenter.initialized = true;
    initializeNotificationEvents();
    updateNotificationBadge();
    updateNotificationViewAllButton();
}
/* =====================================================
    BADGE
===================================================== */
function updateNotificationBadge() {
    if (!NotificationCenter.badge) {
        return;
    }
    if (NotificationCenter.unread > 0) {
        NotificationCenter.badge.classList.remove("hidden");
    } else {
        NotificationCenter.badge.classList.add("hidden");
    }
}
/* =====================================================
    VIEW ALL BUTTON
===================================================== */
function updateNotificationViewAllButton() {
    if (!NotificationCenter.viewAllButton) {
        return;
    }
    const hasMore =
        NotificationCenter.notifications.length >
        NotificationCenter.collapsedLimit;
    NotificationCenter.viewAllButton.classList.toggle(
        "hidden",
        !hasMore
    );
    if (!hasMore) {
        NotificationCenter.expanded = false;
        return;
    }
    NotificationCenter.viewAllButton.textContent =
        NotificationCenter.expanded
            ? Language.get("notification.showLess")
            : Language.get("notification.viewAll")
}
/* =====================================================
    BELL PULSE
===================================================== */
function playNotificationPulse() {
    if (!NotificationCenter.toggle) {
        return;
    }
    NotificationCenter.toggle.classList.remove(
        "notification-bell"
    );
    void NotificationCenter.toggle.offsetWidth;
    NotificationCenter.toggle.classList.add(
        "notification-bell"
    );
    clearTimeout(
        NotificationCenter.pulseTimeout
    );
    NotificationCenter.pulseTimeout =
        setTimeout(() => {
            NotificationCenter.toggle.classList.remove(
                "notification-bell"
            );
        }, 800);
}
/* =====================================================
    NOTIFICATION EVENTS
===================================================== */
function initializeNotificationEvents() {
    NotificationCenter.toggle?.addEventListener(
        "click",
        toggleNotificationPanel
    );
    document.addEventListener(
        "click",
        handleNotificationOutsideClick
    );
    document.addEventListener(
        "keydown",
        handleNotificationEscape
    );
    NotificationCenter.viewAllButton?.addEventListener(
        "click",
        toggleNotificationExpand
    );
}
/* =====================================================
    TOGGLE PANEL
===================================================== */
function toggleNotificationPanel(event) {
    event.stopPropagation();
    NotificationCenter.opened = !NotificationCenter.opened;
    NotificationCenter.panel.classList.toggle(
        "hidden",
        !NotificationCenter.opened
    );
    NotificationCenter.toggle.classList.toggle(
        "notification-active",
        NotificationCenter.opened
    );
    if (NotificationCenter.opened) {
        NotificationCenter.unread = 0;
        updateNotificationBadge();
        renderNotifications();
    }
}
/* =====================================================
    OUTSIDE CLICK
===================================================== */
function handleNotificationOutsideClick(event) {
    if (!NotificationCenter.opened) {
        return;
    }
    if (
        NotificationCenter.panel.contains(event.target) ||
        NotificationCenter.toggle.contains(event.target)
    ) {
        return;
    }
    closeNotificationPanel();
}
/* =====================================================
    ESCAPE
===================================================== */
function handleNotificationEscape(event) {
    if (event.key !== "Escape") {
        return;
    }
    closeNotificationPanel();
}
/* =====================================================
    CLOSE PANEL
===================================================== */
function closeNotificationPanel() {
    NotificationCenter.opened = false;
    NotificationCenter.panel.classList.add("hidden");
    NotificationCenter.toggle.classList.remove(
        "notification-active"
    );
}
/* =====================================================
    ADD NOTIFICATION
===================================================== */
function addNotification(notification) {
    const stateKey = [
        notification.category,
        notification.title
    ].join("|");
    const currentState = JSON.stringify({
        severity: notification.severity,
        description: notification.description
    });
    if (
        NotificationCenter.lastEventState[stateKey] === currentState
    ) {
        return;
    }
    NotificationCenter.lastEventState[stateKey] = currentState;
    NotificationCenter.notifications.unshift({
        title: notification.title ?? "Unknown Event",
        category: notification.category ?? "System",
        room: notification.room ?? "-",
        description: notification.description ?? "",
        severity: notification.severity ?? "info",
        timestamp: notification.timestamp ?? Date.now()
    });
    NotificationCenter.notifications.sort(
        (a, b) => b.timestamp - a.timestamp
    );
    while (
        NotificationCenter.notifications.length >
        NotificationCenter.maxNotifications
    ) {
        NotificationCenter.notifications.pop();
    }
    NotificationCenter.unread++;
    updateNotificationBadge();
    playNotificationPulse();
    updateNotificationViewAllButton();
    renderNotifications();
}
/* =====================================================
    DASHBOARD BRIDGE
===================================================== */
function pushDashboardNotification(activity) {
    addNotification({
        title: activity.title,
        category: activity.category,
        room: "",
        description: activity.description,
        severity: activity.type,
        timestamp: activity.timestamp
    });
}
/* =====================================================
    GET VISIBLE NOTIFICATIONS
===================================================== */
function getVisibleNotifications() {
    if (NotificationCenter.expanded) {
        return NotificationCenter.notifications;
    }
    return NotificationCenter.notifications.slice(
        0,
        NotificationCenter.collapsedLimit
    );
}
function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    return (
        date.toLocaleDateString(
            getNotificationLocale(),
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        )
        + " "
        + Language.get("notification.at")
        + " "
        + date.toLocaleTimeString(
            getNotificationLocale(),
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }
        )
    );
}
function getRelativeNotificationTime(timestamp) {
    const seconds =
        Math.floor(
            (Date.now() - timestamp) / 1000
        );
    if (seconds < 60) {
        return Language.get(
            "notification.justNow"
        );
    }
    const minutes =
        Math.floor(seconds / 60);
    if (minutes < 60) {
        return Language.format(
            "notification.minutesAgo",
            minutes
        );
    }
    const hours =
        Math.floor(minutes / 60);
    if (hours < 24) {
        return Language.format(
            "notification.hoursAgo",
            hours
        );
    }
    const days =
        Math.floor(hours / 24);
    return Language.format(
        "notification.daysAgo",
        days
    );
}
function isTodayNotification(timestamp) {
    const today = new Date();
    const date = new Date(timestamp);
    return (
        today.getFullYear() === date.getFullYear() &&
        today.getMonth() === date.getMonth() &&
        today.getDate() === date.getDate()
    );
}
function isYesterdayNotification(timestamp) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(timestamp);
    return (
        yesterday.getFullYear() === date.getFullYear() &&
        yesterday.getMonth() === date.getMonth() &&
        yesterday.getDate() === date.getDate()
    );
}
function getNotificationGroup(timestamp) {
    if (isTodayNotification(timestamp)) {
        return Language.get("notification.today");
    }
    if (isYesterdayNotification(timestamp)) {
        return Language.get("notification.yesterday");
    }
    const date = new Date(timestamp);
    return date.toLocaleDateString(getNotificationLocale(), {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}
/* =====================================================
    SEVERITY STYLE
===================================================== */
function getNotificationSeverityStyle(severity) {
    const styles = {
        success: {
            item: "theme-notification-success",
            icon: "theme-notification-icon-success",
            dot: "theme-notification-dot-success"
        },
        warning: {
            item: "theme-notification-warning",
            icon: "theme-notification-icon-warning",
            dot: "theme-notification-dot-warning"
        },
        danger: {
            item: "theme-notification-danger",
            icon: "theme-notification-icon-danger",
            dot: "theme-notification-dot-danger"
        },
        info: {
            item: "theme-notification-info",
            icon: "theme-notification-icon-info",
            dot: "theme-notification-dot-info"
        }
    };
    return styles[severity] ?? styles.info;
}
/* =====================================================
    TOGGLE EXPAND
===================================================== */
function toggleNotificationExpand() {
    if (
        NotificationCenter.notifications.length <=
        NotificationCenter.collapsedLimit
    ) {
        return;
    }
    NotificationCenter.expanded =
        !NotificationCenter.expanded;
    updateNotificationViewAllButton();
    renderNotifications();
}
/* =====================================================
    RENDER NOTIFICATION
===================================================== */
function renderNotifications() {
    const notifications = getVisibleNotifications();
    updateNotificationViewAllButton();
    NotificationCenter.todayContainer.innerHTML = "";
    NotificationCenter.yesterdayContainer.innerHTML = "";
    notifications.forEach(notification => {
        const style = getNotificationSeverityStyle(
            notification.severity
        );
        const target = isYesterdayNotification(notification.timestamp)
            ? NotificationCenter.yesterdayContainer
            : NotificationCenter.todayContainer;
        target.innerHTML += `
        <div
            class="group cursor-pointer theme-notification-item rounded-xl${style.item} p-4">
            <div class="flex items-start gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${style.icon}">
                    <i class="bi bi-wifi"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-4">
                        <div class="theme-notification-title text-sm font-semibold">
                            ${notification.title}
                        </div>
                        <span class="theme-notification-chip ml-2 shrink-0 rounded-full px-2 py-1 text-[11px] font-medium">
                            ${getRelativeNotificationTime(notification.timestamp)}
                        </span>
                    </div>
                    <div class="mt-2">
                        <span
                            class="theme-notification-category inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                            ${notification.category}
                        </span>
                    </div>
                    <div class="mt-2 space-y-1">
                        ${notification.room ? `
                            <div class="text-xs font-medium theme-notification-text">
                            ${notification.room}
                            </div>
                            `
                : ""
            }
                            ${notification.description ? `
                            <div class="text-xs theme-notification-text">
                            ${notification.description}
                            </div>
                            `
                : ""
            }
                        </div>
                    <div class="mt-3 flex items-center gap-2 text-xs theme-notification-muted">
                        <span>
                            ${formatNotificationTime(notification.timestamp)}
                        </span>
                        <span class="h-1.5 w-1.5 rounded-full ${style.dot}"></span>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
}
/* =====================================================
    GET RECENT ACTIVITIES
===================================================== */
function getRecentActivities(limit = 5) {
    return NotificationCenter.activities.slice(0, limit);
}
/* =====================================================
    GET ALL ACTIVITIES
===================================================== */
function getAllActivities() {
    return NotificationCenter.activities;
}