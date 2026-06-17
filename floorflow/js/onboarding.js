import { db } from './firebase-config.js';
import { setActivePlantId, buildPlantLink, buildRelativePlantLink, plantAccessPages } from './plant-session.js';
import { seedOnboardingPlant } from './onboarding-nested-seed.js';
import { buildStripeCheckoutUrl, clearProductionPaymentState, createStripeCheckoutSession, FLOORFLOW_PLAN_PRICES, getPendingProductionPlantId, getSelectedStripePlan, isProductionPaymentComplete, isStripePaymentLinkConfigured, normalizeStripePlan, saveActivationState } from './activation.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const stepEl = document.getElementById('onboardingStep');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const FLOORFLOW_DEMO_WELCOME_ENDPOINT = 'https://northamerica-northeast1-die-changeover-board.cloudfunctions.net/sendFloorFlowDemoWelcome';

let step = 0;
let onboardingCreateInProgress = false;
let checkoutCreateInProgress = false;
let recoveryState = null;

const TIMEZONES = [
  'America/Toronto',
  'America/New_York',
  'America/Chicago',
  'America/Winnipeg',
  'America/Denver',
  'America/Edmonton',
  'America/Vancouver',
  'America/Los_Angeles',
  'America/Halifax',
  'America/St_Johns',
  'UTC'
];

const state = {
  mode: 'demo',
  plantName: 'Demo Plant',
  companyName: 'Demo Plant',
  timezone: getDefaultTimezone(),
  brandingMode: 'text',
  brandText: '',
  logoUrl: '',
  adminFirstName: '',
  adminLastName: '',
  adminName: '',
  adminEmail: '',
  adminEmployeeId: '',
  adminBadgeCode: '',
  selectedPlan: getSelectedStripePlan(),
  pendingPlantId: getPendingProductionPlantId(),
  areaName: 'Main Floor',
  equipmentName: 'First Work Cell'
};

const startupParams = new URLSearchParams(window.location.search);
const returnedFromStripeCheckout = isProductionPaymentComplete();

if (startupParams.get('mode') === 'production' || returnedFromStripeCheckout) {
  state.mode = 'production';
  if (state.plantName === 'Demo Plant') state.plantName = '';
}

// When Stripe sends the customer back after successful checkout, land them
// directly on the Production Checkout step so they can click Next and continue.
if (returnedFromStripeCheckout) {
  step = 3;
}

function getOnboardingSteps() {
  const sharedSteps = [
    renderPlantSetup,
    renderBranding,
    renderAdmin,
    renderArea,
    renderEquipment,
    renderComplete
  ];

  if (state.mode === 'production') {
    return [
      renderWelcome,
      renderPlantType,
      renderPlantSetup,
      renderProductionActivation,
      renderBranding,
      renderAdmin,
      renderArea,
      renderEquipment,
      renderComplete
    ];
  }

  return [
    renderWelcome,
    renderPlantType,
    ...sharedSteps
  ];
}

initOnboarding();

async function initOnboarding() {
  await detectProductionRecovery();
  render();
}

async function detectProductionRecovery() {
  const plantId = startupParams.get('plantId') || state.pendingPlantId || getPendingProductionPlantId() || localStorage.getItem('floor_flow_active_plant_id') || '';

  if (!plantId) return;

  try {
    const snap = await getDoc(doc(db, 'plants', plantId));
    if (!snap.exists()) return;

    const plant = snap.data() || {};
    const isProduction = plant.mode === 'production' || plant.environment === 'production' || plant.isDemo === false;
    const isUnlocked = plant.productionUnlocked === true || plant.paid === true || plant.subscriptionStatus === 'active' || plant.billingStatus === 'active';

    if (!isProduction || !isUnlocked) return;

    state.mode = 'production';
    state.pendingPlantId = plantId;
    state.selectedPlan = normalizeStripePlan(plant.billingPlan || state.selectedPlan || getSelectedStripePlan());
    state.plantName = plant.plantName || plant.name || state.plantName || 'Production Plant';
    state.companyName = plant.companyName || state.plantName;
    state.brandText = plant.brandText || plant.branding?.brandText || state.brandText || state.plantName;
    state.timezone = plant.timezone || state.timezone;
    if (state.mode === 'demo') {
      await sendDemoWelcomeEmail(plantId);
    }

    setActivePlantId(plantId);
    localStorage.setItem('floor_flow_pending_plant_id', plantId);

    recoveryState = {
      plantId,
      plant,
      setupComplete: plant.setupComplete === true,
      pendingOnboarding: plant.pendingOnboarding !== false
    };
  } catch (error) {
    console.warn('Onboarding recovery check skipped:', error);
  }
}

