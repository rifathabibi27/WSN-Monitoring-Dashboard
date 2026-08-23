// /* ===========================================================
//    FIREBASE.JS
//    Monitoring Debu & Cahaya Berbasis WSN
//    -----------------------------------------------------------
//    Tugas File:
//    1. Koneksi Firebase
//    2. Listener Realtime Database
//    3. Sinkronisasi data ke Monitoring
//    4. Sinkronisasi Dashboard
//    5. Sinkronisasi History
// =========================================================== */
/* ===========================================================
   FIREBASE CONFIG
=========================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDjlduyA6bumAHVw-QZyzfnqWQPuJlWpSc",
  authDomain: "jte-iot-monitoring.firebaseapp.com",
  databaseURL:
    "https://jte-iot-monitoring-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jte-iot-monitoring",
  storageBucket: "jte-iot-monitoring.firebasestorage.app",
  messagingSenderId: "857454088913",
  appId: "1:857454088913:web:d1e84cf73e60ec5aacabf0",
};
/* ===========================================================
   INITIALIZE FIREBASE
=========================================================== */
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
/* ===========================================================
   GLOBAL AUTH STATE
=========================================================== */
window.appState = window.appState || {};
window.appState.auth = {
  status: "checking",
  user: null,
  uid: null,
  email: null,
  isAdmin: false,
};
/* ===========================================================
   AUTH PERSISTENCE
   SESSION:
   - Refresh halaman  → tetap login
   - Tutup tab        → sesi berakhir
=========================================================== */
const authPersistenceReady = auth
  .setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .then(() => {
    console.log("Firebase Auth: SESSION persistence aktif.");
  })
  .catch((error) => {
    console.error("Firebase Auth: Gagal mengatur SESSION persistence.", error);
    throw error;
  });
