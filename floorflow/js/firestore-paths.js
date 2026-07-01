import { collection, doc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase-config.js';
import { getActivePlantId } from './plant-session.js';

export function requireActivePlantId() {
  const plantId = getActivePlantId();

  if (!plantId) {
    throw new Error('No active plant selected.');
  }

  return plantId;
}

export function plantDocRef(plantId = requireActivePlantId()) {
  return doc(db, 'plants', plantId);
}

export function plantCollection(name, plantId = requireActivePlantId()) {
  return collection(db, 'plants', plantId, name);
}

export function plantDoc(collectionName, docId, plantId = requireActivePlantId()) {
  return doc(db, 'plants', plantId, collectionName, docId);
}

export function workCellsCollection(plantId = requireActivePlantId()) {
  return plantCollection('workCells', plantId);
}

export function workCellDoc(workCellId, plantId = requireActivePlantId()) {
  return plantDoc('workCells', workCellId, plantId);
}

export function usersCollection(plantId = requireActivePlantId()) {
  return plantCollection('users', plantId);
}

export function userDoc(userId, plantId = requireActivePlantId()) {
  return plantDoc('users', userId, plantId);
}

export function areasCollection(plantId = requireActivePlantId()) {
  return plantCollection('areas', plantId);
}

export function areaDoc(areaId, plantId = requireActivePlantId()) {
  return plantDoc('areas', areaId, plantId);
}

export function activityLogsCollection(plantId = requireActivePlantId()) {
  return plantCollection('activityLogs', plantId);
}

export function settingsDocRef(plantId = requireActivePlantId()) {
  return plantDoc('settings', 'main', plantId);
}

export function archivesCollection(plantId = requireActivePlantId()) {
  return plantCollection('archives', plantId);
}
