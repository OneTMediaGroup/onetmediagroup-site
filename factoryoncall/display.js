/* -------------------------------------------------
   FACTORY ON CALL — DISPLAY
   Live TV / Wall Board
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

  const activeCallsEl = document.getElementById("activeCalls");
  const statActive = document.getElementById("statActive");
  const statWaiting = document.getElementById("statWaiting");
  const statOnWay = document.getElementById("statOnWay");
  const statClosed = document.getElementById("statClosed");
  const connDot = document.getElementById("connDot");
  const connLabel = document.getElementById("connLabel");

  let latestCalls = [];

  function setConn(ok) {
    if (connDot) connDot.style.background = ok ? "#22c55e" : "#ef4444";
    if (connLabel) connLabel.textContent = ok ? "Online" : "Offline";
  }

  function timestampToMs(value) {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.seconds === "number") return value.seconds * 1000;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function fmtMinutesAgo(value) {
    const ts = timestampToMs(value);
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

  function isToday(value) {
    const ts = timestampToMs(value);
    if (!ts) return false;

    const d = new Date(ts);
    const now = new Date();

    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  function normalizeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
  }

  function statusLabel(status) {
    if (status === "ack") return "On the Way";
    if (status === "closed") return "Closed";
    return "Waiting";
  }

  function statusClass(status) {
    if (status === "ack") return "status-onway";
    if (status === "closed") return "status-closed";
    return "status-waiting";
  }

  function callerName(call) {
    const first = call.callerFirst || "";
    const last = call.callerLast || "";
    const full = `${first} ${last}`.trim();
    return full || call.callerName || call.callerUid || "Operator";
  }

  async function loadBranding() {
    try {
      const rootSnap = await companyRef.get();
      const rootData = rootSnap.exists ? rootSnap.data() || {} : {};

      let branding = {};
      try {
        const brandingSnap = await companyRef.collection("branding").doc("main").get();
        branding = brandingSnap.exists ? brandingSnap.data() || {} : {};
      } catch (error) {
        console.warn("Branding unavailable:", error);
      }

      const companyName = branding.companyName || rootData.companyName || "Factory On Call";
      const nameEl = document.querySelector(".dh-company-name");
      if (nameEl) nameEl.textContent = companyName;
      localStorage.setItem("factory_on_call_company_name", companyName);
    } catch (error) {
      console.warn("Could not load display branding:", error);
    }
  }

  function renderDisplay(calls) {
    if (!activeCallsEl) return;

    const activeCalls = calls
      .filter(call => call.status === "waiting" || call.status === "ack")
      .sort((a, b) => timestampToMs(a.timeStarted) - timestampToMs(b.timeStarted));

    let waiting = 0;
    let onWay = 0;

    activeCallsEl.innerHTML = "";

    if (!activeCalls.length) {
      activeCallsEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">No Active Calls</div>
          <div class="empty-subtitle">All stations are clear.</div>
        </div>
      `;
    }

    activeCalls.forEach(call => {
      if (call.status === "waiting") waiting++;
      if (call.status === "ack") onWay++;

      const roles = normalizeList(call.roles);
      const cells = normalizeList(call.cells);

      const station = call.station || "Unknown Station";
      const helpNeeded = roles.join(", ") || "Support";
      const area = cells.join(", ") || "General";
      const status = statusLabel(call.status);
      const ackInfo = call.status === "ack" && call.ackBy ? `Acknowledged by ${call.ackBy}` : "Not yet acknowledged";

      const card = document.createElement("div");
      card.className = `call-card ${statusClass(call.status)}`;

      card.innerHTML = `
        <div class="call-main">
          <div class="call-field station-field">
            <div class="field-label">Station</div>
            <div class="field-value">${station}</div>
          </div>

          <div class="call-field help-field">
            <div class="field-label">Personnel Required</div>
            <div class="field-value">${helpNeeded}</div>
          </div>

          <div class="call-field area-field">
            <div class="field-label">Location</div>
            <div class="field-value">${area}</div>
          </div>

          <div class="call-field caller-field">
            <div class="field-label">Requested By</div>
            <div class="field-value">${callerName(call)}</div>
          </div>

          <div class="call-field time-field">
            <div class="field-label">Waiting</div>
            <div class="field-value">${fmtMinutesAgo(call.timeStarted)}</div>
          </div>

          <div class="call-field status-field">
            <div class="field-label">Status</div>
            <div class="status-pill ${statusClass(call.status)}">${status}</div>
            <div class="status-note">${ackInfo}</div>
          </div>
        </div>
      `;

      activeCallsEl.appendChild(card);
    });

    if (statActive) statActive.textContent = String(activeCalls.length);
    if (statWaiting) statWaiting.textContent = String(waiting);
    if (statOnWay) statOnWay.textContent = String(onWay);
    if (statClosed) {
      statClosed.textContent = String(
        calls.filter(call => call.status === "closed" && isToday(call.timeClosed || call.timeStarted)).length
      );
    }
  }

  setConn(false);
  await loadBranding();

  callsRef.onSnapshot(
    snapshot => {
      setConn(true);
      latestCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderDisplay(latestCalls);
    },
    error => {
      console.error("Display listener error:", error);
      setConn(false);
    }
  );

  setInterval(() => {
    if (latestCalls.length) renderDisplay(latestCalls);
  }, 30000);
})();
