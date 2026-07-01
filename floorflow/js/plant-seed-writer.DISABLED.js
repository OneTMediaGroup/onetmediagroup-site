import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import {
  plantDocRef,
  settingsDocRef,
  usersCollection,
  areasCollection,
  workCellsCollection,
  activityLogsCollection
} from './firestore-paths.js';

function cleanId(value, fallback = '') {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function withPlantFields(item, plantId) {
  return {
    ...item,
    plantId,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export async function createNestedPlantData({
  plantId,
  plantName,
  mode = 'demo',
  timezone = 'America/Toronto',
  branding = {},
  users = [],
  areas = [],
  workCells = [],
  activityLogs = []
} = {}) {
  if (!plantId) throw new Error('Missing plantId for plant seed writer.');

  const now = new Date().toISOString();

  await setDoc(plantDocRef(plantId), {
    id: plantId,
    plantId,
    name: plantName || 'Floor Flow Plant',
    mode,
    environment: mode,
    isDemo: mode === 'demo',
    timezone,
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  await setDoc(settingsDocRef(plantId), {
    plantId,
    plantName: plantName || 'Floor Flow Plant',
    timezone,
    branding,
    mode,
    environment: mode,
    isDemo: mode === 'demo',
    updatedAt: now
  }, { merge: true });

  for (const area of areas) {
    const areaId = area.id || cleanId(area.name, `area-${Date.now()}`);
    await setDoc(doc(areasCollection(plantId), areaId), withPlantFields({
      ...area,
      id: areaId,
      name: area.name || area.areaName || 'Area'
    }, plantId), { merge: true });
  }

  for (const user of users) {
    const userId = user.id || cleanId(user.employeeId || user.pin || user.name, `user-${Date.now()}`);
    await setDoc(doc(usersCollection(plantId), userId), withPlantFields({
      ...user,
      id: userId,
      role: user.role || 'operator',
      status: user.status || 'active'
    }, plantId), { merge: true });
  }

  for (const workCell of workCells) {
    const workCellId = workCell.id || cleanId(workCell.equipmentName || workCell.workCellName, `workcell-${Date.now()}`);
    await setDoc(doc(workCellsCollection(plantId), workCellId), withPlantFields({
      ...workCell,
      id: workCellId,
      workCellName: workCell.workCellName || workCell.equipmentName || 'Work Cell',
      equipmentName: workCell.equipmentName || workCell.workCellName || 'Work Cell',
      type: workCell.type || workCell.equipmentType || 'workCell',
      slots: Array.isArray(workCell.slots) ? workCell.slots : []
    }, plantId), { merge: true });
  }

  const bootLog = {
    plantId,
    severity: 'info',
    action: 'plant_created',
    message: `${plantName || 'Plant'} created in ${mode} mode`,
    createdAt: now,
    updatedAt: now
  };

  await addDoc(activityLogsCollection(plantId), bootLog);

  for (const log of activityLogs) {
    await addDoc(activityLogsCollection(plantId), withPlantFields(log, plantId));
  }

  return { plantId };
}
