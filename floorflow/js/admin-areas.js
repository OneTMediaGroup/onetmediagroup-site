import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db } from './firebase-config.js';
import {areaDoc, areasCollection, workCellDoc, workCellsCollection} from './firestore-paths.js';
import { fetchPressesFromFirestore } from './firestore-press-admin.js';
import { addAdminLog, equipmentLabel } from './admin-helpers.js';
import { requirePlantId } from './plant-session.js';
import { assertAdminSession, sanitizeText, sanitizeColor } from './security-guard.js';

let root = null;
let areas = [];
let presses = [];

export async function mountAreasTool(container) {
  root = container;
  await loadAndRender();
  return () => {};
}

async function loadAndRender() {
  await Promise.all([loadAreas(), loadPresses()]);
  render();
}

async function loadAreas() {
  const plantId = requirePlantId();

  const snapshot = await getDocs(
    areasCollection()
  );

  areas = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

async function loadPresses() {
  presses = await fetchPressesFromFirestore();
}

function render() {
  root.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
      <div>
        <h2>Areas</h2>
        <p class="muted">Organize equipment by department.</p>
      </div>
      <button id="addAreaBtnPanel" class="button primary">Add Area</button>
    </div>

    <div id="areasPanelList" style="margin-top:16px; display:grid; gap:12px;">
      ${renderAreaCards()}
    </div>
  `;

  root.querySelector('#addAreaBtnPanel')?.addEventListener('click', handleAddArea);
  wireAreaButtons();
}

function renderAreaCards() {
  if (!areas.length) {
    return `
      <div class="card">
        <strong>No areas yet</strong>
        <div class="muted">Add your first area like Forming, Welding, or Rolling.</div>
      </div>
    `;
  }

  return areas.map((area) => {
    const unassignedPresses = presses.filter((press) => !press.areaId);
    const areaPresses = presses.filter((press) => press.areaId === area.id);
    const color = area.color || area.areaColor || '#3b82f6';

    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <strong style="color:${escapeAttr(color)}">${escapeHtml(area.name || area.areaName || 'Area')}</strong>
            <div class="muted">Order: ${area.order || 0}</div>
          </div>

          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <span class="muted">Color:</span>
            <input
              type="color"
              data-area-color="${area.id}"
              value="${escapeAttr(color)}"
              style="width:36px; height:36px; border:none; padding:0; background:transparent;"
            />
            <button class="button" data-save-area-color="${area.id}">Save</button>
            <button class="button" data-rename-area="${area.id}">Rename</button>
            <button class="button" data-delete-area="${area.id}">Delete</button>
          </div>
        </div>

        <div style="margin-top:14px;">
          <label class="muted">Assign equipment to ${escapeHtml(area.name || area.areaName || 'Area')}</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">
            <select data-area-assign="${area.id}">
              <option value="">Select equipment</option>
              ${unassignedPresses.map((press) => `
                <option value="${press.id}">${escapeHtml(equipmentLabel(press))}</option>
              `).join('')}
            </select>

            <button class="button" data-area-assign-btn="${area.id}">
              Assign Equipment
            </button>
          </div>
        </div>

        <div style="margin-top:14px; display:grid; gap:10px;">
          ${
            areaPresses.length
              ? areaPresses.map((press) => `
                <div style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  gap:12px;
                  flex-wrap:wrap;
                  padding:12px 14px;
                  border:1px solid #e5e7eb;
                  border-left:6px solid ${escapeAttr(color)};
                  border-radius:12px;
                  background:#ffffff;
                ">
                  <div>
                    <strong>${escapeHtml(equipmentLabel(press))}</strong>
                    <div class="muted">Area: ${escapeHtml(area.name || area.areaName || 'Area')}</div>
                  </div>

                  <button class="button" data-remove-press="${press.id}">
                    Remove
                  </button>
                </div>
              `).join('')
              : `<div class="muted">No equipment assigned yet.</div>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function wireAreaButtons() {
  root.querySelectorAll('[data-area-assign-btn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      assertAdminSession();
      const areaId = btn.dataset.areaAssignBtn;
      const area = areas.find((item) => item.id === areaId);
      const select = root.querySelector(`[data-area-assign="${areaId}"]`);
      if (!select?.value || !area) return alert('Pick equipment first.');

      const press = presses.find((item) => item.id === select.value);
      const label = press ? equipmentLabel(press) : 'Equipment';
      const areaName = area.name || area.areaName || 'Area';
      const areaColor = area.color || area.areaColor || '#3b82f6';

      await updateDoc(workCellDoc(select.value), {
        areaId,
        areaName,
        areaColor,
        updatedAt: new Date().toISOString()
      });

      await addAdminLog(`Assigned ${label} to area ${areaName}`);
      await loadAndRender();
    });
  });

  root.querySelectorAll('[data-remove-press]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      assertAdminSession();
      const press = presses.find((item) => item.id === btn.dataset.removePress);
      const label = press ? equipmentLabel(press) : 'Equipment';

      await updateDoc(workCellDoc(btn.dataset.removePress), {
        areaId: null,
        areaName: null,
        areaColor: null,
        updatedAt: new Date().toISOString()
      });

      await addAdminLog(`Removed ${label} from area`);
      await loadAndRender();
    });
  });

  root.querySelectorAll('[data-save-area-color]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      assertAdminSession();
      const areaId = btn.dataset.saveAreaColor;
      const input = root.querySelector(`[data-area-color="${areaId}"]`);
      const area = areas.find((item) => item.id === areaId);
      if (!input || !area) return;

      await updateDoc(areaDoc(areaId), {
        color: sanitizeColor(input.value),
        areaColor: sanitizeColor(input.value),
        updatedAt: new Date().toISOString()
      });

      const assigned = presses.filter((press) => press.areaId === areaId);
      for (const press of assigned) {
        await updateDoc(workCellDoc(press.id), {
          areaColor: sanitizeColor(input.value),
          updatedAt: new Date().toISOString()
        });
      }

      await addAdminLog(`Changed area color for ${area.name || area.areaName || areaId}`);
      await loadAndRender();
    });
  });

  root.querySelectorAll('[data-rename-area]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      assertAdminSession();
      const areaId = btn.dataset.renameArea;
      const area = areas.find((item) => item.id === areaId);
      const oldName = area?.name || area?.areaName || '';
      const name = prompt('New area name:', oldName);
      if (!name?.trim()) return;

      await updateDoc(areaDoc(areaId), {
        name: sanitizeText(name, 80),
        areaName: sanitizeText(name, 80),
        updatedAt: new Date().toISOString()
      });

      const assigned = presses.filter((press) => press.areaId === areaId);
      for (const press of assigned) {
        await updateDoc(workCellDoc(press.id), {
          areaName: sanitizeText(name, 80),
          updatedAt: new Date().toISOString()
        });
      }

      await addAdminLog(`Renamed area ${oldName || areaId} to ${sanitizeText(name, 80)}`);
      await loadAndRender();
    });
  });

  root.querySelectorAll('[data-delete-area]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      assertAdminSession();
      const areaId = btn.dataset.deleteArea;
      const area = areas.find((item) => item.id === areaId);
      const areaName = area?.name || area?.areaName || areaId;

      if (!confirm('Delete this area? Equipment will be unassigned.')) return;

      const assigned = presses.filter((press) => press.areaId === areaId);
      for (const press of assigned) {
        await updateDoc(workCellDoc(press.id), {
          areaId: null,
          areaName: null,
          areaColor: null,
          updatedAt: new Date().toISOString()
        });
      }

      await deleteDoc(areaDoc(areaId));
      await addAdminLog(`Deleted area ${areaName}`);
      await loadAndRender();
    });
  });
}

async function handleAddArea() {
  assertAdminSession();
  const plantId = requirePlantId();
  const name = window.prompt('Area name (example: Forming, Welding, Rolling)');
  if (!name || !name.trim()) return;

  try {
    await addDoc(areasCollection(), {
      plantId,
      name: name.trim(),
      areaName: sanitizeText(name, 80),
      color: '#3b82f6',
      areaColor: '#3b82f6',
      order: areas.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await addAdminLog(`Created area ${sanitizeText(name, 80)}`);
    await loadAndRender();
  } catch (error) {
    console.error('❌ Failed to add area:', error);
    alert('Add area failed.');
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

async function assignWorkCellToArea(workCellId, area) {
  if (!workCellId || !area) return;

  await updateDoc(workCellDoc(workCellId), {
    areaId: area.id,
    areaName: area.name,
    areaColor: area.color || '#2563eb',
    updatedAt: new Date().toISOString()
  });
}

async function removeWorkCellFromArea(workCellId) {
  if (!workCellId) return;

  await updateDoc(workCellDoc(workCellId), {
    areaId: '',
    areaName: 'Unassigned',
    areaColor: '#64748b',
    updatedAt: new Date().toISOString()
  });
}
