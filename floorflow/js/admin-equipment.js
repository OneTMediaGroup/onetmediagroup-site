import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase-config.js';
import {activityLogsCollection, areaDoc, areasCollection, plantDocRef, settingsDocRef, usersCollection, workCellDoc, workCellsCollection} from './firestore-paths.js';
import { fetchPressesFromFirestore, archiveAndResetPressInFirestore } from './firestore-press-admin.js';
import { addAdminLog, emptySlots, equipmentLabel } from './admin-helpers.js';
import { getSession } from './store.js';
import { getStoredSessionUser } from './session-user.js';
import { requirePlantId } from './plant-session.js';
import { assertAdminSession, sanitizeText } from './security-guard.js';

let root = null;
let presses = [];
let areas = [];
let searchText = '';
let editingId = null;

export async function mountEquipmentTool(container) {
  root = container;
  await loadAndRender();
  return () => {};
}

async function loadAndRender() {
  try {
    const [loadedPresses, loadedAreas] = await Promise.all([
      fetchPressesFromFirestore(),
      loadAreasForEquipment()
    ]);

    presses = loadedPresses;
    areas = loadedAreas;
    render();
  } catch (error) {
    console.error('❌ Failed to load equipment:', error);
    root.innerHTML = `
      <div class="admin-content-header">
        <h2>Equipment</h2>
        <p class="muted">Could not load equipment.</p>
      </div>
    `;
  }
}

function getFilteredPresses() {
  return presses.filter((press) => {
    const text = `${equipmentLabel(press)} ${press.areaName || ''}`.toLowerCase();
    return text.includes(searchText.toLowerCase());
  });
}

async function loadAreasForEquipment() {
  const snapshot = await getDocs(areasCollection());

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(a.name || a.areaName || '').localeCompare(String(b.name || b.areaName || ''), undefined, { numeric: true }));
}

function areaNameFor(area) {
  return area?.name || area?.areaName || 'Area';
}

function areaColorFor(area) {
  return area?.color || area?.areaColor || '#3b82f6';
}

function renderAreaOptions(selectedAreaId = '') {
  return `
    <option value="">Unassigned</option>
    ${areas.map((area) => `
      <option value="${escapeAttr(area.id)}" ${selectedAreaId === area.id ? 'selected' : ''}>
        ${escapeHtml(areaNameFor(area))}
      </option>
    `).join('')}
  `;
}

function getAreaPayload(areaId) {
  if (!areaId) {
    return {
      areaId: null,
      areaName: null,
      areaColor: null
    };
  }

  const area = areas.find((item) => item.id === areaId);

  if (!area) {
    return {
      areaId: null,
      areaName: null,
      areaColor: null
    };
  }

  return {
    areaId: area.id,
    areaName: areaNameFor(area),
    areaColor: areaColorFor(area)
  };
}

function render() {
  const filtered = getFilteredPresses();

  root.innerHTML = `
    <div>
      <div class="admin-content-header">
        <h2>Equipment</h2>
        <p class="muted">Create, search, edit, reset, and delete work cells.</p>
      </div>

      <div class="admin-card">
        <h3>Add Work Cell</h3>
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:12px;">
          <input id="newEquipmentName" placeholder="Example: 150B RH" style="max-width:420px;" />
          <select id="newEquipmentArea" style="min-width:220px;">
            ${renderAreaOptions('')}
          </select>
          <button id="createEquipmentBtn" class="button primary">Add</button>
        </div>
      </div>

      <div class="admin-card" style="margin-top:16px;">
        <h2>All Work Cells</h2>
        <div id="equipmentCountText" class="muted" style="margin-bottom:12px;">
          ${filtered.length} shown · ${presses.length} total
        </div>

        <input
          id="equipmentSearch"
          value="${escapeAttr(searchText)}"
          placeholder="Search..."
          style="width:100%; margin-bottom:14px;"
        />

        <div id="equipmentTableBody" style="display:grid; gap:10px;">
          ${renderEquipmentRows(filtered)}
        </div>
      </div>
    </div>
  `;

  wireEvents();
}

function refreshEquipmentTable() {
  const filtered = getFilteredPresses();

  const body = root.querySelector('#equipmentTableBody');
  const count = root.querySelector('#equipmentCountText');

  if (body) body.innerHTML = renderEquipmentRows(filtered);
  if (count) count.textContent = `${filtered.length} shown · ${presses.length} total`;

  wireRowEvents();
}

