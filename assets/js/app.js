/* =====================================================
    app.js
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});
function initializeApp() {
  Bootstrap.initialize();
  [
    Bootstrap.Module.THEME,
    Bootstrap.Module.LANGUAGE,
    Bootstrap.Module.FIREBASE,
    Bootstrap.Module.DASHBOARD,
    Bootstrap.Module.MONITORING,
    Bootstrap.Module.HISTORY,
  ].forEach(Bootstrap.register.bind(Bootstrap));
  Bootstrap.setStage(Bootstrap.Stage.UI);
  Theme.initialize();
  Language.initialize();
  initializeMonitoring();
  initializeDashboard();
  initializeHistory();
  initializeScrollbar();
  initializeClock();
  initializeSidebar();
  initializeNavigation();
  initializeNotification();
  initializeDashboardActions();
  initializeRoomNavigation();
  updateSidebarState(null);
  toggleMonitoringMenu(false);
}
const Scrollbar = {
  timer: null,
  initialize() {
    const showScrollbar = () => {
      document.body.classList.add("scrollbar-active");
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        document.body.classList.remove("scrollbar-active");
      }, 1200);
    };
    window.addEventListener("scroll", showScrollbar, {
      passive: true,
    });
    window.addEventListener("wheel", showScrollbar, {
      passive: true,
    });
    window.addEventListener("touchmove", showScrollbar, {
      passive: true,
    });
  },
};
/* =====================================================
    SIDEBAR
===================================================== */
function isMobileLayout() {
  return window.innerWidth < mobileBreakpoint;
}
function initializeSidebar() {
  if (!sidebar || !toggleSidebar) return;
}
const sidebar = document.getElementById("sidebar");
const toggleSidebar = document.getElementById("toggleSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const mobileBreakpoint = 1024;
const monitoringSubmenu = document.getElementById("monitoringSubmenu");
toggleSidebar.addEventListener("click", () => {
  if (isMobileLayout()) {
    sidebar.classList.remove("collapsed");
    sidebar.classList.toggle("show");
    sidebarOverlay.classList.toggle("show");
    requestAnimationFrame(() => {
      toggleSidebar.blur();
    });
    return;
  }
  sidebar.classList.toggle("collapsed");
  toggleSidebar.blur();
  requestAnimationFrame(() => {
    toggleSidebar.blur();
  });
});
document.addEventListener("click", (e) => {
  if (window.innerWidth >= mobileBreakpoint) return;
  if (!sidebar.contains(e.target) && !toggleSidebar.contains(e.target)) {
    sidebar.classList.remove("show");
    sidebarOverlay.classList.remove("show");
  }
});
window.addEventListener("resize", () => {
  if (!isMobileLayout()) {
    sidebar.classList.remove("collapsed");
  } else {
    sidebar.classList.remove("show");
    sidebarOverlay.classList.remove("show");
  }
});
document.addEventListener("keydown", (e) => {
  if (!isMobileLayout()) return;
  if (e.key !== "Escape") return;
  sidebar.classList.remove("show");
  sidebarOverlay.classList.remove("show");
});
/* =====================================================
    CLOCK
===================================================== */
const clockElement = document.getElementById("clockNow");
const dateElement = document.getElementById("dateNow");
let firebaseServerTimeOffset = 0;
let firebaseServerTimeReady = false;
function initializeClock() {
  /*
  =====================================================
  FIREBASE SERVER CLOCK
  =====================================================
  Firebase menyediakan offset antara waktu client
  dengan waktu server Firebase melalui:
  .info/serverTimeOffset
  */
  if (typeof db !== "undefined" && db) {
    db.ref(".info/serverTimeOffset").on(
      "value",
      (snapshot) => {
        const offset = Number(snapshot.val());
        firebaseServerTimeOffset = Number.isFinite(offset) ? offset : 0;
        firebaseServerTimeReady = true;
        updateClock();
      },
      (error) => {
        console.warn("Firebase server time offset gagal:", error);
        firebaseServerTimeReady = false;
        updateClock();
      },
    );
  }
  updateClock();
  setInterval(updateClock, 1000);
}
function updateClock() {
  /*
  =====================================================
  TIME SOURCE
  =====================================================
  Gunakan Firebase Server Time sebagai authority.
  Date.now() hanya menjadi base time client.
  Server offset digunakan untuk mengoreksi perbedaan
  clock komputer/browser.
  */
  const nowTimestamp =
    Date.now() + (firebaseServerTimeReady ? firebaseServerTimeOffset : 0);
  const now = new Date(nowTimestamp);
  const locale = Language?.current === "en" ? "en-US" : "id-ID";
  const dateOptions = {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  };
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  };
  dateElement.textContent = now.toLocaleDateString(locale, dateOptions);
  clockElement.textContent =
    now.toLocaleTimeString(locale, timeOptions) + " WIB";
}
/* =====================================================
    PAGE
===================================================== */
const pages = {
  dashboard: document.getElementById("dashboardPage"),
  monitoring: document.getElementById("monitoringPage"),
  history: document.getElementById("historyPage"),
  about: document.getElementById("aboutPage"),
};
function hideAllPages() {
  Object.values(pages).forEach((page) => {
    if (page) {
      page.classList.add("hidden");
    }
  });
}
function showPage(page) {
  if (typeof exitDashboardExploreMode === "function") {
    exitDashboardExploreMode();
  }
  if (typeof exitMonitoringExploreMode === "function") {
    exitMonitoringExploreMode();
  }
  if (page !== "monitoring" && typeof restoreRoomChart === "function") {
    restoreRoomChart();
  }
  hideAllPages();
  if (!pages[page]) {
    console.warn("Page tidak ditemukan :", page);
    return;
  }
  pages[page].classList.remove("hidden");
  if (typeof Dashboard !== "undefined") {
    if (page === "dashboard") {
      Dashboard.active = true;
      if (typeof startDashboardRealtime === "function") {
        startDashboardRealtime();
      }
    } else {
      Dashboard.active = false;
      if (typeof stopDashboardRealtime === "function") {
        stopDashboardRealtime();
      }
    }
  }
}
/* =====================================================
    SCROLL TO TOP
===================================================== */
function scrollToTop() {
  const mainContent = document.querySelector("main");
  if (!mainContent) {
    return;
  }
  mainContent.scrollTo({
    top: 0,
    left: 0,
    behavior: "instant",
  });
}
/* =====================================================
    OPEN MONITORING ROOM
===================================================== */
function openMonitoring(roomID = "nodeA") {
  showPage("monitoring");
  scrollToTop();
  activateMenu(menuMonitoring);
  updateSidebarState(roomID);
  changeRoom(roomID);
}
const menuDashboard = document.getElementById("menuDashboard");
const menuMonitoring = document.getElementById("menuMonitoring");
const menuHistory = document.getElementById("menuHistory");
const menuAbout = document.getElementById("menuAbout");
function initializeNavigation() {
  menuDashboard.onclick = () => {
    openPage("dashboard", menuDashboard);
  };
  menuMonitoring.onclick = () => {
    const isMonitoringPageActive =
      pages.monitoring && !pages.monitoring.classList.contains("hidden");
    toggleMonitoringMenu();
    // Jika user baru berpindah dari Dashboard/Page lain ke Monitoring,
    // gunakan Node A sebagai room default.
    //
    // Jika user sudah berada di halaman Monitoring, jangan ubah currentRoom
    // hanya karena submenu dibuka atau ditutup.
    if (
      !isMonitoringPageActive &&
      !monitoringSubmenu.classList.contains("hidden")
    ) {
      openMonitoring("nodeA");
    }
  };
  menuHistory.onclick = () => {
    openPage("history", menuHistory);
  };
  menuAbout.onclick = () => {
    openPage("about", menuAbout);
  };
}
/* =====================================================
    DASHBOARD ACTIONS
===================================================== */
function initializeDashboardActions() {
  document
    .getElementById("heroMonitoringButton")
    ?.addEventListener("click", () => {
      openMonitoring(Dashboard.view.currentNode);
    });
  document
    .getElementById("dashboardMonitoringButton")
    ?.addEventListener("click", () => {
      openMonitoring(Dashboard.view.currentNode);
    });
}
/* =====================================================
    ROOM NAVIGATION
===================================================== */
function initializeRoomNavigation() {
  document.querySelectorAll(".room-selector").forEach((button) => {
    button.addEventListener("click", () => {
      openMonitoring(button.dataset.room);
      closeResponsiveSidebar();
    });
  });
}
function activateMenu(active) {
  [menuDashboard, menuMonitoring, menuHistory, menuAbout].forEach((menu) => {
    menu.classList.remove("active");
  });
  active.classList.add("active");
}
/* =====================================================
    SIDEBAR ACTIVE STATE
===================================================== */
function updateSidebarState(roomID = null) {
  document.querySelectorAll(".room-selector").forEach((button) => {
    button.classList.toggle("active", button.dataset.room === roomID);
  });
}
function openPage(page, activeMenu) {
  showPage(page);
  scrollToTop();
  activateMenu(activeMenu);
  if (page !== "monitoring") {
    updateSidebarState(null);
    toggleMonitoringMenu(false);
  }
  closeResponsiveSidebar();
}
function closeResponsiveSidebar() {
  if (!isMobileLayout()) return;
  sidebar.classList.remove("show");
  sidebarOverlay.classList.remove("show");
}
function toggleMonitoringMenu(show = null) {
  if (!monitoringSubmenu) return;
  if (show === true) {
    monitoringSubmenu.classList.remove("hidden");
    return;
  }
  if (show === false) {
    monitoringSubmenu.classList.add("hidden");
    return;
  }
  monitoringSubmenu.classList.toggle("hidden");
}
/* =====================================================
   SCROLLBAR
===================================================== */
let appScrollbar = null;
function initializeScrollbar() {
  const container = document.getElementById("appScrollArea");
  if (!container) {
    return;
  }
  appScrollbar = OverlayScrollbarsGlobal.OverlayScrollbars(container, {
    scrollbars: {
      autoHide: "leave",
      autoHideDelay: 500,
      theme: "os-theme-dark",
      clickScroll: true,
    },
  });
}
