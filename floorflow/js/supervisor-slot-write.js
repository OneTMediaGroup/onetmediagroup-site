import { assertSupervisorSession, assertPlantMatch } from './security-guard.js';
import { db } from './firebase-config.js';
import {
  doc,
  collection,
  getDoc,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { rememberPart } from './part-library.js';
export async function saveSupervisorSlot({ workCellId, slotIndex, userName, setup }) {
  const access = assertSupervisorSession();

  if (!workCellId) {
    throw new Error('Missing work cell ID.');
  }

  const ref = await resolveWorkCellRef(access.plantId, workCellId);
  const safeIndex = Number(slotIndex);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex > 3) throw new Error('Invalid queue slot.');
  const qty = Number(setup?.qtyRemaining || 0);
  if (!Number.isFinite(qty) || qty < 0) throw new Error('Quantity must be a non-negative number.');
  const logRef = doc(collection(db, 'plants', access.plantId, 'activityLogs'));
  let savedSlot;
  await runTransaction(db, async transaction => {
  const snap = await transaction.get(ref);

  if (!snap.exists()) {
    throw new Error('Work cell not found.');
  }

  const now = new Date().toISOString();
  assertPlantMatch(snap.data(), access.plantId);
  if (snap.data().isLocked) throw new Error('This work cell is locked. Ask an administrator to unlock it.');
  if (setup?.expectedUpdatedAt !== undefined && (snap.data().slots?.[safeIndex]?.updatedAt || '') !== setup.expectedUpdatedAt) {
    throw new Error('This slot changed on another screen. Refresh and review before saving.');
  }
  const cleanUser = cleanText(access.userName || 'Supervisor', 80);
  const requestedStatus = normalizeStatus(setup?.status || 'next');
  const slots = normalizeSlots(snap.data().slots);

  slots[safeIndex] = {
    ...slots[safeIndex],
    partNumber: cleanText(setup?.partNumber || '', 80),
    qtyRemaining: qty,
    status: requestedStatus,
    notes: cleanText(setup?.notes || '', 500),
    unit: cleanUnit(setup?.unit || slots[safeIndex]?.unit || 'Pcs'),
    updatedAt: now,
    lastUpdatedBy: cleanUser
  };

  const finalSlots = requestedStatus === 'current'
    ? slots.map((slot, index) => ({
        ...slot,
        status: index === safeIndex ? 'current' : (normalizeStatus(slot.status) === 'current' ? 'next' : normalizeStatus(slot.status))
      }))
    : slots;

  transaction.update(ref, {
    slots: finalSlots,
    updatedAt: now,
    lastUpdatedBy: cleanUser
  });

  transaction.set(logRef, {
    plantId: access.plantId,
    workCellId,
    pressId: workCellId,
    workCellName: snap.data().workCellName || snap.data().equipmentName || workCellId,
    partNumber: slots[safeIndex].partNumber,
    qty: slots[safeIndex].qtyRemaining,
    unit: slots[safeIndex].unit,
    slotIndex: safeIndex,
    action: requestedStatus === 'current' ? 'slot_running' : requestedStatus === 'paused' ? 'slot_paused' : 'slot_updated',
    message: requestedStatus === 'current'
      ? `${cleanUser} marked slot ${safeIndex + 1} running.`
      : requestedStatus === 'paused'
        ? `${cleanUser} paused slot ${safeIndex + 1}.`
        : `${cleanUser} updated slot ${safeIndex + 1}.`,
    createdBy: cleanUser,
    createdAt: now,
    updatedAt: now
  });
  savedSlot = slots[safeIndex];
  });
  if (savedSlot.partNumber) {
    try { await rememberPart(savedSlot); }
    catch (error) { console.warn('Queue saved; recent parts could not be updated:', error); }
  }
}

async function resolveWorkCellRef(plantId, workCellId) {
  const candidates = [
    doc(db, 'plants', plantId, 'workCells', workCellId),
    doc(db, 'plants', plantId, 'presses', workCellId)
  ];

  for (const ref of candidates) {
    const snap = await getDoc(ref);
    if (snap.exists()) return ref;
  }

  return candidates[0];
}

function cleanText(value = '', maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeStatus(value = 'next') {
  const status = String(value || 'next').toLowerCase();
  if (status === 'current' || status === 'running') return 'current';
  if (status === 'paused' || status === 'pause' || status === 'hold' || status === 'blocked') return 'paused';
  if (status === 'ready' || status === 'ready_for_changeover') return 'ready';
  return 'next';
}

function normalizeSlots(slots) {
  const list = Array.isArray(slots) ? slots.slice(0, 4) : [];

  while (list.length < 4) {
    list.push({
      partNumber: '',
      qtyRemaining: 0,
      status: 'next',
      notes: '',
      unit: 'Pcs',
      updatedAt: '',
      lastUpdatedBy: ''
    });
  }

  return list.map((slot) => ({
    partNumber: cleanText(slot?.partNumber || '', 80),
    qtyRemaining: Number(slot?.qtyRemaining || 0),
    status: normalizeStatus(slot?.status || 'next'),
    notes: cleanText(slot?.notes || '', 500),
    unit: cleanUnit(slot?.unit || 'Pcs'),
    updatedAt: slot?.updatedAt || '',
    lastUpdatedBy: cleanText(slot?.lastUpdatedBy || '', 80)
  }));
}


function cleanUnit(value = 'Pcs') {
  const unit = cleanText(value || 'Pcs', 40);
  const allowed = ['Pcs', 'Skids', 'Boxes', 'Lbs', 'Kg', 'Rolls', 'Bins', 'Pallets'];
  return allowed.includes(unit) ? unit : 'Pcs';
}
