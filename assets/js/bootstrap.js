/*
=====================================================
APPLICATION BOOTSTRAP MANAGER
=====================================================
*/
const Bootstrap = {
  /* ============================================
       CONFIGURATION
    ============================================ */
  initialized: false,
  modules: {},
  progress: 0,
  loader: {
    element: null,
    status: null,
    progressBar: null,
    progressText: null,
    finished: false,
  },
  /* ============================================
   MODULE CONSTANTS
   ============================================ */
  Module: Object.freeze({
    THEME: "theme",
    LANGUAGE: "language",
    FIREBASE: "firebase",
    DASHBOARD: "dashboard",
    MONITORING: "monitoring",
    HISTORY: "history",
  }),
  /* ============================================
   STAGE CONSTANTS
   ============================================ */
  Stage: Object.freeze({
    INITIALIZE: "initialize",
    UI: "ui",
    DASHBOARD: "dashboard",
    HISTORY: "history",
    FIREBASE: "firebase",
    READY: "ready",
  }),
  /* ============================================
   APPLICATION STAGE
   ============================================ */
  stage: "initialize",
  /* ============================================
       INITIALIZE
    ============================================ */
  initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.loader.element = document.getElementById("appLoader");
    this.loader.status = document.getElementById("loadingStatus");
    this.loader.progressBar = document.getElementById("loadingProgressBar");
    this.loader.progressText = document.getElementById("loadingPercent");
    console.log("==========================================");
    console.log("[BOOTSTRAP] Application Bootstrap");
    console.log("[BOOTSTRAP] Ready");
    console.log("==========================================");
  },
  /* ============================================
       REGISTER MODULE
    ============================================ */
  register(name) {
    if (!name) {
      return;
    }
    if (this.modules[name]) {
      return;
    }
    this.modules[name] = {
      ready: false,
      timestamp: null,
    };
    console.log(`[BOOTSTRAP] Register : ${name}`);
  },
  /* ============================================
       MARK READY
    ============================================ */
  markReady(name) {
    const module = this.modules[name];
    if (!module) {
      console.warn(`[BOOTSTRAP] Unknown Module : ${name}`);
      return;
    }
    if (module.ready) {
      return;
    }
    module.ready = true;
    module.timestamp = Date.now();
    console.log(`[BOOTSTRAP] ${name} READY`);
    this.updateProgress();
  },
  /* ============================================
       UPDATE PROGRESS
    ============================================ */
  updateProgress() {
    const list = Object.values(this.modules);
    if (!list.length) {
      this.progress = 100;
      this.finish();
      return;
    }
    const ready = list.filter((module) => module.ready).length;
    this.progress = Math.round((ready / list.length) * 100);
    console.log(`[BOOTSTRAP] Progress : ${this.progress}%`);
    this.updateLoaderProgress();
    if (this.progress >= 100) {
      this.finish();
    }
  },
  /* ============================================
       UPDATE LOADER
    ============================================ */
  updateLoader() {
    if (!this.loader.status) {
      return;
    }
    const stageKey = `bootstrap.stage.${this.stage}`;
    this.loader.status.textContent = Language.get(stageKey);
  },
  updateLoaderProgress() {
    if (this.loader.progressBar) {
      this.loader.progressBar.style.width = `${this.progress}%`;
    }
    if (this.loader.progressText) {
      this.loader.progressText.textContent = `${this.progress}%`;
    }
  },
  /* ============================================
   UPDATE STAGE
   ============================================ */
  setStage(stage) {
    if (this.stage === stage) {
      return;
    }
    this.stage = stage;
    console.log(`[BOOTSTRAP] Stage : ${stage}`);
    this.updateLoader(); // ← Tambahkan
  },
  /* ============================================
       IS READY
    ============================================ */
  isReady() {
    return this.progress >= 100;
  },
  getStage() {
    return this.stage;
  },
  finish() {
    if (this.loader.finished) {
      return;
    }
    this.loader.finished = true;
    this.setStage(this.Stage.READY);
    if (this.loader.status) {
      this.loader.status.textContent = Language.get("bootstrap.stage.ready");
    }
    console.log("[BOOTSTRAP] Application Ready");
    if (!this.loader.element) {
      return;
    }
    /*
     * Beri waktu agar user sempat membaca
     * "Application Ready"
     */
    setTimeout(() => {
      this.loader.element.classList.add("hide");
      /*
       * Tunggu animasi fade selesai
       */
      setTimeout(() => {
        this.loader.element.remove();
      }, 350);
    }, 450);
  },
  /* ============================================
       RESET
    ============================================ */
  reset() {
    this.modules = {};
    this.progress = 0;
    this.stage = this.Stage.INITIALIZE;
    this.loader.finished = false;
    this.loader.element = null;
    this.loader.status = null;
  },
};
