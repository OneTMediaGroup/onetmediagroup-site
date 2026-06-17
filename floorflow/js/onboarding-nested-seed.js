import {
  doc,
  setDoc,
  addDoc,
  collection
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db } from './firebase-config.js';

function nowIso() {
  return new Date().toISOString();
}

function normalizeMode(mode) {
  return mode === 'production' ? 'production' : 'demo';
}

function withPlant(data, plantId) {
  const now = nowIso();

  return {
    ...data,
    plantId,
    createdAt: data.createdAt || now,
    updatedAt: now
  };
}

function emptySlot() {
  return {
    partNumber: '',
    qtyRemaining: 0,
    status: 'next',
    notes: '',
    updatedAt: nowIso(),
    lastUpdatedBy: ''
  };
}

function makeSlots(slots) {
  const normalized = [...slots];

  while (normalized.length < 4) {
    normalized.push(emptySlot());
  }

  return normalized.slice(0, 4);
}

export function buildDemoAreas() {
  return [
    { id: 'area-stamping', name: 'Stamping', color: '#2563eb' },
    { id: 'area-cnc', name: 'CNC', color: '#7c3aed' },
    { id: 'area-automation', name: 'Automation', color: '#0891b2' },
    { id: 'area-assembly', name: 'Assembly', color: '#16a34a' },
    { id: 'area-packaging', name: 'Packaging', color: '#ca8a04' },
    { id: 'area-quality', name: 'Quality Lab', color: '#db2777' }
  ];
}

export function buildProductionAreas(areaName = 'Main Floor') {
  return [
    { id: 'area-main-floor', name: areaName || 'Main Floor', color: '#2563eb' }
  ];
}

export function buildDemoUsers(adminName = 'Plant Admin', adminPin = '1000') {
  const cleanAdminPin = String(adminPin || '1000').trim() || '1000';

  return [
    {
      id: `admin-${cleanAdminPin}`,
      name: adminName || 'Plant Admin',
      role: 'admin',
      status: 'active',
      employeeId: cleanAdminPin,
      pin: cleanAdminPin,
      badgeCode: `ADMIN-${cleanAdminPin}`
    },
    {
      id: 'supervisor-2000',
      name: 'Mike Supervisor',
      role: 'supervisor',
      status: 'active',
      employeeId: '2000',
      pin: '2000',
      badgeCode: 'SUP-2000'
    },
    {
      id: 'operator-3001',
      name: 'Olivia Operator',
      role: 'operator',
      status: 'active',
      employeeId: '3001',
      pin: '3001',
      badgeCode: 'OP-3001'
    },
    {
      id: 'operator-3002',
      name: 'Chris Operator',
      role: 'operator',
      status: 'active',
      employeeId: '3002',
      pin: '3002',
      badgeCode: 'OP-3002'
    },
    {
      id: 'operator-3003',
      name: 'Ryan Operator',
      role: 'operator',
      status: 'active',
      employeeId: '3003',
      pin: '3003',
      badgeCode: 'OP-3003'
    },
    {
      id: 'operator-4001',
      name: 'Sarah Quality',
      role: 'operator',
      status: 'active',
      employeeId: '4001',
      pin: '4001',
      badgeCode: 'QA-4001'
    }
  ];
}

export function buildProductionUsers(adminName = 'Plant Admin', adminPin = '1000', badgeCode = '') {
  const cleanAdminPin = String(adminPin || '1000').trim() || '1000';

  return [
    {
      id: `admin-${cleanAdminPin}`,
      name: adminName || 'Plant Admin',
      role: 'admin',
      status: 'active',
      employeeId: cleanAdminPin,
      pin: cleanAdminPin,
      badgeCode: badgeCode || `ADMIN-${cleanAdminPin}`
    }
  ];
}

