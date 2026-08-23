/* ===========================================================
    monitoring.js
    Version 2.0
=========================================================== */
/* ===========================================================
    CONNECTION STATE
=========================================================== */
const CONNECTION_STATE = Object.freeze({
  WAITING: "waiting",
  ONLINE: "online",
  OFFLINE: "offline",
});
const Monitoring = {
  state: {
    room: "nodeA",
    trend: {
      nodeA: {
        sensor: null,
        parameter: "dust",
        source: "average",
        timeRange: "24h",
        startDate: null,
        endDate: null,
        data: [],
        analysisDataset: null,
        analysisStatistics: null,
        loading: false,
        lastAnalyzedAt: null,
      },
      nodeB: {
        sensor: null,
        parameter: "dust",
        source: "average",
        timeRange: "24h",
        startDate: null,
        endDate: null,
        data: [],
        analysisDataset: null,
        analysisStatistics: null,
        loading: false,
        lastAnalyzedAt: null,
      },
    },
  },
  interaction: {
    roomChart: {
      nodeA: {
        mode: "live",
        limit: 10,
      },
      nodeB: {
        mode: "live",
        limit: 10,
      },
    },
    trendChart: {
      nodeA: {
        mode: "live",
      },
      nodeB: {
        mode: "live",
      },
    },
  },
  charts: {},
  chartHistory: {
    nodeA: {
      labels: [],
      dust: [],
      light: [],
    },
    nodeB: {
      labels: [],
      dust: [],
      light: [],
    },
  },
  sensors: {},
  roomData: {},
  historyData: {
    nodeA: [],
    nodeB: [],
  },
  trendHistoryCache: {
    nodeA: {
      key: null,
      start: null,
      end: null,
      data: [],
      cachedAt: 0,
    },
    nodeB: {
      key: null,
      start: null,
      end: null,
      data: [],
      cachedAt: 0,
    },
  },
  historyLoaded: {
    nodeA: false,
    nodeB: false,
  },
  connection: {
    nodeA: {
      state: CONNECTION_STATE.WAITING,
      lastReceive: 0,
      received: false,
      startedAt: getMonitoringCurrentTime(),
    },
    nodeB: {
      state: CONNECTION_STATE.WAITING,
      lastReceive: 0,
      received: false,
      startedAt: getMonitoringCurrentTime(),
    },
  },
  initialized: false,
  listener: null,
  subscribedRoom: null,
};
/* ===========================================================
   CURRENT ROOM HELPER STATE (TREND ANALYSIS)
=========================================================== */
function getCurrentRoomID() {
  return Monitoring.state.room;
}
function setCurrentRoom(roomID) {
  Monitoring.state.room = roomID;
  Monitoring.currentRoom = roomID;
}
/* ===========================================================
   TREND ANALYSIS STATE
=========================================================== */
function getTrendState() {
  return Monitoring.state.trend[getCurrentRoomID()];
}
/* ===========================================================
   INVALIDATE TREND PROCESSING CACHE
=========================================================== */
function invalidateTrendProcessingCache() {
  const state = getTrendState();
  state.analysisDataset = null;
  state.analysisStatistics = null;
}
/* ===========================================================
   TREND RAW HISTORY CACHE
=========================================================== */
const TREND_HISTORY_CACHE_TTL = 15 * 1000;
function getTrendHistoryCache() {
  return Monitoring.trendHistoryCache[getCurrentRoomID()];
}
function buildTrendHistoryCacheKey() {
  const state = getTrendState();
  // Quick Range
  if (state.timeRange !== "manual") {
    return [getCurrentRoomID(), state.timeRange].join("|");
  }
  // Manual Range
  return [
    getCurrentRoomID(),
    "manual",
    state.startDate || "",
    state.endDate || "",
  ].join("|");
}
function getTrendParameter() {
  return getTrendState().parameter;
}
function setTrendParameter(parameter) {
  const state = getTrendState();
  if (parameter !== "dust" && parameter !== "light") {
    return;
  }
  state.parameter = parameter;
}
function getTrendSource() {
  return getTrendState().source;
}
function setTrendSource(source) {
  const state = getTrendState();
  if (source !== "average" && source !== "individual") {
    return;
  }
  state.source = source;
}
function getTrendSensor() {
  return getTrendState().sensor;
}
function setTrendSensor(sensor) {
  getTrendState().sensor = sensor;
}
/* ===========================================================
   TREND ANALYSIS TIME RANGE
=========================================================== */
function getTrendAnalysisRange() {
  const state = getTrendState();
  const now = new Date();
  /* ==========================================================
      QUICK RANGE
  ========================================================== */
  if (state.timeRange !== "manual") {
    const end = now.getTime();
    const durations = {
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "12h": 12 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    };
    const duration = durations[state.timeRange];
    if (!duration) {
      return {
        start: end - 24 * 60 * 60 * 1000,
        end,
      };
    }
    return {
      start: end - duration,
      end,
    };
  }
  /* ==========================================================
   * MANUAL DATE RANGE
   ========================================================== */
  if (!state.startDate || !state.endDate) {
    return null;
  }
  const startDate = new Date(`${state.startDate}T00:00:00`);
  const endDate = new Date(`${state.endDate}T23:59:59.999`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  if (startDate.getTime() > endDate.getTime()) {
    return null;
  }
  return {
    start: startDate.getTime(),
    end: endDate.getTime(),
  };
}
/* ===========================================================
   LOAD TREND ANALYSIS HISTORY
=========================================================== */
async function loadTrendAnalysisHistory() {
  const state = getTrendState();
  const roomID = getCurrentRoomID();
  const range = getTrendAnalysisRange();
  if (!range) {
    console.warn("Trend Analysis dibatalkan: rentang waktu tidak valid.");
    state.data = [];
    state.lastAnalyzedAt = null;
    return {
      success: false,
      data: [],
      reason: "invalid-range",
    };
  }
  // Raw History Cache
  const cache = getTrendHistoryCache();
  const cacheKey = buildTrendHistoryCacheKey();
  const cacheAge = Date.now() - Number(cache.cachedAt || 0);
  const cacheValid =
    cache.key === cacheKey &&
    Array.isArray(cache.data) &&
    cache.data.length > 0 &&
    cacheAge <= TREND_HISTORY_CACHE_TTL;
  if (cacheValid) {
    state.data = cache.data;
    state.lastAnalyzedAt = Date.now();
    return {
      success: true,
      data: cache.data,
      start: cache.start,
      end: cache.end,
      cached: true,
    };
  }
  if (typeof db === "undefined") {
    console.warn(
      "Firebase database tidak tersedia. Menggunakan history lokal.",
    );
    const fallback = currentHistory()
      .filter((item) => {
        const timestamp = Number(item?.waktu);
        return (
          Number.isFinite(timestamp) &&
          timestamp >= range.start &&
          timestamp <= range.end
        );
      })
      .sort((a, b) => Number(a.waktu) - Number(b.waktu));
    state.data = fallback;
    invalidateTrendProcessingCache();
    state.lastAnalyzedAt = Date.now();
    return {
      success: true,
      data: fallback,
      fallback: true,
    };
  }
  const path = DB_PATH?.history?.[roomID];
  if (!path) {
    console.error(`Path history tidak ditemukan untuk room ${roomID}.`);
    state.data = [];
    state.lastAnalyzedAt = null;
    return {
      success: false,
      data: [],
      reason: "missing-path",
    };
  }
  state.loading = true;
  try {
    const snapshot = await db
      .ref(path)
      .orderByChild("waktu")
      .startAt(range.start)
      .endAt(range.end)
      .once("value");
    const records = [];
    snapshot.forEach((child) => {
      const value = child.val();
      if (!value) {
        return;
      }
      const timestamp = Number(value.waktu);
      if (
        !Number.isFinite(timestamp) ||
        timestamp < range.start ||
        timestamp > range.end
      ) {
        return;
      }
      records.push({
        key: child.key,
        ...value,
        roomID,
      });
    });
    records.sort((a, b) => Number(a.waktu) - Number(b.waktu));
    // Store RAW History Cache
    cache.key = cacheKey;
    cache.start = range.start;
    cache.end = range.end;
    cache.data = records;
    cache.cachedAt = Date.now();
    invalidateTrendProcessingCache();
    state.data = records;
    state.lastAnalyzedAt = Date.now();
    return {
      success: true,
      data: records,
      start: range.start,
      end: range.end,
    };
  } catch (error) {
    console.error("Trend Analysis history query gagal:", error);
    state.data = [];
    state.lastAnalyzedAt = null;
    return {
      success: false,
      data: [],
      reason: "firebase-error",
      error,
    };
  } finally {
    state.loading = false;
  }
}
/* ===========================================================
   TREND ANALYSIS LOADING STATE
=========================================================== */
function setTrendAnalysisLoadingState(isLoading) {
  const button = document.getElementById("trendApplyAnalysis");
  if (!button) {
    return;
  }
  button.disabled = isLoading;
  if (isLoading) {
    button.classList.add("opacity-75", "cursor-not-allowed");
    button.innerHTML = `
      <i class="bi bi-arrow-repeat animate-spin"></i>
      <span data-i18n="monitoring.analysis.analyzing">
        Menganalisis...
      </span>
    `;
    return;
  }
  button.classList.remove("opacity-75", "cursor-not-allowed");
  button.innerHTML = `
    <i class="bi bi-graph-up"></i>
    <span data-i18n="monitoring.analysis.analyze">
      Analisis
    </span>
  `;
  /*
   * Terapkan bahasa aktif terhadap teks tombol
   * setelah innerHTML dibuat ulang.
   */
  if (typeof Language?.apply === "function") {
    Language.apply();
  }
}
/* ===========================================================
   RUN TREND ANALYSIS
=========================================================== */
async function runTrendAnalysis() {
  setTrendAnalysisLoadingState(true);
  try {
    const result = await loadTrendAnalysisHistory();
    refreshTrendAnalysis();
    return result;
  } catch (error) {
    console.error("[Trend Analysis] Analysis failed:", error);
    return {
      success: false,
      reason: "analysis-error",
      error,
    };
  } finally {
    setTrendAnalysisLoadingState(false);
  }
}
/* ===========================================================
   SYNC NEW TREND ANALYSIS CONTROLS
=========================================================== */
function syncTrendAnalysisControls() {
  const parameter = document.getElementById("trendParameter");
  const source = document.getElementById("trendSource");
  if (parameter) {
    parameter.value = getTrendParameter();
  }
  if (source) {
    source.value = getTrendSource();
  }
  updateTrendSensorDropdown();
}
/* ===========================================================
   SYNC ANALYSIS DATE CONTROLS
=========================================================== */
function syncTrendAnalysisDateControls() {
  const range = document.getElementById("trendAnalysisRange");
  const startDate = document.getElementById("trendStartDate");
  const endDate = document.getElementById("trendEndDate");
  if (range) {
    range.value = getTrendState().timeRange;
  }
  const manual = getTrendState().timeRange === "manual";
  if (startDate) {
    startDate.disabled = !manual;
    startDate.classList.toggle("bg-slate-100", !manual);
    if (!manual) {
      startDate.value = "";
    } else {
      startDate.value = getTrendState().startDate || "";
    }
  }
  if (endDate) {
    endDate.disabled = !manual;
    endDate.classList.toggle("bg-slate-100", !manual);
    if (!manual) {
      endDate.value = "";
    } else {
      endDate.value = getTrendState().endDate || "";
    }
  }
}
/* ===========================================================
    APPEND REALTIME HISTORY
=========================================================== */
function appendRealtimeHistory(averageDust, averageLight) {
  const history = currentChartHistory();
  const now = new Date();
  history.labels.push(
    now.toLocaleTimeString(getDashboardLocale(), {
      hour12: false,
    }),
  );
  history.dust.push(Number(averageDust));
  history.light.push(Number(averageLight));
  while (history.labels.length > CONFIG.chart.maxPoints) {
    history.labels.shift();
    history.dust.shift();
    history.light.shift();
  }
}
/* ===========================================================
    REFRESH REALTIME CHART
=========================================================== */
function refreshRealtimeChart() {
  if (isRoomChartExploreMode()) {
    return;
  }
  const chart = getRealtimeChart();
  if (!chart) {
    return;
  }
  const history = getRealtimeRenderHistory();
  chart.data.labels = [...history.labels];
  chart.data.datasets[0].data = [...history.dust];
  chart.data.datasets[1].data = [...history.light];
  chart.update("none");
}
/* ===========================================================
    GET REALTIME RENDER HISTORY
=========================================================== */
function getRealtimeRenderHistory() {
  const history = currentChartHistory();
  const limit = getRoomChartInteraction().limit;
  return {
    labels: history.labels.slice(-limit),
    dust: history.dust.slice(-limit),
    light: history.light.slice(-limit),
  };
}
/* ===========================================================
    GET REALTIME CHART
=========================================================== */
function getRealtimeChart() {
  return Monitoring.charts.room || null;
}
/* ===========================================================
    GET TREND CHART
=========================================================== */
function getTrendChart() {
  return Monitoring.charts.trend || null;
}
/* ===========================================================
    ROOM CHART INTERACTION
=========================================================== */
function getRoomChartInteraction() {
  return Monitoring.interaction.roomChart[getCurrentRoomID()];
}
function isRoomChartLiveMode() {
  return getRoomChartInteraction().mode === "live";
}
function isRoomChartExploreMode() {
  return getRoomChartInteraction().mode === "explore";
}
function setRoomChartInteractionMode(mode) {
  getRoomChartInteraction().mode = mode;
}
/* ===========================================================
    TREND CHART INTERACTION
=========================================================== */
function getTrendChartInteraction() {
  return Monitoring.interaction.trendChart[getCurrentRoomID()];
}
function isTrendChartExploreMode() {
  return getTrendChartInteraction().mode === "explore";
}
function setTrendChartInteractionMode(mode) {
  getTrendChartInteraction().mode = mode;
}
/* ===========================================================
    ROOM CHART INTERACTION ENGINE
=========================================================== */
function applyRoomChartInteraction() {
  const chart = getRealtimeChart();
  if (!chart) {
    return;
  }
  const explore = isRoomChartExploreMode();
  chart.options.plugins.zoom.pan.enabled = explore;
  chart.options.plugins.zoom.zoom.wheel.enabled = explore;
  chart.options.plugins.zoom.zoom.pinch.enabled = explore;
  chart.options.plugins.zoom.zoom.drag.enabled = false;
  chart.update("none");
}
/* ===========================================================
    TREND CHART INTERACTION ENGINE
=========================================================== */
function applyTrendChartInteraction() {
  const chart = getTrendChart();
  if (!chart) {
    return;
  }
  const explore = isTrendChartExploreMode();
  chart.options.plugins.zoom.pan.enabled = explore;
  chart.options.plugins.zoom.zoom.wheel.enabled = explore;
  chart.options.plugins.zoom.zoom.pinch.enabled = explore;
  chart.options.plugins.zoom.zoom.drag.enabled = false;
  chart.update("none");
}
/* ===========================================================
    ROOM CHART CONTROLLER
=========================================================== */
function enableRoomChartExploreMode() {
  if (isRoomChartExploreMode()) {
    return;
  }
  setRoomChartInteractionMode("explore");
  applyRoomChartInteraction();
  updateRoomChartZoomButton();
  updateRoomChartToolbarState();
}
function enableRoomChartLiveMode() {
  const chart = getRealtimeChart();
  if (chart) {
    chart.resetZoom();
  }
  setRoomChartInteractionMode("live");
  refreshRealtimeChart();
  restoreRoomChart();
}
/* ===========================================================
    RESET ROOM CHART VIEW
=========================================================== */
function resetRoomChartView() {
  const chart = getRealtimeChart();
  if (chart) {
    chart.resetZoom();
  }
  setRoomChartInteractionMode("live");
  applyRoomChartInteraction();
  refreshRealtimeChart();
  updateRoomChartZoomButton();
  updateRoomChartToolbarState();
}
/* ===========================================================
    EXIT MONITORING EXPLORE MODE
=========================================================== */
function exitMonitoringExploreMode() {
  Object.values(Monitoring.interaction.roomChart).forEach((interaction) => {
    interaction.mode = "live";
  });
  Object.values(Monitoring.interaction.trendChart).forEach((interaction) => {
    interaction.mode = "live";
  });
}
/* ===========================================================
    TREND CHART CONTROLLER
=========================================================== */
function enableTrendChartExploreMode() {
  if (isTrendChartExploreMode()) {
    return;
  }
  setTrendChartInteractionMode("explore");
  applyTrendChartInteraction();
  updateTrendChartZoomButton();
}
/* ===========================================================
    RESET TREND CHART VIEW
=========================================================== */
function resetTrendChartView() {
  const chart = getTrendChart();
  if (chart) {
    chart.resetZoom();
  }
  setTrendChartInteractionMode("live");
  applyTrendChartInteraction();
  refreshTrendAnalysis();
  updateTrendChartZoomButton();
}
/* ===========================================================
    ROOM CHART BUTTON
=========================================================== */
function updateRoomChartZoomButton() {
  const button = document.getElementById("roomTrendZoom");
  if (!button) {
    return;
  }
  button.classList.remove("theme-button-primary");
  if (isRoomChartExploreMode()) {
    button.classList.add("theme-button-primary");
  }
}
/* ===========================================================
    ROOM CHART TOOLBAR STATE
=========================================================== */
function updateRoomChartToolbarState() {
  const explore = isRoomChartExploreMode();
  ["roomTrend10Btn", "roomTrend20Btn", "roomTrend50Btn"].forEach((id) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.disabled = explore;
    button.classList.toggle("opacity-50", explore);
    button.classList.toggle("cursor-not-allowed", explore);
  });
}
/* ===========================================================
    ROOM CHART LIMIT
=========================================================== */
function setRoomChartLimit(limit) {
  getRoomChartInteraction().limit = limit;
  updateRoomChartLimitButton();
  refreshRealtimeChart();
}
/* ===========================================================
    ROOM CHART LIMIT BUTTON
=========================================================== */
function updateRoomChartLimitButton() {
  const limit = getRoomChartInteraction().limit;
  const buttons = {
    10: "roomTrend10Btn",
    20: "roomTrend20Btn",
    50: "roomTrend50Btn",
  };
  Object.entries(buttons).forEach(([value, id]) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.classList.remove("theme-button-primary");
    if (Number(value) === limit) {
      button.classList.add("theme-button-primary");
    }
  });
}
/* ===========================================================
    TREND CHART BUTTON
=========================================================== */
function updateTrendChartZoomButton() {
  const button = document.getElementById("analysisTrendZoom");
  if (!button) {
    return;
  }
  button.classList.remove("theme-button-primary");
  if (isTrendChartExploreMode()) {
    button.classList.add("theme-button-primary");
  }
}
function initializeMonitoringChartToolbar() {
  // Realtime Monitoring Chart
  document
    .getElementById("roomTrendReset")
    ?.addEventListener("click", resetRoomChartView);
  document
    .getElementById("roomTrendZoom")
    ?.addEventListener("click", enableRoomChartExploreMode);
  document
    .getElementById("roomTrend10Btn")
    ?.addEventListener("click", () => setRoomChartLimit(10));
  document
    .getElementById("roomTrend20Btn")
    ?.addEventListener("click", () => setRoomChartLimit(20));
  document
    .getElementById("roomTrend50Btn")
    ?.addEventListener("click", () => setRoomChartLimit(50));
  // Trend Analysis Chart
  document
    .getElementById("analysisTrendZoom")
    ?.addEventListener("click", enableTrendChartExploreMode);
  document
    .getElementById("analysisTrendReset")
    ?.addEventListener("click", resetTrendChartView);
}
/* ===========================================================
    INITIALIZE CHART INTERACTION
=========================================================== */
function initializeChartInteraction() {
  applyRoomChartInteraction();
  applyTrendChartInteraction();
  updateRoomChartZoomButton();
  updateTrendChartZoomButton();
  updateRoomChartToolbarState();
  updateRoomChartLimitButton();
}
/* ===========================================================
   TREND CHART THRESHOLD LABELS
=========================================================== */
function getTrendThresholdChartLabels() {
  const config = getTrendThresholdConfiguration();
  if (config.category === "dust") {
    return {
      normal: Language.replace(
        Language.get("monitoring.analysis.chartThreshold.normal"),
        {
          value: config.normal,
          unit: config.unit,
        },
      ),
      warning: Language.replace(
        Language.get("monitoring.analysis.chartThreshold.warning"),
        {
          value: config.warning,
          unit: config.unit,
        },
      ),
    };
  }
  return {
    minimum: Language.replace(
      Language.get("monitoring.analysis.chartThreshold.minimumIdeal"),
      {
        value: config.minimum,
        unit: config.unit,
      },
    ),
    maximum: Language.replace(
      Language.get("monitoring.analysis.chartThreshold.maximumIdeal"),
      {
        value: config.maximum,
        unit: config.unit,
      },
    ),
  };
}
/* ===========================================================
   UPDATE TREND CHART
=========================================================== */
function updateTrendChart(dataset) {
  if (isTrendChartExploreMode()) {
    return;
  }
  const chart = getTrendChart();
  if (!chart) {
    return;
  }
  const config = getTrendConfiguration();
  const threshold = getTrendThresholdConfiguration();
  /* ==========================================================
    MAIN DATASET
  ==========================================================*/
  chart.data.labels = [...dataset.labels];
  const mainDataset = chart.data.datasets[0];
  mainDataset.label = dataset.datasets[0].label;
  mainDataset.borderColor = config.color;
  mainDataset.backgroundColor = config.color + "33";
  mainDataset.unit = config.unit;
  mainDataset.decimals = config.decimals;
  mainDataset.category = config.category;
  ChartDesignSystem.setDatasetData(chart.data.datasets, [
    dataset.datasets[0].data,
  ]);
  /* ==========================================================
    REMOVE OLD THRESHOLD DATASETS
  ==========================================================*/
  chart.data.datasets = chart.data.datasets.filter(
    (item) => item.isTrendThreshold !== true,
  );
  /* ==========================================================
    CREATE THRESHOLD DATASET
  ==========================================================*/
  const labels = [...dataset.labels];
  if (labels.length > 0) {
    if (threshold.category === "dust") {
      chart.data.datasets.push(
        {
          label: getTrendThresholdChartLabels().normal,
          data: labels.map(() => threshold.normal),
          borderColor: "#64748B",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderDash: [6, 6],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          isTrendThreshold: true,
          category: "threshold",
        },
        {
          label: getTrendThresholdChartLabels().warning,
          data: labels.map(() => threshold.warning),
          borderColor: "#F59E0B",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          isTrendThreshold: true,
          category: "threshold",
        },
      );
    } else {
      chart.data.datasets.push(
        {
          label: getTrendThresholdChartLabels().minimum,
          data: labels.map(() => threshold.minimum),
          borderColor: "#64748B",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderDash: [6, 6],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          isTrendThreshold: true,
          category: "threshold",
        },
        {
          label: getTrendThresholdChartLabels().maximum,
          data: labels.map(() => threshold.maximum),
          borderColor: "#F59E0B",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          isTrendThreshold: true,
          category: "threshold",
        },
      );
    }
  }
  chart.update("none");
}
function getCurrentRoomData() {
  return Monitoring.roomData[getCurrentRoomID()];
}
function setCurrentRoomData(data) {
  Monitoring.roomData[getCurrentRoomID()] = data;
}
function currentRoom() {
  return CONFIG.rooms.find((room) => room.id === getCurrentRoomID());
}
function currentChartHistory() {
  return Monitoring.chartHistory[getCurrentRoomID()];
}
function currentHistory() {
  return Monitoring.historyData[getCurrentRoomID()];
}
/* ===========================================================
    CONNECTION HELPER
=========================================================== */
function getConnection(roomID) {
  return Monitoring.connection[roomID];
}
function hasReceivedPacket(roomID) {
  return getConnection(roomID).received;
}
/* ===========================================================
    MONITORING APPLICATION TIME
=========================================================== */
function getMonitoringCurrentTime() {
  const offset =
    typeof firebaseServerTimeOffset === "number" &&
    Number.isFinite(firebaseServerTimeOffset)
      ? firebaseServerTimeOffset
      : 0;
  return Date.now() + offset;
}
function getLastReceive(roomID) {
  return getConnection(roomID).lastReceive;
}
function getConnectionAge(roomID) {
  return getMonitoringCurrentTime() - getConnection(roomID).startedAt;
}
function updateLastReceive(roomID) {
  const connection = getConnection(roomID);
  connection.lastReceive = getMonitoringCurrentTime();
  connection.received = true;
}
function getConnectionState(roomID) {
  return getConnection(roomID).state;
}
function setConnectionState(roomID, state) {
  getConnection(roomID).state = state;
}
/* ===========================================================
    CONNECTION ENGINE
=========================================================== */
function calculateConnectionState(roomID) {
  const connection = getConnection(roomID);
  /*
    ====================================================
    BELUM PERNAH MENERIMA PAKET
    ====================================================
    */
  if (!connection.received) {
    if (getConnectionAge(roomID) <= CONFIG.communication.waiting) {
      return CONNECTION_STATE.WAITING;
    }
    return CONNECTION_STATE.OFFLINE;
  }
  /*
    ====================================================
    SUDAH PERNAH MENERIMA PAKET
    ====================================================
    */
  const diff = getMonitoringCurrentTime() - connection.lastReceive;
  if (diff <= CONFIG.communication.online) {
    return CONNECTION_STATE.ONLINE;
  }
  if (diff <= CONFIG.communication.waiting) {
    return CONNECTION_STATE.WAITING;
  }
  return CONNECTION_STATE.OFFLINE;
}
function receivePacket(roomID) {
  updateLastReceive(roomID);
  return syncConnectionState(roomID);
}
function syncConnectionState(roomID) {
  const state = calculateConnectionState(roomID);
  setConnectionState(roomID, state);
  return state;
}
/* ===========================================================
   TREND DATA PROVIDER
=========================================================== */
function getTrendProviderData() {
  const state = getTrendState();
  if (!Array.isArray(state.data)) {
    return [];
  }
  return state.data;
}
/* ===========================================================
   TREND VALUE EXTRACTOR
=========================================================== */
function getTrendValue(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const state = getTrendState();
  const parameter = state.parameter;
  const source = state.source;
  const sensor = Number(state.sensor);
  let value;
  /* ==========================================================
   * AVERAGE
  ========================================================== */
  if (source === "average") {
    if (parameter === "dust") {
      value = item.debu?.rata;
    } else if (parameter === "light") {
      value = item.cahaya?.rata;
    }
  }
  /* ==========================================================
   * INDIVIDUAL SENSOR
  ========================================================== */
  if (source === "individual") {
    if (!Number.isInteger(sensor) || sensor < 1) {
      return null;
    }
    const sensorIndex = sensor - 1;
    if (parameter === "dust") {
      value = item.debu?.["S" + sensorIndex];
    } else if (parameter === "light") {
      value = item.cahaya?.["S" + sensorIndex];
    }
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return number;
}
/* ===========================================================
   GET PREPARED TREND DATASET
=========================================================== */
function getPreparedTrendDataset() {
  const state = getTrendState();
  if (state.analysisDataset) {
    return state.analysisDataset;
  }
  const dataset = buildTrendDataset();
  state.analysisDataset = dataset;
  return dataset;
}
/* ===========================================================
   TREND DATASET BUILDER
=========================================================== */
function buildTrendDataset() {
  const history = getTrendProviderData();
  const labels = [];
  const values = [];
  history.forEach((item) => {
    const value = getTrendValue(item);
    /* Data yang tidak valid tidak dimasukkan ke dataset.
    Ini mencegah missing data berubah menjadi 0. */
    if (value === null) {
      return;
    }
    labels.push(
      new Date(item.waktu).toLocaleTimeString(getDashboardLocale(), {
        hour12: false,
      }),
    );
    values.push(value);
  });
  return {
    labels,
    values,
  };
}
/* ===========================================================
   TREND STATISTICS
=========================================================== */
function calculateTrendStatistics() {
  const state = getTrendState();
  if (state.analysisStatistics) {
    return state.analysisStatistics;
  }
  const dataset = getPreparedTrendDataset();
  const values = Array.isArray(dataset.values)
    ? dataset.values.filter((value) => Number.isFinite(Number(value)))
    : [];
  if (values.length === 0) {
    state.analysisStatistics = {
      average: null,
      minimum: null,
      maximum: null,
      range: null,
      dataPoints: 0,
    };
    return state.analysisStatistics;
  }
  const numbers = values.map(Number);
  const total = numbers.reduce((sum, value) => sum + value, 0);
  const minimum = Math.min(...numbers);
  const maximum = Math.max(...numbers);
  state.analysisStatistics = {
    average: total / numbers.length,
    minimum,
    maximum,
    range: maximum - minimum,
    dataPoints: numbers.length,
  };
  return state.analysisStatistics;
}
/* ===========================================================
   TREND THRESHOLD CONFIGURATION
=========================================================== */
function getTrendThresholdConfiguration() {
  const parameter = getTrendParameter();
  if (parameter === "dust") {
    return {
      category: "dust",
      unit: "µg/m³",
      normal: Number(CONFIG.threshold.dust.normal),
      warning: Number(CONFIG.threshold.dust.warning),
      minimum: null,
      maximum: null,
    };
  }
  return {
    category: "light",
    unit: "Lux",
    normal: null,
    warning: null,
    minimum: Number(CONFIG.threshold.light.minimum),
    maximum: Number(CONFIG.threshold.light.maximum),
  };
}
/* ===========================================================
   TREND ANALYSIS SOURCE LABEL
=========================================================== */
function getTrendAnalysisSourceLabel() {
  const parameter = getTrendParameter();
  const source = getTrendSource();
  const sensor = getTrendSensor();
  if (source === "average") {
    return parameter === "dust"
      ? Language.get("monitoring.trend.averageDust")
      : Language.get("monitoring.trend.averageLight");
  }
  if (parameter === "dust") {
    return Language.replace(Language.get("monitoring.trend.dust"), {
      sensor,
    });
  }
  return Language.replace(Language.get("monitoring.trend.light"), {
    sensor,
  });
}
/* ===========================================================
   RENDER TREND THRESHOLD
=========================================================== */
function updateTrendThreshold() {
  const element = document.getElementById("trendThresholdValue");
  if (!element) {
    return;
  }
  const config = getTrendThresholdConfiguration();
  if (config.category === "dust") {
    element.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div class="text-xs theme-text-muted">
            ${Language.get("monitoring.analysis.threshold.normal")}
          </div>
          <div class="font-semibold mt-1">
            ≤ ${config.normal} ${config.unit}
          </div>
        </div>
        <div>
          <div class="text-xs theme-text-muted">
            ${Language.get("monitoring.analysis.threshold.warning")}
          </div>
          <div class="font-semibold mt-1">
            > ${config.normal} – ${config.warning} ${config.unit}
          </div>
        </div>
        <div>
          <div class="text-xs theme-text-muted">
            ${Language.get("monitoring.analysis.threshold.danger")}
          </div>
          <div class="font-semibold mt-1">
            > ${config.warning} ${config.unit}
          </div>
        </div>
      </div>
    `;
    return;
  }
  element.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <div class="text-xs theme-text-muted">
          ${Language.get("monitoring.analysis.threshold.poor")}
        </div>
        <div class="font-semibold mt-1">
          < ${config.minimum} ${config.unit}
        </div>
      </div>
      <div>
        <div class="text-xs theme-text-muted">
          ${Language.get("monitoring.analysis.threshold.ideal")}
        </div>
        <div class="font-semibold mt-1">
          ${config.minimum}–${config.maximum} ${config.unit}
        </div>
      </div>
      <div>
        <div class="text-xs theme-text-muted">
          ${Language.get("monitoring.analysis.threshold.tooBright")}
        </div>
        <div class="font-semibold mt-1">
          > ${config.maximum} ${config.unit}
        </div>
      </div>
    </div>
  `;
}
/* ===========================================================
   CALCULATE TREND ANALYSIS STATUS
=========================================================== */
function calculateTrendAnalysisStatus() {
  const statistics = calculateTrendStatistics();
  const config = getTrendThresholdConfiguration();
  /* ===========================================================
   NO DATA
  =========================================================== */
  if (statistics.dataPoints === 0) {
    return {
      text: CONFIG.status.system.waiting,
      class: "theme-badge-neutral",
      icon: "bi-hourglass-split",
      iconClass: "theme-icon-muted",
      category: "waiting",
    };
  }
  /* ==========================================================
    DUST: Berdasarkan MAXIMUM selama periode analisis.
  ========================================================== */
  if (config.category === "dust") {
    if (statistics.maximum <= config.normal) {
      return {
        text: CONFIG.status.dust.normal,
        class: "theme-badge-normal",
        icon: "bi-check-circle-fill",
        iconClass: "theme-icon-success",
        category: "normal",
      };
    }
    if (statistics.maximum <= config.warning) {
      return {
        text: CONFIG.status.dust.warning,
        class: "theme-badge-warning",
        icon: "bi-exclamation-triangle-fill",
        iconClass: "theme-icon-warning",
        category: "warning",
      };
    }
    return {
      text: CONFIG.status.dust.danger,
      class: "theme-badge-danger",
      icon: "bi-exclamation-octagon-fill",
      iconClass: "theme-icon-danger",
      category: "danger",
    };
  }
  /* ==========================================================
    LIGHT: Berdasarkan AVERAGE selama periode analisis.
  ========================================================== */
  if (
    statistics.average >= config.minimum &&
    statistics.average <= config.maximum
  ) {
    return {
      text: CONFIG.status.light.ideal,
      class: "theme-badge-ideal",
      icon: "bi-check-circle-fill",
      iconClass: "theme-icon-success",
      category: "ideal",
    };
  }
  if (statistics.average < config.minimum) {
    return {
      text: CONFIG.status.light.poor,
      class: "theme-badge-poor",
      icon: "bi-arrow-down-circle-fill",
      iconClass: "theme-icon-warning",
      category: "poor",
    };
  }
  return {
    text: CONFIG.status.light.tooBright,
    class: "theme-badge-too-bright",
    icon: "bi-arrow-up-circle-fill",
    iconClass: "theme-icon-warning",
    category: "tooBright",
  };
}
/* ===========================================================
   TREND STATUS DESCRIPTION
=========================================================== */
function getTrendAnalysisStatusDescription(status) {
  switch (status.category) {
    case "normal":
      return Language.get("monitoring.analysis.summary.status.normal");
    case "warning":
      return Language.get("monitoring.analysis.summary.status.warning");
    case "danger":
      return Language.get("monitoring.analysis.summary.status.danger");
    case "ideal":
      return Language.get("monitoring.analysis.summary.status.ideal");
    case "poor":
      return Language.get("monitoring.analysis.summary.status.poor");
    case "tooBright":
      return Language.get("monitoring.analysis.summary.status.tooBright");
    default:
      return Language.get("monitoring.analysis.summary.status.waiting");
  }
}
/* ===========================================================
   ANALYSIS SUMMARY
=========================================================== */
function updateTrendAnalysisSummary() {
  const element = document.getElementById("trendAnalysisSummary");
  if (!element) {
    return;
  }
  const state = getTrendState();
  const statistics = calculateTrendStatistics();
  const status = calculateTrendAnalysisStatus();
  const threshold = getTrendThresholdConfiguration();
  /* ===========================================================
   BELUM ADA ANALISIS
  =========================================================== */
  if (!state.lastAnalyzedAt) {
    element.textContent = Language.get(
      "monitoring.analysis.summary.notAnalyzed",
    );
    return;
  }
  /* ===========================================================
   TIDAK ADA DATA
  =========================================================== */
  if (statistics.dataPoints === 0) {
    element.textContent = Language.get("monitoring.analysis.summary.noData");
    return;
  }
  const sourceLabel = getTrendAnalysisSourceLabel();
  const statusDescription = getTrendAnalysisStatusDescription(status);
  const decimals = threshold.category === "dust" ? 2 : 1;
  const average = statistics.average.toFixed(decimals);
  const minimum = statistics.minimum.toFixed(decimals);
  const maximum = statistics.maximum.toFixed(decimals);
  const range = statistics.range.toFixed(decimals);
  /* ===========================================================
   DUST SUMMARY
  =========================================================== */
  if (threshold.category === "dust") {
    element.textContent = Language.replace(
      Language.get("monitoring.analysis.summary.dust"),
      {
        source: sourceLabel,
        average,
        minimum,
        maximum,
        range,
        unit: threshold.unit,
        normal: threshold.normal,
        warning: threshold.warning,
        status: status.text,
        statusDescription,
      },
    );
    return;
  }
  /* ===========================================================
   LIGHT SUMMARY
  =========================================================== */
  element.textContent = Language.replace(
    Language.get("monitoring.analysis.summary.light"),
    {
      source: sourceLabel,
      average,
      minimum,
      maximum,
      range,
      unit: threshold.unit,
      minimumIdeal: threshold.minimum,
      maximumIdeal: threshold.maximum,
      status: status.text,
      statusDescription,
    },
  );
}
/* ===========================================================
   RENDER TREND ANALYSIS STATUS
=========================================================== */
function updateTrendAnalysisStatus() {
  const statusElement = document.getElementById("trendAnalysisStatus");
  const iconElement = document.getElementById("trendAnalysisStatusIcon");
  if (!statusElement) {
    return;
  }
  const status = calculateTrendAnalysisStatus();
  statusElement.textContent = status.text;
  statusElement.className = `theme-badge ${status.class}`;
  /* ===========================================================
   STATUS ICON
  =========================================================== */
  if (iconElement) {
    iconElement.className = `bi ${status.icon} text-2xl ${status.iconClass}`;
  }
}
/* ===========================================================
   RENDER TREND STATISTICS
=========================================================== */
function updateTrendStatistics() {
  const averageElement = document.getElementById("trendStatAverage");
  const minimumElement = document.getElementById("trendStatMinimum");
  const maximumElement = document.getElementById("trendStatMaximum");
  const rangeElement = document.getElementById("trendStatRange");
  const dataPointsElement = document.getElementById("trendStatDataPoints");
  if (
    !averageElement ||
    !minimumElement ||
    !maximumElement ||
    !rangeElement ||
    !dataPointsElement
  ) {
    return;
  }
  const statistics = calculateTrendStatistics();
  /*
   * ==========================================================
   * NO DATA
   * ==========================================================
   */
  if (statistics.dataPoints === 0) {
    averageElement.textContent = "--";
    minimumElement.textContent = "--";
    maximumElement.textContent = "--";
    rangeElement.textContent = "--";
    dataPointsElement.textContent = "0";
    return;
  }
  const config = getTrendConfiguration();
  const decimals = config.decimals ?? 2;
  const unit = config.unit ?? "";
  function formatValue(value) {
    if (!Number.isFinite(Number(value))) {
      return "--";
    }
    return `${Number(value).toFixed(decimals)} ${unit}`;
  }
  averageElement.textContent = formatValue(statistics.average);
  minimumElement.textContent = formatValue(statistics.minimum);
  maximumElement.textContent = formatValue(statistics.maximum);
  rangeElement.textContent = formatValue(statistics.range);
  dataPointsElement.textContent =
    statistics.dataPoints.toLocaleString(getDashboardLocale());
}
/* ===========================================================
    RENDER CURRENT ROOM
=========================================================== */
function renderCurrentRoom() {
  const data = getCurrentRoomData();
  if (!data) return;
  renderRoom(data);
  updateMonitoringSummary(data);
  restoreRoomChart();
}
function refreshMonitoringLanguage() {
  createMonitoringCards();
  createMonitoringInformation();
  syncTrendAnalysisControls();
  syncTrendAnalysisDateControls();
  renderCurrentRoom();
  refreshTrendAnalysis();
}
/* ===========================================================
    INITIALIZE
=========================================================== */
function initializeMonitoring() {
  if (Monitoring.initialized) return;
  createMonitoringCards();
  createMonitoringInformation();
  createRoomChart();
  createTrendChart();
  initializeChartInteraction();
  initializeMonitoringChartToolbar();
  initializeRoomMenu();
  initializeTrendAnalysis();
  setInterval(checkConnectionStatus, 1000);
  subscribeRoom(getCurrentRoomID());
  Monitoring.initialized = true;
  Bootstrap.markReady(Bootstrap.Module.MONITORING);
}
/* ===========================================================
    CREATE
=========================================================== */
function createMonitoringCards() {
  createDustCards();
  createLightCards();
}
function createDustCards() {
  const room = currentRoom();
  const container = document.getElementById("dustCards");
  if (!container) return;
  let html = "";
  for (let i = 1; i <= room.dustSensors; i++) {
    html += dustCardTemplate(i);
  }
  container.innerHTML = html;
}
function dustCardTemplate(index) {
  return `
<div class="theme-card rounded-2xl p-6">
    <div class="flex justify-between items-start">
        <div>
            <h4 class="theme-card-value text-lg font-semibold">
                ${Language.replace(Language.get("monitoring.sensor.dust"), {
                  index,
                })}
            </h4>
            <p class="theme-card-caption text-sm mt-1">
                ${CONFIG.sensor.dustName}
            </p>
        </div>
        <i class="bi bi-wind text-3xl text-orange-500"></i>
    </div>
    <div
        id="dust-${index}"
        class="theme-card-value text-3xl font-bold mt-6">
        --
    </div>
    <p class="theme-card-caption text-sm mt-1">
        µg/m³
    </p>
    <div class="mt-5">
        <span
            id="dust-status-${index}"
            class="theme-badge theme-badge-neutral">
            ${CONFIG.status.system.waiting}
        </span>
    </div>
</div>
`;
}
function createLightCards() {
  const room = currentRoom();
  const container = document.getElementById("lightCards");
  if (!container) return;
  let html = "";
  for (let i = 1; i <= room.lightSensors; i++) {
    html += lightCardTemplate(i);
  }
  container.innerHTML = html;
}
function lightCardTemplate(index) {
  return `
<div class="theme-card rounded-2xl p-6">
    <div class="flex justify-between items-start">
        <div>
            <h4 class="theme-card-value text-lg font-semibold">
                ${Language.replace(Language.get("monitoring.sensor.light"), {
                  index,
                })}
            </h4>
            <p class="theme-card-caption text-sm mt-1">
                ${CONFIG.sensor.lightName}
            </p>
        </div>
        <i class="bi bi-brightness-high-fill text-yellow-500 text-3xl"></i>
    </div>
    <div
        id="light-${index}"
        class="theme-card-value text-3xl font-bold mt-6">
        --
    </div>
    <p class="theme-card-caption text-sm mt-1">
        Lux
    </p>
    <div class="mt-5">
        <span
            id="light-status-${index}"
            class="theme-badge theme-badge-neutral">
            ${CONFIG.status.system.waiting}
        </span>
    </div>
</div>
`;
}
/* ===========================================================
    ROOM INFORMATION
=========================================================== */
function createMonitoringInformation() {
  const room = currentRoom();
  const title = document.getElementById("roomTitle");
  if (title) {
    title.textContent = Language.get(`room.${room.id}`);
  }
  const subtitle = document.getElementById("roomSubtitle");
  if (subtitle) {
    subtitle.textContent = Language.replace(
      Language.get("monitoring.room.subtitle"),
      {
        dust: room.dustSensors,
        light: room.lightSensors,
      },
    );
  }
}
/* ===========================================================
    RESET MONITORING
=========================================================== */
function resetMonitoringView() {
  const room = currentRoom();
  for (let i = 1; i <= room.dustSensors; i++) {
    updateSensor("dust-" + i, "--");
    updateBadge("dust-status-" + i, {
      text: CONFIG.status.system.waiting,
      class: "theme-badge-neutral",
    });
  }
  for (let i = 1; i <= room.lightSensors; i++) {
    updateSensor("light-" + i, "--");
    updateBadge("light-status-" + i, {
      text: CONFIG.status.system.waiting,
      class: "theme-badge-neutral",
    });
  }
  document.getElementById("averageDust").textContent = "--";
  document.getElementById("averageLight").textContent = "--";
  document.getElementById("lastUpdate").textContent = "--";
}
/* ===========================================================
    CHANGE ROOM
=========================================================== */
function changeRoom(roomID) {
  if (getCurrentRoomID() === roomID) {
    loadCurrentRoom();
    restoreRoomChart();
    restoreTrendChart();
    renderConnection(roomID);
    return;
  }
  setCurrentRoom(roomID);
  if (typeof scrollToTop === "function") {
    scrollToTop();
  }
  unsubscribeRoom();
  createMonitoringCards();
  createMonitoringInformation();
  resetMonitoringView();
  loadCurrentRoom();
  getRealtimeChart()?.resetZoom();
  getTrendChart()?.resetZoom();
  restoreRoomChart();
  syncTrendAnalysisControls();
  syncTrendAnalysisDateControls();
  restoreTrendChart();
  refreshTrendAnalysis();
  subscribeRoom(roomID);
  renderConnection(roomID);
}
/* ===========================================================
    LOAD ROOM DATA
=========================================================== */
function loadCurrentRoom() {
  const data = getCurrentRoomData();
  if (!data) {
    resetMonitoringView();
    updateMonitoringSummary({
      averageDust: null,
      averageLight: null,
      timestamp: null,
    });
    return;
  }
  updateRoomData(data);
}
/* ===========================================================
    SUBSCRIBE ROOM
=========================================================== */
function subscribeRoom(roomID) {
  Monitoring.subscribedRoom = roomID;
  if (typeof window.subscribeFirebaseRoom === "function") {
    window.subscribeFirebaseRoom(roomID);
  }
}
/* ===========================================================
    UNSUBSCRIBE ROOM
=========================================================== */
function unsubscribeRoom() {
  if (typeof window.unsubscribeFirebaseRoom === "function") {
    window.unsubscribeFirebaseRoom();
  }
  Monitoring.subscribedRoom = null;
}
/* ===========================================================
    ROOM MENU
=========================================================== */
function initializeRoomMenu() {
  // Sidebar sepenuhnya dikontrol oleh app.js
}
/* ===========================================================
    TREND ANALYSIS
=========================================================== */
function initializeTrendAnalysis() {
  const sensor = document.getElementById("chartSensor");
  const parameter = document.getElementById("trendParameter");
  const source = document.getElementById("trendSource");
  const analysisRange = document.getElementById("trendAnalysisRange");
  const startDate = document.getElementById("trendStartDate");
  const endDate = document.getElementById("trendEndDate");
  const applyButton = document.getElementById("trendApplyAnalysis");
  // Parameter
  if (parameter) {
    parameter.addEventListener("change", () => {
      setTrendParameter(parameter.value);
      invalidateTrendProcessingCache();
      syncTrendAnalysisControls();
      refreshTrendAnalysis();
    });
  }
  // Source
  if (source) {
    source.addEventListener("change", () => {
      setTrendSource(source.value);
      invalidateTrendProcessingCache();
      syncTrendAnalysisControls();
      refreshTrendAnalysis();
    });
  }
  // Sensor
  if (sensor) {
    sensor.addEventListener("change", () => {
      setTrendSensor(sensor.value);
      invalidateTrendProcessingCache();
      refreshTrendAnalysis();
    });
  }
  // Analysis Period
  if (analysisRange) {
    analysisRange.addEventListener("change", () => {
      getTrendState().timeRange = analysisRange.value;
      syncTrendAnalysisDateControls();
    });
  }
  // Custom Start Date
  if (startDate) {
    startDate.addEventListener("change", () => {
      getTrendState().startDate = startDate.value || null;
    });
  }
  // Custom End Date
  if (endDate) {
    endDate.addEventListener("change", () => {
      getTrendState().endDate = endDate.value || null;
    });
  }
  // Analyze
  if (applyButton) {
    applyButton.addEventListener("click", async () => {
      await runTrendAnalysis();
    });
  }
  syncTrendAnalysisControls();
  syncTrendAnalysisDateControls();
  refreshTrendAnalysis();
}
/* ===========================================================
   REFRESH TREND ANALYSIS
=========================================================== */
function refreshTrendAnalysis() {
  const dataset = getTrendRenderDataset();
  updateTrendBadge();
  updateTrendSubtitle();
  updateTrendStatistics();
  updateTrendThreshold();
  updateTrendAnalysisStatus();
  updateTrendAnalysisSummary();
  updateTrendChart(dataset);
}
/* ===========================================================
    RESTORE TREND CHART
=========================================================== */
function restoreTrendChart() {
  updateTrendChartZoomButton();
  applyTrendChartInteraction();
  const dataset = getTrendRenderDataset();
  updateTrendChart(dataset);
}
function updateTrendSensorDropdown() {
  const sensor = document.getElementById("chartSensor");
  if (!sensor) return;
  const room = currentRoom();
  const parameter = getTrendParameter();
  const source = getTrendSource();
  sensor.innerHTML = "";
  /* ==========================================================
     AVERAGE
     Tidak membutuhkan sensor individual.
   ========================================================== */
  if (source === "average") {
    sensor.disabled = true;
    sensor.classList.add("bg-slate-100");
    const option = document.createElement("option");
    option.value = "";
    option.textContent = Language.get("monitoring.sensor.notRequired");
    sensor.appendChild(option);
    setTrendSensor(null);
    return;
  }
  /* ==========================================================
     INDIVIDUAL SENSOR
     ========================================================== */
  sensor.disabled = false;
  sensor.classList.remove("bg-slate-100");
  const totalSensor =
    parameter === "dust" ? room.dustSensors : room.lightSensors;
  const prefix =
    parameter === "dust"
      ? Language.get("monitoring.sensor.prefix.dust")
      : Language.get("monitoring.sensor.prefix.light");
  for (let i = 1; i <= totalSensor; i++) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${prefix} ${i}`;
    sensor.appendChild(option);
  }
  const currentSensor = getTrendSensor();
  /* Pertahankan sensor yang sebelumnya dipilih
   apabila masih valid untuk parameter/room saat ini.*/
  if (
    currentSensor &&
    Number(currentSensor) >= 1 &&
    Number(currentSensor) <= totalSensor
  ) {
    sensor.value = String(currentSensor);
  } else {
    sensor.selectedIndex = 0;
    setTrendSensor(sensor.value);
  }
}
function getTrendConfiguration() {
  const parameter = getTrendParameter();
  const source = getTrendSource();
  const sensor = getTrendSensor();
  // Dust
  if (parameter === "dust") {
    if (source === "individual") {
      return {
        sensor,
        label: Language.replace(Language.get("monitoring.trend.dust"), {
          sensor,
        }),
        unit: "µg/m³",
        decimals: 2,
        category: "dust",
        color: "#F97316",
      };
    }
    return {
      sensor: null,
      label: Language.get("monitoring.trend.averageDust"),
      unit: "µg/m³",
      decimals: 2,
      category: "dust",
      color: "#F97316",
    };
  }
  // Light
  if (source === "individual") {
    return {
      sensor,
      label: Language.replace(Language.get("monitoring.trend.light"), {
        sensor,
      }),
      unit: "Lux",
      decimals: 1,
      category: "light",
      color: "#FACC15",
    };
  }
  return {
    sensor: null,
    label: Language.get("monitoring.trend.averageLight"),
    unit: "Lux",
    decimals: 1,
    category: "light",
    color: "#FACC15",
  };
}
/* ===========================================================
    UPDATE TREND BADGE
=========================================================== */
function updateTrendBadge() {
  const badge = document.getElementById("trendChartBadge");
  if (!badge) {
    return;
  }
  const parameter = getTrendParameter();
  const source = getTrendSource();
  const sensor = getTrendSensor();
  let label = "";
  /* ==========================================================
     AVERAGE
  ========================================================== */
  if (source === "average") {
    label =
      parameter === "dust"
        ? Language.get("monitoring.trend.averageDust")
        : Language.get("monitoring.trend.averageLight");
  }
  /* ==========================================================
      INDIVIDUAL SENSOR
  ========================================================== */
  if (source === "individual") {
    if (parameter === "dust") {
      label = sensor
        ? Language.replace(Language.get("monitoring.trend.dust"), { sensor })
        : Language.get("monitoring.sensor.prefix.dust");
    } else {
      label = sensor
        ? Language.replace(Language.get("monitoring.trend.light"), { sensor })
        : Language.get("monitoring.sensor.prefix.light");
    }
  }
  badge.textContent = label;
  badge.className = "theme-badge theme-badge-warning";
  if (parameter === "light") {
    badge.classList.remove("theme-badge-warning");
    badge.classList.add("theme-badge-ideal");
  }
}
/* ===========================================================
    UPDATE TREND SUBTITLE
=========================================================== */
function updateTrendSubtitle() {
  const subtitle = document.getElementById("trendChartSubtitle");
  if (!subtitle) {
    return;
  }
  const parameter = getTrendParameter();
  const source = getTrendSource();
  const sensor = getTrendSensor();
  if (parameter === "dust" && source === "average") {
    subtitle.textContent = Language.get(
      "monitoring.trend.subtitle.averageDust",
    );
    return;
  }
  if (parameter === "light" && source === "average") {
    subtitle.textContent = Language.get(
      "monitoring.trend.subtitle.averageLight",
    );
    return;
  }
  if (parameter === "dust" && source === "individual") {
    subtitle.textContent = Language.replace(
      Language.get("monitoring.trend.subtitle.dust"),
      {
        sensor,
      },
    );
    return;
  }
  if (parameter === "light" && source === "individual") {
    subtitle.textContent = Language.replace(
      Language.get("monitoring.trend.subtitle.light"),
      {
        sensor,
      },
    );
    return;
  }
  subtitle.textContent = Language.get("monitoring.trend.subtitle.default");
}
function getTrendDataset() {
  const config = getTrendConfiguration();
  const trend = getPreparedTrendDataset();
  return {
    labels: trend.labels,
    datasets: [
      {
        label: config.label,
        data: trend.values,
      },
    ],
  };
}
/* ===========================================================
   GET TREND RENDER DATASET
=========================================================== */
function getTrendRenderDataset() {
  return getTrendDataset();
}
/* ===========================================================
    VALIDATE SENSOR VALUE
=========================================================== */
function normalizeValue(value) {
  const number = Number(value);
  if (value === null || value === undefined || Number.isNaN(number)) {
    return null;
  }
  return number;
}
/* ===========================================================
    FORMAT TIME
=========================================================== */
function currentTime() {
  return new Date().toLocaleTimeString(getDashboardLocale(), {
    hour12: false,
  });
}
/* ===========================================================
    FORMAT MONITORING TIME
=========================================================== */
function formatMonitoringTime(timestamp) {
  if (!timestamp) {
    return "--";
  }
  const date = new Date(timestamp);
  return date
    .toLocaleTimeString("id-ID", {
      hour12: false,
    })
    .replace(/:/g, ".");
}
/* ===========================================================
    UPDATE SENSOR
=========================================================== */
function updateSensor(id, value) {
  renderSensorValue(id, value);
}
/* ===========================================================
    RENDER SENSOR VALUE
=========================================================== */
function renderSensorValue(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    element.textContent = "--";
    return;
  }
  element.textContent = number.toFixed(2);
}
/* ===========================================================
    SENSOR STATUS
=========================================================== */
function getDustStatus(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return {
      text: CONFIG.status.system.waiting,
      class: "theme-badge-neutral",
    };
  }
  if (number <= CONFIG.threshold.dust.normal) {
    return {
      text: CONFIG.status.dust.normal,
      class: "theme-badge-normal",
    };
  }
  if (number <= CONFIG.threshold.dust.warning) {
    return {
      text: CONFIG.status.dust.warning,
      class: "theme-badge-warning",
    };
  }
  return {
    text: CONFIG.status.dust.danger,
    class: "theme-badge-danger",
  };
}
function getLightStatus(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return {
      text: CONFIG.status.system.waiting,
      class: "theme-badge-neutral",
    };
  }
  if (
    number >= CONFIG.threshold.light.minimum &&
    number <= CONFIG.threshold.light.maximum
  ) {
    return {
      text: CONFIG.status.light.ideal,
      class: "theme-badge-ideal",
    };
  }
  if (number < CONFIG.threshold.light.minimum) {
    return {
      text: CONFIG.status.light.poor,
      class: "theme-badge-poor",
    };
  }
  return {
    text: CONFIG.status.light.tooBright,
    class: "theme-badge-warning",
  };
}
/* ===========================================================
    UPDATE DUST
=========================================================== */
function updateDust(index, value) {
  updateDustValue(index, value);
  updateDustStatus(index, value);
}
/* ===========================================================
    UPDATE DUST VALUE
=========================================================== */
function updateDustValue(index, value) {
  updateSensor("dust-" + index, value);
}
/* ===========================================================
    UPDATE DUST STATUS
=========================================================== */
function updateDustStatus(index, value) {
  renderSensorStatus("dust-status-" + index, getDustStatus(value));
}
/* ===========================================================
    UPDATE LIGHT
=========================================================== */
function updateLight(index, value) {
  updateLightValue(index, value);
  updateLightStatus(index, value);
}
/* ===========================================================
    UPDATE LIGHT VALUE
=========================================================== */
function updateLightValue(index, value) {
  updateSensor("light-" + index, value);
}
/* ===========================================================
    UPDATE LIGHT STATUS
=========================================================== */
function updateLightStatus(index, value) {
  renderSensorStatus("light-status-" + index, getLightStatus(value));
}
/* ===========================================================
    RENDER SENSOR STATUS
=========================================================== */
function renderSensorStatus(id, status) {
  updateBadge(id, status);
}
/* ===========================================================
    RENDER ROOM
=========================================================== */
function renderRoom(data) {
  renderDustCards(data);
  renderLightCards(data);
}
/* ===========================================================
    RENDER DUST CARDS
=========================================================== */
function renderDustCards(data) {
  const room = currentRoom();
  for (let i = 0; i < room.dustSensors; i++) {
    updateDust(i + 1, data.dust?.[i]);
  }
}
/* ===========================================================
    RENDER LIGHT CARDS
=========================================================== */
function renderLightCards(data) {
  const room = currentRoom();
  for (let i = 0; i < room.lightSensors; i++) {
    updateLight(i + 1, data.light?.[i]);
  }
}
/* ===========================================================
    UPDATE STATISTICS
=========================================================== */
function updateStatistics(data) {
  updateMonitoringSummary(data);
}
/* ===========================================================
    APPEND REALTIME CHART
=========================================================== */
function appendRealtimeChart(data, roomID) {
  if (!data || !roomID) {
    return;
  }
  updateRoomChart(roomID, data.averageDust, data.averageLight);
}
/* ===========================================================
    UPDATE ROOM
=========================================================== */
function updateRoomData(data) {
  if (!data) {
    return;
  }
  if (typeof data !== "object") {
    return;
  }
  renderRoom(data);
  updateStatistics(data);
}
/* ===========================================================
    CHART FACTORY
=========================================================== */
function createLineChart(canvasId, datasets, customOptions = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return null;
  }
  const needZoom = customOptions?.plugins?.zoom !== undefined;
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets,
    },
    options: ChartDesignSystem.mergeOptions(
      ChartDesignSystem.createOptions({
        zoom: needZoom,
      }),
      customOptions,
    ),
  });
}
/* ===========================================================
    CHART
=========================================================== */
function createRoomChart() {
  const canvas = document.getElementById("roomChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (Monitoring.charts.room) {
    Monitoring.charts.room.destroy();
  }
  Monitoring.charts.room = createLineChart(
    "roomChart",
    [
      ChartDesignSystem.createDataset(
        "Average Dust",
        ChartDesignSystem.DATASET.MONITORING.AVERAGE_DUST,
      ),
      ChartDesignSystem.createDataset(
        "Average Light",
        ChartDesignSystem.DATASET.MONITORING.AVERAGE_LIGHT,
      ),
    ],
    {
      plugins: {
        zoom: {
          pan: {
            enabled: false,
            mode: "x",
          },
          zoom: {
            wheel: {
              enabled: false,
            },
            pinch: {
              enabled: false,
            },
            drag: {
              enabled: false,
            },
            mode: "x",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grace: "10%",
          ticks: {
            precision: 0,
          },
        },
      },
    },
  );
}
/* ===========================================================
    CREATE TREND CHART
=========================================================== */
function createTrendChart() {
  const canvas = document.getElementById("trendChart");
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (Monitoring.charts.trend) {
    Monitoring.charts.trend.destroy();
  }
  Monitoring.charts.trend = createLineChart(
    "trendChart",
    [
      ChartDesignSystem.createDataset(
        Language.get("monitoring.trend.chart"),
        ChartDesignSystem.DATASET.MONITORING.TREND,
      ),
    ],
    {
      plugins: {
        zoom: {
          pan: {
            enabled: false,
            mode: "x",
          },
          zoom: {
            wheel: {
              enabled: false,
            },
            pinch: {
              enabled: false,
            },
            drag: {
              enabled: false,
            },
            mode: "x",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grace: "10%",
          ticks: {
            precision: 0,
          },
        },
      },
    },
  );
}
/* ===========================================================
    UPDATE CHART
=========================================================== */
function updateRoomChart(roomID, averageDust, averageLight) {
  const history = Monitoring.chartHistory[roomID];
  if (!history) {
    return;
  }
  /*
  ===========================================================
  SIMPAN REALTIME HISTORY
  ===========================================================
  History chart harus diperbarui untuk setiap node,
  tidak bergantung pada currentRoom.
  Ini memungkinkan:
  Node B tetap mengisi chartHistory saat Dashboard
  atau Node A sedang aktif.
  */
  history.labels.push(currentTime());
  history.dust.push(Number(averageDust));
  history.light.push(Number(averageLight));
  while (history.labels.length > CONFIG.chart.maxPoints) {
    history.labels.shift();
    history.dust.shift();
    history.light.shift();
  }
  /*
  ===========================================================
  RENDER CHART UI
  ===========================================================
  Hanya render apabila node tersebut sedang menjadi
  currentRoom dan chart Monitoring memang tersedia.
  */
  if (roomID !== getCurrentRoomID()) {
    return;
  }
  if (isRoomChartExploreMode()) {
    return;
  }
  const chart = getRealtimeChart();
  if (!chart) {
    return;
  }
  refreshRealtimeChart();
}
/* ===========================================================
    RESTORE CHART
=========================================================== */
function restoreRoomChart() {
  updateRoomChartLimitButton();
  updateRoomChartZoomButton();
  updateRoomChartToolbarState();
  applyRoomChartInteraction();
  refreshRealtimeChart();
}
/* ===========================================================
    UPDATE SUMMARY
=========================================================== */
function updateMonitoringSummary(data) {
  const avgDust = document.getElementById("averageDust");
  const avgLight = document.getElementById("averageLight");
  const dustCount = document.getElementById("dustCount");
  const lightCount = document.getElementById("lightCount");
  const lastUpdate = document.getElementById("lastUpdate");
  const room = currentRoom();
  const dustValue = data?.averageDust;
  const lightValue = data?.averageLight;
  if (avgDust) {
    avgDust.textContent =
      dustValue == null ? "--" : Number(dustValue).toFixed(2);
  }
  if (avgLight) {
    avgLight.textContent =
      lightValue == null ? "--" : Number(lightValue).toFixed(2);
  }
  if (dustCount) {
    dustCount.textContent = room.dustSensors;
  }
  if (lightCount) {
    lightCount.textContent = room.lightSensors;
  }
  if (lastUpdate) {
    const connection = getConnection(getCurrentRoomID());
    const lastReceive = Number(connection?.lastReceive);
    lastUpdate.textContent =
      Number.isFinite(lastReceive) && lastReceive > 0
        ? formatMonitoringTime(lastReceive)
        : "--";
  }
}
/* ===========================================================
    UPDATE BADGE
=========================================================== */
function updateBadge(id, status) {
  const badge = document.getElementById(id);
  if (!badge || !status) {
    return;
  }
  badge.textContent = status.text;
  badge.classList.remove(
    "theme-badge-online",
    "theme-badge-offline",
    "theme-badge-waiting",
    "theme-badge-normal",
    "theme-badge-warning",
    "theme-badge-danger",
    "theme-badge-ideal",
    "theme-badge-too-bright",
    "theme-badge-poor",
    "theme-badge-neutral",
  );
  if (status.class) {
    badge.classList.add(status.class);
  }
}
/* ===========================================================
    UPDATE NODE STATUS
=========================================================== */
function updateNodeStatus(state) {
  switch (state) {
    case CONNECTION_STATE.ONLINE:
      updateBadge("nodeStatus", {
        text: CONFIG.status.system.online,
        class: "theme-badge-online",
      });
      break;
    case CONNECTION_STATE.WAITING:
      updateBadge("nodeStatus", {
        text: CONFIG.status.system.waiting,
        class: "theme-badge-waiting",
      });
      break;
    case CONNECTION_STATE.OFFLINE:
      updateBadge("nodeStatus", {
        text: CONFIG.status.system.offline,
        class: "theme-badge-offline",
      });
      break;
  }
}
/* ===========================================================
    CONNECTION RENDERER
=========================================================== */
function renderConnection(roomID) {
  const state = getConnectionState(roomID);
  if (roomID === getCurrentRoomID()) {
    updateNodeStatus(state);
  }
}
/* ===========================================================
    CONNECTION STATUS
=========================================================== */
function checkConnectionStatus() {
  CONFIG.rooms.forEach((room) => {
    if (!getConnection(room.id)) {
      return;
    }
    syncConnectionState(room.id);
    renderConnection(room.id);
  });
  if (typeof refreshDashboard === "function") {
    refreshDashboard();
  }
}
/* ===========================================================
    FIREBASE BRIDGE
=========================================================== */
function updateMonitoringNodeA(data, isInitialSnapshot = false) {
  if (!data) {
    return;
  }
  Monitoring.roomData.nodeA = data;
  /*
    INITIAL SNAPSHOT
    ------------------------------------------------
    Bukan komunikasi baru, tetapi timestamp Firebase
    tetap digunakan sebagai referensi paket terakhir.
  */
  if (isInitialSnapshot) {
    const connection = getConnection("nodeA");
    /*
    Initial Firebase snapshot dianggap diterima pada
    waktu aplikasi yang sudah diselaraskan dengan Firebase.
  */
    connection.lastReceive = getMonitoringCurrentTime();
    connection.received = true;
  } else {
    receivePacket("nodeA");
  }
  appendRealtimeChart(data, "nodeA");
  if (getCurrentRoomID() === "nodeA") {
    updateRoomData(data);
  }
  if (typeof refreshDashboard === "function") {
    refreshDashboard();
  }
}
function updateMonitoringNodeB(data, isInitialSnapshot = false) {
  if (!data) {
    return;
  }
  Monitoring.roomData.nodeB = data;
  /*
    INITIAL SNAPSHOT
    ------------------------------------------------
    Bukan komunikasi baru, tetapi timestamp Firebase
    tetap digunakan sebagai referensi paket terakhir.
  */
  if (isInitialSnapshot) {
    const connection = getConnection("nodeB");
    /*
    Initial Firebase snapshot dianggap diterima pada
    waktu aplikasi yang sudah diselaraskan dengan Firebase.
  */
    connection.lastReceive = getMonitoringCurrentTime();
    connection.received = true;
  } else {
    receivePacket("nodeB");
  }
  appendRealtimeChart(data, "nodeB");
  if (getCurrentRoomID() === "nodeB") {
    updateRoomData(data);
  }
  if (typeof refreshDashboard === "function") {
    refreshDashboard();
  }
}
/* ===========================================================
    HISTORY BRIDGE
=========================================================== */
function updateHistoryNodeA(data) {
  Monitoring.historyData.nodeA = data;
  if (!Monitoring.historyLoaded.nodeA) {
    loadHistoryChart("nodeA");
    Monitoring.historyLoaded.nodeA = true;
  }
  // if (typeof onHistoryUpdated === "function") {
  //     onHistoryUpdated();
  // }
}
function updateHistoryNodeB(data) {
  Monitoring.historyData.nodeB = data;
  if (!Monitoring.historyLoaded.nodeB) {
    loadHistoryChart("nodeB");
    Monitoring.historyLoaded.nodeB = true;
  }
  // if (typeof onHistoryUpdated === "function") {
  //     onHistoryUpdated();
  // }
}
/* ===========================================================
    LOAD HISTORY TO CHART
=========================================================== */
function loadHistoryChart(roomID) {
  const chart = getRealtimeChart();
  if (!chart) return;
  const history = Monitoring.historyData[roomID];
  if (!history || history.length === 0) {
    console.warn("History kosong :", roomID);
    return;
  }
  const chartHistory = Monitoring.chartHistory[roomID];
  chartHistory.labels = [];
  chartHistory.dust = [];
  chartHistory.light = [];
  history.forEach((item) => {
    const waktu = new Date(item.waktu);
    chartHistory.labels.push(
      waktu.toLocaleTimeString(getDashboardLocale(), {
        hour12: false,
      }),
    );
    chartHistory.dust.push(Number(item.debu?.rata ?? 0));
    chartHistory.light.push(Number(item.cahaya?.rata ?? 0));
  });
  const maxPoints = CONFIG.chart.maxPoints;
  if (chartHistory.labels.length > maxPoints) {
    chartHistory.labels = chartHistory.labels.slice(-maxPoints);
    chartHistory.dust = chartHistory.dust.slice(-maxPoints);
    chartHistory.light = chartHistory.light.slice(-maxPoints);
  }
  restoreRoomChart();
  // Jika history yang selesai dimuat adalah room yang sedang aktif,
  // langsung bangun ulang Trend Chart.
  if (roomID === getCurrentRoomID()) {
    refreshTrendAnalysis();
  }
}
