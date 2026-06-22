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
  const areasRef = companyRef.collection("areas");
  const stationsRef = companyRef.collection("stations");

  const activeCallsEl = document.getElementById("activeCalls");
  const statActive = document.getElementById("statActive");
  const statWaiting = document.getElementById("statWaiting");
  const statOnWay = document.getElementById("statOnWay");
  const statClosed = document.getElementById("statClosed");
  const connDot = document.getElementById("connDot");
  const connLabel = document.getElementById("connLabel");
  const displayClock = document.getElementById("displayClock");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const autoScrollBtn = document.getElementById("autoScrollBtn");
  const densityBtn = document.getElementById("densityBtn");
  const sortModeEl = document.getElementById("sortMode");
  const areaFilterEl = document.getElementById("areaFilter");
  const displayRoot = document.getElementById("display-root");

  let latestCalls = [];
  let allAreasCache = [];
  let autoScrollEnabled = true;
  let compactDensity = false;
  let scrollDirection = 1;
  let unsubscribeCalls = null;

  function setConn(ok, label) {
    if (connDot) connDot.style.background = ok ? "#22c55e" : "#ef4444";
    if (connLabel) connLabel.textContent = label || (ok ? "Online" : "Offline");
  }

  function updateClock() {
    if (!displayClock) return;
    const now = new Date();
    displayClock.textContent = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function compareText(a, b) {
    return String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
  }

  function callArea(call) {
    return call.area || call.areaName || call.stationArea || call.location || normalizeList(call.cells)[0] || "General";
  }

  function callLocation(call) {
    return normalizeList(call.cells).join(", ") || call.location || call.station || callArea(call);
  }

  function callRoles(call) {
    return normalizeList(call.roles).join(", ") || call.role || call.personnelRequired || "Support";
  }

  function sortActiveCalls(calls) {
    const mode = sortModeEl ? sortModeEl.value : "wait";

    return [...calls].sort((a, b) => {
      if (mode === "area") {
        const areaCompare = compareText(callArea(a), callArea(b));
        if (areaCompare) return areaCompare;
        return compareText(a.station, b.station);
      }

      if (mode === "status") {
        const order = { waiting: 0, ack: 1, closed: 2 };
        const statusCompare = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        if (statusCompare) return statusCompare;
        return timestampToMs(a.timeStarted) - timestampToMs(b.timeStarted);
      }

      if (mode === "station") {
        return compareText(a.station, b.station);
      }

      return timestampToMs(a.timeStarted) - timestampToMs(b.timeStarted);
    });
  }

  function stepAutoScroll() {
    if (!autoScrollEnabled || !activeCallsEl) return;
    const maxScroll = activeCallsEl.scrollHeight - activeCallsEl.clientHeight;
    if (maxScroll <= 12) return;

    if (activeCallsEl.scrollTop >= maxScroll - 4) {
      scrollDirection = -1;
      setTimeout(() => {
        if (autoScrollEnabled && activeCallsEl) activeCallsEl.scrollTop = 0;
        scrollDirection = 1;
      }, 1700);
      return;
    }

    if (scrollDirection > 0) {
      activeCallsEl.scrollTop += 1;
    }
  }

  function syncControlLabels() {
    if (autoScrollBtn) {
      autoScrollBtn.textContent = autoScrollEnabled ? "Auto Scroll On" : "Auto Scroll Off";
      autoScrollBtn.classList.toggle("is-on", autoScrollEnabled);
    }

    if (densityBtn) {
      densityBtn.textContent = compactDensity ? "Comfortable" : "Compact";
      densityBtn.classList.toggle("is-on", compactDensity);
    }

    if (fullscreenBtn) {
      fullscreenBtn.textContent = document.fullscreenElement ? "Exit Full Screen" : "Full Screen";
    }

    if (displayRoot) {
      displayRoot.classList.toggle("compact", compactDensity);
    }
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

  function populateAreaFilter() {
    if (!areaFilterEl) return;

    const current = areaFilterEl.value || localStorage.getItem(`factory_on_call_display_area_${COMPANY_ID}`) || "";
    const areaNames = new Set(allAreasCache);

    latestCalls.forEach(call => {
      const areaName = callArea(call);
      if (areaName && areaName !== "General" && areaName !== "Unassigned") areaNames.add(String(areaName));
    });

    const options = Array.from(areaNames).filter(Boolean).sort((a, b) => compareText(a, b));
    areaFilterEl.innerHTML = `<option value="">All Areas</option>` +
      options.map(name => `<option value="${String(name).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}">${String(name).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</option>`).join("");

    if (current && options.includes(current)) {
      areaFilterEl.value = current;
    } else {
      areaFilterEl.value = "";
    }
  }

  async function loadAreas() {
    if (!areaFilterEl) return;

    const areaNames = new Set();

    try {
      const [areaSnap, stationSnap] = await Promise.all([
        areasRef.get().catch(() => ({ docs: [] })),
        stationsRef.get().catch(() => ({ docs: [] }))
      ]);

      areaSnap.docs
        .map(doc => doc.data() || {})
        .filter(area => area.archived !== true && area.active !== false)
        .forEach(area => {
          if (area.name) areaNames.add(String(area.name));
        });

      stationSnap.docs
        .map(doc => doc.data() || {})
        .forEach(station => {
          const areaName = station.area || station.areaName || station.stationArea;
          if (areaName) areaNames.add(String(areaName));
        });
    } catch (error) {
      console.warn("Could not load display areas:", error);
    }

    allAreasCache = Array.from(areaNames).sort((a, b) => compareText(a, b));
    populateAreaFilter();
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
      const logo = branding.logoDataUrl || branding.logoUrl || localStorage.getItem("factory_on_call_logo") || "factory_logo.png";
      const theme = branding.theme || localStorage.getItem("factory_on_call_theme") || "dark";
      const nameEl = document.querySelector(".dh-company-name");
      if (nameEl) nameEl.textContent = companyName;
      document.documentElement.dataset.theme = theme;
      document.querySelectorAll(".dh-logo").forEach(img => { img.src = logo; });
      localStorage.setItem("factory_on_call_company_name", companyName);
      localStorage.setItem("factory_on_call_theme", theme);
      if (branding.logoDataUrl || branding.logoUrl) localStorage.setItem("factory_on_call_logo", logo);
    } catch (error) {
      console.warn("Could not load display branding:", error);
    }
  }

  function renderDisplay(calls) {
    if (!activeCallsEl) return;

    const selectedArea = areaFilterEl ? areaFilterEl.value : "";

    const activeCalls = sortActiveCalls(
      calls
        .filter(call => call.status === "waiting" || call.status === "ack")
        .filter(call => !selectedArea || callArea(call) === selectedArea)
    );

    const scopedCalls = calls.filter(call => !selectedArea || callArea(call) === selectedArea);

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

      const station = call.station || "Unknown Station";
      const helpNeeded = callRoles(call);
      const area = callLocation(call);
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
        scopedCalls.filter(call => call.status === "closed" && isToday(call.timeClosed || call.timeStarted)).length
      );
    }
  }


  updateClock();
  setInterval(updateClock, 1000);

  if (areaFilterEl) {
    areaFilterEl.addEventListener("change", () => {
      localStorage.setItem(`factory_on_call_display_area_${COMPANY_ID}`, areaFilterEl.value || "");
      if (activeCallsEl) activeCallsEl.scrollTop = 0;
      renderDisplay(latestCalls);
    });
  }

  if (sortModeEl) {
    sortModeEl.addEventListener("change", () => renderDisplay(latestCalls));
  }

  if (autoScrollBtn) {
    autoScrollBtn.addEventListener("click", () => {
      autoScrollEnabled = !autoScrollEnabled;
      if (autoScrollEnabled && activeCallsEl) activeCallsEl.scrollTop = 0;
      syncControlLabels();
    });
  }

  if (densityBtn) {
    densityBtn.addEventListener("click", () => {
      compactDensity = !compactDensity;
      syncControlLabels();
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (displayRoot && displayRoot.requestFullscreen) {
          await displayRoot.requestFullscreen();
        }
      } catch (error) {
        console.warn("Fullscreen unavailable:", error);
      }
      syncControlLabels();
    });
  }

  document.addEventListener("fullscreenchange", syncControlLabels);
  window.addEventListener("online", () => setConn(true, "Online"));
  window.addEventListener("offline", () => setConn(false, "Offline"));
  setInterval(stepAutoScroll, 60);
  syncControlLabels();

  setConn(false);
  await loadBranding();
  await loadAreas();

  unsubscribeCalls = callsRef.onSnapshot(
    snapshot => {
      setConn(true);
      latestCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      populateAreaFilter();
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