export function buildDemoWorkCells() {
  const now = nowIso();

  return [
    {
      id: 'press-1',
      pressNumber: 1,
      workCellName: 'Press 1',
      equipmentName: 'Press 1',
      type: 'press',
      areaId: 'area-stamping',
      areaName: 'Stamping',
      areaColor: '#2563eb',
      isLocked: false,
      slots: makeSlots([
        { partNumber: 'ST-1042', qtyRemaining: 420, status: 'current', notes: 'Material staged. First-off approved.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' },
        { partNumber: 'ST-2218', qtyRemaining: 650, status: 'ready', notes: 'Ready for Next Job.', updatedAt: now, lastUpdatedBy: 'Olivia Operator' },
        { partNumber: 'ST-3304', qtyRemaining: 300, status: 'next', notes: 'Awaiting forklift delivery.', updatedAt: now, lastUpdatedBy: 'Chris Operator' }
      ])
    },
    {
      id: 'press-22',
      pressNumber: 22,
      workCellName: 'Press 22',
      equipmentName: 'Press 22',
      type: 'press',
      areaId: 'area-stamping',
      areaName: 'Stamping',
      areaColor: '#2563eb',
      isLocked: false,
      slots: makeSlots([
        { partNumber: 'BR-7712', qtyRemaining: 180, status: 'current', notes: 'Running production schedule.', updatedAt: now, lastUpdatedBy: 'Ryan Operator' },
        { partNumber: 'BR-8840', qtyRemaining: 240, status: 'next', notes: 'Coils staged at south aisle.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' }
      ])
    },
    {
      id: 'cnc-cell-3',
      pressNumber: 3,
      workCellName: 'CNC Cell 3',
      equipmentName: 'CNC Cell 3',
      type: 'cnc',
      areaId: 'area-cnc',
      areaName: 'CNC',
      areaColor: '#7c3aed',
      isLocked: false,
      slots: makeSlots([
        { partNumber: 'CNC-5510', qtyRemaining: 95, status: 'current', notes: 'Program loaded. Tool life checked.', updatedAt: now, lastUpdatedBy: 'Chris Operator' },
        { partNumber: 'CNC-5525', qtyRemaining: 120, status: 'ready', notes: 'Material cart staged.', updatedAt: now, lastUpdatedBy: 'Olivia Operator' }
      ])
    },
    {
      id: 'robot-cell-a',
      pressNumber: 11,
      workCellName: 'Robot Cell A',
      equipmentName: 'Robot Cell A',
      type: 'automation',
      areaId: 'area-automation',
      areaName: 'Automation',
      areaColor: '#0891b2',
      isLocked: false,
      slots: makeSlots([
        { partNumber: 'RB-9001', qtyRemaining: 300, status: 'current', notes: 'Vision check passed.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' },
        { partNumber: 'RB-9020', qtyRemaining: 280, status: 'next', notes: 'Gripper change scheduled.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' }
      ])
    },
    {
      id: 'assembly-line-1',
      pressNumber: 21,
      workCellName: 'Assembly Line 1',
      equipmentName: 'Assembly Line 1',
      type: 'assembly',
      areaId: 'area-assembly',
      areaName: 'Assembly',
      areaColor: '#16a34a',
      isLocked: false,
      slots: makeSlots([
        { partNumber: 'ASM-6100', qtyRemaining: 500, status: 'current', notes: 'Operator confirmed ready.', updatedAt: now, lastUpdatedBy: 'Olivia Operator' },
        { partNumber: 'ASM-6125', qtyRemaining: 450, status: 'ready', notes: 'Kits staged at line.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' }
      ])
    },
    {
      id: 'packaging-line-a',
      pressNumber: 31,
      workCellName: 'Packaging Line A',
      equipmentName: 'Packaging Line A',
      type: 'packaging',
      areaId: 'area-packaging',
      areaName: 'Packaging',
      areaColor: '#ca8a04',
      isLocked: false,
      slots: makeSlots([
        { partNumber: 'PK-2024', qtyRemaining: 800, status: 'current', notes: 'Labels verified.', updatedAt: now, lastUpdatedBy: 'Ryan Operator' },
        { partNumber: 'PK-2030', qtyRemaining: 760, status: 'next', notes: 'Cartons staged.', updatedAt: now, lastUpdatedBy: 'Chris Operator' }
      ])
    }
  ];
}

export function buildProductionWorkCells(equipmentName = 'First Work Cell', areaName = 'Main Floor') {
  const now = nowIso();

  return [
    {
      id: 'work-cell-1',
      pressNumber: 1,
      workCellName: equipmentName || 'First Work Cell',
      equipmentName: equipmentName || 'First Work Cell',
      type: 'workCell',
      areaId: 'area-main-floor',
      areaName: areaName || 'Main Floor',
      areaColor: '#2563eb',
      isLocked: false,
      slots: makeSlots([
        { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' }
      ])
    }
  ];
}

export async function seedOnboardingPlant({
  plantId,
  plantName = 'Floor Flow Plant',
  companyName = 'Floor Flow',
  adminName = 'Plant Admin',
  adminPin = '1000',
  adminBadgeCode = '',
  mode = 'demo',
  timezone = 'America/Toronto',
  areaName = 'Main Floor',
  equipmentName = 'First Work Cell',
  brandText = 'Floor Flow',
  logoUrl = '',
  brandingMode = 'text'
}) {
  if (!plantId) throw new Error('Missing plantId.');

  const normalizedMode = normalizeMode(mode);
  const isDemo = normalizedMode === 'demo';
  const now = nowIso();

  const areas = isDemo ? buildDemoAreas() : buildProductionAreas(areaName);
  const users = isDemo
    ? buildDemoUsers(adminName, adminPin)
    : buildProductionUsers(adminName, adminPin, adminBadgeCode);
  const workCells = isDemo ? buildDemoWorkCells() : buildProductionWorkCells(equipmentName, areaName);

  await setDoc(doc(db, 'plants', plantId), {
    id: plantId,
    plantId,
    plantName,
    name: plantName,
    companyName,
    mode: normalizedMode,
    environment: normalizedMode,
    isDemo,
    timezone,
    setupComplete: true,
    limits: {
      users: users.length,
      areas: areas.length,
      workCells: workCells.length,
      equipment: workCells.length
    },
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  await setDoc(doc(db, 'plants', plantId, 'settings', 'main'), {
    plantId,
    plantName,
    companyName,
    mode: normalizedMode,
    environment: normalizedMode,
    isDemo,
    timezone,

    // Branding is stored both top-level and nested for compatibility.
    // The live screens and System Controls read the top-level fields.
    brandingMode,
    brandText,
    logoUrl,
    branding: {
      mode: brandingMode,
      brandingMode,
      companyName,
      plantName,
      brandText,
      logoUrl,
      accentColor: '#2563eb'
    },
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  for (const area of areas) {
    await setDoc(doc(db, 'plants', plantId, 'areas', area.id), withPlant(area, plantId), { merge: true });
  }

  for (const user of users) {
    await setDoc(doc(db, 'plants', plantId, 'users', user.id), withPlant(user, plantId), { merge: true });
  }

  for (const workCell of workCells) {
    await setDoc(doc(db, 'plants', plantId, 'workCells', workCell.id), withPlant(workCell, plantId), { merge: true });
  }

  await addDoc(collection(db, 'plants', plantId, 'activityLogs'), {
    plantId,
    severity: 'info',
    action: 'plant_onboarded',
    message: `${plantName} onboarded in ${normalizedMode} mode.`,
    createdAt: now,
    updatedAt: now
  });

  return {
    plantId,
    users,
    areas,
    workCells
  };
}
