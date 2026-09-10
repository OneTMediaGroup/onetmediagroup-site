const DEMO_COMPANY_NAME = "Northwind Manufacturing";
const COMPANY_STORAGE_KEY = "factory_on_call_active_company_id";
const COMPANY_NAME_KEY = "factory_on_call_company_name";

const stepContent = document.getElementById("stepContent");
const stepLabel = document.getElementById("stepLabel");
const progressFill = document.getElementById("progressFill");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const statusText = document.getElementById("statusText");

const CREATE_CHECKOUT_URL = "https://us-central1-factoryoncall.cloudfunctions.net/createFactoryOnCallCheckoutSession";
const STRIPE_MONTHLY_PRICE_ID = "price_1UDuTT1uRlTVrdir49DljgIa";
const STRIPE_ANNUAL_PRICE_ID = "price_1UDuVH1uRlTVrdirJPOWtldy";

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
  adminUserId: "1000",
  checkoutStarted: false,
  checkoutComplete: false,
  checkoutPending: false
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

function basePortalUrl() {
  return `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}`;
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
    <p>Choose monthly or annual billing. Checkout opens securely through Stripe.</p>

    <div class="choice-grid plan-grid">
      <article class="choice-card plan-card ${state.plan === "monthly" ? "active" : ""}" data-plan="monthly">
        <div class="choice-topline"><span class="choice-icon">M</span><strong>Monthly</strong></div>
        <p>Flexible monthly billing for live plant use.</p>
        <div class="price-line">$24.99 CAD / month</div>
      </article>

      <article class="choice-card plan-card ${state.plan === "annual" ? "active" : ""}" data-plan="annual">
        <div class="choice-topline"><span class="choice-icon">A</span><strong>Annual</strong></div>
        <p>Best value for plants ready to run Factory On Call long term.</p>
        <div class="price-line">$249.99 CAD / year</div>
      </article>
    </div>

    <div class="demo-note">
      <strong>Secure checkout:</strong> Your Production Plant is created after Stripe confirms payment. A welcome email with your Plant Code, User ID, PIN, and portal links will be sent automatically.
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
    <h2>Returning from Stripe...</h2>
    <p>Factory On Call is waiting for your secure checkout confirmation.</p>

    <div class="activation-card">
      <div class="activation-badge">Stripe Checkout</div>
      <p>Plan selected: <strong>${state.plan === "annual" ? "Annual" : "Monthly"}</strong></p>
    </div>
  `;
}

function renderCompleteStep() {
  const isDemo = state.type === "demo";
  const adminUserId = state.adminUserId;
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

  return true;
}


async function startStripeCheckout() {
  setStatus("Opening secure Stripe checkout...");
  nextBtn.disabled = true;

  try {
    const response = await fetch(CREATE_CHECKOUT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        plan: state.plan,
        baseUrl: basePortalUrl(),
        monthlyPriceId: STRIPE_MONTHLY_PRICE_ID,
        annualPriceId: STRIPE_ANNUAL_PRICE_ID
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) {
      throw new Error(payload.error || "Could not start Stripe checkout.");
    }

    sessionStorage.setItem("factory_on_call_pending_checkout", JSON.stringify({
      firstName: state.firstName,
      lastName: state.lastName,
      email: state.email,
      plan: state.plan,
      companyId: payload.companyId || "",
      onboardingToken: payload.onboardingToken,
      startedAt: Date.now()
    }));

    window.location.href = payload.url;
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "Could not start Stripe checkout.");
    nextBtn.disabled = false;
  }
}

async function hydrateCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get("checkout");
  if (!checkout) return false;

  if (checkout === "cancelled") {
    const pending = JSON.parse(sessionStorage.getItem("factory_on_call_pending_checkout") || "{}");
    state.firstName = pending.firstName || state.firstName;
    state.lastName = pending.lastName || state.lastName;
    state.email = pending.email || state.email;
    state.plan = params.get("plan") || pending.plan || "monthly";
    state.type = "production";
    step = 2;
    render();
    setStatus("Stripe checkout was cancelled. Choose a plan to try again.");
    return true;
  }

  if (checkout === "success") {
    const companyId = params.get("companyId") || "";
    const pending = JSON.parse(sessionStorage.getItem("factory_on_call_pending_checkout") || "{}");
    state.type = "production";
    state.plan = params.get("plan") || pending.plan || "monthly";
    state.companyId = companyId || pending.companyId || "";
    state.firstName = pending.firstName || state.firstName;
    state.lastName = pending.lastName || state.lastName;
    state.email = pending.email || state.email;
    state.adminPin = "";
    state.companyName = `${state.firstName || "Production"} Plant`;

    if (state.companyId) {
      localStorage.setItem(COMPANY_STORAGE_KEY, state.companyId);
      try {
        const response = await fetch("https://us-central1-factoryoncall.cloudfunctions.net/finishPlantOnboarding", {
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({companyId:state.companyId,onboardingToken:pending.onboardingToken})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Plant activation is still pending.");
        state.companyName=data.companyName;state.adminPin=data.adminPin;state.adminUserId=data.adminUserId;
        localStorage.setItem(COMPANY_NAME_KEY,state.companyName);
      } catch (error) {
        step = 2; render(); nextBtn.disabled = true;
        setStatus(error.message || "Plant activation is pending. Refresh in a moment."); return true;
      }
    }

    // Keep the short-lived onboarding proof in this tab so refresh can recover the activation details.
    step = 4;
    render();
    setStatus("Payment confirmed. Your Production Plant is being activated. If details are still loading, refresh in a moment.", true);
    return true;
  }

  return false;
}

async function createCompany() {
  if (state.companyId) return;
  setStatus("Creating demo plant...");
  let requestId = sessionStorage.getItem("foc_demo_request");
  if (!requestId) { requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,"0")).join(""); sessionStorage.setItem("foc_demo_request", requestId); }
  const response = await fetch("https://us-central1-factoryoncall.cloudfunctions.net/createDemoPlant", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({firstName:state.firstName,lastName:state.lastName,email:state.email,requestId})
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not create demo plant.");
  state.companyId=result.companyId;state.companyName=result.companyName;state.adminPin=result.adminPin;
  localStorage.setItem(COMPANY_STORAGE_KEY,state.companyId);localStorage.setItem(COMPANY_NAME_KEY,state.companyName);
  sessionStorage.removeItem("foc_demo_request");
  setStatus("Plant created.",true);
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
      setStatus(error.message || "Could not create demo plant. Please try again.");
    } finally {
      nextBtn.disabled = false;
    }
    return;
  }

  if (state.type === "production" && step === 2) {
    await startStripeCheckout();
    return;
  }

  step++;
  render();
});

(async () => {
  const handledCheckoutReturn = await hydrateCheckoutReturn();
  if (!handledCheckoutReturn) render();
})();