nextBtn.addEventListener('click', async () => {
  if (recoveryState) {
    if (recoveryState.setupComplete) {
      window.location.href = buildRelativePlantLink('admin.html', recoveryState.plantId);
      return;
    }

    recoveryState = null;
    state.mode = 'production';
    step = 4;
    render();
    return;
  }

  saveCurrentStep();

  if (!validateStep()) return;

  if (step < getOnboardingSteps().length - 1) {
    step += 1;
    render();
    return;
  }

  await finishOnboarding();
});

backBtn.addEventListener('click', () => {
  saveCurrentStep();

  if (step > 0) {
    step -= 1;
    render();
  }
});


// Browser Back from Stripe can restore this page from the back/forward cache
// with the old "Opening Stripe..." state still in memory. Reset and redraw so
// onboarding stays usable if the customer uses the browser Back button.
window.addEventListener('pageshow', async (event) => {
  const navigation = performance.getEntriesByType?.('navigation')?.[0];
  const restoredFromHistory = event.persisted || navigation?.type === 'back_forward';

  if (!restoredFromHistory) return;

  checkoutCreateInProgress = false;
  recoveryState = null;
  await detectProductionRecovery();
  render();
});

window.addEventListener('popstate', async () => {
  checkoutCreateInProgress = false;
  recoveryState = null;
  await detectProductionRecovery();
  render();
});

window.addEventListener('focus', () => {
  if (!checkoutCreateInProgress) return;
  checkoutCreateInProgress = false;
  render();
});

function render() {
  if (recoveryState) {
    stepEl.innerHTML = renderRecoveryScreen(recoveryState);
    progressText.textContent = recoveryState.setupComplete ? 'Plant Active' : 'Payment Confirmed';
    progressFill.style.width = recoveryState.setupComplete ? '100%' : '45%';
    backBtn.disabled = true;
    nextBtn.textContent = recoveryState.setupComplete ? 'Open Admin Console' : 'Continue Setup';
    nextBtn.disabled = false;
    wireRecoveryActions();
    return;
  }

  const activeSteps = getOnboardingSteps();

  if (step > activeSteps.length - 1) {
    step = activeSteps.length - 1;
  }

  stepEl.innerHTML = activeSteps[step]();

  backBtn.disabled = step === 0;
  nextBtn.textContent = step === activeSteps.length - 1 ? 'Finish Setup' : 'Next';

  progressText.textContent = `Step ${step + 1} of ${activeSteps.length}`;
  progressFill.style.width = `${((step + 1) / activeSteps.length) * 100}%`;

  wireLivePreview();
  wirePlantTypeCards();
  wirePaymentActions();
}


