import { initStore, getSession } from './store.js';
import { requireRoleAccess } from './auth-lock.js';
import { requireActiveBillingAccess } from './billing-guard.js';
import { clearStoredSessionUser } from './session-user.js';
import { setSession } from './store.js';


import { mountQueueTool } from './supervisor-queue.js';
import { mountAreaViewTool } from './supervisor-areas.js';
import { mountSupervisorActivityTool } from './supervisor-activity.js';
import { mountReportsTool } from './admin-reports.js';

initStore();

await requireActiveBillingAccess();
await requireRoleAccess(['supervisor', 'admin']);

const currentUserSupervisor = document.getElementById('currentUserSupervisor');
const supervisorContent = document.getElementById('supervisorContent');
const toolButtons = document.querySelectorAll('[data-supervisor-tool]');

let cleanupCurrentTool = null;

init();

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  clearStoredSessionUser();
  setSession(null);
  location.reload();
});


async function init() {
  renderCurrentUser();

  toolButtons.forEach((button) => {
    button.addEventListener('click', () => selectTool(button.dataset.supervisorTool));
  });

  await selectTool('queue');
}

function renderCurrentUser() {
  const session = getSession();
  if (!currentUserSupervisor) return;

  const statusText = session?.status && session.status !== 'active' ? ` · ${session.status}` : '';
  currentUserSupervisor.textContent = session ? `${session.name} · ${session.role}${statusText}` : 'Locked';
}

async function selectTool(toolName) {
  if (!supervisorContent) return;

  if (typeof cleanupCurrentTool === 'function') {
    cleanupCurrentTool();
    cleanupCurrentTool = null;
  }

  toolButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.supervisorTool === toolName);
  });

  supervisorContent.innerHTML = `<div class="admin-loading">Loading...</div>`;

  if (toolName === 'queue') {
    cleanupCurrentTool = await mountQueueTool(supervisorContent);
  }
  else if (toolName === 'areas') {
    cleanupCurrentTool = await mountAreaViewTool(supervisorContent);
  }
  else if (toolName === 'activity') {
    cleanupCurrentTool = await mountSupervisorActivityTool(supervisorContent);
  }
  else if (toolName === 'reports') {
    cleanupCurrentTool = await mountReportsTool(supervisorContent);
  }
  else {
    supervisorContent.innerHTML =
      `<div class="admin-card"><div class="muted">Unknown supervisor tool.</div></div>`;
  }
}

window.addEventListener('beforeunload', () => {
  if (typeof cleanupCurrentTool === 'function') cleanupCurrentTool();
});

// Global supervisor editor bridge for queue cards.
window.openSupervisorWorkCellEditor = function openSupervisorWorkCellEditor(workCellId) {
  const candidates = [
    `[data-edit-press="${workCellId}"]`,
    `[data-edit-work-cell="${workCellId}"]`,
    `[data-open-press="${workCellId}"]`,
    `[data-open-work-cell="${workCellId}"]`
  ];

  for (const selector of candidates) {
    const button = document.querySelector(selector);
    if (button) {
      button.click();
      return;
    }
  }

  if (typeof window.openPressEditor === 'function') {
    window.openPressEditor(workCellId);
    return;
  }

  if (typeof window.openQueueEditor === 'function') {
    window.openQueueEditor(workCellId);
    return;
  }

  console.warn('No supervisor editor bridge target found:', workCellId);
};
