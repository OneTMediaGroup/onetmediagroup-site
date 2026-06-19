/* -------------------------------------------------
   FACTORY ON CALL — DISPLAY
   Unified Firestore Version
-------------------------------------------------- */
const COMPANY_ID = "demo-company"; // later dynamic

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

  const activeCallsEl = document.getElementById("activeCalls");
  const statActive = document.getElementById("statActive");
  const statWaiting = document.getElementById("statWaiting");
  const statOnWay = document.getElementById("statOnWay");
  const statClosed = document.getElementById("statClosed");
  const connDot = document.getElementById("connDot");
  const connLabel = document.getElementById("connLabel");

  function setConn(ok) {
    connDot.style.background = ok ? "#22c55e" : "#ef4444";
    connLabel.textContent = ok ? "Online" : "Offline";
  }

  setConn(false);

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

  callsRef.onSnapshot(snapshot => {
    setConn(true);

    const allCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const activeCalls = allCalls
      .filter(c => c.status === "waiting" || c.status === "ack")
      .sort((a, b) => (a.timeStarted || 0) - (b.timeStarted || 0));

    activeCallsEl.innerHTML = "";

    let waiting = 0;
    let onWay = 0;

    activeCalls.forEach(call => {
      if (call.status === "waiting") waiting++;
      if (call.status === "ack") onWay++;

      const card = document.createElement("div");
      card.className = "call-card";

      card.innerHTML = `
        <div class="call-row">
          <div class="call-role">${(call.roles || []).join(", ")}</div>
          <div class="call-cell">${(call.cells || []).join(", ") || "—"}</div>
          <div class="call-time">${fmtMinutesAgo(call.timeStarted)} min ago</div>
          <div class="call-ack">${call.ackBy ? "Ack: " + call.ackBy : "Waiting…"}</div>
        </div>
      `;

      activeCallsEl.appendChild(card);
    });

    statActive.textContent = activeCalls.length;
    statWaiting.textContent = waiting;
    statOnWay.textContent = onWay;
    statClosed.textContent = allCalls.filter(
      c => c.status === "closed" && isToday(c.timeClosed || c.timeStarted)
    ).length;
  }, err => {
    console.error(err);
    setConn(false);
  });
})();
