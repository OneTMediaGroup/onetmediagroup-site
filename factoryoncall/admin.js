// -------------------------------------------------------------
// FACTORY ON CALL — ADMIN PANEL
// Full Admin: Stations + Call Buttons + Roles + Users
// -------------------------------------------------------------

const COMPANY_STORAGE_KEY = "factory_on_call_active_company_id";

function getCompanyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("companyId") || params.get("company") || "";
}

function getActiveCompanyId() {
  const urlCompanyId = getCompanyIdFromUrl();

  if (urlCompanyId) {
    localStorage.setItem(COMPANY_STORAGE_KEY, urlCompanyId);
    return urlCompanyId;
  }

  return localStorage.getItem(COMPANY_STORAGE_KEY) || "demo-company";
}

const COMPANY_ID = getActiveCompanyId();
let COMPANY_NAME = "Factory On Call";
let COMPANY_MODE = "production";
let ADMIN_LOCKED = false;

(function applySavedThemeEarly(){
  try {
    const savedTheme = (localStorage.getItem("factory_on_call_theme") || "dark").toLowerCase();
    const theme = (savedTheme === "light" || savedTheme === "bright" || savedTheme === "neutral") ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("theme-light", theme === "light");
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    if (document.body) {
      document.body.dataset.theme = theme;
      document.body.classList.toggle("theme-light", theme === "light");
      document.body.classList.toggle("theme-dark", theme === "dark");
    }
  } catch (_) {}
})();

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


