/* -------------------------------------------------
   FACTORY ON CALL — VIEWER
   Shared viewer with action authorization
-------------------------------------------------- */
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

(async function () {
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
  const callsRef = companyRef.collection("calls");
  const usersRef = companyRef.collection("users");
  const rolesRef = companyRef.collection("roles");
  const areasRef = companyRef.collection("areas");
  const stationsRef = companyRef.collection("stations");

  const activeCalls = document.getElementById("activeCalls");
  const connDot = document.getElementById("connDot");
  const connLabel = document.getElementById("connLabel");
  const sbActive = document.getElementById("sbActive");
  const sbWaiting = document.getElementById("sbWaiting");
  const sbOnWay = document.getElementById("sbOnWay");
  const sbClosed = document.getElementById("sbClosed");
  const callSearch = document.getElementById("callSearch");
  const areaFilter = document.getElementById("areaFilter");
  const personnelFilter = document.getElementById("personnelFilter");
  const statusFilter = document.getElementById("statusFilter");
  const authModal = document.getElementById("authModal");
  const authTitle = document.getElementById("authTitle");
  const authSummary = document.getElementById("authSummary");
  const authUserId = document.getElementById("authUserId");
  const authPin = document.getElementById("authPin");
  const authError = document.getElementById("authError");
  const authCancel = document.getElementById("authCancel");
  const authSubmit = document.getElementById("authSubmit");

  let allCallsCache = [];
  let allRolesCache = [];
  let allAreasCache = [];
  let pendingAction = null;

  function escapeHtml(value = "") {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setConn(ok) {
    if (connDot) connDot.style.background = ok ? "#22c55e" : "#ef4444";
    if (connLabel) connLabel.textContent = ok ? "Online" : "Offline";
  }

  function formatElapsedFromMs(ts) {
    if (!ts) return "Just now";

    const totalMinutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));

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
    const remDays = days % 7;

    return remDays ? `${weeks} wk${weeks === 1 ? "" : "s"} ${remDays} day${remDays === 1 ? "" : "s"}` : `${weeks} wk${weeks === 1 ? "" : "s"}`;
  }

  function isToday(ts) {
    if (!ts) return false;
    const d = new Date(ts);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  function splitName(fullName = "") {
    const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
    return { firstName: parts.shift() || "", lastName: parts.join(" ") };
  }

  function normalizeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") {
      return value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  function roleNameFromCall(call = {}) {
    return normalizeList(call.roles)[0] || call.role || call.personnel || "Support";
  }

  function callArea(call = {}) {
    return call.area || call.areaName || call.stationArea || call.location || normalizeList(call.cells)[0] || "Unassigned";
  }

  function callStationName(call = {}) {
    return String(call.station || call.stationName || "").trim();
  }

  function isDisplayableCall(call = {}) {
    const station = callStationName(call);
    if (!station || station.toLowerCase() === "unknown station" || station.toLowerCase() === "unknownstation") {
      return false;
    }
    return true;
  }

  function statusLabel(status) {
    if (status === "ack") return "Acknowledged";
    if (status === "closed") return "Closed";
    return "Waiting";
  }

  function statusClass(status) {
    if (status === "ack") return "status-onway";
    if (status === "closed") return "status-closed";
    return "status-waiting";
  }

  function rolePermissions(role = {}) {
    return role.permissions || {};
  }

  function boolPerm(role, keys) {
    const p = rolePermissions(role);
    return keys.some(k => role[k] === true || p[k] === true);
  }

  function userDisplayName(user = {}) {
    const split = splitName(user.name || user.fullName || "");
    const first = user.firstName || split.firstName || "";
    const last = user.lastName || split.lastName || "";
    return `${first} ${last}`.trim() || user.name || user.uid || user.employeeNumber || "User";
  }

  function normalizeUser(user = {}, id = "") {
    const split = splitName(user.name || user.fullName || "");
    const uid = String(user.uid || user.userId || user.employeeNumber || user.employeeId || id || "").trim();
    const archived = user.archived === true || String(user.status || "").toLowerCase() === "archived" || user.active === false;
    return {
      id,
      ...user,
      firstName: user.firstName || split.firstName || "",
      lastName: user.lastName || split.lastName || "",
      uid,
      employeeNumber: uid,
      pin: String(user.pin || ""),
      role: user.role || user.personnelRole || user.type || "",
      archived,
      active: !archived
    };
  }

  function roleForUser(user = {}) {
    const roleName = String(user.role || "").trim().toLowerCase();
    return allRolesCache.find(r => String(r.name || "").trim().toLowerCase() === roleName) || null;
  }

  function canUserRespondToCall(user, role, call) {
    if (!user || !role || user.active === false || user.archived === true) return false;
    if (boolPerm(role, ["respondAny", "supervisorPortal", "viewAllCalls", "acknowledgeAllCalls", "closeAllCalls"])) return true;
    const callRole = roleNameFromCall(call).trim().toLowerCase();
    const userRole = String(user.role || "").trim().toLowerCase();
    return boolPerm(role, ["respondMatching", "acknowledgeCalls", "acceptCall", "closeCalls", "closeCall", "canAcknowledge", "canClose"]) && callRole === userRole;
  }

  async function authorizeAction(call, action) {
    const userId = String(authUserId?.value || "").trim();
    const pin = String(authPin?.value || "").trim();

    if (!userId || !pin) {
      throw new Error("Enter both User ID and PIN.");
    }

    const snap = await usersRef.get();
    const users = snap.docs.map(d => normalizeUser(d.data() || {}, d.id));
    const user = users.find(u =>
      [u.uid, u.userId, u.employeeNumber, u.employeeId, u.badgeCode, u.id]
        .map(v => String(v || "").trim())
        .includes(userId)
    );

    if (!user || user.active === false || user.archived === true) {
      throw new Error("User not found or inactive.");
    }

    if (String(user.pin || "") !== pin) {
      throw new Error("Invalid PIN.");
    }

    const role = roleForUser(user);
    if (!canUserRespondToCall(user, role, call)) {
      throw new Error("This user does not have permission for this call.");
    }

    return { user, role, userName: userDisplayName(user) };
  }

  function normalizeBrandingTheme(value) {
    const v = String(value || "dark").toLowerCase();
    return (v === "light" || v === "bright" || v === "neutral") ? "light" : "dark";
  }

  function applyCompanyBranding(branding = {}, rootData = {}) {
    const companyName = (branding.companyName !== undefined ? branding.companyName : (rootData.companyName !== undefined ? rootData.companyName : (localStorage.getItem("factory_on_call_company_name") || "")));
    const rawLogo = branding.logoDataUrl || branding.logoUrl || "";
    const hasCustomLogo = Boolean(rawLogo) && !String(rawLogo).includes("factory_logo.png") && !String(rawLogo).includes("headerLogo.png");
    const logo = hasCustomLogo ? rawLogo : "";
    const theme = normalizeBrandingTheme(branding.theme || branding.displayMode || localStorage.getItem("factory_on_call_theme") || "dark");

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("theme-light", theme === "light");
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    if (document.body) {
      document.body.dataset.theme = theme;
      document.body.classList.toggle("theme-light", theme === "light");
      document.body.classList.toggle("theme-dark", theme === "dark");
    }

    const nameEl = document.querySelector(".vh-company-name");
    if (nameEl) nameEl.textContent = companyName;
    document.querySelectorAll(".vh-logo").forEach(img => { img.src = logo; img.style.display = hasCustomLogo ? "block" : "none"; });
    document.querySelectorAll(".vh-title").forEach(el => { el.style.display = "none"; });

    if (companyName) localStorage.setItem("factory_on_call_company_name", companyName); else localStorage.removeItem("factory_on_call_company_name");
    localStorage.setItem("factory_on_call_theme", theme);
    if (hasCustomLogo) {
      localStorage.setItem("factory_on_call_logo", logo);
    } else {
      localStorage.removeItem("factory_on_call_logo");
    }
  }

  async function loadCompanyBranding() {
    try {
      const rootSnap = await companyRef.get();
      const rootData = rootSnap.exists ? rootSnap.data() || {} : {};
      const brandingSnap = await companyRef.collection("branding").doc("main").get().catch(() => null);
      const branding = brandingSnap && brandingSnap.exists ? brandingSnap.data() || {} : {};
      applyCompanyBranding(branding, rootData);
    } catch (error) {
      console.warn("Could not load viewer branding:", error);
    }
  }

  function listenForBrandingUpdates() {
    companyRef.collection("branding").doc("main").onSnapshot(snapshot => {
      if (!snapshot.exists) return;
      applyCompanyBranding(snapshot.data() || {});
    }, error => console.warn("Branding listener unavailable:", error));
  }

  async function loadRolesAndFilters() {
    try {
      const [rolesSnap, areaSnap, stationSnap] = await Promise.all([
        rolesRef.get(),
        areasRef.get().catch(() => ({ docs: [] })),
        stationsRef.get().catch(() => ({ docs: [] }))
      ]);

      allRolesCache = rolesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const areaNames = new Set();
      areaSnap.docs
        .map(d => d.data() || {})
        .filter(a => a.active !== false)
        .forEach(a => { if (a.name) areaNames.add(String(a.name)); });

      stationSnap.docs
        .map(d => d.data() || {})
        .forEach(station => {
          const areaName = station.area || station.areaName || station.stationArea;
          if (areaName) areaNames.add(String(areaName));
        });

      allCallsCache.forEach(call => {
        const areaName = callArea(call);
        if (areaName && areaName !== "Unassigned") areaNames.add(String(areaName));
      });

      allAreasCache = Array.from(areaNames).sort((a, b) => a.localeCompare(b));

      if (areaFilter) {
        const current = areaFilter.value || "";
        areaFilter.innerHTML = `<option value="">All Areas</option>` +
          allAreasCache.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
        areaFilter.value = current;
      }

      if (personnelFilter) {
        const current = personnelFilter.value || "";
        const roleNames = new Set();
        allRolesCache
          .filter(r => r.archived !== true && r.active !== false)
          .forEach(r => {
            if (r.name) roleNames.add(String(r.name));
          });
        allCallsCache.forEach(c => roleNames.add(roleNameFromCall(c)));
        const sorted = Array.from(roleNames).filter(Boolean).sort((a, b) => a.localeCompare(b));
        personnelFilter.innerHTML = `<option value="">All Personnel</option>` +
          sorted.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
        personnelFilter.value = current;
      }
    } catch (error) {
      console.warn("Could not load viewer filters:", error);
    }
  }

  function openAuthModal(action, callId) {
    const call = allCallsCache.find(c => c.id === callId);
    if (!call) return;

    pendingAction = { action, callId };
    if (authTitle) authTitle.textContent = action === "close" ? "Close Call" : "Acknowledge Call";
    if (authSummary) {
      authSummary.textContent = `${action === "close" ? "Close" : "Acknowledge"} ${callStationName(call)} — ${roleNameFromCall(call)}. Enter your User ID and PIN.`;
    }
    if (authError) authError.textContent = "";
    if (authUserId) authUserId.value = "";
    if (authPin) authPin.value = "";
    if (authModal) {
      authModal.classList.add("open");
      authModal.setAttribute("aria-hidden", "false");
    }
    setTimeout(() => authUserId?.focus(), 50);
  }

  function closeAuthModal() {
    pendingAction = null;
    if (authModal) {
      authModal.classList.remove("open");
      authModal.setAttribute("aria-hidden", "true");
    }
    if (authError) authError.textContent = "";
  }

  async function submitAuthAction() {
    if (!pendingAction) return;
    const call = allCallsCache.find(c => c.id === pendingAction.callId);
    if (!call) {
      closeAuthModal();
      return;
    }

    try {
      if (authSubmit) authSubmit.disabled = true;
      if (authError) authError.textContent = "";
      const auth = await authorizeAction(call, pendingAction.action);
      const ref = callsRef.doc(pendingAction.callId);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Call no longer exists.");
      const data = snap.data() || {};

      if (pendingAction.action === "ack") {
        await ref.update({
          status: "ack",
          ackBy: auth.userName,
          assignedTo: auth.userName,
          ackByUid: auth.user.uid || auth.user.employeeNumber || auth.user.id || "",
          timeAck: Date.now()
        });
      }

      if (pendingAction.action === "close") {
        const timeClosed = Date.now();
        const duration = data.timeStarted ? Math.max(1, Math.round((timeClosed - data.timeStarted) / 60000)) : null;
        await ref.update({
          status: "closed",
          closedBy: auth.userName,
          closedByUid: auth.user.uid || auth.user.employeeNumber || auth.user.id || "",
          timeClosed,
          duration
        });
      }

      closeAuthModal();
    } catch (error) {
      if (authError) authError.textContent = error.message || "Authorization failed.";
    } finally {
      if (authSubmit) authSubmit.disabled = false;
    }
  }

  function renderCallList(calls) {
    if (!activeCalls) return;

    activeCalls.innerHTML = `
      <div class="call-table-header" aria-hidden="true">
        <span>Station</span>
        <span>Personnel Required</span>
        <span>Area</span>
        <span>Waiting</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
    `;

    if (!calls.length) {
      activeCalls.insertAdjacentHTML("beforeend", `
        <div class="empty-state">
          <div class="empty-title">No Active Calls</div>
          <div class="empty-subtitle">No calls match the current filters.</div>
        </div>
      `);
      return;
    }

    calls.forEach(call => {
      const waitLabel = formatElapsedFromMs(call.timeStarted);
      const personnelRequired = roleNameFromCall(call);
      const area = callArea(call);
      const status = statusLabel(call.status);
      const ackText = call.status === "ack" && call.ackBy ? `By ${call.ackBy}` : status;
      const station = callStationName(call) || "Unknown Station";
      const canAck = call.status !== "ack" && call.status !== "closed";
      const canClose = call.status !== "closed";

      const row = document.createElement("div");
      row.className = `call-row ${statusClass(call.status)}`;

      row.innerHTML = `
        <span class="call-station" title="${escapeHtml(station)}">${escapeHtml(station)}</span>
        <span class="call-role" title="${escapeHtml(personnelRequired)}">${escapeHtml(personnelRequired)}</span>
        <span class="call-cell" title="${escapeHtml(area)}">${escapeHtml(area)}</span>
        <span class="call-time">${escapeHtml(waitLabel)}</span>
        <span class="call-status">
          <span class="status-pill ${statusClass(call.status)}">${escapeHtml(ackText)}</span>
        </span>
        <div class="call-actions">
          <button class="btn-green" data-action="ack" data-id="${escapeHtml(call.id)}" ${canAck ? "" : "disabled"}>Acknowledge</button>
          <button class="btn-red" data-action="close" data-id="${escapeHtml(call.id)}" ${canClose ? "" : "disabled"}>Close</button>
        </div>
      `;

      activeCalls.appendChild(row);
    });

    wireButtons();
  }

  function renderFilteredCalls() {
    const search = (callSearch?.value || "").trim().toLowerCase();
    const area = areaFilter?.value || "";
    const personnel = personnelFilter?.value || "";
    const statusMode = statusFilter?.value || "active";

    let openCalls = allCallsCache
      .filter(isDisplayableCall)
      .filter(c => c.status === "waiting" || c.status === "ack");

    if (statusMode === "waiting") openCalls = openCalls.filter(c => c.status === "waiting" || !c.status);
    if (statusMode === "ack") openCalls = openCalls.filter(c => c.status === "ack");

    if (area) openCalls = openCalls.filter(c => callArea(c) === area);
    if (personnel) openCalls = openCalls.filter(c => roleNameFromCall(c) === personnel);
    if (search) {
      openCalls = openCalls.filter(c => [
        callStationName(c),
        roleNameFromCall(c),
        callArea(c),
        c.requestedBy || c.createdBy || "Operator",
        statusLabel(c.status)
      ].join(" ").toLowerCase().includes(search));
    }

    openCalls.sort((a, b) => (a.timeStarted || 0) - (b.timeStarted || 0));
    renderCallList(openCalls);
  }

  function wireButtons() {
    document.querySelectorAll("button[data-action]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (!id || !action) return;
        openAuthModal(action, id);
      };
    });
  }

  function updateStats() {
    const displayable = allCallsCache.filter(isDisplayableCall);
    const open = displayable.filter(c => c.status === "waiting" || c.status === "ack");
    if (sbActive) sbActive.textContent = String(open.length);
    if (sbWaiting) sbWaiting.textContent = String(open.filter(c => c.status === "waiting" || !c.status).length);
    if (sbOnWay) sbOnWay.textContent = String(open.filter(c => c.status === "ack").length);
    if (sbClosed) {
      sbClosed.textContent = String(displayable.filter(c => c.status === "closed" && isToday(c.timeClosed || c.timeStarted)).length);
    }
  }

  function attachEvents() {
    [callSearch, areaFilter, personnelFilter, statusFilter].forEach(el => {
      if (!el) return;
      el.addEventListener("input", renderFilteredCalls);
      el.addEventListener("change", renderFilteredCalls);
    });

    if (authCancel) authCancel.addEventListener("click", closeAuthModal);
    if (authSubmit) authSubmit.addEventListener("click", submitAuthAction);
    if (authModal) {
      authModal.addEventListener("click", e => {
        if (e.target === authModal) closeAuthModal();
      });
    }
    [authUserId, authPin].forEach(el => {
      if (!el) return;
      el.addEventListener("keydown", e => {
        if (e.key === "Enter") submitAuthAction();
        if (e.key === "Escape") closeAuthModal();
      });
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && authModal?.classList.contains("open")) closeAuthModal();
    });
  }

  async function init() {
    setConn(false);
    await loadCompanyBranding();
  listenForBrandingUpdates();
    await loadRolesAndFilters();
    attachEvents();

    callsRef.onSnapshot(
      async snapshot => {
        setConn(true);
        allCallsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        await loadRolesAndFilters();
        updateStats();
        renderFilteredCalls();
      },
      err => {
        console.error(err);
        setConn(false);
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
