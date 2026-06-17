import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { getActivePlantId } from './plant-session.js';
import { loadPartLibrary } from './part-library.js';

export async function loadReportData() {
  const [workCells, activityLogs, parts] = await Promise.all([
    loadWorkCellsForReports(),
    loadActivityLogsForReports(),
    loadPartLibrary({ limit: 1000 })
  ]);

  return {
    workCells,
    activityLogs,
    parts
  };
}

export async function loadWorkCellsForReports() {
  const plantId = getReportPlantId();
  if (!plantId) return [];

  const candidates = [
    ['plants', plantId, 'workCells'],
    ['plants', plantId, 'presses']
  ];

  for (const path of candidates) {
    try {
      const snap = await getDocs(collection(db, ...path));
      const rows = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      if (rows.length) return rows;
    } catch (error) {
      console.warn('Report work cell source skipped:', path.join('/'), error);
    }
  }

  return [];
}

export async function loadActivityLogsForReports() {
  const plantId = getReportPlantId();
  if (!plantId) return [];

  const sources = [
    ['plants', plantId, 'activityLogs'],
    ['plants', plantId, 'logs'],
    ['activityLogs'],
    ['logs']
  ];

  for (const path of sources) {
    try {
      const snap = await getDocs(query(collection(db, ...path), orderBy('createdAt', 'desc'), limit(1000)));
      const rows = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      })).filter((row) => !row.plantId || row.plantId === plantId);

      if (rows.length) return rows;
    } catch (error) {
      try {
        const fallback = await getDocs(collection(db, ...path));
        const rows = fallback.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })).filter((row) => !row.plantId || row.plantId === plantId);

        if (rows.length) {
          return rows.sort((a, b) => toTime(b.createdAt || b.updatedAt) - toTime(a.createdAt || a.updatedAt));
        }
      } catch (fallbackError) {
        console.warn('Report activity source skipped:', path.join('/'), fallbackError);
      }
    }
  }

  return [];
}

export function buildSnapshotRows(workCells = []) {
  return workCells
    .map((cell) => {
      const slots = normalizeSlots(cell.slots);
      const current = slots.find(isRunning) || slots.find(hasSetup) || {};
      const next = slots.find((slot) => slot !== current && hasSetup(slot)) || {};
      const status = isPaused(current) ? 'Paused' : isRunning(current) ? 'Running' : hasSetup(current) ? 'Saved' : 'No Setup';

      return {
        workCellId: cell.id || cell.workCellId || cell.pressId || '',
        workCell: cell.workCellName || cell.equipmentName || cell.name || 'Work Cell',
        area: cell.areaName || cell.area || 'Unassigned',
        currentPart: current.partNumber || '',
        currentQty: formatQty(current),
        nextPart: next.partNumber || '',
        nextQty: formatQty(next),
        status
      };
    })
    .filter((row) => row.currentPart || row.nextPart)
    .sort((a, b) => a.area.localeCompare(b.area) || a.workCell.localeCompare(b.workCell));
}

export function buildHistoryRows(activityLogs = [], workCells = []) {
  const cellMap = new Map();

  workCells.forEach((cell) => {
    const id = cell.id || cell.workCellId || cell.pressId;
    if (!id) return;
    cellMap.set(id, cell);
  });

  return activityLogs
    .map((log) => {
      const cell = cellMap.get(log.workCellId || log.pressId || log.cellId) || {};
      const action = normalizeAction(log.action || log.type || log.status || log.message || '');

      return {
        date: formatDateTime(log.createdAt || log.updatedAt || log.timestamp),
        rawDate: toTime(log.createdAt || log.updatedAt || log.timestamp),
        user: log.createdBy || log.userName || log.user || log.updatedBy || '',
        workCell: log.workCellName || cell.workCellName || cell.equipmentName || cell.name || log.pressName || log.workCellId || log.pressId || '',
        area: log.areaName || cell.areaName || cell.area || 'Unassigned',
        partNumber: log.partNumber || log.part || log.setup?.partNumber || '',
        qty: log.qtyRemaining ?? log.qty ?? log.setup?.qtyRemaining ?? '',
        unit: log.unit || log.setup?.unit || '',
        action,
        message: log.message || ''
      };
    })
    .filter((row) => row.action || row.message || row.partNumber || row.workCell)
    .sort((a, b) => b.rawDate - a.rawDate);
}

