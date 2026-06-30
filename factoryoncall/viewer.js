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


// ---------- SIMPLE USER ID + PIN PORTAL LOCK ----------
function focEscapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const FOC_AUTH_SESSION_PREFIX = "factory_on_call_auth_session_";
const FOC_AUTH_SESSION_HOURS = 12;

function focAuthSessionKey(companyId, portalKey) {
  return `${FOC_AUTH_SESSION_PREFIX}${companyId}_${portalKey}`;
}

function focNormalizeRole(value = "") {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
}

function focUserDisplayName(user = {}) {
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.uid || user.employeeNumber || "User";
}

function focRoleAllowed(user = {}, allowedRoles = [], requireAdmin = false) {
  const role = focNormalizeRole(user.role || user.roleName || user.dept);
  const allowed = allowedRoles.map(focNormalizeRole);
  const isAdmin = user.admin === true || user.isAdmin === true || role === "admin" || role === "administrator";
  if (requireAdmin) return isAdmin;
  return isAdmin || allowed.includes(role);
}

function focReadAuthSession(companyId, portalKey) {
  try {
    const raw = sessionStorage.getItem(focAuthSessionKey(companyId, portalKey));
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.expiresAt || Date.now() > Number(session.expiresAt)) {
      sessionStorage.removeItem(focAuthSessionKey(companyId, portalKey));
      return null;
    }
    return session;
  } catch (_) {
    return null;
  }
}

function focSaveAuthSession(companyId, portalKey, user) {
  const session = {
    companyId,
    portalKey,
    uid: user.uid || user.employeeNumber || user.id || "",
    name: focUserDisplayName(user),
    role: user.role || "",
    admin: user.admin === true || user.isAdmin === true,
    expiresAt: Date.now() + FOC_AUTH_SESSION_HOURS * 60 * 60 * 1000
  };
  sessionStorage.setItem(focAuthSessionKey(companyId, portalKey), JSON.stringify(session));
  return session;
}

async function focFindUserForLogin(usersRef, userId, pin) {
  const cleanId = String(userId || "").trim();
  const cleanPin = String(pin || "").trim();
  if (!cleanId || !cleanPin) return null;

  async function userFromDoc(docSnap) {
    if (!docSnap || !docSnap.exists) return null;
    const data = docSnap.data() || {};
    const storedPin = String(data.pin ?? data.userPin ?? data.employeePin ?? "").trim();
    if (storedPin !== cleanPin) return null;
    if (data.active === false || data.archived === true) return { inactive: true };
    return { id: docSnap.id, ...data };
  }

  let direct = await userFromDoc(await usersRef.doc(cleanId).get());
  if (direct) return direct;

  const fields = ["uid", "employeeNumber", "badgeCode"];
  for (const field of fields) {
    const snap = await usersRef.where(field, "==", cleanId).limit(1).get();
    if (!snap.empty) {
      const found = await userFromDoc(snap.docs[0]);
      if (found) return found;
    }
  }

  return null;
}

function focInstallLogoutButton(companyId, portalKey, session) {
  const target = document.querySelector(".topbar-right, .ph-right, .vh-right, .dh-right") || document.body;
  if (document.getElementById("focLogoutBtn")) return;
  const wrap = document.createElement("div");
  wrap.className = "foc-auth-user-pill";
  wrap.innerHTML = `
    <span>${focEscapeHtml(session.name || "Signed in")}</span>
    <button id="focLogoutBtn" type="button">Logout</button>
  `;
  target.appendChild(wrap);
  const btn = document.getElementById("focLogoutBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      sessionStorage.removeItem(focAuthSessionKey(companyId, portalKey));
      window.location.reload();
    });
  }
}

