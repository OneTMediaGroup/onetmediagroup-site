import { formatTime, statusLabel, normalizedSlotStatus } from './utils.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function slotLabel(slotIndex) {
  return slotIndex === 0 ? 'Running' : `Next ${slotIndex}`;
}

export function equipmentLabel(press) {
  return press.equipmentName || `Press ${press.pressNumber}`;
}

function makeEmptySlot(slotIndex = 0) {
  return {
    partNumber: '',
    qtyRemaining: 0,
    status: slotIndex === 0 ? 'current' : 'next',
    notes: '',
    updatedAt: '',
    lastUpdatedBy: ''
  };
}

export function getSlotsArray(press) {
  const rawSlots = Array.isArray(press.slots)
    ? press.slots
    : Object.values(press.slots || {});

  const normalized = rawSlots.slice(0, 4).map((slot, index) => {
    if (!slot) return makeEmptySlot(index);

    const hasPart = Boolean(slot.partNumber);
    return {
      ...slot,
      partNumber: slot.partNumber || '',
      qtyRemaining: Number(slot.qtyRemaining || 0),
      status: hasPart ? normalizedSlotStatus(slot.status, index, true) : (index === 0 ? 'current' : 'next'),
      notes: slot.notes || '',
      updatedAt: slot.updatedAt || '',
      lastUpdatedBy: slot.lastUpdatedBy || ''
    };
  });

  while (normalized.length < 4) {
    normalized.push(makeEmptySlot(normalized.length));
  }

  return normalized;
}

export function activeSetupCount(presses) {
  return presses.flatMap((press) => getSlotsArray(press)).filter((slot) => slot.partNumber).length;
}

export function areaLabel(press) {
  return press.areaName || press.area || 'Unassigned';
}

export function equipmentStatus(press) {
  const slots = getSlotsArray(press);
  const active = slots.filter((slot) => slot.partNumber).length;
  const ready = slots.filter((slot, index) => normalizedSlotStatus(slot.status, index, Boolean(slot.partNumber)) === 'ready').length;
  const blocked = slots.filter((slot) => slot.status === 'blocked').length;

  if (press.isLocked) return { label: 'Locked', className: 'blocked', active, ready, blocked };
  if (blocked > 0) return { label: 'On Hold', className: 'blocked', active, ready, blocked };
  if (ready > 0) return { label: 'Ready', className: 'ready', active, ready, blocked };
  if (active > 0) return { label: 'Running / Next', className: 'current', active, ready, blocked };
  return { label: 'No Setups', className: 'no_setup', active, ready, blocked };
}

function slotDisplayStatus(slot, slotIndex) {
  if (!slot.partNumber) return 'no_setup';
  return normalizedSlotStatus(slot.status, slotIndex, true);
}


function formatRelativeTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getPressQueueCounts(slots) {
  return slots.reduce((counts, slot, index) => {
    if (!slot.partNumber) return counts;
    const status = normalizedSlotStatus(slot.status, index, true);
    if (index === 0 || status === 'current') counts.current += 1;
    else counts.next += 1;
    if (status === 'ready') counts.ready += 1;
    if (status === 'blocked') counts.blocked += 1;
    return counts;
  }, { current: 0, next: 0, ready: 0, blocked: 0 });
}

