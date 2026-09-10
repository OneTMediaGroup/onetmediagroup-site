import { serverRequest } from './server-access.js';
import { db, authReady } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let verifiedPlantId = '';

export async function refreshProductionPaymentStatus() {
  await authReady;
  verifiedPlantId = '';
  const plantId = getPendingProductionPlantId();
  if (!plantId) return false;
  const snap = await getDoc(doc(db, 'plants', plantId));
  const plant = snap.exists() ? snap.data() : {};
  if (plant.productionUnlocked === true && plant.paid === true &&
      ['active', 'trialing'].includes(plant.billingStatus) &&
      ['active', 'trialing'].includes(plant.subscriptionStatus)) {
    verifiedPlantId = plantId;
    markProductionPaymentComplete(plant.billingPlan);
  }
  return isProductionPaymentComplete();
}

// Floor Flow production paywall helpers.
// Production flow now uses a Firebase Cloud Function to create Stripe Checkout Sessions
// so each Stripe subscription is tied to exactly one plantId.

export const FLOORFLOW_CHECKOUT_SESSION_ENDPOINT = 'https://northamerica-northeast1-die-changeover-board.cloudfunctions.net/createCheckoutSession';

export const FLOORFLOW_PLAN_LABELS = {
  monthly: 'Monthly',
  yearly: 'Annual'
};

export const FLOORFLOW_PLAN_PRICES = {
  monthly: '$24.99 CAD / month',
  yearly: '$249.99 CAD / year'
};

export function normalizeStripePlan(plan = 'monthly') {
  return plan === 'yearly' || plan === 'annual' ? 'yearly' : 'monthly';
}

export function isStripeCheckoutConfigured() {
  return /^https:\/\//i.test(FLOORFLOW_CHECKOUT_SESSION_ENDPOINT) &&
    !FLOORFLOW_CHECKOUT_SESSION_ENDPOINT.includes('REPLACE_WITH');
}

// Backward-compatible names used by onboarding.js.
export function isStripePaymentLinkConfigured() {
  return isStripeCheckoutConfigured();
}

export function areStripePaymentLinksConfigured() {
  return isStripeCheckoutConfigured();
}

export function buildStripeCheckoutUrl() {
  return '#';
}

export async function createStripeCheckoutSession({
  plantId = '',
  plantName = '',
  customerEmail = '',
  plan = 'monthly'
} = {}) {
  const cleanPlan = normalizeStripePlan(plan);

  if (!plantId) {
    throw new Error('Missing plantId for checkout.');
  }

  if (!isStripeCheckoutConfigured()) {
    throw new Error('Stripe checkout function is not configured.');
  }

  const url = new URL('onboarding.html', window.location.href);
  url.searchParams.set('mode', 'production');
  url.searchParams.set('payment', 'success');
  url.searchParams.set('plan', cleanPlan);
  url.searchParams.set('plantId', plantId);

  const cancelUrl = new URL('onboarding.html', window.location.href);
  cancelUrl.searchParams.set('mode', 'production');
  cancelUrl.searchParams.set('checkout', 'cancelled');
  cancelUrl.searchParams.set('plan', cleanPlan);
  cancelUrl.searchParams.set('plantId', plantId);

  const payload = await serverRequest('createCheckoutSession', { plantId, plan: cleanPlan });
  if (!payload.url) throw new Error('Checkout is unavailable.');

  return payload.url;
}

export function hasStripeSuccessReturn() {
  const params = new URLSearchParams(window.location.search);
  return params.get('stripe') === 'success' ||
    params.get('paid') === '1' ||
    params.get('payment') === 'success' ||
    params.get('checkout') === 'success';
}

export function markProductionPaymentComplete(plan = '') {
  const params = new URLSearchParams(window.location.search);
  const cleanPlan = normalizeStripePlan(plan || params.get('plan') || params.get('floorflow_plan') || localStorage.getItem('floor_flow_selected_plan') || 'monthly');
  const plantId = params.get('plantId') || params.get('plant') || localStorage.getItem('floor_flow_pending_plant_id') || '';

  localStorage.setItem('floor_flow_selected_plan', cleanPlan);
  localStorage.setItem('floor_flow_payment_status', 'paid');
  localStorage.setItem('floor_flow_activation_status', 'active');
  localStorage.setItem('floor_flow_payment_source', 'stripe_checkout_session');

  if (plantId) {
    localStorage.setItem('floor_flow_pending_plant_id', plantId);
    localStorage.setItem('floor_flow_active_plant_id', plantId);
    localStorage.setItem('floorFlowActivePlantId', plantId);
  }

  // Old key-based activation is intentionally removed.
  localStorage.removeItem('floor_flow_activation_key');
}

export function isProductionPaymentComplete() {
  return Boolean(verifiedPlantId && verifiedPlantId === getPendingProductionPlantId());
}

export function clearProductionPaymentState() {
  verifiedPlantId = '';
  localStorage.removeItem('floor_flow_payment_status');
  localStorage.removeItem('floor_flow_activation_status');
  localStorage.removeItem('floor_flow_activation_key');
  localStorage.removeItem('floor_flow_selected_plan');
  localStorage.removeItem('floor_flow_payment_source');
  localStorage.removeItem('floor_flow_pending_plant_id');
}

export function getSelectedStripePlan() {
  return normalizeStripePlan(localStorage.getItem('floor_flow_selected_plan') || 'monthly');
}

export function getPendingProductionPlantId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('plantId') || localStorage.getItem('floor_flow_pending_plant_id') || '';
}

export function saveActivationState({ plantId = '', mode = 'demo', paymentStatus = '', plan = '' } = {}) {
  const cleanMode = mode === 'production' ? 'production' : 'demo';
  const cleanPlan = normalizeStripePlan(plan || localStorage.getItem('floor_flow_selected_plan') || 'monthly');

  localStorage.setItem('floor_flow_setup_complete', 'true');
  localStorage.setItem('floor_flow_plant_mode', cleanMode);

  if (plantId) {
    localStorage.setItem('floor_flow_active_plant_id', plantId);
    localStorage.setItem('floorFlowActivePlantId', plantId);
  }

  if (cleanMode === 'production') {
    localStorage.setItem('floor_flow_selected_plan', cleanPlan);
    localStorage.setItem('floor_flow_activation_status', paymentStatus === 'paid' ? 'active' : 'pending_payment');
    localStorage.setItem('floor_flow_payment_status', paymentStatus === 'paid' ? 'paid' : 'pending');
    localStorage.setItem('floor_flow_payment_source', paymentStatus === 'paid' ? 'stripe_checkout_session' : 'pending');
    if (plantId) localStorage.setItem('floor_flow_pending_plant_id', plantId);
    localStorage.removeItem('floor_flow_activation_key');
  } else {
    localStorage.setItem('floor_flow_activation_status', 'demo');
    localStorage.setItem('floor_flow_payment_status', 'demo');
    localStorage.removeItem('floor_flow_activation_key');
    localStorage.removeItem('floor_flow_selected_plan');
    localStorage.removeItem('floor_flow_payment_source');
    localStorage.removeItem('floor_flow_pending_plant_id');
  }
}
