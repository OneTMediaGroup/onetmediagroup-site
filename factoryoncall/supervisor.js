/* -------------------------------------------------
   FACTORY ON CALL — SUPERVISOR PORTAL
   Unified Firestore Version
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

  // ---- FIRESTORE PATHS ----
  const companyRef = db.collection("companies").doc(COMPANY_ID);
  const callsRef = companyRef.collection("calls");
  const usersRef = companyRef.collection("users");

  async function loadCompanyBranding() {
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
      const nameEl = document.querySelector(".vh-company-name");
      if (nameEl) nameEl.textContent = companyName;
      localStorage.setItem("factory_on_call_company_name", companyName);
    } catch (error) {
      console.warn("Could not load viewer branding:", error);
    }
  }

  await loadCompanyBranding();

  const params = new URLSearchParams(window.location.search);
  const viewerUid = params.get("uid") || "";
  const companyName = params.get("companyName") || localStorage.getItem("factory_on_call_company_name") || "Factory On Call";
  localStorage.setItem("factory_on_call_company_name", companyName);

  let viewerIsAdmin = true;
  let viewerUserName = "ViewerUser";

  const activeCalls = document.getElementById("activeCalls");
  const connDot = document.getElementById("connDot");
  const connLabel = document.getElementById("connLabel");
  const sbActive = document.getElementById("sbActive");
  const sbWaiting = document.getElementById("sbWaiting");
  const sbOnWay = document.getElementById("sbOnWay");
  const sbClosed = document.getElementById("sbClosed");

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

  function fmtMinutesAgo(ts) {
    return formatElapsedFromMs(ts);
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
    const cleaned = String(fullName || "").trim();
    if (!cleaned) return { firstName: "", lastName: "" };

    const parts = cleaned.split(/\s+/);
    return {
      firstName: parts.shift() || "",
      lastName: parts.join(" ")
    };
  }

  function normalizeUser(user = {}, id = "") {
    const split = splitName(user.name || "");
    return {
      ...user,
      firstName: user.firstName || split.firstName || "",
      lastName: user.lastName || split.lastName || "",
      uid: user.uid || user.employeeNumber || id || "",
      active: user.active !== false
    };
  }


  async function loadViewerUser() {
    try {
      const snap = await usersRef.get();
      const users = snap.docs.map(d => normalizeUser(d.data(), d.id));

      let match = null;

      if (viewerUid) {
        match = users.find(u => String(u.uid || u.employeeNumber || "") === viewerUid && u.active !== false);
      }

      if (!match) {
        match = users.find(u => u.active !== false);
      }

      if (match) {
        const first = match.firstName || "";
        const last = match.lastName || "";
        const full = `${first} ${last}`.trim();
        viewerUserName = full || match.name || match.uid || "ViewerUser";
      }
    } catch (err) {
      console.error("Could not load viewer user:", err);
    }
  }

  function statusLabel(status) {
    if (status === "ack") return "Acknowledged";
    if (status === "closed") return "Completed";
    return "Waiting";
  }

  function statusClass(status) {
    if (status === "ack") return "status-onway";
    if (status === "closed") return "status-closed";
    return "status-waiting";
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

  function renderCallList(calls) {
    if (!activeCalls) return;

    activeCalls.innerHTML = `
      <div class="call-table-header" aria-hidden="true">
        <span>Station</span>
        <span>Personnel Required</span>
        <span>Location</span>
        <span>Waiting</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
    `;

    if (!calls.length) {
      activeCalls.insertAdjacentHTML("beforeend", `
        <div class="empty-state">
          <div class="empty-title">No Active Calls</div>
          <div class="empty-subtitle">All stations are clear.</div>
        </div>
      `);
      return;
    }

    calls.forEach(call => {
      const waitLabel = fmtMinutesAgo(call.timeStarted);
      const personnelRequired = normalizeList(call.roles).join(", ") || "Support";
      const location = normalizeList(call.cells).join(", ") || "—";
      const status = statusLabel(call.status);
      const ackText = call.status === "ack" && call.ackBy ? `By ${call.ackBy}` : status;

      const row = document.createElement("div");
      row.className = `call-row ${statusClass(call.status)}`;

      row.innerHTML = `
        <span class="call-station" title="${call.station || ""}">${call.station || "Unknown Station"}</span>
        <span class="call-role" title="${personnelRequired}">${personnelRequired}</span>
        <span class="call-cell" title="${location}">${location}</span>
        <span class="call-time">${waitLabel}</span>
        <span class="call-status">
          <span class="status-pill ${statusClass(call.status)}">${ackText}</span>
        </span>
        <div class="call-actions">
          <button class="btn-green" data-id="${call.id}">Acknowledge</button>
          ${viewerIsAdmin ? `<button class="btn-red" data-id="${call.id}">Close</button>` : ""}
        </div>
      `;

      activeCalls.appendChild(row);
    });

    wireButtons();
  }

  function wireButtons() {
    document.querySelectorAll(".btn-green").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        if (!id) return;

        await callsRef.doc(id).update({
          status: "ack",
          ackBy: viewerUserName,
          assignedTo: viewerUserName,
          ackByUid: viewerUid || "",
          timeAck: Date.now()
        });
      };
    });

    document.querySelectorAll(".btn-red").forEach(btn => {
      btn.onclick = async () => {
        if (!viewerIsAdmin) return;

        const id = btn.dataset.id;
        if (!id) return;

        const ref = callsRef.doc(id);
        const snap = await ref.get();
        if (!snap.exists) return;

        const data = snap.data() || {};
        const timeClosed = Date.now();
        const duration = data.timeStarted
          ? Math.max(1, Math.round((timeClosed - data.timeStarted) / 60000))
          : null;

        await ref.update({
          status: "closed",
          closedBy: viewerUserName,
          closedByUid: viewerUid || "",
          timeClosed,
          duration
        });
      };
    });
  }

  async function init() {
    setConn(false);
    await loadViewerUser();

    callsRef.onSnapshot(
      snapshot => {
        setConn(true);

        const allCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const openCalls = allCalls
          .filter(c => c.status === "waiting" || c.status === "ack")
          .sort((a, b) => (a.timeStarted || 0) - (b.timeStarted || 0));

        renderCallList(openCalls);

        if (sbActive) sbActive.textContent = String(openCalls.length);
        if (sbWaiting) sbWaiting.textContent = String(openCalls.filter(c => c.status === "waiting").length);
        if (sbOnWay) sbOnWay.textContent = String(openCalls.filter(c => c.status === "ack").length);
        if (sbClosed) {
          sbClosed.textContent = String(
            allCalls.filter(c => c.status === "closed" && isToday(c.timeClosed || c.timeStarted)).length
          );
        }
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
