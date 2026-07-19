const CONFIG = {
    //    PROJECT
    project: {
        title: "Wireless Sensor Network",
        subtitle: "Dust & Light Monitoring System",
        version: "2.0.0",
        developer: "Rifat Habibi",
        organization: "Universitas Sultan Ageng Tirtayasa"
    },
    //    REFRESH
    refresh: {
        dashboard: 1000,
        chart: 1000,
        history: 3000,
        status: 5000
    },
    //    CHART
    chart: {
        maxPoints: 50,
        historyLimit: 100,
        animation: false,
        tension: 0.35,
        borderWidth: 2
    },
    dashboard: {
        trendMaxPoints: 20
    },
    //    STANDARD
    threshold: {
        dust: {
            normal: 55,
            warning: 75
        },
        light: {
            minimum: 250,
            maximum: 350,
        }
    },
    communication: {
        online: 15000,
        waiting: 30000
    },
    status: {
        system: {
            waiting: "Waiting",
            online: "Online",
            offline: "Offline"
        },
        dust: {
            normal: "Normal",
            warning: "Warning",
            danger: "Danger"
        },
        light: {
            ideal: "Ideal",
            poor: "Poor",
            tooBright: "Too Bright"
        }
    },
    security: {
        adminPin: "271002"
    },
    //    NODE
    rooms: [
        {
            id: "nodeA",
            short: "Node A",
            dustSensors: 6,
            lightSensors: 6,
            color: "#2563EB"
        },
        {
            id: "nodeB",
            short: "Node B",
            dustSensors: 4,
            lightSensors: 4,
            color: "#16A34A"
        }
    ],
    //    SENSOR
    sensor: {
        dustUnit: "µg/m³",
        lightUnit: "Lux",
        dustName: "GP2Y1010AU0F",
        lightName: "BH1750"
    },
    //    HISTORY
    history: {
        maxData: 500,
        rowPerPage: 20
    },
    //    DOWNLOAD
    download: {
        fileName: "WSN_History.csv",
        requirePIN: true
    },
    //    LANGUAGE
    language: {
        default: "id"
    }
};