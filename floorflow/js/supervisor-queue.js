import { watchPressesFromFirestore } from './firestore-presses.js';
import { saveSupervisorSlot } from './supervisor-slot-write.js';


import { loadPartLibrary, findPartMatches, applyPartToRow } from './part-library.js';
const UNIT_OPTIONS = ['Pcs', 'Skids', 'Boxes', 'Lbs', 'Kg', 'Rolls', 'Bins', 'Pallets'];

let rootEl = null;
let workCells = [];
let expanded = new Set();
let searchText = '';
let areaFilter = 'all';
let queueFilter = 'all';

export function mountQueueTool(root = null) {
  rootEl = root || document.getElementById('queueContent') || document.getElementById('supervisorQueue') || document.querySelector('[data-supervisor-queue]');
  if (!rootEl) return;

  rootEl.innerHTML = '<div class="loading-card">Loading supervisor tools...</div>';
  loadPartLibrary();

  watchPressesFromFirestore((items) => {
    workCells = Array.isArray(items) ? items : [];
    render();
  });
}

function render() {
  if (!rootEl) return;

  const filtered = getFilteredCells();
  const areas = getAreas();
  const stats = getStats(getBaseFilteredCells());

  rootEl.innerHTML = `
    <section class="compact-supervisor">
      <div class="compact-supervisor__header">
        <div>
          <h2>Live Supervisor Queue</h2>
          <p>Expand a work cell, save setups, and mark Running only when it starts.</p>
        </div>
        <div class="compact-supervisor__filters">
          <input data-supervisor-search value="${escapeAttr(searchText)}" placeholder="Search cell, part, notes..." />
          <select data-supervisor-area>
            <option value="all">All Areas</option>
            ${areas.map(area => `<option value="${escapeAttr(area.id)}" ${areaFilter === area.id ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="compact-supervisor__stats" data-supervisor-stats>
        ${renderStats(stats)}
      </div>

      <div class="compact-supervisor__list" data-supervisor-list>
        ${renderCellList(filtered)}
      </div>
    </section>
  `;

  bindEvents();
}

function renderCell(cell) {
  const id = cellId(cell);
  const slots = normalizeSlots(cell.slots);
  const running = slots.find(isRunning);
  const next = slots.find(slot => !isRunning(slot) && hasSetup(slot));
  const open = expanded.has(id);

  return `
    <article class="compact-cell">
      <button class="compact-cell__summary" data-toggle-cell="${escapeAttr(id)}" type="button">
        <span class="compact-cell__chevron">${open ? '⌄' : '›'}</span>
        <strong>${escapeHtml(cellName(cell))}</strong>
        <span>${escapeHtml(areaName(cell))}</span>
        <span>Running: <b>${running ? escapeHtml(running.partNumber || 'Yes') : '—'}</b></span>
        <span>Next: <b>${next ? escapeHtml(next.partNumber || 'Saved') : '—'}</b></span>
      </button>
      ${open ? renderSlots(cell, slots) : ''}
    </article>
  `;
}

function renderSlots(cell, slots) {
  return `
    <div class="compact-slots">
      <div class="compact-slots__head">
        <span>Slot</span><span>Status</span><span>Part</span><span>Qty</span><span>Unit</span><span>Notes</span><span>Actions</span>
      </div>
      ${slots.map((slot, index) => renderSlot(cell, slot, index)).join('')}
    </div>
  `;
}

function renderSlot(cell, slot, index) {
  const status = isRunning(slot) ? 'running' : isPaused(slot) ? 'paused' : hasSetup(slot) ? 'queued' : 'empty';
  const label = status === 'running' ? 'Running' : status === 'paused' ? 'Paused' : status === 'queued' ? 'Saved' : 'No Setup';

  return `
    <form class="compact-slot status-${status}" data-slot-row data-cell-id="${escapeAttr(cellId(cell))}" data-slot-index="${index}">
      <div class="compact-slot__slot"><strong>Slot ${index + 1}</strong><small>${index === 0 ? 'Running position' : `Next ${index}`}</small></div>
      <div><span class="compact-status compact-status--${status}">${label}</span></div>
      <div class="part-field-wrap"><input name="partNumber" value="${escapeAttr(slot.partNumber || '')}" placeholder="Part number" autocomplete="off" data-part-input /><div class="part-suggest-box" data-part-suggestions></div></div>
      <input name="qtyRemaining" type="number" value="${escapeAttr(slot.qtyRemaining ?? '')}" placeholder="Qty" />
      <select name="unit">${renderUnitOptions(slot.unit || 'Pcs')}</select>
      <input name="notes" value="${escapeAttr(slot.notes || '')}" placeholder="Notes" />
      <div class="compact-slot__actions">
        <button type="button" class="compact-btn compact-btn--save" data-save-slot>Save</button>
        ${hasSetup(slot) && !isRunning(slot) ? '<button type="button" class="compact-btn compact-btn--run" data-run-slot>Run</button>' : ''}
        ${isRunning(slot) ? '<button type="button" class="compact-btn compact-btn--pause" data-pause-slot>Pause</button>' : ''}
        <button type="button" class="compact-btn compact-btn--clear" data-clear-slot>Clear</button>
      </div>
    </form>
  `;
}

function renderUnitOptions(selected = 'Pcs') {
  return UNIT_OPTIONS.map((unit) => `
    <option value="${escapeAttr(unit)}" ${unit === selected ? 'selected' : ''}>${escapeHtml(unit)}</option>
  `).join('');
}

function bindEvents() {
  const search = rootEl.querySelector('[data-supervisor-search]');
  if (search) {
    search.addEventListener('input', () => {
      searchText = search.value || '';
      refreshQueueContent();
    });
  }

  const area = rootEl.querySelector('[data-supervisor-area]');
  if (area) {
    area.addEventListener('change', () => {
      areaFilter = area.value || 'all';
      refreshQueueContent();
    });
  }

  bindQueueListEvents();
}

function bindQueueListEvents() {
  rootEl.querySelectorAll('[data-queue-filter]').forEach(btn => btn.addEventListener('click', () => {
    queueFilter = btn.dataset.queueFilter || 'all';
    refreshQueueContent();
  }));

  rootEl.querySelectorAll('[data-toggle-cell]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.toggleCell;
    expanded.has(id) ? expanded.delete(id) : expanded.add(id);
    refreshQueueContent();
  }));

  rootEl.querySelectorAll('[data-save-slot]').forEach(btn => btn.addEventListener('click', () => saveSlot(btn, 'next')));
  rootEl.querySelectorAll('[data-run-slot]').forEach(btn => btn.addEventListener('click', () => saveSlot(btn, 'current')));
  rootEl.querySelectorAll('[data-pause-slot]').forEach(btn => btn.addEventListener('click', () => saveSlot(btn, 'paused')));
  rootEl.querySelectorAll('[data-clear-slot]').forEach(btn => btn.addEventListener('click', () => clearSlot(btn)));
  bindPartAutocomplete();
}

function refreshQueueContent() {
  if (!rootEl) return;

  const filtered = getFilteredCells();
  const stats = getStats(getBaseFilteredCells());
  const statsEl = rootEl.querySelector('[data-supervisor-stats]');
  const listEl = rootEl.querySelector('[data-supervisor-list]');

  if (statsEl) statsEl.innerHTML = renderStats(stats);
  if (listEl) listEl.innerHTML = renderCellList(filtered);

  bindQueueListEvents();
}

function renderStats(stats) {
  const chip = (filter, label, count) => `
    <button
      type="button"
      class="compact-stat-chip ${queueFilter === filter ? 'active' : ''}"
      data-queue-filter="${escapeAttr(filter)}"
      aria-pressed="${queueFilter === filter ? 'true' : 'false'}"
    >
      ${escapeHtml(label)} <strong>${count}</strong>
    </button>
  `;

  return `
    ${chip('all', 'All', stats.all)}
    ${chip('running', 'Running', stats.running)}
    ${chip('queued', 'Queued', stats.queued)}
  `;
}

function renderCellList(cells) {
  return cells.length ? cells.map(renderCell).join('') : '<div class="compact-empty">No work cells found.</div>';
}

async function saveSlot(button, status) {
  const row = button.closest('[data-slot-row]');
  if (!row) return;

  await runAction(button, 'Saving...', async () => saveSupervisorSlot({
    workCellId: row.dataset.cellId,
    slotIndex: Number(row.dataset.slotIndex || 0),
    userName: currentUserName(),
    setup: {
      partNumber: row.elements.partNumber.value.trim(),
      qtyRemaining: Number(row.elements.qtyRemaining.value || 0),
      unit: row.elements.unit?.value || 'Pcs',
      notes: row.elements.notes.value.trim(),
      status
    }
  }));
}

async function clearSlot(button) {
  const row = button.closest('[data-slot-row]');
  if (!row) return;

  await runAction(button, 'Clearing...', async () => saveSupervisorSlot({
    workCellId: row.dataset.cellId,
    slotIndex: Number(row.dataset.slotIndex || 0),
    userName: currentUserName(),
    setup: { partNumber: '', qtyRemaining: 0, unit: 'Pcs', notes: '', status: 'next' }
  }));
}

async function runAction(button, label, action) {
  const old = button.textContent;
  button.disabled = true;
  button.textContent = label;

  try {
    await action();
  } catch (error) {
    console.error('Supervisor action failed:', error);
    alert(`Action failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = old;
  }
}


