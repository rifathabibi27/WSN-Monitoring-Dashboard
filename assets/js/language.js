/* =====================================================
   LANGUAGE SYSTEM
   Foundation
===================================================== */
const Language = {
    current: "id",
    defaultLanguage: "id",
    storageKey: "language",
    dictionaries: {},
    initialize() {
        this.loadSavedLanguage();
        this.initializeSelector();
        this.apply();
    },
    initializeSelector() {
        const select = document.getElementById("languageSelect");
        if (!select) return;
        select.value = this.current;
        select.addEventListener("change", (event) => {
            this.change(event.target.value);
            setTimeout(() => event.target.blur(), 0);
        });
    },
    loadSavedLanguage() {
        const saved = localStorage.getItem(this.storageKey);
        if (!saved) {
            this.current = this.defaultLanguage;
            return;
        }
        this.current = saved;
    },
    saveLanguage() {
        localStorage.setItem(
            this.storageKey,
            this.current
        );
    },
    change(language) {
        if (!this.dictionaries[language]) {
            console.warn("Unknown language :", language);
            return;
        }
        this.current = language;
        this.saveLanguage();
        this.apply();
        /* ==========================
           GLOBAL UI REFRESH
        ========================== */
        if (typeof updateClock === "function") {
            updateClock();
        }
        if (typeof updateSensorFilterDropdown === "function") {
            const currentRoom =
                document.getElementById("roomFilter")?.value || "all";
            updateSensorFilterDropdown(currentRoom);
        }
        if (Dashboard?.initialized) {
            if (typeof refreshDashboard === "function") {
                refreshDashboard();
            }
            if (typeof refreshDashboardTrendLanguage === "function") {
                refreshDashboardTrendLanguage();
            }
            if (typeof refreshMonitoringLanguage === "function") {
                refreshMonitoringLanguage();
            }
        }
    },
    apply() {
        this.translateText();
        this.translatePlaceholder();
        this.translateTitle();
        this.translateValue();
    },
    get(key) {
        const dictionary = this.dictionaries[this.current];
        if (!dictionary) return key;
        return dictionary[key] ?? key;
    },
    format(key, ...values) {
        let text = this.get(key);
        values.forEach((value, index) => {
            text = text.replace(`{${index}}`, value);
        });
        return text;
    },
    replace(text, values = {}) {
        Object.entries(values).forEach(([key, value]) => {
            text = text.replaceAll(`{${key}}`, value);
        });
        return text;
    },
    translateText() {
        document
            .querySelectorAll("[data-i18n]")
            .forEach(element => {
                const key = element.dataset.i18n;
                element.textContent = this.get(key);
            });
    },
    translatePlaceholder() {
        document
            .querySelectorAll("[data-i18n-placeholder]")
            .forEach(element => {
                const key = element.dataset.i18nPlaceholder;
                element.placeholder = this.get(key);
            });
    },
    translateTitle() {
        document
            .querySelectorAll("[data-i18n-title]")
            .forEach(element => {
                const key = element.dataset.i18nTitle;
                element.title = this.get(key);
            });
    },
    translateValue() {
        document
            .querySelectorAll("[data-i18n-value]")
            .forEach(element => {
                const key = element.dataset.i18nValue;
                element.value = this.get(key);
            });
    }
};
/* =====================================================
   DICTIONARY
===================================================== */
Language.dictionaries = {
    id: {
        /* =====================================================
          SIDEBAR
        ===================================================== */
        "sidebar.dashboard": "Dashboard",
        "sidebar.monitoring": "Monitoring",
        "sidebar.history": "History Data",
        "sidebar.about": "About",
        "room.nodeA": "LAB. KIK JTE",
        "room.nodeB": "Kontainer",
        "monitoring.nodeA": "LAB. KIK JTE",
        "monitoring.nodeB": "Kontainer",
        /* =====================================================
          HEADER
        ===================================================== */
        "header.title": "Monitoring Debu dan Cahaya",
        "header.subtitle": "Wireless Sensor Network Dashboard",
        "notification.title": "Notifikasi Sistem",
        "notification.subtitle": "Tidak ada notifikasi baru",
        "notification.markRead": "Tandai sudah dibaca",
        "notification.today": "Today",
        "notification.yesterday": "Yesterday",
        "notification.viewAll": "Lihat Semua Notifikasi",
        "language.label": "Bahasa",
        "language.id": "Indonesia",
        "language.en": "English",
        "dashboard.heroTitle": "Dashboard Monitoring Debu & Cahaya",
        "dashboard.heroDescription": "Sistem Monitoring Debu dan Intensitas Cahaya berbasis Wireless Sensor Network menggunakan ESP32, ESP-NOW, Firebase Realtime Database dan Website Dashboard secara realtime.",
        "dashboard.heroButton": "Lihat Monitoring",
        "dashboard.summary.totalSensor": "Total Sensor",
        "dashboard.summary.totalSensorCaption": "10 Debu • 10 Cahaya",
        "dashboard.summary.nodeOnline": "Node Online",
        "dashboard.summary.lastSync": "Sinkronisasi Terakhir",
        "dashboard.summary.avgDust": "Rata-rata Debu",
        "dashboard.summary.avgDustCaption": "Rata-rata dari 10 Sensor Debu",
        "dashboard.summary.avgLight": "Rata-rata Cahaya",
        "dashboard.summary.avgLightCaption": "Rata-rata dari 10 Sensor Cahaya",
        "dashboard.trend.title": "Tren Sistem",
        "dashboard.trend.subtitle": "Tren realtime debu dan cahaya dari kedua node monitoring.",
        "dashboard.trend.live": "LIVE",
        "dashboard.trend.latest10": "10 Data Terbaru",
        "dashboard.trend.latest20": "20 Data Terbaru",
        "dashboard.trend.latest50": "50 Data Terbaru",
        "dashboard.trend.zoom": "Zoom",
        "dashboard.trend.reset": "Reset Tampilan",
        "dashboard.node.title": "Node Monitoring",
        "dashboard.node.subtitle": "Kondisi terkini setiap node monitoring.",
        "dashboard.node.dust": "Debu",
        "dashboard.node.light": "Cahaya",
        "dashboard.node.lastUpdate": "Pembaruan Terakhir",
        "dashboard.node.button": "Lihat Monitoring",
        "dashboard.footer.copyright": "© 2026 Monitoring Debu & Cahaya WSN",
        "dashboard.footer.version": "Versi 1.0.0 Stable",
        "monitoring.header.nodeStatus": "Status Node",
        "monitoring.header.lastUpdate": "Pembaruan Terakhir",
        "monitoring.summary.averageDust": "Rata-rata Debu",
        "monitoring.summary.averageLight": "Rata-rata Cahaya",
        "monitoring.summary.dustSensor": "Sensor Debu",
        "monitoring.summary.lightSensor": "Sensor Cahaya",
        "monitoring.chart.title": "Monitoring Realtime",
        "monitoring.chart.subtitle": "Riwayat Rata-rata Debu & Cahaya",
        "monitoring.chart.dust": "Debu",
        "monitoring.chart.light": "Cahaya",
        "monitoring.chart.latest10": "10 Data Terbaru",
        "monitoring.chart.latest20": "20 Data Terbaru",
        "monitoring.chart.latest50": "50 Data Terbaru",
        "monitoring.chart.zoom": "Zoom",
        "monitoring.chart.reset": "Reset Tampilan",
        "monitoring.analysis.title": "Analisis Tren",
        "monitoring.analysis.subtitle": "Analisis tren berdasarkan rata-rata maupun masing-masing sensor.",
        "monitoring.analysis.chartSource": "Sumber Grafik",
        "monitoring.analysis.sensor": "Sensor",
        "monitoring.analysis.chartTitle": "Grafik Analisis Tren",
        "monitoring.analysis.latest10": "10 Data Terbaru",
        "monitoring.analysis.latest20": "20 Data Terbaru",
        "monitoring.analysis.latest50": "50 Data Terbaru",
        "monitoring.analysis.zoom": "Zoom",
        "monitoring.analysis.reset": "Reset Tampilan",
        "monitoring.section.dust": "Sensor Debu",
        "monitoring.section.light": "Sensor Cahaya",
        "monitoring.section.realtime": "Data Realtime",
        "monitoring.footer.copyright": "© 2026 Monitoring Debu & Cahaya WSN",
        "monitoring.footer.version": "Versi 1.0.0 Stable",
        "history.title": "History Data",
        "history.subtitle": "Riwayat seluruh data monitoring yang tersimpan pada database.",
        "history.download": "Download CSV",
        "history.search": "Cari data...",
        "history.filter.timeRange": "Rentang Waktu",
        "history.filter.room": "Ruangan",
        "history.filter.sensor": "Sensor",
        "history.time.24h": "24 Jam Terakhir",
        "history.time.30m": "30 Menit Terakhir",
        "history.time.1h": "1 Jam Terakhir",
        "history.time.6h": "6 Jam Terakhir",
        "history.time.12h": "12 Jam Terakhir",
        "history.time.7d": "7 Hari Terakhir",
        "history.time.30d": "30 Hari Terakhir",
        "history.time.manual": "Rentang Manual",
        "history.room.all": "Semua Ruangan",
        "history.room.nodeA": "LAB. KIK JTE",
        "history.room.nodeB": "Kontainer",
        "history.sensor.selectRoom": "Pilih ruangan terlebih dahulu",
        "history.sensor.average": "Rata-rata",
        "history.reset": "Reset",
        "history.summary.totalRecords": "Total Data Records",
        "history.summary.overallDust": "Rata-rata Debu Keseluruhan",
        "history.summary.overallLight": "Rata-rata Cahaya Keseluruhan",
        "history.summary.dustStatusRoom": "Status Debu per Ruangan",
        "history.summary.lightStatusRoom": "Status Cahaya per Ruangan",
        "history.table.no": "No",
        "history.table.time": "Waktu",
        "history.table.room": "Ruangan",
        "history.table.sensor": "Sensor",
        "history.table.dust": "Debu",
        "history.table.dustStatus": "Status Debu",
        "history.table.light": "Cahaya",
        "history.table.lightStatus": "Status Cahaya",
        "history.pagination.showing": "Menampilkan",
        "history.pagination.data": "data",
        "history.pagination.previous": "Sebelumnya",
        "history.pagination.next": "Berikutnya",
        "history.footer.copyright": "© 2026 Monitoring Debu & Cahaya WSN",
        "history.footer.version": "Versi 1.0.0 Stable",
        "about.hero.badge": "Wireless Sensor Network",
        "about.hero.title": "Monitoring Debu & Cahaya",
        "about.hero.description": "Website monitoring realtime berbasis Wireless Sensor Network (WSN) menggunakan komunikasi ESP-NOW, HTTP, serta Firebase Realtime Database untuk memantau kualitas udara dan intensitas cahaya secara realtime.",
        "about.system.title": "Tentang Sistem",
        "about.system.subtitle": "Ringkasan penelitian",
        "about.system.background.title": "Latar Belakang",
        "about.system.background.description": "Sistem ini dikembangkan untuk melakukan monitoring konsentrasi debu PM2.5 dan intensitas cahaya pada beberapa ruangan menggunakan konsep Wireless Sensor Network sehingga kondisi lingkungan dapat dipantau secara realtime.",
        "about.system.objective.title": "Tujuan",
        "about.system.objective.description": "Menghasilkan sistem monitoring berbasis ESP32 yang mampu mengirimkan data sensor secara realtime menuju website melalui Gateway dan Firebase Realtime Database.",
        "about.system.benefit.title": "Manfaat",
        "about.system.benefit.description": "Membantu proses monitoring kondisi lingkungan laboratorium dan kontainer secara realtime sehingga data dapat digunakan sebagai dasar pengambilan keputusan.",
        "about.architecture.title": "Arsitektur Komunikasi",
        "about.architecture.subtitle": "Alur komunikasi data pada sistem",
        "about.architecture.sensorNode": "Sensor Node",
        "about.architecture.sensorNodeDescription": "Node A & Node B",
        "about.architecture.gateway": "Gateway",
        "about.architecture.gatewayDescription": "ESP32 Main Node",
        "about.architecture.database": "Firebase",
        "about.architecture.databaseDescription": "Realtime Database",
        "about.architecture.description": "ESP-NOW digunakan sebagai media komunikasi antara Sensor Node dan Gateway karena memiliki latensi rendah dan tidak memerlukan akses internet. Selanjutnya Gateway mengirimkan data menuju Firebase Realtime Database menggunakan protokol HTTP, kemudian website melakukan sinkronisasi data secara realtime melalui Firebase Listener.",
        "about.tech.title": "Technology Stack",
        "about.tech.subtitle": "Perangkat lunak yang digunakan pada website monitoring.",
        "about.tech.html.description": "Struktur website dan markup semantik.",
        "about.tech.tailwind.description": "Framework antarmuka pengguna yang responsif.",
        "about.tech.javascript.description": "Logika aplikasi frontend.",
        "about.tech.chart.description": "Visualisasi data secara realtime.",
        "about.tech.firebase.description": "Database cloud realtime.",
        "about.tech.bootstrap.description": "Library ikon yang konsisten.",
        "about.hardware.title": "Hardware yang Digunakan",
        "about.hardware.esp32.description": "Mikrokontroler utama untuk Sensor Node dan Gateway.",
        "about.hardware.gp2y.description": "Sensor optik konsentrasi debu (PM2.5).",
        "about.hardware.bh1750.description": "Sensor digital intensitas cahaya lingkungan.",
        "about.hardware.ads1115.description": "Konverter analog ke digital (ADC) 16-bit.",
        "about.hardware.pca9548a.description": "Multiplekser I²C 8 kanal untuk beberapa sensor.",
        "about.hardware.router.description": "Access point jaringan nirkabel untuk konektivitas gateway.",
        "about.specification.title": "Spesifikasi Proyek",
        "about.specification.topology.title": "Topologi",
        "about.specification.topology.value": "Wireless Sensor Network (WSN)",
        "about.specification.nodeCommunication.title": "Komunikasi Node",
        "about.specification.nodeCommunication.value": "ESP-NOW",
        "about.specification.gatewayCommunication.title": "Komunikasi Gateway",
        "about.specification.gatewayCommunication.value": "HTTP",
        "about.specification.database.title": "Database",
        "about.specification.database.value": "Firebase Realtime Database",
        "about.specification.interval.title": "Interval Monitoring",
        "about.specification.interval.value": "Setiap 10 Detik",
        "about.specification.totalNode.title": "Jumlah Node",
        "about.specification.totalNode.value": "2 Sensor Node + 1 Gateway Node",
        "about.specification.dustSensor.title": "Sensor Debu",
        "about.specification.dustSensor.value": "10 × GP2Y1010AU0F",
        "about.specification.lightSensor.title": "Sensor Cahaya",
        "about.specification.lightSensor.value": "10 × BH1750",
        "about.research.title": "Informasi Penelitian",
        "about.research.subtitle": "Informasi Penelitian & Detail Akademik",
        "about.research.author": "Penulis",
        "about.research.researchTitle": "Judul Penelitian",
        "about.research.academicYear": "Tahun Akademik",
        "about.research.institution": "Universitas",
        "about.research.researchTitleValue": "Pemantauan Debu dan Cahaya Berbasis Wireless Sensor Network (WSN) Multi Ruangan di Fakultas Teknik Universitas Sultan Ageng Tirtayasa",
        "about.research.supervisors": "Dosen Pembimbing",
        "about.research.academicAdvisor": "Dosen Pembimbing Akademik",
        "about.research.supervisor1": "Dosen Pembimbing Skripsi I",
        "about.research.supervisor2": "Dosen Pembimbing Skripsi II",
        "about.research.examiners": "Dosen Penguji",
        "about.research.examiner1": "Dosen Penguji I",
        "about.research.examiner2": "Dosen Penguji II",
        "about.research.examinerPending": "Akan diperbarui setelah sidang skripsi.",
        "about.research.University": "Universitas Sultan Ageng Tirtayasa",
        "about.research.Faculty": "Fakultas Teknik",
        "about.research.studyProgram": "Program Studi Teknik Elektro",
        "about.research.concentration": "Instrumentasi dan Kendali",
        "about.footer.madeWith": "Dibuat dengan ❤",
        "about.footer.copyright": "© 2026",
        "about.footer.rights": "Seluruh hak cipta dilindungi.",
        "about.footer.university": "Universitas Sultan Ageng Tirtayasa",
        "dashboard.dynamic.status.normal": "NORMAL",
        "dashboard.dynamic.status.abnormal": "TIDAK NORMAL",
        "dashboard.dynamic.chart.dustNodeA": "Debu Node A",
        "dashboard.dynamic.chart.dustNodeB": "Debu Node B",
        "dashboard.dynamic.chart.lightNodeA": "Cahaya Node A",
        "dashboard.dynamic.chart.lightNodeB": "Cahaya Node B",
        "dashboard.dynamic.trend.live": "LIVE",
        "dashboard.dynamic.trend.explore": "EKSPLOR",
        "dashboard.activity.justNow": "Baru saja",
        "dashboard.activity.secondsAgo": "{0} detik yang lalu",
        "dashboard.activity.minutesAgo": "{0} menit yang lalu",
        "activity.empty.title": "Belum ada event sistem",
        "activity.empty.description": "Event penting akan muncul ketika sistem mendeteksi perubahan kondisi.",
        "activity.justNow": "Baru saja",
        "activity.secondsAgo": "{0} detik yang lalu",
        "activity.minutesAgo": "{0} menit yang lalu",
        "activity.hoursAgo": "{0} jam yang lalu",
        "activity.daysAgo": "{0} hari yang lalu",
        "notification.today": "Hari Ini",
        "notification.yesterday": "Kemarin",
        "notification.viewAll": "Lihat Semua Notifikasi",
        "notification.showLess": "Tampilkan Lebih Sedikit",
        "notification.justNow": "Baru saja",
        "notification.minutesAgo": "{0} menit lalu",
        "notification.hoursAgo": "{0} jam lalu",
        "notification.daysAgo": "{0} hari lalu",
        "notification.at": "pukul",
        "activity.dust.high.title": "Debu {room} tinggi",
        "activity.dust.normal.title": "Debu {room} normal",
        "activity.dust.high.description": "{value} µg/m³ • Ambang {threshold} µg/m³",
        "activity.dust.normal.description": "{value} µg/m³ • Kondisi aman",
        "activity.light.low.title": "Cahaya {room} rendah",
        "activity.light.high.title": "Cahaya {room} tinggi",
        "activity.light.normal.title": "Cahaya {room} normal",
        "activity.light.low.description": "Standar {minimum}–{maximum} Lux",
        "activity.light.high.description": "Standar {minimum}–{maximum} Lux",
        "activity.light.normal.description": "{value} Lux • Kondisi ideal",
        "activity.communication.online.title": "{room} kembali terhubung",
        "activity.communication.waiting.title": "{room} menunggu data",
        "activity.communication.offline.title": "{room} terputus",
        "activity.communication.online.description": "Node kembali mengirim data ke Gateway.",
        "activity.communication.waiting.description": "Belum menerima data baru dari node.",
        "activity.communication.offline.description": "Komunikasi node ke Gateway terputus.",
        "monitoring.sensor.dust": "Sensor Debu {index}",
        "monitoring.sensor.light": "Sensor Cahaya {index}",
        "monitoring.sensor.notRequired": "Sensor tidak diperlukan",
        "monitoring.room.subtitle": "{dust} Sensor Debu • {light} Sensor Cahaya",
        "monitoring.trend.subtitle.averageDust":
            "Rata-rata historis konsentrasi debu untuk ruangan yang dipilih.",
        "monitoring.trend.subtitle.averageLight":
            "Rata-rata historis intensitas cahaya untuk ruangan yang dipilih.",
        "monitoring.trend.subtitle.dust":
            "Konsentrasi debu historis dari Sensor Debu {sensor}.",
        "monitoring.trend.subtitle.light":
            "Intensitas cahaya historis dari Sensor Cahaya {sensor}.",
        "monitoring.trend.subtitle.default":
            "Tren historis berdasarkan sumber yang dipilih.",
        "monitoring.trend.averageDust": "Rata-rata Debu",
        "monitoring.trend.averageLight": "Rata-rata Cahaya",
        "monitoring.trend.dust": "Sensor Debu {sensor}",
        "monitoring.trend.light": "Sensor Cahaya {sensor}",
        "monitoring.sensor.prefix.dust": "Sensor Debu",
        "monitoring.sensor.prefix.light": "Sensor Cahaya",
        "monitoring.trend.chart": "Tren",
        "monitoring.trend.dustOnly": "Sensor Debu",
        "monitoring.trend.lightOnly": "Sensor Cahaya",
    },
    en: {
        /* =====================================================
          SIDEBAR
        ===================================================== */
        "sidebar.dashboard": "Dashboard",
        "sidebar.monitoring": "Monitoring",
        "sidebar.history": "History",
        "sidebar.about": "About",
        "room.nodeA": "KIK JTE Laboratory",
        "room.nodeB": "Container",
        "monitoring.nodeA": "KIK JTE Laboratory",
        "monitoring.nodeB": "Container",
        /* =====================================================
          HEADER
        ===================================================== */
        "header.title": "Dust and Light Monitoring",
        "header.subtitle": "Wireless Sensor Network Dashboard",
        "notification.title": "System Notification",
        "notification.subtitle": "No new notifications",
        "notification.markRead": "Mark all as read",
        "notification.today": "Today",
        "notification.yesterday": "Yesterday",
        "notification.viewAll": "View All Notifications",
        "language.label": "Language",
        "language.id": "Indonesia",
        "language.en": "English",
        "dashboard.heroTitle": "Dust & Light Monitoring Dashboard",
        "dashboard.heroDescription": "Dust and light intensity monitoring system based on a Wireless Sensor Network using ESP32, ESP-NOW, Firebase Realtime Database, and a real-time web dashboard.",
        "dashboard.heroButton": "View Monitoring",
        "dashboard.summary.totalSensor": "Total Sensors",
        "dashboard.summary.totalSensorCaption": "10 Dust • 10 Light",
        "dashboard.summary.nodeOnline": "Online Nodes",
        "dashboard.summary.lastSync": "Last Sync",
        "dashboard.summary.avgDust": "Average Dust",
        "dashboard.summary.avgDustCaption": "Average of 10 Dust Sensors",
        "dashboard.summary.avgLight": "Average Light",
        "dashboard.summary.avgLightCaption": "Average of 10 Light Sensors",
        "dashboard.trend.title": "System Trend",
        "dashboard.trend.subtitle": "Real-time dust and light trends from both monitoring nodes.",
        "dashboard.trend.live": "LIVE",
        "dashboard.trend.latest10": "Latest 10 Data",
        "dashboard.trend.latest20": "Latest 20 Data",
        "dashboard.trend.latest50": "Latest 50 Data",
        "dashboard.trend.zoom": "Zoom",
        "dashboard.trend.reset": "Reset View",
        "dashboard.node.title": "Monitoring Nodes",
        "dashboard.node.subtitle": "Current condition of each monitoring node.",
        "dashboard.node.dust": "Dust",
        "dashboard.node.light": "Light",
        "dashboard.node.lastUpdate": "Last Update",
        "dashboard.node.button": "View Monitoring",
        "dashboard.footer.copyright": "© 2026 Dust & Light Monitoring WSN",
        "dashboard.footer.version": "Version 1.0.0 Stable",
        "monitoring.header.nodeStatus": "Node Status",
        "monitoring.header.lastUpdate": "Last Update",
        "monitoring.summary.averageDust": "Average Dust",
        "monitoring.summary.averageLight": "Average Light",
        "monitoring.summary.dustSensor": "Dust Sensor",
        "monitoring.summary.lightSensor": "Light Sensor",
        "monitoring.chart.title": "Realtime Monitoring",
        "monitoring.chart.subtitle": "Average Dust & Light History",
        "monitoring.chart.dust": "Dust",
        "monitoring.chart.light": "Light",
        "monitoring.chart.latest10": "Latest 10 Data",
        "monitoring.chart.latest20": "Latest 20 Data",
        "monitoring.chart.latest50": "Latest 50 Data",
        "monitoring.chart.zoom": "Zoom",
        "monitoring.chart.reset": "Reset View",
        "monitoring.analysis.title": "Trend Analysis",
        "monitoring.analysis.subtitle": "Trend analysis based on averages or individual sensors.",
        "monitoring.analysis.chartSource": "Chart Source",
        "monitoring.analysis.sensor": "Sensor",
        "monitoring.analysis.chartTitle": "Trend Analysis Chart",
        "monitoring.analysis.latest10": "Latest 10 Data",
        "monitoring.analysis.latest20": "Latest 20 Data",
        "monitoring.analysis.latest50": "Latest 50 Data",
        "monitoring.analysis.zoom": "Zoom",
        "monitoring.analysis.reset": "Reset View",
        "monitoring.section.dust": "Dust Sensor",
        "monitoring.section.light": "Light Sensor",
        "monitoring.section.realtime": "Realtime Data",
        "monitoring.footer.copyright": "© 2026 Dust & Light Monitoring WSN",
        "monitoring.footer.version": "Version 1.0.0 Stable",
        "history.title": "History Data",
        "history.subtitle": "History of all monitoring data stored in the database.",
        "history.download": "Download CSV",
        "history.search": "Search data...",
        "history.filter.timeRange": "Time Range",
        "history.filter.room": "Room",
        "history.filter.sensor": "Sensor",
        "history.time.24h": "Last 24 Hours",
        "history.time.30m": "Last 30 Minutes",
        "history.time.1h": "Last 1 Hour",
        "history.time.6h": "Last 6 Hours",
        "history.time.12h": "Last 12 Hours",
        "history.time.7d": "Last 7 Days",
        "history.time.30d": "Last 30 Days",
        "history.time.manual": "Manual Range",
        "history.room.all": "All Rooms",
        "history.room.nodeA": "KIK JTE Laboratory",
        "history.room.nodeB": "Container",
        "history.sensor.selectRoom": "Select a room first",
        "history.reset": "Reset",
        "history.summary.totalRecords": "Total Data Records",
        "history.summary.overallDust": "Overall Dust Average",
        "history.summary.overallLight": "Overall Light Average",
        "history.summary.dustStatusRoom": "Dust Status by Room",
        "history.summary.lightStatusRoom": "Light Status by Room",
        "history.table.no": "No",
        "history.table.time": "Time",
        "history.table.room": "Room",
        "history.table.sensor": "Sensor",
        "history.table.dust": "Dust",
        "history.table.dustStatus": "Dust Status",
        "history.table.light": "Light",
        "history.table.lightStatus": "Light Status",
        "history.pagination.showing": "Showing",
        "history.pagination.data": "data",
        "history.pagination.previous": "Previous",
        "history.pagination.next": "Next",
        "history.footer.copyright": "© 2026 Dust & Light Monitoring WSN",
        "history.footer.version": "Version 1.0.0 Stable",
        "about.hero.badge": "Wireless Sensor Network",
        "about.hero.title": "Dust & Light Monitoring",
        "about.hero.description": "A real-time monitoring website based on a Wireless Sensor Network (WSN), utilizing ESP-NOW, HTTP, and Firebase Realtime Database to monitor air quality and light intensity in real time.",
        "about.system.title": "About the System",
        "about.system.subtitle": "Research overview",
        "about.system.background.title": "Background",
        "about.system.background.description": "This system was developed to monitor PM2.5 dust concentration and light intensity across multiple rooms using the Wireless Sensor Network concept, enabling real-time environmental monitoring.",
        "about.system.objective.title": "Objective",
        "about.system.objective.description": "To develop an ESP32-based monitoring system capable of transmitting sensor data in real time to the website through the Gateway and Firebase Realtime Database.",
        "about.system.benefit.title": "Benefits",
        "about.system.benefit.description": "Supports real-time monitoring of laboratory and container environments, providing reliable data for analysis and decision-making.",
        "about.architecture.title": "Communication Architecture",
        "about.architecture.subtitle": "System data communication flow",
        "about.architecture.sensorNode": "Sensor Node",
        "about.architecture.sensorNodeDescription": "Node A & Node B",
        "about.architecture.gateway": "Gateway",
        "about.architecture.gatewayDescription": "ESP32 Main Node",
        "about.architecture.database": "Firebase",
        "about.architecture.databaseDescription": "Realtime Database",
        "about.architecture.description": "ESP-NOW is used as the communication medium between the Sensor Nodes and the Gateway because it provides low latency and does not require internet access. The Gateway then sends the data to Firebase Realtime Database using the HTTP protocol, while the website synchronizes the data in real time through Firebase Listeners.",
        "about.tech.title": "Technology Stack",
        "about.tech.subtitle": "Software used in the monitoring website.",
        "about.tech.html.description": "Website structure and semantic markup.",
        "about.tech.tailwind.description": "Responsive user interface framework.",
        "about.tech.javascript.description": "Frontend application logic.",
        "about.tech.chart.description": "Real-time data visualization.",
        "about.tech.firebase.description": "Cloud real-time database.",
        "about.tech.bootstrap.description": "Consistent icon library.",
        "about.hardware.title": "Hardware Used",
        "about.hardware.esp32.description": "Main microcontroller for Sensor Node and Gateway.",
        "about.hardware.gp2y.description": "Optical dust concentration sensor (PM2.5).",
        "about.hardware.bh1750.description": "Digital ambient light intensity sensor.",
        "about.hardware.ads1115.description": "16-bit analog-to-digital converter (ADC).",
        "about.hardware.pca9548a.description": "8-channel I²C multiplexer for multiple sensors.",
        "about.hardware.router.description": "Wireless network access point for gateway connectivity.",
        "about.specification.title": "Project Specification",
        "about.specification.topology.title": "Topology",
        "about.specification.topology.value": "Wireless Sensor Network (WSN)",
        "about.specification.nodeCommunication.title": "Node Communication",
        "about.specification.nodeCommunication.value": "ESP-NOW",
        "about.specification.gatewayCommunication.title": "Gateway Communication",
        "about.specification.gatewayCommunication.value": "HTTP",
        "about.specification.database.title": "Database",
        "about.specification.database.value": "Firebase Realtime Database",
        "about.specification.interval.title": "Monitoring Interval",
        "about.specification.interval.value": "Every 10 Seconds",
        "about.specification.totalNode.title": "Total Nodes",
        "about.specification.totalNode.value": "2 Sensor Nodes + 1 Gateway Node",
        "about.specification.dustSensor.title": "Dust Sensor",
        "about.specification.dustSensor.value": "10 × GP2Y1010AU0F",
        "about.specification.lightSensor.title": "Light Sensor",
        "about.specification.lightSensor.value": "10 × BH1750",
        "about.research.title": "Research Information",
        "about.research.subtitle": "Research Information & Academic Details",
        "about.research.author": "Author",
        "about.research.researchTitle": "Research Title",
        "about.research.academicYear": "Academic Year",
        "about.research.institution": "Institution",
        "about.research.researchTitleValue": "Multi-Room Dust and Light Monitoring Based on a Wireless Sensor Network (WSN) at the Faculty of Engineering, Universitas Sultan Ageng Tirtayasa",
        "about.research.supervisors": "Supervisors",
        "about.research.academicAdvisor": "Academic Advisor",
        "about.research.supervisor1": "Thesis Supervisor I",
        "about.research.supervisor2": "Thesis Supervisor II",
        "about.research.examiners": "Examiners",
        "about.research.examiner1": "Examiner I",
        "about.research.examiner2": "Examiner II",
        "about.research.examinerPending": "To be updated after thesis defense.",
        "about.research.University": "University of Sultan Ageng Tirtayasa",
        "about.research.Faculty": "Engineering",
        "about.research.studyProgram": "Electrical Engineering",
        "about.research.concentration": "Instrumentation and Control",
        "about.footer.madeWith": "Made with ❤",
        "about.footer.copyright": "© 2026",
        "about.footer.rights": "All rights reserved.",
        "dashboard.dynamic.status.normal": "NORMAL",
        "dashboard.dynamic.status.abnormal": "ABNORMAL",
        "dashboard.dynamic.chart.dustNodeA": "Dust Node A",
        "dashboard.dynamic.chart.dustNodeB": "Dust Node B",
        "dashboard.dynamic.chart.lightNodeA": "Light Node A",
        "dashboard.dynamic.chart.lightNodeB": "Light Node B",
        "dashboard.dynamic.trend.live": "LIVE",
        "dashboard.dynamic.trend.explore": "EXPLORE",
        "dashboard.activity.justNow": "Just now",
        "dashboard.activity.secondsAgo": "{0} seconds ago",
        "dashboard.activity.minutesAgo": "{0} minutes ago",
        "activity.empty.title": "No system events",
        "activity.empty.description": "Important events will appear when the system detects condition changes.",
        "activity.justNow": "Just now",
        "activity.secondsAgo": "{0} seconds ago",
        "activity.minutesAgo": "{0} minutes ago",
        "activity.hoursAgo": "{0} hours ago",
        "activity.daysAgo": "{0} days ago",
        "notification.today": "Today",
        "notification.yesterday": "Yesterday",
        "notification.viewAll": "View All Notifications",
        "notification.showLess": "Show Less",
        "notification.justNow": "Just now",
        "notification.minutesAgo": "{0} minutes ago",
        "notification.hoursAgo": "{0} hours ago",
        "notification.daysAgo": "{0} days ago",
        "notification.at": "at",
        "activity.dust.high.title": "High dust at {room}",
        "activity.dust.normal.title": "Normal dust at {room}",
        "activity.dust.high.description": "{value} µg/m³ • Threshold {threshold} µg/m³",
        "activity.dust.normal.description": "{value} µg/m³ • Safe condition",
        "activity.light.low.title": "Low light at {room}",
        "activity.light.high.title": "High light at {room}",
        "activity.light.normal.title": "Normal light at {room}",
        "activity.light.low.description": "Standard {minimum}–{maximum} Lux",
        "activity.light.high.description": "Standard {minimum}–{maximum} Lux",
        "activity.light.normal.description": "{value} Lux • Ideal condition",
        "activity.communication.online.title": "{room} reconnected",
        "activity.communication.waiting.title": "{room} waiting for data",
        "activity.communication.offline.title": "{room} disconnected",
        "activity.communication.online.description": "The node has resumed sending data to the Gateway.",
        "activity.communication.waiting.description": "No new data has been received from the node yet.",
        "activity.communication.offline.description": "Communication between the node and the Gateway has been lost.",
        "monitoring.sensor.dust": "Dust Sensor {index}",
        "monitoring.sensor.light": "Light Sensor {index}",
        "monitoring.sensor.notRequired": "Sensor not required",
        "monitoring.room.subtitle": "{dust} Dust Sensors • {light} Light Sensors",
        "monitoring.trend.subtitle.averageDust":
            "Historical average dust concentration for the selected room.",
        "monitoring.trend.subtitle.averageLight":
            "Historical average light intensity for the selected room.",
        "monitoring.trend.subtitle.dust":
            "Historical dust concentration from Dust Sensor {sensor}.",
        "monitoring.trend.subtitle.light":
            "Historical light intensity from Light Sensor {sensor}.",
        "monitoring.trend.subtitle.default":
            "Historical trend based on selected source.",
        "monitoring.trend.averageDust": "Average Dust",
        "monitoring.trend.averageLight": "Average Light",
        "monitoring.trend.dust": "Dust Sensor {sensor}",
        "monitoring.trend.light": "Light Sensor {sensor}",
        "monitoring.sensor.prefix.dust": "Dust Sensor",
        "monitoring.sensor.prefix.light": "Light Sensor",
        "monitoring.trend.chart": "Trend",
        "monitoring.trend.dustOnly": "Dust Sensor",
        "monitoring.trend.lightOnly": "Light Sensor",
        "history.sensor.average": "Average",
    }
};
window.Language = Language;