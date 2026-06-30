import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5n-Ykf5LoYE_2u0pbRKfektav75GZIZE",
  authDomain: "factoryoncall.firebaseapp.com",
  projectId: "factoryoncall",
  storageBucket: "factoryoncall.firebasestorage.app",
  messagingSenderId: "586355508568",
  appId: "1:586355508568:web:40c4803ef1fd749811512d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COMPANY_STORAGE_KEY = "factory_on_call_active_company_id";
const COMPANY_NAME_KEY = "factory_on_call_company_name";

const stepContent = document.getElementById("stepContent");
const stepLabel = document.getElementById("stepLabel");
const progressFill = document.getElementById("progressFill");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const statusText = document.getElementById("statusText");

const DEFAULT_ROLES = [
  "Maintenance",
  "Quality",
  "Supervisor",
  "Material Handler",
  "Team Lead",
  "Production Support"
];

const DEFAULT_STATIONS = [
  "Press 400",
  "Press 401",
  "Assembly 1",
  "Assembly 2",
  "Packaging",
  "Receiving"
];

const DEMO_COMPANY_NAME = "Northwind Manufacturing";

const DEMO_AREAS = [
  { name: "Receiving", description: "Incoming materials and staging" },
  { name: "Press Shop", description: "Stamping and press operations" },
  { name: "Machining", description: "CNC machining cells" },
  { name: "Assembly", description: "Final and sub-assembly cells" },
  { name: "Paint", description: "Paint booth and finishing" },
  { name: "Packaging", description: "Pack lines and outbound prep" },
  { name: "Shipping", description: "Shipping dock and trailers" }
];

const DEMO_STATIONS = [
  { name: "Receiving Dock", area: "Receiving", description: "Inbound materials", cells: ["Receiving Dock"] },
  { name: "Press 100", area: "Press Shop", description: "High-volume press line", cells: ["Press 100"] },
  { name: "Press 200", area: "Press Shop", description: "Progressive die press", cells: ["Press 200"] },
  { name: "Press 300", area: "Press Shop", description: "Secondary press line", cells: ["Press 300"] },
  { name: "CNC 01", area: "Machining", description: "CNC machining center", cells: ["CNC 01"] },
  { name: "CNC 02", area: "Machining", description: "CNC machining center", cells: ["CNC 02"] },
  { name: "Cell A", area: "Assembly", description: "Sub-assembly cell", cells: ["Cell A"] },
  { name: "Cell B", area: "Assembly", description: "Final assembly cell", cells: ["Cell B"] },
  { name: "Cell C", area: "Assembly", description: "Inspection and rework cell", cells: ["Cell C"] },
  { name: "Paint Booth", area: "Paint", description: "Paint and curing area", cells: ["Paint Booth"] },
  { name: "Pack Line 1", area: "Packaging", description: "Primary packaging line", cells: ["Pack Line 1"] },
  { name: "Pack Line 2", area: "Packaging", description: "Secondary packaging line", cells: ["Pack Line 2"] },
  { name: "Shipping Dock", area: "Shipping", description: "Outbound dock", cells: ["Shipping Dock"] }
];

const STRIPE_MONTHLY_URL = "#stripe-monthly-placeholder";
const STRIPE_ANNUAL_URL = "#stripe-annual-placeholder";

let step = 0;

const state = {
  firstName: "",
  lastName: "",
  email: "",
  type: "demo",
  plan: "monthly",
  companyName: DEMO_COMPANY_NAME,
  companyId: "",
  adminPin: "1000",
  checkoutStarted: false,
  checkoutComplete: false
};

