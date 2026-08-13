/* =====================================================
    GLOBAL
===================================================== */
//  MASTER HEARTBEAT
const MASTER_DIAGNOSTICS_ONLINE_TIMEOUT = 26000;
const MASTER_DIAGNOSTICS_OFFLINE_TIMEOUT = 30000;
//  GLOBAL DASHBOARD
const Dashboard = {
  active: true,
  initialized: false,
  view: {
    currentNode: "nodeA",
    trendLimit: CONFIG.dashboard.trendMaxPoints,
    defaultTrendLimit: CONFIG.dashboard.trendMaxPoints,
    interaction: {
      mode: "live",
    },
  },
  updateInterval: null,
  hydration: {
    diagnosticsReady: false,
    systemReady: false,
  },
  system: {
    onlineNodes: 0,
    totalNodes: 2,
    totalSensors: 20,
    onlineSensors: 0,
    averageDust: 0,
    averageLight: 0,
    lastUpdate: null,
  },
  nodes: {
    nodeA: null,
    nodeB: null,
  },
  charts: {
    trend: null,
  },
  // DASHBOARD TREND REFERENCE
  // Tidak ada node yang menjadi reference permanen.
  // Node yang memiliki data valid paling baru akan menjadi
  // reference timeline saat itu.
  trendReferenceNode: null,
  carousel: {
    interval: null,
    delay: 5000,
  },
  activities: [],
  activityCache: new Set(),
  communicationState: "online",
  eventState: {
    master: {
      initialized: false,
      communication: null,
    },
    nodeA: {
      initialized: false,
      communication: null,
      lastTimestamp: null,
      dust: null,
      dustInitialized: false,
      light: null,
      lightInitialized: false,
    },
    nodeB: {
      initialized: false,
      communication: null,
      lastTimestamp: null,
      dust: null,
      dustInitialized: false,
      light: null,
      lightInitialized: false,
    },
  },
};
/* =====================================================
    INITIALIZE DASHBOARD
===================================================== */
function initializeDashboard() {
  if (Dashboard.initialized) {
    return;
  }
  createDashboardTrendChart();
  refreshTotalSensor();
  const room = currentDashboardRoom();
  if (room) {
    renderNodeCardHeader(room);
  }
  initializeDashboardEvents();
  /*
    ==========================================
    INITIAL UI STATE
    ==========================================
    */
  updateDashboardZoomButton();
  updateTrendStateBadge();
  updateTrendToolbarState();
  //  COMMUNICATION INITIALIZATION
  setDashboardCommunicationHydratingState();
  Dashboard.initialized = true;
  //  After Firebase Hydration actual state
  refreshDashboardCommunicationState();
  Bootstrap.setStage(Bootstrap.Stage.DASHBOARD);
  Bootstrap.markReady(Bootstrap.Module.DASHBOARD);
  setInterval(refreshActivityTimes, 1000);
}
function initializeDashboardEvents() {
  initializeTrendToolbar();
  initializeDashboardCarousel();
  initializeDashboardCarouselHover();
  startDashboardAutoCarousel();
  initializeTrendActions();
}
/* =====================================================
    START DASHBOARD REALTIME
===================================================== */
function startDashboardRealtime() {
  if (Dashboard.updateInterval) return;
  Dashboard.updateInterval = setInterval(() => {
    if (!Dashboard.active) return;
    //  MASTER HEARTBEAT STATE
    refreshDiagnosticStatus();
    collectMasterCommunicationEvent();
    //  NODE COMMUNICATION STATE EVALUATION
    collectCommunicationEvent("nodeA", Language.get("room.nodeA"));
    collectCommunicationEvent("nodeB", Language.get("room.nodeB"));
  }, 1000);
}
/* =====================================================
    STOP DASHBOARD REALTIME
===================================================== */
function stopDashboardRealtime() {
  if (!Dashboard.updateInterval) return;
  clearInterval(Dashboard.updateInterval);
  Dashboard.updateInterval = null;
}
/* =====================================================
    UPDATE SYSTEM STATUS
===================================================== */
function updateSystemStatus(status) {
  const box = document.getElementById("systemStatus");
  if (status === "Normal") {
    box.className =
      "mt-8 bg-green-100 border border-green-300 rounded-2xl p-5 flex justify-between items-center";
  } else if (status === "Warning") {
    box.className =
      "mt-8 bg-yellow-100 border border-yellow-300 rounded-2xl p-5 flex justify-between items-center";
  } else {
    box.className =
      "mt-8 bg-red-100 border border-red-300 rounded-2xl p-5 flex justify-between items-center";
  }
}
/* =====================================================
    ADD ACTIVITY
===================================================== */
function addActivity(message) {
  const activity = document.getElementById("activityList");
  const item = document.createElement("div");
  item.className = "flex justify-between items-center px-6 py-4 border-b";
  item.innerHTML = `
        <div>
            <div class="font-medium">
                ${message}
            </div>
            <div class="text-sm text-slate-500">
                ${new Date().toLocaleTimeString("id-ID")}
            </div>
        </div>
    `;
  activity.prepend(item);
  while (activity.children.length > 20) {
    activity.removeChild(activity.lastChild);
  }
}
/* =====================================================
    DASHBOARD PROVIDER HELPER
===================================================== */
function currentDashboardNode() {
  return Monitoring.roomData[Dashboard.view.currentNode] || null;
}
function currentDashboardRoom() {
  return (
    CONFIG.rooms.find((room) => room.id === Dashboard.view.currentNode) || null
  );
}
/* =====================================================
    DASHBOARD NODE HELPER
===================================================== */
function getDashboardNodes() {
  return CONFIG.rooms.map((room) => room.id);
}
function getCurrentDashboardIndex() {
  return getDashboardNodes().indexOf(Dashboard.view.currentNode);
}
function setDashboardNode(roomID) {
  Dashboard.view.currentNode = roomID;
  const room = currentDashboardRoom();
  if (room) {
    renderNodeCardHeader(room);
  }
  refreshNodeCard();
  updateDashboardCarousel();
}
/* =====================================================
    DASHBOARD CAROUSEL
===================================================== */
function nextDashboardNode(resetTimer = false) {
  if (isDashboardExploreMode()) {
    return;
  }
  const nodes = getDashboardNodes();
  const next = (getCurrentDashboardIndex() + 1) % nodes.length;
  setDashboardNode(nodes[next]);
  if (resetTimer) {
    resetDashboardAutoCarousel();
  }
}
function previousDashboardNode(resetTimer = false) {
  if (isDashboardExploreMode()) {
    return;
  }
  const nodes = getDashboardNodes();
  const previous =
    (getCurrentDashboardIndex() - 1 + nodes.length) % nodes.length;
  setDashboardNode(nodes[previous]);
  if (resetTimer) {
    resetDashboardAutoCarousel();
  }
}
/* =====================================================
    UPDATE DASHBOARD CAROUSEL
===================================================== */
function updateDashboardCarousel() {
  const dots = document.querySelectorAll("#dashboardCarouselIndicator span");
  dots.forEach((dot, index) => {
    dot.classList.remove("theme-carousel-dot-active");
    if (index === getCurrentDashboardIndex()) {
      dot.classList.add("theme-carousel-dot-active");
    }
  });
}
/* =====================================================
    INITIALIZE DASHBOARD CAROUSEL
===================================================== */
function initializeDashboardCarousel() {
  document
    .getElementById("dashboardNextNode")
    ?.addEventListener("click", () => nextDashboardNode(true));
  document
    .getElementById("dashboardPrevNode")
    ?.addEventListener("click", () => previousDashboardNode(true));
  updateDashboardCarousel();
}
/* =====================================================
    DASHBOARD CAROUSEL HOVER
===================================================== */
function initializeDashboardCarouselHover() {
  const card = document.querySelector("#dashboardPage .lg\\:col-span-5");
  if (!card) {
    return;
  }
  card.addEventListener("mouseenter", pauseDashboardAutoCarousel);
  card.addEventListener("mouseleave", resumeDashboardAutoCarousel);
}
/* =====================================================
    AUTO CAROUSEL
===================================================== */
function startDashboardAutoCarousel() {
  if (Dashboard.carousel.interval) {
    return;
  }
  Dashboard.carousel.interval = setInterval(() => {
    if (!Dashboard.active) {
      return;
    }
    if (isDashboardExploreMode()) {
      return;
    }
    nextDashboardNode();
  }, Dashboard.carousel.delay);
}
function stopDashboardAutoCarousel() {
  if (!Dashboard.carousel.interval) {
    return;
  }
  clearInterval(Dashboard.carousel.interval);
  Dashboard.carousel.interval = null;
}
/* =====================================================
    RESET AUTO CAROUSEL TIMER
===================================================== */
function resetDashboardAutoCarousel() {
  stopDashboardAutoCarousel();
  startDashboardAutoCarousel();
}
/* =====================================================
    PAUSE AUTO CAROUSEL
===================================================== */
function pauseDashboardAutoCarousel() {
  stopDashboardAutoCarousel();
}
/* =====================================================
    RESUME AUTO CAROUSEL
===================================================== */
function resumeDashboardAutoCarousel() {
  if (isDashboardExploreMode()) {
    return;
  }
  startDashboardAutoCarousel();
}
/* =====================================================
    REFRESH DASHBOARD
===================================================== */
function refreshDashboard() {
  if (!Dashboard.active) {
    return;
  }
  const nodeA = Monitoring.roomData.nodeA ?? null;
  const nodeB = Monitoring.roomData.nodeB ?? null;
  refreshSummary(nodeA, nodeB);
  refreshNodeCard();
  refreshDashboardTrendChart();
  refreshRecentActivity();
}
/* =====================================================
    DASHBOARD SUMMARY (CONSUMER)
===================================================== */
function refreshSummary(nodeA, nodeB) {
  refreshOnlineNode();
  refreshDiagnosticStatus();
  refreshAverageDust(nodeA, nodeB);
  refreshAverageLight(nodeA, nodeB);
  refreshLastSync();
}
/* =====================================================
    REFRESH NODE CARD
===================================================== */
function refreshNodeCard() {
  const room = currentDashboardRoom();
  if (!room) {
    return;
  }
  renderNodeCardHeader(room);
  const node = Monitoring.roomData[Dashboard.view.currentNode];
  const connectionState = getConnectionState(Dashboard.view.currentNode);
  renderNodeCard(node, room, connectionState);
}
function getDashboardLocale() {
  return Language.current === "en" ? "en-US" : "id-ID";
}
function getDashboardCurrentTime() {
  const offset =
    typeof firebaseServerTimeOffset === "number" && firebaseServerTimeReady
      ? firebaseServerTimeOffset
      : 0;
  return Date.now() + offset;
}
/* =====================================================
    FORMAT DASHBOARD DATE
===================================================== */
function formatDashboardDate(timestamp) {
  if (!timestamp) {
    return "--";
  }
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString(getDashboardLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const formattedTime = date
    .toLocaleTimeString(getDashboardLocale(), {
      hour12: false,
      timeZone: "Asia/Jakarta",
    })
    .replace(/:/g, ".");
  return `${formattedDate} • ${formattedTime}`;
}
/* =====================================================
    RENDER NODE CARD HEADER
===================================================== */
function renderNodeCardHeader(room) {
  const title = document.getElementById("nodeATitle");
  const subtitle = document.getElementById("nodeASubtitle");
  if (title) {
    title.textContent = Language.get(`room.${room.id}`);
  }
  if (subtitle) {
    subtitle.textContent = room.short;
  }
}
/* =====================================================
    GET NODE LAST KNOWN UPDATE TIMESTAMP
===================================================== */
function getDashboardNodeLastUpdateTimestamp(nodeId, node) {
  const connectionTimestamp = Number(
    Monitoring.connection?.[nodeId]?.lastReceive,
  );
  if (Number.isFinite(connectionTimestamp) && connectionTimestamp > 0) {
    return connectionTimestamp;
  }
  const nodeTimestamp = Number(node?.timestamp);
  if (Number.isFinite(nodeTimestamp) && nodeTimestamp > 0) {
    return nodeTimestamp;
  }
  const diagnosticTimestamp = Number(
    window.appState?.diagnostics?.[nodeId]?.lastReceive,
  );
  if (Number.isFinite(diagnosticTimestamp) && diagnosticTimestamp > 0) {
    return diagnosticTimestamp;
  }
  return 0;
}
/* =====================================================
    RENDER NODE CARD
===================================================== */
function renderNodeCard(node, room, connectionState) {
  const status = document.getElementById("nodeAStatus");
  const dust = document.getElementById("nodeADust");
  const light = document.getElementById("nodeALight");
  const lastUpdate = document.getElementById("nodeALastUpdate");
  if (!status) {
    return;
  }
  /* ==========================================
      BELUM ADA DATA SAMA SEKALI
  ========================================== */
  if (!node) {
    if (dust) {
      dust.textContent = "--";
    }
    if (light) {
      light.textContent = "--";
    }
    if (lastUpdate) {
      lastUpdate.textContent = "--";
    }
    status.className = "theme-badge";
    status.classList.add("theme-badge-neutral");
    status.textContent = CONFIG.status.system.waiting;
    return;
  }
  /* ==========================================
      LAST KNOWN VALUE
      (Selalu tampil jika data tersedia)
  ========================================== */
  if (dust) {
    dust.textContent = Number(node.averageDust).toFixed(2) + " μg/m³";
  }
  if (light) {
    light.textContent = Number(node.averageLight).toFixed(2) + " Lux";
  }
  if (lastUpdate) {
    const lastKnownTimestamp = getDashboardNodeLastUpdateTimestamp(
      room.id,
      node,
    );
    lastUpdate.textContent =
      lastKnownTimestamp > 0 ? formatDashboardDate(lastKnownTimestamp) : "--";
  }
  status.className = "theme-badge";
  /* ==========================================
      CONNECTION STATE
  ========================================== */
  switch (connectionState) {
    case CONNECTION_STATE.WAITING:
      status.classList.add("theme-badge-neutral");
      status.textContent = CONFIG.status.system.waiting;
      return;
    case CONNECTION_STATE.OFFLINE:
      status.classList.add("theme-badge-offline");
      status.textContent = CONFIG.status.system.offline;
      return;
    case CONNECTION_STATE.ONLINE: {
      const nodeStatus = String(node.status ?? "").toUpperCase();
      if (nodeStatus === "NORMAL") {
        status.classList.add("theme-badge-success");
        status.textContent = Language.get("dashboard.dynamic.status.normal");
      } else {
        status.classList.add("theme-badge-danger");
        status.textContent = Language.get("dashboard.dynamic.status.abnormal");
      }
      return;
    }
    default:
      status.classList.add("theme-badge-neutral");
      status.textContent = CONFIG.status.system.waiting;
      return;
  }
}
/* =====================================================
    DASHBOARD SYSTEM TREND
===================================================== */
function createDashboardTrendChart() {
  const canvas = document.getElementById("dashboardTrendChart");
  if (!canvas) return;
  if (Dashboard.charts.trend) {
    Dashboard.charts.trend.destroy();
  }
  Dashboard.charts.trend = new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: buildDashboardTrendDatasets(),
    },
    options: ChartDesignSystem.mergeOptions(
      ChartDesignSystem.createOptions({
        zoom: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      }),
      {
        scales: {
          x: {
            offset: false,
            grid: {
              display: false,
            },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
            },
          },
          y: {
            grace: "5%",
            ticks: {
              precision: 0,
            },
          },
        },
      },
    ),
  });
}
function getTrendSlice(data) {
  return data.slice(-Dashboard.view.trendLimit);
}
/* ==========================================================
    GET LATEST NODE DATA TIMESTAMP
========================================================== */
function getDashboardTrendNodeTimestamp(nodeId) {
  const connection = Monitoring.connection?.[nodeId];
  const timestamp = Number(connection?.lastReceive);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return timestamp;
  }
  return 0;
}
// GET TREND REFERENCE NODE, FIRST VALID DATA WINS:
function getDashboardTrendReferenceNode() {
  const nodeA = Monitoring.chartHistory?.nodeA;
  const nodeB = Monitoring.chartHistory?.nodeB;
  const hasA = Array.isArray(nodeA?.labels) && nodeA.labels.length > 0;
  const hasB = Array.isArray(nodeB?.labels) && nodeB.labels.length > 0;
  if (!hasA && !hasB) {
    Dashboard.trendReferenceNode = null;
    return null;
  }
  if (hasA && !hasB) {
    Dashboard.trendReferenceNode = "nodeA";
    return "nodeA";
  }
  if (!hasA && hasB) {
    Dashboard.trendReferenceNode = "nodeB";
    return "nodeB";
  }
  const timestampA = getDashboardTrendNodeTimestamp("nodeA");
  const timestampB = getDashboardTrendNodeTimestamp("nodeB");
  if (timestampA === 0 && timestampB === 0) {
    return Dashboard.trendReferenceNode ?? "nodeA";
  }
  if (timestampB > timestampA) {
    Dashboard.trendReferenceNode = "nodeB";
    return "nodeB";
  }
  if (timestampA > timestampB) {
    Dashboard.trendReferenceNode = "nodeA";
    return "nodeA";
  }
  return Dashboard.trendReferenceNode ?? "nodeA";
}
// ALIGN DATA TO REFERENCE TIMELINE
function alignDashboardTrendData(sourceData, targetLength) {
  if (!Number.isInteger(targetLength) || targetLength <= 0) {
    return [];
  }
  if (!Array.isArray(sourceData) || sourceData.length === 0) {
    return new Array(targetLength).fill(null);
  }
  const source = getTrendSlice(sourceData);
  if (source.length >= targetLength) {
    return source.slice(source.length - targetLength);
  }
  const missing = targetLength - source.length;
  const firstValue = source[0];
  return [...new Array(missing).fill(firstValue), ...source];
}
/* =====================================================
    BUILD DASHBOARD TREND DATASETS
===================================================== */
function buildDashboardTrendDatasets() {
  return [
    ChartDesignSystem.createDataset(
      Language.get("dashboard.dynamic.chart.dustNodeA"),
      ChartDesignSystem.DATASET.DASHBOARD.DUST_NODE_A,
    ),
    ChartDesignSystem.createDataset(
      Language.get("dashboard.dynamic.chart.dustNodeB"),
      ChartDesignSystem.DATASET.DASHBOARD.DUST_NODE_B,
    ),
    ChartDesignSystem.createDataset(
      Language.get("dashboard.dynamic.chart.lightNodeA"),
      ChartDesignSystem.DATASET.DASHBOARD.LIGHT_NODE_A,
    ),
    ChartDesignSystem.createDataset(
      Language.get("dashboard.dynamic.chart.lightNodeB"),
      ChartDesignSystem.DATASET.DASHBOARD.LIGHT_NODE_B,
    ),
  ];
}
/* =====================================================
    BUILD DASHBOARD TREND CHART DATA
===================================================== */
function buildDashboardTrendChartData() {
  const nodeA = Monitoring.chartHistory.nodeA;
  const nodeB = Monitoring.chartHistory.nodeB;
  const hasNodeAData = Array.isArray(nodeA?.labels) && nodeA.labels.length > 0;
  const hasNodeBData = Array.isArray(nodeB?.labels) && nodeB.labels.length > 0;
  /* ======================================================
    DATA-FIRST
  ====================================================== */
  if (!hasNodeAData && !hasNodeBData) {
    return ChartDesignSystem.composeChartData({
      labels: [],
      datasets: buildDashboardTrendDatasets(),
    });
  }
  /* ======================================================
    FIRST VALID DATA WINS
  ====================================================== */
  const referenceNode = getDashboardTrendReferenceNode();
  if (!referenceNode) {
    return ChartDesignSystem.composeChartData({
      labels: [],
      datasets: buildDashboardTrendDatasets(),
    });
  }
  const referenceHistory = referenceNode === "nodeA" ? nodeA : nodeB;
  /* ======================================================
    REFERENCE TIMELINE
  ====================================================== */
  const labels = getTrendSlice(referenceHistory.labels);
  const targetLength = labels.length;
  /* ======================================================
    ALIGN EACH NODE
  ====================================================== */
  const nodeADust = alignDashboardTrendData(nodeA?.dust, targetLength);
  const nodeBDust = alignDashboardTrendData(nodeB?.dust, targetLength);
  const nodeALight = alignDashboardTrendData(nodeA?.light, targetLength);
  const nodeBLight = alignDashboardTrendData(nodeB?.light, targetLength);
  const datasets = buildDashboardTrendDatasets();
  ChartDesignSystem.setDatasetData(datasets, [
    nodeADust,
    nodeBDust,
    nodeALight,
    nodeBLight,
  ]);
  return ChartDesignSystem.composeChartData({
    labels,
    datasets,
  });
}
/* =====================================================
    REFRESH DASHBOARD TREND CHART
===================================================== */
function refreshDashboardTrendChart() {
  if (!Dashboard.charts.trend) return;
  if (isDashboardExploreMode()) {
    return;
  }
  const nodeA = Monitoring.chartHistory.nodeA;
  const nodeB = Monitoring.chartHistory.nodeB;
  const hasNodeAData = Array.isArray(nodeA?.labels) && nodeA.labels.length > 0;
  const hasNodeBData = Array.isArray(nodeB?.labels) && nodeB.labels.length > 0;
  /* =====================================================
    DATA-FIRST GUARD
    ===================================================== */
  if (!hasNodeAData && !hasNodeBData) {
    return;
  }
  Dashboard.charts.trend.data = buildDashboardTrendChartData();
  Dashboard.charts.trend.update("none");
}
function refreshDashboardTrendLanguage() {
  if (!Dashboard.charts.trend) {
    return;
  }
  Dashboard.charts.trend.data.datasets = buildDashboardTrendDatasets();
  const chartData = buildDashboardTrendChartData();
  Dashboard.charts.trend.data.labels = chartData.labels;
  Dashboard.charts.trend.data.datasets.forEach((dataset, index) => {
    dataset.data = chartData.datasets[index].data;
  });
  Dashboard.charts.trend.update("none");
  updateTrendStateBadge();
}
/* =====================================================
    REFRESH DASHBOARD TREND CHART
===================================================== */
function setDashboardTrendLimit(limit) {
  if (isDashboardExploreMode()) {
    return;
  }
  Dashboard.view.trendLimit = limit;
  refreshDashboardTrendChart();
  updateTrendToolbar();
}
function initializeTrendToolbar() {
  document.getElementById("trend10Btn")?.addEventListener("click", () => {
    setDashboardTrendLimit(10);
  });
  document.getElementById("trend20Btn")?.addEventListener("click", () => {
    setDashboardTrendLimit(20);
  });
  document.getElementById("trend50Btn")?.addEventListener("click", () => {
    setDashboardTrendLimit(50);
  });
  updateTrendToolbar();
}
/* =====================================================
    INITIALIZE TREND ACTIONS
===================================================== */
function initializeTrendActions() {
  document
    .getElementById("dashboardTrendZoom")
    ?.addEventListener("click", enableDashboardExploreMode);
  document
    .getElementById("dashboardTrendReset")
    ?.addEventListener("click", resetDashboardTrend);
  applyDashboardInteraction();
  updateDashboardZoomButton();
  updateTrendStateBadge();
}
/* =====================================================
    DASHBOARD INTERACTION
===================================================== */
function isDashboardLiveMode() {
  return Dashboard.view.interaction.mode === "live";
}
function isDashboardExploreMode() {
  return Dashboard.view.interaction.mode === "explore";
}
function setDashboardInteractionMode(mode) {
  Dashboard.view.interaction.mode = mode;
}
/* =====================================================
    DASHBOARD CHART HELPER
===================================================== */
function getDashboardTrendChart() {
  return Dashboard.charts.trend;
}
/* =====================================================
    APPLY DASHBOARD INTERACTION
===================================================== */
function applyDashboardInteraction() {
  const chart = getDashboardTrendChart();
  if (!chart) {
    return;
  }
  const explore = isDashboardExploreMode();
  chart.options.plugins.zoom.zoom.wheel.enabled = explore;
  chart.options.plugins.zoom.zoom.pinch.enabled = explore;
  chart.options.plugins.zoom.pan.enabled = explore;
  chart.options.plugins.zoom.zoom.drag.enabled = false;
  chart.update("none");
}
/* =====================================================
    UPDATE TREND TOOLBAR STATE
===================================================== */
function updateTrendToolbarState() {
  const isExplore = isDashboardExploreMode();
  [trend10Btn, trend20Btn, trend50Btn].forEach((button) => {
    if (!button) return;
    if (isExplore) {
      button.style.pointerEvents = "none";
      button.style.cursor = "default";
    } else {
      button.style.pointerEvents = "";
      button.style.cursor = "";
    }
  });
}
/* =====================================================
    ENABLE EXPLORE MODE
===================================================== */
function enableDashboardExploreMode() {
  if (isDashboardExploreMode()) {
    return;
  }
  setDashboardInteractionMode("explore");
  applyDashboardInteraction();
  updateDashboardZoomButton();
  updateTrendStateBadge();
  updateTrendToolbarState();
}
/* =====================================================
    UPDATE ZOOM BUTTON
===================================================== */
function updateDashboardZoomButton() {
  const button = document.getElementById("dashboardTrendZoom");
  if (!button) return;
  button.classList.remove("theme-button-zoom-active");
  if (isDashboardExploreMode()) {
    button.classList.add("theme-button-zoom-active");
  }
}
/* =====================================================
    UPDATE TREND STATE BADGE
===================================================== */
function updateTrendStateBadge() {
  const badge = document.getElementById("dashboardTrendState");
  if (!badge) return;
  badge.className = "theme-badge";
  if (isDashboardExploreMode()) {
    badge.classList.add("theme-badge-explore");
    badge.innerHTML = `
            <span class="theme-badge-dot theme-badge-dot-explore"></span>
            ${Language.get("dashboard.dynamic.trend.explore")}
        `;
    return;
  }
  badge.classList.add("theme-badge-live");
  badge.innerHTML = `
        <span class="theme-badge-dot theme-badge-dot-live"></span>
        ${Language.get("dashboard.dynamic.trend.live")}
    `;
}
/* =====================================================
    UPDATE TREND TOOLBAR STATE
===================================================== */
function updateTrendToolbar() {
  const limits = [10, 20, 50];
  limits.forEach((limit) => {
    const button = document.getElementById(`trend${limit}Btn`);
    if (!button) return;
    button.classList.remove("theme-button-active");
  });
  const activeButton = document.getElementById(
    `trend${Dashboard.view.trendLimit}Btn`,
  );
  if (!activeButton) return;
  activeButton.classList.add("theme-button-active");
}
/* =====================================================
    RESET DASHBOARD TREND
===================================================== */
function resetDashboardTrend() {
  const chart = getDashboardTrendChart();
  if (chart) {
    chart.resetZoom();
  }
  setDashboardInteractionMode("live");
  applyDashboardInteraction();
  refreshDashboardTrendChart();
  updateDashboardZoomButton();
  updateTrendStateBadge();
  updateTrendToolbarState();
  /*
    ==========================================
    REMOVE BUTTON FOCUS
    ==========================================
    */
  document.activeElement?.blur();
}
/* =====================================================
    EXIT DASHBOARD EXPLORE MODE
===================================================== */
function exitDashboardExploreMode() {
  if (isDashboardLiveMode()) {
    return;
  }
  resetDashboardTrend();
}
/* =====================================================
    EXECUTIVE KPI
===================================================== */
function refreshAverageDust(nodeA, nodeB) {
  const values = [];
  if (nodeA && getConnectionState("nodeA") === CONNECTION_STATE.ONLINE) {
    values.push(Number(nodeA.averageDust));
  }
  if (nodeB && getConnectionState("nodeB") === CONNECTION_STATE.ONLINE) {
    values.push(Number(nodeB.averageDust));
  }
  const el = document.getElementById("avgDust");
  if (!el) {
    return;
  }
  if (values.length === 0) {
    el.textContent = "--";
    return;
  }
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  el.textContent = avg.toFixed(2);
}
function refreshTotalSensor() {
  const total = CONFIG.rooms.reduce((sum, room) => {
    return sum + room.dustSensors + room.lightSensors;
  }, 0);
  const el = document.getElementById("totalSensor");
  if (el) el.textContent = total;
}
/* =====================================================
    SET DASHBOARD COMMUNICATION HYDRATING STATE
===================================================== */
function setDashboardCommunicationHydratingState() {
  const statusItems = [
    ["masterStatusText", "masterStatusDot"],
    ["nodeAOnlineStatusText", "nodeAOnlineStatusDot"],
    ["nodeBOnlineStatusText", "nodeBOnlineStatusDot"],
  ];
  statusItems.forEach(([textId, dotId]) => {
    const text = document.getElementById(textId);
    const dot = document.getElementById(dotId);
    if (!text || !dot) {
      return;
    }
    text.textContent = "--";
    text.classList.remove(
      "text-emerald-600",
      "text-amber-500",
      "text-red-500",
      "text-slate-500",
    );
    dot.classList.remove(
      "bg-emerald-500",
      "bg-amber-500",
      "bg-red-500",
      "bg-slate-400",
    );
    text.classList.add("text-slate-500");
    dot.classList.add("bg-slate-400");
  });
  const onlineNode = document.getElementById("onlineNode");
  if (onlineNode) {
    onlineNode.textContent = "--/2";
  }
}
/* =====================================================
    GET EFFECTIVE DASHBOARD NODE STATE
===================================================== */
function getDashboardEffectiveNodeState(nodeId) {
  const masterState = getDashboardMasterState();
  /*
  Firebase belum selesai hydration.
  Jangan memutuskan state node terlebih dahulu.
  */
  if (masterState === null) {
    return null;
  }
  /*
  Gateway offline berarti node tidak dapat dianggap
  available dari perspektif Executive KPI.
  */
  if (masterState === "OFFLINE") {
    return "OFFLINE";
  }
  /*
  Gateway masih pada fase WAITING.
  Executive KPI mengikuti kondisi sistem.
  */
  if (masterState === "WAITING") {
    return "WAITING";
  }
  /*
  Gateway ONLINE.
  Sekarang gunakan state asli Node.
  */
  const connection = getConnection(nodeId);
  return String(connection?.state ?? "WAITING").toUpperCase();
}
function refreshOnlineNode() {
  let online = 0;
  CONFIG.rooms.forEach((room) => {
    const effectiveState = getDashboardEffectiveNodeState(room.id);
    /*
    Firebase belum selesai hydration.
    Jangan memaksakan angka sementara.
    */
    if (effectiveState === null) {
      return;
    }
    if (effectiveState === "ONLINE") {
      online++;
    }
  });
  const element = document.getElementById("onlineNode");
  if (!element) {
    return;
  }
  element.textContent = `${online}/${CONFIG.rooms.length}`;
}
/* =====================================================
    GET MASTER HEARTBEAT TIMESTAMP
===================================================== */
function getDashboardMasterHeartbeatTimestamp() {
  const diagnosticsTimestamp = Number(
    window.appState?.diagnostics?.master?.lastUpdate,
  );
  const systemTimestamp = Number(realtimeData?.system?.lastUpdate);
  const candidates = [diagnosticsTimestamp, systemTimestamp].filter(
    (timestamp) => Number.isFinite(timestamp) && timestamp > 0,
  );
  if (candidates.length === 0) {
    return 0;
  }
  return Math.max(...candidates);
}
/* =====================================================
    GET MASTER DIAGNOSTIC STATE
===================================================== */
function getDashboardMasterState() {
  const hydration = window.appState?.firebaseHydration;
  /* =====================================================
      WAIT FOR INITIAL FIREBASE SNAPSHOT
  ===================================================== */
  if (!hydration?.diagnosticsReady || !hydration?.systemReady) {
    return null;
  }
  const master = window.appState?.diagnostics?.master;
  /* =====================================================
      GET MASTER HEARTBEAT
  =====================================================
  Diagnostics/Master dan Realtime/System sama-sama
  dapat menjadi heartbeat Master.
  ===================================================== */
  const diagnosticsTimestamp = Number(master?.lastUpdate);
  const systemTimestamp = Number(realtimeData?.system?.lastUpdate);
  const timestamps = [diagnosticsTimestamp, systemTimestamp].filter(
    (timestamp) => Number.isFinite(timestamp) && timestamp > 0,
  );
  /* =====================================================
      NO MASTER HEARTBEAT
  =====================================================
  Firebase sudah selesai hydration,
  tetapi tidak ada heartbeat Master.
  ===================================================== */
  if (timestamps.length === 0) {
    return "WAITING";
  }
  const lastUpdate = Math.max(...timestamps);
  const now = getDashboardCurrentTime();
  const age = now - lastUpdate;
  /* =====================================================
      MASTER ONLINE
  ===================================================== */
  if (age <= MASTER_DIAGNOSTICS_ONLINE_TIMEOUT) {
    return "ONLINE";
  }
  /* =====================================================
      MASTER WAITING
  ===================================================== */
  if (age <= MASTER_DIAGNOSTICS_OFFLINE_TIMEOUT) {
    return "WAITING";
  }
  /* =====================================================
      MASTER OFFLINE
  ===================================================== */
  return "OFFLINE";
}
/* =====================================================
    REFRESH DASHBOARD COMMUNICATION STATE
===================================================== */
function refreshDashboardCommunicationState() {
  if (!Dashboard.active || !Dashboard.initialized) {
    return;
  }
  const masterState = getDashboardMasterState();
  if (masterState === null) {
    return;
  }
  refreshDiagnosticStatus();
  refreshOnlineNode();
}
/* =====================================================
    REFRESH DIAGNOSTICS STATUS
===================================================== */
function refreshDiagnosticStatus() {
  const diagnostics = window.appState?.diagnostics;
  const masterStatus = getDashboardMasterState();
  if (masterStatus === null) {
    return;
  }
  const nodeAStatus = getDashboardEffectiveNodeState("nodeA");
  const nodeBStatus = getDashboardEffectiveNodeState("nodeB");
  const updateStatus = (statusTextId, statusDotId, status) => {
    const text = document.getElementById(statusTextId);
    const dot = document.getElementById(statusDotId);
    if (!text || !dot) {
      return;
    }
    const normalizedStatus = String(status ?? "WAITING").toUpperCase();
    text.textContent = normalizedStatus;
    text.classList.remove(
      "text-emerald-600",
      "text-amber-500",
      "text-red-500",
      "text-slate-500",
    );
    dot.classList.remove(
      "bg-emerald-500",
      "bg-amber-500",
      "bg-red-500",
      "bg-slate-400",
    );
    switch (normalizedStatus) {
      case "ONLINE":
        text.classList.add("text-emerald-600");
        dot.classList.add("bg-emerald-500");
        break;
      case "OFFLINE":
        text.classList.add("text-red-500");
        dot.classList.add("bg-red-500");
        break;
      case "WAITING":
      default:
        text.classList.add("text-slate-500");
        dot.classList.add("bg-slate-400");
        break;
    }
  };
  /*
  MASTER
  → tetap menggunakan Diagnostics Master.
  */
  updateStatus("masterStatusText", "masterStatusDot", masterStatus);
  /*
  NODE A
  → menggunakan Monitoring.connection.nodeA.state
  */
  updateStatus("nodeAOnlineStatusText", "nodeAOnlineStatusDot", nodeAStatus);
  /*
  NODE B
  → menggunakan Monitoring.connection.nodeB.state
  */
  updateStatus("nodeBOnlineStatusText", "nodeBOnlineStatusDot", nodeBStatus);
}
function refreshLastSync() {
  const el = document.getElementById("dashboardLastSync");
  if (!el) {
    return;
  }
  const diagnostics = window.appState?.diagnostics;
  if (!diagnostics) {
    el.textContent = "--";
    return;
  }
  const timestamps = [];
  const nodeALastReceive = Number(diagnostics.nodeA?.lastReceive);
  const nodeBLastReceive = Number(diagnostics.nodeB?.lastReceive);
  if (Number.isFinite(nodeALastReceive) && nodeALastReceive > 0) {
    timestamps.push(nodeALastReceive);
  }
  if (Number.isFinite(nodeBLastReceive) && nodeBLastReceive > 0) {
    timestamps.push(nodeBLastReceive);
  }
  if (timestamps.length === 0) {
    el.textContent = "--";
    return;
  }
  const latest = Math.max(...timestamps);
  const date = new Date(latest);
  if (Number.isNaN(date.getTime())) {
    el.textContent = "--";
    return;
  }
  el.textContent = date.toLocaleTimeString(getDashboardLocale(), {
    hour12: false,
  });
}
function refreshAverageLight(nodeA, nodeB) {
  const values = [];
  if (nodeA && getConnectionState("nodeA") === CONNECTION_STATE.ONLINE) {
    values.push(Number(nodeA.averageLight));
  }
  if (nodeB && getConnectionState("nodeB") === CONNECTION_STATE.ONLINE) {
    values.push(Number(nodeB.averageLight));
  }
  const el = document.getElementById("avgLight");
  if (!el) {
    return;
  }
  if (values.length === 0) {
    el.textContent = "--";
    return;
  }
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  el.textContent = avg.toFixed(2);
}
/* =====================================================
    RECENT ACTIVITY
===================================================== */
function refreshRecentActivity() {
  collectRecentActivities();
  Dashboard.activities.sort((a, b) => {
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return b.priority - a.priority;
  });
  Dashboard.activities = Dashboard.activities.slice(0, 5);
  syncActivityCache();
  renderRecentActivities();
}
function collectNodeActivity(nodeId, roomName) {
  const node = Monitoring.roomData[nodeId];
  if (!node) {
    return;
  }
  appendActivity({
    key: `${nodeId}_${node.timestamp}`,
    type: "success",
    title: `${roomName} berhasil sinkron`,
    description: "Data monitoring berhasil diterima Gateway.",
    timestamp: node.timestamp || getDashboardCurrentTime(),
  });
}
/* =====================================================
    COLLECT RECENT ACTIVITIES
===================================================== */
function collectRecentActivities() {
  collectCommunicationEvent("nodeA", Language.get("room.nodeA"));
  collectCommunicationEvent("nodeB", Language.get("room.nodeB"));
  collectMonitoringEvents();
}
function getDashboardConnection(roomID) {
  return getConnection(roomID);
}
function getCommunicationEventTimestamp(connection, state) {
  /*
  =====================================================
  COMMUNICATION STATE TRANSITION TIMESTAMP
  =====================================================
  Notification merepresentasikan waktu ketika Dashboard
  mendeteksi perubahan state, bukan timestamp paket lama.
  Karena itu semua state transition menggunakan
  application/server time yang sama dengan website clock.
  */
  switch (state) {
    case CONNECTION_STATE.ONLINE:
    case CONNECTION_STATE.WAITING:
    case CONNECTION_STATE.OFFLINE:
      return getDashboardCurrentTime();
    default:
      return getDashboardCurrentTime();
  }
}
/* =====================================================
    COMMUNICATION EVENTS
===================================================== */
function collectCommunicationEvent(nodeId, roomName) {
  const connection = getDashboardConnection(nodeId);
  if (!connection) {
    return;
  }
  const state = Dashboard.eventState[nodeId];
  if (!state) {
    return;
  }
  /*
    ==========================================
    INITIAL BASELINE
    ==========================================
    Jika halaman baru dimuat dan node belum pernah
    menerima paket, state WAITING hanyalah state
    sementara dari connection engine.
    Jangan menjadikan WAITING sebagai baseline event
    sebelum komunikasi node benar-benar terverifikasi.
  */
  if (!state.initialized) {
    if (!connection.received && connection.state === CONNECTION_STATE.WAITING) {
      return;
    }
    /*
      State pertama yang sudah terverifikasi hanya
      digunakan sebagai baseline.
      INITIAL STATE BUKAN EVENT.
    */
    state.communication = connection.state;
    state.initialized = true;
    return;
  }
  /*
    ==========================================
    NO STATE CHANGE
    ==========================================
    Selama kondisi komunikasi tetap sama,
    jangan membuat notification baru.
  */
  if (state.communication === connection.state) {
    return;
  }
  /*
    ==========================================
    STATE CHANGE
    ==========================================
  */
  const currentState = connection.state;
  const eventTimestamp = getCommunicationEventTimestamp(
    connection,
    currentState,
  );
  /*
    ==========================================
    ONLINE
    ==========================================
  */
  if (currentState === CONNECTION_STATE.ONLINE) {
    appendActivity({
      key: `${nodeId}_online_${eventTimestamp}`,
      category: "communication",
      type: "success",
      titleKey: "activity.communication.online.title",
      descriptionKey: "activity.communication.online.description",
      values: {
        roomKey: `room.${nodeId}`,
      },
      timestamp: eventTimestamp,
    });
  } else if (currentState === CONNECTION_STATE.WAITING) {
    /*
    ==========================================
    WAITING
    ==========================================
  */
    appendActivity({
      key: `${nodeId}_waiting_${eventTimestamp}`,
      category: "communication",
      type: "warning",
      titleKey: "activity.communication.waiting.title",
      descriptionKey: "activity.communication.waiting.description",
      values: {
        roomKey: `room.${nodeId}`,
      },
      timestamp: eventTimestamp,
    });
  } else if (currentState === CONNECTION_STATE.OFFLINE) {
    /*
    ==========================================
    OFFLINE
    ==========================================
  */
    appendActivity({
      key: `${nodeId}_offline_${eventTimestamp}`,
      category: "communication",
      type: "danger",
      titleKey: "activity.communication.offline.title",
      descriptionKey: "activity.communication.offline.description",
      values: {
        roomKey: `room.${nodeId}`,
      },
      timestamp: eventTimestamp,
    });
  }
  /*
    ==========================================
    SAVE CURRENT STATE
    ==========================================
  */
  state.communication = currentState;
}
/* =====================================================
    MASTER COMMUNICATION EVENTS
===================================================== */
function collectMasterCommunicationEvent() {
  const master = window.appState?.diagnostics?.master;
  const currentState = getDashboardMasterState();
  if (currentState === null) {
    return;
  }
  const state = Dashboard.eventState.master;
  if (!state) {
    return;
  }
  /*
    ==========================================
    INITIAL BASELINE
    ==========================================
    Jika Firebase belum memiliki heartbeat Master,
    WAITING hanya merupakan kondisi awal.
    Jangan membuat notification.
  */
  const lastUpdate = getDashboardMasterHeartbeatTimestamp();
  const hasHeartbeat = lastUpdate > 0;
  if (!state.initialized) {
    if (!hasHeartbeat && currentState === "WAITING") {
      return;
    }
    /*
      State Master pertama yang valid hanya
      menjadi baseline, bukan notification.
    */
    state.communication = currentState;
    state.initialized = true;
    return;
  }
  /*
    ==========================================
    NO STATE CHANGE
    ==========================================
  */
  if (state.communication === currentState) {
    return;
  }
  /*
    ==========================================
    STATE CHANGE
    ==========================================
  */
  const eventTimestamp = getDashboardCurrentTime();
  if (currentState === "ONLINE") {
    appendActivity({
      key: `master_online_${eventTimestamp}`,
      category: "communication",
      type: "success",
      titleKey: "activity.communication.master.online.title",
      descriptionKey: "activity.communication.master.online.description",
      timestamp: eventTimestamp,
    });
  } else if (currentState === "WAITING") {
    appendActivity({
      key: `master_waiting_${eventTimestamp}`,
      category: "communication",
      type: "warning",
      titleKey: "activity.communication.master.waiting.title",
      descriptionKey: "activity.communication.master.waiting.description",
      timestamp: eventTimestamp,
    });
  } else if (currentState === "OFFLINE") {
    appendActivity({
      key: `master_offline_${eventTimestamp}`,
      category: "communication",
      type: "danger",
      titleKey: "activity.communication.master.offline.title",
      descriptionKey: "activity.communication.master.offline.description",
      timestamp: eventTimestamp,
    });
  }
  /*
    ==========================================
    SAVE CURRENT STATE
    ==========================================
  */
  state.communication = currentState;
}
/* =====================================================
    MONITORING EVENTS
===================================================== */
function collectMonitoringEvents() {
  collectDustEvent("nodeA", Language.get("room.nodeA"));
  collectDustEvent("nodeB", Language.get("room.nodeB"));
  collectLightEvent("nodeA", Language.get("room.nodeA"));
  collectLightEvent("nodeB", Language.get("room.nodeB"));
}
function collectDustEvent(nodeId, roomName) {
  const node = Monitoring.roomData[nodeId];
  if (!node) {
    return;
  }
  const currentState =
    Number(node.averageDust) > CONFIG.threshold.dust.normal
      ? "warning"
      : "normal";
  const eventState = Dashboard.eventState[nodeId];
  if (!eventState.dustInitialized) {
    eventState.dust = currentState;
    eventState.dustInitialized = true;
    return;
  }
  const previousState = eventState.dust;
  if (currentState === previousState) {
    return;
  }
  eventState.dust = currentState;
  appendActivity({
    key: `${nodeId}_dust_${node.timestamp}`,
    category: "dust",
    type: currentState === "warning" ? "warning" : "success",
    titleKey:
      currentState === "warning"
        ? "activity.dust.high.title"
        : "activity.dust.normal.title",
    descriptionKey:
      currentState === "warning"
        ? "activity.dust.high.description"
        : "activity.dust.normal.description",
    values: {
      roomKey: `room.${nodeId}`,
      value: Number(node.averageDust).toFixed(2),
      threshold: CONFIG.threshold.dust.normal,
    },
    timestamp: node.timestamp,
  });
}
function collectLightEvent(nodeId, roomName) {
  const node = Monitoring.roomData[nodeId];
  if (!node) {
    return;
  }
  let currentState = "normal";
  if (Number(node.averageLight) < CONFIG.threshold.light.minimum) {
    currentState = "low";
  } else if (Number(node.averageLight) > CONFIG.threshold.light.maximum) {
    currentState = "high";
  }
  const eventState = Dashboard.eventState[nodeId];
  if (!eventState.lightInitialized) {
    eventState.light = currentState;
    eventState.lightInitialized = true;
    return;
  }
  const previousState = eventState.light;
  if (currentState === previousState) {
    return;
  }
  eventState.light = currentState;
  let type = "success";
  let titleKey = "";
  let descriptionKey = "";
  switch (currentState) {
    case "low":
      type = "warning";
      titleKey = "activity.light.low.title";
      descriptionKey = "activity.light.low.description";
      break;
    case "high":
      type = "warning";
      titleKey = "activity.light.high.title";
      descriptionKey = "activity.light.high.description";
      break;
    default:
      type = "success";
      titleKey = "activity.light.normal.title";
      descriptionKey = "activity.light.normal.description";
  }
  appendActivity({
    key: `${nodeId}_light_${node.timestamp}`,
    category: "light",
    type,
    titleKey,
    descriptionKey,
    values: {
      roomKey: `room.${nodeId}`,
      value: Number(node.averageLight).toFixed(2),
      minimum: CONFIG.threshold.light.minimum,
      maximum: CONFIG.threshold.light.maximum,
    },
    timestamp: node.timestamp,
  });
}
/* =====================================================
    ACTIVITY PRIORITY
===================================================== */
function getActivityPriority(type) {
  switch (type) {
    case "danger":
      return 3;
    case "warning":
      return 2;
    case "success":
      return 1;
    default:
      return 0;
  }
}
/* =====================================================
    APPEND ACTIVITY
===================================================== */
function appendActivity({
  key,
  category = "system",
  type,
  priority = "normal",
  title,
  description,
  titleKey,
  descriptionKey,
  values = {},
  timestamp = getDashboardCurrentTime(),
}) {
  if (!key) return;
  if (Dashboard.activityCache.has(key)) {
    return;
  }
  Dashboard.activityCache.add(key);
  const translatedValues = {
    ...(values || {}),
  };
  if (translatedValues.roomKey) {
    translatedValues.room = Language.get(translatedValues.roomKey);
  }
  const activityTitle = titleKey
    ? Language.replace(Language.get(titleKey), translatedValues)
    : title;
  const activityDescription = descriptionKey
    ? Language.replace(Language.get(descriptionKey), translatedValues)
    : description;
  Dashboard.activities.unshift({
    key,
    category,
    type,
    priority,
    titleKey,
    descriptionKey,
    values,
    title: activityTitle,
    description: activityDescription,
    timestamp,
  });
  pushDashboardNotification(Dashboard.activities[0]);
}
function refreshDashboardActivityLanguage() {
  Dashboard.activities.forEach((activity) => {
    if (!activity.titleKey) return;
    const translatedValues = {
      ...(activity.values || {}),
    };
    if (translatedValues.roomKey) {
      translatedValues.room = Language.get(translatedValues.roomKey);
    }
    activity.title = Language.replace(
      Language.get(activity.titleKey),
      translatedValues,
    );
    activity.description = Language.replace(
      Language.get(activity.descriptionKey),
      translatedValues,
    );
  });
}
/* =====================================================
    SYNC ACTIVITY CACHE
===================================================== */
function syncActivityCache() {
  Dashboard.activityCache = new Set(
    Dashboard.activities.map((activity) => activity.key),
  );
}
/* =====================================================
    FORMAT RELATIVE TIME
===================================================== */
function formatRelativeTime(timestamp) {
  const diff = Math.floor(
    (getDashboardCurrentTime() - Number(timestamp)) / 1000,
  );
  if (diff < 60) {
    return "Baru saja";
  }
  if (diff < 3600) {
    return `${Math.floor(diff / 60)} menit lalu`;
  }
  if (diff < 86400) {
    return `${Math.floor(diff / 3600)} jam lalu`;
  }
  return new Date(timestamp).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
  });
}
/* =====================================================
    FORMAT ACTIVITY TIME
===================================================== */
function formatActivityTime(timestamp) {
  const diff = Math.floor(
    (getDashboardCurrentTime() - Number(timestamp)) / 1000,
  );
  if (diff < 5) {
    return Language.format("dashboard.activity.justNow");
  }
  if (diff < 60) {
    return Language.format("dashboard.activity.secondsAgo", diff);
  }
  const minute = Math.floor(diff / 60);
  if (minute < 60) {
    return Language.format("dashboard.activity.minutesAgo", minute);
  }
  return new Date(Number(timestamp)).toLocaleTimeString(getDashboardLocale(), {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}
/* =====================================================
    RENDER RECENT ACTIVITY
===================================================== */
function renderRecentActivities() {
  const container = document.getElementById("activityList");
  if (!container) return;
  container.innerHTML = "";
  if (Dashboard.activities.length === 0) {
    container.innerHTML = `
            <div class="px-6 py-10 text-center">
                <i class="bi bi-inbox text-4xl text-slate-300"></i>
                <h4 class="mt-3 font-medium text-slate-600">
                    ${Language.get("activity.empty.title")}
                </h4>
                <p class="text-sm text-slate-400 mt-2">
                    ${Language.get("activity.empty.description")}
                </p>
            </div>
        `;
    return;
  }
  Dashboard.activities.forEach((activity, index) => {
    let color = "blue";
    let icon = "bi-info-circle";
    switch (activity.category) {
      case "dust":
        icon = "bi-wind";
        color = activity.type === "warning" ? "amber" : "green";
        break;
      case "light":
        icon = "bi-brightness-high-fill";
        color = activity.type === "warning" ? "yellow" : "green";
        break;
      case "communication":
        icon = "bi-wifi";
        color = activity.type === "danger" ? "red" : "green";
        break;
      default:
        icon = "bi-cpu";
        color = "blue";
    }
    const time = formatActivityTime(activity.timestamp);
    container.insertAdjacentHTML(
      "beforeend",
      `
            <div class="flex justify-between items-center px-6 py-4 ${index < Dashboard.activities.length - 1 ? "border-b" : ""}">
                <div class="flex items-center gap-4">
                    <div class="w-11 h-11 rounded-full bg-${color}-100 flex items-center justify-center">
                        <i class="bi ${icon} text-${color}-600"></i>
                    </div>
                    <div>
                        <h4 class="font-medium">
                            ${activity.title}
                        </h4>
                        <p class="text-sm text-slate-500">
                            ${activity.description}
                        </p>
                    </div>
                </div>
                <span class="activity-time text-sm text-slate-400"
                data-timestamp="${activity.timestamp}">
                    ${time}
                </span>
            </div>
            `,
    );
  });
}
/* =====================================================
    REFRESH ACTIVITY TIMES
===================================================== */
function refreshActivityTimes() {
  document.querySelectorAll(".activity-time").forEach((item) => {
    item.textContent = formatActivityTime(item.dataset.timestamp);
  });
}
