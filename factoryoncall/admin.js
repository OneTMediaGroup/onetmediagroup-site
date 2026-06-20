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
      callbuttons: "Access Links",
      logs: "Call Logs",
      users: "Users",
      stations: "Stations",
      roles: "Personnel Required",
      branding: "Branding",
      settings: "System Settings",
      analytics: "Analytics"
    };
    return map[tabName] || tabName;
  }

  function tabSubtitle(tabName) {
    const map = {
      dashboard: "Live overview of your factory call system.",
      callbuttons: "Generate and open live access links for call stations, viewer screens, and display boards.",
      logs: "Review and export call history.",
      users: "Manage users and login credentials.",
      stations: "Manage factory call stations.",
      roles: "Configure personnel types and permissions.",
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
  function buildCallUrl(stationName, cells) {
    const base = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "call.html")}`;
    const params = new URLSearchParams({
      companyId: COMPANY_ID,
      station: stationName || "",
      cells: Array.isArray(cells) ? cells.join(",") : "",
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
    const displayLink = document.getElementById("sidebarDisplayLink");

    if (viewerLink) viewerLink.href = buildScreenUrl("viewer.html");
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
  const stationsTableBody = document.getElementById("stationsTableBody");
  const stationSearch = document.getElementById("stationSearch");
  const stationForm = document.getElementById("stationForm");
  const stationId = document.getElementById("stationId");
  const stationName = document.getElementById("stationName");
  const stationDescription = document.getElementById("stationDescription");
  const stationCells = document.getElementById("stationCells");
  const stationActive = document.getElementById("stationActive");
  const stationFormTitle = document.getElementById("stationFormTitle");
  const stationFormReset = document.getElementById("stationFormReset");

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


  // ---------- STATIONS ----------
  function renderStations(rows) {
    if (!stationsTableBody) return;

    stationsTableBody.innerHTML = "";

    rows.forEach(row => {
      const s = row.data;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name || ""}</td>
        <td>${s.description || ""}</td>
        <td>${Array.isArray(s.cells) ? s.cells.join(", ") : ""}</td>
        <td>${s.active ? "Yes" : "No"}</td>
        <td>
          <button class="btn small secondary edit-station-btn" data-id="${row.id}">Edit</button>
          <button class="btn small copy-station-link-btn" data-url="${buildCallUrl(s.name || "", s.cells || [])}">Copy Link</button>
          <button class="btn small secondary open-station-link-btn" data-url="${buildCallUrl(s.name || "", s.cells || [])}">Open</button>
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

        const s = found.data;
        if (stationId) stationId.value = found.id;
        if (stationName) stationName.value = s.name || "";
        if (stationDescription) stationDescription.value = s.description || "";
        if (stationCells) stationCells.value = Array.isArray(s.cells) ? s.cells.join(",") : "";
        if (stationActive) stationActive.checked = !!s.active;
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
  }

  function resetStationForm() {
    if (stationForm) stationForm.reset();
    if (stationId) stationId.value = "";
    if (stationFormTitle) stationFormTitle.textContent = "Add Station";
    if (stationActive) stationActive.checked = true;
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

  // ---------- ROLES ----------
  function renderRoles(rows) {
    if (!rolesTableBody) return;

    rolesTableBody.innerHTML = "";

    rows.forEach(row => {
      const r = row.data;
      const permissions = Object.entries(r.permissions || {})
        .filter(([, value]) => !!value)
        .map(([key]) => key)
        .join(", ");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.name || ""}${r.isCallable ? " (Callable)" : ""}</td>
        <td>${permissions || "—"}</td>
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
          cb.checked = !!(r.permissions && r.permissions[perm]);
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
      cb.checked = false;
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
    if (!userDept) return;

    const currentValue = userDept.value;
    const deptSet = new Set();

    cachedStations.forEach(row => {
      const desc = row.data.description || "";
      if (desc) deptSet.add(desc);
    });

    userDept.innerHTML = "";

    Array.from(deptSet)
      .sort((a, b) => a.localeCompare(b))
      .forEach(dept => {
        const opt = document.createElement("option");
        opt.value = dept;
        opt.textContent = dept;
        userDept.appendChild(opt);
      });

    if (currentValue) userDept.value = currentValue;
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

    // Stations
    stationForm?.addEventListener("submit", async e => {
      e.preventDefault();
      if (blockDemoAdminAction("Station management")) return;

      const payload = {
        companyId: COMPANY_ID,
        name: stationName?.value.trim() || "",
        description: stationDescription?.value.trim() || "",
        cells: (stationCells?.value || "")
          .split(",")
          .map(x => x.trim())
          .filter(Boolean),
        active: !!stationActive?.checked,
        updatedAt: Date.now()
      };

      if (!payload.name) {
        alert("Station name is required.");
        return;
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
          s.description || "",
          Array.isArray(s.cells) ? s.cells.join(" ") : ""
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
    roleForm?.addEventListener("submit", async e => {
      e.preventDefault();
      if (blockDemoAdminAction("Role management")) return;

      const permissions = {};
      permissionCheckboxes.forEach(cb => {
        const perm = cb.getAttribute("data-permission");
        if (!perm) return;
        permissions[perm] = cb.checked;
      });

      const payload = {
        companyId: COMPANY_ID,
        name: roleName?.value.trim() || "",
        permissions,
        isCallable: !!permissions.makeCall,
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
      stationsRef.orderBy("name").onSnapshot(
        snapshot => {
          setConn(true);

          cachedStations = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));

          renderStations(cachedStations);
          populateCallButtonStations(cachedStations);
          populateDeptOptions();
          if (statStations) statStations.textContent = String(cachedStations.filter(x => x.data.active !== false).length);
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
