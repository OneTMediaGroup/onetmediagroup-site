import { getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { watchLogsFromFirestore } from './firestore-logs.js';
import { areasCollection, workCellsCollection } from './firestore-paths.js';
import { formatDateTime } from './utils.js';

let root = null;
let unsubscribeLogs = null;
let logs = [];
let areas = [];
let workCells = [];

let searchText = '';
let dateFrom = '';
let dateTo = '';
let areaFilter = 'all';
let equipmentFilter = 'all';

export async function mountActivityTool(container) {
  root = container;

  await loadFilterOptions();
  render();

  unsubscribeLogs = watchLogsFromFirestore((liveLogs) => {
    logs = liveLogs || [];
    render();
  });

  return () => {
    if (typeof unsubscribeLogs === 'function') unsubscribeLogs();
    unsubscribeLogs = null;
  };
}

/* ---------- FILTER DATA ---------- */

async function loadFilterOptions() {
  try {
    const [areaSnap, workCellSnap] = await Promise.all([
      getDocs(areasCollection()),
      getDocs(workCellsCollection())
    ]);

    areas = areaSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .map((area) => ({
        id: area.id,
        name: area.name || area.areaName || area.label || area.id
      }))
      .filter((area) => area.name)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    workCells = workCellSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .map((cell) => ({
        id: cell.id,
        name: cell.equipmentName || cell.workCellName || cell.name || cell.label || cell.id,
        areaId: cell.areaId || '',
        areaName: cell.areaName || cell.area || ''
      }))
      .filter((cell) => cell.name)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  } catch (error) {
    console.error('Activity filter options failed to load:', error);
    areas = [];
    workCells = [];
  }
}

/* ---------- FILTER LOGIC ---------- */

function logSearchText(log) {
  return [
    log.user,
    log.message,
    log.areaName,
    log.area,
    log.workCellName,
    log.equipmentName,
    log.workCell,
    log.equipment,
    log.partNumber,
    log.action
  ].filter(Boolean).join(' ').toLowerCase();
}

function logMatchesArea(log, selectedAreaId) {
  if (selectedAreaId === 'all') return true;

  const selectedArea = areas.find((area) => area.id === selectedAreaId);
  if (!selectedArea) return true;

  const areaName = String(selectedArea.name || '').toLowerCase();
  const message = String(log.message || '').toLowerCase();
  const logAreaId = String(log.areaId || '').toLowerCase();
  const logAreaName = String(log.areaName || log.area || '').toLowerCase();
  const logWorkCellId = String(log.workCellId || '').toLowerCase();
  const logWorkCellName = String(log.workCellName || log.equipmentName || log.workCell || log.equipment || '').toLowerCase();

  if (logAreaId && logAreaId === selectedAreaId.toLowerCase()) return true;
  if (logAreaName && logAreaName === areaName) return true;
  if (areaName && message.includes(areaName)) return true;

  return workCells.some((cell) => {
    if (cell.areaId !== selectedAreaId) return false;
    const cellName = String(cell.name || '').toLowerCase();
    const cellId = String(cell.id || '').toLowerCase();
    return (logWorkCellId && logWorkCellId === cellId) ||
      (logWorkCellName && logWorkCellName === cellName) ||
      (cellName && message.includes(cellName));
  });
}

function logMatchesWorkCell(log, selectedWorkCellId) {
  if (selectedWorkCellId === 'all') return true;

  const selectedCell = workCells.find((cell) => cell.id === selectedWorkCellId);
  if (!selectedCell) return true;

  const cellName = String(selectedCell.name || '').toLowerCase();
  const message = String(log.message || '').toLowerCase();
  const logWorkCellId = String(log.workCellId || '').toLowerCase();
  const logWorkCellName = String(log.workCellName || log.equipmentName || log.workCell || log.equipment || '').toLowerCase();

  if (logWorkCellId && logWorkCellId === selectedWorkCellId.toLowerCase()) return true;
  if (logWorkCellName && logWorkCellName === cellName) return true;
  if (cellName && message.includes(cellName)) return true;

  return false;
}

function filteredLogs() {
  return logs.filter((log) => {
    const text = logSearchText(log);

    const matchesSearch =
      !searchText ||
      text.includes(searchText.toLowerCase());

    const logDate = log.createdAt ? new Date(log.createdAt) : null;

    const matchesFrom = !dateFrom || (logDate && logDate >= new Date(dateFrom));
    const matchesTo = !dateTo || (logDate && logDate <= new Date(dateTo + 'T23:59:59'));
    const matchesArea = logMatchesArea(log, areaFilter);
    const matchesEquipment = logMatchesWorkCell(log, equipmentFilter);

    return matchesSearch && matchesFrom && matchesTo && matchesArea && matchesEquipment;
  });
}

/* ---------- FILTER OPTIONS ---------- */

function areaOptionsHtml() {
  return areas.map((area) => `
    <option value="${escapeAttr(area.id)}" ${area.id === areaFilter ? 'selected' : ''}>
      ${escapeHtml(area.name)}
    </option>
  `).join('');
}

function workCellOptionsHtml() {
  const visibleWorkCells = areaFilter === 'all'
    ? workCells
    : workCells.filter((cell) => cell.areaId === areaFilter);

  if (equipmentFilter !== 'all' && !visibleWorkCells.some((cell) => cell.id === equipmentFilter)) {
    equipmentFilter = 'all';
  }

  return visibleWorkCells.map((cell) => `
    <option value="${escapeAttr(cell.id)}" ${cell.id === equipmentFilter ? 'selected' : ''}>
      ${escapeHtml(cell.name)}
    </option>
  `).join('');
}

/* ---------- RENDER ---------- */

function render() {
  const visibleLogs = filteredLogs();

  root.innerHTML = `
    <div class="admin-content-header">
      <div>
        <h2>Activity Logs</h2>
        <p class="muted">Search, filter, and export system activity.</p>
      </div>
      <button id="exportLogsBtn" class="button primary">Export CSV</button>
    </div>

    <div class="admin-card">
      <div style="display:grid; gap:10px; margin-bottom:12px;">
        
        <input id="searchInput" value="${escapeAttr(searchText)}" placeholder="Search logs..." />

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <input type="date" id="dateFrom" value="${dateFrom}" />
          <input type="date" id="dateTo" value="${dateTo}" />

          <select id="areaFilter">
            <option value="all">All Areas</option>
            ${areaOptionsHtml()}
          </select>

          <select id="equipmentFilter">
            <option value="all">All Work Cells</option>
            ${workCellOptionsHtml()}
          </select>
        </div>

        <div class="muted">${visibleLogs.length} shown · ${logs.length} total</div>
      </div>

      <div style="display:grid; gap:10px;">
        ${renderLogs(visibleLogs)}
      </div>
    </div>

    
  `;

  wireEvents();
}

/* ---------- LOG RENDER ---------- */

function renderLogs(list) {
  if (!list.length) return `<div class="muted">No activity found.</div>`;

  return list.map((log) => `
    <div class="history-item" style="border-left:4px solid #3b82f6;">
      <strong>${escapeHtml(log.user || 'System')}</strong>
      <div>${escapeHtml(log.message)}</div>
      <div class="muted">${formatDateTime(log.createdAt)}</div>
    </div>
  `).join('');
}

/* ---------- EVENTS ---------- */

function wireEvents() {
  root.querySelector('#searchInput')?.addEventListener('input', e => {
    searchText = e.target.value;
    render();
  });

  root.querySelector('#dateFrom')?.addEventListener('change', e => {
    dateFrom = e.target.value;
    render();
  });

  root.querySelector('#dateTo')?.addEventListener('change', e => {
    dateTo = e.target.value;
    render();
  });

  root.querySelector('#areaFilter')?.addEventListener('change', e => {
    areaFilter = e.target.value;
    equipmentFilter = 'all';
    render();
  });

  root.querySelector('#equipmentFilter')?.addEventListener('change', e => {
    equipmentFilter = e.target.value;
    render();
  });

  root.querySelector('#exportLogsBtn')?.addEventListener('click', exportCsv);
}

/* ---------- EXPORT ---------- */

function exportCsv() {
  const rows = filteredLogs();

  const csv = [
    ['User', 'Message', 'Area', 'Work Cell', 'Created At'],
    ...rows.map(log => [
      log.user,
      log.message,
      log.areaName || log.area || '',
      log.workCellName || log.equipmentName || log.workCell || log.equipment || '',
      formatDateTime(log.createdAt)
    ])
  ].map(row => row.map(csvEscape).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

/* ---------- HELPERS ---------- */

function csvEscape(value) {
  return `"${String(value || '').replaceAll('"', '""')}"`;
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