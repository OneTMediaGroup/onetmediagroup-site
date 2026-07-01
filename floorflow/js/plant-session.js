const STORAGE_KEY = 'floor_flow_active_plant_id';
const SETUP_KEY = 'floor_flow_setup_complete';

export function getPlantIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  // Launch links now prefer ?plantId=CODE for clearer customer-facing URLs.
  // Keep ?plant=CODE working so older saved links do not break.
  return params.get('plantId') || params.get('plant') || '';
}

export function getActivePlantId() {
  const urlPlantId = getPlantIdFromUrl();

  if (urlPlantId) {
    setActivePlantId(urlPlantId);
    return urlPlantId;
  }

  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setActivePlantId(plantId) {
  if (!plantId) return;
  localStorage.setItem(STORAGE_KEY, plantId);
  localStorage.setItem('floorFlowActivePlantId', plantId);
  localStorage.setItem(SETUP_KEY, 'true');
}

export function clearActivePlantId() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('floorFlowActivePlantId');
}

export function hasCompletedSetup() {
  return localStorage.getItem(SETUP_KEY) === 'true';
}

function normalizePage(page = '') {
  return String(page || '').trim() || 'index.html';
}

export function buildPlantLink(page, plantId = getActivePlantId()) {
  const url = new URL(normalizePage(page), window.location.href);
  url.searchParams.delete('plant');
  if (plantId) url.searchParams.set('plantId', plantId);
  return url.toString();
}

export function buildRelativePlantLink(page, plantId = getActivePlantId()) {
  const url = new URL(normalizePage(page), window.location.href);
  url.searchParams.delete('plant');
  if (plantId) url.searchParams.set('plantId', plantId);
  return `${url.pathname.split('/').pop()}${url.search}`;
}

export function plantAccessPages() {
  return [
    { label: 'Admin Console', page: 'admin.html', description: 'Manage plant setup, users, equipment, branding, and controls.' },
    { label: 'Floor Console', page: 'board.html', description: 'Touchscreen operator view for the plant floor.' },
    { label: 'Supervisor View', page: 'supervisor.html', description: 'Queue planning, status updates, and activity.' },
    { label: 'Display Board', page: 'display.html', description: 'Read-only TV/wall display for live production flow.' }
  ];
}

export function requirePlantId() {
  const plantId = getActivePlantId();

  if (!plantId) {
    window.location.href = 'onboarding.html';
    throw new Error('No active plant selected.');
  }

  return plantId;
}