function renderRecoveryScreen(recovery) {
  const plantId = recovery.plantId;
  const plantName = recovery.plant?.plantName || recovery.plant?.name || state.plantName || 'Production Plant';
  const title = recovery.setupComplete ? 'Production Plant Already Configured' : 'Production Plant Activated';
  const copy = recovery.setupComplete
    ? 'This plant is already active. Open Admin or view the plant access links below.'
    : 'Stripe payment is confirmed. Continue setup to finish creating the plant.';

  return `
    <div class="launch-ready compact-ready recovery-ready">
      <div class="ready-icon">✓</div>
      <h2 class="step-title">${escapeHtml(title)}</h2>
      <p class="step-copy ready-copy">${escapeHtml(copy)}</p>

      <div class="ready-check-grid final-ready-grid">
        <div>✓ Subscription Active</div>
        <div>✓ Production Plant Unlocked</div>
        <div>✓ Plant ID Saved</div>
        <div>${recovery.setupComplete ? '✓ Setup Complete' : '✓ Ready To Continue Setup'}</div>
      </div>

      <div class="launch-panel ready-summary-card">
        <div class="launch-kicker">Production Plant</div>
        <h3>${escapeHtml(plantName)}</h3>
        <p><strong>Plant ID:</strong> ${escapeHtml(plantId)}</p>
      </div>

      <div class="activation-actions-inline recovery-actions">
        ${recovery.setupComplete
          ? `<a class="button secondary" href="${buildRelativePlantLink('admin.html', plantId)}">Open Admin</a>
             <button type="button" class="button ghost" data-toggle-recovery-links>View Plant Links</button>`
          : '<button type="button" class="button primary" data-recovery-continue>Continue Setup</button>'}
      </div>

      <div id="recoveryPlantLinks" class="plant-access-onboarding-grid compact-links-grid" hidden>
        ${plantAccessPages().map((item) => {
          const fullUrl = buildPlantLink(item.page, plantId);
          const relativeUrl = buildRelativePlantLink(item.page, plantId);
          return `
            <div class="plant-link-share-row">
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.description)}</span>
                <code>${escapeHtml(fullUrl)}</code>
              </div>
              <div class="plant-link-share-actions">
                <a class="button primary" href="${escapeAttr(relativeUrl)}">Open</a>
                <button type="button" class="button secondary" data-copy-plant-link="${escapeAttr(fullUrl)}">Copy</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function wireRecoveryActions() {
  document.querySelector('[data-recovery-continue]')?.addEventListener('click', () => {
    recoveryState = null;
    state.mode = 'production';
    step = 3;
    nextBtn.onclick = null;
    render();
  });

  document.querySelector('[data-toggle-recovery-links]')?.addEventListener('click', (event) => {
    const box = document.getElementById('recoveryPlantLinks');
    if (!box) return;
    box.hidden = !box.hidden;
    event.currentTarget.textContent = box.hidden ? 'View Plant Links' : 'Hide Plant Links';
  });

  if (recoveryState?.plantId) {
    wirePlantAccessCopyButtons(recoveryState.plantId);
  }
}

function renderWelcome() {
  return `
    <h2 class="step-title">Welcome to Floor Flow</h2>
    <p class="step-copy">
      Real-time floor management for production teams. Track work cells, manage users,
      print badges, monitor live activity, and control the floor.
    </p>

    <div class="feature-list">
      <div class="feature"><strong>Live floor boards</strong><span>Display and touchscreen views for the plant floor.</span></div>
      <div class="feature"><strong>Supervisor control</strong><span>Queue planning, status updates, and floor visibility.</span></div>
      <div class="feature"><strong>Employee badges</strong><span>Print clean operator and staff badges from Admin later.</span></div>
      <div class="feature"><strong>Plant branding</strong><span>Use your company logo and plant identity.</span></div>
    </div>
  `;
}


function renderPlantType() {
  return `
    <h2 class="step-title">Choose Plant Type</h2>
    <p class="step-copy">
      Start with a safe demo plant or activate a clean production plant for live factory use.
    </p>

    <div class="plant-type-grid">
      <button type="button" class="plant-type-card ${state.mode === 'demo' ? 'selected' : ''}" data-select-mode="demo">
        <div class="plant-type-badge demo">Free Demo</div>
        <h3>Demo Plant</h3>
        <p>Creates a guided demo environment so you can test the full system before going live.</p>
        <ul>
          <li>Sample floor data</li>
          <li>Parts library examples</li>
          <li>No activation needed</li>
        </ul>
      </button>

      <button type="button" class="plant-type-card ${state.mode === 'production' ? 'selected' : ''}" data-select-mode="production">
        <div class="plant-type-badge production">Paid Plant</div>
        <h3>Production Plant</h3>
        <p>Creates a clean live plant for real operators, supervisors, floor displays, and reports.</p>
        <ul>
          <li>No demo data</li>
          <li>Real plant setup</li>
          <li>Stripe checkout required</li>
        </ul>
      </button>
    </div>

    <div id="stepNotice" class="notice"></div>
  `;
}

