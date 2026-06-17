import { watchPressesFromFirestore } from './firestore-presses.js';
import { formatTime, normalizedSlotStatus } from './utils.js';

const areaFilter = document.getElementById('displayAreaFilter');
const autoScrollSelect = document.getElementById('displayAutoScroll');
const lastSync = document.getElementById('displayLastSync');
const scrollArea = document.getElementById('displayScrollArea');
const boardContent = document.getElementById('displayBoardContent');
const fullscreenBtn = document.getElementById('displayFullscreenBtn');

let presses = [];
let unsubscribePresses = null;
let scrollTimer = null;
let scrollDirection = 1;
let scrollHoldUntil = 0;

initDisplayBoard();

fullscreenBtn?.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      fullscreenBtn.textContent = 'Exit Fullscreen';
    } else {
      await document.exitFullscreen();
      fullscreenBtn.textContent = 'Fullscreen';
    }
  } catch (error) {
    console.error('Fullscreen failed', error);
  }
});

document.addEventListener('fullscreenchange', () => {
  if (!fullscreenBtn) return;
  fullscreenBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
});

function initDisplayBoard() {
  const savedArea = localStorage.getItem('displayBoardArea') || 'all';
  const savedAuto = localStorage.getItem('displayBoardAutoScroll') || 'on';

  if (autoScrollSelect) autoScrollSelect.value = savedAuto;

  areaFilter?.addEventListener('change', () => {
    localStorage.setItem('displayBoardArea', areaFilter.value);
    renderDisplayBoard();
    restartAutoScroll(true);
  });

  autoScrollSelect?.addEventListener('change', () => {
    localStorage.setItem('displayBoardAutoScroll', autoScrollSelect.value);
    restartAutoScroll(true);
  });

  try {
    unsubscribePresses = watchPressesFromFirestore((livePresses) => {
      presses = livePresses.map((press) => ({
        ...press,
        isLocked: Boolean(press.isLocked)
      }));

      syncAreaOptions(savedArea);
      renderDisplayBoard();
      updateSyncTime();
      restartAutoScroll(false);
    });
  } catch (error) {
    console.error('Display board failed to start:', error);
    if (boardContent) {
      boardContent.innerHTML = `<div class="display-empty-state">Display board could not load. Check console for details.</div>`;
    }
  }
}