export function renderSlotCard(press, slot, slotIndex, selected = false, options = {}) {
  const editable = Boolean(options.editable);
  const empty = !slot.partNumber;
  const displayStatus = slotDisplayStatus(slot, slotIndex);
  const selectedStyle = selected
    ? 'border:2px solid rgba(37,99,235,0.45); box-shadow:0 0 0 3px rgba(37,99,235,0.10); cursor:pointer;'
    : 'cursor:pointer;';

  if (editable) {
    const readyButton = !empty && displayStatus !== 'ready'
      ? `<button type="button" class="button success" data-ready-slot="${press.id}" data-slot-index="${slotIndex}">Ready</button>`
      : '';
    const moveButtons = '';

    return `
      <section
        class="slot-card supervisor-slot-pick supervisor-slot-edit queue-slot-card ${displayStatus}-slot${selected ? ' selected-slot-card' : ''}${empty ? ' empty-slot-card' : ''}"
        data-pick-press="${escapeAttr(press.id)}"
        data-pick-slot="${slotIndex}"
        data-drop-press="${escapeAttr(press.id)}"
        data-drop-slot="${slotIndex}"
        draggable="true"
        style="${selectedStyle}"
      >
        <div class="slot-header queue-slot-header">
          <div class="queue-slot-title-block">
            <span class="queue-slot-label">${slotLabel(slotIndex)}</span>
            <h4>Slot ${slotIndex + 1}</h4>
          </div>
        </div>
        <div class="queue-slot-status-row">
          <span class="status-pill queue-slot-status ${displayStatus}">${empty ? 'No Setup' : statusLabel(displayStatus)}</span>
        </div>

        <div class="inline-slot-form" data-inline-press="${escapeAttr(press.id)}" data-inline-slot="${slotIndex}">
          <label>
            <span>Part</span>
            <input data-slot-part value="${escapeAttr(slot.partNumber || '')}" placeholder="Part number" />
          </label>
          <label>
            <span>Qty</span>
            <input data-slot-qty type="number" min="0" value="${slot.partNumber ? escapeAttr(slot.qtyRemaining || 0) : ''}" placeholder="Qty" />
          </label>
          <label class="inline-notes">
            <span>Notes</span>
            <textarea data-slot-notes rows="2" placeholder="Notes">${escapeHtml(slot.notes || '')}</textarea>
          </label>
          <div class="inline-slot-actions">
            <button type="button" class="button primary" data-save-slot="${escapeAttr(press.id)}" data-slot-index="${slotIndex}">Save</button>
            ${!empty ? `
              <button type="button" class="button queue-action-chip queue-action-current" data-set-slot-status="${escapeAttr(press.id)}" data-slot-index="${slotIndex}" data-status-value="${slotIndex === 0 ? 'current' : 'next'}">${slotIndex === 0 ? 'Running' : 'Next'}</button>
              <button type="button" class="button queue-action-chip queue-action-ready" data-set-slot-status="${escapeAttr(press.id)}" data-slot-index="${slotIndex}" data-status-value="ready">Ready</button>
              <button type="button" class="button queue-action-chip queue-action-hold" data-set-slot-status="${escapeAttr(press.id)}" data-slot-index="${slotIndex}" data-status-value="blocked">Hold</button>
              <button type="button" class="button" data-clear-slot="${escapeAttr(press.id)}" data-slot-index="${slotIndex}">Clear</button>
            ` : ''}
          </div>
          ${moveButtons}
        </div>

        <div class="queue-slot-footer">
          <span class="muted">By ${escapeHtml(slot.lastUpdatedBy || press.lastUpdatedBy || '—')}</span>
          <span class="muted">${slot.updatedAt ? `${formatRelativeTime(slot.updatedAt)} · ${formatTime(slot.updatedAt)}` : 'Not updated yet'}</span>
        </div>
      </section>
    `;
  }

  return `
    <section
      class="slot-card supervisor-slot-pick${selected ? ' selected-slot-card' : ''}${empty ? ' empty-slot-card' : ''}"
      data-pick-press="${press.id}"
      data-pick-slot="${slotIndex}"
      style="${selectedStyle}"
    >
      <div class="slot-header">
        <h4>Slot ${slotIndex + 1}</h4>
        <span class="status-pill ${displayStatus}">${empty ? 'No Setup' : statusLabel(displayStatus)}</span>
      </div>
      <div class="slot-meta">
        <div class="meta-box"><span>Part</span><strong>${slot.partNumber || '—'}</strong></div>
        <div class="meta-box"><span>Qty</span><strong>${slot.partNumber ? slot.qtyRemaining : '—'}</strong></div>
      </div>
      <div class="slot-note">${slot.notes || 'No notes added.'}</div>
      <div class="muted">Last updated by ${slot.lastUpdatedBy || press.lastUpdatedBy || '—'}</div>
      <div class="muted">Updated ${slot.updatedAt ? `${formatRelativeTime(slot.updatedAt)} · ${formatTime(slot.updatedAt)}` : '—'}</div>
    </section>
  `;
}

function normalizeQueueOptions(arg1, arg2, arg3) {
  if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
    return {
      selectedPressId: arg1.selectedPressId || '',
      selectedSlotIndex: arg1.selectedSlotIndex || '',
      expanded: Boolean(arg1.expanded),
      showAddSetup: Boolean(arg1.showAddSetup),
      showMenu: Boolean(arg1.showMenu),
      editable: Boolean(arg1.editable)
    };
  }

  return {
    selectedPressId: arg1 || '',
    selectedSlotIndex: arg2 || '',
    expanded: Boolean(arg3),
    showAddSetup: false,
    showMenu: false,
    editable: false
  };
}

export function renderPressQueueRow(press, arg1 = '', arg2 = '', arg3 = false) {
  const options = normalizeQueueOptions(arg1, arg2, arg3);
  const slots = getSlotsArray(press);
  const status = equipmentStatus(press);
  const selectedOnPress = press.id === options.selectedPressId;
  const chevron = options.expanded ? '⌄' : '›';
  const queueCounts = getPressQueueCounts(slots);

  return `
    <article class="supervisor-equipment-row${options.expanded ? ' expanded' : ''}${selectedOnPress ? ' selected-equipment-row' : ''}">
      <button class="supervisor-equipment-summary-row" type="button" data-toggle-press="${press.id}">
        <span class="queue-chevron">${chevron}</span>
        <span class="queue-equipment-name">${escapeHtml(equipmentLabel(press))}</span>
        <span class="queue-equipment-meta">${escapeHtml(areaLabel(press))}${press.isLocked ? ' · Locked' : ''}</span>
        <span class="status-pill queue-status ${status.className}">${status.label}</span>
        <span class="queue-count-badges">
  <span class="queue-count-badge current">${queueCounts.current} Current</span>
  <span class="queue-count-badge next">${queueCounts.next} Next</span>
  ${queueCounts.ready ? `<span class="queue-count-badge ready">${queueCounts.ready} Ready</span>` : ''}
  ${queueCounts.blocked ? `<span class="queue-count-badge blocked">${queueCounts.blocked} Hold</span>` : ''}
</span>
        ${options.showAddSetup ? `<span class="button queue-add-button" data-queue-add="${press.id}">+ Add Setup</span>` : ''}
        ${options.showMenu ? `<span class="queue-menu">⋮</span>` : ''}
      </button>

      ${options.expanded ? `
        <div class="queue-expanded-slots">
          ${slots.map((slot, originalIndex) => {
            const selected = press.id === options.selectedPressId && String(originalIndex) === String(options.selectedSlotIndex);
            return renderSlotCard(press, slot, originalIndex, selected, { editable: options.editable });
          }).join('')}
        </div>
      ` : ''}
    </article>
  `;
}