/* -------------------------------------------------
   FACTORY ON CALL — VIEWER
   Unified Firestore Version
-------------------------------------------------- */
const COMPANY_ID = "demo-company"; // later dynamic

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

  const params = new URLSearchParams(window.location.search);
  const viewerUid = params.get("uid") || "";

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

  function fmtMinutesAgo(ts) {
    return Math.max(0, Math.floor((Date.now() - (ts || 0)) / 60000));
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

  async function loadViewerUser() {
    try {
      const snap = await usersRef.get();
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      let match = null;

      if (viewerUid) {
        match = users.find(u => String(u.uid || "") === viewerUid && u.active !== false);
      }

      if (!match) {
        match = users.find(u => u.active !== false);
      }

      if (match) {
        const first = match.firstName || "";
        const last = match.lastName || "";
        const full = `${first} ${last}`.trim();
        viewerUserName = full || "ViewerUser";
      }
    } catch (err) {
      console.error("Could not load viewer user:", err);
    }
  }

  function renderCallList(calls) {
    if (!activeCalls) return;

    activeCalls.innerHTML = "";

    calls.forEach(call => {
      const minutesAgo = fmtMinutesAgo(call.timeStarted);
      const ackText = call.ackBy ? `Ack: ${call.ackBy}` : "Waiting…";

      const card = document.createElement("div");
      card.className = "call-card";

      card.innerHTML = `
        <div class="call-row">
          <span class="call-station">${call.station || ""}</span>
          <span class="call-role">${(call.roles || []).join(", ")}</span>
          <span class="call-cell">${(call.cells || []).join(", ") || "—"}</span>
          <span class="call-time">${minutesAgo} min ago</span>
          <span class="call-ack">${ackText}</span>

          <div class="call-actions">
            <button class="btn-green" data-id="${call.id}">Acknowledge</button>
            ${viewerIsAdmin ? `<button class="btn-red" data-id="${call.id}">Close</button>` : ""}
          </div>
        </div>
      `;

      activeCalls.appendChild(card);
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
