/* -------------------------------------------------
   FACTORY ON CALL — SUPERVISOR PORTAL
   Operations portal for live call management
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
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        if (existing.dataset.loaded === "true") resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => { s.dataset.loaded = "true"; resolve(); };
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

  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  const db = app.firestore();

  const companyRef = db.collection("companies").doc(COMPANY_ID);
  const callsRef = companyRef.collection("calls");
  const usersRef = companyRef.collection("users");
  const rolesRef = companyRef.collection("roles");
  const areasRef = companyRef.collection("areas");
  const stationsRef = companyRef.collection("stations");
  const emergencyRef = companyRef.collection("settings").doc("emergency");

  const params = new URLSearchParams(window.location.search);
  const viewerUid = params.get("uid") || params.get("userId") || "";

  const activeCalls = document.getElementById("activeCalls");
  const recentCalls = document.getElementById("recentCalls");
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
  const portalUserLabel = document.getElementById("portalUserLabel");

  let currentUser = null;
  let currentRole = null;
  let allCallsCache = [];
  let allRolesCache = [];
  let allAreasCache = [];

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
    if (totalHours < 24) return minutes ? `${totalHours} hr ${minutes} min` : `${totalHours} hr`;
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days < 7) return hours ? `${days} day${days === 1 ? "" : "s"} ${hours} hr` : `${days} day${days === 1 ? "" : "s"}`;
    const weeks = Math.floor(days / 7);
    const remDays = days % 7;
    return remDays ? `${weeks} wk${weeks === 1 ? "" : "s"} ${remDays} day${remDays === 1 ? "" : "s"}` : `${weeks} wk${weeks === 1 ? "" : "s"}`;
  }

  function isToday(ts) {
    if (!ts) return false;
    const d = new Date(ts);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  function normalizeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") return value.split(",").map(v => v.trim()).filter(Boolean);
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
    // Older test records can exist in Firestore with no station metadata.
    // They are not actionable calls, so keep them out of Supervisor counts and history.
    if (!station || station.toLowerCase() === "unknown station" || station.toLowerCase() === "unknownstation") {
      return false;
    }
    return true;
  }

  function visibleCalls() {
    return allCallsCache.filter(isDisplayableCall);
  }

  function statusLabel(status) {
    if (status === "ack") return "Acknowledged";
    if (status === "closed") return "Closed";
    return "Waiting";
  }

  function statusClass(status) {
    if (status === "ack") return "status-ack";
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

  function userRoleName() {
    return (currentUser && (currentUser.role || currentUser.personnelRole || currentUser.type)) || "";
  }

  function canAcknowledgeCall(call) {
    if (!currentRole) return true; // admin/open test fallback
    if (boolPerm(currentRole, ["respondAny", "supervisorPortal", "viewAllCalls", "acknowledgeAllCalls", "closeAllCalls"])) return true;
    const callRole = roleNameFromCall(call).toLowerCase();
    return boolPerm(currentRole, ["respondMatching", "acknowledgeCalls", "acceptCall", "closeCalls", "closeCall"]) && callRole === userRoleName().toLowerCase();
  }

  function canCloseCall(call) {
    if (!currentRole) return true; // admin/open test fallback
    if (boolPerm(currentRole, ["respondAny", "supervisorPortal", "viewAllCalls", "closeAllCalls", "acknowledgeAllCalls"])) return true;
    const callRole = roleNameFromCall(call).toLowerCase();
    return boolPerm(currentRole, ["respondMatching", "closeCalls", "closeCall", "acknowledgeCalls", "acceptCall"]) && callRole === userRoleName().toLowerCase();
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

    const nameEl = document.querySelector(".ph-company-name");
    if (nameEl) nameEl.textContent = companyName || "";
    document.querySelectorAll(".ph-logo").forEach(img => {
      if (hasCustomLogo) {
        img.src = logo;
        img.hidden = false;
        img.classList.add("has-custom-logo");
        img.style.setProperty("display", "block", "important");
      } else {
        img.removeAttribute("src");
        img.hidden = true;
        img.classList.remove("has-custom-logo");
        img.style.setProperty("display", "none", "important");
      }
    });
    document.querySelectorAll(".ph-title").forEach(el => { el.style.setProperty("display", "none", "important"); });

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
      console.warn("Could not load branding:", error);
    }
  }

  function listenForBrandingUpdates() {
    companyRef.collection("branding").doc("main").onSnapshot(snapshot => {
      if (!snapshot.exists) return;
      applyCompanyBranding(snapshot.data() || {});
    }, error => console.warn("Branding listener unavailable:", error));
  }

  function splitName(fullName = "") {
    const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
    return { firstName: parts.shift() || "", lastName: parts.join(" ") };
  }

  async function loadUserAndRole() {
    try {
      const usersSnap = await usersRef.get();
      const users = usersSnap.docs.map(d => {
        const u = d.data() || {};
        const split = splitName(u.name || "");
        return { id: d.id, ...u, uid: u.uid || u.employeeNumber || d.id, firstName: u.firstName || split.firstName, lastName: u.lastName || split.lastName };
      });
      currentUser = viewerUid
        ? users.find(u => String(u.uid || u.employeeNumber || u.id) === String(viewerUid) && u.active !== false)
        : users.find(u => u.active !== false);

      const rolesSnap = await rolesRef.get();
      allRolesCache = rolesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (currentUser) {
        const roleName = (currentUser.role || "").toLowerCase();
        currentRole = allRolesCache.find(r => String(r.name || "").toLowerCase() === roleName) || null;
        const displayName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.name || currentUser.uid || "Supervisor";
        if (portalUserLabel) portalUserLabel.textContent = currentRole ? `${displayName} · ${currentRole.name}` : displayName;
      } else if (portalUserLabel) {
        portalUserLabel.textContent = "Supervisor";
      }
    } catch (error) {
      console.warn("Could not load supervisor user/role:", error);
    }
  }

  async function loadFilters() {
    try {
      const [areaSnap, stationSnap] = await Promise.all([
        areasRef.get(),
        stationsRef.get().catch(() => ({ docs: [] }))
      ]);

      const areaNames = new Set();

      areaSnap.docs
        .map(d => d.data() || {})
        .filter(a => a.active !== false)
        .forEach(a => {
          if (a.name) areaNames.add(String(a.name));
        });

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
        areaFilter.innerHTML = `<option value="">All Areas</option>` + allAreasCache.map(name => `<option value="${name}">${name}</option>`).join("");
      }

      if (personnelFilter) {
        const callable = allRolesCache.filter(r => {
          const p = r.permissions || {};
          return r.isCallable === true || p.callable === true || p.makeCall === true || r.callable === true;
        }).sort((a,b) => String(a.name || "").localeCompare(String(b.name || "")));
        personnelFilter.innerHTML = `<option value="">All Personnel</option>` + callable.map(r => `<option value="${r.name || ""}">${r.name || ""}</option>`).join("");
      }
    } catch (error) {
      console.warn("Could not load filters:", error);
    }
  }

  function renderTables() {
    const search = (callSearch?.value || "").trim().toLowerCase();
    const area = areaFilter?.value || "";
    const personnel = personnelFilter?.value || "";
    const statusMode = statusFilter?.value || "active";

    let filtered = visibleCalls();

    if (statusMode === "active") filtered = filtered.filter(c => c.status === "waiting" || c.status === "ack");
    if (statusMode === "waiting") filtered = filtered.filter(c => c.status === "waiting" || !c.status);
    if (statusMode === "ack") filtered = filtered.filter(c => c.status === "ack");

    if (area) filtered = filtered.filter(c => callArea(c) === area);
    if (personnel) filtered = filtered.filter(c => roleNameFromCall(c) === personnel);
    if (search) {
      filtered = filtered.filter(c => [
        c.station || "",
        roleNameFromCall(c),
        callArea(c),
        c.requestedBy || c.createdBy || "Operator",
        c.status || ""
      ].join(" ").toLowerCase().includes(search));
    }

    filtered.sort((a,b) => (a.timeStarted || 0) - (b.timeStarted || 0));
    renderActive(filtered);

    const recent = visibleCalls().sort((a,b) => (b.timeStarted || 0) - (a.timeStarted || 0)).slice(0, 10);
    renderRecent(recent);
  }

  function renderActive(calls) {
    if (!activeCalls) return;
    activeCalls.innerHTML = `
      <div class="call-table-header">
        <span>Station</span><span>Personnel Required</span><span>Area</span><span>Waiting</span><span>Status</span><span>Actions</span>
      </div>
    `;

    if (!calls.length) {
      activeCalls.insertAdjacentHTML("beforeend", `<div class="empty">No calls match the current filters.</div>`);
      return;
    }

    calls.forEach(call => {
      const canAck = canAcknowledgeCall(call) && call.status !== "ack" && call.status !== "closed";
      const canClose = canCloseCall(call) && call.status !== "closed";
      const row = document.createElement("div");
      row.className = "call-row";
      row.innerHTML = `
        <span class="strong">${callStationName(call)}</span>
        <span>${roleNameFromCall(call)}</span>
        <span>${callArea(call)}</span>
        <span class="muted">${formatElapsedFromMs(call.timeStarted)}</span>
        <span><span class="status-pill ${statusClass(call.status)}">${statusLabel(call.status)}</span></span>
        <span class="actions">
          <button class="btn btn-ack" data-action="ack" data-id="${call.id}" ${canAck ? "" : "disabled"}>Acknowledge</button>
          <button class="btn btn-close" data-action="close" data-id="${call.id}" ${canClose ? "" : "disabled"}>Close</button>
        </span>
      `;
      activeCalls.appendChild(row);
    });
    wireButtons();
  }

  function renderRecent(calls) {
    if (!recentCalls) return;
    recentCalls.innerHTML = `
      <div class="call-table-header">
        <span>Station</span><span>Personnel Required</span><span>Area</span><span>Age</span><span>Status</span>
      </div>
    `;
    if (!calls.length) {
      recentCalls.insertAdjacentHTML("beforeend", `<div class="empty">No recent activity.</div>`);
      return;
    }
    calls.forEach(call => {
      const row = document.createElement("div");
      row.className = "recent-row";
      row.innerHTML = `
        <span class="strong">${callStationName(call)}</span>
        <span>${roleNameFromCall(call)}</span>
        <span>${callArea(call)}</span>
        <span class="muted">${formatElapsedFromMs(call.timeStarted)}</span>
        <span><span class="status-pill ${statusClass(call.status)}">${statusLabel(call.status)}</span></span>
      `;
      recentCalls.appendChild(row);
    });
  }

  function wireButtons() {
    document.querySelectorAll("button[data-action]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (!id) return;
        const ref = callsRef.doc(id);
        const snap = await ref.get();
        if (!snap.exists) return;
        const data = snap.data() || {};
        const userName = currentUser ? (`${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.name || currentUser.uid) : "Supervisor";
        if (action === "ack") {
          const acknowledgedAt = Date.now();
          const timeToAcknowledgeMinutes = data.timeStarted
            ? Math.max(1, Math.round((acknowledgedAt - data.timeStarted) / 60000))
            : null;
          await ref.update({
            status: "ack",
            ackBy: userName,
            assignedTo: userName,
            ackByUid: viewerUid || "",
            timeAck: acknowledgedAt,
            acknowledgedAt,
            timeToAcknowledgeMinutes,
            updatedAt: acknowledgedAt
          });
        }
        if (action === "close") {
          const resolutionSummary = window.prompt("Resolution Summary\n\nWhat was the issue / fix?", "") || "";
          const timeClosed = Date.now();
          const duration = data.timeStarted ? Math.max(1, Math.round((timeClosed - data.timeStarted) / 60000)) : null;
          const ackAt = data.acknowledgedAt || data.timeAck || data.ackAt || data.acceptedAt || null;
          const clearMinutesAfterAck = ackAt ? Math.max(1, Math.round((timeClosed - ackAt) / 60000)) : null;
          const payload = {
            status: "closed",
            closedBy: userName,
            closedByUid: viewerUid || "",
            timeClosed,
            closedAt: timeClosed,
            duration,
            clearMinutesAfterAck,
            timeToClearMinutes: clearMinutesAfterAck,
            updatedAt: timeClosed
          };
          if (resolutionSummary.trim()) payload.resolutionSummary = resolutionSummary.trim();
          await ref.update(payload);
        }
      };
    });
  }

  let emergencyAudio = null;
  function normalizeEmergencyUser(user = {}, id = "") {
    const parts = String(user.name || user.fullName || "").trim().split(/\s+/).filter(Boolean);
    const firstName = user.firstName || parts.shift() || "";
    const lastName = user.lastName || parts.join(" ") || "";
    const uid = String(user.uid || user.userId || user.employeeNumber || user.employeeId || id || "").trim();
    const archived = user.archived === true || String(user.status || "").toLowerCase() === "archived" || user.active === false;
    return { id, ...user, firstName, lastName, uid, employeeNumber: uid, pin: String(user.pin || ""), active: !archived, archived };
  }

  function emergencyUserName(user = {}) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || user.fullName || user.uid || user.id || "Authorized User";
  }

  function emergencyRoleForUser(user = {}) {
    const roleName = String(user.role || user.personnelRole || user.type || "").trim().toLowerCase();
    return allRolesCache.find(r => String(r.name || "").trim().toLowerCase() === roleName) || null;
  }

  async function authorizeEmergencyClearFromInputs(userId, pin) {
    const cleanUserId = String(userId || "").trim();
    const cleanPin = String(pin || "").trim();
    if (!cleanUserId || !cleanPin) throw new Error("Enter both User ID and PIN.");

    if (!allRolesCache.length) {
      const rolesSnap = await rolesRef.get();
      allRolesCache = rolesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const usersSnap = await usersRef.get();
    const users = usersSnap.docs.map(d => normalizeEmergencyUser(d.data() || {}, d.id));
    const user = users.find(u => [u.uid, u.userId, u.employeeNumber, u.employeeId, u.badgeCode, u.id].map(v => String(v || "").trim()).includes(cleanUserId));
    if (!user || user.active === false || user.archived === true) throw new Error("User not found or inactive.");
    if (String(user.pin || "") !== cleanPin) throw new Error("Invalid PIN.");

    const role = emergencyRoleForUser(user);
    if (!role || !boolPerm(role, ["clearEmergency", "canClearEmergency"])) throw new Error("This role cannot clear plant emergency alerts.");
    return { user, role, userName: emergencyUserName(user) };
  }




  async function updateEmergencyEventClear(emergencyData = {}, clearedBy = "", clearedByUid = "", clearedAt = Date.now()) {
    try {
      const eventId = emergencyData.eventId || "";
      const toMillis = (value) => {
        if (!value) return 0;
        if (typeof value === "number") return value;
        if (value && typeof value.toMillis === "function") return value.toMillis();
        if (value && typeof value.seconds === "number") return value.seconds * 1000;
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      const startAt = toMillis(emergencyData.activatedAt || emergencyData.startedAt || emergencyData.createdAt || 0);
      const clearPayload = {
        active: false,
        clearedBy,
        clearedByUid,
        clearedAt,
        updatedAt: clearedAt
      };
      if (startAt && clearedAt >= startAt) {
        clearPayload.durationSeconds = Math.max(1, Math.round((clearedAt - startAt) / 1000));
      }
      if (eventId) {
        await companyRef.collection("emergencyEvents").doc(eventId).set(clearPayload, { merge: true });
        return;
      }
      const snap = await companyRef.collection("emergencyEvents").where("active", "==", true).limit(1).get();
      const batch = db.batch();
      snap.docs.forEach(doc => {
        const data = doc.data() || {};
        const docStart = toMillis(data.activatedAt || data.startedAt || data.createdAt || 0);
        const payload = { ...clearPayload };
        if (docStart && clearedAt >= docStart) {
          payload.durationSeconds = Math.max(1, Math.round((clearedAt - docStart) / 1000));
        }
        batch.set(doc.ref, payload, { merge: true });
      });
      if (!snap.empty) await batch.commit();
    } catch (err) {
      console.warn("Could not update emergency history event:", err);
    }
  }

  function ensureEmergencyClearModal() {
    let modal = document.getElementById("emergencyClearModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "emergencyClearModal";
    modal.className = "emergency-clear-modal hidden";
    modal.innerHTML = `
      <div class="emergency-clear-box" role="dialog" aria-modal="true" aria-labelledby="emergencyClearTitle">
        <button class="emergency-clear-x" type="button" aria-label="Cancel">×</button>
        <h2 id="emergencyClearTitle">Clear Emergency</h2>
        <p>Enter a User ID and PIN with Emergency Clear access.</p>
        <label>User ID</label>
        <input id="emergencyClearUserId" type="text" inputmode="numeric" autocomplete="off" placeholder="Scan badge or enter User ID" />
        <label>PIN</label>
        <input id="emergencyClearPin" type="password" inputmode="numeric" autocomplete="off" placeholder="Enter PIN" />
        <div id="emergencyClearError" class="emergency-clear-error"></div>
        <div class="emergency-clear-actions">
          <button id="emergencyClearCancel" class="emergency-clear-cancel" type="button">Cancel</button>
          <button id="emergencyClearConfirm" class="emergency-clear-confirm" type="button">Clear Emergency</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const close = () => {
      modal.classList.add("hidden");
      const error = modal.querySelector("#emergencyClearError");
      if (error) error.textContent = "";
    };

    modal.querySelector("#emergencyClearCancel")?.addEventListener("click", close);
    modal.querySelector(".emergency-clear-x")?.addEventListener("click", close);
    modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
    modal.querySelector("#emergencyClearConfirm")?.addEventListener("click", async () => {
      const btn = modal.querySelector("#emergencyClearConfirm");
      const error = modal.querySelector("#emergencyClearError");
      try {
        if (btn) btn.disabled = true;
        if (error) error.textContent = "";
        const auth = await authorizeEmergencyClearFromInputs(
          modal.querySelector("#emergencyClearUserId")?.value || "",
          modal.querySelector("#emergencyClearPin")?.value || ""
        );
        const emergencySnap = await emergencyRef.get();
        const emergencyData = emergencySnap.exists ? (emergencySnap.data() || {}) : {};
        const now = Date.now();
        const clearedByUid = auth.user.uid || auth.user.employeeNumber || auth.user.id || "";
        await emergencyRef.set({
          active: false,
          clearedBy: auth.userName,
          clearedByUid,
          clearedAt: now,
          updatedAt: now
        }, { merge: true });
        await updateEmergencyEventClear(emergencyData, auth.userName, clearedByUid, now);
        await resetEmergencyStationCalls(auth, emergencyData);
        close();
      } catch (err) {
        if (error) error.textContent = err.message || "Could not clear emergency.";
      } finally {
        if (btn) btn.disabled = false;
      }
    });
    return modal;
  }

  function openEmergencyClearModal() {
    const modal = ensureEmergencyClearModal();
    modal.classList.remove("hidden");
    const userInput = modal.querySelector("#emergencyClearUserId");
    const pinInput = modal.querySelector("#emergencyClearPin");
    const error = modal.querySelector("#emergencyClearError");
    if (userInput) userInput.value = "";
    if (pinInput) pinInput.value = "";
    if (error) error.textContent = "";
    setTimeout(() => userInput?.focus(), 50);
  }
  function ensureEmergencyOverlay() {
    let overlay = document.getElementById("plantEmergencyOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "plantEmergencyOverlay";
    overlay.className = "plant-emergency-overlay hidden";
    overlay.innerHTML = `<div class="plant-emergency-card"><div class="plant-emergency-icon">🚨</div><h1>PLANT EMERGENCY</h1><p id="plantEmergencyMessage">Follow company emergency procedures.</p><div id="plantEmergencyMeta" class="plant-emergency-meta"></div><button id="clearPlantEmergencyBtn" class="plant-emergency-clear" type="button">CLEAR EMERGENCY</button></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#clearPlantEmergencyBtn")?.addEventListener("click", () => {
      openEmergencyClearModal();
    });
    return overlay;
  }
  function playEmergencySound(settings = {}) { if (settings.soundEnabled === false) return; try { if (!emergencyAudio) { emergencyAudio = new Audio("emergency-alert.mp3"); emergencyAudio.loop = true; } emergencyAudio.play().catch(() => {}); } catch (_) {} }
  function stopEmergencySound() { try { if (emergencyAudio) { emergencyAudio.pause(); emergencyAudio.currentTime = 0; } } catch (_) {} }
  function listenForEmergency() {
    emergencyRef.onSnapshot(snap => {
      const data = snap.exists ? snap.data() || {} : {};
      const active = data.enabled === true && data.active === true;
      const overlay = ensureEmergencyOverlay();
      overlay.classList.toggle("hidden", !active);
      document.body.classList.toggle("emergency-active", active);
      const msg = document.getElementById("plantEmergencyMessage");
      const meta = document.getElementById("plantEmergencyMeta");
      const clearBtn = document.getElementById("clearPlantEmergencyBtn");
      if (msg) msg.textContent = data.message || "Follow company emergency procedures.";
      if (meta) meta.textContent = data.activatedByStation ? `Activated from ${data.activatedByStation}` : "Plant-wide alert active";
      if (clearBtn) clearBtn.hidden = false;
      if (active) playEmergencySound(data); else stopEmergencySound();
    }, err => console.warn("Emergency listener unavailable:", err));
  }

  function updateStats(allCalls) {
    const open = allCalls.filter(c => c.status === "waiting" || c.status === "ack");
    if (sbActive) sbActive.textContent = String(open.length);
    if (sbWaiting) sbWaiting.textContent = String(open.filter(c => c.status === "waiting" || !c.status).length);
    if (sbOnWay) sbOnWay.textContent = String(open.filter(c => c.status === "ack").length);
    if (sbClosed) sbClosed.textContent = String(allCalls.filter(c => c.status === "closed" && isToday(c.timeClosed || c.timeStarted)).length);
  }

  function attachFilterEvents() {
    [callSearch, areaFilter, personnelFilter, statusFilter].forEach(el => {
      if (el) el.addEventListener("input", renderTables);
      if (el) el.addEventListener("change", renderTables);
    });
  }

  async function init() {
    setConn(false);
    await loadCompanyBranding();
  listenForBrandingUpdates();
    await loadUserAndRole();
    await loadFilters();
    listenForEmergency();
    attachFilterEvents();

    callsRef.onSnapshot(snapshot => {
      setConn(true);
      allCallsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateStats(visibleCalls());
      renderTables();
    }, error => {
      console.error(error);
      setConn(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
