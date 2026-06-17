import { requireRoleAccess } from './auth-lock.js';

await requireRoleAccess(['admin']);


import { clearStoredSessionUser } from './session-user.js';
import { setSession } from './store.js';
import { getSession } from './store.js';
import { getStoredSessionUser } from './session-user.js';
import { mountEquipmentTool } from './admin-equipment.js';
import { mountAreasTool } from './admin-areas.js';
import { mountUsersTool } from './admin-users.js';
import { mountActivityTool } from './admin-activity.js';
import { mountSystemTool } from './admin-system.js';
import { mountReportsTool } from './admin-reports.js';
import { mountPartsTool } from './admin-parts.js';
import { getActivePlantId, buildPlantLink, buildRelativePlantLink, plantAccessPages } from './plant-session.js';

const adminContent = document.getElementById('adminContent');
const currentAdminUser = document.getElementById('currentAdminUser');
const toolButtons = document.querySelectorAll('[data-admin-tool]');

let cleanupCurrentTool = null;

init();


document.getElementById('logoutBtn')?.addEventListener('click', () => {
  clearStoredSessionUser();
  setSession(null);
  location.reload();
});

async function init() {
  renderCurrentAdminUser();
  retainPlantOnAdminScreenLinks();
  ensurePlantAccessSidebarButton();
  wirePlantAccessModal();

  

  toolButtons.forEach((button) => {
    button.addEventListener('click', () => selectTool(button.dataset.adminTool));
  });

  await selectTool('equipment');
}

function renderCurrentAdminUser() {
  const session = getSession() || getStoredSessionUser();
  if (!currentAdminUser) return;

  const statusText = session?.status && session.status !== 'active' ? ` · ${session.status}` : '';
  currentAdminUser.textContent = session ? `${session.name} · ${session.role}${statusText}` : 'No active user';
}

async function selectTool(toolName) {
  if (!adminContent) return;

  if (typeof cleanupCurrentTool === 'function') {
    cleanupCurrentTool();
    cleanupCurrentTool = null;
  }

  toolButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.adminTool === toolName);
  });

  adminContent.innerHTML = `<div class="admin-loading">Loading...</div>`;

  if (toolName === 'equipment') cleanupCurrentTool = await mountEquipmentTool(adminContent);
  else if (toolName === 'areas') cleanupCurrentTool = await mountAreasTool(adminContent);
  else if (toolName === 'users') cleanupCurrentTool = await mountUsersTool(adminContent);
  else if (toolName === 'activity') cleanupCurrentTool = await mountActivityTool(adminContent);
  else if (toolName === 'parts') cleanupCurrentTool = await mountPartsTool(adminContent);
  else if (toolName === 'reports') cleanupCurrentTool = await mountReportsTool(adminContent);
  else if (toolName === 'system') cleanupCurrentTool = await mountSystemTool(adminContent);
  else adminContent.innerHTML = `<div class="admin-card"><div class="muted">Unknown tool.</div></div>`;
}

window.addEventListener('beforeunload', () => {
  if (typeof cleanupCurrentTool === 'function') cleanupCurrentTool();
});


function renderAdminPlantAccessLinks() {
  const container = document.getElementById('adminPlantAccessLinks');
  if (!container) return;

  const plantId = getActivePlantId();

  if (!plantId) {
    container.innerHTML = `
      <div class="plant-access-card">
        <h3>Plant Access Links</h3>
        <p class="muted">No active plant selected yet. Open Admin from the onboarding access link or use a link that includes <strong>?plant=PLANT_ID</strong>.</p>
        <a class="button primary" href="onboarding.html">Create / Select Plant</a>
      </div>
    `;
    return;
  }

  const links = plantAccessPages();

  container.innerHTML = `
    <div class="plant-access-card">
      <div class="plant-access-header">
        <div>
          <h3>Plant Access Links</h3>
          <p>Share these links with tablets, phones, TVs, and other computers so they open the correct plant.</p>
        </div>
        <button type="button" class="button secondary" data-copy-all-admin-plant-links>Copy All Links</button>
      </div>

      <div class="plant-id-box">
        <span>Plant ID</span>
        <strong>${plantId}</strong>
        <button type="button" class="button secondary" data-copy-admin-plant-id>Copy Plant ID</button>
      </div>

      <div class="plant-link-list">
        ${links.map((item) => {
          const fullUrl = buildPlantLink(item.page, plantId);
          const relativeUrl = buildRelativePlantLink(item.page, plantId);

          return `
            <div class="plant-link-row">
              <div class="plant-link-main">
                <strong>${item.label}</strong>
                <span>${item.description}</span>
                <code>${fullUrl}</code>
              </div>
              <div class="plant-link-actions">
                <a class="button primary" href="${relativeUrl}">Open</a>
                <button type="button" class="button secondary" data-copy-admin-plant-link="${fullUrl}">Copy</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  wireAdminPlantAccessCopyButtons(plantId);
}

function wireAdminPlantAccessCopyButtons(plantId) {
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

  document.querySelector('[data-copy-admin-plant-id]')?.addEventListener('click', async (event) => {
    if (await copyText(plantId)) setCopied(event.currentTarget, 'Copy Plant ID');
  });

  document.querySelectorAll('[data-copy-admin-plant-link]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (await copyText(button.dataset.copyAdminPlantLink || '')) setCopied(button, 'Copy');
    });
  });

  document.querySelector('[data-copy-all-admin-plant-links]')?.addEventListener('click', async (event) => {
    const allLinks = plantAccessPages()
      .map((item) => `${item.label}: ${buildPlantLink(item.page, plantId)}`)
      .join('\n');

    if (await copyText(allLinks)) setCopied(event.currentTarget, 'Copy All Links');
  });
}

function retainPlantOnAdminScreenLinks() {
  const plantId = getActivePlantId();
  if (!plantId) return;

  document.querySelectorAll('.admin-screen-link[href$=".html"], .admin-screen-link[href*=".html?"]').forEach((link) => {
    const page = link.getAttribute('href')?.split('?')[0];
    if (!page) return;
    link.setAttribute('href', buildRelativePlantLink(page, plantId));
  });
}


function wirePlantAccessModal() {
  const openButtons = document.querySelectorAll('[data-open-plant-access]');
  const modal = document.getElementById('plantAccessModal');
  const closeButton = document.querySelector('[data-close-plant-access]');

  if (!modal || !openButtons.length) return;

  const openModal = () => {
    renderAdminPlantAccessLinks();
    modal.hidden = false;
    document.body.classList.add('modal-open');
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  };

  openButtons.forEach((button) => {
    button.addEventListener('click', openModal);
  });

  closeButton?.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
}


function ensurePlantAccessSidebarButton() {
  if (document.querySelector('[data-open-plant-access]')) return;

  const sidebar = document.querySelector('.admin-sidebar, .sidebar, aside');
  if (!sidebar) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sidebar-link plant-access-sidebar-btn';
  button.dataset.openPlantAccess = '';
  button.textContent = 'Plant Access Links';

  const signOut = sidebar.querySelector('#signOutBtn, [data-sign-out]');
  if (signOut) {
    sidebar.insertBefore(button, signOut);
  } else {
    sidebar.appendChild(button);
  }
}
