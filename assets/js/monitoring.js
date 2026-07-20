/* ===========================================================
    monitoring.js
    Version 2.0
=========================================================== */
const Monitoring = {
    currentRoom: "nodeA",
    state: {
        room: "nodeA",
        trend: {
            nodeA: {
                mode: "averageDust",
                sensor: null
            },
            nodeB: {
                mode: "averageDust",
                sensor: null
            }
        }
    },
    interaction: {
        roomChart: {
            nodeA: {
                mode: "live",
                limit: 10
            },
            nodeB: {
                mode: "live",
                limit: 10
            }
        },
        trendChart: {
            nodeA: {
                mode: "live",
                limit: 10
            },
            nodeB: {
                mode: "live",
                limit: 10
            }
        }
    },
    charts: {},
    chartHistory: {
        nodeA: {
            labels: [],
            dust: [],
            light: []
        },
        nodeB: {
            labels: [],
            dust: [],
            light: []
        }
    },
    sensors: {},
    roomData: {},
    historyData: {
        nodeA: [],
        nodeB: []
    },
    historyLoaded: {
        nodeA: false,
        nodeB: false
    },
    connection: {
        nodeA: {
            state: "waiting"
        },
        nodeB: {
            state: "waiting"
        }
    },
    initialized: false,
    listener: null,
    subscribedRoom: null
};
/* ===========================================================
   CURRENT ROOM HELPER STATE (TREND ANALYSIS)
=========================================================== */
function getCurrentRoomID() {
    return Monitoring.state.room;
}
function setCurrentRoom(roomID) {
    Monitoring.state.room = roomID;
    // Sinkronisasi sementara
    // Akan dihapus pada fase refactor akhir.
    Monitoring.currentRoom = roomID;
}
function getTrendMode() {
    return Monitoring.state.trend[
        getCurrentRoomID()
    ].mode;
}
function setTrendMode(mode) {
    Monitoring.state.trend[
        getCurrentRoomID()
    ].mode = mode;
}
function getTrendSensor() {
    return Monitoring.state.trend[
        getCurrentRoomID()
    ].sensor;
}
function setTrendSensor(sensor) {
    Monitoring.state.trend[
        getCurrentRoomID()
    ].sensor = sensor;
}
/* ===========================================================
    UPDATE TREND MODE DROPDOWN
=========================================================== */
function updateTrendModeDropdown() {
    const mode = document.getElementById("chartMode");
    if (!mode) {
        return;
    }
    const currentValue = getTrendMode();
    mode.innerHTML = `
        <option value="averageDust">
            ${Language.get("monitoring.trend.averageDust")}
        </option>
        <option value="averageLight">
            ${Language.get("monitoring.trend.averageLight")}
        </option>
        <option value="dust">
            ${Language.get("monitoring.trend.dustOnly")}
        </option>
        <option value="light">
            ${Language.get("monitoring.trend.lightOnly")}
        </option>
    `;
    mode.value = currentValue;
}
/* ===========================================================
    SYNC TREND UI
=========================================================== */
function syncTrendControls() {
    const mode = document.getElementById(
        "chartMode"
    );
    const sensor = document.getElementById(
        "chartSensor"
    );
    if (!mode || !sensor) {
        return;
    }
    updateTrendModeDropdown();
    updateTrendSensorDropdown();
    mode.value = getTrendMode();
    if (getTrendSensor()) {
        sensor.value = getTrendSensor();
    }
}
function getRealtimeChart() {
    return Monitoring.charts.room;
}
/* ===========================================================
    APPEND REALTIME HISTORY
=========================================================== */
function appendRealtimeHistory(
    averageDust,
    averageLight) {
    const history =
        currentChartHistory();
    const now =
        new Date();
    history.labels.push(
        now.toLocaleTimeString(
            getDashboardLocale(),
            {
                hour12: false
            }
        )
    );
    history.dust.push(
        Number(averageDust)
    );
    history.light.push(
        Number(averageLight)
    );
    while (
        history.labels.length >
        CONFIG.chart.maxPoints
    ) {
        history.labels.shift();
        history.dust.shift();
        history.light.shift();
    }
}
/* ===========================================================
    REFRESH REALTIME CHART
=========================================================== */
function refreshRealtimeChart() {
    if (
        isRoomChartExploreMode()
    ) {
        return;
    }
    const chart =
        getRealtimeChart();
    if (!chart) {
        return;
    }
    const history =
        getRealtimeRenderHistory();
    chart.data.labels =
        [...history.labels];
    chart.data.datasets[0].data =
        [...history.dust];
    chart.data.datasets[1].data =
        [...history.light];
    chart.update("none")
}
/* ===========================================================
    GET REALTIME RENDER HISTORY
=========================================================== */
function getRealtimeRenderHistory() {
    const history =
        currentChartHistory();
    const limit =
        getRoomChartInteraction().limit;
    return {
        labels:
            history.labels.slice(-limit),
        dust:
            history.dust.slice(-limit),
        light:
            history.light.slice(-limit)
    };
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
    return Monitoring
        .interaction
        .roomChart[
        getCurrentRoomID()
    ];
}
function isRoomChartLiveMode() {
    return getRoomChartInteraction()
        .mode === "live";
}
function isRoomChartExploreMode() {
    return getRoomChartInteraction()
        .mode === "explore";
}
function setRoomChartInteractionMode(mode) {
    getRoomChartInteraction().mode =
        mode;
}
/* ===========================================================
    TREND CHART INTERACTION
=========================================================== */
function getTrendChartInteraction() {
    return Monitoring
        .interaction
        .trendChart[
        getCurrentRoomID()
    ];
}
function isTrendChartLiveMode() {
    return getTrendChartInteraction()
        .mode === "live";
}
function isTrendChartExploreMode() {
    return getTrendChartInteraction()
        .mode === "explore";
}
function setTrendChartInteractionMode(mode) {
    getTrendChartInteraction().mode =
        mode;
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
    chart.options.plugins.zoom.pan.enabled =
        explore;
    chart.options.plugins.zoom.zoom.wheel.enabled =
        explore;
    chart.options.plugins.zoom.zoom.pinch.enabled =
        explore;
    chart.options.plugins.zoom.zoom.drag.enabled =
        false;
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
    chart.options.plugins.zoom.pan.enabled =
        explore;
    chart.options.plugins.zoom.zoom.wheel.enabled =
        explore;
    chart.options.plugins.zoom.zoom.pinch.enabled =
        explore;
    chart.options.plugins.zoom.zoom.drag.enabled =
        false;
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
    const chart =
        getRealtimeChart();
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
    const chart =
        getRealtimeChart();
    if (chart) {
        chart.resetZoom();
    }
    setRoomChartInteractionMode(
        "live"
    );
    applyRoomChartInteraction();
    refreshRealtimeChart();
    updateRoomChartZoomButton();
    updateRoomChartToolbarState();
}
/* ===========================================================
    EXIT MONITORING EXPLORE MODE
=========================================================== */
function exitMonitoringExploreMode() {
    Object.values(
        Monitoring.interaction.roomChart
    ).forEach(interaction => {
        interaction.mode = "live";
    });
    Object.values(
        Monitoring.interaction.trendChart
    ).forEach(interaction => {
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
    updateTrendChartToolbarState();
}
function enableTrendChartLiveMode() {
    const chart =
        getTrendChart();
    if (chart) {
        chart.resetZoom();
    }
    setTrendChartInteractionMode("live");
    refreshTrendAnalysis();
    restoreTrendChart();
}
/* ===========================================================
    RESET TREND CHART VIEW
=========================================================== */
function resetTrendChartView() {
    const chart =
        getTrendChart();
    if (chart) {
        chart.resetZoom();
    }
    setTrendChartInteractionMode(
        "live"
    );
    applyTrendChartInteraction();
    refreshTrendAnalysis();
    updateTrendChartZoomButton();
    updateTrendChartToolbarState();
}
/* ===========================================================
    ROOM CHART BUTTON
=========================================================== */
function updateRoomChartZoomButton() {
    const button =
        document.getElementById(
            "roomTrendZoom"
        );
    if (!button) {
        return;
    }
    button.classList.remove(
        "theme-button-primary"
    );
    if (isRoomChartExploreMode()) {
        button.classList.add(
            "theme-button-primary"
        );
    }
}
/* ===========================================================
    ROOM CHART TOOLBAR STATE
=========================================================== */
function updateRoomChartToolbarState() {
    const explore =
        isRoomChartExploreMode();
    [
        "roomTrend10Btn",
        "roomTrend20Btn",
        "roomTrend50Btn"
    ].forEach(id => {
        const button =
            document.getElementById(id);
        if (!button)
            return;
        button.disabled =
            explore;
        button.classList.toggle(
            "opacity-50",
            explore
        );
        button.classList.toggle(
            "cursor-not-allowed",
            explore
        );
    });
}
/* ===========================================================
    ROOM CHART LIMIT
=========================================================== */
function setRoomChartLimit(limit) {
    getRoomChartInteraction().limit =
        limit;
    updateRoomChartLimitButton();
    refreshRealtimeChart();
}
/* ===========================================================
    ROOM CHART LIMIT BUTTON
=========================================================== */
function updateRoomChartLimitButton() {
    const limit =
        getRoomChartInteraction().limit;
    const buttons = {
        10:
            "roomTrend10Btn",
        20:
            "roomTrend20Btn",
        50:
            "roomTrend50Btn"
    };
    Object.entries(buttons)
        .forEach(([value, id]) => {
            const button =
                document.getElementById(id);
            if (!button)
                return;
            button.classList.remove(
                "theme-button-primary"
            );
            if (
                Number(value) === limit
            ) {
                button.classList.add(
                    "theme-button-primary"
                );
            }
        });
}
/* ===========================================================
    TREND CHART TOOLBAR STATE
=========================================================== */
function updateTrendChartToolbarState() {
    const explore =
        isTrendChartExploreMode();
    [
        "analysisTrend10Btn",
        "analysisTrend20Btn",
        "analysisTrend50Btn"
    ].forEach(id => {
        const button =
            document.getElementById(id);
        if (!button)
            return;
        button.disabled =
            explore;
        button.classList.toggle(
            "opacity-50",
            explore
        );
        button.classList.toggle(
            "cursor-not-allowed",
            explore
        );
    });
}
/* ===========================================================
    TREND CHART BUTTON
=========================================================== */
function updateTrendChartZoomButton() {
    const button =
        document.getElementById(
            "analysisTrendZoom"
        );
    if (!button) {
        return;
    }
    button.classList.remove(
        "theme-button-primary"
    );
    if (isTrendChartExploreMode()) {
        button.classList.add(
            "theme-button-primary"
        );
    }
}
/* ===========================================================
    INITIALIZE MONITORING CHART TOOLBAR
=========================================================== */
function initializeMonitoringChartToolbar() {
    document
        .getElementById("roomTrend10Btn")
        ?.addEventListener(
            "click",
            () => setRoomChartLimit(10)
        );
    document
        .getElementById("roomTrend20Btn")
        ?.addEventListener(
            "click",
            () => setRoomChartLimit(20)
        );
    document
        .getElementById("roomTrend50Btn")
        ?.addEventListener(
            "click",
            () => setRoomChartLimit(50)
        );
    document
        .getElementById("roomTrendReset")
        ?.addEventListener(
            "click",
            resetRoomChartView
        );
    document
        .getElementById("roomTrendZoom")
        ?.addEventListener(
            "click",
            enableRoomChartExploreMode
        );
    document
        .getElementById("analysisTrendZoom")
        ?.addEventListener(
            "click",
            enableTrendChartExploreMode
        );
    document
        .getElementById(
            "analysisTrendReset"
        )
        ?.addEventListener(
            "click",
            resetTrendChartView
        );
    document
        .getElementById("analysisTrend10Btn")
        ?.addEventListener(
            "click",
            () => setTrendChartLimit(10)
        );
    document
        .getElementById("analysisTrend20Btn")
        ?.addEventListener(
            "click",
            () => setTrendChartLimit(20)
        );
    document
        .getElementById("analysisTrend50Btn")
        ?.addEventListener(
            "click",
            () => setTrendChartLimit(50)
        );
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
    updateTrendChartToolbarState();
    updateRoomChartLimitButton();
    updateTrendChartLimitButton();
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
    chart.data.labels = [...dataset.labels];
    const chartDataset = chart.data.datasets[0];
    const config = getTrendConfiguration();
    chartDataset.label = dataset.datasets[0].label;
    chartDataset.borderColor = config.color;
    chartDataset.backgroundColor = config.color + "33";
    chartDataset.unit = config.unit;
    chartDataset.decimals = config.decimals;
    chartDataset.category = config.category;
    ChartDesignSystem.setDatasetData(
        chart.data.datasets,
        [dataset.datasets[0].data]
    );
    chart.update("none");
}
function getCurrentRoomData() {
    return Monitoring.roomData[
        getCurrentRoomID()
    ];
}
function setCurrentRoomData(data) {
    Monitoring.roomData[
        getCurrentRoomID()
    ] = data;
}
function currentRoom() {
    return CONFIG.rooms.find(
        room => room.id === getCurrentRoomID()
    );
}
function currentChartHistory() {
    return Monitoring.chartHistory[
        getCurrentRoomID()
    ];
}
function currentHistory() {
    return Monitoring.historyData[
        getCurrentRoomID()
    ];
}
/* ===========================================================
    CONNECTION HELPER
=========================================================== */
function getConnection(roomID) {
    return Monitoring.connection[roomID];
}
function getLastReceive(roomID) {
    return getConnection(roomID).lastReceive;
}
function updateLastReceive(roomID) {
    const connection =
        getConnection(roomID);
    connection.lastReceive =
        Date.now();
}
function getConnectionState(roomID) {
    return getConnection(roomID).state;
}
function setConnectionState(roomID, state) {
    getConnection(roomID).state =
        state;
}
/* ===========================================================
    TREND DATA PROVIDER
=========================================================== */
function getTrendProviderData() {
    const history = currentHistory();
    if (!Array.isArray(history)) {
        return [];
    }
    return history;
}
/* ===========================================================
    TREND DATASET BUILDER
=========================================================== */
function buildTrendDataset() {
    const history = getTrendProviderData();
    const mode = getTrendMode();
    const sensor = getTrendSensor();
    const labels = [];
    const values = [];
    history.forEach(item => {
        labels.push(
            new Date(item.waktu).toLocaleTimeString(
                getDashboardLocale(),
                {
                    hour12: false
                }
            )
        );
        switch (mode) {
            case "averageDust":
                values.push(
                    Number(item.debu?.rata ?? 0)
                );
                break;
            case "averageLight":
                values.push(
                    Number(item.cahaya?.rata ?? 0)
                );
                break;
            case "dust":
                values.push(
                    Number(item.debu?.["S" + (sensor - 1)] ?? 0)
                );
                break;
            case "light":
                values.push(
                    Number(item.cahaya?.["S" + (sensor - 1)] ?? 0)
                );
                break;
            default:
                values.push(0);
        }
    });
    return {
        labels,
        values
    };
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
    syncTrendControls();
    renderCurrentRoom();
    refreshTrendAnalysis();
    restoreTrendChart();
}
/* ===========================================================
    INITIALIZE
=========================================================== */
function initializeMonitoring() {
    if (Monitoring.initialized)
        return;
    createMonitoringCards();
    createMonitoringInformation();
    createRoomChart();
    createTrendChart();
    initializeChartInteraction();
    initializeMonitoringChartToolbar();
    initializeRoomMenu();
    initializeTrendAnalysis();
    syncTrendUI();
    refreshTrendAnalysis();
    setInterval(
        checkConnectionStatus,
        1000
    );
    subscribeRoom(
        getCurrentRoomID()
    );
    Monitoring.initialized = true;
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
    const container =
        document.getElementById(
            "dustCards"
        );
    if (!container) return;
    let html = "";
    for (
        let i = 1;
        i <= room.dustSensors;
        i++
    ) {
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
                ${Language.replace(Language.get("monitoring.sensor.dust"),
        { index })}
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
    const container =
        document.getElementById(
            "lightCards"
        );
    if (!container) return;
    let html = "";
    for (
        let i = 1;
        i <= room.lightSensors;
        i++
    ) {
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
                ${Language.replace(Language.get("monitoring.sensor.light"),
        { index })}
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
    if (title) { title.textContent = Language.get(`room.${room.id}`); }
    const subtitle =
        document.getElementById("roomSubtitle");
    if (subtitle) {
        subtitle.textContent = Language.replace(Language.get("monitoring.room.subtitle"),
            {
                dust: room.dustSensors,
                light: room.lightSensors
            }
        );
    }
}
/* ===========================================================
    RESET MONITORING
=========================================================== */
function resetMonitoringView() {
    const room = currentRoom();
    for (let i = 1; i <= room.dustSensors; i++) {
        updateSensor(
            "dust-" + i,
            "--"
        );
        updateBadge(
            "dust-status-" + i,
            {
                text: CONFIG.status.system.waiting,
                class: "theme-badge-neutral"
            }
        );
    }
    for (let i = 1; i <= room.lightSensors; i++) {
        updateSensor(
            "light-" + i,
            "--"
        );
        updateBadge(
            "light-status-" + i,
            {
                text: CONFIG.status.system.waiting,
                class: "theme-badge-neutral"
            }
        );
    }
    document.getElementById("averageDust").textContent = "--";
    document.getElementById("averageLight").textContent = "--";
    document.getElementById("lastUpdate").textContent = "--";
}
/* ===========================================================
    CHANGE ROOM
=========================================================== */
function changeRoom(roomID) {
    if (
        getCurrentRoomID() === roomID
    ) {
        loadCurrentRoom();
        restoreRoomChart();
        restoreTrendChart();
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
    syncTrendUI();
    restoreTrendChart();
    refreshTrendAnalysis();
    subscribeRoom(roomID);
}
/* ===========================================================
    LOAD ROOM DATA
=========================================================== */
function loadCurrentRoom() {
    const data = getCurrentRoomData();
    if (!data) {
        resetMonitoringView();
        return;
    }
    updateRoomData(data);
}
/* ===========================================================
    SUBSCRIBE ROOM
=========================================================== */
function subscribeRoom(roomID) {
    Monitoring.subscribedRoom =
        roomID;
    if (
        typeof window.subscribeFirebaseRoom ===
        "function"
    ) {
        window.subscribeFirebaseRoom(
            roomID
        );
    }
}
/* ===========================================================
    UNSUBSCRIBE ROOM
=========================================================== */
function unsubscribeRoom() {
    if (
        typeof window.unsubscribeFirebaseRoom ===
        "function"
    ) {
        window.unsubscribeFirebaseRoom();
    }
    Monitoring.subscribedRoom =
        null;
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
    const mode =
        document.getElementById("chartMode");
    const sensor =
        document.getElementById("chartSensor");
    if (!mode || !sensor)
        return;
    mode.addEventListener("change", () => {
        setTrendMode(mode.value);
        updateTrendSensorDropdown();
        refreshTrendAnalysis();
    });
    sensor.addEventListener(
        "change",
        () => {
            setTrendSensor(sensor.value);
            refreshTrendAnalysis();
        }
    );
    syncTrendControls();
    refreshTrendAnalysis();
}
function refreshTrendAnalysis() {
    const dataset = getTrendRenderDataset();
    updateTrendBadge();
    updateTrendSubtitle();
    updateTrendChart(dataset);
}
/* ===========================================================
    RESTORE TREND CHART
=========================================================== */
function restoreTrendChart() {
    updateTrendChartLimitButton();
    updateTrendChartZoomButton();
    updateTrendChartToolbarState();
    applyTrendChartInteraction();
    const dataset = getTrendRenderDataset();
    updateTrendChart(dataset);
}
function updateTrendSensorDropdown() {
    const sensor =
        document.getElementById("chartSensor");
    if (!sensor)
        return;
    const room = currentRoom();
    sensor.innerHTML = "";
    const mode = getTrendMode();
    if (mode === "averageDust" || mode === "averageLight") {
        sensor.disabled = true;
        sensor.classList.add("bg-slate-100");
        sensor.innerHTML = `
        <option>
            ${Language.get("monitoring.sensor.notRequired")}
        </option>
    `;
        setTrendSensor(null);
        return;
    }
    sensor.disabled = false;
    sensor.classList.remove("bg-slate-100");
    const totalSensor = getTrendMode() === "dust"
        ? room.dustSensors
        : room.lightSensors;
    const prefix =
        getTrendMode() === "dust"
            ? Language.get("monitoring.sensor.prefix.dust")
            : Language.get("monitoring.sensor.prefix.light");
    for (let i = 1; i <= totalSensor; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = `${prefix} ${i}`;
        sensor.appendChild(option);
    }
    const currentSensor = getTrendSensor();
    if (currentSensor) {
        sensor.value = currentSensor;
    } else {
        sensor.selectedIndex = 0;
        setTrendSensor(sensor.value);
    }
}
function getTrendConfiguration() {
    const mode = getTrendMode();
    const sensor = getTrendSensor();
    switch (mode) {
        case "averageDust":
            return {
                mode,
                sensor: null,
                label: Language.get("monitoring.trend.averageDust"),
                unit: "µg/m³",
                decimals: 2,
                category: "dust",
                color: "#F97316"
            };
        case "averageLight":
            return {
                mode,
                sensor: null,
                label: Language.get("monitoring.trend.averageLight"),
                unit: "Lux",
                decimals: 1,
                category: "light",
                color: "#FACC15"
            };
        case "dust":
            return {
                mode,
                sensor,
                label: Language.replace(Language.get("monitoring.trend.dust"), { sensor }),
                unit: "µg/m³",
                decimals: 2,
                category: "dust",
                color: "#F97316"
            };
        case "light":
            return {
                mode,
                sensor,
                label: Language.replace(Language.get("monitoring.trend.light"), { sensor }),
                unit: "Lux",
                decimals: 1,
                category: "light",
                color: "#FACC15"
            };
        default:
            return {
                mode: "averageDust",
                sensor: null,
                label: Language.get("monitoring.trend.averageDust"),
                unit: "µg/m³",
                decimals: 2,
                category: "dust",
                color: "#F97316"
            };
    }
}
/* ===========================================================
    UPDATE TREND BADGE
=========================================================== */
function updateTrendBadge() {
    const badge = document.getElementById(
        "trendChartBadge"
    );
    if (!badge) {
        return;
    }
    const config = getTrendConfiguration();
    badge.textContent = config.label;
    badge.className =
        "px-3 py-1 rounded-full text-sm font-medium";
    if (
        config.mode === "averageDust" ||
        config.mode === "dust"
    ) {
        badge.classList.add(
            "bg-orange-100",
            "text-orange-700"
        );
    } else {
        badge.classList.add(
            "bg-yellow-100",
            "text-yellow-700"
        );
    }
}
/* ===========================================================
    UPDATE TREND SUBTITLE
=========================================================== */
function updateTrendSubtitle() {
    const subtitle = document.getElementById(
        "trendChartSubtitle"
    );
    if (!subtitle) {
        return;
    }
    const config = getTrendConfiguration();
    switch (config.mode) {
        case "averageDust":
            subtitle.textContent = Language.get("monitoring.trend.subtitle.averageDust");
            break;
        case "averageLight":
            subtitle.textContent = Language.get("monitoring.trend.subtitle.averageLight");
            break;
        case "dust":
            subtitle.textContent = Language.replace(
                Language.get("monitoring.trend.subtitle.dust"), {
                sensor: config.sensor
            }
            );
            break;
        case "light":
            subtitle.textContent = Language.replace(
                Language.get("monitoring.trend.subtitle.light"), {
                sensor: config.sensor
            }
            );
            break;
        default:
            subtitle.textContent = Language.get("monitoring.trend.subtitle.default");
    }
}
function getTrendDataset() {
    const config = getTrendConfiguration();
    const trend = buildTrendDataset();
    return {
        labels: trend.labels,
        datasets: [
            {
                label: config.label,
                data: trend.values
            }
        ]
    };
}
/* ===========================================================
    GET TREND RENDER DATASET
=========================================================== */
function getTrendRenderDataset() {
    const dataset =
        getTrendDataset();
    const limit =
        getTrendChartInteraction()
            .limit;
    return {
        labels:
            dataset.labels.slice(-limit),
        datasets: [
            {
                ...dataset.datasets[0],
                data:
                    dataset.datasets[0]
                        .data
                        .slice(-limit)
            }
        ]
    };
}
/* ===========================================================
    TREND CHART LIMIT
=========================================================== */
function setTrendChartLimit(limit) {
    getTrendChartInteraction().limit =
        limit;
    updateTrendChartLimitButton();
    const dataset = getTrendRenderDataset();
    updateTrendChart(dataset);
}
/* ===========================================================
    TREND CHART LIMIT BUTTON
=========================================================== */
function updateTrendChartLimitButton() {
    const limit =
        getTrendChartInteraction().limit;
    const buttons = {
        10:
            "analysisTrend10Btn",
        20:
            "analysisTrend20Btn",
        50:
            "analysisTrend50Btn"
    };
    Object.entries(buttons)
        .forEach(([value, id]) => {
            const button =
                document.getElementById(id);
            if (!button)
                return;
            button.classList.remove(
                "theme-button-primary"
            );
            if (
                Number(value) === limit
            ) {
                button.classList.add(
                    "theme-button-primary"
                );
            }
        });
}
/* ===========================================================
    APPLY CHART DATASET
=========================================================== */
// TODO v2.1
// Deprecated.
// Tidak lagi digunakan oleh Monitoring Runtime.
// Akan dihapus setelah Monitoring LOCK.
function applyChartDataset(dataset) {
    const chart = getRealtimeChart();
    if (!chart) {
        return;
    }
    chart.data.labels = [...dataset.labels];
    chart.data.datasets = [...dataset.datasets];
    chart.update("none");
}
/* ===========================================================
    SYNC TREND UI
=========================================================== */
function syncTrendUI() {
    const mode =
        document.getElementById("chartMode");
    if (!mode)
        return;
    mode.value = getTrendMode();
    updateTrendSensorDropdown();
}
/* ===========================================================
    VALIDATE SENSOR VALUE
=========================================================== */
function normalizeValue(value) {
    const number = Number(value);
    if (
        value === null ||
        value === undefined ||
        Number.isNaN(number)
    ) {
        return null;
    }
    return number;
}
/* ===========================================================
    FORMAT TIME
=========================================================== */
function currentTime() {
    return new Date()
        .toLocaleTimeString(
            getDashboardLocale(),
            {
                hour12: false
            }
        );
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
            class: "theme-badge-neutral"
        };
    }
    if (number <= CONFIG.threshold.dust.normal) {
        return {
            text: CONFIG.status.dust.normal,
            class: "theme-badge-normal"
        };
    }
    if (number <= CONFIG.threshold.dust.warning) {
        return {
            text: CONFIG.status.dust.warning,
            class: "theme-badge-warning"
        };
    }
    return {
        text: CONFIG.status.dust.danger,
        class: "theme-badge-danger"
    };
}
function getLightStatus(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return {
            text: CONFIG.status.system.waiting,
            class: "theme-badge-neutral"
        };
    }
    if (number >= CONFIG.threshold.light.minimum &&
        number <= CONFIG.threshold.light.maximum) {
        return {
            text: CONFIG.status.light.ideal,
            class: "theme-badge-ideal"
        };
    } if (number < CONFIG.threshold.light.minimum) {
        return {
            text: CONFIG.status.light.poor,
            class: "theme-badge-poor"
        };
    } return {
        text: CONFIG.status.light.tooBright,
        class: "theme-badge-warning"
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
    updateSensor(
        "dust-" + index,
        value
    );
}
/* ===========================================================
    UPDATE DUST STATUS
=========================================================== */
function updateDustStatus(index, value) {
    renderSensorStatus(
        "dust-status-" + index,
        getDustStatus(value)
    );
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
    updateSensor(
        "light-" + index,
        value
    );
}
/* ===========================================================
    UPDATE LIGHT STATUS
=========================================================== */
function updateLightStatus(index, value) {
    renderSensorStatus(
        "light-status-" + index,
        getLightStatus(value)
    );
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
        updateDust(
            i + 1,
            data.dust?.[i]
        );
    }
}
/* ===========================================================
    RENDER LIGHT CARDS
=========================================================== */
function renderLightCards(data) {
    const room = currentRoom();
    for (let i = 0; i < room.lightSensors; i++) {
        updateLight(
            i + 1,
            data.light?.[i]
        );
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
function appendRealtimeChart(data) {
    updateRoomChart(
        data.averageDust,
        data.averageLight
    );
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
function createLineChart(
    canvasId,
    datasets,
    customOptions = {}
) {
    const canvas = document.getElementById(canvasId);

    if (!canvas) {
        return null;
    }

    const needZoom =
        customOptions?.plugins?.zoom !== undefined;

    return new Chart(canvas, {
        type: "line",
        data: {
            labels: [],
            datasets
        },
        options: ChartDesignSystem.mergeOptions(
            ChartDesignSystem.createOptions({
                zoom: needZoom
            }),
            customOptions
        )
    });
}
/* ===========================================================
    CHART
=========================================================== */
function createRoomChart() {
    const canvas = document.getElementById(
        "roomChart"
    );
    if (!canvas) return;
    const ctx =
        canvas.getContext("2d");
    if (Monitoring.charts.room) {
        Monitoring.charts.room.destroy();
    }
    Monitoring.charts.room =
        createLineChart(
            "roomChart",
            [
                ChartDesignSystem.createDataset(
                    "Average Dust",
                    ChartDesignSystem.DATASET.MONITORING.AVERAGE_DUST
                ),
                ChartDesignSystem.createDataset(
                    "Average Light",
                    ChartDesignSystem.DATASET.MONITORING.AVERAGE_LIGHT
                )
            ],
            {
                plugins: {
                    zoom: {
                        pan: {
                            enabled: false,
                            mode: "x"
                        },
                        zoom: {
                            wheel: {
                                enabled: false
                            },
                            pinch: {
                                enabled: false
                            },
                            drag: {
                                enabled: false
                            },
                            mode: "x"
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: "10%",
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        );
}
/* ===========================================================
    CREATE TREND CHART
=========================================================== */
function createTrendChart() {
    const canvas = document.getElementById(
        "trendChart"
    );
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext("2d");
    if (Monitoring.charts.trend) {
        Monitoring.charts.trend.destroy();
    }
    Monitoring.charts.trend =
        createLineChart(
            "trendChart",
            [
                ChartDesignSystem.createDataset(
                    Language.get("monitoring.trend.chart"),
                    ChartDesignSystem.DATASET.MONITORING.TREND
                )
            ],
            {
                plugins: {
                    zoom: {
                        pan: {
                            enabled: false,
                            mode: "x"
                        },
                        zoom: {
                            wheel: {
                                enabled: false
                            },
                            pinch: {
                                enabled: false
                            },
                            drag: {
                                enabled: false
                            },
                            mode: "x"
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: "10%",
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        );
}
/* ===========================================================
    UPDATE CHART
=========================================================== */
function updateRoomChart(
    averageDust,
    averageLight
) {
    const chart =
        getRealtimeChart();
    if (!chart)
        return;
    const history =
        currentChartHistory();
    // Simpan histori sesuai node aktif
    history.labels.push(
        currentTime()
    );
    history.dust.push(
        averageDust
    );
    history.light.push(
        averageLight
    );
    // Maksimal jumlah titik
    while (
        history.labels.length >
        CONFIG.chart.maxPoints
    ) {
        history.labels.shift();
        history.dust.shift();
        history.light.shift();
    }
    if (isRoomChartExploreMode()) {
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
    AVERAGE
=========================================================== */
// Deprecated
// Sudah digantikan oleh average dari Firebase
function calculateAverage(data) {
    const room = currentRoom();
    let dustTotal = 0;
    let dustCount = 0;
    let lightTotal = 0;
    let lightCount = 0;
    for (
        let i = 1;
        i <= room.dustSensors;
        i++
    ) {
        const value =
            normalizeValue(
                data["dust" + i]
            );
        if (value !== null) {
            dustTotal += value;
            dustCount++;
        }
    }
    for (
        let i = 1;
        i <= room.lightSensors;
        i++
    ) {
        const value =
            normalizeValue(
                data["light" + i]
            );
        if (value !== null) {
            lightTotal += value;
            lightCount++;
        }
    }
    return {
        dust:
            dustCount > 0
                ? dustTotal / dustCount
                : 0,
        light:
            lightCount > 0
                ? lightTotal / lightCount
                : 0
    };
}
/* ===========================================================
    UPDATE SUMMARY
=========================================================== */
function updateMonitoringSummary(data) {
    const avgDust =
        document.getElementById("averageDust");
    const avgLight =
        document.getElementById("averageLight");
    const dustCount =
        document.getElementById("dustCount");
    const lightCount =
        document.getElementById("lightCount");
    const nodeStatus =
        document.getElementById("nodeStatus");
    const lastUpdate =
        document.getElementById("lastUpdate");
    const room = currentRoom();
    const dustValue =
        Number(data.averageDust ?? 0);
    const lightValue =
        Number(data.averageLight ?? 0);
    if (avgDust)
        avgDust.textContent =
            dustValue.toFixed(2);
    if (avgLight)
        avgLight.textContent =
            lightValue.toFixed(2);
    if (dustCount)
        dustCount.textContent =
            room.dustSensors;
    if (lightCount)
        lightCount.textContent =
            room.lightSensors;
    if (lastUpdate)
        lastUpdate.textContent =
            currentTime();
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
        "theme-badge-neutral"
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
        case "online":
            updateBadge("nodeStatus", {
                text: CONFIG.status.system.online,
                class: "theme-badge-online"
            });
            break;
        case "waiting":
            updateBadge("nodeStatus", {
                text: CONFIG.status.system.waiting,
                class: "theme-badge-waiting"
            });
            break;
        case "offline":
            updateBadge("nodeStatus", {
                text: CONFIG.status.system.offline,
                class: "theme-badge-offline"
            });
            break;
    }
}
/* ===========================================================
    CONNECTION STATUS
=========================================================== */
function checkConnectionStatus() {
    const roomID = getCurrentRoomID();
    const connection =
        getConnection(roomID);
    const diff =
        Date.now() - connection.lastReceive;
    let state;
    if (connection.lastReceive === 0) {
        state = "waiting";
    } else if (diff <= CONFIG.communication.online) {
        state = "online";
    } else if (diff <= CONFIG.communication.waiting) {
        state = "waiting";
    } else {
        state = "offline";
    }
    if (connection.state !== state) {
        connection.state = state;
        updateNodeStatus(state);
        if (typeof updateDashboardCommunication === "function") {
            updateDashboardCommunication(state);
        }
        if (typeof refreshDashboard === "function") {
            refreshDashboard();
        }
    }
}
/* ===========================================================
    FIREBASE BRIDGE
=========================================================== */
function updateMonitoringNodeA(data) {
    if (!data)
        return;
    Monitoring.roomData.nodeA = data;
    updateLastReceive("nodeA");
    if (getCurrentRoomID() === "nodeA") {
        updateRoomData(data);
        appendRealtimeChart(data);
    }
    if (typeof refreshDashboard === "function") {
        refreshDashboard();
    }
}
function updateMonitoringNodeB(data) {
    if (!data)
        return;
    Monitoring.roomData.nodeB = data;
    updateLastReceive("nodeB");
    if (getCurrentRoomID() === "nodeB") {
        updateRoomData(data);
        appendRealtimeChart(data);
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
    const chart =
        getRealtimeChart();
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
    history.forEach(item => {
        const waktu = new Date(item.waktu);
        chartHistory.labels.push(
            waktu.toLocaleTimeString(
                getDashboardLocale(), {
                hour12: false
            })
        );
        chartHistory.dust.push(
            Number(item.debu?.rata ?? 0)
        );
        chartHistory.light.push(
            Number(item.cahaya?.rata ?? 0)
        );
    });
    const maxPoints = CONFIG.chart.maxPoints;
    if (chartHistory.labels.length > maxPoints) {
        chartHistory.labels =
            chartHistory.labels.slice(-maxPoints);
        chartHistory.dust =
            chartHistory.dust.slice(-maxPoints);
        chartHistory.light =
            chartHistory.light.slice(-maxPoints);
    }
    restoreRoomChart();
    // Jika history yang selesai dimuat adalah room yang sedang aktif,
    // langsung bangun ulang Trend Chart.
    if (roomID === getCurrentRoomID()) {
        refreshTrendAnalysis();
    }
}