export function buildPartUsageRows(historyRows = [], parts = []) {
  const partMap = new Map();
  const descMap = new Map();

  parts.forEach((part) => {
    if (!part.partNumber) return;
    descMap.set(String(part.partNumber).toUpperCase(), part.description || '');
  });

  historyRows.forEach((row) => {
    const partNumber = String(row.partNumber || '').trim().toUpperCase();
    if (!partNumber) return;

    const existing = partMap.get(partNumber) || {
      partNumber,
      description: descMap.get(partNumber) || '',
      uses: 0,
      lastUsed: '',
      lastUsedRaw: 0
    };

    existing.uses += isUsageAction(row.action) ? 1 : 0;

    if (row.rawDate > existing.lastUsedRaw) {
      existing.lastUsedRaw = row.rawDate;
      existing.lastUsed = row.date;
    }

    partMap.set(partNumber, existing);
  });

  return [...partMap.values()]
    .filter((row) => row.uses > 0)
    .sort((a, b) => b.uses - a.uses || b.lastUsedRaw - a.lastUsedRaw);
}

export function summarizeReports(snapshotRows = [], historyRows = []) {
  const running = snapshotRows.filter((row) => row.status === 'Running').length;
  const paused = snapshotRows.filter((row) => row.status === 'Paused').length;

  return {
    workCells: snapshotRows.length,
    running,
    paused,
    totalEvents: historyRows.length
  };
}

export function rowsToCsv(headers, rows) {
  return [
    headers.map((header) => header.label),
    ...rows.map((row) => headers.map((header) => row[header.key] ?? ''))
  ].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function normalizeSlots(slots) {
  const list = Array.isArray(slots) ? slots.slice(0, 4) : [];

  while (list.length < 4) {
    list.push({ partNumber: '', qtyRemaining: '', unit: 'Pcs', status: 'next', notes: '' });
  }

  return list;
}

function hasSetup(slot = {}) {
  return Boolean(String(slot.partNumber || '').trim());
}

function isRunning(slot = {}) {
  const status = String(slot.status || '').toLowerCase();
  return status === 'current' || status === 'running';
}

function isPaused(slot = {}) {
  const status = String(slot.status || '').toLowerCase();
  return status === 'paused' || status === 'pause';
}

function formatQty(slot = {}) {
  const qty = slot.qtyRemaining ?? slot.qty ?? slot.quantity ?? '';
  const unit = slot.unit || 'Pcs';
  if (qty === '' || qty === null || qty === undefined) return '';
  return `${qty} ${unit}`;
}

function normalizeAction(value = '') {
  const text = String(value || '').toLowerCase();

  if (text.includes('complete') || text.includes('shifted queue')) return 'Complete + Shift';
  if (text.includes('ready')) return 'Ready';
  if (text === 'current' || text.includes('running') || text.includes('slot_running')) return 'Running';
  if (text.includes('paused') || text.includes('pause') || text.includes('slot_paused')) return 'Paused';
  if (text.includes('clear')) return 'Cleared';
  if (text.includes('save') || text.includes('updated') || text.includes('slot_updated')) return 'Saved';

  return String(value || '').trim();
}

function isUsageAction(action = '') {
  const value = String(action || '').toLowerCase();
  return ['saved', 'running', 'paused', 'ready', 'complete + shift'].includes(value);
}

function getReportPlantId() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get('plant') ||
    params.get('plantId') ||
    getActivePlantId?.() ||
    localStorage.getItem('floor_flow_active_plant_id') ||
    localStorage.getItem('floorFlowActivePlantId') ||
    localStorage.getItem('activePlantId') ||
    ''
  );
}

function toTime(value) {
  if (!value) return 0;

  if (typeof value === 'number') return value;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value?.seconds) return value.seconds * 1000;

  return Date.parse(value) || 0;
}

function formatDateTime(value) {
  const time = toTime(value);
  if (!time) return '';

  return new Date(time).toLocaleString();
}

function csvEscape(value = '') {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