(async function () {
  // ---------- LOAD FIREBASE COMPAT IF NEEDED ----------
  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => {
        s.dataset.loaded = "true";
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  if (!window.firebase) {
    await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
    await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js");
  }

  // ---------- FIREBASE INIT ----------
  const firebaseConfig = {
    apiKey: "AIzaSyD5n-Ykf5LoYE_2u0pbRKfektav75GZIZE",
    authDomain: "factoryoncall.firebaseapp.com",
    projectId: "factoryoncall",
    storageBucket: "factoryoncall.firebasestorage.app",
    messagingSenderId: "586355508568",
    appId: "1:586355508568:web:40c4803ef1fd749811512d"
  };

  const app = firebase.apps.length
    ? firebase.app()
    : firebase.initializeApp(firebaseConfig);

  const db = app.firestore();

  const companyRef = db.collection("companies").doc(COMPANY_ID);
  const areasRef = companyRef.collection("areas");
  const stationsRef = companyRef.collection("stations");
  const rolesRef = companyRef.collection("roles");
  const usersRef = companyRef.collection("users");
  const authorizedPinsRef = companyRef.collection("authorized_pins");
  const callsRef = companyRef.collection("calls");
  const activityRef = companyRef.collection("activity");

  if ("scrollRestoration" in history) {
    try { history.scrollRestoration = "manual"; } catch (_) {}
  }

  window.addEventListener("pageshow", () => {
    setTimeout(() => {
      const main = document.querySelector(".main");
      const activeTab = document.querySelector(".tab.active");
      try { window.scrollTo(0, 0); } catch (_) {}
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      if (main) main.scrollTop = 0;
      if (activeTab) activeTab.scrollTop = 0;
    }, 0);
  });

  // ---------- CONNECTION STATUS ----------
  const connDot = document.getElementById("firebaseStatusDot");
  const connLabel = document.getElementById("firebaseStatusText");

  function setConn(ok) {
    if (connDot) connDot.style.background = ok ? "#22c55e" : "#ef4444";
    if (connLabel) connLabel.textContent = ok ? "Online" : "Offline";
  }

  // ---------- SIDEBAR / TABS ----------
  const navItems = document.querySelectorAll(".nav-item[data-tab]");
  const tabs = document.querySelectorAll(".tab");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");

  function tabTitle(tabName) {
    const map = {
      dashboard: "Dashboard",
      logs: "Call Logs",
      areas: "Areas",
      users: "Users",
      stations: "Stations",
      roles: "Roles",
      branding: "Branding",
      settings: "Plant Access",
      analytics: "Analytics"
    };
    return map[tabName] || tabName;
  }

  function tabSubtitle(tabName) {
    const map = {
      dashboard: "Live overview of your factory call system.",
      logs: "Review and export call history.",
      areas: "Create and manage plant areas used to organize stations and calls.",
      users: "Manage users and login credentials.",
      stations: "Manage factory call stations.",
      roles: "Manage roles and permissions.",
      branding: "Customize plant name, logo, and theme.",
      settings: "Copy plant code and live screen links.",
      analytics: "Analyze performance and usage trends."
    };
    return map[tabName] || "";
  }



  function resetAdminScrollToTop() {
    const activeTab = document.querySelector('.tab.active');
    const main = document.querySelector('.main');
    const scrollers = [
      window,
      document.documentElement,
      document.body,
      main,
      activeTab
    ];

    requestAnimationFrame(() => {
      scrollers.forEach(el => {
        if (!el) return;
        try {
          if (el === window) {
            el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          } else {
            el.scrollTop = 0;
            el.scrollLeft = 0;
          }
        } catch (_) {}
      });
    });

    setTimeout(() => {
      scrollers.forEach(el => {
        if (!el) return;
        try {
          if (el === window) {
            el.scrollTo(0, 0);
          } else {
            el.scrollTop = 0;
            el.scrollLeft = 0;
          }
        } catch (_) {}
      });
    }, 60);
  }

  function activateTab(tabName) {
    tabs.forEach(tab => tab.classList.remove("active"));
    navItems.forEach(btn => btn.classList.remove("active"));

    const tab = document.getElementById(`tab-${tabName}`);
    const btn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);

    if (tab) tab.classList.add("active");
    if (btn) btn.classList.add("active");
    if (pageTitle) pageTitle.textContent = tabTitle(tabName);
    if (pageSubtitle) pageSubtitle.textContent = tabSubtitle(tabName);
    resetAdminScrollToTop();
    setTimeout(() => forceAdminThemePaint(cachedBranding?.theme || localStorage.getItem("factory_on_call_theme") || "dark"), 0);
  }

  function initTabs() {
    navItems.forEach(btn => {
      btn.addEventListener("click", () => {
        const tabName = btn.dataset.tab;
        if (tabName) activateTab(tabName);
      });
    });

    activateTab("dashboard");
  }

  // ---------- HELPERS ----------
  function buildCallUrl(stationName, cells, areaName = "") {
    const base = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "call.html")}`;
    const params = new URLSearchParams({
      companyId: COMPANY_ID,
      station: stationName || "",
      cells: Array.isArray(cells) ? cells.join(",") : "",
      area: areaName || ""
    });
    return `${base}?${params.toString()}`;
  }

  function buildScreenUrl(pageName) {
    const base = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, pageName)}`;
    const params = new URLSearchParams({
      companyId: COMPANY_ID
    });
    return `${base}?${params.toString()}`;
  }


  function renderPlantAccessLinks() {
    if (accessPlantIdText) accessPlantIdText.textContent = COMPANY_ID || "";
    document.querySelectorAll("[data-link-code]").forEach(code => {
      const page = code.dataset.linkCode;
      code.textContent = buildScreenUrl(page);
    });
  }

  function initSidebarLinks() {
    const viewerLink = document.getElementById("sidebarViewerLink");
    const supervisorLink = document.getElementById("sidebarSupervisorLink");
    const displayLink = document.getElementById("sidebarDisplayLink");

    if (viewerLink) viewerLink.href = buildScreenUrl("viewer.html");
    if (supervisorLink) supervisorLink.href = buildScreenUrl("supervisor.html");
    if (displayLink) displayLink.href = buildScreenUrl("display.html");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied.");
    } catch (err) {
      console.error(err);
      alert("Could not copy.");
    }
  }

  // ---------- DOM ----------
  const areasTableBody = document.getElementById("areasTableBody");
  const areaSearch = document.getElementById("areaSearch");
  const areaForm = document.getElementById("areaForm");
  const areaId = document.getElementById("areaId");
  const areaName = document.getElementById("areaName");
  const areaDescription = document.getElementById("areaDescription");
  const areaActive = document.getElementById("areaActive");
  const areaFormTitle = document.getElementById("areaFormTitle");
  const areaFormReset = document.getElementById("areaFormReset");

  const stationsTableBody = document.getElementById("stationsTableBody");
  const stationSearch = document.getElementById("stationSearch");
  const stationForm = document.getElementById("stationForm");
  const stationId = document.getElementById("stationId");
  const stationName = document.getElementById("stationName");
  const stationArea = document.getElementById("stationArea");
  const stationDescription = document.getElementById("stationDescription");
  const stationCells = document.getElementById("stationCells");
  const stationActive = document.getElementById("stationActive");
  const stationFormTitle = document.getElementById("stationFormTitle");
  const stationFormReset = document.getElementById("stationFormReset");
  const stationCsvImport = document.getElementById("stationCsvImport");
  const btnImportStationsCsv = document.getElementById("btnImportStationsCsv");
  const btnExportStationsCsv = document.getElementById("btnExportStationsCsv");
  const btnDownloadStationsTemplate = document.getElementById("btnDownloadStationsTemplate");

  const cbStation = document.getElementById("cbStation");
  const cbCells = document.getElementById("cbCells");
  const cbDepartment = document.getElementById("cbDepartment");
  const cbOutput = document.getElementById("cbOutput");
  const btnGenerateDynamic = document.getElementById("btnGenerateDynamic");
  const btnCopyOutput = document.getElementById("btnCopyOutput");

  const cbAutoStation = document.getElementById("cbAutoStation");
  const cbAutoOutput = document.getElementById("cbAutoOutput");
  const btnGenerateAllDynamic = document.getElementById("btnGenerateAllDynamic");

  const rolesTableBody = document.getElementById("rolesTableBody");
  const roleSearch = document.getElementById("roleSearch");
  const roleForm = document.getElementById("roleForm");
  const roleId = document.getElementById("roleId");
  const roleName = document.getElementById("roleName");
  const roleFormTitle = document.getElementById("roleFormTitle");
  const roleFormReset = document.getElementById("roleFormReset");

  const usersTableBody = document.getElementById("usersTableBody");
  const userSearch = document.getElementById("userSearch");
  const userForm = document.getElementById("userForm");
  const userId = document.getElementById("userId");
  const userFirstName = document.getElementById("userFirstName");
  const userLastName = document.getElementById("userLastName");
  const userDept = document.getElementById("userDept");
  const userRole = document.getElementById("userRole");
  const userUID = document.getElementById("userUID");
  const userBadgeCode = document.getElementById("userBadgeCode");
  const userPin = document.getElementById("userPin");
  const userActive = document.getElementById("userActive");
  const userStatus = document.getElementById("userStatus");
  const userRoleFilter = document.getElementById("userRoleFilter");
  const userSelectAll = document.getElementById("userSelectAll");
  const userCsvImport = document.getElementById("userCsvImport");
  const btnImportUsersCsv = document.getElementById("btnImportUsersCsv");
  const btnExportUsersCsv = document.getElementById("btnExportUsersCsv");
  const btnDownloadUsersTemplate = document.getElementById("btnDownloadUsersTemplate");
  const btnPrintSelectedBadges = document.getElementById("btnPrintSelectedBadges");
  const btnPrintAllBadges = document.getElementById("btnPrintAllBadges");
  const userFormTitle = document.getElementById("userFormTitle");
  const userFormReset = document.getElementById("userFormReset");

  const statTotalCalls = document.getElementById("statTotalCalls");
  const statActiveCalls = document.getElementById("statActiveCalls");
  const statClosedCalls = document.getElementById("statClosedCalls");
  const dashQuickList = document.getElementById("dashQuickList");
  const statStations = document.getElementById("statStations");
  const statPersonnel = document.getElementById("statPersonnel");
  const statUsers = document.getElementById("statUsers");
  const dashboardPriorityCall = document.getElementById("dashboardPriorityCall");
  const recentActivity = document.getElementById("recentActivity");

  const logsTableBody = document.getElementById("logsTableBody");
  const logsSearch = document.getElementById("logsSearch");
  const logsDateFrom = document.getElementById("logsDateFrom");
  const logsDateTo = document.getElementById("logsDateTo");
  const logsFilterBtn = document.getElementById("logsFilterBtn");
  const logsClearBtn = document.getElementById("logsClearBtn");
  const exportLogsBtn = document.getElementById("exportLogsBtn");
  const purgeLogsBtn = document.getElementById("purgeLogsBtn");

  const analyticsExportBtn = document.getElementById("analyticsExportBtn");
  const analyticsDateRange = document.getElementById("analyticsDateRange");
  const analyticsCustomRange = document.getElementById("analyticsCustomRange");
  const analyticsStartDate = document.getElementById("analyticsStartDate");
  const analyticsEndDate = document.getElementById("analyticsEndDate");
  const analyticsApplyRangeBtn = document.getElementById("analyticsApplyRangeBtn");
  const analyticsTotalCalls = document.getElementById("analyticsTotalCalls");
  const analyticsAvgWait = document.getElementById("analyticsAvgWait");
  const analyticsAvgResolution = document.getElementById("analyticsAvgResolution");
  const analyticsPeakHour = document.getElementById("analyticsPeakHour");
  const analyticsStationList = document.getElementById("analyticsStationList");
  const analyticsAreaList = document.getElementById("analyticsAreaList");
  const analyticsRoleList = document.getElementById("analyticsRoleList");
  const analyticsUserList = document.getElementById("analyticsUserList");
  const analyticsDayList = document.getElementById("analyticsDayList");
  const analyticsHourList = document.getElementById("analyticsHourList");
  const analyticsSlaList = document.getElementById("analyticsSlaList");
  const analyticsRepeatStationList = document.getElementById("analyticsRepeatStationList");
  const analyticsLongestWaitList = document.getElementById("analyticsLongestWaitList");
  const analyticsLongestResolutionList = document.getElementById("analyticsLongestResolutionList");

  const permissionCheckboxes = document.querySelectorAll("input[data-permission]");


  const brandingForm = document.getElementById("brandingForm");
  const brandCompanyName = document.getElementById("brandCompanyName");
  const brandLogo = document.getElementById("brandLogo");
  const brandTheme = document.getElementById("brandTheme");
  const brandingResetBtn = document.getElementById("brandingResetBtn");
  const brandPreviewLogo = document.getElementById("brandPreviewLogo");
  const brandPreviewCompany = document.getElementById("brandPreviewCompany");
  const accessPlantIdText = document.getElementById("accessPlantIdText");
  const copyPlantCodeBtn = document.getElementById("copyPlantCodeBtn");
  const emergencySettingsForm = document.getElementById("emergencySettingsForm");
  const emergencyEnabled = document.getElementById("emergencyEnabled");
  const emergencySoundEnabled = document.getElementById("emergencySoundEnabled");
  const emergencyMessage = document.getElementById("emergencyMessage");
  const clearEmergencyBtn = document.getElementById("clearEmergencyBtn");
  const emergencyStatusText = document.getElementById("emergencyStatusText");

  const emergencyRef = companyRef.collection("settings").doc("emergency");

  let cachedBranding = {};

  let cachedAreas = [];
  let cachedStations = [];
  let cachedRoles = [];
  let cachedUsers = [];
  let userRowsFromUsers = [];
  let userRowsFromPins = [];
  let cachedCalls = [];
  let filteredLogCalls = [];

  function splitName(fullName = "") {
    const cleaned = String(fullName || "").trim();
    if (!cleaned) return { firstName: "", lastName: "" };

    const parts = cleaned.split(/\s+/);
    return {
      firstName: parts.shift() || "",
      lastName: parts.join(" ")
    };
  }

  function normalizeUser(row) {
    const u = row.data || {};
    const split = splitName(u.name || u.fullName || "");
    const uid = String(u.uid || u.userId || u.employeeNumber || u.employeeId || row.id || "").trim();
    const badgeCode = String(u.badgeCode || u.badge || uid || "").trim();
    const archived = u.archived === true || String(u.status || "").toLowerCase() === "archived" || u.active === false;

    return {
      ...u,
      firstName: u.firstName || split.firstName || "",
      lastName: u.lastName || split.lastName || "",
      uid,
      employeeNumber: uid,
      badgeCode,
      email: "",
      dept: "",
      role: u.role || "",
      pin: u.pin || reverseId(uid),
      status: archived ? "archived" : "active",
      archived,
      active: !archived
    };
  }

  function mergeUserSources() {
    const byUid = new Map();

    [...userRowsFromPins, ...userRowsFromUsers].forEach(row => {
      const normalized = normalizeUser(row);
      const key = String(normalized.uid || row.id || "").trim().toLowerCase();
      if (!key) return;
      byUid.set(key, {
        id: row.id,
        data: normalized
      });
    });

    cachedUsers = Array.from(byUid.values()).sort((a, b) => {
      const aStatus = a.data.active ? 0 : 1;
      const bStatus = b.data.active ? 0 : 1;
      if (aStatus !== bStatus) return aStatus - bStatus;
      return fullUserName(a.data).localeCompare(fullUserName(b.data));
    });

    renderUsers(cachedUsers);
    if (statUsers) statUsers.textContent = String(cachedUsers.filter(x => x.data.active !== false).length);
  }

  function normalizeRows(rows) {
    return rows.map(row => ({
      ...row,
      data: normalizeUser(row)
    }));
  }

  function makeSafeId(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || String(Date.now());
  }

  function normalizeTheme(theme = "dark") {
    const value = String(theme || "dark").toLowerCase();
    if (value === "bright" || value === "neutral") return "light";
    if (["dark", "light"].includes(value)) return value;
    return "dark";
  }

  function themeColors(theme = "dark") {
    const normalizedTheme = normalizeTheme(theme);
    const map = {
      dark: {
        bg: "#020617",
        panel: "#020617",
        card: "#0f172a",
        border: "#1f2937",
        text: "#e5e7eb",
        muted: "#9ca3af",
        accent: "#00b4ff"
      },
      light: {
        bg: "#eef2f7",
        panel: "#ffffff",
        card: "#ffffff",
        border: "#d7dee8",
        text: "#111827",
        muted: "#6b7280",
        accent: "#0ea5e9"
      }
    };
    return map[normalizedTheme] || map.dark;
  }

  function applyTheme(theme = "dark") {
    const normalizedTheme = normalizeTheme(theme);
    const colors = themeColors(normalizedTheme);
    const root = document.documentElement;
    root.dataset.theme = normalizedTheme;
    root.classList.toggle("theme-light", normalizedTheme === "light");
    root.classList.toggle("theme-dark", normalizedTheme === "dark");
    if (document.body) {
      document.body.dataset.theme = normalizedTheme;
      document.body.classList.toggle("theme-light", normalizedTheme === "light");
      document.body.classList.toggle("theme-dark", normalizedTheme === "dark");
    }
    root.style.setProperty("--bg-main", colors.bg);
    root.style.setProperty("--bg-panel", colors.panel);
    root.style.setProperty("--bg-card", colors.card);
    root.style.setProperty("--border-soft", colors.border);
    root.style.setProperty("--text-main", colors.text);
    root.style.setProperty("--text-muted", colors.muted);
    root.style.setProperty("--text-strong", colors.text);
    root.style.setProperty("--accent", colors.accent);
    setTimeout(() => forceAdminThemePaint(normalizedTheme), 0);
  }



  function forceAdminThemePaint(theme = "dark") {
    const normalizedTheme = normalizeTheme(theme);
    const light = normalizedTheme === "light";
    const root = document.documentElement;
    root.dataset.theme = normalizedTheme;
    root.classList.toggle("theme-light", light);
    root.classList.toggle("theme-dark", !light);
    if (document.body) {
      document.body.dataset.theme = normalizedTheme;
      document.body.classList.toggle("theme-light", light);
      document.body.classList.toggle("theme-dark", !light);
    }

    // Admin has older hard-coded radial backgrounds in many blocks. Inline this
    // final paint pass so the selected mode wins immediately without a browser hard reset.
    const paint = (selector, styles) => {
      document.querySelectorAll(selector).forEach(el => Object.assign(el.style, styles));
    };

    if (light) {
      paint("body, #app-root, .main, .main .tab", {
        background: "#eef2f7",
        backgroundImage: "none",
        color: "#111827",
        opacity: "1"
      });
      paint(".sidebar, .topbar", {
        background: "#ffffff",
        backgroundImage: "none",
        color: "#111827",
        borderColor: "#d8e0ea",
        boxShadow: "0 8px 24px rgba(15,23,42,.07)",
        opacity: "1"
      });
      paint(".card, .table-wrapper, .dashboard-table, .branding-card-single, .users-card, .user-form-card, .access-row, .access-link-row, .analytics-card, .snapshot-item, .modal", {
        background: "#ffffff",
        backgroundImage: "none",
        color: "#111827",
        borderColor: "#d8e0ea",
        boxShadow: "0 14px 32px rgba(15,23,42,.08)",
        opacity: "1"
      });
      paint("input, select, textarea, input[type='search']", {
        background: "#ffffff",
        backgroundImage: "none",
        color: "#0f172a",
        borderColor: "#cbd5e1",
        opacity: "1"
      });
      paint("h1, h2, h3, h4, label, strong, .brand-title, .page-title, .card-header h2, .stat-big, .dashboard-cell, .station-cell, .personnel-cell, .snapshot-value", {
        color: "#0f172a",
        opacity: "1"
      });
      paint("p, .muted, .brand-subtitle, .sidebar-section-label, .topbar-left p, .admin-user-display, .admin-footer-brand, .form-help, .activity-meta", {
        color: "#586579",
        opacity: "1"
      });
      paint("table, thead, tbody, tr, td, th, .dashboard-table-head, .dashboard-table-row", {
        color: "#111827",
        borderColor: "#e2e8f0",
        opacity: "1"
      });
    } else {
      paint("body, #app-root, .main, .main .tab", {
        background: "#020617",
        backgroundImage: "radial-gradient(circle at top, #0f172a 0, #020617 60%)",
        color: "#e5e7eb",
        opacity: "1"
      });
      paint(".sidebar, .topbar", {
        background: "#020617",
        backgroundImage: "none",
        color: "#e5e7eb",
        borderColor: "#1f2937",
        opacity: "1"
      });
      paint(".card, .table-wrapper, .dashboard-table, .branding-card-single, .users-card, .user-form-card, .access-row, .access-link-row, .analytics-card, .snapshot-item, .modal", {
        background: "#071121",
        backgroundImage: "none",
        color: "#e5e7eb",
        borderColor: "#263449",
        opacity: "1"
      });
      paint("input, select, textarea, input[type='search']", {
        background: "#050b18",
        backgroundImage: "none",
        color: "#e5e7eb",
        borderColor: "#263449",
        opacity: "1"
      });
      paint("h1, h2, h3, h4, label, strong, .brand-title, .page-title, .card-header h2, .stat-big, .dashboard-cell, .station-cell, .personnel-cell, .snapshot-value", {
        color: "#f9fafb",
        opacity: "1"
      });
      paint("p, .muted, .brand-subtitle, .sidebar-section-label, .topbar-left p, .admin-user-display, .admin-footer-brand, .form-help, .activity-meta", {
        color: "#9ca3af",
        opacity: "1"
      });
    }
  }

  function logoSrc() {
    return cachedBranding.logoDataUrl || cachedBranding.logoUrl || "";
  }

  function updateBrandingUI() {
    if (brandCompanyName) brandCompanyName.value = (cachedBranding.companyName ?? COMPANY_NAME ?? "");
    if (brandTheme) brandTheme.value = normalizeTheme(cachedBranding.theme || "dark");
    if (brandPreviewCompany) brandPreviewCompany.textContent = (cachedBranding.companyName ?? COMPANY_NAME ?? "");
    if (brandPreviewLogo) { const s = logoSrc(); brandPreviewLogo.src = s; brandPreviewLogo.style.display = s ? "block" : "none"; }
    const topLogo = document.getElementById("companyLogoImg");
    if (topLogo) { const s=logoSrc(); topLogo.src=s; topLogo.style.display=(cachedBranding.logoDataUrl||cachedBranding.logoUrl)?"block":"none"; }
    renderPlantAccessLinks();
    const title = document.querySelector(".brand-title");
    if (title) title.textContent = "Factory On Call";
  }

  function resizeLogoToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read logo file."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not load logo image."));
        img.onload = () => {
          const maxW = 420;
          const maxH = 160;
          const scale = Math.min(1, maxW / img.width, maxH / img.height);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  
  const removeLogoBtn = document.getElementById("removeLogoBtn");
  if (removeLogoBtn) {
    removeLogoBtn.addEventListener("click", async () => {
      if (!confirm("Remove company logo and return to text branding?")) return;
      try {
        cachedBranding.logoDataUrl = "";
        cachedBranding.logoUrl = "";
        cachedBranding.logoRemoved = true;
        localStorage.removeItem("factory_on_call_logo");
        if (brandLogo) brandLogo.value = "";

        const payload = {
          companyName: brandCompanyName ? brandCompanyName.value.trim() : (COMPANY_NAME || ""),
          theme: normalizeTheme(brandTheme?.value || cachedBranding.theme || "dark"),
          logoDataUrl: "",
          logoUrl: "",
          logoRemovedAt: Date.now(),
          updatedAt: Date.now()
        };

        await companyRef.collection("branding").doc("main").set(payload, { merge: true });
        cachedBranding = { ...cachedBranding, ...payload };
        updateBrandingUI();
        applyTheme(payload.theme);
        forceAdminThemePaint(payload.theme);
        alert("Logo removed and saved. Branding will update on all screens.");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Could not remove logo.");
      }
    });
  }

async function loadCompanyBranding() {
    try {
      const rootSnap = await companyRef.get();
      const rootData = rootSnap.exists ? rootSnap.data() || {} : {};

      let branding = {};
      try {
        const brandingSnap = await companyRef.collection("branding").doc("main").get();
        branding = brandingSnap.exists ? brandingSnap.data() || {} : {};
      } catch (innerError) {
        console.warn("Branding document unavailable:", innerError);
      }

      cachedBranding = {
        theme: "dark",
        ...branding
      };

      COMPANY_MODE = rootData.mode || "production";
      ADMIN_LOCKED = rootData.adminLocked === true || rootData.isDemo === true || COMPANY_MODE === "demo";

      COMPANY_NAME =
        (cachedBranding.companyName !== undefined ? cachedBranding.companyName :
        (rootData.companyName !== undefined ? rootData.companyName :
        (localStorage.getItem("factory_on_call_company_name") || "")));

      cachedBranding.companyName = COMPANY_NAME;
      localStorage.setItem("factory_on_call_company_name", COMPANY_NAME);
      localStorage.setItem("factory_on_call_theme", normalizeTheme(cachedBranding.theme || "dark"));
      if (cachedBranding.logoDataUrl || cachedBranding.logoUrl) {
        localStorage.setItem("factory_on_call_logo", logoSrc());
      } else {
        localStorage.removeItem("factory_on_call_logo");
      }
      applyTheme(cachedBranding.theme || "dark");
      updateBrandingUI();
    } catch (error) {
      console.warn("Could not load company branding:", error);
      applyTheme("dark");
    }
  }



  function blockDemoAdminAction(actionName = "This setup change") {
    if (!ADMIN_LOCKED) return false;
    alert(`${actionName} is locked in Demo Company mode.\n\nDemo companies are for testing call flow only. Create a Production Company to manage stations, users, roles, and branding.`);
    return true;
  }

  function renderDemoNoticeIfNeeded() {
    if (!ADMIN_LOCKED) return;
    const main = document.querySelector(".main") || document.body;
    if (!main || document.getElementById("demoRestrictionNotice")) return;

    const notice = document.createElement("div");
    notice.id = "demoRestrictionNotice";
    notice.style.cssText = "margin:16px 24px;padding:14px 16px;border-radius:16px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-weight:800;";
    notice.innerHTML = `Demo Company Mode: call testing is enabled, but Admin setup changes are locked. <a href="onboarding.html" style="color:#1d4ed8;">Create a Production Company</a> to build a real system.`;
    main.insertBefore(notice, main.firstChild);
  }



  // ---------- AREAS ----------
  function areaNameFromId(areaIdValue = "") {
    const found = cachedAreas.find(x => x.id === areaIdValue);
    return found ? (found.data.name || areaIdValue) : areaIdValue;
  }

  function getStationCountForArea(areaName = "") {
    const normalizedArea = String(areaName || "").trim().toLowerCase();

    if (!normalizedArea) return 0;

    return cachedStations.filter(row => {
      const stationArea = String(row.data?.area || "").trim().toLowerCase();
      return stationArea === normalizedArea;
    }).length;
  }

  function sortAreasByName(rows = []) {
    return rows.slice().sort((a, b) =>
      String(a.data?.name || a.id || "").localeCompare(String(b.data?.name || b.id || ""))
    );
  }

  function populateAreaOptions() {
    const selects = [stationArea, userDept].filter(Boolean);
    selects.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = "";

      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "None";
      select.appendChild(blank);

      cachedAreas
        .filter(row => row.data.active !== false)
        .slice()
        .sort((a, b) => (a.data.name || "").localeCompare(b.data.name || ""))
        .forEach(row => {
          const opt = document.createElement("option");
          opt.value = row.data.name || row.id;
          opt.textContent = row.data.name || row.id;
          select.appendChild(opt);
        });

      if (currentValue) select.value = currentValue;
    });
  }

  function renderAreas(rows) {
    if (!areasTableBody) return;

    areasTableBody.innerHTML = "";

    sortAreasByName(rows).forEach(row => {
      const a = row.data;
      const stationCount = getStationCountForArea(a.name || row.id);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${a.name || ""}</strong></td>
        <td>${a.description || ""}</td>
        <td>${stationCount}</td>
        <td>${a.active !== false ? "Yes" : "No"}</td>
        <td>
          <button class="btn small secondary edit-area-btn" data-id="${row.id}">Edit</button>
          <button class="btn small danger delete-area-btn" data-id="${row.id}" data-count="${stationCount}">Delete</button>
        </td>
      `;
      areasTableBody.appendChild(tr);
    });

    wireAreaTableButtons();
    populateAreaOptions();
  }

  function wireAreaTableButtons() {
    document.querySelectorAll(".edit-area-btn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const found = cachedAreas.find(x => x.id === id);
        if (!found) return;

        const a = found.data;
        if (areaId) areaId.value = found.id;
        if (areaName) areaName.value = a.name || "";
        if (areaDescription) areaDescription.value = a.description || "";
        if (areaActive) areaActive.checked = a.active !== false;
        if (areaFormTitle) areaFormTitle.textContent = "Edit Area";
        activateTab("areas");
      };
    });

    document.querySelectorAll(".delete-area-btn").forEach(btn => {
      btn.onclick = async () => {
        if (blockDemoAdminAction("Area deletion")) return;

        const id = btn.dataset.id;
        const found = cachedAreas.find(x => x.id === id);
        if (!found) return;

        const areaNameValue = found.data?.name || id;
        const stationCount = getStationCountForArea(areaNameValue);

        if (stationCount > 0) {
          alert(`Cannot delete "${areaNameValue}". ${stationCount} station${stationCount === 1 ? "" : "s"} assigned to this area. Move or edit those stations first.`);
          return;
        }

        if (!confirm(`Delete area "${areaNameValue}"?`)) return;

        try {
          await areasRef.doc(id).delete();
          resetAreaForm();
        } catch (err) {
          console.error(err);
          alert("Could not delete area.");
        }
      };
    });
  }

  function resetAreaForm() {
    if (areaForm) areaForm.reset();
    if (areaId) areaId.value = "";
    if (areaFormTitle) areaFormTitle.textContent = "Add Area";
    if (areaActive) areaActive.checked = true;
  }


  // ---------- STATIONS ----------
  function stationAreaName(station = {}) {
    return station.area || station.areaName || "";
  }

  function sortedStations(rows = []) {
    return [...rows].sort((a, b) => {
      const areaA = stationAreaName(a.data).toLowerCase();
      const areaB = stationAreaName(b.data).toLowerCase();
      const nameA = String(a.data?.name || "").toLowerCase();
      const nameB = String(b.data?.name || "").toLowerCase();
      return areaA.localeCompare(areaB) || nameA.localeCompare(nameB);
    });
  }

  function stationStatus(station = {}) {
    const hasArea = !!stationAreaName(station);
    if (station.archived === true || station.active === false) return "Archived";
    if (!hasArea) return "Waiting";
    return "Active";
  }

  function stationStatusClass(station = {}) {
    const status = stationStatus(station).toLowerCase();
    if (status === "active") return "status-pill success";
    if (status === "archived") return "status-pill neutral";
    return "status-pill warning";
  }

  function isActiveCallStatus(status) {
    const value = String(status || "").toLowerCase();
    return value === "waiting" || value === "ack" || value === "acknowledged" || value === "on_way" || value === "on way";
  }

  function stationHasActiveCalls(station = {}) {
    const stationName = String(station.name || "").trim().toLowerCase();
    if (!stationName) return false;

    return cachedCalls.some(call => {
      if (!isActiveCallStatus(call.status)) return false;
      const callStationName = String(call.station || call.stationName || "").trim().toLowerCase();
      return callStationName === stationName;
    });
  }

  function stationDuplicateExists(name, excludeId = "") {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return false;

    return cachedStations.some(row => {
      if (excludeId && row.id === excludeId) return false;
      const rowName = String(row.data?.name || "").trim().toLowerCase();
      return rowName === key;
    });
  }

  function activeAreaNamesSet() {
    return new Set(
      cachedAreas
        .filter(row => row.data?.active !== false)
        .map(row => String(row.data?.name || "").trim().toLowerCase())
        .filter(Boolean)
    );
  }

  function renderStations(rows) {
    if (!stationsTableBody) return;

    stationsTableBody.innerHTML = "";

    sortedStations(rows).forEach(row => {
      const s = row.data || {};
      const areaValue = stationAreaName(s);
      const status = stationStatus(s);
      const canOpen = status === "Active";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${s.name || ""}</strong></td>
        <td>${areaValue || "Waiting to be assigned"}</td>
        <td>${s.description || ""}</td>
        <td><span class="${stationStatusClass(s)}">${status}</span></td>
        <td>
          <button class="btn small secondary edit-station-btn" data-id="${row.id}">Edit</button>
          ${canOpen ? `<button class="btn small copy-station-link-btn" data-url="${buildCallUrl(s.name || "", [s.name || ""], areaValue)}">Copy Link</button>` : ""}
          ${canOpen ? `<button class="btn small secondary open-station-link-btn" data-url="${buildCallUrl(s.name || "", [s.name || ""], areaValue)}">Open</button>` : ""}
          ${status === "Archived"
            ? `<button class="btn small secondary restore-station-btn" data-id="${row.id}">Restore</button>`
            : `<button class="btn small danger archive-station-btn" data-id="${row.id}">Archive</button>`}
        </td>
      `;
      stationsTableBody.appendChild(tr);
    });

    wireStationTableButtons();
  }

  function wireStationTableButtons() {
    document.querySelectorAll(".edit-station-btn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const found = cachedStations.find(x => x.id === id);
        if (!found) return;

        const s = found.data || {};
        if (stationId) stationId.value = found.id;
        if (stationName) stationName.value = s.name || "";
        if (stationArea) stationArea.value = stationAreaName(s) || "";
        if (stationDescription) stationDescription.value = s.description || "";
        if (stationFormTitle) stationFormTitle.textContent = "Edit Station";
        activateTab("stations");
      };
    });

    document.querySelectorAll(".copy-station-link-btn").forEach(btn => {
      btn.onclick = async () => {
        const url = btn.dataset.url;
        if (!url) return;
        await copyText(url);
      };
    });

    document.querySelectorAll(".open-station-link-btn").forEach(btn => {
      btn.onclick = () => {
        const url = btn.dataset.url;
        if (!url) return;
        window.open(url, "_blank");
      };
    });

    document.querySelectorAll(".archive-station-btn").forEach(btn => {
      btn.onclick = async () => {
        if (blockDemoAdminAction("Station archive")) return;

        const id = btn.dataset.id;
        const found = cachedStations.find(x => x.id === id);
        if (!found) return;

        if (stationHasActiveCalls(found.data)) {
          alert("This station has active calls. Close or complete those calls before archiving the station.");
          return;
        }

        const ok = confirm(`Archive station "${found.data?.name || id}"?\n\nArchived stations are hidden from active use but remain available for history.`);
        if (!ok) return;

        try {
          await stationsRef.doc(id).update({
            active: false,
            archived: true,
            updatedAt: Date.now()
          });
        } catch (err) {
          console.error(err);
          alert("Could not archive station.");
        }
      };
    });

    document.querySelectorAll(".restore-station-btn").forEach(btn => {
      btn.onclick = async () => {
        if (blockDemoAdminAction("Station restore")) return;

        const id = btn.dataset.id;
        const found = cachedStations.find(x => x.id === id);
        if (!found) return;

        if (!stationAreaName(found.data)) {
          alert("Assign an Area before restoring this station.");
          return;
        }

        try {
          await stationsRef.doc(id).update({
            active: true,
            archived: false,
            updatedAt: Date.now()
          });
        } catch (err) {
          console.error(err);
          alert("Could not restore station.");
        }
      };
    });
  }

  function resetStationForm() {
    if (stationForm) stationForm.reset();
    if (stationId) stationId.value = "";
    if (stationFormTitle) stationFormTitle.textContent = "Add Station";
    if (stationArea) stationArea.value = "";
  }

  function normalizeYesNo(value) {
    const v = String(value || "").trim().toLowerCase();
    return ["yes", "y", "true", "1", "active"].includes(v);
  }

  function parseCsvLine(line) {
    const out = [];
    let current = "";
    let quote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; continue; }
      if (ch === '"') { quote = !quote; continue; }
      if (ch === "," && !quote) { out.push(current); current = ""; continue; }
      current += ch;
    }
    out.push(current);
    return out.map(x => x.trim());
  }

  function parseCsv(text) {
    const lines = String(text || "").split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return [];
    const headers = parseCsvLine(lines.shift()).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.map(line => {
      const cells = parseCsvLine(line);
      const obj = {};
      headers.forEach((h, i) => obj[h] = cells[i] || "");
      return obj;
    });
  }

  function downloadText(filename, text, type = "text/plain") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function stationsCsvRows() {
    const header = ["station_name", "area", "description", "status"];
    const rows = sortedStations(cachedStations).map(row => {
      const s = row.data || {};
      return [
        csvSafe(s.name || ""),
        csvSafe(stationAreaName(s) || ""),
        csvSafe(s.description || ""),
        csvSafe(stationStatus(s))
      ].join(",");
    });
    return [header.join(","), ...rows].join("\n");
  }

  function stationTemplateCsv() {
    return [
      "station_name,area,description,status",
      "Press 1,Production,1200 Ton Press,Active",
      "Press 2,Production,800 Ton Press,Active",
      "Receiving 1,Receiving,Main Receiving Dock,Active",
      "Shipping 1,Shipping,Outbound Shipping Dock,Active"
    ].join("\n");
  }

  async function importStationsCsv(file) {
    if (!file) return;
    if (blockDemoAdminAction("Station CSV import")) return;

    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) {
      alert("No station rows found in CSV.");
      return;
    }

    const areaNames = activeAreaNamesSet();
    const missingAreas = new Set();
    const duplicateNames = new Set();
    const seenNames = new Set();

    const parsedRows = rows
      .map(row => {
        const name = String(row.station_name || row.station || row.work_cell || row.workcell || row.name || "").trim();
        const area = String(row.area || row.department || "").trim();
        const description = String(row.description || row.desc || "").trim();
        const rawStatus = String(row.status || row.active || "Active").trim().toLowerCase();
        const archived = rawStatus === "archived" || rawStatus === "inactive" || rawStatus === "no" || rawStatus === "false";
        return { name, area, description, archived };
      })
      .filter(row => row.name);

    parsedRows.forEach(row => {
      const nameKey = row.name.toLowerCase();
      if (seenNames.has(nameKey) || stationDuplicateExists(row.name)) duplicateNames.add(row.name);
      seenNames.add(nameKey);

      if (row.area && !areaNames.has(row.area.toLowerCase())) missingAreas.add(row.area);
    });

    if (missingAreas.size) {
      alert(`CSV import stopped.\n\nThese Areas do not exist yet:\n${Array.from(missingAreas).sort().join("\n")}\n\nCreate the Areas first, then import again.`);
      return;
    }

    if (duplicateNames.size) {
      alert(`CSV import stopped.\n\nDuplicate station names found:\n${Array.from(duplicateNames).sort().join("\n")}\n\nStation names must be unique.`);
      return;
    }

    let imported = 0;
    for (const row of parsedRows) {
      const hasArea = !!row.area;
      await stationsRef.add({
        companyId: COMPANY_ID,
        name: row.name,
        area: row.area,
        description: row.description,
        cells: [row.name],
        active: hasArea && !row.archived,
        archived: row.archived || !hasArea,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      imported++;
    }

    alert(`Imported ${imported} station${imported === 1 ? "" : "s"}.`);
  }

  // ---------- CALL BUTTONS ----------
  function populateCallButtonStations(rows) {
    if (cbStation) cbStation.innerHTML = "";
    if (cbAutoStation) cbAutoStation.innerHTML = "";
    if (cbDepartment) cbDepartment.innerHTML = `<option value="">None</option>`;

    rows.forEach(row => {
      const s = row.data;

      const opt1 = document.createElement("option");
      opt1.value = row.id;
      opt1.textContent = s.name || row.id;
      cbStation?.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = row.id;
      opt2.textContent = s.name || row.id;
      cbAutoStation?.appendChild(opt2);
    });

    populateCellsForSelectedStation();
  }

  function populateCellsForSelectedStation() {
    if (!cbStation || !cbCells) return;

    const id = cbStation.value;
    const found = cachedStations.find(x => x.id === id);

    cbCells.innerHTML = "";
    if (!found) return;

    (found.data.cells || []).forEach(cell => {
      const opt = document.createElement("option");
      opt.value = cell;
      opt.textContent = cell;
      cbCells.appendChild(opt);
    });
  }


  function permissionLabel(key = "") {
    const map = {
      canMakeCalls: "Can Make Calls",
      makeCall: "Can Make Calls",
      callable: "Can Be Requested",
      isCallable: "Can Be Requested",
      respondMatching: "Respond Matching",
      respondAny: "Respond Any",
      supervisorPortal: "Supervisor Portal"
    };
    return map[key] || String(key).replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
  }

  function rolePermissions(role = {}) {
    return role.permissions || {};
  }

  function legacyPermissionTrue(role = {}, keys = []) {
    const permissions = rolePermissions(role);
    return keys.some(key => role[key] === true || permissions[key] === true);
  }

  function roleIsActive(role = {}) {
    return role.active !== false && role.archived !== true;
  }

  function roleCanMakeCalls(role = {}) {
    const permissions = rolePermissions(role);
    if (typeof role.canMakeCalls === "boolean") return role.canMakeCalls;
    return permissions.canMakeCalls === true || permissions.makeCall === true || permissions.callable === true;
  }

  function roleIsCallable(role = {}) {
    const permissions = rolePermissions(role);
    if (typeof role.isCallable === "boolean") return role.isCallable;
    return permissions.callable === true || permissions.isCallable === true;
  }

  function roleCanRespondMatching(role = {}) {
    const permissions = rolePermissions(role);
    if (typeof role.respondMatching === "boolean") return role.respondMatching;
    return permissions.respondMatching === true ||
      legacyPermissionTrue(role, ["acknowledgeCalls", "acceptCall", "closeCalls", "closeCall"]);
  }

  function roleCanRespondAny(role = {}) {
    const permissions = rolePermissions(role);
    if (typeof role.respondAny === "boolean") return role.respondAny;
    return permissions.respondAny === true ||
      legacyPermissionTrue(role, ["acknowledgeAllCalls", "closeAllCalls", "viewAllCalls"]);
  }

  function roleHasSupervisorPortal(role = {}) {
    return legacyPermissionTrue(role, ["supervisorPortal"]);
  }

  function roleCanClearEmergency(role = {}) {
    return legacyPermissionTrue(role, ["clearEmergency", "canClearEmergency"]);
  }

  function roleBadgeHtml(label, kind = "") {
    return `<span class="permission-pill ${kind}">${label}</span>`;
  }

  function roleNameTaken(name, currentId = "") {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) return false;
    return cachedRoles.some(row => {
      if (row.id === currentId) return false;
      const roleNameValue = String(row.data?.name || "").trim().toLowerCase();
      return roleNameValue === normalized;
    });
  }

  function activeUsersForRole(roleNameValue = "") {
    const normalized = String(roleNameValue || "").trim().toLowerCase();
    if (!normalized) return [];
    return cachedUsers.filter(row => {
      const u = row.data || {};
      const userRoleNameValue = String(u.role || u.personnelRole || u.type || "").trim().toLowerCase();
      return userRoleNameValue === normalized && u.active !== false;
    });
  }

  // ---------- ROLES ----------
  function renderRoles(rows) {
    if (!rolesTableBody) return;

    const searchValue = (roleSearch?.value || "").trim().toLowerCase();

    const filteredRows = rows
      .slice()
      .sort((a, b) => {
        const aActive = roleIsActive(a.data || {}) ? 0 : 1;
        const bActive = roleIsActive(b.data || {}) ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return (a.data.name || "").localeCompare(b.data.name || "");
      })
      .filter(row => {
        if (!searchValue) return true;
        const r = row.data || {};
        return [
          r.name || "",
          roleCanMakeCalls(r) ? "make calls" : "",
          roleIsCallable(r) ? "requested callable personnel required" : "",
          roleCanRespondMatching(r) ? "respond matching" : "",
          roleCanRespondAny(r) ? "respond any" : "",
          roleHasSupervisorPortal(r) ? "supervisor portal" : "",
          roleCanClearEmergency(r) ? "clear emergency" : "",
          roleIsActive(r) ? "active" : "archived"
        ].join(" ").toLowerCase().includes(searchValue);
      });

    rolesTableBody.innerHTML = "";

    filteredRows.forEach(row => {
      const r = row.data || {};
      const isActive = roleIsActive(r);
      const responseBadges = [];

      if (roleCanRespondAny(r)) {
        responseBadges.push(roleBadgeHtml("Respond Any", "strong"));
      } else if (roleCanRespondMatching(r)) {
        responseBadges.push(roleBadgeHtml("Respond Matching"));
      }

      if (roleHasSupervisorPortal(r)) {
        responseBadges.push(roleBadgeHtml("Supervisor Portal", "system"));
      }
      if (roleCanClearEmergency(r)) {
        responseBadges.push(roleBadgeHtml("Clear Emergency", "danger"));
      }

      const responseHtml = responseBadges.length
        ? responseBadges.join("")
        : `<span class="muted">No response access</span>`;

      const tr = document.createElement("tr");
      tr.className = isActive ? "" : "archived-row";
      tr.innerHTML = `
        <td><strong>${r.name || ""}</strong></td>
        <td><span class="status-pill ${roleCanMakeCalls(r) ? "active" : "waiting"}">${roleCanMakeCalls(r) ? "Yes" : "No"}</span></td>
        <td><span class="status-pill ${roleIsCallable(r) ? "active" : "waiting"}">${roleIsCallable(r) ? "Yes" : "No"}</span></td>
        <td><div class="permission-pill-wrap">${responseHtml}</div></td>
        <td><span class="status-pill ${isActive ? "active" : "archived"}">${isActive ? "Active" : "Archived"}</span></td>
        <td class="role-actions">
          <button class="btn small secondary edit-role-btn" data-id="${row.id}">Edit</button>
          <button class="btn small ${isActive ? "danger" : "secondary"} archive-role-btn" data-id="${row.id}" data-action="${isActive ? "archive" : "restore"}">${isActive ? "Archive" : "Restore"}</button>
        </td>
      `;
      rolesTableBody.appendChild(tr);
    });

    wireRoleTableButtons();
    populateRoleOptions();
  }

  function wireRoleTableButtons() {
    document.querySelectorAll(".edit-role-btn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const found = cachedRoles.find(x => x.id === id);
        if (!found) return;

        const r = found.data || {};
        if (roleId) roleId.value = found.id;
        if (roleName) roleName.value = r.name || "";
        if (roleFormTitle) roleFormTitle.textContent = "Edit Role";

        permissionCheckboxes.forEach(cb => {
          const perm = cb.getAttribute("data-permission");
          if (perm === "canMakeCalls") {
            cb.checked = roleCanMakeCalls(r);
          } else if (perm === "callable") {
            cb.checked = roleIsCallable(r);
          } else if (perm === "respondMatching") {
            cb.checked = roleCanRespondMatching(r);
          } else if (perm === "respondAny") {
            cb.checked = roleCanRespondAny(r);
          } else if (perm === "supervisorPortal") {
            cb.checked = roleHasSupervisorPortal(r);
          } else if (perm === "clearEmergency") {
            cb.checked = roleCanClearEmergency(r);
          } else {
            cb.checked = !!(r.permissions && r.permissions[perm]);
          }
        });

        activateTab("roles");
      };
    });

    document.querySelectorAll(".archive-role-btn").forEach(btn => {
      btn.onclick = async () => {
        if (blockDemoAdminAction("Role management")) return;

        const id = btn.dataset.id;
        const action = btn.dataset.action || "archive";
        const found = cachedRoles.find(x => x.id === id);
        if (!found) return;

        const roleNameValue = found.data?.name || "";
        const goingArchive = action === "archive";

        if (goingArchive) {
          const assignedUsers = activeUsersForRole(roleNameValue);
          if (assignedUsers.length > 0) {
            alert(`Cannot archive "${roleNameValue}". ${assignedUsers.length} active user(s) are assigned to this role. Move or deactivate those users first.`);
            return;
          }

          if (!confirm(`Archive role "${roleNameValue}"?`)) return;
        }

        try {
          await rolesRef.doc(id).set({
            active: !goingArchive,
            archived: goingArchive,
            updatedAt: Date.now()
          }, { merge: true });
        } catch (err) {
          console.error(err);
          alert("Could not update role status.");
        }
      };
    });
  }

  function resetRoleForm() {
    if (roleForm) roleForm.reset();
    if (roleId) roleId.value = "";
    if (roleFormTitle) roleFormTitle.textContent = "Add Role";
    permissionCheckboxes.forEach(cb => {
      const perm = cb.getAttribute("data-permission");
      cb.checked = perm === "canMakeCalls";
    });
  }

  function populateRoleOptions() {
    const activeRoles = cachedRoles
      .slice()
      .filter(row => roleIsActive(row.data || {}))
      .sort((a, b) => (a.data.name || "").localeCompare(b.data.name || ""));

    if (userRole) {
      const currentValue = userRole.value;
      userRole.innerHTML = "";

      activeRoles.forEach(row => {
        const opt = document.createElement("option");
        opt.value = row.data.name || "";
        opt.textContent = row.data.name || "";
        userRole.appendChild(opt);
      });

      if (currentValue) userRole.value = currentValue;
    }

    if (userRoleFilter) {
      const currentFilter = userRoleFilter.value || "";
      userRoleFilter.innerHTML = `<option value="">All roles</option>`;

      activeRoles.forEach(row => {
        const roleName = row.data.name || "";
        if (!roleName) return;
        const opt = document.createElement("option");
        opt.value = roleName;
        opt.textContent = roleName;
        userRoleFilter.appendChild(opt);
      });

      userRoleFilter.value = currentFilter;
      if (userRoleFilter.value !== currentFilter) userRoleFilter.value = "";
    }
  }

  // ---------- USERS ----------
  function populateDeptOptions() {
    populateAreaOptions();
  }

  function fullUserName(user = {}) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || user.uid || "User";
  }

  function reverseId(value = "") {
    return String(value || "").trim().split("").reverse().join("");
  }

  function userStatusLabel(user = {}) {
    return user.archived || user.active === false || String(user.status || "").toLowerCase() === "archived" ? "Archived" : "Active";
  }

  function userStatusPill(label) {
    const cls = label === "Archived" ? "status-pill archived" : "status-pill active";
    return `<span class="${cls}">${label}</span>`;
  }

  function rolePillHtml(role = "") {
    return role ? `<span class="role-pill">${escapeHtml(role)}</span>` : "—";
  }

  function userIdTaken(uid, currentId = "") {
    const value = String(uid || "").trim().toLowerCase();
    if (!value) return false;
    return normalizeRows(cachedUsers).some(row => {
      if (currentId && row.id === currentId) return false;
      const u = row.data;
      return String(u.uid || u.employeeNumber || "").trim().toLowerCase() === value;
    });
  }

  function badgeCodeTaken(code, currentId = "") {
    const value = String(code || "").trim().toLowerCase();
    if (!value) return false;
    return normalizeRows(cachedUsers).some(row => {
      if (currentId && row.id === currentId) return false;
      const u = row.data;
      return String(u.badgeCode || "").trim().toLowerCase() === value;
    });
  }

  function userSearchText(user) {
    return [user.firstName, user.lastName, user.name, user.role, user.uid, user.employeeNumber, user.badgeCode, user.status]
      .join(" ").toLowerCase();
  }

  function filteredUsers() {
    const search = (userSearch?.value || "").trim().toLowerCase();
    const role = userRoleFilter?.value || "";
    return normalizeRows(cachedUsers)
      .filter(row => {
        const u = row.data;
        if (role && u.role !== role) return false;
        if (search && !userSearchText(u).includes(search)) return false;
        return true;
      })
      .sort((a, b) => {
        const aStatus = a.data.active ? 0 : 1;
        const bStatus = b.data.active ? 0 : 1;
        if (aStatus !== bStatus) return aStatus - bStatus;
        return fullUserName(a.data).localeCompare(fullUserName(b.data));
      });
  }

  function renderUsers(rows = cachedUsers) {
    if (!usersTableBody) return;
    const displayRows = rows === cachedUsers ? filteredUsers() : normalizeRows(rows);
    usersTableBody.innerHTML = "";

    if (!displayRows.length) {
      usersTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">No users found.</td></tr>`;
      return;
    }

    displayRows.forEach(row => {
      const u = row.data;
      const status = userStatusLabel(u);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="user-badge-check" data-id="${row.id}" data-user-id="${escapeHtml(u.uid || "")}" value="${row.id}" /></td>
        <td><strong>${escapeHtml(fullUserName(u))}</strong></td>
        <td>${rolePillHtml(u.role)}</td>
        <td>${escapeHtml(u.uid || "—")}</td>
        <td>${userStatusPill(status)}</td>
        <td class="user-actions">
          <button type="button" class="btn small secondary print-user-badge-btn" data-id="${row.id}">Print Badge</button>
          <button type="button" class="btn small secondary edit-user-btn" data-id="${row.id}">Edit</button>
          <button type="button" class="btn small danger archive-user-btn" data-id="${row.id}" data-action="${status === "Archived" ? "restore" : "archive"}">${status === "Archived" ? "Restore" : "Archive"}</button>
        </td>
      `;
      usersTableBody.appendChild(tr);
    });
    wireUserTableButtons();
  }

  function selectedBadgeUsers() {
    const checked = Array.from(document.querySelectorAll(".user-badge-check:checked"));
    const ids = checked
      .map(cb => String(cb.dataset.id || cb.value || "").trim())
      .filter(Boolean);

    return ids
      .map(id => cachedUsers.find(row =>
        String(row.id) === id ||
        String(row.data?.uid || "") === id ||
        String(row.data?.userId || "") === id ||
        String(row.data?.employeeNumber || "") === id
      ))
      .filter(Boolean)
      .map(row => ({ id: row.id, data: normalizeUser(row) }));
  }

  function badgeHash(value = "") {
    const text = String(value || "BADGE");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function code128Barcode(value = "") {
    const text = String(value || "");
    const patterns = [
      "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
      "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
      "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
      "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
      "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
      "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
      "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
      "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
      "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
      "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
      "114131","311141","411131","211412","211214","211232","2331112"
    ];
    const pairs = /^\d+$/.test(text) && text.length % 2 === 0;
    const codes = [];
    let checksum;
    if (pairs) {
      codes.push(105);
      checksum = 105;
      for (let i = 0; i < text.length; i += 2) codes.push(Number(text.slice(i, i + 2)));
    } else {
      codes.push(104);
      checksum = 104;
      for (const ch of text) {
        const c = ch.charCodeAt(0);
        codes.push(c >= 32 && c <= 126 ? c - 32 : 0);
      }
    }
    for (let i = 1; i < codes.length; i += 1) checksum += codes[i] * i;
    codes.push(checksum % 103, 106);

    const moduleWidth = 2;
    const height = 48;
    const quiet = 10;
    let x = quiet;
    let bars = `<rect width="100%" height="100%" fill="#fff"/>`;
    for (const code of codes) {
      const pattern = patterns[code] || patterns[0];
      for (let i = 0; i < pattern.length; i += 1) {
        const w = Number(pattern[i]) * moduleWidth;
        if (i % 2 === 0) bars += `<rect x="${x}" y="2" width="${w}" height="${height - 4}" fill="#000"/>`;
        x += w;
      }
    }
    const width = x + quiet;
    return `<svg class="badge-barcode-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-label="Code128 ${escapeHtml(text)}">${bars}</svg>`;
  }


  // Real offline QR Code generator, bundled from the MIT-licensed Kazuhiko Arase QRCode implementation.
  const BadgeQR = (() => {
    const __modules = {};
__modules['./QRMode']=function(module,exports,require){
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

};
__modules['./QRErrorCorrectLevel']=function(module,exports,require){
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


};
__modules['./QRMaskPattern']=function(module,exports,require){
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

};
__modules['./QRMath']=function(module,exports,require){
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

};
__modules['./QRPolynomial']=function(module,exports,require){
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

};
__modules['./QRRSBlock']=function(module,exports,require){
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

};
__modules['./QRBitBuffer']=function(module,exports,require){
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

};
__modules['./QR8bitByte']=function(module,exports,require){
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

};
__modules['./QRUtil']=function(module,exports,require){
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

};
__modules['./index']=function(module,exports,require){
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

};
    const __cache = {};
    function __require(name) {
      const key = name.replace(/\.js$/, "");
      if (__cache[key]) return __cache[key].exports;
      if (!__modules[key]) throw new Error("Badge QR module missing: " + key);
      const module = { exports: {} };
      __cache[key] = module;
      __modules[key](module, module.exports, __require);
      return module.exports;
    }
    return {
      QRCode: __require("./index"),
      QRErrorCorrectLevel: __require("./QRErrorCorrectLevel")
    };
  })();


  function qrBlock(value = "") {
    const text = String(value || "").trim();
    if (!text) return "";

    try {
      const qrcode = new BadgeQR.QRCode(-1, BadgeQR.QRErrorCorrectLevel.M);
      qrcode.addData(text);
      qrcode.make();

      const moduleCount = qrcode.getModuleCount();
      const quietZone = 4;
      const cell = 4;
      const total = (moduleCount + quietZone * 2) * cell;
      let svg = `<rect width="${total}" height="${total}" fill="#fff"/>`;

      for (let row = 0; row < moduleCount; row += 1) {
        for (let col = 0; col < moduleCount; col += 1) {
          if (qrcode.isDark(row, col)) {
            svg += `<rect x="${(col + quietZone) * cell}" y="${(row + quietZone) * cell}" width="${cell}" height="${cell}" fill="#000"/>`;
          }
        }
      }

      return `<svg class="badge-qr-svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR User ID ${escapeHtml(text)}">${svg}</svg>`;
    } catch (error) {
      console.error("Badge QR generation failed", error);
      return `<div class="badge-code-error">QR unavailable</div>`;
    }
  }

  function barcodeBars(value = "") {
    return code128Barcode(value);
  }

  function printBadges(userRows) {
    const users = normalizeRows(userRows || [])
      .map(row => ({ id: row.id, data: normalizeUser(row) }))
      .filter(row => row.data.active !== false && row.data.archived !== true);

    if (!users.length) {
      alert("No active users selected for badge printing.");
      return;
    }

    const companyName = COMPANY_NAME || "Factory On Call";
    const badgeRows = users.map(row => {
      const u = row.data;
      const userId = String(u.uid || u.userId || u.employeeNumber || row.id || "").trim();
      return {
        name: fullUserName(u) || "Unnamed User",
        role: u.role || "",
        userId,
        companyName
      };
    }).filter(item => item.userId);

    if (!badgeRows.length) {
      alert("No users with User IDs available for badge printing.");
      return;
    }

    const badgeCards = badgeRows.map((item, index) => `
      <div class="badge">
        <div class="badge-top">
          <div class="top-brand">${escapeHtml(item.companyName)}</div>
        </div>

        <div class="name-band">
          <div class="name">${escapeHtml(item.name)}</div>
          <div class="role">${escapeHtml(item.role)}</div>
        </div>

        <div class="id">USER ID: ${escapeHtml(item.userId)}</div>

        <div class="codes">
          ${qrBlock(item.userId)}
          ${barcodeBars(item.userId)}
        </div>

        <div class="footer">Powered by One T Media Group</div>
      </div>
    `).join("");

    const codeValues = badgeRows.map(item => item.userId);

    const printHtml = `<!doctype html>
<html>
<head>
<title>Factory On Call Badge Sheet</title>
<style>
  @page { size: letter; margin: 0.5in; }

  html, body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    background: #fff;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .sheet {
    display: grid;
    grid-template-columns: repeat(2, 3.375in);
    grid-auto-rows: 2.125in;
    gap: 0.25in;
    justify-content: center;
    align-content: start;
  }

  .badge {
    width: 3.375in;
    height: 2.125in;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    background: white;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .badge-top {
    height: 0.45in;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px 10px;
    background: white;
    box-sizing: border-box;
  }

  .top-brand {
    font-weight: 900;
    font-size: 16px;
    color: #0b63ce;
    text-align: center;
    line-height: 1.05;
  }

  .name-band {
    background: #0b63ce;
    color: white;
    text-align: center;
    padding: 7px 6px;
  }

  .name {
    font-size: 20px;
    font-weight: 900;
    line-height: 1;
  }

  .role {
    font-size: 11px;
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 800;
  }

  .id {
    font-size: 14px;
    font-weight: 900;
    text-align: center;
    padding: 6px 0 2px;
    color: #111827;
  }

  .codes {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    flex: 1;
    padding: 0 12px 3px;
  }

  .badge-qr-svg {
    width: 56px !important;
    height: 56px !important;
    flex: 0 0 auto;
  }

  .badge-barcode-svg {
    width: 150px !important;
    height: 43px !important;
    flex: 0 0 auto;
  }

  .footer {
    font-size: 7px;
    text-align: center;
    color: #6b7280;
    padding-bottom: 3px;
  }

  @media print {
    body { margin: 0; }
    .badge { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>

<body>
  <div class="sheet">
    ${badgeCards}
  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.focus();
        window.print();
      }, 350);
    };
  <\/script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win || !win.document) {
      alert("Unable to open badge print window. Please allow pop-ups for this site.");
      return;
    }

    win.document.open();
    win.document.write(printHtml);
    win.document.close();
  }

  function wireUserTableButtons() {
    document.querySelectorAll(".edit-user-btn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const found = cachedUsers.find(x => x.id === id);
        if (!found) return;
        const u = normalizeUser(found);
        if (userId) userId.value = found.id;
        if (userFirstName) userFirstName.value = u.firstName || "";
        if (userLastName) userLastName.value = u.lastName || "";
        if (userRole) userRole.value = u.role || "";
        if (userUID) userUID.value = u.uid || "";
        if (userBadgeCode) userBadgeCode.value = u.badgeCode || u.uid || "";
        if (userPin) { userPin.value = u.pin || reverseId(u.uid || ""); userPin.dataset.autoValue = reverseId(u.uid || ""); }
        if (userStatus) userStatus.value = u.active === false ? "archived" : "active";
        if (userActive) userActive.checked = u.active !== false;
        if (userFormTitle) userFormTitle.textContent = "Edit User";
        activateTab("users");
      };
    });

    document.querySelectorAll(".archive-user-btn").forEach(btn => {
      btn.onclick = async () => {
        if (blockDemoAdminAction("User archive")) return;
        const id = btn.dataset.id;
        const restore = btn.dataset.action === "restore";
        try {
          await usersRef.doc(id).set({
            active: restore,
            archived: !restore,
            status: restore ? "active" : "archived",
            updatedAt: Date.now()
          }, { merge: true });
        } catch (err) {
          console.error(err);
          alert("Could not update user status.");
        }
      };
    });

    document.querySelectorAll(".print-user-badge-btn").forEach(btn => {
      btn.onclick = () => {
        const found = cachedUsers.find(row => row.id === btn.dataset.id);
        if (found) printBadges([found]);
      };
    });
  }

  function resetUserForm() {
    if (userForm) userForm.reset();
    if (userId) userId.value = "";
    if (userBadgeCode) { userBadgeCode.value = ""; userBadgeCode.dataset.autoValue = ""; }
    if (userPin) { userPin.value = ""; userPin.dataset.autoValue = ""; }
    if (userStatus) userStatus.value = "active";
    if (userFormTitle) userFormTitle.textContent = "Add User";
    if (userActive) userActive.checked = true;
  }

  function usersCsvTemplate() {
    return [
      "firstName,lastName,role,userId,pin,status",
      "Sally,Smith,Operator,331,133,active"
    ].join("\n");
  }

  function usersCsvRows() {
    const header = ["firstName","lastName","role","userId","pin","status"];
    const rows = normalizeRows(cachedUsers).map(row => {
      const u = row.data;
      return [u.firstName,u.lastName,u.role,u.uid,u.pin || reverseId(u.uid),u.active === false ? "archived" : "active"].map(csvSafe).join(",");
    });
    return [header.join(","), ...rows].join("\n");
  }

  async function importUsersCsv(file) {
    if (blockDemoAdminAction("User CSV import")) return;
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      alert("CSV file has no user rows.");
      return;
    }
    const headers = rows.shift().map(h => h.trim().toLowerCase());
    const roleNames = new Set(activeRoles().map(r => String(r.data.name || r.id || "").trim().toLowerCase()));
    const prepared = [];
    const missingRoles = new Set();
    const duplicateIds = new Set();
    const duplicateBadges = new Set();
    const seenIds = new Set();
    const seenBadges = new Set();

    rows.forEach(cols => {
      const row = {};
      headers.forEach((h, i) => row[h] = (cols[i] || "").trim());
      const firstName = row.firstname || row.first_name || row.first || "";
      const lastName = row.lastname || row.last_name || row.last || "";
      const role = row.role || "";
      const uid = row.userid || row.user_id || row.employeeid || row.employee_id || row.uid || "";
      const badgeCode = uid;
      const pin = row.pin || reverseId(uid);
      const status = String(row.status || "active").toLowerCase() === "archived" ? "archived" : "active";
      if (!firstName || !lastName || !role || !uid) return;
      if (!roleNames.has(role.toLowerCase())) missingRoles.add(role);
      const idKey = uid.toLowerCase();
      if (seenIds.has(idKey) || userIdTaken(uid)) duplicateIds.add(uid);
      seenIds.add(idKey);
      const badgeKey = badgeCode.toLowerCase();
      if (badgeKey) seenBadges.add(badgeKey);
      prepared.push({ firstName, lastName, role, uid, badgeCode, pin, status });
    });

    if (missingRoles.size) {
      alert(`CSV import stopped. Missing roles:\n${Array.from(missingRoles).sort().join("\n")}`);
      return;
    }
    if (duplicateIds.size) {
      alert(`CSV import stopped. Duplicate User IDs:\n${Array.from(duplicateIds).sort().join("\n")}`);
      return;
    }
    if (duplicateBadges.size) {
      alert(`CSV import stopped. Duplicate Badge Codes:\n${Array.from(duplicateBadges).sort().join("\n")}`);
      return;
    }
    for (const row of prepared) {
      const archived = row.status === "archived";
      await usersRef.doc(makeSafeId(row.uid)).set({
        companyId: COMPANY_ID,
        firstName: row.firstName,
        lastName: row.lastName,
        name: `${row.firstName} ${row.lastName}`.trim(),
        role: row.role,
        uid: row.uid,
        employeeNumber: row.uid,
        badgeCode: row.badgeCode || row.uid,
        pin: row.pin || reverseId(row.uid),
        email: "",
        dept: "",
        status: row.status,
        archived,
        active: !archived,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }, { merge: true });
    }
    alert(`Imported ${prepared.length} user(s).`);
  }

  // ---------- CALL LOGS ----------
  function formatDateTime(ms) {
    if (!ms) return "—";
    const date = new Date(ms);
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function requestedBy(call) {
    const name = `${call.callerFirst || ""} ${call.callerLast || ""}`.trim();
    return name || call.callerUid || call.requestedBy || "Operator";
  }

  function assignedTo(call) {
    return call.assignedTo || call.ackBy || call.closedBy || "—";
  }

  function formatDurationMinutes(totalMinutes) {
    const minutes = Number(totalMinutes || 0);

    if (!minutes || minutes <= 0) return "—";
    if (minutes < 60) return `${minutes} min`;

    const totalHours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;

    if (totalHours < 24) {
      return remMinutes ? `${totalHours} hr ${remMinutes} min` : `${totalHours} hr`;
    }

    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;

    if (days < 7) {
      return remHours ? `${days} day${days === 1 ? "" : "s"} ${remHours} hr` : `${days} day${days === 1 ? "" : "s"}`;
    }

    const weeks = Math.floor(days / 7);
    const remDays = days % 7;

    return remDays ? `${weeks} wk${weeks === 1 ? "" : "s"} ${remDays} day${remDays === 1 ? "" : "s"}` : `${weeks} wk${weeks === 1 ? "" : "s"}`;
  }

  function callDurationLabel(call) {
    if (call.duration) return formatDurationMinutes(call.duration);

    const start = callStartMillis(call);
    const end = callClosedMillis(call);

    if (!start || !end || end <= start) return "—";

    const minutes = Math.max(1, Math.round((end - start) / 60000));
    return formatDurationMinutes(minutes);
  }

  function callSearchText(call) {
    return [
      callStation(call),
      callPersonnel(call),
      callLocation(call),
      requestedBy(call),
      assignedTo(call),
      dashboardStatusLabel(call)
    ].join(" ").toLowerCase();
  }

  function currentLogFilters() {
    return {
      search: (logsSearch?.value || "").trim().toLowerCase(),
      from: logsDateFrom?.value || "",
      to: logsDateTo?.value || ""
    };
  }

  function applyLogFilters(calls) {
    const filters = currentLogFilters();

    return calls.filter(call => {
      const start = callStartMillis(call);
      if (filters.search && !callSearchText(call).includes(filters.search)) return false;

      if (filters.from) {
        const fromTime = new Date(`${filters.from}T00:00:00`).getTime();
        if (!start || start < fromTime) return false;
      }

      if (filters.to) {
        const toTime = new Date(`${filters.to}T23:59:59`).getTime();
        if (!start || start > toTime) return false;
      }

      return true;
    });
  }

  function renderCallLogs() {
    if (!logsTableBody) return;

    filteredLogCalls = applyLogFilters(cachedCalls)
      .slice()
      .sort((a, b) => (callStartMillis(b) || 0) - (callStartMillis(a) || 0));

    logsTableBody.innerHTML = "";

    if (!filteredLogCalls.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="8" class="table-empty">No call logs found.</td>`;
      logsTableBody.appendChild(tr);
      return;
    }

    filteredLogCalls.forEach(call => {
      const statusLabel = dashboardStatusLabel(call);
      const statusClass = dashboardStatusClass(statusLabel);
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${formatDateTime(callStartMillis(call))}</td>
        <td><strong>${callStation(call)}</strong></td>
        <td>${callPersonnel(call)}</td>
        <td>${callLocation(call)}</td>
        <td>${requestedBy(call)}</td>
        <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
        <td>${assignedTo(call)}</td>
        <td>${callDurationLabel(call)}</td>
      `;

      logsTableBody.appendChild(tr);
    });
  }

  function csvSafe(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCallLogsCsv() {
    const rows = filteredLogCalls.length ? filteredLogCalls : applyLogFilters(cachedCalls);

    if (!rows.length) {
      alert("No call logs to export.");
      return;
    }

    const header = [
      "Time",
      "Station",
      "Personnel Required",
      "Location",
      "Requested By",
      "Status",
      "Assigned To",
      "Duration"
    ];

    const lines = [
      header.map(csvSafe).join(","),
      ...rows.map(call => [
        formatDateTime(callStartMillis(call)),
        callStation(call),
        callPersonnel(call),
        callLocation(call),
        requestedBy(call),
        dashboardStatusLabel(call),
        assignedTo(call),
        callDurationLabel(call)
      ].map(csvSafe).join(","))
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);

    a.href = url;
    a.download = `factory-on-call-logs-${COMPANY_ID}-${dateStamp}.csv`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  async function purgeOldLogs() {
    if (blockDemoAdminAction("Purge old logs")) return;

    const cutoffDays = 30;
    const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;

    const oldClosed = cachedCalls.filter(call => {
      const status = String(call.status || "").toLowerCase();
      const isClosed = status === "closed" || status === "complete" || status === "completed";
      const closedAt = callClosedMillis(call);
      return isClosed && closedAt && closedAt < cutoff;
    });

    if (!oldClosed.length) {
      alert(`No closed call logs older than ${cutoffDays} days were found.`);
      return;
    }

    const ok = confirm(`Purge ${oldClosed.length} closed call log(s) older than ${cutoffDays} days?\n\nActive and waiting calls will not be deleted.`);
    if (!ok) return;

    try {
      let batch = db.batch();
      let count = 0;

      for (const call of oldClosed) {
        batch.delete(callsRef.doc(call.id));
        count++;

        if (count % 450 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }

      await batch.commit();
      alert(`Purged ${oldClosed.length} old closed call log(s).`);
    } catch (err) {
      console.error(err);
      alert("Could not purge old call logs.");
    }
  }



  function bindBrandingPreview() {
    brandCompanyName?.addEventListener("input", () => {
      if (brandPreviewCompany) brandPreviewCompany.textContent = brandCompanyName.value.trim();
    });
    brandTheme?.addEventListener("change", () => {
      const nextTheme = normalizeTheme(brandTheme.value || "dark");
      localStorage.setItem("factory_on_call_theme", nextTheme);
      applyTheme(nextTheme);
      forceAdminThemePaint(nextTheme);
    });
    brandLogo?.addEventListener("change", async () => {
      try {
        const file = brandLogo.files?.[0];
        if (!file) return;
        const dataUrl = await resizeLogoToDataUrl(file);
        cachedBranding.logoDataUrl = dataUrl;
        if (brandPreviewLogo) brandPreviewLogo.src = dataUrl;
        const topLogo = document.getElementById("companyLogoImg");
        if (topLogo) { topLogo.src = dataUrl; topLogo.style.display = "block"; }
      } catch (err) {
        console.error(err);
        alert("Could not preview logo.");
      }
    });
  }

  // ---------- EVENT WIRING ----------
  function wireEvents() {
    document.addEventListener("click", event => {
      const singleBadgeBtn = event.target.closest?.(".print-user-badge-btn");
      const selectedBadgeBtn = event.target.closest?.("#btnPrintSelectedBadges");
      const allBadgeBtn = event.target.closest?.("#btnPrintAllBadges");

      if (!singleBadgeBtn && !selectedBadgeBtn && !allBadgeBtn) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

      if (singleBadgeBtn) {
        const found = cachedUsers.find(row => row.id === singleBadgeBtn.dataset.id);
        if (found) printBadges([{ id: found.id, data: normalizeUser(found) }]);
        return;
      }

      if (selectedBadgeBtn) {
        printBadges(selectedBadgeUsers());
        return;
      }

      if (allBadgeBtn) {
        printBadges(cachedUsers);
      }
    }, true);


    bindBrandingPreview();

    brandingForm?.addEventListener("submit", async e => {
      e.preventDefault();
      if (blockDemoAdminAction("Branding")) return;

      try {
        const payload = {
          companyName: brandCompanyName ? brandCompanyName.value.trim() : (COMPANY_NAME || ""),
          theme: normalizeTheme(brandTheme?.value || "dark"),
          logoDataUrl: cachedBranding.logoRemoved ? "" : (cachedBranding.logoDataUrl || cachedBranding.logoUrl || ""),
          updatedAt: Date.now()
        };

        if (brandLogo?.files?.[0]) {
          payload.logoDataUrl = await resizeLogoToDataUrl(brandLogo.files[0]);
          cachedBranding.logoRemoved = false;
        }

        await companyRef.set({ companyName: payload.companyName, updatedAt: Date.now() }, { merge: true });
        await companyRef.collection("branding").doc("main").set(payload, { merge: true });
        cachedBranding = { ...cachedBranding, ...payload };
        COMPANY_NAME = payload.companyName;
        localStorage.setItem("factory_on_call_company_name", COMPANY_NAME);
        localStorage.setItem("factory_on_call_theme", payload.theme);
        if (payload.logoDataUrl) {
          localStorage.setItem("factory_on_call_logo", payload.logoDataUrl);
        } else {
          localStorage.removeItem("factory_on_call_logo");
        }
        applyTheme(payload.theme);
        updateBrandingUI();
        initSidebarLinks();
        alert("Branding saved. The page will reload to apply the selected display mode.");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Could not save branding.");
      }
    });

    brandingResetBtn?.addEventListener("click", () => updateBrandingUI());
    copyPlantCodeBtn?.addEventListener("click", () => copyText(COMPANY_ID));

    document.addEventListener("click", event => {
      const copyBtn = event.target.closest?.("[data-copy-screen]");
      const openBtn = event.target.closest?.("[data-open-screen]");
      if (copyBtn) {
        event.preventDefault();
        copyText(buildScreenUrl(copyBtn.dataset.copyScreen));
      }
      if (openBtn) {
        event.preventDefault();
        window.open(buildScreenUrl(openBtn.dataset.openScreen), "_blank", "noopener");
      }
    });

    logsFilterBtn?.addEventListener("click", renderCallLogs);
    logsClearBtn?.addEventListener("click", () => {
      if (logsSearch) logsSearch.value = "";
      if (logsDateFrom) logsDateFrom.value = "";
      if (logsDateTo) logsDateTo.value = "";
      renderCallLogs();
    });
    logsSearch?.addEventListener("input", renderCallLogs);
    logsDateFrom?.addEventListener("change", renderCallLogs);
    logsDateTo?.addEventListener("change", renderCallLogs);
    exportLogsBtn?.addEventListener("click", exportCallLogsCsv);
    purgeLogsBtn?.addEventListener("click", purgeOldLogs);
    analyticsExportBtn?.addEventListener("click", exportAnalyticsCsv);
    analyticsDateRange?.addEventListener("change", () => {
      updateAnalyticsCustomRangeUI();
      renderAnalytics();
    });
    analyticsApplyRangeBtn?.addEventListener("click", renderAnalytics);
    analyticsStartDate?.addEventListener("change", renderAnalytics);
    analyticsEndDate?.addEventListener("change", renderAnalytics);
    updateAnalyticsCustomRangeUI();

    // Areas
    areaForm?.addEventListener("submit", async e => {
      e.preventDefault();
      if (blockDemoAdminAction("Area management")) return;

      const payload = {
        companyId: COMPANY_ID,
        name: areaName?.value.trim() || "",
        description: areaDescription?.value.trim() || "",
        active: !!areaActive?.checked,
        updatedAt: Date.now()
      };

      if (!payload.name) {
        alert("Area name is required.");
        return;
      }

      try {
        const safeId = makeSafeId(payload.name);
        if (areaId?.value) {
          await areasRef.doc(areaId.value).update(payload);
        } else {
          payload.createdAt = Date.now();
          await areasRef.doc(safeId).set(payload, { merge: true });
        }

        resetAreaForm();
      } catch (err) {
        console.error(err);
        alert("Could not save area.");
      }
    });

    areaFormReset?.addEventListener("click", resetAreaForm);

    areaSearch?.addEventListener("input", () => {
      const q = areaSearch.value.trim().toLowerCase();
      if (!q) {
        renderAreas(cachedAreas);
        return;
      }

      const filtered = cachedAreas.filter(x => {
        const a = x.data;
        return [a.name || "", a.description || ""].join(" ").toLowerCase().includes(q);
      });

      renderAreas(filtered);
    });

    // Stations
    stationForm?.addEventListener("submit", async e => {
      e.preventDefault();
      if (blockDemoAdminAction("Station management")) return;

      const selectedArea = stationArea?.value || "";
      const stationNameValue = stationName?.value.trim() || "";
      const payload = {
        companyId: COMPANY_ID,
        name: stationNameValue,
        area: selectedArea,
        description: stationDescription?.value.trim() || "",
        cells: [stationNameValue].filter(Boolean),
        active: !!selectedArea,
        archived: !selectedArea,
        updatedAt: Date.now()
      };

      if (!payload.name) {
        alert("Station name is required.");
        return;
      }

      if (stationDuplicateExists(payload.name, stationId?.value || "")) {
        alert("A station with this name already exists. Station names must be unique.");
        return;
      }

      if (!selectedArea) {
        alert("Assign an Area before saving a station. This station will be saved as archived until an Area is assigned.");
      }

      try {
        if (stationId?.value) {
          await stationsRef.doc(stationId.value).update(payload);
        } else {
          payload.createdAt = Date.now();
          await stationsRef.add(payload);
        }
        resetStationForm();
      } catch (err) {
        console.error(err);
        alert("Could not save station.");
      }
    });
stationFormReset?.addEventListener("click", resetStationForm);

    btnDownloadStationsTemplate?.addEventListener("click", () => {
      downloadText("factory-on-call-stations-template.csv", stationTemplateCsv(), "text/csv");
    });

    btnExportStationsCsv?.addEventListener("click", () => {
      downloadText("factory-on-call-stations.csv", stationsCsvRows(), "text/csv");
    });

    btnImportStationsCsv?.addEventListener("click", () => stationCsvImport?.click());

    stationCsvImport?.addEventListener("change", async () => {
      try {
        await importStationsCsv(stationCsvImport.files?.[0]);
      } catch (err) {
        console.error(err);
        alert("Could not import stations CSV.");
      } finally {
        stationCsvImport.value = "";
      }
    });

    stationSearch?.addEventListener("input", () => {
      const q = stationSearch.value.trim().toLowerCase();
      if (!q) {
        renderStations(cachedStations);
        return;
      }

      const filtered = cachedStations.filter(x => {
        const s = x.data;
        return [
          s.name || "",
          s.area || "",
          s.description || ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });

      renderStations(filtered);
    });

    // Call Buttons
    cbStation?.addEventListener("change", populateCellsForSelectedStation);

    btnGenerateDynamic?.addEventListener("click", () => {
      const stationIdValue = cbStation?.value;
      const found = cachedStations.find(x => x.id === stationIdValue);
      if (!found) {
        alert("Select a station.");
        return;
      }

      const selectedCells = Array.from(cbCells.selectedOptions).map(o => o.value);
      const url = buildCallUrl(found.data.name || "", selectedCells);

      if (cbOutput) cbOutput.value = url;
    });

    btnCopyOutput?.addEventListener("click", async () => {
      if (!cbOutput?.value) return;
      await copyText(cbOutput.value);
    });

    btnGenerateAllDynamic?.addEventListener("click", () => {
      const stationIdValue = cbAutoStation?.value;
      const found = cachedStations.find(x => x.id === stationIdValue);
      if (!found) {
        alert("Select a station.");
        return;
      }

      const cells = found.data.cells || [];
      const lines = cells.map(cell => buildCallUrl(found.data.name || "", [cell]));
      if (cbAutoOutput) cbAutoOutput.value = lines.join("\n");
    });

    // Roles
    roleSearch?.addEventListener("input", () => {
      renderRoles(cachedRoles);
    });

    roleForm?.addEventListener("submit", async e => {
      e.preventDefault();
      if (blockDemoAdminAction("Role management")) return;

      const values = {};
      permissionCheckboxes.forEach(cb => {
        const perm = cb.getAttribute("data-permission");
        if (!perm) return;
        values[perm] = cb.checked;
      });

      const name = roleName?.value.trim() || "";
      const currentId = roleId?.value || "";

      if (!name) {
        alert("Role name is required.");
        return;
      }

      if (roleNameTaken(name, currentId)) {
        alert(`A role named "${name}" already exists. Use a unique role name, such as Operator 1 or Operator 2.`);
        return;
      }

      const canMakeCalls = !!values.canMakeCalls;
      const isCallable = !!values.callable;
      const respondAny = !!values.respondAny;
      const respondMatching = respondAny ? false : !!values.respondMatching;
      const supervisorPortal = !!values.supervisorPortal;
      const clearEmergency = !!values.clearEmergency;

      const permissions = {
        canMakeCalls,
        makeCall: canMakeCalls,
        viewCalls: true,

        callable: isCallable,
        isCallable,

        respondMatching,
        respondAny,

        // Legacy compatibility for Viewer/Supervisor/older call records.
        acknowledgeCalls: respondMatching,
        acceptCall: respondMatching,
        closeCalls: respondMatching,
        closeCall: respondMatching,
        acknowledgeAllCalls: respondAny,
        closeAllCalls: respondAny,
        viewAllCalls: respondAny || supervisorPortal,
        supervisorPortal,
        clearEmergency,
        canClearEmergency: clearEmergency
      };

      const payload = {
        companyId: COMPANY_ID,
        name,
        permissions,
        canMakeCalls,
        isCallable,
        respondMatching,
        respondAny,
        canAcknowledge: respondMatching || respondAny,
        canClose: respondMatching || respondAny,
        canAcknowledgeAll: respondAny,
        canCloseAll: respondAny,
        supervisorPortal,
        clearEmergency,
        canClearEmergency: clearEmergency,
        active: true,
        archived: false,
        updatedAt: Date.now()
      };

      try {
        if (currentId) {
          await rolesRef.doc(currentId).set(payload, { merge: true });
        } else {
          payload.createdAt = Date.now();
          await rolesRef.add(payload);
        }

        resetRoleForm();
      } catch (err) {
        console.error(err);
        alert("Could not save role.");
      }
    });

    roleFormReset?.addEventListener("click", resetRoleForm);

    // Users
    userUID?.addEventListener("input", () => {
      const uid = userUID.value.trim();
      if (userBadgeCode) {
        const previousAuto = userBadgeCode.dataset.autoValue || "";
        if (!userBadgeCode.value.trim() || userBadgeCode.value.trim() === previousAuto) {
          userBadgeCode.value = uid;
          userBadgeCode.dataset.autoValue = uid;
        }
      }
      if (userPin) {
        const previousAutoPin = userPin.dataset.autoValue || "";
        const nextAutoPin = reverseId(uid);
        if (!userPin.value.trim() || userPin.value.trim() === previousAutoPin) {
          userPin.value = nextAutoPin;
          userPin.dataset.autoValue = nextAutoPin;
        }
      }
    });

    userForm?.addEventListener("submit", async e => {
      e.preventDefault();
      if (blockDemoAdminAction("User management")) return;

      const currentId = userId?.value || "";
      const firstName = userFirstName?.value.trim() || "";
      const lastName = userLastName?.value.trim() || "";
      const uid = userUID?.value.trim() || "";
      const badgeCode = uid;
      const pin = userPin?.value.trim() || reverseId(uid);
      const role = userRole?.value || "";
      const status = userStatus?.value || "active";
      const archived = status === "archived";

      const payload = {
        companyId: COMPANY_ID,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        email: "",
        dept: "",
        role,
        uid,
        employeeNumber: uid,
        badgeCode,
        pin,
        status,
        archived,
        active: !archived,
        updatedAt: Date.now()
      };

      if (!payload.firstName || !payload.lastName) return alert("First and last name are required.");
      if (!payload.role) return alert("Role is required.");
      if (!payload.uid) return alert("User ID is required.");
      if (!payload.pin) return alert("PIN is required.");
      if (userIdTaken(payload.uid, currentId)) return alert(`User ID "${payload.uid}" is already in use.`);
      if (badgeCodeTaken(payload.badgeCode, currentId)) return alert(`Badge Code "${payload.badgeCode}" is already in use.`);

      try {
        const docId = currentId || makeSafeId(payload.uid);
        if (!currentId) payload.createdAt = Date.now();
        await usersRef.doc(docId).set(payload, { merge: true });
        resetUserForm();
      } catch (err) {
        console.error(err);
        alert("Could not save user.");
      }
    });

    userFormReset?.addEventListener("click", resetUserForm);
    userSearch?.addEventListener("input", () => renderUsers(cachedUsers));
    userRoleFilter?.addEventListener("change", () => renderUsers(cachedUsers));

    userSelectAll?.addEventListener("change", () => {
      document.querySelectorAll(".user-badge-check").forEach(cb => cb.checked = !!userSelectAll.checked);
    });

    btnDownloadUsersTemplate?.addEventListener("click", () => downloadText("factory-on-call-users-template.csv", usersCsvTemplate(), "text/csv"));
    btnExportUsersCsv?.addEventListener("click", () => downloadText("factory-on-call-users.csv", usersCsvRows(), "text/csv"));
    btnImportUsersCsv?.addEventListener("click", () => userCsvImport?.click());
    userCsvImport?.addEventListener("change", async () => {
      try { await importUsersCsv(userCsvImport.files?.[0]); }
      catch (err) { console.error(err); alert("Could not import users CSV."); }
      finally { userCsvImport.value = ""; }
    });
    btnPrintSelectedBadges?.addEventListener("click", () => printBadges(selectedBadgeUsers()));
    btnPrintAllBadges?.addEventListener("click", () => printBadges(cachedUsers));
  }



  // ---------- ANALYTICS ----------
  function isClosedStatus(call) {
    const status = String(call.status || "").toLowerCase();
    return status === "closed" || status === "complete" || status === "completed";
  }

  function isAcknowledgedStatus(call) {
    const status = String(call.status || "").toLowerCase();
    return status === "ack" || status === "acknowledged" || isClosedStatus(call);
  }

  function callArea(call) {
    return call.area || call.areaName || "Unassigned";
  }

  function callAckMillis(call) {
    const explicitAck = getMillis(
      call.acknowledgedAt ||
      call.acknowledgedTime ||
      call.ackAt ||
      call.ackTime ||
      call.acceptedAt ||
      call.acceptedTime ||
      call.assignedAt ||
      call.respondedAt ||
      call.responseAt ||
      call.onTheWayAt
    );

    if (explicitAck) return explicitAck;

    // Wait time should measure the response/acknowledgement moment only.
    // Do not fall back to closedAt for closed records, or Avg Wait and
    // Avg Resolution become the same number. Older records without a real
    // acknowledgement timestamp are skipped for wait/SLA metrics.
    if (isAcknowledgedStatus(call) && !isClosedStatus(call)) {
      return getMillis(call.updatedAt || call.timeStarted || call.createdAt || call.requestedAt);
    }

    return 0;
  }

  function minutesBetween(start, end) {
    if (!start || !end || end < start) return null;
    return Math.max(1, Math.round((end - start) / 60000));
  }

  function average(values) {
    const clean = values.filter(v => Number.isFinite(v) && v > 0);
    if (!clean.length) return null;
    return Math.round(clean.reduce((sum, v) => sum + v, 0) / clean.length);
  }

  function incrementMap(map, key, amount = 1) {
    const safeKey = String(key || "Unknown").trim() || "Unknown";
    map.set(safeKey, (map.get(safeKey) || 0) + amount);
  }

  function sortedMapEntries(map) {
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  function maxMapValue(map) {
    return Math.max(1, ...Array.from(map.values()).map(v => Number(v) || 0));
  }

  function renderRankList(container, entries, options = {}) {
    if (!container) return;
    const limit = options.limit || 8;
    const suffix = options.suffix || "calls";
    const empty = options.empty || "No data yet.";
    const max = Math.max(1, options.max || (entries[0]?.[1] || 1));
    const shown = entries.slice(0, limit);

    if (!shown.length) {
      container.innerHTML = `<div class="analytics-empty">${empty}</div>`;
      return;
    }

    container.innerHTML = shown.map(([label, value]) => {
      const pct = Math.max(4, Math.round((Number(value) || 0) / max * 100));
      return `
        <div class="analytics-rank-row">
          <div class="analytics-rank-top">
            <strong>${escapeHtml(label)}</strong>
            <span>${value} ${suffix}</span>
          </div>
          <div class="analytics-bar"><i style="width:${pct}%"></i></div>
        </div>
      `;
    }).join("");
  }

  function severityClass(minutes) {
    const value = Number(minutes) || 0;
    if (value > 15) return "danger";
    if (value >= 5) return "warning";
    return "good";
  }

  function updateAnalyticsCustomRangeUI() {
    if (!analyticsCustomRange) return;
    const isCustom = analyticsDateRange?.value === "custom";
    analyticsCustomRange.hidden = !isCustom;
  }

  function startOfLocalDate(value) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  function endOfLocalDate(value) {
    if (!value) return null;
    const date = new Date(`${value}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  function analyticsRangeBounds() {
    const value = analyticsDateRange?.value || "30";
    if (value === "all") return { start: null, end: null };

    if (value === "custom") {
      let start = startOfLocalDate(analyticsStartDate?.value);
      let end = endOfLocalDate(analyticsEndDate?.value);

      // If the user only fills one side, still filter in the useful direction.
      // If dates are reversed by mistake, swap them instead of showing no data.
      if (start && end && start > end) {
        const temp = start;
        start = startOfLocalDate(analyticsEndDate?.value);
        end = endOfLocalDate(analyticsStartDate?.value);
      }

      return { start, end };
    }

    const now = new Date();
    if (value === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start: start.getTime(), end: null };
    }

    const days = Number(value) || 30;
    return { start: Date.now() - (days * 24 * 60 * 60 * 1000), end: null };
  }

  function callInAnalyticsRange(call) {
    const { start, end } = analyticsRangeBounds();
    const callTime = callStartMillis(call);
    if (!callTime) return false;
    if (start && callTime < start) return false;
    if (end && callTime > end) return false;
    return true;
  }

  function analyticsRangeStartMillis() {
    return analyticsRangeBounds().start;
  }

  function renderDetailList(container, entries, empty = "No data yet.") {
    if (!container) return;
    const shown = entries.slice(0, 5);
    if (!shown.length) {
      container.innerHTML = `<div class="analytics-empty">${empty}</div>`;
      return;
    }

    container.innerHTML = `
      <div class="analytics-detail-table">
        <div class="analytics-detail-header">
          <span>Station</span>
          <span>Personnel</span>
          <span>Area</span>
          <span>Time</span>
        </div>
        ${shown.map(item => {
          const parts = String(item.subtitle || "").split("•").map(v => v.trim());
          return `
            <div class="analytics-detail-data">
              <span><strong>${escapeHtml(item.title)}</strong></span>
              <span>${escapeHtml(parts[0] || "—")}</span>
              <span>${escapeHtml(parts[1] || "—")}</span>
              <span><strong class="analytics-severity analytics-severity-${severityClass(item.minutes)}">${escapeHtml(item.value)}</strong></span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function slaBucket(minutes) {
    if (!Number.isFinite(minutes)) return null;
    if (minutes <= 5) return "Under 5 min";
    if (minutes <= 15) return "5–15 min";
    return "Over 15 min";
  }

  function renderAnalytics() {
    const calls = cachedCalls
      .filter(callInAnalyticsRange)
      .sort((a, b) => (callStartMillis(a) || 0) - (callStartMillis(b) || 0));
    const closedCalls = calls.filter(isClosedStatus);
    const acknowledgedCalls = calls.filter(isAcknowledgedStatus);

    const waitMinutes = acknowledgedCalls
      .map(call => minutesBetween(callStartMillis(call), callAckMillis(call)))
      .filter(v => v !== null);

    const resolutionMinutes = closedCalls
      .map(call => minutesBetween(callStartMillis(call), callClosedMillis(call)))
      .filter(v => v !== null);

    if (analyticsTotalCalls) analyticsTotalCalls.textContent = String(calls.length);
    if (analyticsAvgWait) analyticsAvgWait.textContent = formatDurationMinutes(average(waitMinutes));
    if (analyticsAvgResolution) analyticsAvgResolution.textContent = formatDurationMinutes(average(resolutionMinutes));

    const byStation = new Map();
    const byArea = new Map();
    const byRole = new Map();
    const byUser = new Map();
    const byDay = new Map();
    const byHour = new Map();
    const bySla = new Map();

    const longestWait = [];
    const longestResolution = [];

    calls.forEach(call => {
      incrementMap(byStation, callStation(call));
      incrementMap(byArea, callArea(call));

      const roles = Array.isArray(call.roles) && call.roles.length
        ? call.roles
        : String(callPersonnel(call)).split(",").map(x => x.trim()).filter(Boolean);
      roles.forEach(role => incrementMap(byRole, role));

      const start = callStartMillis(call);
      const ack = callAckMillis(call);
      const closed = callClosedMillis(call);
      const wait = minutesBetween(start, ack);
      const resolution = isClosedStatus(call) ? minutesBetween(start, closed) : null;

      const bucket = slaBucket(wait);
      if (bucket) incrementMap(bySla, bucket);

      if (wait) {
        longestWait.push({
          minutes: wait,
          title: callStation(call),
          subtitle: `${callPersonnel(call)} • ${callArea(call)}`,
          value: formatDurationMinutes(wait)
        });
      }

      if (resolution) {
        longestResolution.push({
          minutes: resolution,
          title: callStation(call),
          subtitle: `${callPersonnel(call)} • ${callArea(call)}`,
          value: formatDurationMinutes(resolution)
        });
      }

      if (start) {
        const d = new Date(start);
        incrementMap(byDay, d.toLocaleDateString([], { weekday: "short" }));
        incrementMap(byHour, d.toLocaleTimeString([], { hour: "numeric" }));
      }
    });

    closedCalls.forEach(call => incrementMap(byUser, assignedTo(call)));

    const hourEntries = sortedMapEntries(byHour);
    const peak = hourEntries[0];
    if (analyticsPeakHour) analyticsPeakHour.textContent = peak ? `${peak[0]} · ${peak[1]} calls` : "—";

    renderRankList(analyticsStationList, sortedMapEntries(byStation), { suffix: "calls", max: maxMapValue(byStation) });
    renderRankList(analyticsAreaList, sortedMapEntries(byArea), { suffix: "calls", max: maxMapValue(byArea) });
    renderRankList(analyticsRoleList, sortedMapEntries(byRole), { suffix: "calls", max: maxMapValue(byRole) });
    renderRankList(analyticsUserList, sortedMapEntries(byUser).filter(([name]) => name !== "—"), { suffix: "closed", max: maxMapValue(byUser), empty: "No closed calls yet." });
    renderRankList(analyticsSlaList, sortedMapEntries(bySla), { suffix: "calls", max: maxMapValue(bySla), empty: "No acknowledged calls yet." });
    renderRankList(analyticsRepeatStationList, sortedMapEntries(byStation).filter(([, count]) => count > 1), { suffix: "calls", max: maxMapValue(byStation), empty: "No repeat stations yet." });
    renderDetailList(analyticsLongestWaitList, longestWait.sort((a, b) => b.minutes - a.minutes), "No acknowledged calls yet.");
    renderDetailList(analyticsLongestResolutionList, longestResolution.sort((a, b) => b.minutes - a.minutes), "No closed calls yet.");
    renderRankList(analyticsDayList, sortedMapEntries(byDay), { suffix: "calls", max: maxMapValue(byDay), limit: 7 });
    renderRankList(analyticsHourList, hourEntries, { suffix: "calls", max: maxMapValue(byHour), limit: 12 });
  }

  function exportAnalyticsCsv() {
    const calls = cachedCalls.filter(callInAnalyticsRange);
    if (!calls.length) {
      alert("No analytics data to export yet.");
      return;
    }

    const rows = [[
      "Time",
      "Station",
      "Area",
      "Personnel Required",
      "Location",
      "Requested By",
      "Status",
      "Assigned To",
      "Wait Time",
      "Resolution Time"
    ]];

    calls.forEach(call => {
      rows.push([
        formatDateTime(callStartMillis(call)),
        callStation(call),
        callArea(call),
        callPersonnel(call),
        callLocation(call),
        requestedBy(call),
        dashboardStatusLabel(call),
        assignedTo(call),
        formatDurationMinutes(minutesBetween(callStartMillis(call), callAckMillis(call))),
        isClosedStatus(call) ? callDurationLabel(call) : "—"
      ]);
    });

    const csv = rows.map(row => row.map(csvSafe).join(",")).join("\n");
    downloadText(`factory-on-call-analytics-${COMPANY_ID}-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
  }

  // ---------- DASHBOARD LIVE DATA ----------
  function getMillis(value) {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.seconds === "number") return value.seconds * 1000;

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function isTodayMillis(ms) {
    if (!ms) return false;
    const d = new Date(ms);
    const now = new Date();
    return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
  }

  function smartElapsed(ms) {
    if (!ms) return "—";

    const totalMinutes = Math.max(0, Math.floor((Date.now() - ms) / 60000));

    if (totalMinutes < 1) return "Just now";
    if (totalMinutes < 60) return `${totalMinutes} min`;

    const totalHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (totalHours < 24) {
      return minutes ? `${totalHours} hr ${minutes} min` : `${totalHours} hr`;
    }

    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days < 7) {
      return hours ? `${days} day${days === 1 ? "" : "s"} ${hours} hr` : `${days} day${days === 1 ? "" : "s"}`;
    }

    const weeks = Math.floor(days / 7);
    return `${weeks} wk${weeks === 1 ? "" : "s"}`;
  }

  function callStartMillis(call) {
    return getMillis(call.timeStarted || call.createdAt || call.requestedAt || call.updatedAt);
  }

  function callClosedMillis(call) {
    return getMillis(call.timeClosed || call.closedAt || call.updatedAt || call.timeStarted || call.createdAt);
  }

  function callStation(call) {
    return call.station || call.stationName || "Unknown station";
  }

  function callPersonnel(call) {
    if (Array.isArray(call.roles) && call.roles.length) return call.roles.join(", ");
    return call.role || call.personnelRequired || "Personnel Required";
  }

  function callLocation(call) {
    if (Array.isArray(call.cells) && call.cells.length) return call.cells.join(", ");
    return call.cell || call.location || "General";
  }

  function dashboardStatusLabel(call) {
    const rawStatus = String(call.status || "waiting").toLowerCase();

    if (rawStatus === "ack" || rawStatus === "acknowledged") return "Acknowledged";
    if (rawStatus === "closed" || rawStatus === "complete" || rawStatus === "completed") return "Closed";

    return "Waiting";
  }

  function dashboardStatusClass(statusLabel) {
    if (statusLabel === "Closed") return "status-closed";
    if (statusLabel === "Acknowledged") return "status-ack";
    return "status-waiting";
  }

  function dashboardRow(call, includeActionClass = "") {
    const statusLabel = dashboardStatusLabel(call);
    const statusClass = dashboardStatusClass(statusLabel);

    return `
      <div class="dashboard-table-row ${includeActionClass}">
        <div class="dashboard-cell station-cell">${callStation(call)}</div>
        <div class="dashboard-cell personnel-cell">${callPersonnel(call)}</div>
        <div class="dashboard-cell location-cell">${callLocation(call)}</div>
        <div class="dashboard-cell time-cell">${smartElapsed(callStartMillis(call))}</div>
        <div class="dashboard-cell status-cell">
          <span class="status-pill ${statusClass}">${statusLabel}</span>
        </div>
      </div>
    `;
  }

  function dashboardHeader() {
    return `
      <div class="dashboard-table-head">
        <div>Station</div>
        <div>Personnel Required</div>
        <div>Location</div>
        <div>Age</div>
        <div>Status</div>
      </div>
    `;
  }

  function renderDashboardCalls(rows) {
    const calls = rows.map(row => ({ id: row.id, ...row.data }));

    const active = calls
      .filter(c => {
        const status = String(c.status || "").toLowerCase();
        return status === "waiting" || status === "ack" || status === "acknowledged";
      })
      .sort((a, b) => callStartMillis(a) - callStartMillis(b));

    const todayCalls = calls.filter(c => isTodayMillis(callStartMillis(c)));

    const closedToday = calls.filter(c => {
      const status = String(c.status || "").toLowerCase();
      return (status === "closed" || status === "complete" || status === "completed")
        && isTodayMillis(callClosedMillis(c));
    });

    if (statTotalCalls) statTotalCalls.textContent = String(todayCalls.length);
    if (statActiveCalls) statActiveCalls.textContent = String(active.length);
    if (statClosedCalls) statClosedCalls.textContent = String(closedToday.length);

    if (dashboardPriorityCall) {
      if (!active.length) {
        dashboardPriorityCall.innerHTML = `<div class="dashboard-empty">No active calls right now.</div>`;
      } else {
        dashboardPriorityCall.innerHTML = `
          <div class="dashboard-table priority-table">
            ${dashboardHeader()}
            ${dashboardRow(active[0], "priority-row")}
          </div>
        `;
      }
    }

    if (recentActivity) {
      const recent = calls
        .slice()
        .sort((a, b) => (callStartMillis(b) || 0) - (callStartMillis(a) || 0))
        .slice(0, 8);

      if (!recent.length) {
        recentActivity.innerHTML = `<div class="dashboard-empty">No recent activity yet.</div>`;
      } else {
        recentActivity.innerHTML = `
          <div class="dashboard-table recent-table">
            ${dashboardHeader()}
            ${recent.map(call => dashboardRow(call)).join("")}
          </div>
        `;
      }
    }
  }

  // ---------- DASHBOARD PLACEHOLDERS ----------
  function initPlaceholders() {
    if (statTotalCalls) statTotalCalls.textContent = "0";
    if (statActiveCalls) statActiveCalls.textContent = "0";
    if (statClosedCalls) statClosedCalls.textContent = "0";
    if (statStations) statStations.textContent = "0";
    if (statPersonnel) statPersonnel.textContent = "0";
    if (statUsers) statUsers.textContent = "0";
    if (dashboardPriorityCall) dashboardPriorityCall.innerHTML = `<div class="muted">No active calls right now.</div>`;
    if (recentActivity) recentActivity.innerHTML = `<div class="muted">No recent activity yet.</div>`;
  }


  // ---------- DASHBOARD TABLE STYLE GUARD ----------
  function ensureDashboardTableStyles() {
    if (document.getElementById("factory-dashboard-table-style-guard")) return;

    const style = document.createElement("style");
    style.id = "factory-dashboard-table-style-guard";
    style.textContent = `
      #tab-dashboard .dashboard-table {
        width: 100% !important;
        display: block !important;
        border: 1px solid rgba(148, 163, 184, 0.18) !important;
        border-radius: 16px !important;
        overflow: hidden !important;
        background: rgba(15, 23, 42, 0.38) !important;
      }

      #tab-dashboard .dashboard-table-head,
      #tab-dashboard .dashboard-table-row {
        display: grid !important;
        grid-template-columns: minmax(160px, 1.45fr) minmax(190px, 1.45fr) minmax(150px, 1.15fr) minmax(110px, 0.8fr) minmax(115px, 0.8fr) !important;
        gap: 14px !important;
        align-items: center !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      #tab-dashboard .dashboard-table-head {
        padding: 10px 16px !important;
        color: var(--text-muted) !important;
        background: rgba(2, 6, 23, 0.5) !important;
        border-bottom: 1px solid rgba(148, 163, 184, 0.14) !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        letter-spacing: 0.13em !important;
        text-transform: uppercase !important;
      }

      #tab-dashboard .dashboard-table-head > div,
      #tab-dashboard .dashboard-table-row > div {
        min-width: 0 !important;
        display: block !important;
      }

      #tab-dashboard .dashboard-table-row {
        min-height: 48px !important;
        padding: 11px 16px !important;
        border-bottom: 1px solid rgba(148, 163, 184, 0.1) !important;
      }

      #tab-dashboard .dashboard-table-row:last-child {
        border-bottom: none !important;
      }

      #tab-dashboard .dashboard-table-row.priority-row {
        border-left: 5px solid #f59e0b !important;
        padding-left: 11px !important;
        background: rgba(245, 158, 11, 0.055) !important;
      }

      #tab-dashboard .dashboard-cell {
        color: var(--text-main) !important;
        font-size: 15px !important;
        line-height: 1.25 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #tab-dashboard .station-cell,
      #tab-dashboard .personnel-cell {
        color: var(--text-strong) !important;
        font-weight: 800 !important;
      }

      #tab-dashboard .time-cell {
        color: var(--text-muted) !important;
        font-weight: 800 !important;
      }

      #tab-dashboard .status-cell {
        display: flex !important;
        justify-content: flex-start !important;
      }

      #tab-dashboard .snapshot-row {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 12px !important;
        margin-top: 8px !important;
      }

      #tab-dashboard .snapshot-item {
        display: flex !important;
        align-items: baseline !important;
        gap: 10px !important;
        min-width: 175px !important;
        padding: 10px 14px !important;
        border: 1px solid rgba(148, 163, 184, 0.16) !important;
        border-radius: 14px !important;
        background: rgba(15, 23, 42, 0.48) !important;
      }

      #tab-dashboard .snapshot-label {
        display: inline !important;
        margin: 0 !important;
        font-size: 12px !important;
        letter-spacing: 0.1em !important;
        text-transform: uppercase !important;
        color: var(--text-muted) !important;
      }

      #tab-dashboard .snapshot-item strong {
        display: inline !important;
        font-size: 22px !important;
        line-height: 1 !important;
        color: var(--text-strong) !important;
      }

      #tab-dashboard .dashboard-note {
        margin-top: 10px !important;
      }

      #tab-dashboard .activity-list {
        display: block !important;
        width: 100% !important;
      }

      @media (max-width: 1000px) {
        #tab-dashboard .dashboard-table-head {
          display: none !important;
        }

        #tab-dashboard .dashboard-table-row {
          grid-template-columns: 1fr !important;
          gap: 6px !important;
        }

        #tab-dashboard .dashboard-cell {
          white-space: normal !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- FIRESTORE LISTENERS ----------
  function initListeners() {
    try {
      areasRef.orderBy("name").onSnapshot(
        snapshot => {
          cachedAreas = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));

          renderAreas(cachedAreas);
          populateAreaOptions();
        },
        err => {
          console.error("Areas listener error:", err);
        }
      );

      stationsRef.orderBy("name").onSnapshot(
        snapshot => {
          setConn(true);

          cachedStations = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));

          renderStations(cachedStations);
          renderAreas(cachedAreas);
          populateDeptOptions();
          if (statStations) statStations.textContent = String(cachedStations.filter(x => stationStatus(x.data) === "Active").length);
        },
        err => {
          console.error("Stations listener error:", err);
          setConn(false);
        }
      );

      rolesRef.orderBy("name").onSnapshot(
        snapshot => {
          cachedRoles = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));

          renderRoles(cachedRoles);
          if (statPersonnel) statPersonnel.textContent = String(cachedRoles.filter(x => x.data.active !== false).length);
        },
        err => {
          console.error("Roles listener error:", err);
        }
      );

      usersRef.onSnapshot(
        snapshot => {
          userRowsFromUsers = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));
          mergeUserSources();
        },
        err => {
          console.error("Users listener error:", err);
          if (usersTableBody) usersTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">Could not load users.</td></tr>`;
        }
      );

      // Legacy support: older Factory On Call builds seeded authorized_pins.
      // Merge them in so old/demo plants still show users while new plants use users.
      authorizedPinsRef.onSnapshot(
        snapshot => {
          userRowsFromPins = snapshot.docs.map(doc => ({
            id: doc.id,
            data: {
              ...doc.data(),
              uid: doc.data().uid || doc.data().employeeNumber || doc.id,
              employeeNumber: doc.data().employeeNumber || doc.data().uid || doc.id,
              badgeCode: doc.data().badgeCode || doc.data().badge || doc.id
            }
          }));
          mergeUserSources();
        },
        err => {
          console.warn("Legacy authorized_pins listener unavailable:", err);
        }
      );

      callsRef.onSnapshot(
        snapshot => {
          const rows = snapshot.docs
            .filter(doc => doc.id !== "_seed_marker")
            .map(doc => ({
              id: doc.id,
              data: doc.data()
            }));

          cachedCalls = rows.map(row => ({ id: row.id, ...row.data }));
          renderDashboardCalls(rows);
          renderCallLogs();
          renderAnalytics();
        },
        err => {
          console.error("Calls dashboard listener error:", err);
        }
      );
    } catch (err) {
      console.error("Listener setup failed:", err);
      setConn(false);
    }
  }



  function installThemeRepaintObserver() {
    let repaintQueued = false;
    const queue = () => {
      if (repaintQueued) return;
      repaintQueued = true;
      requestAnimationFrame(() => {
        repaintQueued = false;
        forceAdminThemePaint(cachedBranding?.theme || localStorage.getItem("factory_on_call_theme") || "dark");
      });
    };
    const target = document.getElementById("app-root") || document.body;
    if (target) new MutationObserver(queue).observe(target, { childList: true, subtree: true });
  }



  // ---------- MOBILE ADMIN DRAWER ----------
  function initMobileAdminDrawer() {
    const menuBtn = document.getElementById("mobileMenuBtn");
    const backdrop = document.getElementById("sidebarBackdrop");
    const sidebar = document.getElementById("adminSidebar") || document.querySelector(".sidebar");

    function setOpen(open) {
      document.body.classList.toggle("sidebar-open", !!open);
      if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
        menuBtn.textContent = open ? "×" : "☰";
        menuBtn.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      }
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        setOpen(!document.body.classList.contains("sidebar-open"));
      });
    }

    if (backdrop) {
      backdrop.addEventListener("click", () => setOpen(false));
    }

    if (sidebar) {
      sidebar.addEventListener("click", event => {
        const target = event.target;
        if (target && target.closest && target.closest(".nav-item")) {
          if (window.matchMedia("(max-width: 1100px)").matches) {
            setOpen(false);
          }
        }
      });
    }

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", () => {
      if (!window.matchMedia("(max-width: 1100px)").matches) {
        setOpen(false);
      }
    });
  }

  // ---------- BOOT ----------
  async function boot() {
    ensureDashboardTableStyles();
    setConn(false);
    await loadCompanyBranding();
    renderDemoNoticeIfNeeded();
    initTabs();
    initMobileAdminDrawer();
    installThemeRepaintObserver();
    forceAdminThemePaint(cachedBranding?.theme || localStorage.getItem("factory_on_call_theme") || "dark");
    initSidebarLinks();
    initPlaceholders();
    initEmergencySettings();
    wireEvents();
    initListeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

// Mobile Safari date inputs can render empty date fields as blank boxes.
// Keep a class on the Call Logs date labels so CSS can show/hide the fake placeholder.
(function wireMobileCallLogDatePlaceholders() {
  function refresh() {
    document.querySelectorAll('#tab-logs .log-date-field').forEach((field) => {
      const input = field.querySelector('input[type="date"]');
      if (!input) return;
      field.classList.toggle('has-value', Boolean(input.value));
      input.addEventListener('input', () => field.classList.toggle('has-value', Boolean(input.value)), { once: false });
      input.addEventListener('change', () => field.classList.toggle('has-value', Boolean(input.value)), { once: false });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  } else {
    refresh();
  }
})();

// PATCH 137: iPhone Chrome/Safari native date inputs can overflow the Call Logs card.
// Use mobile-only text date fields for Call Logs; filtering still receives yyyy-mm-dd values.
(function installMobileCallLogTextDates() {
  function apply() {
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    document.querySelectorAll('#logsDateFrom, #logsDateTo').forEach((input) => {
      if (!input) return;
      if (isMobile) {
        if (input.type !== 'text') input.type = 'text';
        input.classList.add('mobile-log-date-text');
        input.setAttribute('placeholder', 'yyyy-mm-dd');
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('pattern', '\\d{4}-\\d{2}-\\d{2}');
      } else {
        input.classList.remove('mobile-log-date-text');
        input.removeAttribute('inputmode');
        input.removeAttribute('pattern');
        input.removeAttribute('autocomplete');
        input.removeAttribute('placeholder');
        if (input.type !== 'date') input.type = 'date';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
})();
