import { db } from './firebase-config.js';
import {
  doc,
  collection,
  getDoc,
  updateDoc,
  addDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { rememberPart } from './part-library.js';
export async function saveSupervisorSlot({ workCellId, slotIndex, userName, setup }) {
  const access = supervisorAccess();

  if (!workCellId) {
    throw new Error('Missing work cell ID.');
  }

  const ref = await resolveWorkCellRef(access.plantId, workCellId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Work cell not found.');
  }

  const now = new Date().toISOString();
  const safeIndex = Math.max(0, Math.min(Number(slotIndex || 0), 3));
  const cleanUser = cleanText(userName || access.userName || 'Supervisor', 80);
  const requestedStatus = normalizeStatus(setup?.status || 'next');
  const slots = normalizeSlots(snap.data().slots);

  slots[safeIndex] = {
    ...slots[safeIndex],
    partNumber: cleanText(setup?.partNumber || '', 80),
    qtyRemaining: Number(setup?.qtyRemaining || 0),
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

  await updateDoc(ref, {
    slots: finalSlots,
    updatedAt: now,
    lastUpdatedBy: cleanUser
  });

  if (slots[safeIndex].partNumber) {
    await rememberPart({
      partNumber: slots[safeIndex].partNumber,
      unit: slots[safeIndex].unit || 'Pcs'
    });
  }

  await safeLog(access.plantId, {
    plantId: access.plantId,
    workCellId,
    pressId: workCellId,
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
}

async function resolveWorkCellRef(plantId, workCellId) {
  const candidates = [
    doc(db, 'plants', plantId, 'workCells', workCellId),
    doc(db, 'plants', plantId, 'presses', workCellId),
    doc(db, 'presses', workCellId)
  ];

  for (const ref of candidates) {
    const snap = await getDoc(ref);
    if (snap.exists()) return ref;
  }

  return candidates[0];
}

async function safeLog(plantId, payload) {
  try {
    await addDoc(collection(db, 'plants', plantId, 'activityLogs'), payload);
  } catch (error) {
    console.warn('Supervisor activity log skipped:', error);
  }
}

function supervisorAccess() {
  const params = new URLSearchParams(window.location.search);

  const plantId =
    params.get('plant') ||
    params.get('plantId') ||
    localStorage.getItem('floor_flow_active_plant_id') ||
    localStorage.getItem('floorFlowActivePlantId') ||
    localStorage.getItem('activePlantId') ||
    '';

  let userName = 'Supervisor';

  for (const key of ['floor_flow_session_user','floorflow_supervisor_session','floor_flow_supervisor_session','floorFlowUser','currentUser']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      userName = parsed.name || parsed.userName || parsed.displayName || parsed.employeeName || userName;
      break;
    } catch {}
  }

  if (!plantId) {
    throw new Error('Active plant missing. Open Supervisor from a plant access link.');
  }

  return { plantId, userName };
}

function cleanText(value = '', maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeStatus(value = 'next') {
  const status = String(value || 'next').toLowerCase();
  if (status === 'current' || status === 'running') return 'current';
  if (status === 'paused' || status === 'pause' || status === 'hold' || status === 'blocked') return 'paused';
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