function bindPartAutocomplete() {
  rootEl.querySelectorAll('[data-part-input]').forEach((input) => {
    input.addEventListener('input', () => renderPartSuggestions(input));
    input.addEventListener('focus', () => renderPartSuggestions(input));
    input.addEventListener('blur', () => {
      setTimeout(() => closePartSuggestions(input), 160);
    });
  });
}

function renderPartSuggestions(input) {
  const row = input.closest('[data-slot-row]');
  const box = row?.querySelector('[data-part-suggestions]');
  if (!row || !box) return;

  const matches = findPartMatches(input.value, 8);

  if (!matches.length) {
    box.innerHTML = '';
    box.classList.remove('is-open');
    return;
  }

  box.innerHTML = matches.map((part) => `
    <button type="button" class="part-suggestion" data-part-number="${escapeAttr(part.partNumber)}" data-part-unit="${escapeAttr(part.unit || 'Pcs')}">
      <strong>${escapeHtml(part.partNumber)}</strong>
      <span>${escapeHtml(part.description || '')}</span>
      <small>${escapeHtml(part.unit || 'Pcs')}</small>
    </button>
  `).join('');

  box.classList.add('is-open');

  box.querySelectorAll('[data-part-number]').forEach((button) => {
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      applyPartToRow(row, {
        partNumber: button.dataset.partNumber,
        unit: button.dataset.partUnit || 'Pcs'
      });
      closePartSuggestions(input);
    });
  });
}