function renderProductionActivation() {
  const paid = isProductionPaymentComplete();
  const selectedPlan = normalizeStripePlan(state.selectedPlan || getSelectedStripePlan());
  state.selectedPlan = selectedPlan;

  const monthlyReady = isStripePaymentLinkConfigured('monthly');
  const yearlyReady = isStripePaymentLinkConfigured('yearly');
  const stripeReady = monthlyReady && yearlyReady;

  const monthlyUrl = buildStripeCheckoutUrl({ plantName: state.plantName, mode: 'production', plan: 'monthly' });
  const yearlyUrl = buildStripeCheckoutUrl({ plantName: state.plantName, mode: 'production', plan: 'yearly' });

  return `
    <h2 class="step-title">Production Checkout</h2>
    <p class="step-copy">
      Choose a Floor Flow Pro plan. Demo Plant remains free for testing.
    </p>

    <div class="activation-step-card ${paid ? 'payment-confirmed-card' : ''}">
      <div class="activation-step-header">
        <div>
          <div class="launch-kicker">Stripe Subscription</div>
          <h3>${paid ? 'Payment Confirmed' : 'Activate Production Plant'}</h3>
        </div>
        <span class="plant-type-badge production">Production</span>
      </div>

      <div class="activation-help">
        ${paid
          ? `Stripe payment confirmed. Selected plan: ${escapeHtml(FLOORFLOW_PLAN_PRICES[selectedPlan])}. Continue to finish creating your production plant.`
          : 'Production plants require an active Stripe subscription. Choose Monthly or Annual below. Floor Flow will connect this subscription to this plant automatically.'}
      </div>

      ${paid ? `
        <div class="activation-actions-inline">
          <span class="button success">✓ Paid / Ready</span>
          <button type="button" class="button ghost" data-select-mode="demo">Use Free Demo Instead</button>
        </div>
      ` : stripeReady ? `
        <div class="plant-type-grid payment-plan-grid">
          <a class="plant-type-card payment-plan-card ${selectedPlan === 'monthly' ? 'selected' : ''}"
             href="${escapeAttr(monthlyUrl)}"
             data-select-plan="monthly">
            <div class="plant-type-badge production">Monthly</div>
            <h3>Floor Flow Pro Monthly</h3>
            <p>${escapeHtml(FLOORFLOW_PLAN_PRICES.monthly)}</p>
            <ul>
              <li>Production plant access</li>
              <li>Cancel or change later in Stripe</li>
              <li>Best for pilot plants</li>
            </ul>
            <span class="button primary checkout-card-cta">Start Monthly Checkout</span>
          </a>

          <a class="plant-type-card payment-plan-card ${selectedPlan === 'yearly' ? 'selected' : ''}"
             href="${escapeAttr(yearlyUrl)}"
             data-select-plan="yearly">
            <div class="plant-type-badge production">Annual</div>
            <h3>Floor Flow Pro Annual</h3>
            <p>${escapeHtml(FLOORFLOW_PLAN_PRICES.yearly)}</p>
            <ul>
              <li>Production plant access</li>
              <li>Discounted yearly pricing</li>
              <li>Best for long-term use</li>
            </ul>
            <span class="button primary checkout-card-cta">Start Annual Checkout</span>
          </a>
        </div>

        <div class="activation-actions-inline">
          <button type="button" class="button ghost" data-select-mode="demo">Use Free Demo Instead</button>
        </div>
      ` : `
        <div class="notice visible">Stripe checkout is not configured yet. Check js/activation.js and Firebase Functions secrets.</div>
        <div class="activation-actions-inline">
          <button type="button" class="button ghost" data-select-mode="demo">Use Free Demo Instead</button>
        </div>
      `}
    </div>

    <div id="stepNotice" class="notice"></div>
  `;
}

function renderPlantSetup() {
  const isProduction = state.mode === 'production';

  return `
    <h2 class="step-title">${isProduction ? 'Production Plant Details' : 'Demo Plant Details'}</h2>
    <p class="step-copy">
      ${isProduction
        ? 'Enter the real plant name before checkout. This name appears in Stripe, welcome emails, and Admin.'
        : 'Enter a demo plant name and timezone. This keeps your test plant easy to identify.'}
    </p>

    <div class="selected-mode-strip ${isProduction ? 'production' : 'demo'}">
      <strong>${isProduction ? 'Production Plant' : 'Demo Plant'}</strong>
      <span>${isProduction ? 'Plant name required before Stripe checkout' : 'Sample data included · free demo mode'}</span>
    </div>

    <div class="form-grid">
      <label>
        <span>Plant Name *</span>
        <input id="plantNameInput" value="${escapeAttr(state.plantName)}" placeholder="${isProduction ? 'Example: West Newmarket' : 'Example: Demo Plant'}" />
      </label>

      <label>
        <span>Timezone</span>
        <select id="timezone">
          ${TIMEZONES.map((tz) => `<option value="${tz}" ${state.timezone === tz ? 'selected' : ''}>${tz}</option>`).join('')}
        </select>
      </label>
    </div>

    <div id="stepNotice" class="notice"></div>
  `;
}