function renderEquipmentRows(list) {
  if (!list.length) {
    return `<div class="muted">No work cells found.</div>`;
  }

  return list.map((press, index) => {
    const activeCount = (press.slots || []).filter((s) => s.partNumber).length;
    const areaLabel = press.areaName || 'Unassigned';
    const areaColor = press.areaColor || '#64748b';
    const isEditing = editingId === press.id;

    if (isEditing) {
      return `
        <div class="card" style="padding:14px;">
          <div style="display:grid; gap:10px;">
            <input data-edit-name="${press.id}" value="${escapeAttr(equipmentLabel(press))}" />
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <select data-equipment-area="${press.id}" style="min-width:220px;">
                ${renderAreaOptions(press.areaId || '')}
              </select>
              <button class="button primary" data-save-equipment="${press.id}">Save</button>
              <button class="button" data-cancel-edit>Cancel</button>
              <button class="button danger-outline" data-reset-equipment="${press.id}">Reset</button>
              <button class="button" data-delete-equipment="${press.id}">Delete</button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="card" style="padding:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <strong>${index + 1}. ${escapeHtml(equipmentLabel(press))}</strong>
            <div class="muted">
              Area: <span style="color:${escapeAttr(areaColor)}; font-weight:700;">${escapeHtml(areaLabel)}</span>
              · ${activeCount} setup${activeCount === 1 ? '' : 's'}
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <select data-equipment-area="${press.id}" style="min-width:220px;">
              ${renderAreaOptions(press.areaId || '')}
            </select>
            <button class="button" data-edit-equipment="${press.id}">Edit</button>
            <button class="button danger-outline" data-reset-equipment="${press.id}">Reset</button>
            <button class="button" data-delete-equipment="${press.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function wireEvents() {
  root.querySelector('#createEquipmentBtn')?.addEventListener('click', handleCreateEquipment);

  root.querySelector('#equipmentSearch')?.addEventListener('input', (e) => {
    searchText = e.target.value;
    refreshEquipmentTable();
  });

  wireRowEvents();
}

function wireRowEvents() {
  root.querySelectorAll('[data-edit-equipment]').forEach((btn) => {
    btn.onclick = () => {
      editingId = btn.dataset.editEquipment;
      render();
    };
  });

  root.querySelectorAll('[data-cancel-edit]').forEach((btn) => {
    btn.onclick = () => {
      editingId = null;
      render();
    };
  });

  root.querySelectorAll('[data-save-equipment]').forEach((btn) => {
    btn.onclick = async () => {
      await handleSaveEquipment(btn.dataset.saveEquipment);
    };
  });

  root.querySelectorAll('[data-reset-equipment]').forEach((btn) => {
    btn.onclick = async () => {
      await handleResetEquipment(btn.dataset.resetEquipment);
    };
  });

  root.querySelectorAll('[data-delete-equipment]').forEach((btn) => {
    btn.onclick = async () => {
      await handleDeleteEquipment(btn.dataset.deleteEquipment);
    };
  });

  root.querySelectorAll('[data-equipment-area]').forEach((select) => {
    select.onchange = async () => {
      await handleChangeEquipmentArea(select.dataset.equipmentArea, select.value);
    };
  });
}

async function handleCreateEquipment() {
  assertAdminSession();
  const plantId = requirePlantId();
  const input = root.querySelector('#newEquipmentName');
  const areaSelect = root.querySelector('#newEquipmentArea');
  const name = sanitizeText(input?.value, 80);
  const areaPayload = getAreaPayload(areaSelect?.value || '');

  if (!name) return alert('Enter equipment name');

  const nextNumber = presses.length
    ? Math.max(...presses.map(p => Number(p.pressNumber || 0))) + 1
    : 1;

  await addDoc(workCellsCollection(), {
    plantId,
    equipmentName: name,
      workCellName: name,
      type: 'workCell',
    pressNumber: nextNumber,
    shift: '1',
    areaId: areaPayload.areaId,
    areaName: areaPayload.areaName,
    areaColor: areaPayload.areaColor,
    isLocked: false,
    slots: emptySlots(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  await addAdminLog(`Created ${name}${areaPayload.areaName ? ` in ${areaPayload.areaName}` : ''}`);
  editingId = null;
  await loadAndRender();
}

async function handleSaveEquipment(id) {
  assertAdminSession();
  const press = presses.find(p => p.id === id);
  if (!press) return alert('Equipment not found in active plant.');
  const input = root.querySelector(`[data-edit-name="${id}"]`);
  const areaSelect = root.querySelector(`[data-equipment-area="${id}"]`);
  const name = sanitizeText(input?.value, 80);
  const areaPayload = getAreaPayload(areaSelect?.value || press.areaId || '');

  if (!name) return alert('Name required');

  await updateDoc(workCellDoc(id), {
    equipmentName: name,
      workCellName: name,
      type: 'workCell',
    areaId: areaPayload.areaId,
    areaName: areaPayload.areaName,
    areaColor: areaPayload.areaColor,
    updatedAt: new Date().toISOString()
  });

  await addAdminLog(`Renamed ${equipmentLabel(press)} to ${name}`);
  editingId = null;
  await loadAndRender();
}


async function handleChangeEquipmentArea(id, areaId) {
  assertAdminSession();
  const press = presses.find(p => p.id === id);
  if (!press) return alert('Equipment not found in active plant.');

  const areaPayload = getAreaPayload(areaId);

  await updateDoc(workCellDoc(id), {
    areaId: areaPayload.areaId,
    areaName: areaPayload.areaName,
    areaColor: areaPayload.areaColor,
    updatedAt: new Date().toISOString()
  });

  await addAdminLog(`${equipmentLabel(press)} area changed to ${areaPayload.areaName || 'Unassigned'}`);
  await loadAndRender();
}

async function handleDeleteEquipment(id) {
  assertAdminSession();
  const press = presses.find(p => p.id === id);
  if (!press) return alert('Equipment not found in active plant.');
  if (!confirm(`Delete ${equipmentLabel(press)}?`)) return;

  await deleteDoc(workCellDoc(id));
  await addAdminLog(`Deleted ${equipmentLabel(press)}`);
  editingId = null;
  await loadAndRender();
}

async function handleResetEquipment(id) {
  assertAdminSession();
  const press = presses.find(p => p.id === id);
  if (!press) return alert('Equipment not found in active plant.');
  const session = getSession() || getStoredSessionUser() || { name: 'Admin' };

  if (!confirm(`Reset ${equipmentLabel(press)}?`)) return;

  await archiveAndResetPressInFirestore({
    pressId: id,
    userName: session.name
  });

  await addAdminLog(`Reset ${equipmentLabel(press)}`);
  editingId = null;
  await loadAndRender();
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