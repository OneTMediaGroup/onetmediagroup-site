import { db } from './firebase-config.js';
import {
  doc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export const UNIT_OPTIONS = ['Pcs', 'Skids', 'Boxes', 'Lbs', 'Kg', 'Rolls', 'Bins', 'Pallets'];

function recentKey() {
  return `floorflow_recent_parts_${activePlantId()}`;
}

function cacheKey() {
  return `floorflow_part_cache_${activePlantId()}`;
}

export async function loadPartLibrary(options = {}) {
  const local = loadLocalParts();

  try {
    const plantId = activePlantId();
    if (!plantId) return local;

    const snap = await getDocs(query(collection(db, 'plants', plantId, 'partLibrary'), limit(options.limit || 1000)));
    const remote = snap.docs.map((item) => item.data()).filter((item) => item?.partNumber);

    const merged = mergeParts(remote, local);
    saveLocalParts(merged);

    return merged;
  } catch (error) {
    console.warn('Part library remote load skipped:', error);
    return local;
  }
}

export function loadRecentParts() {
  try {
    return JSON.parse(localStorage.getItem() || '[]');
  } catch {
    return [];
  }
}

export async function savePart(part) {
  const cleanPart = normalizePart(part);
  if (!cleanPart.partNumber) {
    throw new Error('Part number is required.');
  }

  savePartLocal(cleanPart);
  saveRecentPartLocal(cleanPart);

  const plantId = activePlantId();
  if (!plantId) return cleanPart;

  await setDoc(doc(db, 'plants', plantId, 'partLibrary', safePartId(cleanPart.partNumber)), {
    plantId,
    ...cleanPart
  }, { merge: true });

  return cleanPart;
}

export async function deletePart(partNumber) {
  const clean = cleanPartNumber(partNumber);
  if (!clean) return;

  const current = loadLocalParts().filter((item) => item.partNumber !== clean);
  saveLocalParts(current);

  const recent = loadRecentParts().filter((item) => item.partNumber !== clean);
  localStorage.setItem(recentKey(), JSON.stringify(recent));

  try {
    const plantId = activePlantId();
    if (!plantId) return;
    await deleteDoc(doc(db, 'plants', plantId, 'partLibrary', safePartId(clean)));
  } catch (error) {
    console.warn('Part remote delete skipped:', error);
  }
}

export async function rememberPart({ partNumber, unit = 'Pcs', description = '' }) {
  const cleanPart = normalizePart({ partNumber, unit, description });
  if (!cleanPart.partNumber) return;

  saveRecentPartLocal(cleanPart);
  savePartLocal(cleanPart);

  try {
    const plantId = activePlantId();
    if (!plantId) return;

    await setDoc(doc(db, 'plants', plantId, 'partLibrary', safePartId(cleanPart.partNumber)), {
      plantId,
      ...cleanPart
    }, { merge: true });
  } catch (error) {
    console.warn('Part library remote save skipped:', error);
  }
}

export function findPartMatches(queryText, maxResults = 8) {
  const query = cleanPartNumber(queryText).toLowerCase();
  const recent = loadRecentParts();
  const library = loadLocalParts();
  const merged = mergeParts(recent, library);

  if (!query) return merged.slice(0, maxResults);

  return merged
    .filter((part) => {
      const partNumber = String(part.partNumber || '').toLowerCase();
      const description = String(part.description || '').toLowerCase();
      return partNumber.includes(query) || description.includes(query);
    })
    .slice(0, maxResults);
}

export function applyPartToRow(row, part) {
  if (!row || !part) return;

  const partInput = row.querySelector('input[name="partNumber"]');
  const unitSelect = row.querySelector('select[name="unit"]');

  if (partInput) partInput.value = part.partNumber || '';
  if (unitSelect && part.unit) unitSelect.value = cleanUnit(part.unit);
}

export async function importPartsCsv(file) {
  const text = await file.text();
  const rows = parseCsv(text);

  if (!rows.length) {
    return { imported: 0, updated: 0, skipped: 0 };
  }

  const header = rows.shift().map((item) => item.trim().toLowerCase());
  const partIndex = findHeaderIndex(header, ['part number', 'part', 'partnumber', 'item', 'sku']);
  const descIndex = findHeaderIndex(header, ['description', 'desc', 'name']);
  const unitIndex = findHeaderIndex(header, ['unit', 'uom', 'measure']);

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  const existing = new Set(loadLocalParts().map((item) => item.partNumber));

  for (const row of rows) {
    const partNumber = cleanPartNumber(row[partIndex >= 0 ? partIndex : 0]);

    if (!partNumber) {
      skipped += 1;
      continue;
    }

    const part = normalizePart({
      partNumber,
      description: descIndex >= 0 ? row[descIndex] : '',
      unit: unitIndex >= 0 ? row[unitIndex] : 'Pcs'
    });

    await savePart(part);

    if (existing.has(part.partNumber)) updated += 1;
    else {
      imported += 1;
      existing.add(part.partNumber);
    }
  }

  return { imported, updated, skipped };
}

export async function exportPartsCsv() {
  const parts = await loadPartLibrary();
  const rows = [
    ['Part Number', 'Description', 'Unit'],
    ...parts.map((part) => [
      part.partNumber || '',
      part.description || '',
      part.unit || 'Pcs'
    ])
  ];

  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function downloadPartsCsv(filename = 'floorflow-parts-library.csv') {
  exportPartsCsv().then((csv) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  });
}

export function downloadPartsTemplate(filename = 'floorflow-parts-template.csv') {
  const rows = [
    ['Part Number', 'Description', 'Unit'],
    ['12345', 'Example Part', 'Pcs'],
    ['67890', 'Example Part', 'Skids']
  ];

  const csv = rows
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}


function saveRecentPartLocal(part) {
  const current = loadRecentParts().filter((item) => item.partNumber !== part.partNumber);
  current.unshift(part);
  localStorage.setItem(recentKey(), JSON.stringify(current.slice(0, 25)));
}

function savePartLocal(part) {
  const current = loadLocalParts().filter((item) => item.partNumber !== part.partNumber);
  current.unshift(part);
  saveLocalParts(current);
}

function loadLocalParts() {
  try {
    return JSON.parse(localStorage.getItem(cacheKey()) || '[]');
  } catch {
    return [];
  }
}

function saveLocalParts(parts) {
  localStorage.setItem(cacheKey(), JSON.stringify(parts.slice(0, 1000)));
}

function mergeParts(...lists) {
  const map = new Map();

  lists.flat().forEach((part) => {
    if (!part?.partNumber) return;

    const clean = cleanPartNumber(part.partNumber);
    if (!clean) return;

    const existing = map.get(clean) || {};
    map.set(clean, normalizePart({
      ...existing,
      ...part,
      partNumber: clean,
      unit: part.unit || existing.unit || 'Pcs'
    }));
  });

  return [...map.values()].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || '') || 0;
    const bTime = Date.parse(b.updatedAt || '') || 0;
    return bTime - aTime || a.partNumber.localeCompare(b.partNumber);
  });
}

