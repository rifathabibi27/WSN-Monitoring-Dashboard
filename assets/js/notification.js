/* =====================================================
    NOTIFICATION CENTER
===================================================== */
const NotificationCenter = {
  initialized: false,
  storageKey: "wsnNotificationCenter",
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
  pulseTimeout: null,
};
function getNotificationLocale() {
  return Language.current === "en" ? "en-US" : "id-ID";
}
function currentNotificationTime() {
  const offset =
    typeof firebaseServerTimeOffset === "number" && firebaseServerTimeReady
      ? firebaseServerTimeOffset
      : 0;
  return Date.now() + offset;
}
function generateNotificationId() {
  return `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function syncNotificationUnreadCount() {
  NotificationCenter.unread = NotificationCenter.notifications.filter(
    (notification) => notification.read !== true,
  ).length;
}
function saveNotificationState() {
  try {
    syncNotificationUnreadCount();
    const payload = {
      notifications: NotificationCenter.notifications.slice(
        0,
        NotificationCenter.maxNotifications,
      ),
    };
    localStorage.setItem(
      NotificationCenter.storageKey,
      JSON.stringify(payload),
    );
  } catch (error) {
    console.warn("[Notification] Gagal menyimpan state:", error);
  }
}
function loadNotificationState() {
  try {
    const raw = localStorage.getItem(NotificationCenter.storageKey);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }
    if (Array.isArray(parsed.notifications)) {
      NotificationCenter.notifications = parsed.notifications
        .filter(
          (notification) =>
            notification && Number.isFinite(Number(notification.timestamp)),
        )
        .map((notification) => ({
          ...notification,
          id: notification.id ?? generateNotificationId(),
          /*
            Notification dari versi lama
            belum memiliki read state.
            Anggap sebagai READ agar deployment
            baru tidak tiba-tiba membuat seluruh
            histori lama menjadi unread.
            */
          read:
            typeof notification.read === "boolean" ? notification.read : true,
        }))
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
        .slice(0, NotificationCenter.maxNotifications);
    }
    syncNotificationUnreadCount();
  } catch (error) {
    console.warn("[Notification] Gagal memuat state:", error);
    NotificationCenter.notifications = [];
    NotificationCenter.unread = 0;
  }
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
  NotificationCenter.todayContainer = document.getElementById(
    "todayNotificationList",
  );
  NotificationCenter.yesterdayContainer = document.getElementById(
    "yesterdayNotificationList",
  );
  NotificationCenter.markAllReadButton = document.getElementById("markAllRead");
  NotificationCenter.badge = document.getElementById("notificationBadge");
  NotificationCenter.viewAllButton = document.getElementById(
    "notificationViewAll",
  );
  loadNotificationState();
  syncNotificationUnreadCount();
  NotificationCenter.initialized = true;
  initializeNotificationEvents();
  updateNotificationBadge();
  updateNotificationViewAllButton();
  setInterval(refreshNotificationRelativeTimes, 1000);
}
/* =====================================================
    BADGE
===================================================== */
function updateNotificationBadge() {
  if (!NotificationCenter.badge) {
    return;
  }
  syncNotificationUnreadCount();
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
    NotificationCenter.notifications.length > NotificationCenter.collapsedLimit;
  NotificationCenter.viewAllButton.classList.toggle("hidden", !hasMore);
  if (!hasMore) {
    NotificationCenter.expanded = false;
    return;
  }
  NotificationCenter.viewAllButton.textContent = NotificationCenter.expanded
    ? Language.get("notification.showLess")
    : Language.get("notification.viewAll");
}
/* =====================================================
    BELL PULSE
===================================================== */
function playNotificationPulse() {
  if (!NotificationCenter.toggle) {
    return;
  }
  NotificationCenter.toggle.classList.remove("notification-bell");
  void NotificationCenter.toggle.offsetWidth;
  NotificationCenter.toggle.classList.add("notification-bell");
  clearTimeout(NotificationCenter.pulseTimeout);
  NotificationCenter.pulseTimeout = setTimeout(() => {
    NotificationCenter.toggle.classList.remove("notification-bell");
  }, 800);
}
/* =====================================================
    NOTIFICATION EVENTS
===================================================== */
function initializeNotificationEvents() {
  NotificationCenter.toggle?.addEventListener("click", toggleNotificationPanel);
  document.addEventListener("click", handleNotificationOutsideClick);
  document.addEventListener("keydown", handleNotificationEscape);
  NotificationCenter.viewAllButton?.addEventListener(
    "click",
    toggleNotificationExpand,
  );
  NotificationCenter.markAllReadButton?.addEventListener(
    "click",
    handleMarkAllNotificationsRead,
  );
  NotificationCenter.todayContainer?.addEventListener(
    "click",
    handleNotificationCardClick,
  );
  NotificationCenter.yesterdayContainer?.addEventListener(
    "click",
    handleNotificationCardClick,
  );
}
function handleNotificationCardClick(event) {
  const card = event.target.closest("[data-notification-id]");
  if (!card) {
    return;
  }
  const notificationId = card.dataset.notificationId;
  const notification = NotificationCenter.notifications.find(
    (item) => item.id === notificationId,
  );
  if (!notification) {
    return;
  }
  if (notification.read === true) {
    return;
  }
  notification.read = true;
  syncNotificationUnreadCount();
  saveNotificationState();
  updateNotificationBadge();
  renderNotifications();
}
function handleMarkAllNotificationsRead(event) {
  event.preventDefault();
  event.stopPropagation();
  NotificationCenter.notifications.forEach((notification) => {
    notification.read = true;
  });
  syncNotificationUnreadCount();
  saveNotificationState();
  updateNotificationBadge();
  renderNotifications();
}
/* =====================================================
    TOGGLE PANEL
===================================================== */
function toggleNotificationPanel(event) {
  event.stopPropagation();
  NotificationCenter.opened = !NotificationCenter.opened;
  NotificationCenter.panel.classList.toggle(
    "hidden",
    !NotificationCenter.opened,
  );
  NotificationCenter.toggle.classList.toggle(
    "notification-active",
    NotificationCenter.opened,
  );
  if (NotificationCenter.opened) {
    syncNotificationUnreadCount();
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
  NotificationCenter.toggle.classList.remove("notification-active");
}
/* =====================================================
    ADD NOTIFICATION
===================================================== */
function addNotification(notification) {
  const stateKey = [
    notification.category,
    notification.room ?? "",
    notification.titleKey ?? notification.title ?? "",
  ].join("|");
  const currentState = JSON.stringify({
    severity: notification.severity,
    descriptionKey: notification.descriptionKey ?? "",
    description: notification.description ?? "",
  });
  const previousState = NotificationCenter.lastEventState[stateKey];
  if (previousState === currentState) {
    return;
  }
  NotificationCenter.lastEventState[stateKey] = currentState;
  NotificationCenter.notifications.unshift({
    id: notification.id ?? generateNotificationId(),
    title: notification.title ?? "Unknown Event",
    titleKey: notification.titleKey,
    category: notification.category ?? "System",
    room: notification.room ?? "-",
    values: notification.values ?? {},
    description: notification.description ?? "",
    descriptionKey: notification.descriptionKey,
    severity: notification.severity ?? "info",
    timestamp: notification.timestamp ?? currentNotificationTime(),
    read: false,
  });
  NotificationCenter.notifications.sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );
  while (
    NotificationCenter.notifications.length >
    NotificationCenter.maxNotifications
  ) {
    NotificationCenter.notifications.pop();
  }
  syncNotificationUnreadCount();
  saveNotificationState();
  updateNotificationBadge();
  playNotificationPulse();
  updateNotificationViewAllButton();
  renderNotifications();
}
/* =====================================================
    DASHBOARD BRIDGE
===================================================== */
function pushDashboardNotification(activity) {
  const roomKey = activity.values?.roomKey;
  const room = roomKey ? Language.get(roomKey) : "";
  addNotification({
    title: activity.title,
    titleKey: activity.titleKey,
    category: activity.category,
    room,
    values: activity.values,
    description: activity.description,
    descriptionKey: activity.descriptionKey,
    severity: activity.type,
    timestamp: activity.timestamp,
  });
}
function refreshNotificationLanguage() {
  NotificationCenter.notifications.forEach((notification) => {
    if (!notification.titleKey) {
      return;
    }
    const translatedValues = {
      ...(notification.values || {}),
    };
    if (translatedValues.roomKey) {
      translatedValues.room = Language.get(translatedValues.roomKey);
    }
    notification.title = Language.replace(
      Language.get(notification.titleKey),
      translatedValues,
    );
    notification.description = Language.replace(
      Language.get(notification.descriptionKey),
      translatedValues,
    );
  });
  renderNotifications();
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
    NotificationCenter.collapsedLimit,
  );
}
function formatNotificationTime(timestamp) {
  const date = new Date(timestamp);
  const locale = getNotificationLocale();
  return (
    date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }) +
    " " +
    Language.get("notification.at") +
    " " +
    date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    })
  );
}
function getRelativeNotificationTime(timestamp) {
  const seconds = Math.floor(
    (currentNotificationTime() - Number(timestamp)) / 1000,
  );
  if (seconds < 60) {
    return Language.get("notification.justNow");
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return Language.format("notification.minutesAgo", minutes);
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return Language.format("notification.hoursAgo", hours);
  }
  const days = Math.floor(hours / 24);
  return Language.format("notification.daysAgo", days);
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
    year: "numeric",
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
      dot: "theme-notification-dot-success",
    },
    warning: {
      item: "theme-notification-warning",
      icon: "theme-notification-icon-warning",
      dot: "theme-notification-dot-warning",
    },
    danger: {
      item: "theme-notification-danger",
      icon: "theme-notification-icon-danger",
      dot: "theme-notification-dot-danger",
    },
    info: {
      item: "theme-notification-info",
      icon: "theme-notification-icon-info",
      dot: "theme-notification-dot-info",
    },
  };
  return styles[severity] ?? styles.info;
}
/* =====================================================
    TOGGLE EXPAND
===================================================== */
function toggleNotificationExpand() {
  if (
    NotificationCenter.notifications.length <= NotificationCenter.collapsedLimit
  ) {
    return;
  }
  NotificationCenter.expanded = !NotificationCenter.expanded;
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
  notifications.forEach((notification) => {
    const style = getNotificationSeverityStyle(notification.severity);
    const notificationStateClass = notification.read
      ? "theme-notification-read"
      : "theme-notification-unread";
    const categoryKey = `notification.category.${notification.category}`;
    const categoryLabel = Language.get(categoryKey) || notification.category;
    const target = isYesterdayNotification(notification.timestamp)
      ? NotificationCenter.yesterdayContainer
      : NotificationCenter.todayContainer;
    target.innerHTML += `
        <div data-notification-id="${notification.id}" data-notification-read="${notification.read}" class="group cursor-pointer theme-notification-item
        rounded-xl${style.item} ${notificationStateClass} p-4">
            <div class="flex items-start gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${style.icon}">
                    <i class="bi bi-wifi"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-4">
                        <div class="theme-notification-title text-sm font-semibold">
                            ${notification.title}
                        </div>
                        <span class="theme-notification-chip ml-2 shrink-0 rounded-full px-2 py-1 text-[11px] font-medium"
                        data-notification-timestamp="${notification.timestamp}">
                            ${getRelativeNotificationTime(notification.timestamp)}
                        </span>
                    </div>
                    <div class="mt-2">
                        <span
                            class="theme-notification-category inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                            ${categoryLabel}
                        </span>
                    </div>
                    <div class="mt-2 space-y-1">
                        ${
                          notification.room
                            ? `
                            <div class="text-xs font-medium theme-notification-text">
                            ${notification.room}
                            </div>
                            `
                            : ""
                        }
                            ${
                              notification.description
                                ? `
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
function refreshNotificationRelativeTimes() {
  document
    .querySelectorAll("#notificationPanel [data-notification-timestamp]")
    .forEach((element) => {
      const timestamp = Number(element.dataset.notificationTimestamp);
      if (!Number.isFinite(timestamp)) {
        return;
      }
      element.textContent = getRelativeNotificationTime(timestamp);
    });
}
