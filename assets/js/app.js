/* =====================================================
    app.js
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});
function initializeApp() {
    Theme.initialize();
    Language.initialize();
    initializeMonitoring();
    initializeClock();
    initializeSidebar();
    initializeNavigation();
    initializeNotification();
    initializeDashboardActions();
    initializeRoomNavigation();
    initializeRoomSelector();
    updateSidebarState(null);
    toggleMonitoringMenu(false);
}
function isMobileLayout() {
    return window.innerWidth < mobileBreakpoint;
}
/* =====================================================
    SIDEBAR
===================================================== */
function initializeSidebar() {
    if (!sidebar || !toggleSidebar)
        return;
}
const sidebar = document.getElementById("sidebar");
const toggleSidebar = document.getElementById("toggleSidebar");
const sidebarOverlay =
    document.getElementById("sidebarOverlay");
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
    if (window.innerWidth >= mobileBreakpoint)
        return;
    if (
        !sidebar.contains(e.target)
        &&
        !toggleSidebar.contains(e.target)
    ) {
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
    if (!isMobileLayout())
        return;
    if (e.key !== "Escape")
        return;
    sidebar.classList.remove("show");
    sidebarOverlay.classList.remove("show");
});
/* =====================================================
    CLOCK
===================================================== */
const clockElement = document.getElementById("clockNow");
const dateElement = document.getElementById("dateNow");
function initializeClock() {
    updateClock();
    setInterval(updateClock, 1000);
}
function updateClock() {
    const now = new Date();
    const locale =
        Language?.current === "en"
            ? "en-US"
            : "id-ID";
    const dateOptions = {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    };
    dateElement.textContent =
        now.toLocaleDateString(
            locale,
            dateOptions
        );
    clockElement.textContent =
        now.toLocaleTimeString(
            locale
        );
}
/* =====================================================
    PAGE
===================================================== */
const pages = {
    dashboard:
        document.getElementById("dashboardPage"),
    monitoring:
        document.getElementById("monitoringPage"),
    history:
        document.getElementById("historyPage"),
    about:
        document.getElementById("aboutPage")
};
function hideAllPages() {
    Object.values(pages).forEach(page => {
        if (page) {
            page.classList.add("hidden");
        }
    });
}
function showPage(page) {
    if (
        typeof exitDashboardExploreMode === "function"
    ) {
        exitDashboardExploreMode();
    }
    if (
        typeof exitMonitoringExploreMode === "function"
    ) {
        exitMonitoringExploreMode();
    }
    if (page !== "monitoring" &&
        typeof restoreRoomChart === "function") {
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
    const mainContent =
        document.querySelector("main");
    if (!mainContent) {
        return;
    }
    mainContent.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
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
        openPage(
            "dashboard",
            menuDashboard
        );
    };
    menuMonitoring.onclick = () => {
        toggleMonitoringMenu();
        if (!monitoringSubmenu.classList.contains("hidden")) {
            openMonitoring("nodeA");
        }
    };
    menuHistory.onclick = () => {
        openPage(
            "history",
            menuHistory
        );
    };
    menuAbout.onclick = () => {
        openPage(
            "about",
            menuAbout
        );
    };
}
/* =====================================================
    DASHBOARD ACTIONS
===================================================== */
function initializeDashboardActions() {
    document
        .getElementById("heroMonitoringButton")
        ?.addEventListener("click", () => {
            openMonitoring(
                Dashboard.view.currentNode
            );
        });
    document
        .getElementById("dashboardMonitoringButton")
        ?.addEventListener("click", () => {
            openMonitoring(
                Dashboard.view.currentNode
            );
        });
}
/* =====================================================
    ROOM NAVIGATION
===================================================== */
function initializeRoomNavigation() {
    console.log("initializeRoomNavigation");
    document
        .querySelectorAll(".room-selector")
        .forEach(button => {
            console.log(
                "Bind :",
                button.dataset.room
            );
            button.addEventListener("click", () => {
                console.log(
                    "CLICK :",
                    button.dataset.room
                );
                openMonitoring(
                    button.dataset.room
                );
                closeResponsiveSidebar();
            });
        });
}
function activateMenu(active) {
    [
        menuDashboard,
        menuMonitoring,
        menuHistory,
        menuAbout
    ]
        .forEach(menu => {
            menu.classList.remove("active");
        });
    active.classList.add("active");
}
/* =====================================================
    SIDEBAR ACTIVE STATE
===================================================== */
function updateSidebarState(roomID = null) {
    document
        .querySelectorAll(".room-selector")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.room === roomID
            );
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
    if (!isMobileLayout())
        return;
    sidebar.classList.remove("show");
    sidebarOverlay.classList.remove("show");
}
function toggleMonitoringMenu(show = null) {
    if (!monitoringSubmenu)
        return;
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
    NODE SELECTOR
===================================================== */
const roomSelector = document.getElementById("roomSelector");
function initializeRoomSelector() {
    if (!roomSelector) return;
    roomSelector.addEventListener("change", () => {
        const room = roomSelector.value;
        loadRoom(room);
    });
}
function loadRoom(room) {
    console.log(
        "Load Room :",
        room
    );
}
/* =====================================================
    TOAST
===================================================== */
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
function showLoading(container) {
    container.innerHTML =
        `
    <div
        class="flex justify-center py-20">
        <div class="loading"></div>
    </div>
    `;
}
/* =====================================================
    PIN MODAL
===================================================== */
const pinModal = document.getElementById("pinModal");
const downloadButton = document.getElementById("downloadCSV");
const cancelDownload = document.getElementById("cancelDownload");
const confirmDownload = document.getElementById("confirmDownload");
const pinInput = document.getElementById("pinInput");
const pinError = document.getElementById("pinError");
const pinSubtitle = document.getElementById("pinSubtitle");
const pinForm = document.getElementById("pinForm");
const downloadLoading = document.getElementById("downloadLoading");
/* =====================================================
    PIN INPUT EVENT
===================================================== */
pinInput?.addEventListener("input", () => {
    pinError.classList.add("hidden");
    pinError.innerHTML = "";
    pinInput.classList.remove(
        "border-red-500",
        "ring-red-500"
    );
});
pinInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        confirmDownload.click();
    }
});
/* =====================================================
    OPEN MODAL
===================================================== */
downloadButton?.addEventListener("click", () => {
    pinModal.classList.remove("hidden");
    pinForm.classList.remove("hidden");
    downloadLoading.classList.add("hidden");
    pinSubtitle.innerHTML =
        "Masukkan PIN Administrator.";
    pinInput.value = "";
    pinError.classList.add("hidden");
    pinError.innerHTML = "";
    pinInput.classList.remove(
        "border-red-500",
        "ring-red-500"
    );
    pinInput.focus();
});
/* =====================================================
    CANCEL
===================================================== */
cancelDownload?.addEventListener("click", () => {
    pinModal.classList.add("hidden");
    pinForm.classList.remove("hidden");
    downloadLoading.classList.add("hidden");
    pinSubtitle.innerHTML =
        "Masukkan PIN Administrator.";
    pinInput.value = "";
    pinError.classList.add("hidden");
    pinError.innerHTML = "";
    pinInput.classList.remove(
        "border-red-500",
        "ring-red-500"
    );
});
/* =====================================================
    CONFIRM DOWNLOAD
===================================================== */
confirmDownload?.addEventListener("click", async () => {
    const pin = pinInput.value;
    if (pin === CONFIG.security.adminPin) {
        // sembunyikan form
        pinForm.classList.add("hidden");
        // tampilkan loading
        downloadLoading.classList.remove("hidden");
        pinSubtitle.innerHTML =
            "Sedang memproses export data...";
        try {
            await downloadCSV();
            pinModal.classList.add("hidden");
            pinInput.value = "";
        }
        catch (error) {
            console.error(error);
        }
        finally {
            // reset state modal
            pinForm.classList.remove("hidden");
            downloadLoading.classList.add("hidden");
        }
    }
    else {
        pinError.innerHTML = `
            <i class="bi bi-exclamation-circle-fill me-1"></i>
            PIN Administrator salah.
        `;
        pinError.classList.remove("hidden");
        pinInput.classList.add(
            "border-red-500",
            "ring-red-500"
        );
        pinInput.focus();
        pinInput.select();
    }
});
/* =====================================================
    DOWNLOAD CSV
===================================================== */
async function downloadCSV() {
    if (typeof downloadCSVFile !== "function") {
        console.error("downloadCSVFile() tidak ditemukan.");
        return;
    }
    await downloadCSVFile();
}
/* =====================================================
    FORMAT NUMBER
===================================================== */
function formatNumber(value, digit = 2) {
    return Number(value).toFixed(digit);
}
function formatDate(date) {
    return new Date(date)
        .toLocaleString(
            "id-ID"
        );
}
/* =====================================================
    STATUS DUST
===================================================== */
function dustStatus(value) {
    if (value <= 55) {
        return "Normal";
    }
    if (value <= 75) {
        return "Warning";
    }
    return "Danger";
}
/* =====================================================
    STATUS LIGHT
===================================================== */
function lightStatus(value) {
    if (value >= 250 && value <= 350) {
        return "Ideal";
    }
    if (value >= 150) {
        return "Warning";
    }
    return "Danger";
}
function statusColor(status) {
    switch (status) {
        case "Normal":
        case "Ideal":
            return "status-normal";
        case "Warning":
            return "status-warning";
        default:
            return "status-danger";
    }
}
/* =====================================================
    UPDATE CARD
===================================================== */
function updateCard(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = formatNumber(value);
}
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}