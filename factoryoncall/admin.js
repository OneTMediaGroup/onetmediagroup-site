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
  const callsRef = companyRef.collection("calls");
  const activityRef = companyRef.collection("activity");

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
      settings: "System Settings",
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
      branding: "Customize branding and color system.",
      settings: "Adjust system-wide behavior.",
      analytics: "Analyze performance and usage trends."
    };
    return map[tabName] || "";
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
      area: areaName || "",
      companyName: COMPANY_NAME
    });
    return `${base}?${params.toString()}`;
  }

  function buildScreenUrl(pageName) {
    const base = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, pageName)}`;
    const params = new URLSearchParams({
      companyId: COMPANY_ID,
      companyName: COMPANY_NAME
    });
    return `${base}?${params.toString()}`;
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
  const userPin = document.getElementById("userPin");
  const userActive = document.getElementById("userActive");
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

  const permissionCheckboxes = document.querySelectorAll("input[data-permission]");

  let cachedAreas = [];
  let cachedStations = [];
  let cachedRoles = [];
  let cachedUsers = [];
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
    const split = splitName(u.name || "");

    return {
      ...u,
      firstName: u.firstName || split.firstName || "",
      lastName: u.lastName || split.lastName || "",
      uid: u.uid || u.employeeNumber || row.id || "",
      email: u.email || "",
      dept: u.dept || "",
      role: u.role || "",
      pin: u.pin || "",
      active: u.active !== false
    };
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

      COMPANY_MODE = rootData.mode || "production";
      ADMIN_LOCKED = rootData.adminLocked === true || rootData.isDemo === true || COMPANY_MODE === "demo";

      COMPANY_NAME =
        branding.companyName ||
        rootData.companyName ||
        localStorage.getItem("factory_on_call_company_name") ||
        "Factory On Call";

      localStorage.setItem("factory_on_call_company_name", COMPANY_NAME);
    } catch (error) {
      console.warn("Could not load company branding:", error);
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
      callable: "Callable",
      acknowledgeCalls: "Acknowledge",
      acceptCall: "Acknowledge",
      closeCall: "Close",
      closeCalls: "Close",
      supervisorPortal: "Supervisor Portal",
      viewAllCalls: "View All Calls",
      makeCall: "Make Call",
      viewCalls: "View Calls"
    };
    return map[key] || String(key).replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
  }

  function legacyPermissionTrue(role = {}, keys = []) {
    const permissions = role.permissions || {};
    return keys.some(key => role[key] === true || permissions[key] === true);
  }

  function roleIsCallable(role = {}) {
    const permissions = role.permissions || {};
    if (typeof role.isCallable === "boolean") return role.isCallable;
    return permissions.callable === true || permissions.makeCall === true || permissions.viewCalls === true || permissions.acknowledgeCalls === true || permissions.acceptCall === true || permissions.closeCall === true || permissions.closeCalls === true;
  }

  function roleCanAcknowledge(role = {}) {
    return legacyPermissionTrue(role, ["acknowledgeCalls", "acceptCall", "supervisorPortal", "viewAllCalls"]);
  }

  function roleCanClose(role = {}) {
    return legacyPermissionTrue(role, ["closeCalls", "closeCall", "supervisorPortal", "viewAllCalls"]);
  }

  function roleHasSupervisorPortal(role = {}) {
    return legacyPermissionTrue(role, ["supervisorPortal", "viewAllCalls"]);
  }

  // ---------- ROLES ----------
  function renderRoles(rows) {
    if (!rolesTableBody) return;

    const searchValue = (roleSearch?.value || "").trim().toLowerCase();

    const filteredRows = rows
      .slice()
      .sort((a, b) => (a.data.name || "").localeCompare(b.data.name || ""))
      .filter(row => {
        if (!searchValue) return true;
        const r = row.data || {};
        return [
          r.name || "",
          roleIsCallable(r) ? "callable" : "",
          roleCanAcknowledge(r) ? "acknowledge" : "",
          roleCanClose(r) ? "close" : "",
          roleHasSupervisorPortal(r) ? "supervisor portal" : ""
        ].join(" ").toLowerCase().includes(searchValue);
      });

    rolesTableBody.innerHTML = "";

    filteredRows.forEach(row => {
      const r = row.data || {};
      const badges = [];
      if (roleCanAcknowledge(r)) badges.push("Can Acknowledge");
      if (roleCanClose(r)) badges.push("Can Close");
      if (roleHasSupervisorPortal(r)) badges.push("Supervisor Portal");

      const badgeHtml = badges.length
        ? badges.map(label => `<span class="permission-pill">${label}</span>`).join("")
        : `<span class="muted">No response access</span>`;

      const callable = roleIsCallable(r);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${r.name || ""}</strong></td>
        <td><span class="status-pill ${callable ? "active" : "waiting"}">${callable ? "Yes" : "No"}</span></td>
        <td><div class="permission-pill-wrap">${badgeHtml}</div></td>
        <td>
          <button class="btn small secondary edit-role-btn" data-id="${row.id}">Edit</button>
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

        const r = found.data;
        if (roleId) roleId.value = found.id;
        if (roleName) roleName.value = r.name || "";
        if (roleFormTitle) roleFormTitle.textContent = "Edit Role";

        permissionCheckboxes.forEach(cb => {
          const perm = cb.getAttribute("data-permission");
          if (perm === "callable") {
            cb.checked = roleIsCallable(r);
          } else if (perm === "acknowledgeCalls") {
            cb.checked = roleCanAcknowledge(r);
          } else if (perm === "closeCalls") {
            cb.checked = roleCanClose(r);
          } else if (perm === "supervisorPortal") {
            cb.checked = roleHasSupervisorPortal(r);
          } else {
            cb.checked = !!(r.permissions && r.permissions[perm]);
          }
        });

        activateTab("roles");
      };
    });
  }

  function resetRoleForm() {
    if (roleForm) roleForm.reset();
    if (roleId) roleId.value = "";
    if (roleFormTitle) roleFormTitle.textContent = "Add Role";
    permissionCheckboxes.forEach(cb => {
      cb.checked = cb.getAttribute("data-permission") === "callable";
    });
  }

  function populateRoleOptions() {
    if (!userRole) return;

    const currentValue = userRole.value;
    userRole.innerHTML = "";

    cachedRoles
      .slice()
      .sort((a, b) => (a.data.name || "").localeCompare(b.data.name || ""))
      .forEach(row => {
        const opt = document.createElement("option");
        opt.value = row.data.name || "";
        opt.textContent = row.data.name || "";
        userRole.appendChild(opt);
      });

    if (currentValue) userRole.value = currentValue;
  }

  // ---------- USERS ----------
  function populateDeptOptions() {
    populateAreaOptions();
  }

  function renderUsers(rows) {
    if (!usersTableBody) return;

    usersTableBody.innerHTML = "";

    normalizeRows(rows).forEach(row => {
      const u = row.data;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.firstName || ""}</td>
        <td>${u.lastName || ""}</td>
        <td>${u.uid || u.email || ""}</td>
        <td>${u.dept || ""}</td>
        <td>${u.role || ""}</td>
        <td>${u.active ? "Yes" : "No"}</td>
        <td>
          <button class="btn small secondary edit-user-btn" data-id="${row.id}">Edit</button>
        </td>
      `;
      usersTableBody.appendChild(tr);
    });

    wireUserTableButtons();
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
        if (userDept) userDept.value = u.dept || "";
        if (userRole) userRole.value = u.role || "";
        if (userUID) userUID.value = u.uid || "";
        if (userPin) userPin.value = u.pin || "";
        if (userActive) userActive.checked = u.active !== false;
        if (userFormTitle) userFormTitle.textContent = "Edit User";
        activateTab("users");
      };
    });
  }

  function resetUserForm() {
    if (userForm) userForm.reset();
    if (userId) userId.value = "";
    if (userFormTitle) userFormTitle.textContent = "Add User";
    if (userActive) userActive.checked = true;
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


  // ---------- EVENT WIRING ----------
  function wireEvents() {
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

      const canAck = !!values.acknowledgeCalls || !!values.supervisorPortal;
      const canClose = !!values.closeCalls || !!values.supervisorPortal;
      const isCallable = values.callable !== false;

      const permissions = {
        callable: isCallable,
        makeCall: true,
        viewCalls: true,
        acknowledgeCalls: canAck,
        acceptCall: canAck,
        closeCalls: canClose,
        closeCall: canClose,
        supervisorPortal: !!values.supervisorPortal,
        viewAllCalls: !!values.supervisorPortal
      };

      const payload = {
        companyId: COMPANY_ID,
        name: roleName?.value.trim() || "",
        permissions,
        isCallable,
        canAcknowledge: canAck,
        canClose: canClose,
        supervisorPortal: !!values.supervisorPortal,
        active: true,
        updatedAt: Date.now()
      };

      if (!payload.name) {
        alert("Role name is required.");
        return;
      }

      try {
        if (roleId?.value) {
          await rolesRef.doc(roleId.value).update(payload);
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
    userForm?.addEventListener("submit", async e => {
      e.preventDefault();
      if (blockDemoAdminAction("User management")) return;

      const firstName = userFirstName?.value.trim() || "";
      const lastName = userLastName?.value.trim() || "";
      const uid = userUID?.value.trim() || "";

      const payload = {
        companyId: COMPANY_ID,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        email: "",
        dept: userDept?.value || "",
        role: userRole?.value || "",
        uid,
        employeeNumber: uid,
        pin: userPin?.value.trim() || "",
        active: !!userActive?.checked,
        updatedAt: Date.now()
      };

      if (!payload.firstName || !payload.lastName) {
        alert("First and last name are required.");
        return;
      }

      if (!payload.uid) {
        alert("User ID is required.");
        return;
      }

      if (!payload.pin) {
        alert("PIN is required.");
        return;
      }

      try {
        const docId = userId?.value || makeSafeId(payload.uid);

        if (userId?.value) {
          await usersRef.doc(docId).update(payload);
        } else {
          payload.createdAt = Date.now();
          await usersRef.doc(docId).set(payload, { merge: true });
        }

        resetUserForm();
      } catch (err) {
        console.error(err);
        alert("Could not save user.");
      }
    });

    userFormReset?.addEventListener("click", resetUserForm);

    userSearch?.addEventListener("input", () => {
      const q = userSearch.value.trim().toLowerCase();
      if (!q) {
        renderUsers(cachedUsers);
          if (statUsers) statUsers.textContent = String(cachedUsers.filter(x => x.data.active !== false).length);
        return;
      }

      const filtered = normalizeRows(cachedUsers).filter(x => {
        const u = x.data;
        return [
          u.firstName || "",
          u.lastName || "",
          u.email || "",
          u.dept || "",
          u.role || "",
          u.uid || "",
          u.employeeNumber || "",
          u.name || ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });

      renderUsers(filtered);
    });
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
          cachedUsers = normalizeRows(snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }))).sort((a, b) => {
            const an = `${a.data.firstName || ""} ${a.data.lastName || ""}`.trim();
            const bn = `${b.data.firstName || ""} ${b.data.lastName || ""}`.trim();
            return an.localeCompare(bn);
          });

          renderUsers(cachedUsers);
          if (statUsers) statUsers.textContent = String(cachedUsers.filter(x => x.data.active !== false).length);
        },
        err => {
          console.error("Users listener error:", err);
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

  // ---------- BOOT ----------
  async function boot() {
    ensureDashboardTableStyles();
    setConn(false);
    await loadCompanyBranding();
    renderDemoNoticeIfNeeded();
    initTabs();
    initSidebarLinks();
    initPlaceholders();
    wireEvents();
    initListeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
