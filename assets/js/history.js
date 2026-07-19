/* ============================================================
    history.js
    Monitoring Debu & Cahaya WSN
============================================================ */
/* ============================================================
    HISTORY FILTER STATE
============================================================ */
const historyFilterState = {
    search: "",
    timeRange: "24h",
    // identifier
    room: "all",
    sensor: "average",
    startDate: null,
    endDate: null
};
/* ============================================================
    UPDATE HISTORY FILTER STATE
============================================================ */
function updateHistoryFilterState() {
    historyFilterState.search = document.getElementById("searchData")
        ?.value
        .trim()
        .toLowerCase() || "";
    historyFilterState.timeRange = document.getElementById("timeRangeFilter")?.value || "today";
    historyFilterState.room = document.getElementById("roomFilter")?.value || "all";
    historyFilterState.sensor =
        (document.getElementById("sensorFilter")?.value || "average").toLowerCase();
    historyFilterState.startDate = document.getElementById("startDateFilter")?.value || null;
    historyFilterState.endDate = document.getElementById("endDateFilter")?.value || null;
}
/* ============================================================
    RESET HISTORY FILTER
============================================================ */
function resetHistoryFilter() {
    historyFilterState.search = "";
    historyFilterState.timeRange = "24h";
    historyFilterState.room = "all";
    historyFilterState.sensor = "average";
    historyFilterState.startDate = "";
    historyFilterState.endDate = "";
    document.getElementById("searchData").value = "";
    document.getElementById("timeRangeFilter").value = "24h";
    document.getElementById("roomFilter").value = "all";
    document.getElementById("sensorFilter").value = "average";
    document.getElementById("startDateFilter").value = "";
    document.getElementById("endDateFilter").value = "";
    updateSensorFilterDropdown(
        historyFilterState.room
    );
    handleTimeRangeChange();
    updateHistoryFilterState();
    refreshHistory();
}
/* ============================================================
    UPDATE SENSOR FILTER DROPDOWN
============================================================ */
function updateSensorFilterDropdown(roomID) {
    const sensor = document.getElementById("sensorFilter");
    if (!sensor) return;

    sensor.innerHTML = "";

    if (roomID === "all") {
        sensor.disabled = true;
        sensor.classList.add("bg-slate-100");
        sensor.innerHTML = `
            <option value="">
                ${Language.get("history.sensor.selectRoom")}
            </option>
        `;
        sensor.value = "";
        return;
    }

    sensor.disabled = false;
    sensor.classList.remove("bg-slate-100");

    const config = getRoomSensorConfig(roomID);
    if (!config) return;
    const options = [
        `<option value="average">
        ${Language.get("history.sensor.average") || "Rata-rata"}
     </option>`
    ];

    for (let i = 1; i <= config.dust; i++) {
        options.push(`
            <option value="dust${i}">
                ${Language.replace(Language.get("monitoring.sensor.dust"), { index: i })}
            </option>
        `);
    }

    for (let i = 1; i <= config.light; i++) {
        options.push(`
            <option value="light${i}">
                ${Language.replace(Language.get("monitoring.sensor.light"), { index: i })}
            </option>
        `);
    }

    sensor.innerHTML = options.join("");
    sensor.value = "average";   // pastikan lowercase
}
/* ============================================================
    GET ROOM SENSOR CONFIG
============================================================ */
function getRoomSensorConfig(roomID) {
    const room = CONFIG.rooms.find(
        item => item.id === roomID
    );
    if (!room) {
        return null;
    }
    return {
        dust: room.dustSensors,
        light: room.lightSensors
    };
}
let historyData = [];
let filteredData = [];
const rowsPerPage = 20;
let currentPage = 1;
// Menandakan data sudah siap diterima
let historyInitialized = false;
/* ============================================================
    HANDLE TIME RANGE
============================================================ */
function handleTimeRangeChange() {
    const timeRange = document.getElementById("timeRangeFilter");
    const startDate = document.getElementById("startDateFilter");
    const endDate = document.getElementById("endDateFilter");
    if (
        !timeRange ||
        !startDate ||
        !endDate
    ) {
        return;
    }
    const manual = timeRange.value === "manual";
    startDate.disabled = !manual;
    endDate.disabled = !manual;
    startDate.classList.toggle(
        "bg-slate-100",
        !manual
    );
    endDate.classList.toggle(
        "bg-slate-100",
        !manual
    );
}
/* ============================================================
    GET TIME RANGE
============================================================ */
function getTimeRange() {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    switch (historyFilterState.timeRange) {
        case "30m":
            start.setMinutes(
                start.getMinutes() - 30
            );
            break;
        case "1h":
            start.setHours(
                start.getHours() - 1
            );
            break;
        case "6h":
            start.setHours(
                start.getHours() - 6
            );
            break;
        case "12h":
            start.setHours(
                start.getHours() - 12
            );
            break;
        case "24h":
            start.setHours(
                start.getHours() - 24
            );
            break;
        case "7d":
            start.setDate(
                start.getDate() - 7
            );
            break;
        case "30d":
            start.setDate(
                start.getDate() - 30
            );
            break;
        case "manual": {
            let start = null;
            let end = null;
            if (historyFilterState.startDate) {
                start = new Date(historyFilterState.startDate);
                start.setHours(0, 0, 0, 0);
            }
            if (historyFilterState.endDate) {
                end = new Date(historyFilterState.endDate);
                end.setHours(23, 59, 59, 999);
            }
            return {
                start,
                end
            };
        }
    }
    return {
        start,
        end
    };
}
/* ============================================================
    FILTER : TIME RANGE
============================================================ */
function filterTimeRange(data, range) {
    if (!range || !range.start || !range.end) {
        return data;
    }
    const startTime = range.start.getTime();
    const endTime = range.end.getTime();
    return data.filter(item => {
        return (
            item.timestamp >= startTime &&
            item.timestamp <= endTime
        );
    });
}
/* ============================================================
    INITIALIZE
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    initializeHistory();
});
function initializeHistory() {
    const search = document.getElementById("searchData");
    const room = document.getElementById("roomFilter");
    const sensor = document.getElementById("sensorFilter");
    const timeRange = document.getElementById("timeRangeFilter");
    const startDate = document.getElementById("startDateFilter");
    const endDate = document.getElementById("endDateFilter");
    const reset = document.getElementById("resetHistoryFilter");
    if (search) {
        search.addEventListener("keyup", () => {
            updateHistoryFilterState();
            filterHistory();
        });
    }
    if (room) {
        room.addEventListener("change", () => {
            updateHistoryFilterState();
            updateSensorFilterDropdown(
                historyFilterState.room
            );
            const sensor = document.getElementById("sensorFilter");

            if (historyFilterState.room === "all") {
                sensor.value = "";
                historyFilterState.sensor = "average";
            } else {
                sensor.value = "average";
                historyFilterState.sensor = "average";
            }

            filterHistory();
        });
    }
    if (sensor) {
        sensor.addEventListener("change", () => {
            updateHistoryFilterState();
            filterHistory();
        });
    }
    if (timeRange) {
        timeRange.addEventListener("change", () => {
            handleTimeRangeChange();
            updateHistoryFilterState();
            refreshHistory();
        });
    }
    if (startDate) {
        startDate.addEventListener("change", () => {
            updateHistoryFilterState();
            refreshHistory();
        });
    }
    if (endDate) {
        endDate.addEventListener("change", () => {
            updateHistoryFilterState();
            refreshHistory();
        });
    }
    if (reset) {
        reset.addEventListener("click", resetHistoryFilter);
    }
    const download =
        document.getElementById("downloadCSV");
    if (download) {
        download.addEventListener(
            "click",
            () => {
                if (CONFIG.download.requirePIN) {
                    openPinModal();
                } else {
                    downloadCSVFile();
                }
            }
        );
    }
    updateSensorFilterDropdown(
        historyFilterState.room
    );
    handleTimeRangeChange();
    refreshHistory();
    const previous = document.getElementById("previousPage");
    const next = document.getElementById("nextPage");
    if (previous) {
        previous.addEventListener(
            "click",
            previousPage
        );
    }
    if (next) {
        next.addEventListener(
            "click",
            nextPage
        );
    }
    initializePinModalEvents();
}
/* ============================================================
    SET HISTORY DATA
============================================================ */
function setHistoryData(data) {
    historyData = [...data];
    filteredData = [...data];
    currentPage = 1;
}
/* ============================================================
    REFRESH HISTORY
============================================================ */
function refreshHistory() {
    const request = loadHistory();
    if (request && typeof request.then === "function") {
        return request.then(() => {
            filterHistory();
        });
    }
    filterHistory();
    return request;
}
/* ============================================================
    HISTORY UPDATED
============================================================ */
function onHistoryUpdated() {
    refreshHistory();
}
/* ============================================================
    LOAD ROOM HISTORY
============================================================ */
function loadRoomHistory(path, roomID, startAt, endAt) {
    return db.ref(path)
        .orderByChild("waktu")
        .startAt(startAt)
        .endAt(endAt)
        .once("value")
        .then(snapshot => {
            const records = [];
            snapshot.forEach(child => {
                records.push({
                    ...child.val(),
                    roomID
                });
            });
            return records;
        });
}
/* ============================================================
    HISTORY PROVIDER
============================================================ */
function loadHistory() {
    if (typeof db === "undefined") {
        return loadHistoryFromMonitoring();
    }
    const { start, end } = getTimeRange();
    if (!start || !end) {
        console.warn(
            "History Query dibatalkan. Rentang tanggal belum lengkap."
        );
        return Promise.resolve();
    }
    const startAt = start.getTime();
    const endAt = end.getTime();
    return Promise.all([
        loadRoomHistory(
            DB_PATH.history.nodeA,
            "nodeA",
            startAt,
            endAt
        ),
        loadRoomHistory(
            DB_PATH.history.nodeB,
            "nodeB",
            startAt,
            endAt
        )
    ])
        .then(results => {
            const history = results[0].concat(results[1]);
            history.sort((a, b) => b.waktu - a.waktu);
            const tableData = convertHistoryForTable(history);
            setHistoryData(tableData);
            historyInitialized = true;
        })
        .catch(error => {
            console.error(
                "History query error:",
                error
            );
            return loadHistoryFromMonitoring();
        });
}
/* ============================================================
    LOAD FROM MONITORING
============================================================ */
function loadHistoryFromMonitoring() {
    console.trace("loadHistoryFromMonitoring called");
    const history = getGlobalHistory();
    console.log(
        "Merged History :",
        history.length
    );
    if (!Array.isArray(history)) {
        return;
    }
    history.sort((a, b) => b.waktu - a.waktu);
    const tableData = convertHistoryForTable(history);
    setHistoryData(tableData);
    historyInitialized = true;
}
/* ============================================================
    GET GLOBAL HISTORY
============================================================ */
function getGlobalHistory() {
    if (
        typeof Monitoring === "undefined" ||
        !Monitoring.historyData
    ) {
        return [];
    }
    console.log(
        "History NodeA :",
        Monitoring.historyData.nodeA.length
    );
    console.log(
        "History NodeB :",
        Monitoring.historyData.nodeB.length
    );
    return [
        ...Monitoring.historyData.nodeA.map(item => ({
            ...item,
            roomID: "nodeA"
        })),
        ...Monitoring.historyData.nodeB.map(item => ({
            ...item,
            roomID: "nodeB"
        }))
    ];
}
/* ============================================================
    FORMAT TIMESTAMP
============================================================ */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
}
/* ============================================================
    CONVERT HISTORY FOR TABLE
============================================================ */
function convertHistoryForTable(history) {
    if (!Array.isArray(history)) {
        return [];
    }
    const records = [];
    history.forEach(item => {
        const waktu = new Date(item.waktu);
        const roomID = item.roomID;
        const roomName =
            Language.get(`room.${roomID}`);
        function createRecord(sensorID, sensorLabel, dustValue, lightValue) {
            const dust = Number(dustValue ?? 0);
            const light = Number(lightValue ?? 0);
            const dustCondition =
                calculateCondition(dust, "dust");
            const lightCondition =
                calculateCondition(light, "light");
            records.push({
                time: formatTimestamp(item.waktu),
                timestamp: waktu.getTime(),
                date: waktu.toLocaleDateString("sv-SE"),
                roomID,
                room: roomName,
                sensorID,
                sensor: sensorLabel,
                dust: dust.toFixed(2),
                light: light.toFixed(2),
                dustStatus: dustCondition.status,
                dustBadge: dustCondition.badge,
                lightStatus: lightCondition.status,
                lightBadge: lightCondition.badge,
                searchText: [
                    formatTimestamp(item.waktu),
                    roomName,
                    sensorLabel,
                    dustCondition.status,
                    lightCondition.status,
                    dust.toFixed(2),
                    light.toFixed(2)
                ].join(" ").toLowerCase()
            });
        }
        createRecord(
            "average",
            Language.get("history.sensor.average") || "Rata-rata",
            item.debu?.rata,
            item.cahaya?.rata
        );
        Object.keys(item.debu || {})
            .filter(key => key.startsWith("S"))
            .sort()
            .forEach((key, index) => {
                createRecord(
                    `dust${index + 1}`,
                    Language.replace(
                        Language.get("monitoring.sensor.dust"),
                        { index: index + 1 }
                    ),
                    item.debu[key],
                    0
                );
            });
        Object.keys(item.cahaya || {})
            .filter(key => key.startsWith("S"))
            .sort()
            .forEach((key, index) => {
                createRecord(
                    `light${index + 1}`,
                    Language.replace(
                        Language.get("monitoring.sensor.light"),
                        { index: index + 1 }
                    ),
                    0,
                    item.cahaya[key]
                );
            });
    });
    return records;
}
/* ============================================================
    FILTER : SEARCH
============================================================ */
function filterSearch(data, keyword) {
    if (!keyword) return data;
    return data.filter(item =>
        item.searchText.includes(keyword)
    );
}
/* ============================================================
    FILTER : ROOM
============================================================ */
function filterRoom(data, roomID) {
    if (roomID === "all") {
        return data;
    }
    return data.filter(item => {
        return item.roomID === roomID;
    });
}
/* ============================================================
    FILTER : SENSOR
============================================================ */
function filterSensor(data, sensorID) {
    if (!sensorID || sensorID === "average") {
        return data.filter(item => item.sensorID === "average");
    }
    return data.filter(item => item.sensorID === sensorID);
}
/* ============================================================
    FILTER HISTORY
============================================================ */
function filterHistory() {
    const keyword = historyFilterState.search;
    const room = historyFilterState.room;
    const sensor = (historyFilterState.sensor || "average").toLowerCase();
    let data = [...historyData];
    const range = getTimeRange();
    data = filterTimeRange(data, range);
    data = filterRoom(data, room);
    // =====================================================
    // Search berlaku sebelum Sensor
    // =====================================================
    data = filterSearch(data, keyword);
    // =====================================================
    // Default Average hanya jika Search kosong
    // =====================================================
    if (keyword === "") {
        data = filterSensor(data, sensor);
    }
    filteredData = data;
    currentPage = 1;
    updateHistorySummary();
    renderHistoryTable();
}
/* ============================================================
    HISTORY TABLE
============================================================ */
function renderHistoryTable() {
    const table = document.getElementById("historyTable");
    if (!table) return;
    table.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const data = filteredData.slice(start, end);
    const startNumber = start + 1;
    // Tidak ada data
    if (data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="8"
                    class="theme-table-empty">
                    Belum ada data history.
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }
    data.forEach((item, index) => {
        const number = startNumber + index;
        table.innerHTML += `
        <tr>
            <td class="theme-table-cell theme-table-cell-number">
                ${number}
            </td>
            <td class="theme-table-cell">
                ${item.time}
            </td>
            <td class="theme-table-cell">
                ${item.room}
            </td>
            <td class="theme-table-cell">
                ${item.sensor}
            </td>
            <!-- =========================
                Dust
            ========================== -->
            <td class="theme-table-cell">
                ${item.sensor.startsWith("Light")
                ? "-"
                : `${item.dust} µg/m³`
            }
            </td>
            <!-- =========================
                Dust Status
            ========================== -->
            <td class="theme-table-cell theme-table-cell-center">
                ${item.sensor.startsWith("Light")
                ? "-"
                : `
                            <div class="theme-table-badge">
                                <span class="${statusBadge(item.dustBadge)}">
                                    ${item.dustStatus}
                                </span>
                            </div>
                        `
            }
            </td>
            <!-- =========================
                Light
            ========================== -->
            <td class="theme-table-cell">
                ${item.sensor.startsWith("Dust")
                ? "-"
                : `${item.light} Lux`
            }
            </td>
            <!-- =========================
                Light Status
            ========================== -->
            <td class="theme-table-cell theme-table-cell-center">
                ${item.sensor.startsWith("Dust")
                ? "-"
                : `
                            <div class="theme-table-badge">
                                <span class="${statusBadge(item.lightBadge)}">
                                    ${item.lightStatus}
                                </span>
                            </div>
                        `
            }
            </td>
        </tr>
        `;
    });
    updatePagination();
}
/* ============================================================
    STATUS BADGE
============================================================ */
function statusBadge(type) {
    switch ((type || "").toLowerCase()) {
        case "online":
            return "theme-badge theme-badge-online";
        case "offline":
            return "theme-badge theme-badge-offline";
        case "waiting":
            return "theme-badge theme-badge-waiting";
        case "normal":
        case "success":
            return "theme-badge theme-badge-normal";
        case "warning":
            return "theme-badge theme-badge-warning";
        case "danger":
            return "theme-badge theme-badge-danger";
        case "ideal":
            return "theme-badge theme-badge-ideal";
        case "too bright":
            return "theme-badge theme-badge-too-bright";
        case "poor":
            return "theme-badge theme-badge-poor";
        default:
            return "theme-badge theme-badge-neutral";
    }
}
/* ============================================================
    PAGINATION BUTTON
============================================================ */
function setPaginationButtonState(button, disabled) {
    if (!button) return;
    button.disabled = disabled;
    button.className = "theme-button";
    if (disabled) {
        button.style.opacity = ".5";
        button.style.cursor = "not-allowed";
    } else {
        button.style.opacity = "";
        button.style.cursor = "";
    }
}
/* ============================================================
    PAGE RANGE
============================================================ */
function getVisiblePages(totalPage, currentPage) {
    if (totalPage <= 7) {
        return Array.from(
            { length: totalPage },
            (_, i) => i + 1
        );
    }
    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, "...", totalPage];
    }
    if (currentPage >= totalPage - 3) {
        return [
            1,
            "...",
            totalPage - 4,
            totalPage - 3,
            totalPage - 2,
            totalPage - 1,
            totalPage
        ];
    }
    return [
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPage
    ];
}
/* ============================================================
    CALCULATE HISTORY SUMMARY
============================================================ */
function calculateHistorySummary() {
    const summary = {
        totalRecord: filteredData.length,
        averageDust: 0,
        averageLight: 0,
        rooms: {}
    };
    if (filteredData.length === 0) {
        return summary;
    }
    let dustCount = 0;
    let lightCount = 0;
    filteredData.forEach(item => {
        const roomName = item.room;
        const dust =
            item.sensor.startsWith("Light")
                ? null
                : Number(item.dust);
        const light =
            item.sensor.startsWith("Dust")
                ? null
                : Number(item.light);
        if (!summary.rooms[roomName]) {
            summary.rooms[roomName] = {
                total: 0,
                dust: 0,
                dustCount: 0,
                light: 0,
                lightCount: 0,
                averageDust: 0,
                averageLight: 0
            };
        }
        summary.rooms[roomName].total++;
        if (!isNaN(dust)) {
            summary.averageDust += dust;
            dustCount++;
            summary.rooms[roomName].dust += dust;
            summary.rooms[roomName].dustCount++;
        }
        if (!isNaN(light)) {
            summary.averageLight += light;
            lightCount++;
            summary.rooms[roomName].light += light;
            summary.rooms[roomName].lightCount++;
        }
    });
    summary.averageDust =
        dustCount === 0
            ? 0
            : summary.averageDust / dustCount;
    summary.averageLight =
        lightCount === 0
            ? 0
            : summary.averageLight / lightCount;
    Object.values(summary.rooms).forEach(room => {
        room.averageDust =
            room.dustCount === 0
                ? 0
                : room.dust / room.dustCount;
        room.averageLight =
            room.lightCount === 0
                ? 0
                : room.light / room.lightCount;
        room.dustCondition =
            calculateCondition(
                room.averageDust,
                "dust"
            );
        room.lightCondition =
            calculateCondition(
                room.averageLight,
                "light"
            );
    });
    return summary;
}
/* ============================================================
    SUMMARY TITLE
============================================================ */
function updateHistorySummaryTitle() {
    const dustTitle =
        document.getElementById("summaryDustTitle");
    const lightTitle =
        document.getElementById("summaryLightTitle");
    if (!dustTitle || !lightTitle) return;
    const room =
        historyFilterState.room;
    const sensor =
        historyFilterState.sensor;
    // =====================================================
    // Default
    // =====================================================
    if (
        room === "Semua Ruangan" &&
        (
            sensor === "" ||
            sensor == null ||
            sensor === "Average"
        )
    ) {
        dustTitle.innerHTML =
            "Overall Dust Average";
        lightTitle.innerHTML =
            "Overall Light Average";
        return;
    }
    // =====================================================
    // Average Room
    // =====================================================
    if (
        sensor === "" ||
        sensor == null ||
        sensor === "Average"
    ) {
        dustTitle.innerHTML =
            `${room}<br>
            <span class="text-xs text-slate-400">
                Dust Average
            </span>`;
        lightTitle.innerHTML =
            `${room}<br>
            <span class="text-xs text-slate-400">
                Light Average
            </span>`;
        return;
    }
    // =====================================================
    // Dust Sensor
    // =====================================================
    if (sensor.startsWith("Dust")) {
        dustTitle.innerHTML =
            `${room}<br>
            <span class="text-xs text-slate-400">
                ${sensor}
            </span>`;
        lightTitle.innerHTML =
            `${room}<br>
            <span class="text-xs text-slate-400">
                Light Average
            </span>`;
        return;
    }
    // =====================================================
    // Light Sensor
    // =====================================================
    if (sensor.startsWith("Light")) {
        dustTitle.innerHTML =
            `${room}<br>
            <span class="text-xs text-slate-400">
                Dust Average
            </span>`;
        lightTitle.innerHTML =
            `${room}<br>
            <span class="text-xs text-slate-400">
                ${sensor}
            </span>`;
    }
}
/* ============================================================
    CALCULATE CONDITION
============================================================ */
function calculateCondition(value, type) {
    if (type === "dust") {
        const standard = CONFIG.threshold.dust.normal;
        const percentage =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(
                        (1 - value / standard) * 100
                    )
                )
            );
        if (value <= CONFIG.threshold.dust.normal) {
            return {
                status: CONFIG.status.dust.normal,
                badge: "success",
                percentage
            };
        }
        if (value <= CONFIG.threshold.dust.warning) {
            return {
                status: CONFIG.status.dust.warning,
                badge: "warning",
                percentage
            };
        }
        return {
            status: CONFIG.status.dust.danger,
            badge: "danger",
            percentage
        };
    }
    if (type === "light") {
        const minimum = CONFIG.threshold.light.minimum;
        const maximum = CONFIG.threshold.light.maximum;
        const ideal = (minimum + maximum) / 2;
        let percentage;
        if (value < minimum) {
            percentage = Math.max(
                0,
                Math.round((value / minimum) * 100)
            );
            return {
                status: CONFIG.status.light.poor,
                badge: "danger",
                percentage
            };
        }
        if (value <= maximum) {
            percentage = Math.max(
                0,
                Math.min(
                    100,
                    Math.round(
                        (
                            1 -
                            Math.abs(value - ideal) /
                            ((maximum - minimum) / 2)
                        ) * 100
                    )
                )
            );
            return {
                status: CONFIG.status.light.ideal,
                badge: "success",
                percentage
            };
        }
        percentage = 100;
        return {
            status: CONFIG.status.light.tooBright,
            badge: "warning",
            percentage
        };
    }
    return {
        status: "-",
        badge: "secondary",
        percentage: 0
    };
}
/* ============================================================
    BADGE STYLE
============================================================ */
function getConditionBadgeClass(badge) {
    switch (badge) {
        case "success":
            return "text-green-600";
        case "warning":
            return "text-yellow-600";
        case "danger":
            return "text-red-600";
        default:
            return "text-slate-500";
    }
}
function getConditionIcon(badge) {
    switch (badge) {
        case "success":
            return "🟢";
        case "warning":
            return "🟡";
        case "danger":
            return "🔴";
        default:
            return "⚪";
    }
}
/* ============================================================
    RENDER ROOM CONDITION
============================================================ */
function renderRoomCondition(containerId, rooms, type) {
    const container =
        document.getElementById(containerId);
    if (!container) return;
    const currentSensor =
        historyFilterState.sensor || "Average";
    // =====================================================
    // Hide ketika sensor tidak relevan
    // =====================================================
    if (
        (type === "dust" && currentSensor.startsWith("Light")) ||
        (type === "light" && currentSensor.startsWith("Dust"))
    ) {
        container.innerHTML = `
            <div class="text-center text-slate-400 py-3">
                -
            </div>
        `;
        return;
    }
    // =====================================================
    // Tidak ada data
    // =====================================================
    if (Object.keys(rooms).length === 0) {
        container.innerHTML = `
            <div class="text-center text-slate-400 py-3">
                Tidak ada data.
            </div>
        `;
        return;
    }
    container.innerHTML = "";
    Object.entries(rooms).forEach(([roomName, room]) => {
        const condition =
            type === "dust"
                ? room.dustCondition
                : room.lightCondition;
        container.innerHTML += `
            <div class="flex justify-between items-center">
                <span class="font-medium">
                    ${roomName}
                </span>
                <span class="font-semibold">
                    <span class="${getConditionBadgeClass(condition.badge)}">
                        ${getConditionIcon(condition.badge)}
                        ${condition.status}
                    </span>
                    <span class="text-slate-500">
                        — ${condition.percentage}%
                    </span>
                </span>
            </div>
        `;
    });
}
/* ============================================================
    UPDATE HISTORY SUMMARY
============================================================ */
function updateHistorySummary() {
    const summary = calculateHistorySummary();
    const total =
        document.getElementById("summaryTotalRecord");
    const dust =
        document.getElementById("summaryAverageDust");
    const light =
        document.getElementById("summaryAverageLight");
    const showing =
        document.getElementById("showingData");
    if (total) {
        total.textContent = summary.totalRecord;
    }
    if (showing) {
        showing.textContent = summary.totalRecord;
    }
    const currentSensor = historyFilterState.sensor || "Average";
    // =====================================================
    // Dust Summary
    // =====================================================
    if (dust) {
        if (currentSensor.startsWith("Light")) {
            dust.textContent = "-";
        } else {
            dust.textContent =
                `${summary.averageDust.toFixed(2)} µg/m³`;
        }
    }
    // =====================================================
    // Light Summary
    // =====================================================
    if (light) {
        if (currentSensor.startsWith("Dust")) {
            light.textContent = "-";
        } else {
            light.textContent =
                `${summary.averageLight.toFixed(2)} Lux`;
        }
    }
    // =====================================================
    // Room Condition
    // =====================================================
    renderRoomCondition(
        "summaryDustCondition",
        summary.rooms,
        "dust"
    );
    renderRoomCondition(
        "summaryLightCondition",
        summary.rooms,
        "light"
    );
    updateHistorySummaryTitle();
}
/* ============================================================
    PAGINATION
============================================================ */
function updatePagination() {
    const totalPage = Math.ceil(
        filteredData.length / rowsPerPage
    );
    const pageContainer = document.getElementById("pageNumbers");
    if (!pageContainer) return;
    pageContainer.innerHTML = "";
    if (totalPage === 0) {
        return;
    }
    const pages = getVisiblePages(
        totalPage,
        currentPage
    );
    pages.forEach(page => {
        // Ellipsis (...)
        if (page === "...") {
            const span = document.createElement("span");
            span.className =
                "theme-button";
            span.textContent = "...";
            pageContainer.appendChild(span);
            return;
        }
        // Tombol nomor halaman
        const button = document.createElement("button");
        button.textContent = page;
        button.className =
            page === currentPage
                ? "theme-button theme-button-primary"
                : "theme-button";
        button.addEventListener("click", () => {
            currentPage = page;
            renderHistoryTable();
        });
        pageContainer.appendChild(button);
    });
    console.log(
        "Page",
        currentPage,
        "/",
        totalPage
    );
    const previous = document.getElementById("previousPage");
    const next = document.getElementById("nextPage");
    setPaginationButtonState(
        previous,
        currentPage === 1
    );
    setPaginationButtonState(
        next,
        currentPage === totalPage
    );
}
function nextPage() {
    const total = Math.ceil(
        filteredData.length /
        rowsPerPage
    );
    if (currentPage < total) {
        currentPage++;
        renderHistoryTable();
    }
}
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderHistoryTable();
    }
}
/* ============================================================
    CSV ESCAPE
============================================================ */
function escapeCSV(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return `"${String(value).replace(/"/g, '""')}"`;
}
/* ============================================================
    CSV HEADER
============================================================ */
function getCSVHeader() {
    const currentSensor =
        historyFilterState.sensor || "Average";
    const header = [
        "No",
        "Waktu",
        "Ruangan",
        "Sensor"
    ];
    if (!currentSensor.startsWith("Light")) {
        header.push("Debu (µg/m³)");
        header.push("Dust Status");
    }
    if (!currentSensor.startsWith("Dust")) {
        header.push("Cahaya (Lux)");
        header.push("Light Status");
    }
    return header;
}
/* ============================================================
    CSV ROWS
============================================================ */
function getCSVRows() {
    const currentSensor =
        historyFilterState.sensor || "Average";
    return filteredData.map((item, index) => {
        const row = [
            index + 1,
            item.time,
            item.room,
            item.sensor
        ];
        if (!currentSensor.startsWith("Light")) {
            row.push(item.dust);
            row.push(item.dustStatus);
        }
        if (!currentSensor.startsWith("Dust")) {
            row.push(item.light);
            row.push(item.lightStatus);
        }
        return row;
    });
}
/* ============================================================
    ESCAPE CSV VALUE
============================================================ */
function escapeCSVValue(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return `"${String(value).replace(/"/g, '""')}"`;
}
/* ============================================================
    GENERATE CSV CONTENT
============================================================ */
function generateCSVContent() {
    const rows = [
        getCSVHeader(),
        ...getCSVRows()
    ];
    return rows
        .map(row =>
            row
                .map(escapeCSVValue)
                .join(",")
        )
        .join("\n");
}
/* ============================================================
    DOWNLOAD CSV FILE
============================================================ */
function downloadCSVFile() {
    console.log("DOWNLOAD BARU");
    if (filteredData.length === 0) {
        alert("Tidak ada data untuk diunduh.");
        return;
    }
    const csv = generateCSVContent();
    const blob = new Blob(
        [csv],
        {
            type: "text/csv;charset=utf-8;"
        }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date();
    const sensor =
        historyFilterState.sensor || "Average";
    const room =
        historyFilterState.room === "Semua Ruangan"
            ? "AllRoom"
            : historyFilterState.room.replaceAll(" ", "_");
    const filename =
        `${CONFIG.download.fileName.replace(".csv", "")}_${room}_${sensor}_${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}-${String(timestamp.getDate()).padStart(2, "0")}_${String(timestamp.getHours()).padStart(2, "0")}-${String(timestamp.getMinutes()).padStart(2, "0")}.csv`;
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
/* ============================================================
    PIN MODAL
============================================================ */
function openPinModal() {
    const modal = document.getElementById("pinModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    const error =
        document.getElementById("pinError");
    if (error) {
        error.textContent = "";
        error.classList.add("hidden");
    }
    document.getElementById("pinInput")?.focus();
}
/* ============================================================
    CLOSE PIN MODAL
============================================================ */
function closePinModal() {
    const modal = document.getElementById("pinModal");
    if (!modal) return;
    modal.classList.remove("flex");
    modal.classList.add("hidden");
    const input = document.getElementById("pinInput");
    if (input) {
        input.value = "";
    }
    const error =
        document.getElementById("pinError");
    if (error) {
        error.textContent = "";
        error.classList.add("hidden");
    }
}
/* ============================================================
    INITIALIZE PIN MODAL
============================================================ */
function initializePinModal() {
    const modal =
        document.getElementById("pinModal");
    const dialog =
        modal?.firstElementChild;
    if (!modal || !dialog) return;
    // ==========================================
    // CLOSE : CLICK OVERLAY
    // ==========================================
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closePinModal();
        }
    });
    // ==========================================
    // PREVENT PROPAGATION
    // ==========================================
    dialog.addEventListener("click", (event) => {
        event.stopPropagation();
    });
    // ==========================================
    // CLOSE : ESC
    // ==========================================
    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            modal.classList.contains("flex")
        ) {
            closePinModal();
        }
    });
}
/* ============================================================
    INITIALIZE PIN MODAL EVENTS
============================================================ */
function initializePinModalEvents() {
    initializePinModal();
    const cancelPin =
        document.getElementById("cancelPinButton");
    if (cancelPin) {
        cancelPin.addEventListener(
            "click",
            closePinModal
        );
    }
    const pinForm =
        document.getElementById("pinForm");
    if (pinForm) {
        pinForm.addEventListener(
            "submit",
            submitPinVerification
        );
    }
}
/* ============================================================
    VERIFY ADMIN PIN
============================================================ */
function verifyAdminPIN() {
    const input =
        document.getElementById("pinInput");
    const error =
        document.getElementById("pinError");
    if (!input) return;
    const pin = input.value.trim();
    if (pin !== CONFIG.security.adminPin) {
        if (error) {
            error.textContent = "PIN Administrator salah.";
            error.classList.remove("hidden");
        }
        input.focus();
        input.select();
        return;
    }
    if (error) {
        error.textContent = "";
        error.classList.add("hidden");
    }
    closePinModal();
    downloadCSVFile();
}
/* ============================================================
    SUBMIT PIN VERIFICATION
============================================================ */
function submitPinVerification(event) {
    event.preventDefault();
    verifyAdminPIN();
}