import {
  doc,
  setDoc,
  addDoc,
  collection
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db } from './firebase-config.js';
import { setActivePlantId, buildPlantLink } from './plant-session.js';

const SEED_FLAG = 'floor_flow_one_time_seed_done_v1';
const PLANT_ID = 'floorflow-demo-plant';
const PLANT_NAME = 'Floor Flow Demo Plant';

const now = new Date().toISOString();

const areas = [
  { id: 'area-stamping', name: 'Stamping', color: '#2563eb' },
  { id: 'area-cnc', name: 'CNC', color: '#7c3aed' },
  { id: 'area-automation', name: 'Automation', color: '#0891b2' },
  { id: 'area-assembly', name: 'Assembly', color: '#16a34a' },
  { id: 'area-packaging', name: 'Packaging', color: '#ca8a04' },
  { id: 'area-quality', name: 'Quality Lab', color: '#db2777' }
];

const users = [
  {
    id: 'admin-1000',
    name: 'Scot Admin',
    role: 'admin',
    status: 'active',
    employeeId: '1000',
    pin: '1000',
    badgeCode: 'ADMIN-1000'
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

const workCells = [
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
    slots: [
      { partNumber: 'ST-1042', qtyRemaining: 420, status: 'current', notes: 'Material staged. First-off approved.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' },
      { partNumber: 'ST-2218', qtyRemaining: 650, status: 'ready', notes: 'Ready for Next Job.', updatedAt: now, lastUpdatedBy: 'Olivia Operator' },
      { partNumber: 'ST-3304', qtyRemaining: 300, status: 'next', notes: 'Awaiting forklift delivery.', updatedAt: now, lastUpdatedBy: 'Chris Operator' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' }
    ]
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
    slots: [
      { partNumber: 'BR-7712', qtyRemaining: 180, status: 'current', notes: 'Running production schedule.', updatedAt: now, lastUpdatedBy: 'Ryan Operator' },
      { partNumber: 'BR-8840', qtyRemaining: 240, status: 'next', notes: 'Coils staged at south aisle.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' }
    ]
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
    slots: [
      { partNumber: 'CNC-5510', qtyRemaining: 95, status: 'current', notes: 'Program loaded. Tool life checked.', updatedAt: now, lastUpdatedBy: 'Chris Operator' },
      { partNumber: 'CNC-5525', qtyRemaining: 120, status: 'ready', notes: 'Material cart staged.', updatedAt: now, lastUpdatedBy: 'Olivia Operator' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' }
    ]
  },
  {
    id: 'cnc-mill-7',
    pressNumber: 7,
    workCellName: 'CNC Mill 7',
    equipmentName: 'CNC Mill 7',
    type: 'cnc',
    areaId: 'area-cnc',
    areaName: 'CNC',
    areaColor: '#7c3aed',
    isLocked: false,
    slots: [
      { partNumber: 'ML-7204', qtyRemaining: 60, status: 'current', notes: 'Inspection required after first ten pieces.', updatedAt: now, lastUpdatedBy: 'Sarah Quality' },
      { partNumber: 'ML-7310', qtyRemaining: 80, status: 'blocked', notes: 'Waiting on revised drawing approval.', updatedAt: now, lastUpdatedBy: 'Sarah Quality' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' }
    ]
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
    slots: [
      { partNumber: 'RB-9001', qtyRemaining: 300, status: 'current', notes: 'Vision check passed.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' },
      { partNumber: 'RB-9020', qtyRemaining: 280, status: 'next', notes: 'Gripper change scheduled.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' }
    ]
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
    slots: [
      { partNumber: 'ASM-6100', qtyRemaining: 500, status: 'current', notes: 'Operator confirmed ready.', updatedAt: now, lastUpdatedBy: 'Olivia Operator' },
      { partNumber: 'ASM-6125', qtyRemaining: 450, status: 'ready', notes: 'Kits staged at line.', updatedAt: now, lastUpdatedBy: 'Mike Supervisor' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' }
    ]
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
    slots: [
      { partNumber: 'PK-2024', qtyRemaining: 800, status: 'current', notes: 'Labels verified.', updatedAt: now, lastUpdatedBy: 'Ryan Operator' },
      { partNumber: 'PK-2030', qtyRemaining: 760, status: 'next', notes: 'Cartons staged.', updatedAt: now, lastUpdatedBy: 'Chris Operator' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' }
    ]
  },
  {
    id: 'inspection-station-4',
    pressNumber: 41,
    workCellName: 'Inspection Station 4',
    equipmentName: 'Inspection Station 4',
    type: 'quality',
    areaId: 'area-quality',
    areaName: 'Quality Lab',
    areaColor: '#db2777',
    isLocked: false,
    slots: [
      { partNumber: 'QA-1180', qtyRemaining: 40, status: 'current', notes: 'First-off inspection in progress.', updatedAt: now, lastUpdatedBy: 'Sarah Quality' },
      { partNumber: 'QA-1195', qtyRemaining: 55, status: 'blocked', notes: 'Gauge calibration check pending.', updatedAt: now, lastUpdatedBy: 'Sarah Quality' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' },
      { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: now, lastUpdatedBy: '' }
    ]
  }
];

function withPlant(data) {
  return {
    ...data,
    plantId: PLANT_ID,
    createdAt: data.createdAt || now,
    updatedAt: now
  };
}

async function seedFloorFlow() {
  if (localStorage.getItem(SEED_FLAG) === 'true') {
    showSeedPanel('Already seeded. Use the links below.', false);
    return;
  }

  showSeedPanel('Seeding Floor Flow demo plant...', true);

  await setDoc(doc(db, 'plants', PLANT_ID), {
    id: PLANT_ID,
    plantId: PLANT_ID,
    name: PLANT_NAME,
    mode: 'demo',
    environment: 'demo',
    isDemo: true,
    timezone: 'America/Toronto',
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  await setDoc(doc(db, 'plants', PLANT_ID, 'settings', 'main'), {
    plantId: PLANT_ID,
    plantName: PLANT_NAME,
    companyName: 'One T Manufacturing',
    timezone: 'America/Toronto',
    mode: 'demo',
    environment: 'demo',
    isDemo: true,
    branding: {
      companyName: 'One T Manufacturing',
      plantName: PLANT_NAME,
      accentColor: '#2563eb'
    },
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  for (const area of areas) {
    await setDoc(doc(db, 'plants', PLANT_ID, 'areas', area.id), withPlant(area), { merge: true });
  }

  for (const user of users) {
    await setDoc(doc(db, 'plants', PLANT_ID, 'users', user.id), withPlant(user), { merge: true });
  }

  for (const workCell of workCells) {
    await setDoc(doc(db, 'plants', PLANT_ID, 'workCells', workCell.id), withPlant(workCell), { merge: true });
  }

  await addDoc(collection(db, 'plants', PLANT_ID, 'activityLogs'), {
    plantId: PLANT_ID,
    severity: 'info',
    action: 'seed_demo_plant',
    message: 'One-time Floor Flow demo plant seeded.',
    createdAt: now,
    updatedAt: now
  });

  setActivePlantId(PLANT_ID);
  localStorage.setItem(SEED_FLAG, 'true');
  localStorage.setItem('floor_flow_setup_complete', 'true');

  showSeedPanel('Seed complete. Use the links below.', false);
}

function pageLink(label, page) {
  const url = buildPlantLink(page, PLANT_ID);
  return `
    <div class="seed-link-row">
      <strong>${label}</strong>
      <code>${url}</code>
      <a class="button primary" href="${page}?plant=${PLANT_ID}">Open</a>
    </div>
  `;
}

function showSeedPanel(message, loading) {
  let panel = document.getElementById('oneTimeSeedPanel');

  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'oneTimeSeedPanel';
    panel.className = 'one-time-seed-panel';
    document.body.prepend(panel);
  }

  panel.innerHTML = `
    <div class="seed-card">
      <div class="seed-header">
        <div>
          <h2>Floor Flow One-Time Seed</h2>
          <p>${message}</p>
        </div>
        <span class="seed-pill">${loading ? 'Working' : 'Ready'}</span>
      </div>

      <div class="seed-meta">
        <span>Plant ID</span>
        <strong>${PLANT_ID}</strong>
      </div>

      <div class="seed-links">
        ${pageLink('Admin Console', 'admin.html')}
        ${pageLink('Floor Console', 'board.html')}
        ${pageLink('Supervisor View', 'supervisor.html')}
        ${pageLink('Display Board', 'display.html')}
      </div>

      <p class="seed-warning">
        After confirming Firestore is seeded, remove <code>js/one-time-seed.js</code>
        from <code>index.html</code>.
      </p>
    </div>
  `;
}

seedFloorFlow().catch((error) => {
  console.error('One-time seed failed:', error);
  showSeedPanel(`Seed failed: ${error.message}`, false);
});
