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
    databaseURL: "https://jte-iot-monitoring-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "jte-iot-monitoring",
    storageBucket: "jte-iot-monitoring.firebasestorage.app",
    messagingSenderId: "857454088913",
    appId: "1:857454088913:web:d1e84cf73e60ec5aacabf0"
};
/* ===========================================================
   INITIALIZE FIREBASE
=========================================================== */
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
/* ===========================================================
   DATABASE PATH
=========================================================== */
const DB_PATH = {
    realtime: {
        nodeA: "/Realtime/NodeA",
        nodeB: "/Realtime/NodeB",
        system: "/Realtime/System"
    },
    history: {
        nodeA: "/sensor_logs/NodeA",
        nodeB: "/sensor_logs/NodeB"
    }
};
/* ===========================================================
   GLOBAL DATA
=========================================================== */
let realtimeData = {
    nodeA: null,
    nodeB: null,
    system: null
};
window.appState = window.appState || {};
window.appState.historyData = {
    nodeA: [],
    nodeB: []
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
    listenHistoryNodeA();
    listenHistoryNodeB();
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
        realtimeData.nodeA = snapshot.val();
        processNodeA(realtimeData.nodeA);
    });
}
/* ===========================================================
   PROCESS NODE A
=========================================================== */
function processNodeA(data) {
    if (!data)
        return;
    const normalized = normalizeRealtimeData(data);
    if (typeof updateMonitoringNodeA === "function") {
        updateMonitoringNodeA(normalized);
    }
    if (typeof updateDashboardNodeA === "function") {
        updateDashboardNodeA(normalized);
    }
}
/* ===========================================================
   NORMALIZE REALTIME DATA
=========================================================== */
function normalizeRealtimeData(data) {
    if (!data)
        return null;
    const normalized = {
        nodeId: data.nodeId,
        room: data.ruangan,
        mac: data.mac,
        status: data.keterangan,
        dust: [],
        light: [],
        averageDust: Number(data.debu?.rata ?? 0),
        averageLight: Number(data.cahaya?.rata ?? 0),
        timestamp: data.waktu
    };
    if (data.debu) {
        Object.keys(data.debu)
            .filter(key => key.startsWith("S"))
            .sort()
            .forEach(key => {
                normalized.dust.push(
                    Number(data.debu[key])
                );
            });
    }
    if (data.cahaya) {
        Object.keys(data.cahaya)
            .filter(key => key.startsWith("S"))
            .sort()
            .forEach(key => {
                normalized.light.push(
                    Number(data.cahaya[key])
                );
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
        realtimeData.nodeB = snapshot.val();
        processNodeB(realtimeData.nodeB);
    });
}
/* ===========================================================
   PROCESS NODE B
=========================================================== */
function processNodeB(data) {
    if (!data)
        return;
    const normalized = normalizeRealtimeData(data);
    if (typeof updateMonitoringNodeB === "function") {
        updateMonitoringNodeB(normalized);
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
        if (!snapshot.exists()) {
            console.warn("System belum memiliki data.");
            return;
        }
        realtimeData.system = snapshot.val();
        if (typeof updateNodeStatus === "function") {
            updateNodeStatus(
                realtimeData.system.status === "ONLINE"
                    ? "online"
                    : "offline"
            );

        }
    });
}
/* ===========================================================
   HISTORY
=========================================================== */
function listenHistory() {
}
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
            snapshot.forEach(child => {
                data.push({
                    key: child.key,
                    ...child.val()
                });
            });
            window.appState.historyData.nodeA = data;
            if (typeof updateHistoryNodeA === "function") {
                updateHistoryNodeA(data);
            }
        })
        .catch((error) => {
            console.error(
                "History NodeA Error:",
                error
            );
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
            snapshot.forEach(child => {
                data.push({
                    key: child.key,
                    ...child.val()
                });
            });
            window.appState.historyData.nodeB = data;
            if (typeof updateHistoryNodeB === "function") {
                updateHistoryNodeB(data);
            }
        })
        .catch((error) => {
            console.error(
                "History NodeB Error:",
                error
            );
        });
}