function renderBranding() {
  if (!state.brandText && state.plantName) {
    state.brandText = state.plantName;
  }

  return `
    <h2 class="step-title">Branding</h2>
    <p class="step-copy">Confirm the text that will appear on Floor Flow screens. Logos can be uploaded later from Admin → System Controls.</p>

    <div class="form-grid">
      <label class="full">
        <span>Brand Text</span>
        <input id="brandText" value="${escapeAttr(state.brandText || state.plantName || '')}" placeholder="Example: Master Plant" />
      </label>
    </div>

    <div class="onboarding-feature-list">
      <div>✓ Display Boards</div>
      <div>✓ Supervisor Planning</div>
      <div>✓ Parts Library</div>
      <div>✓ Employee Badges</div>
      <div>✓ Reports & Activity Logs</div>
    </div>
  `;
}

function renderAdmin() {
  const isDemo = state.mode === 'demo';

  return `
    <h2 class="step-title">Create First Admin</h2>
    <p class="step-copy">
      ${isDemo
        ? 'Enter your contact details so we can follow up after your demo. This also creates the first admin user.'
        : 'This creates the first admin user for this plant. Badges can be printed later from Admin → Users.'}
    </p>

    <div class="form-grid">
      <label>
        <span>First Name *</span>
        <input id="adminFirstName" value="${escapeAttr(state.adminFirstName)}" placeholder="First name" autocomplete="given-name" />
      </label>

      <label>
        <span>Last Name *</span>
        <input id="adminLastName" value="${escapeAttr(state.adminLastName)}" placeholder="Last name" autocomplete="family-name" />
      </label>

      <label class="full">
        <span>Email Address ${isDemo ? '*' : ''}</span>
        <input id="adminEmail" type="email" value="${escapeAttr(state.adminEmail)}" placeholder="name@company.com" autocomplete="email" />
      </label>

      <label class="full">
        <span>Admin PIN / Employee ID *</span>
        <input
          id="adminEmployeeId"
          type="tel"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="10"
          value="${escapeAttr(state.adminEmployeeId)}"
          placeholder="Example: 1001"
        />
      </label>
    </div>

    <div id="stepNotice" class="notice"></div>
  `;
}

function renderArea() {
  return `
    <h2 class="step-title">Add First Area</h2>
    <p class="step-copy">Areas organize your plant floor. You can add more from Admin later.</p>

    <div class="form-grid">
      <label class="full">
        <span>Area Name</span>
        <input id="areaName" value="${escapeAttr(state.areaName)}" placeholder="Example: Main Floor" />
      </label>
    </div>

    <div id="stepNotice" class="notice"></div>
  `;
}

function renderEquipment() {
  return `
    <h2 class="step-title">Add First Work Cell</h2>
    <p class="step-copy">Create the first work cell card. You can add more from Admin later.</p>

    <div class="form-grid">
      <label class="full">
        <span>Work Cell Name</span>
        <input id="equipmentName" value="${escapeAttr(state.equipmentName)}" placeholder="Example: CNC Cell 3" />
      </label>
    </div>

    <div id="stepNotice" class="notice"></div>
  `;
}

function renderComplete() {
  const isDemo = state.mode === 'demo';

  return `
    <div class="launch-ready compact-ready">
      <div class="ready-icon">✓</div>
      <h2 class="step-title">Plant Ready</h2>
      <p class="step-copy ready-copy">
        Review the setup summary, then finish setup to open Floor Flow.
      </p>

      <div class="ready-check-grid">
        <div>✓ Plant Created</div>
        <div>✓ Admin User Created</div>
        <div>✓ First Area Created</div>
        <div>✓ First Work Cell Created</div>
        <div>✓ Branding Ready</div>
        <div>✓ Floor Flow Ready</div>
      </div>

      <div class="launch-panel ready-summary-card">
        <div class="launch-kicker">${isDemo ? 'Demo Plant' : 'Production Plant'}</div>
        <h3>${escapeHtml(state.plantName || 'Plant')}</h3>
        <p>${isDemo ? 'Sample data included for testing.' : 'Clean production plant with no demo data.'}</p>
      </div>
    </div>
  `;
}