function normalizePart(part = {}) {
  return {
    partNumber: cleanPartNumber(part.partNumber),
    description: String(part.description || '').trim(),
    unit: cleanUnit(part.unit || 'Pcs'),
    updatedAt: part.updatedAt || new Date().toISOString(),
    updatedBy: part.updatedBy || currentUserName()
  };
}

function activePlantId() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get('plant') ||
    params.get('plantId') ||
    localStorage.getItem('floor_flow_active_plant_id') ||
    localStorage.getItem('floorFlowActivePlantId') ||
    localStorage.getItem('activePlantId') ||
    ''
  );
}

function currentUserName() {
  for (const key of ['floor_flow_session_user', 'floorflow_supervisor_session', 'floor_flow_supervisor_session', 'floorFlowUser', 'currentUser']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      return parsed.name || parsed.userName || parsed.displayName || parsed.employeeName || 'System';
    } catch {}
  }

  return 'System';
}

function cleanPartNumber(value = '') {
  return String(value || '').trim().toUpperCase();
}

function cleanUnit(value = 'Pcs') {
  const unit = String(value || 'Pcs').trim();
  return UNIT_OPTIONS.includes(unit) ? unit : 'Pcs';
}

function safePartId(partNumber) {
  return cleanPartNumber(partNumber).replace(/[^A-Z0-9_-]/g, '_');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quote = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quote && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quote = !quote;
      continue;
    }

    if (char === ',' && !quote) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quote) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => String(value).trim())) rows.push(row);

  return rows;
}

function findHeaderIndex(header, options) {
  return header.findIndex((item) => options.includes(String(item || '').trim().toLowerCase()));
}

function csvEscape(value = '') {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