function closePartSuggestions(input) {
  const row = input.closest('[data-slot-row]');
  const box = row?.querySelector('[data-part-suggestions]');
  if (!box) return;

  box.innerHTML = '';
  box.classList.remove('is-open');
}

function getBaseFilteredCells() {
  const q = searchText.trim().toLowerCase();

  return workCells.filter(cell => {
    if (areaFilter !== 'all' && areaId(cell) !== areaFilter) return false;
    if (!q) return true;

    const slots = normalizeSlots(cell.slots);
    return [cellName(cell), areaName(cell), ...slots.flatMap(s => [s.partNumber, s.notes, s.lastUpdatedBy])].join(' ').toLowerCase().includes(q);
  });
}

function getFilteredCells() {
  const cells = getBaseFilteredCells();

  if (queueFilter === 'running') {
    return cells.filter(cell => normalizeSlots(cell.slots).some(isRunning));
  }

  if (queueFilter === 'queued') {
    return cells.filter(cell => {
      const slots = normalizeSlots(cell.slots);
      return !slots.some(isRunning) && slots.some(hasSetup);
    });
  }

  return cells;
}

function getStats(cells) {
  return cells.reduce((stats, cell) => {
    stats.all += 1;
    const slots = normalizeSlots(cell.slots);
    if (slots.some(isRunning)) stats.running += 1;
    else if (slots.some(hasSetup)) stats.queued += 1;
    else stats.empty += 1;
    return stats;
  }, { all: 0, running: 0, queued: 0, empty: 0 });
}

function getAreas() {
  const map = new Map();
  workCells.forEach(cell => map.set(areaId(cell), areaName(cell)));
  return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeSlots(slots) {
  const list = Array.isArray(slots) ? slots.slice(0, 4) : [];
  while (list.length < 4) list.push({ partNumber: '', qtyRemaining: 0, unit: 'Pcs', status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' });
  return list;
}

function hasSetup(slot) { return Boolean(String(slot?.partNumber || '').trim()); }
function isRunning(slot) { const s = String(slot?.status || '').toLowerCase(); return s === 'current' || s === 'running'; }
function isPaused(slot) { return String(slot?.status || '').toLowerCase() === 'paused'; }

function currentUserName() {
  for (const key of ['floor_flow_session_user','floorflow_supervisor_session','floor_flow_supervisor_session','floorFlowUser','currentUser']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      return parsed.name || parsed.userName || parsed.displayName || parsed.employeeName || 'Supervisor';
    } catch {}
  }
  return 'Supervisor';
}

function cellId(cell) { return cell.id || cell.pressId || cell.workCellId || ''; }
function cellName(cell) { return cell.workCellName || cell.equipmentName || cell.name || 'Work Cell'; }
function areaId(cell) { return cell.areaId || areaName(cell).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
function areaName(cell) { return cell.areaName || cell.area || 'Unassigned'; }
function escapeHtml(v) { return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function escapeAttr(v) { return escapeHtml(v); }