/* ===========================================================
   UPDATE ADMIN AUTH UI
=========================================================== */
function updateAdminAuthUI(user) {
  const toggle = document.getElementById("adminAuthToggle");
  const icon = document.getElementById("adminAuthIcon");
  const dot = document.getElementById("adminAuthDot");
  const label = document.getElementById("adminAuthLabel");
  const email = document.getElementById("adminAuthEmail");
  const panel = document.getElementById("adminAuthPanel");
  if (!toggle || !icon || !dot || !label || !email) {
    return;
  }
  /* ======================================================
     ADMIN LOGIN
  ====================================================== */
  if (user) {
    toggle.classList.add("admin-auth-logged-in");
    icon.className = "bi bi-person-circle admin-auth-icon";
    label.textContent = "Administrator sedang login";
    toggle.setAttribute("aria-label", "Administrator sedang login");
    toggle.setAttribute("title", "Administrator sedang login");
    email.textContent = user.email || "Administrator";
    return;
  }
  /* ======================================================
     ADMIN LOGOUT
  ====================================================== */
  toggle.classList.remove("admin-auth-logged-in");
  icon.className = "bi bi-person-circle admin-auth-icon";
  label.textContent = "Login Administrator";
  toggle.setAttribute("aria-label", "Login Administrator");
  toggle.setAttribute("title", "Login Administrator");
  email.textContent = "--";
  if (panel) {
    panel.classList.add("hidden");
  }
  toggle.setAttribute("aria-expanded", "false");
}
/* ===========================================================
   LOGIN MODAL
=========================================================== */
function openAdminLoginModal() {
  const modal = document.getElementById("adminLoginModal");
  const error = document.getElementById("adminLoginError");
  const password = document.getElementById("adminLoginPassword");
  if (!modal) return;
  if (error) {
    error.textContent = "";
    error.classList.add("hidden");
  }
  if (password) {
    password.value = "";
  }
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  const email = document.getElementById("adminLoginEmail");
  if (email) {
    email.focus();
  }
}
function closeAdminLoginModal() {
  const modal = document.getElementById("adminLoginModal");
  const error = document.getElementById("adminLoginError");
  if (!modal) return;
  modal.classList.remove("flex");
  modal.classList.add("hidden");
  if (error) {
    error.textContent = "";
    error.classList.add("hidden");
  }
}
/* ===========================================================
   LOGIN ADMIN
=========================================================== */
async function loginAdmin(event) {
  event.preventDefault();
  const emailInput = document.getElementById("adminLoginEmail");
  const passwordInput = document.getElementById("adminLoginPassword");
  const error = document.getElementById("adminLoginError");
  const submitButton = document.getElementById("submitAdminLogin");
  if (!emailInput || !passwordInput) {
    return;
  }
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    if (error) {
      error.textContent = "Email dan password wajib diisi.";
      error.classList.remove("hidden");
    }
    return;
  }
  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add("opacity-60", "cursor-not-allowed");
      submitButton.querySelector("span").textContent = "Memproses...";
    }
    /* ======================================================
       Pastikan SESSION persistence selesai
    ====================================================== */
    await authPersistenceReady;
    /* ======================================================
       LOGIN FIREBASE
    ====================================================== */
    await auth.signInWithEmailAndPassword(email, password);
    /* ======================================================
       onAuthStateChanged() akan memperbarui state
    ====================================================== */
    closeAdminLoginModal();
    console.log("Admin login berhasil.");
  } catch (loginError) {
    console.error("Admin login error:", loginError);
    if (error) {
      let message = "Login Administrator gagal.";
      switch (loginError.code) {
        case "auth/invalid-email":
          message = "Format email tidak valid.";
          break;
        case "auth/user-not-found":
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/invalid-login-credentials":
          message = "Email atau password Administrator salah.";
          break;
        case "auth/user-disabled":
          message = "Akun Administrator dinonaktifkan.";
          break;
        case "auth/too-many-requests":
          message = "Terlalu banyak percobaan login. Silakan coba lagi nanti.";
          break;
        case "auth/network-request-failed":
          message = "Koneksi Firebase gagal. Periksa koneksi internet.";
          break;
        default:
          message = "Login Administrator gagal.";
          break;
      }
      error.textContent = message;
      error.classList.remove("hidden");
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("opacity-60", "cursor-not-allowed");
      submitButton.querySelector("span").textContent = "Login";
    }
  }
}
/* ===========================================================
   LOGOUT ADMIN
=========================================================== */
async function logoutAdmin() {
  try {
    await auth.signOut();
    console.log("Firebase Auth: Admin logout berhasil.");
    const panel = document.getElementById("adminAuthPanel");
    if (panel) {
      panel.classList.add("hidden");
    }
  } catch (logoutError) {
    console.error("Admin logout error:", logoutError);
  }
}
/* ===========================================================
   INITIALIZE ADMIN AUTH UI
=========================================================== */
function initializeAdminAuthUI() {
  const toggle = document.getElementById("adminAuthToggle");
  const panel = document.getElementById("adminAuthPanel");
  const loginModal = document.getElementById("adminLoginModal");
  const closeButton = document.getElementById("closeAdminLoginModal");
  const cancelButton = document.getElementById("cancelAdminLogin");
  const loginForm = document.getElementById("adminLoginForm");
  const logoutButton = document.getElementById("adminLogoutButton");
  if (!toggle || !panel || !loginModal || !loginForm) {
    console.warn("Admin Auth UI: Elemen belum tersedia.");
    return;
  }
  /* ======================================================
     TOGGLE HEADER
  ====================================================== */
  toggle.addEventListener("click", () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      openAdminLoginModal();
      return;
    }
    const isHidden = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    toggle.setAttribute("aria-expanded", String(isHidden));
  });
  /* ======================================================
     LOGOUT
  ====================================================== */
  if (logoutButton) {
    logoutButton.addEventListener("click", logoutAdmin);
  }
  /* ======================================================
     LOGIN SUBMIT
  ====================================================== */
  loginForm.addEventListener("submit", loginAdmin);
  /* ======================================================
     CLOSE LOGIN
  ====================================================== */
  if (closeButton) {
    closeButton.addEventListener("click", closeAdminLoginModal);
  }
  if (cancelButton) {
    cancelButton.addEventListener("click", closeAdminLoginModal);
  }
  /* ======================================================
     CLICK OVERLAY
  ====================================================== */
  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeAdminLoginModal();
    }
  });
  /* ======================================================
     ESC
  ====================================================== */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!loginModal.classList.contains("hidden")) {
        closeAdminLoginModal();
      }
      panel.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
  /* ======================================================
     CLICK OUTSIDE ACCOUNT PANEL
  ====================================================== */
  document.addEventListener("click", (event) => {
    if (panel.classList.contains("hidden")) {
      return;
    }
    if (!toggle.contains(event.target) && !panel.contains(event.target)) {
      panel.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}
/* ===========================================================
   AUTHENTICATION STATE
=========================================================== */
auth.onAuthStateChanged((user) => {
  if (user) {
    /* ======================================================
       UPDATE GLOBAL AUTH STATE
    ====================================================== */
    window.appState.auth.status = "signed_in";
    window.appState.auth.user = user;
    window.appState.auth.uid = user.uid;
    window.appState.auth.email = user.email || null;
    window.appState.auth.isAdmin = true;
    console.log("Firebase Auth: SIGNED IN");
    console.log("UID:", user.uid);
    console.log("Email:", user.email);
    /* ======================================================
       UPDATE HEADER UI
    ====================================================== */
    updateAdminAuthUI(user);
    /* ======================================================
       PROCESS PENDING ACTION
       Hanya dijalankan setelah status benar-benar
       signed_in.
    ====================================================== */
    const pendingAction = window.appState.auth.pendingAction;
    const onLoginSuccess = window.appState.auth.onLoginSuccess;
    if (pendingAction && typeof onLoginSuccess === "function") {
      window.appState.auth.pendingAction = null;
      onLoginSuccess(pendingAction);
    }
  } else {
    /* ======================================================
       UPDATE GLOBAL AUTH STATE
    ====================================================== */
    window.appState.auth.status = "signed_out";
    window.appState.auth.user = null;
    window.appState.auth.uid = null;
    window.appState.auth.email = null;
    window.appState.auth.isAdmin = false;
    window.appState.auth.pendingAction = null;
    console.log("Firebase Auth: SIGNED OUT");
    /* ======================================================
       UPDATE HEADER UI
    ====================================================== */
    updateAdminAuthUI(null);
  }
});
/* ===========================================================
   AUTH UI STARTUP
=========================================================== */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAdminAuthUI);
} else {
  initializeAdminAuthUI();
}
/* ===========================================================
   DATABASE PATH
=========================================================== */
const DB_PATH = {
  realtime: {
    nodeA: "/Realtime/NodeA",
    nodeB: "/Realtime/NodeB",
    system: "/Realtime/System",
  },
  history: {
    nodeA: "/sensor_logs/NodeA",
    nodeB: "/sensor_logs/NodeB",
  },
  diagnostics: {
    master: "/Diagnostics/Master",
    nodeA: "/Diagnostics/NodeA",
    nodeB: "/Diagnostics/NodeB",
  },
};
/* ===========================================================
   GLOBAL DATA
=========================================================== */
let realtimeData = {
  nodeA: null,
  nodeB: null,
  system: null,
};
const realtimeListenerState = {
  nodeA: {
    initialized: false,
  },
  nodeB: {
    initialized: false,
  },
};
window.appState = window.appState || {};
window.appState.historyData = {
  nodeA: [],
  nodeB: [],
};
window.appState.diagnostics = {
  master: null,
  nodeA: null,
  nodeB: null,
};
window.appState.firebaseHydration = {
  diagnosticsReady: false,
  systemReady: false,
};
/* ===========================================================
   APPLICATION START
=========================================================== */
window.addEventListener("load", () => {
  startRealtime();
});
/* ===========================================================
   START REALTIME LISTENER
=========================================================== */
function startRealtime() {
  listenNodeA();
  listenNodeB();
  listenSystem();
  listenDiagnostics();
  listenHistoryNodeA();
  listenHistoryNodeB();
  Bootstrap.setStage(Bootstrap.Stage.FIREBASE);
  Bootstrap.markReady(Bootstrap.Module.FIREBASE);
}
/* ===========================================================
   NODE A REALTIME LISTENER
=========================================================== */
function listenNodeA() {
  db.ref(DB_PATH.realtime.nodeA).on("value", (snapshot) => {
    if (!snapshot.exists()) {
      console.warn("Node A belum memiliki data.");
      return;
    }
    const isInitialSnapshot = !realtimeListenerState.nodeA.initialized;
    realtimeListenerState.nodeA.initialized = true;
    realtimeData.nodeA = snapshot.val();
    processNodeA(realtimeData.nodeA, isInitialSnapshot);
  });
}
/* ===========================================================
   PROCESS NODE A
=========================================================== */
function processNodeA(data, isInitialSnapshot = false) {
  if (!data) return;
  const normalized = normalizeRealtimeData(data);
  if (typeof updateMonitoringNodeA === "function") {
    updateMonitoringNodeA(normalized, isInitialSnapshot);
  }
  if (typeof updateDashboardNodeA === "function") {
    updateDashboardNodeA(normalized);
  }
}
/* ===========================================================
   NORMALIZE REALTIME DATA
=========================================================== */
function normalizeRealtimeData(data) {
  if (!data) return null;
  const normalized = {
    nodeId: data.nodeId,
    room: data.ruangan,
    mac: data.mac,
    status: data.keterangan,
    dust: [],
    light: [],
    averageDust: data.debu?.rata == null ? null : Number(data.debu.rata),
    averageLight: data.cahaya?.rata == null ? null : Number(data.cahaya.rata),
    timestamp: data.waktu,
  };
  if (data.debu) {
    Object.keys(data.debu)
      .filter((key) => key.startsWith("S"))
      .sort()
      .forEach((key) => {
        normalized.dust.push(Number(data.debu[key]));
      });
  }
  if (data.cahaya) {
    Object.keys(data.cahaya)
      .filter((key) => key.startsWith("S"))
      .sort()
      .forEach((key) => {
        normalized.light.push(Number(data.cahaya[key]));
      });
  }
  return normalized;
}
/* ===========================================================
   NODE B REALTIME LISTENER
=========================================================== */
function listenNodeB() {
  db.ref(DB_PATH.realtime.nodeB).on("value", (snapshot) => {
    if (!snapshot.exists()) {
      console.warn("Node B belum memiliki data.");
      return;
    }
    const isInitialSnapshot = !realtimeListenerState.nodeB.initialized;
    realtimeListenerState.nodeB.initialized = true;
    realtimeData.nodeB = snapshot.val();
    processNodeB(realtimeData.nodeB, isInitialSnapshot);
  });
}
/* ===========================================================
   PROCESS NODE B
=========================================================== */
function processNodeB(data, isInitialSnapshot = false) {
  if (!data) return;
  const normalized = normalizeRealtimeData(data);
  if (typeof updateMonitoringNodeB === "function") {
    updateMonitoringNodeB(normalized, isInitialSnapshot);
  }
  if (typeof updateDashboardNodeB === "function") {
    updateDashboardNodeB(normalized);
  }
}
/* ===========================================================
   SYSTEM REALTIME LISTENER
=========================================================== */
function listenSystem() {
  db.ref(DB_PATH.realtime.system).on("value", (snapshot) => {
    window.appState.firebaseHydration.systemReady = true;
    if (!snapshot.exists()) {
      console.warn("System belum memiliki data.");
      if (typeof refreshDashboardCommunicationState === "function") {
        refreshDashboardCommunicationState();
      }
      return;
    }
    realtimeData.system = snapshot.val();
    if (typeof refreshDashboardCommunicationState === "function") {
      refreshDashboardCommunicationState();
    }
  });
}
/* ===========================================================
   DIAGNOSTICS LISTENER
=========================================================== */
function listenDiagnostics() {
  db.ref("/Diagnostics").on("value", (snapshot) => {
    window.appState.firebaseHydration.diagnosticsReady = true;
    if (!snapshot.exists()) {
      window.appState.diagnostics = {
        master: null,
        nodeA: null,
        nodeB: null,
      };
      if (typeof refreshDashboardCommunicationState === "function") {
        refreshDashboardCommunicationState();
      }
      return;
    }
    const data = snapshot.val();
    window.appState.diagnostics = {
      master: data.Master || null,
      nodeA: data.NodeA || null,
      nodeB: data.NodeB || null,
    };
    if (typeof refreshDashboardCommunicationState === "function") {
      refreshDashboardCommunicationState();
    }
  });
}
/* ===========================================================
   HISTORY
=========================================================== */
function listenHistory() {}
/* ===========================================================
   HISTORY NODE A
=========================================================== */
function listenHistoryNodeA() {
  db.ref(DB_PATH.history.nodeA)
    .limitToLast(CONFIG.chart.historyLimit)
    .once("value")
    .then((snapshot) => {
      if (!snapshot.exists()) {
        window.appState.historyData.nodeA = [];
        console.warn("History NodeA kosong.");
        return;
      }
      const data = [];
      snapshot.forEach((child) => {
        data.push({
          key: child.key,
          ...child.val(),
        });
      });
      window.appState.historyData.nodeA = data;
      if (typeof updateHistoryNodeA === "function") {
        updateHistoryNodeA(data);
      }
    })
    .catch((error) => {
      console.error("History NodeA Error:", error);
    });
}
/* ===========================================================
   HISTORY NODE B
=========================================================== */
function listenHistoryNodeB() {
  db.ref(DB_PATH.history.nodeB)
    .limitToLast(CONFIG.chart.historyLimit)
    .once("value")
    .then((snapshot) => {
      if (!snapshot.exists()) {
        window.appState.historyData.nodeB = [];
        console.warn("History NodeB kosong.");
        return;
      }
      const data = [];
      snapshot.forEach((child) => {
        data.push({
          key: child.key,
          ...child.val(),
        });
      });
      window.appState.historyData.nodeB = data;
      if (typeof updateHistoryNodeB === "function") {
        updateHistoryNodeB(data);
      }
    })
    .catch((error) => {
      console.error("History NodeB Error:", error);
    });
}