function saveCurrentStep() {
  const value = (id) => document.getElementById(id)?.value?.trim();

  const selectedPlantMode = document.querySelector('[data-select-mode].selected')?.dataset?.selectMode;
  if (selectedPlantMode) state.mode = selectedPlantMode;
  if (document.getElementById('mode')) state.mode = value('mode') || 'demo';
  if (document.getElementById('timezone')) state.timezone = value('timezone') || state.timezone;
  if (document.getElementById('plantNameInput')) {
    state.plantName = value('plantNameInput') || '';
    state.companyName = state.plantName;
    if (!state.brandText) state.brandText = state.plantName;
  }

  state.brandingMode = 'text';
  state.logoUrl = '';
  if (document.getElementById('brandText')) state.brandText = value('brandText') || state.plantName || '';

  if (document.getElementById('adminFirstName')) state.adminFirstName = value('adminFirstName') || '';
  if (document.getElementById('adminLastName')) state.adminLastName = value('adminLastName') || '';
  if (document.getElementById('adminEmail')) state.adminEmail = value('adminEmail') || '';
  if (document.getElementById('adminFirstName') || document.getElementById('adminLastName')) {
    state.adminName = `${state.adminFirstName || ''} ${state.adminLastName || ''}`.trim();
  }
  if (document.getElementById('adminEmployeeId')) state.adminEmployeeId = value('adminEmployeeId') || '';
  state.adminBadgeCode = '';

  if (document.getElementById('areaName')) state.areaName = value('areaName') || '';
  if (document.getElementById('equipmentName')) state.equipmentName = value('equipmentName') || '';
}

function isValidEmailAddress(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validateStep() {
  const notice = document.getElementById('stepNotice');
  const fail = (message) => {
    if (notice) notice.textContent = message;
    else alert(message);
    return false;
  };

  const activeStep = getOnboardingSteps()[step];

  if (activeStep === renderProductionActivation && !isProductionPaymentComplete()) {
    return fail('Complete Stripe checkout or go back and choose Demo Plant.');
  }

  if (activeStep === renderPlantSetup && !state.plantName) {
    return fail('Plant name is required.');
  }

  if (activeStep === renderAdmin && (!state.adminFirstName || !state.adminLastName || !state.adminEmployeeId)) {
    return fail('First name, last name, and PIN / Employee ID are required.');
  }

  if (activeStep === renderAdmin && state.mode === 'demo' && !state.adminEmail) {
    return fail('Email address is required for demo access.');
  }

  if (activeStep === renderAdmin && state.adminEmail && !isValidEmailAddress(state.adminEmail)) {
    return fail('Enter a valid email address.');
  }

  if (activeStep === renderAdmin && !/^[0-9]+$/.test(state.adminEmployeeId)) {
    return fail('PIN / Employee ID must contain numbers only.');
  }

  if (activeStep === renderArea && !state.areaName) {
    return fail('Area name is required.');
  }

  if (activeStep === renderEquipment && !state.equipmentName) {
    return fail('Work cell name is required.');
  }

  return true;
}



async function ensurePendingProductionPlantId(plan = 'monthly') {
  const existingPlantId = state.pendingPlantId || getPendingProductionPlantId();

  if (existingPlantId) {
    state.pendingPlantId = existingPlantId;
    localStorage.setItem('floor_flow_pending_plant_id', existingPlantId);
    return existingPlantId;
  }

  const plantRef = doc(collection(db, 'plants'));
  const plantId = plantRef.id;
  const plantName = state.plantName || state.companyName || 'Production Plant';

  await setDoc(plantRef, {
    id: plantId,
    plantId,
    plantName,
    name: plantName,
    companyName: state.companyName || plantName,
    mode: 'production',
    environment: 'production',
    isDemo: false,
    setupComplete: false,
    billingPlan: normalizeStripePlan(plan),
    billingStatus: 'checkout_pending',
    subscriptionStatus: 'pending_checkout',
    productionUnlocked: false,
    pendingOnboarding: true,
    onboardingContact: {
      firstName: state.adminFirstName || '',
      lastName: state.adminLastName || '',
      fullName: state.adminName || '',
      email: state.adminEmail || ''
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  state.pendingPlantId = plantId;
  localStorage.setItem('floor_flow_pending_plant_id', plantId);
  return plantId;
}

function showPaymentNotice(message) {
  const notice = document.getElementById('stepNotice');
  if (notice) {
    notice.textContent = message;
    notice.classList.add('visible');
  } else {
    alert(message);
  }
}

function wirePaymentActions() {
  document.querySelectorAll('[data-select-plan]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();

      if (checkoutCreateInProgress) return;

      try {
        checkoutCreateInProgress = true;
        saveCurrentStep();

        state.selectedPlan = normalizeStripePlan(link.dataset.selectPlan);
        localStorage.setItem('floor_flow_selected_plan', state.selectedPlan);
        localStorage.setItem('floor_flow_payment_status', 'pending');
        localStorage.setItem('floor_flow_activation_status', 'pending_payment');
        localStorage.setItem('floor_flow_payment_source', 'stripe_checkout_started');

        const checkoutButton = link.querySelector('.checkout-card-cta');
        if (checkoutButton) checkoutButton.textContent = 'Opening Stripe...';

        const plantId = await ensurePendingProductionPlantId(state.selectedPlan);
        const checkoutUrl = await createStripeCheckoutSession({
          plantId,
          plantName: state.plantName || state.companyName || 'Production Plant Setup',
          customerEmail: '',
          plan: state.selectedPlan
        });

        window.location.href = checkoutUrl;
      } catch (error) {
        console.error(error);
        checkoutCreateInProgress = false;
        showPaymentNotice(error.message || 'Stripe checkout could not be started.');
        render();
      }
    });
  });
}

function wirePlantTypeCards() {
  document.querySelectorAll('[data-select-mode]').forEach((card) => {
    card.addEventListener('click', () => {
      state.mode = card.dataset.selectMode === 'production' ? 'production' : 'demo';

      if (state.mode === 'demo') {
        clearProductionPaymentState();
        state.plantName = state.plantName && state.plantName !== 'Production Plant' ? state.plantName : 'Demo Plant';
        state.companyName = state.plantName;
        if (!state.brandText) state.brandText = state.plantName;
      }

      if (state.mode === 'production') {
        state.plantName = state.plantName === 'Demo Plant' ? '' : state.plantName;
        state.companyName = state.plantName;
        if (state.brandText === 'Demo Plant') state.brandText = '';
      }

      localStorage.setItem('floor_flow_selected_plant_mode', state.mode);
      render();
    });
  });
}

function wireLivePreview() {
  ['brandText'].forEach((id) => {
    const el = document.getElementById(id);

    el?.addEventListener('input', () => {
      saveCurrentStep();
      const preview = document.getElementById('brandPreview');
      if (preview) preview.innerHTML = escapeHtml(state.brandText || state.plantName || 'Floor Flow');
    });
  });
}

function getOnboardingAdminPin() {
  return String(state.adminEmployeeId || '1000').trim() || '1000';
}


async function sendDemoWelcomeEmail(plantId) {
  if (state.mode !== 'demo' || !state.adminEmail || !plantId) return;

  try {
    await fetch(FLOORFLOW_DEMO_WELCOME_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plantId,
        email: state.adminEmail
      })
    });
  } catch (error) {
    console.warn('Demo welcome email skipped:', error);
  }
}

