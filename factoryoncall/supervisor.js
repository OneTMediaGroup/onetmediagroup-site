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


  // Subscription enforcement: keeps plant data visible while locking live actions for inactive production subscriptions.
  let billingStatus = "active";
  let billingMode = "demo";
  let billingLocked = false;

  function normalizedBillingStatus(data = {}) {
    const mode = String(data.mode || data.plantMode || (data.demoPlant ? "demo" : "production") || "production").toLowerCase();
    const status = String(data.stripeStatus || data.subscriptionStatus || data.billingStatus || (data.active === false ? "canceled" : "active") || "active").toLowerCase();
    if (mode === "demo" || data.demoPlant === true) return { mode: "demo", status: "active", locked: false, warning: false };
    const locked = ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"].includes(status) || data.active === false;
    const warning = ["past_due", "payment_failed"].includes(status);
    return { mode, status, locked, warning };
  }

  function billingStatusText(status) {
    const map = {
      active: "Subscription active",
      trialing: "Subscription trialing",
      past_due: "Payment issue detected. Please update your payment method in Billing.",
      payment_failed: "Payment issue detected. Please update your payment method in Billing.",
      unpaid: "Subscription unpaid. Live Factory On Call actions are paused.",
      canceled: "Subscription canceled. Live Factory On Call actions are paused.",
      incomplete: "Subscription incomplete. Live Factory On Call actions are paused.",
      incomplete_expired: "Subscription expired. Live Factory On Call actions are paused.",
      paused: "Subscription paused. Live Factory On Call actions are paused."
    };
    return map[status] || `Subscription status: ${status || "unknown"}`;
  }

  function ensureBillingBanner() {
    let banner = document.getElementById("subscriptionStatusBanner");
    if (banner) return banner;
    banner = document.createElement("div");
    banner.id = "subscriptionStatusBanner";
    banner.className = "subscription-status-banner hidden";
    banner.innerHTML = `<strong></strong><span></span>`;
    const style = document.createElement("style");
    style.textContent = `
      .subscription-status-banner{margin:12px 18px;padding:12px 14px;border-radius:14px;border:1px solid #fde68a;background:#fffbeb;color:#92400e;font-weight:800;display:flex;gap:8px;align-items:center;box-shadow:0 10px 24px rgba(15,23,42,.08);}
      .subscription-status-banner strong{white-space:nowrap;}
      .subscription-status-banner.hidden{display:none!important;}
      .subscription-status-banner.locked{border-color:#fecaca;background:#fef2f2;color:#991b1b;}
      body.subscription-locked .requires-active-subscription{opacity:.55;pointer-events:none;}
    `;
    document.head.appendChild(style);
    const header = document.querySelector(".topbar, .app-header, .admin-topbar, header, .page-header");
    if (header && header.parentNode) header.insertAdjacentElement("afterend", banner);
    else document.body.prepend(banner);
    return banner;
  }

  function renderBillingBanner(state) {
    const banner = ensureBillingBanner();
    const locked = !!state.locked;
    const warning = !!state.warning;
    document.body.classList.toggle("subscription-locked", locked);
    if (!locked && !warning) {
      banner.classList.add("hidden");
      return;
    }
    banner.classList.remove("hidden");
    banner.classList.toggle("locked", locked);
    const strong = banner.querySelector("strong");
    const span = banner.querySelector("span");
    if (strong) strong.textContent = locked ? "Subscription inactive:" : "Billing notice:";
    if (span) span.textContent = billingStatusText(state.status);
  }

  function applyBillingState(data = {}) {
    const state = normalizedBillingStatus(data);
    billingMode = state.mode;
    billingStatus = state.status;
    billingLocked = state.locked;
    renderBillingBanner(state);
    if (typeof updateSendButton === "function") updateSendButton();
  }

  function guardBillingAction(actionLabel = "This action") {
    if (!billingLocked) return false;
    alert(`${actionLabel} is paused because this Production Plant subscription is inactive. Open Admin > Billing to manage or reactivate the subscription.`);
    return true;
  }

  function listenForBillingStatus() {
    companyRef.onSnapshot(
      snap => applyBillingState(snap.exists ? (snap.data() || {}) : {}),
      err => console.warn("Subscription status listener failed:", err)
    );
  }

  await requirePortalAccess({
    usersRef,
    companyId: COMPANY_ID,
    portalKey: "supervisor",
    title: "Supervisor Access",
    subtitle: "Enter a Supervisor, Manager, or Admin User ID and PIN to continue.",
    allowedRoles: ["Supervisor", "Manager", "Production Manager", "Administrator", "Admin"]
  });


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
        if (guardBillingAction(action === "ack" ? "Acknowledging calls" : "Closing calls")) return;
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
  listenForBillingStatus();
  listenForBrandingUpdates();
    await loadUserAndRole();
    await loadFilters();
    listenForEmergency();
    attachFilterEvents();

    callsRef.onSnapshot(snapshot => {
      setConn(true);
      handleCallSoundSnapshot(snapshot);
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