function updateSyncTime() {
  if (!lastSync) return;
  lastSync.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getSlotsArray(press) {
  const raw = Array.isArray(press.slots) ? press.slots : Object.values(press.slots || {});
  const slots = raw.slice(0, 4).map((slot, index) => normalizeDisplaySlot(slot, index));
  while (slots.length < 4) slots.push(emptySlot());
  return slots;
}

function normalizeDisplaySlot(slot = {}, index = 0) {
  const hasPart = Boolean(String(slot?.partNumber || '').trim());
  return {
    partNumber: slot?.partNumber || '',
    qtyRemaining: Number(slot?.qtyRemaining ?? slot?.qty ?? slot?.quantity ?? 0),
    unit: slot?.unit || 'Pcs',
    status: hasPart ? normalizedSlotStatus(slot?.status, index, true) : 'next',
    notes: slot?.notes || '',
    updatedAt: slot?.updatedAt || '',
    lastUpdatedBy: slot?.lastUpdatedBy || ''
  };
}

function emptySlot() {
  return {
    partNumber: '',
    qtyRemaining: 0,
    unit: 'Pcs',
    status: 'next',
    notes: '',
    updatedAt: '',
    lastUpdatedBy: ''
  };
}

function equipmentLabel(press) {
  return press.equipmentName || press.workCellName || press.name || `Press ${press.pressNumber || ''}`.trim() || 'Work Cell';
}

function areaLabel(press) {
  return press.areaName || press.area || 'Unassigned';
}

function areaKey(press) {
  return press.areaId || `area-${areaLabel(press).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function getAreaColor(press) {
  const area = areaLabel(press).toLowerCase();

  if (area.includes('assembly')) return '#22c55e';
  if (area.includes('automation')) return '#0ea5e9';
  if (area.includes('robot')) return '#0ea5e9';
  if (area.includes('cnc')) return '#7c3aed';
  if (area.includes('packaging')) return '#f59e0b';
  if (area.includes('stamping')) return '#ef4444';
  if (area.includes('press')) return '#ef4444';

  return '#2563eb';
}


function syncAreaOptions(preferredValue = '') {
  if (!areaFilter) return;

  const currentValue = localStorage.getItem('displayBoardArea') || preferredValue || areaFilter.value || 'all';
  const areas = new Map();

  presses.forEach((press) => {
    areas.set(areaKey(press), {
      key: areaKey(press),
      label: areaLabel(press),
   color: getAreaColor(press)
    });
  });

  const sortedAreas = [...areas.values()].sort((a, b) => a.label.localeCompare(b.label));

  areaFilter.innerHTML = `
    <option value="all">All Areas</option>
    ${sortedAreas.map((area) => `<option value="${escapeAttr(area.key)}">${escapeHtml(area.label)}</option>`).join('')}
  `;

  const hasValue = currentValue === 'all' || sortedAreas.some((area) => area.key === currentValue);
  areaFilter.value = hasValue ? currentValue : 'all';
}

function filteredPresses() {
  const selectedArea = areaFilter?.value || 'all';

  return presses
    .filter((press) => {
      const slots = getSlotsArray(press);
      const hasActiveSetup = slots.some((slot) => slot.partNumber);
      if (!hasActiveSetup) return false;
      if (selectedArea === 'all') return true;
      return areaKey(press) === selectedArea;
    })
    .sort(sortDisplayPresses);
}

function sortDisplayPresses(a, b) {
  const aPriority = displayPriority(a);
  const bPriority = displayPriority(b);
  if (aPriority !== bPriority) return aPriority - bPriority;

  const areaCompare = areaLabel(a).localeCompare(areaLabel(b), undefined, { numeric: true });
  if (areaCompare !== 0) return areaCompare;

  return equipmentLabel(a).localeCompare(equipmentLabel(b), undefined, { numeric: true });
}

function displayPriority(press) {
  const slots = getSlotsArray(press);
  const current = slots[0];

  if (current?.partNumber && current.status === 'ready') return 0;
  if (slots.some((slot) => slot.partNumber && slot.status === 'blocked')) return 1;
  return 2;
}

function renderDisplayBoard() {
  const visiblePresses = filteredPresses();
  if (!boardContent) return;

  if (!visiblePresses.length) {
    boardContent.innerHTML = `<div class="display-empty-state">No work cells found.</div>`;
    return;
  }

  boardContent.innerHTML = `
    <div class="display-flat-list">
      ${visiblePresses.map((press) => renderEquipmentRow(press)).join('')}
    </div>
  `;
}

function renderEquipmentRow(press) {
  const slots = getSlotsArray(press);
  const activeSlots = slots.filter((slot) => slot.partNumber).length;
  const status = equipmentStatus(press, slots);
  const current = slots[0] || emptySlot();
  const next = getNextSlot(slots);

  return `
    <article class="display-equipment-row ${status.className}" style="--area-color:${escapeAttr(getAreaColor(press))};">
      <div class="display-equipment-summary">
        <div class="display-equipment-title">
          <strong>${escapeHtml(equipmentLabel(press))}</strong>
          <span>${escapeHtml(areaLabel(press))}${press.isLocked ? ' · Locked' : ''}</span>
        </div>
        <span class="status-pill ${status.className}">${escapeHtml(status.label)}</span>
        <span class="display-active-count">${activeSlots} / ${slots.length} setups</span>
      </div>

      <div class="display-slot-strip compact-tv">
        ${renderDisplaySlot(current, 0, 'CURRENT')}
        ${renderDisplaySlot(next, 1, 'Next')}
      </div>
    </article>
  `;
}

function equipmentStatus(press, slots) {
  const current = slots[0] || emptySlot();

  if (press.isLocked) return { label: 'Locked', className: 'blocked' };
  if (current.partNumber && current.status === 'blocked') return { label: 'On Hold', className: 'blocked' };
  if (current.partNumber && current.status === 'ready') return { label: 'READY FOR NEXT JOB', className: 'ready' };
  if (slots.some((slot) => slot.partNumber)) return { label: 'Running / Next', className: 'running' };
  return { label: 'No Setups', className: 'no_setup' };
}

function getNextSlot(slots) {
  return slots.slice(1).find((slot) => slot.partNumber) || emptySlot();
}

function renderDisplaySlot(slot, index, labelOverride = null) {
  const empty = !slot.partNumber;
  const title = labelOverride || (index === 0 ? 'CURRENT' : 'NEXT');

  return `
    <div class="display-slot-card tv-wide-card
     ${empty ? 'empty' : ''}
     ${slot.status === 'ready' ? 'ready-slot' : ''}">
      <div class="display-slot-header">
        <span class="tv-card-title">${escapeHtml(title)}</span>
      </div>

      <div class="tv-wide-content">
        <div class="tv-item">
          <span class="tv-label">Part</span>
          <strong>${escapeHtml(slot.partNumber || '—')}</strong>
        </div>

        <div class="tv-item">
          <span class="tv-label">Qty</span>
          <strong>${escapeHtml(empty ? '—' : slot.qtyRemaining)}</strong>
        </div>

        <div class="tv-item">
          <span class="tv-label">Unit</span>
          <strong>${escapeHtml(empty ? '—' : slot.unit || 'Pcs')}</strong>
        </div>

        <div class="tv-item">
          <span class="tv-label">${index === 0 ? 'Started' : 'Time'}</span>
          <strong>${slot.updatedAt ? escapeHtml(formatTime(slot.updatedAt)) : '—'}</strong>
        </div>
      </div>
    </div>
  `;
}

function restartAutoScroll(resetPosition) {
  stopAutoScroll();

  if (resetPosition && scrollArea) {
    scrollArea.scrollTop = 0;
    scrollDirection = 1;
  }

  if (autoScrollSelect?.value !== 'on') return;
  if (!scrollArea) return;

  window.setTimeout(() => {
    if (!scrollArea || scrollArea.scrollHeight <= scrollArea.clientHeight + 20) return;
    scrollHoldUntil = Date.now() + 1800;

    scrollTimer = window.setInterval(() => {
      if (!scrollArea) return;
      if (Date.now() < scrollHoldUntil) return;

      const bottom = scrollArea.scrollHeight - scrollArea.clientHeight;

      if (scrollArea.scrollTop >= bottom - 2) {
        scrollDirection = -1;
        scrollHoldUntil = Date.now() + 2400;
      } else if (scrollArea.scrollTop <= 2) {
        scrollDirection = 1;
        scrollHoldUntil = Date.now() + 1800;
      }

      scrollArea.scrollTop += scrollDirection;
    }, 45);
  }, 250);
}

function stopAutoScroll() {
  if (scrollTimer) {
    window.clearInterval(scrollTimer);
    scrollTimer = null;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

window.addEventListener('beforeunload', () => {
  stopAutoScroll();
  if (typeof unsubscribePresses === 'function') unsubscribePresses();
});
