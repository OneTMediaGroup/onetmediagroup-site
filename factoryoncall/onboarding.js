import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
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
  "Press 1",
  "Press 2",
  "Assembly 1",
  "Assembly 2",
  "Packaging",
  "Receiving"
];

let step = 0;
const state = {
  type: "demo",
  companyName: "",
  contactName: "",
  contactEmail: "",
  adminFirstName: "",
  adminLastName: "",
  adminPin: "",
  selectedRoles: [...DEFAULT_ROLES],
  selectedStations: [...DEFAULT_STATIONS],
  companyId: ""
};

function safeId(value = "") {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "company"}-${suffix}`;
}

function buildLink(page) {
  return `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, page)}?companyId=${encodeURIComponent(state.companyId)}`;
}

function setStatus(message = "", good = false) {
  statusText.textContent = message;
  statusText.className = good ? "status-text success" : "status-text";
}

function updateProgress() {
  const total = 6;
  stepLabel.textContent = `Step ${Math.min(step + 1, total)} of ${total}`;
  progressFill.style.width = `${((step + 1) / total) * 100}%`;
  backBtn.style.visibility = step === 0 ? "hidden" : "visible";
  nextBtn.textContent = step === 5 ? "Open Admin" : step === 4 ? "Create Company" : "Next";
}

function render() {
  updateProgress();
  setStatus("");

  if (step === 0) renderTypeStep();
  if (step === 1) renderCompanyStep();
  if (step === 2) renderAdminStep();
  if (step === 3) renderSetupStep();
  if (step === 4) renderReviewStep();
  if (step === 5) renderCompleteStep();
}

function renderTypeStep() {
  stepContent.innerHTML = `
    <h2>Choose how you want to begin.</h2>
    <p>Start with a locked demo company to test the workflow, or create a production company for live use.</p>

    <div class="choice-grid">
      <article class="choice-card ${state.type === "demo" ? "active" : ""}" data-type="demo">
        <h3>Demo Company</h3>
        <p>Explore Factory On Call with sample stations, users, roles, and live call flow.</p>
        <ul>
          <li>Preloaded sample setup</li>
          <li>Call, viewer, and display testing</li>
          <li>Admin editing locked</li>
        </ul>
      </article>

      <article class="choice-card ${state.type === "production" ? "active" : ""}" data-type="production">
        <h3>Production Company</h3>
        <p>Create a clean company for real factory use.</p>
        <ul>
          <li>Your company name</li>
          <li>Your admin PIN</li>
          <li>Your starter stations and roles</li>
        </ul>
      </article>
    </div>
  `;

  stepContent.querySelectorAll(".choice-card").forEach(card => {
    card.addEventListener("click", () => {
      state.type = card.dataset.type;
      if (state.type === "demo" && !state.companyName) state.companyName = "Factory On Call Demo";
      render();
    });
  });
}

function renderCompanyStep() {
  stepContent.innerHTML = `
    <h2>Company information</h2>
    <p>This creates the company workspace used by Admin, Call Station, Interactive Viewer, and Production Display pages.</p>

    <div class="form-grid">
      <div class="form-field full">
        <label>Company Name</label>
        <input id="companyName" value="${escapeHtml(state.companyName || (state.type === "demo" ? "Factory On Call Demo" : ""))}" placeholder="ABC Plastics" />
      </div>

      <div class="form-field">
        <label>Contact Name</label>
        <input id="contactName" value="${escapeHtml(state.contactName)}" placeholder="Scot Anderson" />
      </div>

      <div class="form-field">
        <label>Contact Email</label>
        <input id="contactEmail" type="email" value="${escapeHtml(state.contactEmail)}" placeholder="name@company.com" />
      </div>
    </div>

    ${state.type === "demo" ? `<div class="demo-note"><strong>Demo mode:</strong> Admin setup changes will be locked so users can test the system without turning the demo into a free production company.</div>` : ""}
  `;
}

function renderAdminStep() {
  stepContent.innerHTML = `
    <h2>Create administrator</h2>
    <p>This account manages company setup, links, users, stations, roles, and branding.</p>

    <div class="form-grid">
      <div class="form-field">
        <label>First Name</label>
        <input id="adminFirstName" value="${escapeHtml(state.adminFirstName)}" placeholder="Admin" />
      </div>

      <div class="form-field">
        <label>Last Name</label>
        <input id="adminLastName" value="${escapeHtml(state.adminLastName)}" placeholder="User" />
      </div>

      <div class="form-field">
        <label>Admin PIN / Employee Number</label>
        <input id="adminPin" value="${escapeHtml(state.adminPin)}" placeholder="1000" />
      </div>
    </div>
  `;
}

function renderSetupStep() {
  stepContent.innerHTML = `
    <h2>Starter roles and stations</h2>
    <p>Choose the starter setup. You can adjust production companies later from Admin.</p>

    <h3>Roles</h3>
    <div class="check-grid" id="roleChecks">
      ${DEFAULT_ROLES.map(role => `
        <label class="check-pill">
          <input type="checkbox" value="${escapeHtml(role)}" ${state.selectedRoles.includes(role) ? "checked" : ""} />
          ${escapeHtml(role)}
        </label>
      `).join("")}
    </div>

    <h3>Stations</h3>
    <div class="check-grid" id="stationChecks">
      ${DEFAULT_STATIONS.map(station => `
        <label class="check-pill">
          <input type="checkbox" value="${escapeHtml(station)}" ${state.selectedStations.includes(station) ? "checked" : ""} />
          ${escapeHtml(station)}
        </label>
      `).join("")}
    </div>

    <div class="form-field full" style="margin-top:16px;">
      <label>Custom Stations (optional, one per line)</label>
      <textarea id="customStations" placeholder="Line 1\\nTool Room\\nShipping"></textarea>
    </div>
  `;
}

function renderReviewStep() {
  stepContent.innerHTML = `
    <h2>Review and create</h2>
    <p>Factory On Call will create a company workspace and generate the access links.</p>

    <div class="summary-box">
      <p><strong>Type:</strong> ${state.type === "demo" ? "Demo Company" : "Production Company"}</p>
      <p><strong>Company:</strong> ${escapeHtml(state.companyName || "Not set")}</p>
      <p><strong>Admin:</strong> ${escapeHtml(`${state.adminFirstName} ${state.adminLastName}`.trim() || "Not set")}</p>
      <p><strong>Roles:</strong> ${state.selectedRoles.length}</p>
      <p><strong>Stations:</strong> ${state.selectedStations.length}</p>
      ${state.type === "demo" ? `<p><strong>Demo Restrictions:</strong> Admin editing locked, live call testing allowed.</p>` : ""}
    </div>
  `;
}

function renderCompleteStep() {
  stepContent.innerHTML = `
    <h2>Factory On Call is ready.</h2>
    <p>Your company workspace has been created. Save these links for quick access.</p>

    <div class="link-list">
      ${[
        ["Admin", "admin.html"],
        ["Call Station", "call.html"],
        ["Viewer", "viewer.html"],
        ["Display", "display.html"]
      ].map(([label, page]) => `
        <div class="link-row">
          <strong>${label}</strong>
          <code>${buildLink(page)}</code>
          <button class="btn secondary copy-link" data-link="${buildLink(page)}" type="button">Copy</button>
        </div>
      `).join("")}
    </div>

    ${state.type === "demo" ? `<div class="demo-note"><strong>Demo Company:</strong> You can test calls, viewer updates, and display board updates. Admin setup changes are locked.</div>` : ""}
  `;

  stepContent.querySelectorAll(".copy-link").forEach(btn => {
    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(btn.dataset.link);
      setStatus("Link copied.", true);
    });
  });
}

function collectStepData() {
  if (step === 1) {
    state.companyName = document.getElementById("companyName")?.value.trim() || "";
    state.contactName = document.getElementById("contactName")?.value.trim() || "";
    state.contactEmail = document.getElementById("contactEmail")?.value.trim() || "";
  }

  if (step === 2) {
    state.adminFirstName = document.getElementById("adminFirstName")?.value.trim() || "";
    state.adminLastName = document.getElementById("adminLastName")?.value.trim() || "";
    state.adminPin = document.getElementById("adminPin")?.value.trim() || "";
  }

  if (step === 3) {
    state.selectedRoles = Array.from(document.querySelectorAll("#roleChecks input:checked")).map(x => x.value);
    const checkedStations = Array.from(document.querySelectorAll("#stationChecks input:checked")).map(x => x.value);
    const customStations = (document.getElementById("customStations")?.value || "")
      .split("\\n")
      .map(x => x.trim())
      .filter(Boolean);

    state.selectedStations = Array.from(new Set([...checkedStations, ...customStations]));
  }
}

function validateStep() {
  if (step === 1 && !state.companyName) {
    setStatus("Company name is required.");
    return false;
  }

  if (step === 2) {
    if (!state.adminFirstName || !state.adminLastName) {
      setStatus("Admin first and last name are required.");
      return false;
    }

    if (!state.adminPin) {
      setStatus("Admin PIN / employee number is required.");
      return false;
    }
  }

  if (step === 3) {
    if (!state.selectedRoles.length) {
      setStatus("Select at least one role.");
      return false;
    }

    if (!state.selectedStations.length) {
      setStatus("Select at least one station.");
      return false;
    }
  }

  return true;
}

async function createCompany() {
  if (state.companyId) return;

  setStatus("Creating company...");

  const companyId = state.type === "demo"
    ? `demo-${safeId(state.companyName)}`
    : safeId(state.companyName);

  state.companyId = companyId;

  localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
  localStorage.setItem(COMPANY_NAME_KEY, state.companyName);

  const companyPayload = {
    companyId,
    companyName: state.companyName,
    contactName: state.contactName,
    contactEmail: state.contactEmail,
    mode: state.type,
    isDemo: state.type === "demo",
    adminLocked: state.type === "demo",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, "companies", companyId), companyPayload, { merge: true });

  await setDoc(doc(db, "companies", companyId, "settings", "main"), {
    requirePinForCalls: true,
    allowSharedStations: true,
    autoRefreshMinutes: 60,
    demoRestrictionsEnabled: state.type === "demo",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "companies", companyId, "branding", "main"), {
    companyName: state.companyName,
    primaryColor: "#1E90FF",
    secondaryColor: "#003366",
    logoUrl: "",
    updatedAt: serverTimestamp()
  }, { merge: true });

  for (const role of state.selectedRoles) {
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

  for (const station of state.selectedStations) {
    const stationId = safeId(station).replace(/-[a-z0-9]{6}$/, "");
    await setDoc(doc(db, "companies", companyId, "stations", stationId), {
      stationId,
      name: station,
      description: "Production",
      cells: [station],
      active: true,
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  await setDoc(doc(db, "companies", companyId, "users", state.adminPin), {
    companyId,
    firstName: state.adminFirstName,
    lastName: state.adminLastName,
    name: `${state.adminFirstName} ${state.adminLastName}`.trim(),
    uid: state.adminPin,
    employeeNumber: state.adminPin,
    pin: state.adminPin,
    role: "Supervisor",
    dept: "Administration",
    admin: true,
    active: true,
    createdAt: serverTimestamp()
  }, { merge: true });

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

  setStatus("Company created.", true);
}

async function seedDemoCompany(companyId) {
  const demoUsers = [
    { id: "1001", pin: "1111", firstName: "Jake", lastName: "Miller", role: "Maintenance", dept: "Production" },
    { id: "1002", pin: "2222", firstName: "A.", lastName: "Patel", role: "Quality", dept: "Quality" },
    { id: "1003", pin: "3333", firstName: "J.", lastName: "Smith", role: "Supervisor", dept: "Production" },
    { id: "1004", pin: "4444", firstName: "Maria", lastName: "Lopez", role: "Material Handler", dept: "Materials" },
    { id: "1005", pin: "5555", firstName: "Lee", lastName: "Chen", role: "Team Lead", dept: "Production" }
  ];

  for (const user of demoUsers) {
    await setDoc(doc(db, "companies", companyId, "users", user.id), {
      companyId,
      ...user,
      uid: user.id,
      employeeNumber: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      active: true,
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  const sampleCalls = [
    {
      station: "Press 1",
      cells: ["Press 1"],
      roles: ["Maintenance"],
      status: "waiting",
      requestedByName: "J. Smith",
      timeStarted: Date.now() - 7 * 60000
    },
    {
      station: "Assembly 1",
      cells: ["Assembly 1"],
      roles: ["Quality"],
      status: "ack",
      ackBy: "A. Patel",
      requestedByName: "Lee Chen",
      timeStarted: Date.now() - 16 * 60000
    }
  ];

  for (const call of sampleCalls) {
    await setDoc(doc(db, "companies", companyId, "calls", safeId(`${call.station}-${call.status}`)), {
      companyId,
      ...call,
      demoCall: true,
      createdAt: serverTimestamp()
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
  if (step > 0) step--;
  render();
});

nextBtn.addEventListener("click", async () => {
  collectStepData();

  if (step === 5) {
    window.location.href = buildLink("admin.html");
    return;
  }

  if (!validateStep()) return;

  if (step === 4) {
    nextBtn.disabled = true;
    try {
      await createCompany();
      step++;
      render();
    } catch (error) {
      console.error(error);
      state.companyId = "";
      setStatus("Could not create company. Check Firestore rules and try again.");
    } finally {
      nextBtn.disabled = false;
    }
    return;
  }

  step++;
  render();
});

render();
