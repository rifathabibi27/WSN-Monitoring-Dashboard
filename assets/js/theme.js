/* =====================================================
    THEME MANAGER
===================================================== */
const Theme = {
    storageKey: "theme",
    current: "light",
    icon: null,
    initialize() {
        this.icon =
            document.getElementById("themeIcon");
        this.current =
            this.load();
        this.apply(
            this.current
        );
        this.bind();
    },
    bind() {
        const button =
            document.getElementById("themeToggle");
        if (!button) return;
        button.addEventListener(
            "click",
            () => this.toggle()
        );
    },
    toggle() {
        const nextTheme =
            this.current === "light"
                ? "dark"
                : "light";
        this.apply(nextTheme);
    },
    apply(theme) {
        this.current = theme;
        document.body.classList.toggle(
            "dark",
            theme === "dark"
        );
        const textColor = getComputedStyle(document.body)
            .getPropertyValue("--text-primary")
            .trim();
        if (typeof Chart !== "undefined" && Chart.instances) {
            Object.values(Chart.instances).forEach(chart => {
                if (chart.options?.plugins?.legend?.labels) {
                    chart.options.plugins.legend.labels.color = textColor;
                }
                if (chart.options?.scales?.x?.ticks) {
                    chart.options.scales.x.ticks.color = textColor;
                }
                if (chart.options?.scales?.y?.ticks) {
                    chart.options.scales.y.ticks.color = textColor;
                }
                chart.update("none");
            });
        }
        this.updateIcon();
        this.updateLogo();
        this.save(theme);
    },
    updateIcon() {
        if (!this.icon) return;
        this.icon.className =
            this.current === "dark"
                ? "bi bi-sun-fill"
                : "bi bi-moon-stars";
    },
    updateLogo() {
        const logo =
            document.getElementById("sidebarLogoImage");
        if (!logo) return;
        logo.src =
            this.current === "dark"
                ? "assets/img/logo-light.png"
                : "assets/img/logo-dark.png";
    },
    save(theme) {
        localStorage.setItem(
            this.storageKey,
            theme
        );
    },
    load() {
        return (
            localStorage.getItem(this.storageKey)
            || "light"
        );
    },
    isDark() {
        return this.current === "dark";
    }
};