function focInstallAuthStyles() {
  if (document.getElementById("focAuthStyles")) return;
  const style = document.createElement("style");
  style.id = "focAuthStyles";
  style.textContent = `
    body.foc-auth-locked { overflow: hidden; }
    body.foc-auth-locked > *:not(.foc-auth-overlay):not(script):not(style) { filter: blur(2px); pointer-events: none; user-select: none; }
    .foc-auth-overlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: grid;
      place-items: center;
      padding: 22px;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(10px);
    }
    .foc-auth-card {
      width: min(460px, 100%);
      border-radius: 24px;
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 28px 80px rgba(15, 23, 42, 0.35);
      border: 1px solid rgba(148, 163, 184, 0.35);
      padding: 26px;
    }
    .foc-auth-kicker {
      font-size: 0.78rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #2563eb;
      font-weight: 900;
      margin-bottom: 8px;
    }
    .foc-auth-card h2 {
      margin: 0 0 8px;
      font-size: 1.55rem;
    }
    .foc-auth-card p {
      margin: 0 0 18px;
      color: #64748b;
      line-height: 1.45;
    }
    .foc-auth-field {
      display: grid;
      gap: 7px;
      margin: 12px 0;
    }
    .foc-auth-field label {
      font-size: 0.78rem;
      font-weight: 900;
      color: #475569;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .foc-auth-field input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 13px 14px;
      font-size: 1rem;
      background: #f8fafc;
      color: #0f172a;
      outline: none;
    }
    .foc-auth-field input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
      background: #ffffff;
    }
    .foc-auth-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
    }
    .foc-auth-actions button {
      border: 0;
      border-radius: 14px;
      background: #2563eb;
      color: #ffffff;
      font-weight: 900;
      padding: 12px 18px;
      cursor: pointer;
    }
    .foc-auth-actions button:disabled { opacity: 0.65; cursor: wait; }
    .foc-auth-error {
      min-height: 20px;
      color: #b91c1c;
      font-weight: 800;
      font-size: 0.9rem;
      margin-top: 10px;
    }
    .foc-auth-user-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 6px 5px 10px;
      border-radius: 999px;
      background: rgba(37, 99, 235, 0.10);
      color: inherit;
      font-size: 0.82rem;
      font-weight: 800;
      white-space: nowrap;
    }
    .foc-auth-user-pill button {
      border: 0;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.12);
      color: inherit;
      font-weight: 900;
      padding: 5px 9px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

async function requirePortalAccess({ usersRef, companyId, portalKey, title, subtitle, allowedRoles = [], requireAdmin = false }) {
  focInstallAuthStyles();

  const existing = focReadAuthSession(companyId, portalKey);
  if (existing) {
    focInstallLogoutButton(companyId, portalKey, existing);
    window.FOC_AUTH_SESSION = existing;
    return existing;
  }

  document.body.classList.add("foc-auth-locked");

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "foc-auth-overlay";
    overlay.innerHTML = `
      <form class="foc-auth-card" id="focAuthForm">
        <div class="foc-auth-kicker">Factory On Call</div>
        <h2>${focEscapeHtml(title || "Sign in")}</h2>
        <p>${focEscapeHtml(subtitle || "Enter your User ID and PIN to continue.")}</p>

        <div class="foc-auth-field">
          <label for="focAuthUserId">User ID</label>
          <input id="focAuthUserId" autocomplete="username" inputmode="numeric" placeholder="Example: 1007" />
        </div>

        <div class="foc-auth-field">
          <label for="focAuthPin">PIN</label>
          <input id="focAuthPin" autocomplete="current-password" inputmode="numeric" type="password" placeholder="PIN" />
        </div>

        <div class="foc-auth-error" id="focAuthError"></div>

        <div class="foc-auth-actions">
          <button id="focAuthSubmit" type="submit">Unlock</button>
        </div>
      </form>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector("#focAuthForm");
    const idInput = overlay.querySelector("#focAuthUserId");
    const pinInput = overlay.querySelector("#focAuthPin");
    const error = overlay.querySelector("#focAuthError");
    const submit = overlay.querySelector("#focAuthSubmit");
    setTimeout(() => idInput?.focus(), 50);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      submit.disabled = true;
      submit.textContent = "Checking...";

      try {
        const user = await focFindUserForLogin(usersRef, idInput.value, pinInput.value);
        if (!user || user.inactive) {
          error.textContent = user?.inactive ? "This user is inactive." : "User ID or PIN was not found.";
          return;
        }

        if (!focRoleAllowed(user, allowedRoles, requireAdmin)) {
          error.textContent = requireAdmin
            ? "Admin access is required for this page."
            : "Supervisor, Manager, or Admin access is required for this page.";
          return;
        }

        const session = focSaveAuthSession(companyId, portalKey, user);
        window.FOC_AUTH_SESSION = session;
        overlay.remove();
        document.body.classList.remove("foc-auth-locked");
        focInstallLogoutButton(companyId, portalKey, session);
        resolve(session);
      } catch (err) {
        console.error(err);
        error.textContent = "Could not check access. Try again.";
      } finally {
        submit.disabled = false;
        submit.textContent = "Unlock";
      }
    });
  });
}


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
  const emergencyRef = companyRef.collection("settings").doc("emergency");

  await requirePortalAccess({
    usersRef,
    companyId: COMPANY_ID,
    portalKey: "viewer",
    title: "Interactive Viewer Access",
    subtitle: "Enter a Supervisor, Manager, or Admin User ID and PIN to continue.",
    allowedRoles: ["Supervisor", "Manager", "Production Manager", "Administrator", "Admin"]
  });


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
  const authResolutionWrap = document.getElementById("authResolutionWrap");
  const authResolutionSummary = document.getElementById("authResolutionSummary");
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

  async function authorizeEmergencyClear() {
    const userId = String(authUserId?.value || "").trim();
    const pin = String(authPin?.value || "").trim();
    if (!userId || !pin) throw new Error("Enter both User ID and PIN.");
    const snap = await usersRef.get();
    const users = snap.docs.map(d => normalizeUser(d.data() || {}, d.id));
    const user = users.find(u => [u.uid, u.userId, u.employeeNumber, u.employeeId, u.badgeCode, u.id].map(v => String(v || "").trim()).includes(userId));
    if (!user || user.active === false || user.archived === true) throw new Error("User not found or inactive.");
    if (String(user.pin || "") !== pin) throw new Error("Invalid PIN.");
    const role = roleForUser(user);
    if (!role || !boolPerm(role, ["clearEmergency", "canClearEmergency"])) throw new Error("This role cannot clear plant emergency alerts.");
    return { user, role, userName: userDisplayName(user) };
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
    const v = String(value || "light").toLowerCase();
    return (v === "light" || v === "bright" || v === "neutral") ? "light" : "dark";
  }

  function applyCompanyBranding(branding = {}, rootData = {}) {
    const companyName = (branding.companyName !== undefined ? branding.companyName : (rootData.companyName !== undefined ? rootData.companyName : (localStorage.getItem("factory_on_call_company_name") || "")));
    const rawLogo = branding.logoDataUrl || branding.logoUrl || "";
    const hasCustomLogo = Boolean(rawLogo) && !String(rawLogo).includes("factory_logo.png") && !String(rawLogo).includes("headerLogo.png");
    const logo = hasCustomLogo ? rawLogo : "";
    const theme = normalizeBrandingTheme(branding.theme || branding.displayMode || localStorage.getItem("factory_on_call_theme") || "light");

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("theme-light", theme === "light");
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    if (document.body) {
      document.body.dataset.theme = theme;
      document.body.classList.toggle("theme-light", theme === "light");
      document.body.classList.toggle("theme-dark", theme === "dark");
    }

    const nameEl = document.querySelector(".vh-company-name");
    if (nameEl) nameEl.textContent = companyName || "";
    document.querySelectorAll(".vh-logo").forEach(img => {
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
    document.querySelectorAll(".vh-title").forEach(el => { el.style.setProperty("display", "none", "important"); });

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
    if (authResolutionSummary) authResolutionSummary.value = "";
    if (authResolutionWrap) authResolutionWrap.classList.toggle("hidden", action !== "close");
    if (authModal) {
      authModal.classList.add("open");
      authModal.setAttribute("aria-hidden", "false");
    }
    setTimeout(() => authUserId?.focus(), 50);
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
    const call = pendingAction.action === "clearEmergency" ? null : allCallsCache.find(c => c.id === pendingAction.callId);
    if (pendingAction.action !== "clearEmergency" && !call) {
      closeAuthModal();
      return;
    }

    try {
      if (authSubmit) authSubmit.disabled = true;
      if (authError) authError.textContent = "";
      if (pendingAction.action === "clearEmergency") {
        const auth = await authorizeEmergencyClear();
        const emergencySnap = await emergencyRef.get();
        const emergencyData = emergencySnap.exists ? (emergencySnap.data() || {}) : {};
        const now = Date.now();
        const clearedByUid = auth.user.uid || auth.user.employeeNumber || auth.user.id || "";
        await emergencyRef.set({ active: false, clearedBy: auth.userName, clearedByUid, clearedAt: now, updatedAt: now }, { merge: true });
        await updateEmergencyEventClear(emergencyData, auth.userName, clearedByUid, now);
        await resetEmergencyStationCalls(auth, emergencyData);
        closeAuthModal();
        return;
      }
      const auth = await authorizeAction(call, pendingAction.action);
      const ref = callsRef.doc(pendingAction.callId);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Call no longer exists.");
      const data = snap.data() || {};

      if (pendingAction.action === "ack") {
        const acknowledgedAt = Date.now();
        const timeToAcknowledgeMinutes = data.timeStarted
          ? Math.max(1, Math.round((acknowledgedAt - data.timeStarted) / 60000))
          : null;
        await ref.update({
          status: "ack",
          ackBy: auth.userName,
          assignedTo: auth.userName,
          ackByUid: auth.user.uid || auth.user.employeeNumber || auth.user.id || "",
          timeAck: acknowledgedAt,
          acknowledgedAt,
          timeToAcknowledgeMinutes,
          updatedAt: acknowledgedAt
        });
      }

      if (pendingAction.action === "close") {
        const timeClosed = Date.now();
        const duration = data.timeStarted ? Math.max(1, Math.round((timeClosed - data.timeStarted) / 60000)) : null;
        const ackAt = data.acknowledgedAt || data.timeAck || data.ackAt || data.acceptedAt || null;
        const clearMinutesAfterAck = ackAt ? Math.max(1, Math.round((timeClosed - ackAt) / 60000)) : null;
        const resolutionSummary = String(authResolutionSummary?.value || "").trim();
        const payload = {
          status: "closed",
          closedBy: auth.userName,
          closedByUid: auth.user.uid || auth.user.employeeNumber || auth.user.id || "",
          timeClosed,
          closedAt: timeClosed,
          duration,
          clearMinutesAfterAck,
          timeToClearMinutes: clearMinutesAfterAck,
          updatedAt: timeClosed
        };
        if (resolutionSummary) payload.resolutionSummary = resolutionSummary;
        await ref.update(payload);
      }

      closeAuthModal();
    } catch (error) {
      if (authError) authError.textContent = error.message || "Authorization failed.";
    } finally {
      if (authSubmit) authSubmit.disabled = false;
    }
  }


  let callSoundsReady = false;
  const callSoundState = new Map();

  function callStatus(call = {}) {
    return call.status || "waiting";
  }

  function isEmergencyCallRecord(call = {}) {
    const value = String(call.type || call.callType || call.priority || call.category || "").toLowerCase();
    return call.emergency === true || call.isEmergency === true || value.includes("emergency");
  }

  function playOneShotSound(fileName) {
    try {
      const audio = new Audio(fileName);
      audio.loop = false;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  function rememberCallSoundState(call = {}) {
    if (!call.id) return;
    callSoundState.set(call.id, {
      status: callStatus(call),
      updatedAt: call.updatedAt || call.timeClosed || call.timeAck || call.acknowledgedAt || call.timeStarted || 0
    });
  }

  function handleCallSoundSnapshot(snapshot) {
    if (!snapshot || typeof snapshot.docChanges !== "function") return;

    snapshot.docChanges().forEach(change => {
      const call = { id: change.doc.id, ...(change.doc.data() || {}) };

      if (change.type === "removed") {
        callSoundState.delete(call.id);
        return;
      }

      if (!isDisplayableCall(call) || isEmergencyCallRecord(call)) {
        rememberCallSoundState(call);
        return;
      }

      const status = callStatus(call);
      const previous = callSoundState.get(call.id);

      if (callSoundsReady) {
        if (change.type === "added") {
          if (status === "waiting" || !status) playOneShotSound("call-chime.mp3");
        } else if (previous && previous.status !== status) {
          if (status === "ack") playOneShotSound("acknowledge.mp3");
          if (status === "closed") playOneShotSound("call-closed.mp3");
          if (status === "waiting" && previous.status === "closed") playOneShotSound("call-chime.mp3");
        }
      }

      rememberCallSoundState(call);
    });

    callSoundsReady = true;
  }

  let emergencyAudio = null;
  function ensureEmergencyOverlay() {
    let overlay = document.getElementById("plantEmergencyOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "plantEmergencyOverlay";
    overlay.className = "plant-emergency-overlay hidden";
    overlay.innerHTML = `<div class="plant-emergency-card"><div class="plant-emergency-icon">🚨</div><h1>PLANT EMERGENCY</h1><p id="plantEmergencyMessage">Follow company emergency procedures.</p><div id="plantEmergencyMeta" class="plant-emergency-meta"></div><button id="clearPlantEmergencyBtn" class="plant-emergency-clear" type="button">CLEAR EMERGENCY</button></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#clearPlantEmergencyBtn")?.addEventListener("click", () => {
      pendingAction = { action: "clearEmergency", callId: "" };
      if (authTitle) authTitle.textContent = "Clear Emergency";
      if (authSummary) authSummary.textContent = "Enter a User ID and PIN with Emergency Clear access.";
      if (authUserId) authUserId.value = "";
      if (authPin) authPin.value = "";
      if (authError) authError.textContent = "";
      if (authResolutionSummary) authResolutionSummary.value = "";
      if (authResolutionWrap) authResolutionWrap.classList.add("hidden");
      authModal?.classList.add("open");
      authModal?.setAttribute("aria-hidden", "false");
      setTimeout(() => authUserId?.focus(), 50);
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
      if (msg) msg.textContent = data.message || "Follow company emergency procedures.";
      if (meta) meta.textContent = data.activatedByStation ? `Activated from ${data.activatedByStation}` : "Plant-wide alert active";
      if (active) playEmergencySound(data); else stopEmergencySound();
    }, err => console.warn("Emergency listener unavailable:", err));
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
    listenForEmergency();
    attachEvents();

    callsRef.onSnapshot(
      async snapshot => {
        setConn(true);
        handleCallSoundSnapshot(snapshot);
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
