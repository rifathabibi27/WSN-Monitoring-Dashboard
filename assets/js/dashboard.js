/* =====================================================
    dashboard.js
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();
});
/* =====================================================
    GLOBAL
===================================================== */
const Dashboard = {
    active: true,
    initialized: false,
    view: {
        currentNode: "nodeA",
        trendLimit:
            CONFIG.dashboard.trendMaxPoints,
        defaultTrendLimit:
            CONFIG.dashboard.trendMaxPoints,
        interaction: {
            mode: "live"
        }
    },
    updateInterval: null,
    system: {
        onlineNodes: 0,
        totalNodes: 2,
        totalSensors: 20,
        onlineSensors: 0,
        averageDust: 0,
        averageLight: 0,
        lastUpdate: null
    },
    nodes: {
        nodeA: null,
        nodeB: null
    },
    charts: {
        trend: null
    },
    carousel: {
        interval: null,
        delay: 5000
    },
    activities: [],
    activityCache: new Set(),
    communicationState: "online",
    eventState: {
        nodeA: {
            communication: "waiting",
            lastTimestamp: null,
            dust: "normal",
            light: "normal"
        },
        nodeB: {
            communication: "waiting",
            lastTimestamp: null,
            dust: "normal",
            light: "normal"
        }
    },
};
let dashboardCharts = {
    dustNodeA: null,
    dustNodeB: null,
    lightNodeA: null,
    lightNodeB: null
};
const chartHistoryLength = 50;
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
    Dashboard.initialized = true;
    setInterval(
        refreshActivityTimes,
        1000
    );
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
    if (Dashboard.updateInterval)
        return;
    Dashboard.updateInterval = setInterval(() => {
        if (!Dashboard.active)
            return;
        // Tidak melakukan apa-apa.
        // Dashboard sekarang menunggu update dari Firebase.
    }, 1000);
}
/* =====================================================
    STOP DASHBOARD REALTIME
===================================================== */
function stopDashboardRealtime() {
    if (!Dashboard.updateInterval)
        return;
    clearInterval(Dashboard.updateInterval);
    Dashboard.updateInterval = null;
}
/* =====================================================
    CREATE DASHBOARD CHARTS
===================================================== */
function createDashboardCharts() {
    dashboardCharts.dustNodeA = createLineChart(
        "dustNodeAChart",
        "Debu Node A",
        "#2563EB"
    );
    dashboardCharts.dustNodeB = createLineChart(
        "dustNodeBChart",
        "Debu Node B",
        "#DC2626"
    );
    dashboardCharts.lightNodeA = createLineChart(
        "lightNodeAChart",
        "Cahaya Node A",
        "#F59E0B"
    );
    dashboardCharts.lightNodeB = createLineChart(
        "lightNodeBChart",
        "Cahaya Node B",
        "#16A34A"
    );
}
/* =====================================================
    CREATE LINE CHARTS
===================================================== */
function createLineChart(canvasID, label, color) {
    const ctx = document
        .getElementById(canvasID)
        .getContext("2d");
    return new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + "20",
                fill: true,
                tension: .35,
                pointRadius: 2,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: true
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
/* =====================================================
    UPDATE CHARTS
===================================================== */
function updateChart(chart, value) {
    const time =
        formatRelativeTime(
            activity.timestamp
        );
    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(value);
    if (chart.data.labels.length >
        chartHistoryLength) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update();
}
/* =====================================================
    UPDATE DASHBOARD
===================================================== */
function updateDashboard(nodeA, nodeB) {
    updateChart(
        dashboardCharts.dustNodeA,
        nodeA.avgDust
    );
    updateChart(
        dashboardCharts.lightNodeA,
        nodeA.avgLight
    );
    updateChart(
        dashboardCharts.dustNodeB,
        nodeB.avgDust
    );
    updateChart(
        dashboardCharts.lightNodeB,
        nodeB.avgLight
    );
}
/* =====================================================
    UPDATE SYSTEM STATUS
===================================================== */
function updateSystemStatus(status) {
    const box = document
        .getElementById(
            "systemStatus"
        );
    if (status === "Normal") {
        box.className =
            "mt-8 bg-green-100 border border-green-300 rounded-2xl p-5 flex justify-between items-center";
    }
    else if (status === "Warning") {
        box.className =
            "mt-8 bg-yellow-100 border border-yellow-300 rounded-2xl p-5 flex justify-between items-center";
    }
    else {
        box.className =
            "mt-8 bg-red-100 border border-red-300 rounded-2xl p-5 flex justify-between items-center";
    }
}
/* =====================================================
    ADD ACTIVITY
===================================================== */
function addActivity(message) {
    const activity = document
        .getElementById(
            "activityList"
        );
    const item = document
        .createElement("div");
    item.className =
        "flex justify-between items-center px-6 py-4 border-b";
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
        activity.removeChild(
            activity.lastChild
        );
    }
}
/* =====================================================
    DASHBOARD PROVIDER HELPER
===================================================== */
function currentDashboardNode() {
    return Monitoring.roomData[
        Dashboard.view.currentNode
    ] || null;
}
function currentDashboardRoom() {
    return CONFIG.rooms.find(
        room => room.id === Dashboard.view.currentNode
    ) || null;
}
/* =====================================================
    DASHBOARD NODE HELPER
===================================================== */
function getDashboardNodes() {
    return CONFIG.rooms.map(room => room.id);
}
function getCurrentDashboardIndex() {
    return getDashboardNodes().indexOf(
        Dashboard.view.currentNode
    );
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
    const next =
        (getCurrentDashboardIndex() + 1)
        % nodes.length;
    setDashboardNode(
        nodes[next]
    );
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
        (getCurrentDashboardIndex() - 1 + nodes.length)
        % nodes.length;
    setDashboardNode(
        nodes[previous]
    );
    if (resetTimer) {
        resetDashboardAutoCarousel();
    }
}
/* =====================================================
    UPDATE DASHBOARD CAROUSEL
===================================================== */
function updateDashboardCarousel() {
    const dots =
        document.querySelectorAll(
            "#dashboardCarouselIndicator span"
        );
    dots.forEach((dot, index) => {
        dot.classList.remove(
            "theme-carousel-dot-active"
        );
        if (index === getCurrentDashboardIndex()) {
            dot.classList.add(
                "theme-carousel-dot-active"
            );
        }
    });
}
/* =====================================================
    INITIALIZE DASHBOARD CAROUSEL
===================================================== */
function initializeDashboardCarousel() {
    document
        .getElementById("dashboardNextNode")
        ?.addEventListener(
            "click",
            () => nextDashboardNode(true)
        );
    document
        .getElementById("dashboardPrevNode")
        ?.addEventListener(
            "click",
            () => previousDashboardNode(true)
        );
    updateDashboardCarousel();
}
/* =====================================================
    DASHBOARD CAROUSEL HOVER
===================================================== */
function initializeDashboardCarouselHover() {
    const card = document.querySelector(
        "#dashboardPage .lg\\:col-span-5"
    );
    if (!card) {
        return;
    }
    card.addEventListener(
        "mouseenter",
        pauseDashboardAutoCarousel
    );
    card.addEventListener(
        "mouseleave",
        resumeDashboardAutoCarousel
    );
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
    const nodeA = Monitoring.roomData.nodeA;
    const nodeB = Monitoring.roomData.nodeB;
    if (!nodeA || !nodeB) {
        return;
    }
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
    refreshAverageDust(nodeA, nodeB);
    refreshAverageLight(nodeA, nodeB);
    refreshLastSync(nodeA, nodeB);
}
/* =====================================================
    REFRESH NODE CARD
===================================================== */
function refreshNodeCard() {
    const node = currentDashboardNode();
    const room = currentDashboardRoom();
    if (!node || !room) {
        return;
    }
    renderNodeCardHeader(room);
    renderNodeCard(node, room);
}
function getDashboardLocale() {
    return Language.current === "en"
        ? "en-US"
        : "id-ID";
}
/* =====================================================
    FORMAT DASHBOARD DATE
===================================================== */
function formatDashboardDate(timestamp) {
    if (!timestamp) {
        return "--";
    }
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleDateString(
        getDashboardLocale(),
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
    const formattedTime = date
        .toLocaleTimeString(
            getDashboardLocale(),
            {
                hour12: false
            }
        )
        .replace(/:/g, ".");
    return `${formattedDate} • ${formattedTime}`;
}
/* =====================================================
    RENDER NODE CARD HEADER
===================================================== */
function renderNodeCardHeader(room) {
    const title =
        document.getElementById("nodeATitle");
    const subtitle =
        document.getElementById("nodeASubtitle");
    if (title) {
        title.textContent = Language.get(
            `room.${room.id}`
        );
    }
    if (subtitle) {
        subtitle.textContent = room.short;
    }
}
/* =====================================================
    RENDER NODE CARD
===================================================== */
function renderNodeCard(node, room) {
    const status =
        document.getElementById("nodeAStatus");
    const dust =
        document.getElementById("nodeADust");
    const light =
        document.getElementById("nodeALight");
    const lastUpdate =
        document.getElementById("nodeALastUpdate");
    if (dust) {
        dust.textContent =
            Number(node.averageDust || 0).toFixed(2) +
            " μg/m³";
    } if (light) {
        light.textContent =
            Number(node.averageLight || 0).toFixed(2) +
            " Lux";
    } if (lastUpdate) {
        lastUpdate.textContent = formatDashboardDate(node.timestamp);
    } if (!status) {
        return;
    } if (
        node.status &&
        node.status.toUpperCase() === "NORMAL") {
        status.className = "theme-badge";
        status.classList.add("theme-badge-success");
        status.textContent = Language.get("dashboard.dynamic.status.normal");
    } else {
        status.className = "theme-badge";
        status.classList.add("theme-badge-danger");
        status.textContent = Language.get("dashboard.dynamic.status.abnormal");
    }
}
/* =====================================================
    DASHBOARD SYSTEM TREND
===================================================== */
function createDashboardTrendChart() {
    const canvas = document.getElementById(
        "dashboardTrendChart"
    );
    if (!canvas)
        return;
    if (Dashboard.charts.trend) {
        Dashboard.charts.trend.destroy();
    }
    Dashboard.charts.trend = new Chart(canvas, {
        type: "line",
        data: {
            labels: [],
            datasets: buildDashboardTrendDatasets()
        },
        options: ChartDesignSystem.mergeOptions(
            ChartDesignSystem.createOptions({
                zoom: true,
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }),
            {
                scales: {
                    x: {
                        offset: false,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 6
                        }
                    },
                    y: {
                        grace: "5%",
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        )
    });
}
function getTrendSlice(data) {
    return data.slice(
        -Dashboard.view.trendLimit
    );
}
/* =====================================================
    BUILD DASHBOARD TREND DATASETS
===================================================== */
function buildDashboardTrendDatasets() {
    return [
        ChartDesignSystem.createDataset(
            Language.get("dashboard.dynamic.chart.dustNodeA"),
            ChartDesignSystem.DATASET.DASHBOARD.DUST_NODE_A
        ),
        ChartDesignSystem.createDataset(
            Language.get("dashboard.dynamic.chart.dustNodeB"),
            ChartDesignSystem.DATASET.DASHBOARD.DUST_NODE_B
        ),
        ChartDesignSystem.createDataset(
            Language.get("dashboard.dynamic.chart.lightNodeA"),
            ChartDesignSystem.DATASET.DASHBOARD.LIGHT_NODE_A
        ),
        ChartDesignSystem.createDataset(
            Language.get("dashboard.dynamic.chart.lightNodeB"),
            ChartDesignSystem.DATASET.DASHBOARD.LIGHT_NODE_B
        )
    ];
}
/* =====================================================
    BUILD DASHBOARD TREND CHART DATA
===================================================== */
function buildDashboardTrendChartData() {
    const nodeA = Monitoring.chartHistory.nodeA;
    const nodeB = Monitoring.chartHistory.nodeB;
    if (!nodeA || !nodeB) {
        return ChartDesignSystem.composeChartData({
            labels: [],
            datasets: buildDashboardTrendDatasets()
        });
    }
    const datasets = buildDashboardTrendDatasets();
    ChartDesignSystem.setDatasetData(
        datasets,
        [
            getTrendSlice(nodeA.dust),
            getTrendSlice(nodeB.dust),
            getTrendSlice(nodeA.light),
            getTrendSlice(nodeB.light)
        ]
    );
    return ChartDesignSystem.composeChartData({
        labels: getTrendSlice(nodeA.labels),
        datasets
    });
}
/* =====================================================
    REFRESH DASHBOARD TREND CHART
===================================================== */
function refreshDashboardTrendChart() {
    if (!Dashboard.charts.trend)
        return;
    if (isDashboardExploreMode()) {
        return;
    }
    const nodeA = Monitoring.chartHistory.nodeA;
    const nodeB = Monitoring.chartHistory.nodeB;
    if (!nodeA || !nodeB)
        return;
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
    document
        .getElementById("trend10Btn")
        ?.addEventListener("click", () => {
            setDashboardTrendLimit(10);
        });
    document
        .getElementById("trend20Btn")
        ?.addEventListener("click", () => {
            setDashboardTrendLimit(20);
        });
    document
        .getElementById("trend50Btn")
        ?.addEventListener("click", () => {
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
        ?.addEventListener(
            "click",
            enableDashboardExploreMode
        );
    document
        .getElementById("dashboardTrendReset")
        ?.addEventListener(
            "click",
            resetDashboardTrend
        );
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
    const chart =
        getDashboardTrendChart();
    if (!chart) {
        return;
    }
    const explore =
        isDashboardExploreMode();
    chart.options.plugins.zoom.zoom.wheel.enabled =
        explore;
    chart.options.plugins.zoom.zoom.pinch.enabled =
        explore;
    chart.options.plugins.zoom.pan.enabled =
        explore;
    chart.options.plugins.zoom.zoom.drag.enabled =
        false;
    chart.update("none");
}
/* =====================================================
    UPDATE TREND TOOLBAR STATE
===================================================== */
function updateTrendToolbarState() {
    const isExplore = isDashboardExploreMode();
    [
        trend10Btn,
        trend20Btn,
        trend50Btn
    ].forEach(button => {
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
    setDashboardInteractionMode(
        "explore"
    );
    applyDashboardInteraction();
    updateDashboardZoomButton();
    updateTrendStateBadge();
    updateTrendToolbarState();
}
/* =====================================================
    UPDATE ZOOM BUTTON
===================================================== */
function updateDashboardZoomButton() {
    const button = document.getElementById(
        "dashboardTrendZoom");
    if (!button) return;
    button.classList.remove(
        "theme-button-zoom-active"
    );
    if (isDashboardExploreMode()) {
        button.classList.add(
            "theme-button-zoom-active"
        );
    }
}
/* =====================================================
    UPDATE TREND STATE BADGE
===================================================== */
function updateTrendStateBadge() {
    const badge = document.getElementById(
        "dashboardTrendState"
    );
    if (!badge) return;
    badge.className = "theme-badge";
    if (isDashboardExploreMode()) {
        badge.classList.add(
            "theme-badge-explore"
        );
        badge.innerHTML = `
            <span class="theme-badge-dot theme-badge-dot-explore"></span>
            ${Language.get("dashboard.dynamic.trend.explore")}
        `;
        return;
    }
    badge.classList.add(
        "theme-badge-live"
    );
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
    limits.forEach(limit => {
        const button = document.getElementById(
            `trend${limit}Btn`
        );
        if (!button) return;
        button.classList.remove(
            "theme-button-active"
        );
    });
    const activeButton = document.getElementById(
        `trend${Dashboard.view.trendLimit}Btn`
    );
    if (!activeButton) return;
    activeButton.classList.add(
        "theme-button-active"
    );
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
    const average = (
        Number(nodeA?.averageDust ?? 0) +
        Number(nodeB?.averageDust ?? 0)
    ) / 2;
    updateCard(
        "avgDust",
        average.toFixed(2)
    );
}
function refreshTotalSensor() {
    const total = CONFIG.rooms.reduce((sum, room) => {
        return sum + room.dustSensors + room.lightSensors;
    }, 0);
    const el = document.getElementById("totalSensor");
    if (el)
        el.textContent = total;
}
function refreshOnlineNode() {
    let online = 0;
    CONFIG.rooms.forEach(room => {
        const connection =
            Monitoring.connection?.[room.id];
        if (!connection) {
            return;
        }
        if (connection.state === "online") {
            online++;
        }
    });
    const element =
        document.getElementById("onlineNode");
    if (!element) {
        return;
    }
    element.textContent =
        `${online}/${CONFIG.rooms.length}`;
}
function refreshLastSync(nodeA, nodeB) {
    const latest = Math.max(
        nodeA?.timestamp || 0,
        nodeB?.timestamp || 0
    );
    const el = document.getElementById("dashboardLastSync");
    if (!el) {
        return;
    }
    if (!latest) {
        el.textContent = "--";
        return;
    }
    el.textContent = new Date(latest).toLocaleTimeString(
        getDashboardLocale(),
        {
            hour12: false
        }
    );
}
function refreshAverageLight(nodeA, nodeB) {
    const average =
        (Number(nodeA.averageLight) +
            Number(nodeB.averageLight)) / 2;
    const el = document.getElementById("avgLight");
    if (el)
        el.textContent = average.toFixed(2);
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
/* =====================================================
    DEPRECATED
    Digantikan oleh collectCommunicationEvent()
===================================================== */
function buildRecentActivities() {
    const activities = [];
    collectNodeActivity(
        activities,
        "nodeA",
        "LAB. KIK JTE"
    );
    collectNodeActivity(
        activities,
        "nodeB",
        "Kontainer"
    );
    activities.sort(
        (a, b) => b.timestamp - a.timestamp
    );
    return activities.slice(0, 20);
}
function collectNodeActivity(
    nodeId,
    roomName
) {
    const node =
        Monitoring.roomData[nodeId];
    if (!node) {
        return;
    }
    appendActivity({
        key:
            `${nodeId}_${node.timestamp}`,
        type: "success",
        title:
            `${roomName} berhasil sinkron`,
        description:
            "Data monitoring berhasil diterima Gateway.",
        timestamp:
            node.timestamp || Date.now()
    });
}
/* =====================================================
    COLLECT RECENT ACTIVITIES
===================================================== */
function collectRecentActivities() {
    collectCommunicationEvent();
    collectMonitoringEvents();
}
function getDashboardConnection(roomID) {
    return Monitoring.connection?.[roomID] ?? null;
}
/* =====================================================
    COMMUNICATION EVENTS
===================================================== */
function collectCommunicationEvent(
    nodeId,
    roomName) {
    const connection =
        getDashboardConnection(nodeId);
    if (!connection) {
        return;
    }
    const state =
        Dashboard.eventState[nodeId];
    if (
        state.communication ===
        connection.state
    ) {
        return;
    }
    if (
        connection.state === "online"
    ) {
        appendActivity({
            key: `${nodeId}_online_${connection.lastReceive}`,
            category: "communication",
            type: "success",
            titleKey: "activity.communication.online.title",
            descriptionKey: "activity.communication.online.description",
            values: {
                room: Language.get(`room.${nodeId}`)
            },
            timestamp: connection.lastReceive
        });
    }
    else if (
        connection.state === "waiting"
    ) {
        appendActivity({
            key: `${nodeId}_waiting_${connection.lastReceive}`,
            category: "communication",
            type: "warning",
            titleKey: "activity.communication.waiting.title",
            descriptionKey: "activity.communication.waiting.description",
            values: {
                room: Language.get(`room.${nodeId}`)
            },
            timestamp: Date.now()
        });
    }
    else {
        appendActivity({
            key: `${nodeId}_offline_${connection.lastReceive}`,
            category: "communication",
            type: "danger",
            titleKey: "activity.communication.offline.title",
            descriptionKey: "activity.communication.offline.description",
            values: {
                room: Language.get(`room.${nodeId}`)
            },
            timestamp: Date.now()
        });
    }
    state.communication =
        connection.state;
}
/* =====================================================
    MONITORING EVENTS
===================================================== */
function collectMonitoringEvents() {
    collectDustEvent(
        "nodeA",
        "LAB. KIK JTE"
    );
    collectDustEvent(
        "nodeB",
        "Kontainer"
    );
    collectLightEvent(
        "nodeA",
        "LAB. KIK JTE"
    );
    collectLightEvent(
        "nodeB",
        "Kontainer"
    );
}
function collectDustEvent(
    nodeId,
    roomName
) {
    const node =
        Monitoring.roomData[nodeId];
    if (!node) {
        return;
    }
    const currentState =
        Number(node.averageDust) >
            CONFIG.threshold.dust.normal
            ? "warning"
            : "normal";
    const previousState =
        Dashboard.eventState[nodeId].dust;
    if (currentState === previousState) {
        return;
    }
    Dashboard.eventState[nodeId].dust =
        currentState;
    appendActivity({
        key:
            `${nodeId}_dust_${node.timestamp}`,
        category:
            "dust",
        type:
            currentState === "warning"
                ? "warning"
                : "success",
        titleKey:
            currentState === "warning"
                ? "activity.dust.high.title"
                : "activity.dust.normal.title",
        descriptionKey:
            currentState === "warning"
                ? "activity.dust.high.description"
                : "activity.dust.normal.description",
        values: {
            room: Language.get(`room.${nodeId}`),
            value: Number(node.averageDust).toFixed(2),
            threshold: CONFIG.threshold.dust.normal
        },
        timestamp: node.timestamp
    });
}
function collectLightEvent(
    nodeId,
    roomName
) {
    const node =
        Monitoring.roomData[nodeId];
    if (!node) {
        return;
    }
    let currentState = "normal";
    if (Number(node.averageLight) <
        CONFIG.threshold.light.minimum) {
        currentState = "low";
    }
    else if (Number(node.averageLight) >
        CONFIG.threshold.light.maximum) {
        currentState = "high";
    }
    const previousState =
        Dashboard.eventState[nodeId].light;
    if (currentState === previousState) {
        return;
    }
    Dashboard.eventState[nodeId].light =
        currentState;
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
            room: Language.get(`room.${nodeId}`),
            value: Number(node.averageLight).toFixed(2),
            minimum: CONFIG.threshold.light.minimum,
            maximum: CONFIG.threshold.light.maximum
        },
        timestamp: node.timestamp
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
    title,
    description,
    titleKey,
    descriptionKey,
    values = {},
    timestamp = Date.now()
}) {
    if (!key) return;
    if (Dashboard.activityCache.has(key)) {
        return;
    }
    Dashboard.activityCache.add(key);
    const activityTitle = titleKey
        ? Language.replace(
            Language.get(titleKey),
            values
        )
        : title;
    const activityDescription = descriptionKey
        ? Language.replace(
            Language.get(descriptionKey),
            values
        )
        : description;
    Dashboard.activities.unshift({
        key,
        category,
        type,
        priority: getActivityPriority(type),
        title: activityTitle,
        description: activityDescription,
        timestamp
    });
    pushDashboardNotification(Dashboard.activities[0]);
}
/* =====================================================
    SYNC ACTIVITY CACHE
===================================================== */
function syncActivityCache() {
    Dashboard.activityCache = new Set(
        Dashboard.activities.map(
            activity => activity.key
        )
    );
}
/* =====================================================
    FORMAT RELATIVE TIME
===================================================== */
function formatRelativeTime(timestamp) {
    const diff =
        Math.floor(
            (Date.now() - timestamp) / 1000
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
    return new Date(timestamp)
        .toLocaleDateString("id-ID");
}
/* =====================================================
    FORMAT ACTIVITY TIME
===================================================== */
function formatActivityTime(timestamp) {
    const diff = Math.floor(
        (Date.now() - Number(timestamp)) / 1000
    );
    if (diff < 5) {
        return Language.format(
            "dashboard.activity.justNow"
        );
    }
    if (diff < 60) {
        return Language.format(
            "dashboard.activity.secondsAgo",
            diff
        );
    }
    const minute = Math.floor(diff / 60);
    if (minute < 60) {
        return Language.format(
            "dashboard.activity.minutesAgo",
            minute
        );
    }
    return new Date(Number(timestamp))
        .toLocaleTimeString(
            getDashboardLocale(),
            {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
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
                color =
                    activity.type === "warning"
                        ? "amber"
                        : "green";
                break;
            case "light":
                icon = "bi-brightness-high-fill";
                color =
                    activity.type === "warning"
                        ? "yellow"
                        : "green";
                break;
            case "communication":
                icon = "bi-wifi";
                color =
                    activity.type === "danger"
                        ? "red"
                        : "green";
                break;
            default:
                icon = "bi-cpu";
                color = "blue";
        }
        const time =
            formatActivityTime(
                activity.timestamp
            );
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
            `
        );
    });
}
/* =====================================================
    REFRESH ACTIVITY TIMES
===================================================== */
function refreshActivityTimes() {
    document
        .querySelectorAll(".activity-time")
        .forEach(item => {
            item.textContent =
                formatActivityTime(
                    item.dataset.timestamp
                );
        });
}