async function finishOnboarding() {
  if (onboardingCreateInProgress) return;

  saveCurrentStep();

  try {
    onboardingCreateInProgress = true;
    nextBtn.disabled = true;
    nextBtn.textContent = 'Creating...';

    const existingProductionPlantId = state.mode === 'production' ? getPendingProductionPlantId() : '';
    const plantRef = existingProductionPlantId ? doc(db, 'plants', existingProductionPlantId) : doc(collection(db, 'plants'));
    const plantId = plantRef.id;
    state.pendingPlantId = plantId;

    await seedOnboardingPlant({
      plantId,
      plantName: state.plantName || 'Demo Plant',
      companyName: state.companyName || state.plantName || 'Demo Plant',
      adminName: state.adminName || 'Plant Admin',
      adminFirstName: state.adminFirstName || '',
      adminLastName: state.adminLastName || '',
      adminEmail: state.adminEmail || '',
      adminPin: getOnboardingAdminPin(),
      adminBadgeCode: '',
      mode: state.mode || 'demo',
      timezone: state.timezone || 'America/Toronto',
      areaName: state.areaName || 'Main Floor',
      equipmentName: state.equipmentName || 'First Work Cell',
      brandText: state.brandText || state.plantName || 'Floor Flow',
      logoUrl: '',
      brandingMode: 'text'
    });

    await setDoc(doc(db, 'plants', plantId), {
      setupComplete: true,
      pendingOnboarding: false,
      onboardingContact: {
        firstName: state.adminFirstName || '',
        lastName: state.adminLastName || '',
        fullName: state.adminName || '',
        email: state.adminEmail || ''
      },
      demoContactEmail: state.mode === 'demo' ? state.adminEmail || '' : '',
      demoCreatedAt: state.mode === 'demo' ? serverTimestamp() : null,
      onboardingCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (state.mode === 'demo') {
      await sendDemoWelcomeEmail(plantId);
    }

    setActivePlantId(plantId);
    saveActivationState({
      plantId,
      mode: state.mode || 'demo',
      paymentStatus: state.mode === 'production' && isProductionPaymentComplete() ? 'paid' : '',
      plan: state.selectedPlan || getSelectedStripePlan()
    });

    stepEl.innerHTML = renderLaunchComplete(plantId);
    wirePlantAccessCopyButtons(plantId);

    progressText.textContent = 'Plant Ready';
    progressFill.style.width = '100%';
    backBtn.style.display = 'none';

    nextBtn.textContent = 'Open Admin Console';
    nextBtn.disabled = false;

    nextBtn.onclick = () => {
      window.location.href = buildRelativePlantLink('admin.html', plantId);
    };
  } catch (error) {
    console.error('Onboarding failed:', error);
    alert(`Setup failed: ${error.message}`);
    onboardingCreateInProgress = false;
    nextBtn.disabled = false;
    nextBtn.textContent = 'Finish Setup';
  }
}

function renderLaunchComplete(plantId) {
  const links = plantAccessPages();

  return `
    <div class="launch-ready compact-ready">
      <div class="ready-icon">✓</div>
      <h2 class="step-title">Plant Ready</h2>
      <p class="step-copy ready-copy">
        ${escapeHtml(state.plantName || 'Your plant')} is ready. Use the button below to launch the Admin Console.
      </p>

      <a class="button primary launch-admin-now" href="${buildRelativePlantLink('admin.html', plantId)}">Launch Floor Flow</a>

      <div class="ready-check-grid final-ready-grid">
        <div>✓ Plant Created</div>
        <div>✓ Admin User Created</div>
        <div>✓ First Area Created</div>
        <div>✓ First Work Cell Created</div>
      </div>

      <details class="plant-links-details">
        <summary>Plant access links</summary>
        <div class="plant-access-onboarding-grid compact-links-grid">
          <div class="plant-id-share-card">
            <div class="launch-kicker">Plant ID</div>
            <h3>${escapeHtml(plantId)}</h3>
            <p>Saved as the active plant for this browser.</p>
            <button type="button" class="button secondary" data-copy-plant-id>Copy Plant ID</button>
          </div>

          <div class="plant-links-share-card">
            <div class="launch-kicker">Plant Access Links</div>
            <div class="plant-link-share-list">
              ${links.map((item) => {
                const fullUrl = buildPlantLink(item.page, plantId);
                const relativeUrl = buildRelativePlantLink(item.page, plantId);

                return `
                  <div class="plant-link-share-row">
                    <div>
                      <strong>${item.label}</strong>
                      <span>${item.description}</span>
                      <code>${fullUrl}</code>
                    </div>
                    <div class="plant-link-share-actions">
                      <a class="button primary" href="${relativeUrl}">Open</a>
                      <button type="button" class="button secondary" data-copy-plant-link="${escapeAttr(fullUrl)}">Copy</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <button type="button" class="button secondary full-copy-button" data-copy-all-plant-links>Copy All Links</button>
          </div>
        </div>
      </details>
    </div>
  `;
}

function wirePlantAccessCopyButtons(plantId) {
  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const input = document.createElement('textarea');
      input.value = value;
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();

      try {
        document.execCommand('copy');
        input.remove();
        return true;
      } catch {
        input.remove();
        return false;
      }
    }
  };

  const setCopied = (button, originalText) => {
    button.textContent = 'Copied';
    setTimeout(() => {
      button.textContent = originalText;
    }, 1300);
  };

  document.querySelector('[data-copy-plant-id]')?.addEventListener('click', async (event) => {
    if (await copyText(plantId)) setCopied(event.currentTarget, 'Copy Plant ID');
  });

  document.querySelectorAll('[data-copy-plant-link]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (await copyText(button.dataset.copyPlantLink || '')) setCopied(button, 'Copy');
    });
  });

  document.querySelector('[data-copy-all-plant-links]')?.addEventListener('click', async (event) => {
    const allLinks = plantAccessPages()
      .map((item) => `${item.label}: ${buildPlantLink(item.page, plantId)}`)
      .join('\n');

    if (await copyText(allLinks)) setCopied(event.currentTarget, 'Copy All Links');
  });
}

function getDefaultTimezone() {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return TIMEZONES.includes(detected) ? detected : 'America/Toronto';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}



