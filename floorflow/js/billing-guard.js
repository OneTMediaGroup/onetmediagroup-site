import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { requirePlantId, buildRelativePlantLink } from './plant-session.js';

function isDemoPlant(plant = {}) {
  return plant.isDemo === true ||
    plant.mode === 'demo' ||
    plant.environment === 'demo';
}

function isBillingActive(plant = {}) {
  const billingStatus = String(plant.billingStatus || '').toLowerCase();
  const subscriptionStatus = String(plant.subscriptionStatus || '').toLowerCase();

  return (
    plant.productionUnlocked === true &&
    plant.paid === true &&
    (billingStatus === 'active' || billingStatus === 'trialing') &&
    (subscriptionStatus === 'active' || subscriptionStatus === 'trialing')
  );
}

function lockReasonText(plant = {}) {
  const reason = String(plant.billingLockReason || '').replaceAll('_', ' ');
  if (reason) return reason;
  if (plant.subscriptionStatus) return `subscription ${plant.subscriptionStatus}`;
  if (plant.billingStatus) return `billing ${plant.billingStatus}`;
  return 'subscription inactive';
}

function renderBillingLockedScreen(plantId, plant = {}) {
  const plantName = plant.plantName || plant.name || 'This production plant';
  const onboardingLink = `${buildRelativePlantLink('onboarding.html', plantId)}&mode=production&reactivate=true`;

  document.body.innerHTML = `
    <main style="
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: linear-gradient(135deg, #0f172a, #111827);
      color: #0f172a;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <section style="
        width: min(680px, 100%);
        background: #ffffff;
        border-radius: 28px;
        padding: 34px;
        box-shadow: 0 30px 90px rgba(0,0,0,.35);
        border: 1px solid rgba(148,163,184,.35);
      ">
        <div style="
          width: 62px;
          height: 62px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          background: #fee2e2;
          color: #991b1b;
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 18px;
        ">!</div>

        <p style="
          margin: 0 0 8px;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: .12em;
          font-weight: 900;
          font-size: .78rem;
        ">Floor Flow Subscription Required</p>

        <h1 style="margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3rem); line-height: 1;">
          Production Plant Locked
        </h1>

        <p style="margin: 0 0 18px; color: #475569; font-size: 1.05rem; line-height: 1.55;">
          ${escapeHtml(plantName)} is currently locked because the production subscription is not active.
        </p>

        <div style="
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 16px;
          margin: 18px 0;
          color: #334155;
        ">
          <strong>Reason:</strong> ${escapeHtml(lockReasonText(plant))}
          <br />
          <strong>Plant Code:</strong> ${escapeHtml(plantId)}
        </div>

        <p style="margin: 0 0 24px; color: #475569; line-height: 1.55;">
          Reactivate the subscription through Floor Flow onboarding or contact support.
        </p>

        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <a href="${onboardingLink}" style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 48px;
            padding: 0 20px;
            border-radius: 14px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            font-weight: 900;
          ">Reactivate Plant</a>

          <a href="mailto:floorflow@onetmediagroup.ca?subject=Floor Flow Subscription Support ${encodeURIComponent(plantId)}" style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 48px;
            padding: 0 20px;
            border-radius: 14px;
            background: #f8fafc;
            color: #0f172a;
            border: 1px solid #cbd5e1;
            text-decoration: none;
            font-weight: 900;
          ">Contact Support</a>
        </div>
      </section>
    </main>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function requireActiveBillingAccess() {
  const plantId = requirePlantId();
  const snap = await getDoc(doc(db, 'plants', plantId));

  if (!snap.exists()) {
    renderBillingLockedScreen(plantId, {
      plantName: 'Unknown plant',
      billingLockReason: 'plant not found'
    });
    throw new Error('Plant not found.');
  }

  const plant = snap.data() || {};

  if (isDemoPlant(plant)) {
    return { plantId, plant, isDemo: true };
  }

  if (isBillingActive(plant)) {
    return { plantId, plant, isDemo: false };
  }

  renderBillingLockedScreen(plantId, plant);
  throw new Error('Production subscription is inactive.');
}
