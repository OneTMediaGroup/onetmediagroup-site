import { db } from './firebase-config.js';
import {activityLogsCollection, requireActivePlantId, workCellDoc, workCellsCollection} from './firestore-paths.js';
import {
  doc,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { addLogToFirestore } from './firestore-logs.js';
import { normalizedSlotStatus, statusLabel } from './utils.js';
import { assertSetupWriteSession, assertPlantMatch, sanitizeSetupPayload, sessionDisplayName, makeAccessError } from './security-guard.js';


function assertSetupWriteAccess({ fallbackUserName = '' } = {}) {
  const access = assertSetupWriteSession();
  return {
    ...access,
    userName: sessionDisplayName(access.session, fallbackUserName)
  };
}

function assertPressBelongsToActivePlant(pressData, activePlantId) {
  assertPlantMatch(pressData, activePlantId, 'This equipment does not belong to the active plant.');
}


function makeConflictError({ pressId, slotIndex, lastUpdatedBy, updatedAt }) {
  const error = new Error('conflict');
  error.code = 'slot-conflict';
  error.pressId = pressId;
  error.slotIndex = slotIndex;
  error.lastUpdatedBy = lastUpdatedBy || 'another user';
  error.updatedAt = updatedAt || null;
  return error;
}

function emptySlot(now, userName) {
  return {
    partNumber: '',
    qtyRemaining: 0,
    unit: 'Pcs',
    status: 'next',
    notes: '',
    updatedAt: now,
    lastUpdatedBy: userName || ''
  };
}

function normalizeSlots(rawSlots, now, userName) {
  const raw = Array.isArray(rawSlots) ? [...rawSlots] : Object.values(rawSlots || {});
  const slots = raw.slice(0, 4).map((slot, index) => {
    const hasPart = Boolean(slot?.partNumber);
    return {
      partNumber: slot?.partNumber || '',
      qtyRemaining: Number(slot?.qtyRemaining || 0),
      unit: slot?.unit || 'Pcs',
      status: hasPart ? normalizedSlotStatus(slot?.status, index, true) : 'next',
      notes: slot?.notes || '',
      updatedAt: slot?.updatedAt || now,
      lastUpdatedBy: slot?.lastUpdatedBy || userName || ''
    };
  });

  while (slots.length < 4) {
    slots.push(emptySlot(now, userName));
  }

  return normalizeQueueOrder(slots, now, userName);
}

function normalizeQueueOrder(slots, now, userName) {
  const normalized = slots.slice(0, 4).map((slot, index) => {
    const hasPart = Boolean(slot?.partNumber);
    if (!hasPart) {
      return emptySlot(slot?.updatedAt || now, slot?.lastUpdatedBy || userName || '');
    }

    return {
      ...slot,
      status: normalizedSlotStatus(slot.status, index, true)
    };
  });

  const firstActiveIndex = normalized.findIndex((slot) => slot.partNumber);

  normalized.forEach((slot, index) => {
    if (!slot.partNumber) {
      slot.status = 'next';
      return;
    }

    if (index === firstActiveIndex) {
      slot.status = slot.status === 'ready' ? 'ready' : 'current';
    } else if (slot.status !== 'blocked') {
      slot.status = 'next';
    }
  });

  while (normalized.length < 4) normalized.push(emptySlot(now, userName));
  return normalized.slice(0, 4);
}

function buildLogMessage({ equipmentLabel, slotIndex, setup, previousSetup }) {
  const pressCode = equipmentLabel || 'Equipment';
  const slotText = `Slot ${slotIndex + 1}`;
  const hasPart = Boolean(setup.partNumber);
  const previousStatus = normalizedSlotStatus(previousSetup?.status, slotIndex, Boolean(previousSetup?.partNumber));
  const newStatus = normalizedSlotStatus(setup.status, slotIndex, hasPart);

  if (!hasPart) return `Cleared ${pressCode} ${slotText}`;
  if (!previousSetup?.partNumber) return `Loaded ${pressCode} ${slotText} · ${setup.partNumber} · Qty ${setup.qtyRemaining}`;

  if (previousStatus !== newStatus) {
    if (newStatus === 'blocked') return `Blocked ${pressCode} ${slotText} · ${setup.partNumber} · ${setup.notes || 'No reason added'}`;
    if (newStatus === 'ready') return `Ready for next step ${pressCode} ${slotText} · ${setup.partNumber}`;
    return `Updated status ${pressCode} ${slotText} · ${setup.partNumber} · ${statusLabel(newStatus)}`;
  }

  const qtyChanged = Number(previousSetup?.qtyRemaining || 0) !== Number(setup.qtyRemaining || 0);
  const notesChanged = (previousSetup?.notes || '') !== (setup.notes || '');
  const partChanged = (previousSetup?.partNumber || '') !== (setup.partNumber || '');

  if (partChanged) return `Changed setup ${pressCode} ${slotText} · ${previousSetup?.partNumber || '—'} → ${setup.partNumber}`;
  if (qtyChanged && notesChanged) return `Updated ${pressCode} ${slotText} · ${setup.partNumber} · Qty ${setup.qtyRemaining} + notes`;
  if (qtyChanged) return `Updated qty ${pressCode} ${slotText} · ${setup.partNumber} · Qty ${setup.qtyRemaining}`;
  if (notesChanged) return `Updated notes ${pressCode} ${slotText} · ${setup.partNumber}`;

  return `Updated ${pressCode} ${slotText} · ${setup.partNumber}`;
}

export async function completeAndShiftSetupInFirestore({ pressId, slotIndex = 0, setup = {}, userName }) {
  const access = assertSetupWriteAccess({ fallbackUserName: userName });
  userName = access.userName;

  const ref = workCellDoc(pressId);
  const now = new Date().toISOString();
  const expectedUpdatedAt = setup.expectedUpdatedAt || null;

  let completedSlot = null;
  let equipmentLabel = 'Equipment';

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Equipment not found');

    const pressData = snap.data();
    assertPressBelongsToActivePlant(pressData, access.plantId);
    equipmentLabel = pressData.equipmentName || `Press ${pressData.pressNumber || ''}`.trim() || 'Equipment';

    const slots = normalizeSlots(pressData.slots || [], now, userName);
    const currentSlot = slots[slotIndex] || {};

    if (!currentSlot.partNumber) throw new Error('Selected slot has no active setup.');

    const currentUpdatedAt = currentSlot.updatedAt || null;
    const currentLastUpdatedBy = currentSlot.lastUpdatedBy || pressData.lastUpdatedBy || null;

    if (expectedUpdatedAt && currentUpdatedAt && expectedUpdatedAt !== currentUpdatedAt) {
      throw makeConflictError({
        pressId,
        slotIndex,
        lastUpdatedBy: currentLastUpdatedBy,
        updatedAt: currentUpdatedAt
      });
    }

    completedSlot = { ...currentSlot };

    const shifted = [
      ...slots.slice(0, slotIndex),
      ...slots.slice(slotIndex + 1),
      emptySlot(now, userName)
    ];

    const nextSlots = normalizeQueueOrder(shifted, now, userName);

    transaction.update(ref, {
      slots: nextSlots,
      updatedAt: now,
      lastUpdatedBy: userName
    });
  });

  await addLogToFirestore({
  user: userName,
  createdBy: userName,
  action: 'complete_and_shift',
  workCellId: pressId,
  workCellName: equipmentLabel,
  partNumber: completedSlot?.partNumber || '',
  qty: Number(completedSlot?.qtyRemaining || 0),
  unit: completedSlot?.unit || 'Pcs',
  message: `Completed ${equipmentLabel} Slot ${slotIndex + 1} · ${completedSlot?.partNumber || '—'} · shifted queue forward`
});

  return { ok: true, shifted: true };
}

