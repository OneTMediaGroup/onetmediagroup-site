// Floor Flow production paywall helpers.
// Production flow now uses a Firebase Cloud Function to create Stripe Checkout Sessions
// so each Stripe subscription is tied to exactly one plantId.

export const FLOORFLOW_CHECKOUT_SESSION_ENDPOINT = 'https://northamerica-northeast1-die-changeover-board.cloudfunctions.net/createCheckoutSession';

export const FLOORFLOW_PLAN_LABELS = {
  monthly: 'Monthly',
  yearly: 'Annual'
};

export const FLOORFLOW_PLAN_PRICES = {
  monthly: '$99 CAD / month',
  yearly: '$999 CAD / year'
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

  // Always return Stripe Checkout to the live Floor Flow path.
  // This prevents old GitHub Pages / FloorFlow-Demo URLs from being reused by yearly/monthly sessions.
  const url = new URL('https://onetmediagroup.ca/floorflow/onboarding.html');
  url.searchParams.set('mode', 'production');
  url.searchParams.set('payment', 'success');
  url.searchParams.set('plan', cleanPlan);
  url.searchParams.set('plantId', plantId);

  const cancelUrl = new URL('https://onetmediagroup.ca/floorflow/onboarding.html');
  cancelUrl.searchParams.set('mode', 'production');
  cancelUrl.searchParams.set('checkout', 'cancelled');
  cancelUrl.searchParams.set('plan', cleanPlan);
  cancelUrl.searchParams.set('plantId', plantId);

  const response = await fetch(FLOORFLOW_CHECKOUT_SESSION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plantId,
      plantName,
      customerEmail,
      plan: cleanPlan,
      origin: window.location.origin,
      successUrl: url.toString(),
      cancelUrl: cancelUrl.toString()
    })
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok || !payload.url) {
    throw new Error(payload.error || 'Stripe checkout could not be started.');
  }

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
  // Do not trust old browser localStorage by itself.
  // A production plant is considered paid during onboarding only when Stripe
  // redirects back with a success flag for the current checkout session.
  // This prevents local VS Code / localhost testing from staying unlocked
  // because of stale localStorage from a previous paid test.
  if (hasStripeSuccessReturn()) {
    const params = new URLSearchParams(window.location.search);
    markProductionPaymentComplete(params.get('plan') || params.get('floorflow_plan') || '');
    return true;
  }

  return false;
}

export function clearProductionPaymentState() {
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
