import { watchLogsFromFirestore } from './firestore-logs.js';
import { formatDateTime } from './utils.js';

let root = null;
let logs = [];
let unsubscribeLogs = null;

let searchText = '';
let selectedUser = 'all';

export async function mountSupervisorActivityTool(container) {
  root = container;
  render();

  unsubscribeLogs = watchLogsFromFirestore((liveLogs) => {
    logs = liveLogs.slice(0, 100); // bump to 100 for better scroll
    renderList();
  });

  return () => {
    if (typeof unsubscribeLogs === 'function') unsubscribeLogs();
    unsubscribeLogs = null;
  };
}

function getUsers() {
  const set = new Set();
  logs.forEach(l => {
    if (l.user) set.add(l.user);
  });
  return Array.from(set).sort();
}

function filteredLogs() {
  return logs.filter((log) => {
    const matchesUser =
      selectedUser === 'all' || (log.user || 'System') === selectedUser;

    const text = `${log.user || ''} ${log.message || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchText.toLowerCase());

    return matchesUser && matchesSearch;
  });
}

function exportCSV(rows) {
  const csv = [
    ['User', 'Message', 'Time'],
    ...rows.map(l => [
      `"${l.user || 'System'}"`,
      `"${(l.message || '').replace(/"/g, '""')}"`,
      `"${formatDateTime(l.createdAt)}"`
    ])
  ].map(r => r.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'activity_feed.csv';
  a.click();

  URL.revokeObjectURL(url);
}

function render() {
  const users = getUsers();

  root.innerHTML = `
    <div class="admin-content-header">
      <div>
        <h2>Activity Feed</h2>
        <p class="muted">Recent setup, equipment, and operator activity.</p>
      </div>
      <div class="topbar-right">
        <button class="button" id="exportCSV">Export CSV</button>
      </div>
    </div>

    <div class="admin-card">
      <div class="toolbar-row">
        <label>
          Search
          <input id="searchInput" placeholder="Search logs..." value="${escapeAttr(searchText)}" />
        </label>

        <label>
          User
          <select id="userFilter">
            <option value="all">All Users</option>
            ${users.map(u => `
              <option value="${escapeAttr(u)}" ${u === selectedUser ? 'selected' : ''}>${escapeHtml(u)}</option>
            `).join('')}
          </select>
        </label>
      </div>
    </div>

    <div class="admin-card">
      <div class="history-list" id="activityFeedList"></div>
    </div>
  `;

  wireEvents();
  renderList();
}

function renderList() {
  if (!root) return;

  const list = root.querySelector('#activityFeedList');
  if (!list) {
    render();
    return;
  }

  const rows = filteredLogs();

  list.innerHTML = rows.length ? rows.map((log) => `
    <div class="history-item" style="display:grid; gap:6px;">

      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
        <strong>${escapeHtml(log.user || 'System')}</strong>
        <span class="muted" style="font-size:.8rem;">${escapeHtml(formatDateTime(log.createdAt))}</span>
      </div>

      <div>${escapeHtml(log.message || 'Updated system')}</div>

    </div>
  `).join('') : `
    <div class="history-item">
      <strong>No activity yet</strong>
      <div>Recent plant floor activity will appear here.</div>
    </div>
  `;
}

function wireEvents() {
  const searchInput = root.querySelector('#searchInput');
  const userFilter = root.querySelector('#userFilter');
  const exportBtn = root.querySelector('#exportCSV');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchText = e.target.value || '';
      renderList();
    });
  }

  if (userFilter) {
    userFilter.addEventListener('change', (e) => {
      selectedUser = e.target.value;
      renderList();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportCSV(filteredLogs());
    });
  }
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