export async function updateSetupInFirestore({ pressId, slotIndex, setup, userName }) {
  const access = assertSetupWriteAccess({ fallbackUserName: userName });
  userName = access.userName;

  const ref = workCellDoc(pressId);
  const now = new Date().toISOString();
  setup = sanitizeSetupPayload(setup);
  const previousSetup = setup.previousSetup || null;
  const expectedUpdatedAt = setup.expectedUpdatedAt || null;

  let conflictMeta = null;
  let equipmentLabel = '';

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Equipment not found');

    const pressData = snap.data();
    assertPressBelongsToActivePlant(pressData, access.plantId);
    equipmentLabel = pressData.equipmentName || `Press ${pressData.pressNumber || ''}`.trim() || 'Equipment';
    const slots = normalizeSlots(pressData.slots || [], now, userName);
    const currentSlot = slots[slotIndex] || {};

    const currentUpdatedAt = currentSlot.updatedAt || null;
    const currentLastUpdatedBy = currentSlot.lastUpdatedBy || pressData.lastUpdatedBy || null;

    if (expectedUpdatedAt && currentUpdatedAt && expectedUpdatedAt !== currentUpdatedAt) {
      conflictMeta = { lastUpdatedBy: currentLastUpdatedBy, updatedAt: currentUpdatedAt };
      throw makeConflictError({
        pressId,
        slotIndex,
        lastUpdatedBy: currentLastUpdatedBy,
        updatedAt: currentUpdatedAt
      });
    }

    const partNumber = setup.partNumber || '';
    const hasPart = Boolean(partNumber);
    const status = hasPart
      ? normalizedSlotStatus(setup.status, slotIndex, true)
      : 'next';

    slots[slotIndex] = {
      ...currentSlot,
      partNumber,
      qtyRemaining: Number(setup.qtyRemaining || 0),
      unit: setup.unit || currentSlot.unit || 'Pcs',
      status,
      notes: setup.notes || '',
      updatedAt: now,
      lastUpdatedBy: userName
    };

    const nextSlots = normalizeQueueOrder(slots, now, userName);

    transaction.update(ref, {
      slots: nextSlots,
      updatedAt: now,
      lastUpdatedBy: userName
    });
  });

  await addLogToFirestore({
  user: userName,
  createdBy: userName,
  action: normalizedSlotStatus(setup.status, slotIndex, Boolean(setup.partNumber)),
  workCellId: pressId,
  workCellName: equipmentLabel,
  partNumber: setup.partNumber || '',
  qty: Number(setup.qtyRemaining || 0),
  unit: setup.unit || 'Pcs',
  message: buildLogMessage({
    equipmentLabel,
    slotIndex,
    setup,
    previousSetup
  })
});

  return { ok: true, conflict: false, conflictMeta };
}
