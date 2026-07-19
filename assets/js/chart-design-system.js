/* ==========================================================
   CHART DESIGN SYSTEM
   Version : 1.0
   Sprint  : CDS-1.1
   ========================================================== */
const ChartDesignSystem = (() => {
    "use strict";
    /* ==========================================================
       COLOR PALETTE
    ========================================================== */
    const COLORS = {
        dust: "#2563EB",
        light: "#F97316",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        axis: "#94A3B8",
        text: getComputedStyle(document.body)
            .getPropertyValue("--text-primary")
            .trim(),
        grid: "rgba(148,163,184,0.08)",
        tooltipBackground: "#FFFFFF",
        tooltipBorder: "#E2E8F0",
        crosshair: "rgba(100,116,139,0.45)"
    };
    const DATASET = {
        DASHBOARD: {
            DUST_NODE_A: COLORS.dust,
            DUST_NODE_B: "#DC2626",
            LIGHT_NODE_A: COLORS.warning,
            LIGHT_NODE_B: COLORS.success
        },
        MONITORING: {
            AVERAGE_DUST: "#F97316",
            AVERAGE_LIGHT: "#FACC15",
            TREND: "#3B82F6"
        }
    };
    /* ==========================================================
    THRESHOLD
    ========================================================== */
    const THRESHOLD = {
        DUST: {
            color: COLORS.danger,
            width: 2,
            dash: [8, 6]
        },
        LIGHT: {
            color: COLORS.warning,
            width: 2,
            dash: [8, 6]
        }
    };
    /* ==========================================================
    THRESHOLD MANAGER
    ========================================================== */
    const ThresholdManager = (() => {
        const thresholds = [];
        return {
            add(threshold) {
                if (!threshold?.id) {
                    return;
                }
                const index = thresholds.findIndex(
                    item => item.id === threshold.id
                );
                if (index >= 0) {
                    thresholds[index] = threshold;
                    return;
                }
                thresholds.push(threshold);
            },
            has(id) {
                return thresholds.some(
                    item => item.id === id
                );
            },
            get(id) {
                return thresholds.find(
                    item => item.id === id
                ) ?? null;
            },
            remove(id) {
                const index =
                    thresholds.findIndex(
                        item => item.id === id
                    );
                if (index >= 0) {
                    thresholds.splice(index, 1);
                }
            },
            clear() {
                thresholds.length = 0;
            },
            getAll() {
                return [...thresholds];
            }
        };
    })();
    /* ==========================================================
    THRESHOLD COLLECTION
    ========================================================== */
    function createThresholdCollection() {
        const thresholds = [];
        return {
            add(threshold) {
                if (!threshold?.id) {
                    return;
                }
                const index = thresholds.findIndex(
                    item => item.id === threshold.id
                );
                if (index >= 0) {
                    thresholds[index] = threshold;
                    return;
                }
                thresholds.push(threshold);
            },
            has(id) {
                return thresholds.some(
                    item => item.id === id
                );
            },
            get(id) {
                return thresholds.find(
                    item => item.id === id
                ) ?? null;
            },
            remove(id) {
                const index = thresholds.findIndex(
                    item => item.id === id
                );
                if (index >= 0) {
                    thresholds.splice(index, 1);
                }
            },
            clear() {
                thresholds.length = 0;
            },
            getAll() {
                return [...thresholds];
            }
        };
    }
    /* ==========================================================
       TYPOGRAPHY
    ========================================================== */
    const FONT = {
        family: "Inter",
        title: 14,
        label: 12,
        tick: 11
    };
    /* ==========================================================
       ANIMATION
    ========================================================== */
    const ANIMATION = {
        duration: 250,
        easing: "easeOutCubic"
    };
    const CrosshairPlugin = {
        id: "crosshair",
        afterDraw(chart, args, options) {
            if (!options?.enabled) return;
            const tooltip = chart.tooltip;
            if (!tooltip || tooltip.opacity === 0) return;
            const x = tooltip.caretX;
            if (x == null) return;
            const {
                ctx,
                chartArea
            } = chart;
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash(options.dash ?? []);
            ctx.lineWidth = options.width ?? 1;
            ctx.strokeStyle = options.color ?? COLORS.crosshair;
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();
            ctx.restore();
        }
    };
    /* ==========================================================
       DEFAULT OPTIONS
    ========================================================== */
    function createOptions({
        crosshair = false,
        zoom = false,
        ...customOptions
    } = {}) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            elements: {
                line: {
                    borderWidth: 2.5,
                    tension: 0.35
                },
                point: {
                    radius: 0,
                    hoverRadius: 5,
                    hoverBorderWidth: 2
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    align: "center",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "line",
                        color: COLORS.text,
                        font: {
                            family: FONT.family,
                            size: FONT.label,
                            weight: "500"
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: "index",
                    intersect: false,
                    backgroundColor: COLORS.tooltipBackground,
                    borderColor: COLORS.tooltipBorder,
                    borderWidth: 1,
                    titleColor: COLORS.text,
                    bodyColor: COLORS.text,
                    footerColor: COLORS.axis,
                    titleAlign: "left",
                    bodyAlign: "left",
                    footerAlign: "left",
                    titleMarginBottom: 8,
                    bodySpacing: 6,
                    padding: 14,
                    cornerRadius: 12,
                    displayColors: true,
                    usePointStyle: true,
                    boxPadding: 4,
                    titleFont: {
                        family: FONT.family,
                        size: 13,
                        weight: "600"
                    },
                    bodyFont: {
                        family: FONT.family,
                        size: 12,
                        weight: "500"
                    },
                    footerFont: {
                        family: FONT.family,
                        size: 11
                    },
                    callbacks: {
                        label(context) {
                            const dataset = context.dataset;
                            const value = Number(context.raw);
                            if (!Number.isFinite(value)) {
                                return `${dataset.label}: -`;
                            }
                            const decimals = dataset.decimals ?? 2;
                            const unit = dataset.unit ?? "";
                            return `${dataset.label}: ${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
                        }
                    }
                },
                crosshair: {
                    enabled: crosshair,
                    color: COLORS.crosshair,
                    width: 1,
                    dash: [4, 4]
                },
                zoom: zoom
                    ? {
                        limits: {
                            x: {
                                min: "original",
                                max: "original",
                                minRange: 5
                            },
                            y: {
                                min: "original",
                                max: "original"
                            }
                        },
                        pan: {
                            enabled: true,
                            mode: "x"
                        },
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            drag: {
                                enabled: true,
                                borderColor: "#2563EB",
                                borderWidth: 1,
                                backgroundColor: "rgba(37,99,235,.15)"
                            },
                            mode: "x"
                        }
                    }
                    : undefined,
            },
            scales: {
                x: {
                    grid: {
                        color: COLORS.grid,
                        drawBorder: false
                    },
                    ticks: {
                        color: COLORS.axis,
                        font: {
                            family: FONT.family,
                            size: FONT.tick
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: COLORS.grid,
                        drawBorder: false
                    },
                    ticks: {
                        color: COLORS.axis,
                        font: {
                            family: FONT.family,
                            size: FONT.tick
                        }
                    }
                }
            }
        };
        return mergeOptions(options, customOptions);
    }
    /* ==========================================================
    MERGE OPTIONS
    ========================================================== */
    function mergeOptions(baseOptions, customOptions = {}) {
        return Chart.helpers.merge({}, baseOptions, customOptions);
    }
    /* ==========================================================
       DATASET STYLE
    ========================================================== */
    function createDataset(
        label,
        color,
        metadata = {}
    ) {
        return {
            label,
            data: [],
            borderColor: color,
            backgroundColor(context) {
                return ChartDesignSystem.createGradient(
                    context,
                    color
                );
            },
            fill: true,
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHitRadius: 12,
            unit: metadata.unit ?? "",
            decimals: metadata.decimals ?? 2,
            category: metadata.category ?? "general"
        };
    }
    /* ==========================================================
    THRESHOLD DATASET
    ========================================================== */
    function createThreshold({
        id,
        label,
        value,
        style = {},
        visible = true
    }) {
        return {
            id:
                id ??
                `threshold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            label,
            value,
            style,
            visible
        };
    }
    /* ==========================================================
    THRESHOLD DATA BUILDER
    ========================================================== */
    function buildThresholdData(
        labels,
        value) {
        if (!Array.isArray(labels)) {
            return [];
        }
        return Array(labels.length).fill(
            Number(value)
        );
    }
    /* ==========================================================
    THRESHOLD RENDERER
    ========================================================== */
    function renderThresholdDataset(
        threshold,
        labels
    ) {
        return {
            label:
                threshold.label,
            data:
                buildThresholdData(
                    labels,
                    threshold.value
                ),
            borderColor:
                threshold.style.color,
            borderWidth:
                threshold.style.width,
            borderDash:
                threshold.style.dash,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            isThreshold: true
        };
    }
    /* ==========================================================
    RENDER ALL THRESHOLDS
    ========================================================== */
    function renderThresholds(
        labels = [],
        collection = null
    ) {
        const source =
            collection ??
            ThresholdManager;
        return source
            .getAll()
            .filter(threshold => threshold.visible)
            .map(threshold =>
                renderThresholdDataset(
                    threshold,
                    labels
                )
            );
    }
    /* ==========================================================
    DATASET COMPOSER
    ========================================================== */
    function composeDatasets({
        datasets = [],
        labels = [],
        includeThresholds = true,
        thresholdCollection = null
    } = {}) {
        const output = [...datasets];
        if (includeThresholds) {
            output.push(
                ...renderThresholds(
                    labels,
                    thresholdCollection
                )
            );
        }
        return output;
    }
    /* ==========================================================
    DATASET DATA HELPER
    ========================================================= */
    function setDatasetData(datasets, values) {
        datasets.forEach((dataset, index) => {
            dataset.data = values[index] ?? [];
        });
        return datasets;
    }
    /* ==========================================================
    COMPOSE CHART DATA
    ========================================================== */
    function composeChartData({
        labels = [],
        datasets = [],
        includeThresholds = true,
        thresholdCollection = null
    } = {}) {
        return {
            labels,
            datasets: composeDatasets({
                datasets,
                labels,
                includeThresholds,
                thresholdCollection
            })
        };
    }
    /* ==========================================================
    REMOVE THRESHOLD DATASET
    ========================================================== */
    function filterDatasets(datasets = []) {
        return datasets.filter(
            dataset => !dataset.isThreshold
        );
    }
    /* ==========================================================
    REGISTER THRESHOLD
    ========================================================== */
    function registerThreshold({
        id,
        label,
        value,
        style,
        visible = true
    }) {
        const threshold = createThreshold({
            id,
            label,
            value,
            style,
            visible
        });
        ThresholdManager.add(threshold);
        return threshold;
    }
    /* ==========================================================
    DASHBOARD THRESHOLD PRESET
    ========================================================== */
    function registerDashboardThresholds() {
        registerThreshold({
            id: "dashboard-dust",
            label: "Dust Limit",
            value: CONFIG.threshold.dust.normal,
            style: THRESHOLD.DUST
        });
        registerThreshold({
            id: "dashboard-light-min",
            label: "Light Minimum",
            value: CONFIG.threshold.light.minimum,
            style: THRESHOLD.LIGHT
        });
        registerThreshold({
            id: "dashboard-light-max",
            label: "Light Maximum",
            value: CONFIG.threshold.light.maximum,
            style: THRESHOLD.LIGHT
        });
    }
    /* ==========================================================
    UPDATE THRESHOLD
    ========================================================== */
    function updateThreshold(id, value) {
        const threshold = ThresholdManager.get(id);
        if (!threshold) {
            return;
        }
        threshold.value = value;
    }
    /* ==========================================================
    TOGGLE THRESHOLD
    ========================================================== */
    function toggleThreshold(
        id,
        visible
    ) {
        const threshold = ThresholdManager.get(id);
        if (!threshold) {
            return;
        }
        threshold.visible = visible;
    }
    /* ==========================================================
    GRADIENT
    ========================================================== */
    function createGradient(context, color) {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) {
            return color + "20";
        }
        const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
        );
        gradient.addColorStop(0, color + "40");
        gradient.addColorStop(0.35, color + "18");
        gradient.addColorStop(1, color + "00");
        return gradient;
    }
    /* ==========================================================
       PUBLIC
    ========================================================== */
    Chart.register(CrosshairPlugin);
    return {
        COLORS,
        DATASET,
        THRESHOLD,
        ThresholdManager,
        createThresholdCollection,
        composeDatasets,
        setDatasetData,
        composeChartData,
        filterDatasets,
        registerThreshold,
        registerDashboardThresholds,
        renderThresholds,
        updateThreshold,
        toggleThreshold,
        FONT,
        ANIMATION,
        createOptions,
        createDataset,
        createThreshold,
        buildThresholdData,
        renderThresholdDataset,
        createGradient,
        mergeOptions
    };
})();