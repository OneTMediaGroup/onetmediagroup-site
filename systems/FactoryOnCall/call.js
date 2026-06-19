/* -----------------------------------------------------
   FACTORY ON CALL — CALL STATION
   Unified Firestore Version
----------------------------------------------------- */
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

  const companyRef = db.collection("companies").doc(COMPANY_ID);
  const rolesRef = companyRef.collection("roles");
  const usersRef = companyRef.collection("users");
  const callsRef = companyRef.collection("calls");

  const params = new URLSearchParams(window.location.search);

  const STATION_NAME =
    params.get("station") ||
    window.STATION_NAME ||
    "DEMO_STATION";

  const STATION_CELLS =
    (params.get("cells") || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

  const COMPANY_NAME =
    params.get("companyName") ||
    "Demo Company";

  const FALLBACK_ROLE_DEFINITIONS = [
    "Team Lead",
    "Supervisor",
    "Manager",
    "Maintenance",
    "Tool Maker",
    "Die Setup",
    "Materials Driver",
    "Shipper",
    "Quality",
    "Safety",
    "Emergency",
    "HR Support",
    "Engineering",
    "Electrician"
  ];

  const rolesGrid = document.getElementById("rolesGrid");
  const sendCallBtn = document.getElementById("sendCallBtn");
  const signInBtn = document.getElementById("signInBtn");
  const callPanel = document.getElementById("callScreen");
  const stationStatus = document.getElementById("stationStatus");
  const circleMainLabel = document.getElementById("circleMainLabel");
  const circleSubLabel = document.getElementById("circleSubLabel");
  const hintText = document.getElementById("hintText");
  const customerNameEl = document.getElementById("customerName");

  const lockOverlay = document.getElementById("lockOverlay");
  const lockUserId = document.getElementById("lockUserId");
  const lockPin = document.getElementById("lockPin");
  const unlockBtn = document.getElementById("unlockBtn");

  let selectedRoles = [];
  let isLocked = false;
  let callState = "idle";
  let activeLockField = "user";
  let currentCaller = { firstName: "", lastName: "", uid: "" };
  let roleDefinitions = [...FALLBACK_ROLE_DEFINITIONS];

  async function init() {
    if (customerNameEl) {
      customerNameEl.textContent = `${COMPANY_NAME} · ${STATION_NAME}`;
    }

    await loadCallableRoles();
    buildRoles();
    setCallState("idle");
    isLocked = false;
    updateLockVisuals();
    updateSendButton();
    wireKeypad();
    listenForStationCallState();
  }

  async function loadCallableRoles() {
    try {
      const snap = await rolesRef.where("isCallable", "==", true).get();

      if (!snap.empty) {
        roleDefinitions = snap.docs
          .map(doc => doc.data()?.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      }
    } catch (err) {
      console.warn("Could not load callable roles, using fallback list.", err);
    }
  }

  function buildRoles() {
    if (!rolesGrid) return;

    rolesGrid.innerHTML = "";

    roleDefinitions.forEach(label => {
      const pill = document.createElement("button");
      pill.className = "role-pill";
      pill.type = "button";
      pill.textContent = label;

      pill.addEventListener("click", () => {
        if (isLocked) return;

        pill.classList.toggle("selected");

        if (pill.classList.contains("selected")) {
          if (!selectedRoles.includes(label)) selectedRoles.push(label);
        } else {
          selectedRoles = selectedRoles.filter(r => r !== label);
        }

        updateSendButton();
      });

      rolesGrid.appendChild(pill);
    });
  }

  function updateSendButton() {
    if (!sendCallBtn) return;
    const canSend = !isLocked && selectedRoles.length > 0 && callState === "idle";
    sendCallBtn.disabled = !canSend;
  }

  function setCallState(state) {
    callState = state;

    if (!circleMainLabel || !circleSubLabel || !hintText) return;

    if (state === "idle") {
      circleMainLabel.textContent = STATION_NAME;
      circleSubLabel.textContent = STATION_CELLS.length
        ? `Cells: ${STATION_CELLS.join(", ")}`
        : "Select then send call";
      hintText.innerHTML =
        `Select one or more roles below, then press <strong>Send Call</strong>.`;
    } else if (state === "pending") {
      circleMainLabel.textContent = STATION_NAME;
      circleSubLabel.textContent = "Waiting for acknowledgment";
      hintText.textContent = "Call sent. Waiting for someone to respond.";
    } else if (state === "ack") {
      circleMainLabel.textContent = STATION_NAME;
      circleSubLabel.textContent = "Acknowledged";
      hintText.textContent = "Someone has accepted this call.";
    }

    updateSendButton();
  }

  function updateLockVisuals() {
    if (!stationStatus || !signInBtn) return;

    if (isLocked) {
      stationStatus.textContent = "Locked";
      stationStatus.classList.remove("status-ready");
      stationStatus.classList.add("status-locked");
      signInBtn.classList.remove("hidden");
    } else {
      stationStatus.textContent = "Ready";
      stationStatus.classList.remove("status-locked");
      stationStatus.classList.add("status-ready");
      signInBtn.classList.add("hidden");
    }
  }

  async function findActiveCallForStation() {
    const snap = await callsRef.get();

    const activeDocs = snap.docs.filter(doc => {
      const c = doc.data() || {};
      return (
        c.station === STATION_NAME &&
        (c.status === "waiting" || c.status === "ack")
      );
    });

    if (!activeDocs.length) return null;

    activeDocs.sort((a, b) => {
      const ta = a.data()?.timeStarted || 0;
      const tb = b.data()?.timeStarted || 0;
      return tb - ta;
    });

    return activeDocs[0];
  }

  function listenForStationCallState() {
    callsRef.onSnapshot(snapshot => {
      const active = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c =>
          c.station === STATION_NAME &&
          (c.status === "waiting" || c.status === "ack")
        )
        .sort((a, b) => (b.timeStarted || 0) - (a.timeStarted || 0))[0];

      if (!active) {
        if (lockOverlay && !lockOverlay.classList.contains("hidden")) return;
        if (!isLocked) {
          setCallState("idle");
          updateSendButton();
        }
        return;
      }

      isLocked = true;
      updateLockVisuals();
      setCallState(active.status === "ack" ? "ack" : "pending");
    });
  }

  sendCallBtn?.addEventListener("click", async () => {
    if (sendCallBtn.disabled) return;

    const existing = await findActiveCallForStation();
    if (existing) {
      setCallState(existing.data()?.status === "ack" ? "ack" : "pending");
      isLocked = true;
      updateLockVisuals();
      return;
    }

    const payload = {
      companyId: COMPANY_ID,
      station: STATION_NAME,
      cells: STATION_CELLS,
      roles: selectedRoles,

      status: "waiting",

      callerFirst: currentCaller.firstName || "",
      callerLast: currentCaller.lastName || "",
      callerUid: currentCaller.uid || "",

      ackBy: null,
      assignedTo: null,

      timeStarted: Date.now(),
      timeAck: null,
      timeClosed: null,
      duration: null
    };

    await callsRef.add(payload);

    if (callPanel) {
      callPanel.classList.add("sending");
      setTimeout(() => callPanel.classList.remove("sending"), 900);
    }

    setCallState("pending");
    isLocked = true;
    updateLockVisuals();
    updateSendButton();
  });

  signInBtn?.addEventListener("click", () => openLockOverlay());

  function openLockOverlay() {
    if (!lockOverlay || !lockUserId || !lockPin) return;

    lockUserId.value = "";
    lockPin.value = "";
    activeLockField = "user";
    lockOverlay.classList.remove("hidden");
  }

  function wireKeypad() {
    lockUserId?.addEventListener("click", () => (activeLockField = "user"));
    lockPin?.addEventListener("click", () => (activeLockField = "pin"));

    document.querySelectorAll(".lock-keypad button").forEach(btn => {
      const key = btn.dataset.key;
      const action = btn.dataset.action;

      btn.addEventListener("click", () => {
        const target = activeLockField === "user" ? lockUserId : lockPin;
        if (!target) return;

        if (key) {
          if (target.value.length < 4) target.value += key;
        } else if (action === "clear") {
          target.value = "";
        } else if (action === "backspace") {
          target.value = target.value.slice(0, -1);
        }
      });
    });
  }

  unlockBtn?.addEventListener("click", async () => {
    const uid = lockUserId?.value.trim() || "";
    const pin = lockPin?.value.trim() || "";

    if (uid.length < 2 || pin.length < 2) {
      alert("Enter valid ID + PIN");
      return;
    }

    try {
      const snap = await usersRef.get();

      const match = snap.docs
        .map(d => d.data())
        .find(u =>
          String(u.uid || "") === uid &&
          String(u.pin || "") === pin &&
          u.active !== false
        );

      if (!match) {
        alert("Invalid ID or PIN");
        return;
      }

      currentCaller = {
        firstName: match.firstName || "",
        lastName: match.lastName || "",
        uid: match.uid || ""
      };

      const activeDoc = await findActiveCallForStation();

      if (activeDoc) {
        const data = activeDoc.data() || {};
        const timeClosed = Date.now();
        const duration = data.timeStarted
          ? Math.max(1, Math.round((timeClosed - data.timeStarted) / 60000))
          : null;

        await callsRef.doc(activeDoc.id).update({
          status: "closed",
          timeClosed,
          duration
        });
      }

      isLocked = false;
      selectedRoles = [];
      document.querySelectorAll(".role-pill").forEach(p => p.classList.remove("selected"));

      if (lockOverlay) lockOverlay.classList.add("hidden");
      setCallState("idle");
      updateLockVisuals();
      updateSendButton();
    } catch (err) {
      console.error(err);
      alert("Unable to verify user right now.");
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