function safeId(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function fullName() {
  return `${state.firstName} ${state.lastName}`.trim();
}

function buildLink(page) {
  return `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, page)}?companyId=${encodeURIComponent(state.companyId)}`;
}

function setStatus(message = "", good = false) {
  statusText.textContent = message;
  statusText.className = good ? "status-text success" : "status-text";
}

function stepsForFlow() {
  if (state.type === "demo") {
    return ["Welcome", "Choose Plant", "Demo Ready"];
  }
  return ["Welcome", "Choose Plant", "Plan", "Activation", "Plant Ready"];
}

function updateProgress() {
  const labels = stepsForFlow();
  const total = labels.length;
  const safeStep = Math.min(step, total - 1);
  stepLabel.textContent = `Step ${safeStep + 1} of ${total} • ${labels[safeStep]}`;
  progressFill.style.width = `${((safeStep + 1) / total) * 100}%`;
  backBtn.style.visibility = safeStep === 0 || state.companyId ? "hidden" : "visible";

  if (state.companyId) {
    nextBtn.textContent = "Open Admin";
    return;
  }

  if (state.type === "demo" && safeStep === 1) {
    nextBtn.textContent = "Create Demo Plant";
  } else if (state.type === "production" && safeStep === 2) {
    nextBtn.textContent = "Continue to Secure Checkout";
  } else if (state.type === "production" && safeStep === 3) {
    nextBtn.textContent = "Create Production Plant";
  } else {
    nextBtn.textContent = "Continue";
  }
}

function render() {
  updateProgress();
  setStatus("");

  if (step === 0) renderWelcomeStep();
  if (step === 1) renderChoosePlantStep();
  if (state.type === "demo" && step === 2) renderCompleteStep();
  if (state.type === "production" && step === 2) renderPlanStep();
  if (state.type === "production" && step === 3) renderActivationStep();
  if (state.type === "production" && step === 4) renderCompleteStep();
}

function renderWelcomeStep() {
  stepContent.innerHTML = `
    <div class="hero-copy">
      <h2>Never miss another production call.</h2>
      <p>Factory On Call connects stations, supervisors, maintenance, quality, and support teams in real time.</p>
    </div>

    <div class="form-grid welcome-form">
      <div class="form-field">
        <label>First Name</label>
        <input id="firstName" value="${escapeHtml(state.firstName)}" placeholder="First" autocomplete="given-name" />
      </div>
      <div class="form-field">
        <label>Last Name</label>
        <input id="lastName" value="${escapeHtml(state.lastName)}" placeholder="Last" autocomplete="family-name" />
      </div>
      <div class="form-field full">
        <label>Email Address</label>
        <input id="email" type="email" value="${escapeHtml(state.email)}" placeholder="name@company.com" autocomplete="email" />
      </div>
    </div>
  `;
}

function renderChoosePlantStep() {
  stepContent.innerHTML = `
    <h2>Choose your plant.</h2>
    <p>Start with a working demo, or activate a production plant for real factory use.</p>

    <div class="choice-grid plant-choice-grid">
      <article class="choice-card ${state.type === "demo" ? "active" : ""}" data-type="demo">
        <div class="choice-topline"><span class="choice-icon">▶</span><strong>Demo Plant</strong></div>
        <p>Explore Factory On Call with a fully configured sample manufacturing plant.</p>
        <ul>
          <li>Sample stations and users</li>
          <li>Live call workflow</li>
          <li>Analytics and reports</li>
          <li>Demo editing locked</li>
        </ul>
      </article>

      <article class="choice-card ${state.type === "production" ? "active" : ""}" data-type="production">
        <div class="choice-topline"><span class="choice-icon">✓</span><strong>Production Plant</strong></div>
        <p>Create your live Factory On Call workspace for your own plant.</p>
        <ul>
          <li>Supervisor queue</li>
          <li>Production display</li>
          <li>Station call pages</li>
          <li>Reports and exports</li>
        </ul>
      </article>
    </div>
  `;

  stepContent.querySelectorAll(".choice-card").forEach(card => {
    card.addEventListener("click", () => {
      state.type = card.dataset.type;
      state.companyName = state.type === "demo" ? DEMO_COMPANY_NAME : `${fullName() || "Production"} Plant`;
      render();
    });
  });
}

function renderPlanStep() {
  stepContent.innerHTML = `
    <h2>Choose your plan.</h2>
    <p>Stripe checkout will be connected here once the onboarding flow is approved.</p>

    <div class="choice-grid plan-grid">
      <article class="choice-card plan-card ${state.plan === "monthly" ? "active" : ""}" data-plan="monthly">
        <div class="choice-topline"><span class="choice-icon">M</span><strong>Monthly</strong></div>
        <p>Flexible monthly billing for live plant use.</p>
        <div class="price-line">Stripe link placeholder</div>
      </article>

      <article class="choice-card plan-card ${state.plan === "annual" ? "active" : ""}" data-plan="annual">
        <div class="choice-topline"><span class="choice-icon">A</span><strong>Annual</strong></div>
        <p>Best value for plants ready to run Factory On Call long term.</p>
        <div class="price-line">Stripe link placeholder</div>
      </article>
    </div>

    <div class="demo-note">
      <strong>Test mode:</strong> The next button will simulate a successful checkout so we can test the return flow before adding real Stripe links.
    </div>
  `;

  stepContent.querySelectorAll(".plan-card").forEach(card => {
    card.addEventListener("click", () => {
      state.plan = card.dataset.plan;
      render();
    });
  });
}

function renderActivationStep() {
  stepContent.innerHTML = `
    <h2>Production plant activated.</h2>
    <p>Confirm the plant name below. Your owner account will use the name and email from the welcome screen.</p>

    <div class="activation-card">
      <div class="activation-badge">Stripe Return Placeholder</div>
      <p>Plan selected: <strong>${state.plan === "annual" ? "Annual" : "Monthly"}</strong></p>
    </div>

    <div class="form-grid">
      <div class="form-field full">
        <label>Plant Name</label>
        <input id="companyName" value="${escapeHtml(state.companyName)}" placeholder="ABC Manufacturing" />
      </div>
    </div>
  `;
}

function renderCompleteStep() {
  const isDemo = state.type === "demo";
  const adminUserId = state.adminPin;
  stepContent.innerHTML = `
    <h2>${isDemo ? "Demo plant ready." : "Production plant ready."}</h2>
    <p class="ready-intro">
      ${isDemo ? "Your Demo Plant is ready to explore." : "Your Production Plant is ready."}
      Save your <strong>Plant Code</strong>, <strong>Administrator User ID</strong>, and <strong>Administrator PIN</strong>.
      You will use your <strong>User ID + PIN</strong> to sign in to the Admin, Supervisor, and Viewer portals.
    </p>

    <div class="plant-code-card">
      <span>Plant Code</span>
      <strong>${escapeHtml(state.companyId || "Creating...")}</strong>
    </div>

    <div class="summary-box ready-summary">
      <p><strong>Plant:</strong> ${escapeHtml(state.companyName)}</p>
      <p><strong>Owner:</strong> ${escapeHtml(fullName())}</p>
      <p><strong>Email:</strong> ${escapeHtml(state.email)}</p>
      <p><strong>Administrator User ID:</strong> ${escapeHtml(adminUserId)}</p>
      <p><strong>Administrator PIN:</strong> ${escapeHtml(state.adminPin)}</p>
      ${!isDemo ? `<p><strong>Plan:</strong> ${state.plan === "annual" ? "Annual" : "Monthly"}</p>` : `<p><strong>Mode:</strong> Demo Plant</p>`}
    </div>

    <div class="login-note">
      <strong>Login note:</strong> Use the Administrator User ID and PIN above to access the management portals below.
    </div>

    <div class="link-list">
      ${[
        ["Admin Portal", "admin.html"],
        ["Call Station", "call.html"],
        ["Supervisor Portal", "supervisor.html"],
        ["Interactive Viewer", "viewer.html"],
        ["Production Display", "display.html"]
      ].map(([label, page]) => `
        <div class="link-row">
          <strong>${label}</strong>
          <code>${buildLink(page)}</code>
          <button class="btn secondary copy-link" data-link="${buildLink(page)}" type="button">Copy</button>
        </div>
      `).join("")}
    </div>

    <div class="demo-note">
      ${isDemo
        ? `<strong>You're all set!</strong> Open the Admin Portal to begin exploring Factory On Call. Demo administrative editing is locked, but live call workflows are fully usable.`
        : `<strong>You're all set!</strong> Open the Admin Portal to begin using Factory On Call. A welcome email will be sent to the address from the welcome screen.`}
    </div>
  `;

  stepContent.querySelectorAll(".copy-link").forEach(btn => {
    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(btn.dataset.link);
      setStatus("Link copied.", true);
    });
  });
}

function collectStepData() {
  if (step === 0) {
    state.firstName = document.getElementById("firstName")?.value.trim() || "";
    state.lastName = document.getElementById("lastName")?.value.trim() || "";
    state.email = document.getElementById("email")?.value.trim() || "";
    if (!state.companyName || state.companyName === "Production Plant") {
      state.companyName = state.type === "demo" ? DEMO_COMPANY_NAME : `${fullName() || "Production"} Plant`;
    }
  }

  if (state.type === "production" && step === 3) {
    state.companyName = document.getElementById("companyName")?.value.trim() || "";
  }
}

function validateStep() {
  if (step === 0) {
    if (!state.firstName || !state.lastName) {
      setStatus("First and last name are required.");
      return false;
    }

    if (!state.email || !state.email.includes("@")) {
      setStatus("A valid email address is required.");
      return false;
    }
  }

  if (state.type === "production" && step === 3 && !state.companyName) {
    setStatus("Plant name is required.");
    return false;
  }

  return true;
}

async function createCompany() {
  if (state.companyId) return;

  setStatus(state.type === "demo" ? "Creating demo plant..." : "Creating production plant...");

  const companyDocRef = doc(collection(db, "companies"));
  const companyId = companyDocRef.id;
  state.companyId = companyId;

  state.adminPin = state.type === "demo" ? "1000" : "1000";
  localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
  localStorage.setItem(COMPANY_NAME_KEY, state.companyName);

  const companyPayload = {
    companyId,
    companyName: state.companyName,
    contactName: fullName(),
    contactEmail: state.email,
    ownerFirstName: state.firstName,
    ownerLastName: state.lastName,
    ownerEmail: state.email,
    mode: state.type,
    plan: state.type === "production" ? state.plan : "demo",
    stripeStatus: state.type === "production" ? "placeholder_active" : "not_required",
    adminUserId: state.adminPin,
    adminPin: state.adminPin,
    portalBaseUrl: window.location.origin + window.location.pathname.replace(/[^/]+$/, ""),
    welcomeEmailStatus: state.type === "production" ? "pending" : "not_required",
    isDemo: state.type === "demo",
    adminLocked: state.type === "demo",
    active: true,
    onboardingVersion: "v2-floor-flow-style",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(companyDocRef, companyPayload, { merge: true });

  await setDoc(doc(db, "companies", companyId, "settings", "main"), {
    requirePinForCalls: true,
    allowSharedStations: true,
    autoRefreshMinutes: 60,
    demoRestrictionsEnabled: state.type === "demo",
    playNewCallSound: true,
    playAcknowledgeSound: true,
    playClosedSound: true,
    playEmergencySound: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "settings", "emergency"), {
    enabled: state.type === "demo",
    active: false,
    soundEnabled: true,
    message: "Plant Emergency — follow company emergency procedures.",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "branding", "main"), {
    companyName: state.companyName,
    primaryColor: "#1E90FF",
    secondaryColor: "#003366",
    logoUrl: "",
    theme: "light",
    updatedAt: serverTimestamp()
  }, { merge: true });

  for (const role of DEFAULT_ROLES) {
    await setDoc(doc(db, "companies", companyId, "roles", role), {
      name: role,
      active: true,
      permissions: {
        makeCall: true,
        viewCalls: true,
        acknowledgeCalls: role !== "Material Handler",
        closeCalls: role === "Supervisor" || role === "Maintenance" || role === "Quality"
      },
      isCallable: true,
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  for (const station of DEFAULT_STATIONS) {
    const stationId = safeId(station);
    await setDoc(doc(db, "companies", companyId, "stations", stationId), {
      stationId,
      name: station,
      description: "Production",
      cells: [station],
      active: true,
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  const adminUserPayload = state.type === "demo"
    ? {
        companyId,
        firstName: "Factory",
        lastName: "Administrator",
        name: "Factory Administrator",
        email: "demo@factoryoncall.local",
        uid: state.adminPin,
        employeeNumber: state.adminPin,
        pin: state.adminPin,
        role: "Supervisor",
        dept: "Administration",
        admin: true,
        active: true,
        demoUser: true,
        createdAt: serverTimestamp()
      }
    : {
        companyId,
        firstName: state.firstName,
        lastName: state.lastName,
        name: fullName(),
        email: state.email,
        uid: state.adminPin,
        employeeNumber: state.adminPin,
        pin: state.adminPin,
        role: "Supervisor",
        dept: "Administration",
        admin: true,
        active: true,
        createdAt: serverTimestamp()
      };

  await setDoc(doc(db, "companies", companyId, "users", state.adminPin), adminUserPayload, { merge: true });

  if (state.type === "demo") {
    await seedDemoCompany(companyId);
  }

  await setDoc(doc(db, "companies", companyId, "calls", "_seed_marker"), {
    marker: true,
    createdAt: serverTimestamp(),
    note: "Keeps calls collection initialized."
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "activity", "_seed_marker"), {
    marker: true,
    createdAt: serverTimestamp(),
    note: "Keeps activity collection initialized."
  }, { merge: true });

  setStatus("Plant created.", true);
}

async function seedDemoCompany(companyId) {
  const now = Date.now();

  await setDoc(doc(db, "companies", companyId), {
    companyName: DEMO_COMPANY_NAME,
    displayName: DEMO_COMPANY_NAME,
    mode: "demo",
    isDemo: true,
    adminLocked: true,
    demoPlantVersion: "v1-full-working-demo",
    demoResetAvailable: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "branding", "main"), {
    companyName: DEMO_COMPANY_NAME,
    primaryColor: "#1E90FF",
    secondaryColor: "#003366",
    theme: "light",
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "settings", "emergency"), {
    enabled: true,
    active: false,
    soundEnabled: true,
    message: "Plant Emergency — follow company emergency procedures.",
    demoLocked: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  for (const area of DEMO_AREAS) {
    await setDoc(doc(db, "companies", companyId, "areas", safeId(area.name)), {
      companyId,
      ...area,
      active: true,
      demoLocked: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  for (const station of DEMO_STATIONS) {
    const stationId = safeId(station.name);
    await setDoc(doc(db, "companies", companyId, "stations", stationId), {
      companyId,
      stationId,
      ...station,
      active: true,
      archived: false,
      demoLocked: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const demoUsers = [
    { id: "1001", pin: "1111", firstName: "Emma", lastName: "Turner", role: "Production Support", dept: "Assembly" },
    { id: "1002", pin: "2222", firstName: "Liam", lastName: "Brooks", role: "Production Support", dept: "Press Shop" },
    { id: "1003", pin: "3333", firstName: "Noah", lastName: "Reed", role: "Production Support", dept: "Machining" },
    { id: "1004", pin: "4444", firstName: "Olivia", lastName: "Parker", role: "Production Support", dept: "Packaging" },
    { id: "1005", pin: "5555", firstName: "Ethan", lastName: "Cole", role: "Material Handler", dept: "Materials" },
    { id: "1006", pin: "6666", firstName: "Ava", lastName: "Patel", role: "Production Support", dept: "Paint" },
    { id: "1007", pin: "7777", firstName: "Sarah", lastName: "Mitchell", role: "Supervisor", dept: "Production" },
    { id: "1008", pin: "8888", firstName: "Mike", lastName: "Anderson", role: "Supervisor", dept: "Production" },
    { id: "1009", pin: "9999", firstName: "Kevin", lastName: "Foster", role: "Maintenance", dept: "Maintenance" },
    { id: "1010", pin: "1010", firstName: "Chris", lastName: "Morgan", role: "Maintenance", dept: "Maintenance" },
    { id: "1011", pin: "1212", firstName: "Jessica", lastName: "Nguyen", role: "Quality", dept: "Quality" },
    { id: "1012", pin: "1313", firstName: "David", lastName: "Kim", role: "Production Support", dept: "Engineering" },
    { id: "1013", pin: "1414", firstName: "Rachel", lastName: "Green", role: "Supervisor", dept: "Management" }
  ];

  for (const user of demoUsers) {
    await setDoc(doc(db, "companies", companyId, "users", user.id), {
      companyId,
      ...user,
      uid: user.id,
      employeeNumber: user.id,
      badgeCode: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      admin: user.role === "Supervisor",
      active: true,
      archived: false,
      demoLocked: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const roleDocs = [
    { name: "Maintenance", close: true, any: false },
    { name: "Quality", close: true, any: false },
    { name: "Supervisor", close: true, any: true },
    { name: "Material Handler", close: false, any: false },
    { name: "Team Lead", close: true, any: true },
    { name: "Production Support", close: false, any: false }
  ];

  for (const role of roleDocs) {
    await setDoc(doc(db, "companies", companyId, "roles", role.name), {
      name: role.name,
      active: true,
      isCallable: true,
      demoLocked: true,
      permissions: {
        makeCall: true,
        viewCalls: true,
        acknowledgeCalls: true,
        closeCalls: role.close,
        respondAnyCall: role.any,
        supervisorPortal: role.any,
        clearEmergency: role.any
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const activeCalls = [
    {
      id: "demo-active-press-200-maintenance",
      station: "Press 200",
      stationName: "Press 200",
      area: "Press Shop",
      areaName: "Press Shop",
      cells: ["Press 200"],
      roles: ["Maintenance"],
      status: "waiting",
      requestedByName: "Press 200",
      callerFirst: "",
      callerLast: "",
      timeStarted: now - 11 * 60000,
      requestedAt: now - 11 * 60000,
      demoCall: true
    },
    {
      id: "demo-active-cnc-01-quality",
      station: "CNC 01",
      stationName: "CNC 01",
      area: "Machining",
      areaName: "Machining",
      cells: ["CNC 01"],
      roles: ["Quality"],
      status: "ack",
      ackBy: "Jessica Nguyen",
      acknowledgedByName: "Jessica Nguyen",
      requestedByName: "CNC 01",
      callerFirst: "",
      callerLast: "",
      timeStarted: now - 23 * 60000,
      requestedAt: now - 23 * 60000,
      ackAt: now - 17 * 60000,
      timeAcknowledged: now - 17 * 60000,
      demoCall: true
    }
  ];

  for (const call of activeCalls) {
    const { id, ...payload } = call;
    await setDoc(doc(db, "companies", companyId, "calls", id), {
      companyId,
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const callTypes = [
    { roles: ["Maintenance"], notes: "Cleared jam and restarted line." },
    { roles: ["Quality"], notes: "Quality check completed and approved." },
    { roles: ["Material Handler"], notes: "Material delivered to station." },
    { roles: ["Supervisor"], notes: "Supervisor review completed." },
    { roles: ["Team Lead"], notes: "Team lead assisted with setup." },
    { roles: ["Production Support"], notes: "Production support completed request." }
  ];
  const stations = DEMO_STATIONS;
  const responders = ["Sarah Mitchell", "Mike Anderson", "Kevin Foster", "Chris Morgan", "Jessica Nguyen", "Rachel Green"];

  for (let i = 0; i < 54; i++) {
    const station = stations[i % stations.length];
    const type = callTypes[i % callTypes.length];
    const start = now - ((i + 3) * 2.7 * 60 * 60000) - ((i % 5) * 11 * 60000);
    const ackDelay = 2 + (i % 9);
    const clearDelay = 7 + (i % 18);
    const ack = start + ackDelay * 60000;
    const closed = ack + clearDelay * 60000;
    const responder = responders[i % responders.length];

    await setDoc(doc(db, "companies", companyId, "calls", `demo-history-${String(i + 1).padStart(2, "0")}`), {
      companyId,
      station: station.name,
      stationName: station.name,
      area: station.area,
      areaName: station.area,
      cells: station.cells,
      roles: type.roles,
      status: "closed",
      requestedByName: station.name,
      callerFirst: "",
      callerLast: "",
      ackBy: responder,
      acknowledgedByName: responder,
      closedBy: responder,
      closedByName: responder,
      resolutionSummary: type.notes,
      notes: type.notes,
      timeStarted: start,
      requestedAt: start,
      ackAt: ack,
      timeAcknowledged: ack,
      timeClosed: closed,
      closedAt: closed,
      responseMinutes: ackDelay,
      resolutionMinutes: clearDelay,
      totalDurationMinutes: ackDelay + clearDelay,
      demoCall: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  const emergencySamples = [
    { station: "Paint Booth", area: "Paint", agoHours: 16, durationSeconds: 420, clearedBy: "Sarah Mitchell" },
    { station: "Press 300", area: "Press Shop", agoHours: 52, durationSeconds: 660, clearedBy: "Mike Anderson" },
    { station: "Shipping Dock", area: "Shipping", agoHours: 106, durationSeconds: 300, clearedBy: "Rachel Green" }
  ];

  for (let i = 0; i < emergencySamples.length; i++) {
    const ev = emergencySamples[i];
    const startedAt = now - ev.agoHours * 60 * 60000;
    const clearedAt = startedAt + ev.durationSeconds * 1000;
    await setDoc(doc(db, "companies", companyId, "emergencyEvents", `demo-emergency-${i + 1}`), {
      companyId,
      stationName: ev.station,
      activatedByStation: ev.station,
      areaName: ev.area,
      area: ev.area,
      active: false,
      activatedAt: startedAt,
      startedAt,
      clearedAt,
      endedAt: clearedAt,
      clearedByName: ev.clearedBy,
      clearedBy: ev.clearedBy,
      durationSeconds: ev.durationSeconds,
      demoEvent: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

backBtn.addEventListener("click", () => {
  collectStepData();
  if (step > 0 && !state.companyId) step--;
  render();
});

nextBtn.addEventListener("click", async () => {
  collectStepData();

  if (state.companyId) {
    window.location.href = buildLink("admin.html");
    return;
  }

  if (!validateStep()) return;

  if (state.type === "demo" && step === 1) {
    nextBtn.disabled = true;
    try {
      await createCompany();
      step = 2;
      render();
    } catch (error) {
      console.error(error);
      state.companyId = "";
      setStatus("Could not create demo plant. Check Firestore rules and try again.");
    } finally {
      nextBtn.disabled = false;
    }
    return;
  }

  if (state.type === "production" && step === 2) {
    state.checkoutStarted = true;
    state.checkoutComplete = true;
    // Real Stripe URLs will replace this placeholder flow:
    // window.location.href = state.plan === "annual" ? STRIPE_ANNUAL_URL : STRIPE_MONTHLY_URL;
    step = 3;
    render();
    setStatus("Stripe checkout placeholder complete.", true);
    return;
  }

  if (state.type === "production" && step === 3) {
    nextBtn.disabled = true;
    try {
      await createCompany();
      step = 4;
      render();
    } catch (error) {
      console.error(error);
      state.companyId = "";
      setStatus("Could not create production plant. Check Firestore rules and try again.");
    } finally {
      nextBtn.disabled = false;
    }
    return;
  }

  step++;
  render();
});

render();
