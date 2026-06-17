import { db } from './firebase-config.js';
import {workCellDoc, workCellsCollection} from './firestore-paths.js';
import {
  doc,
  getDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { fetchPressesFromFirestore } from './firestore-presses.js';
import { assertSupervisorSession, assertPlantMatch, sanitizeText } from './security-guard.js';

export { fetchPressesFromFirestore };

export async function archiveAndResetPressInFirestore({ pressId, userName }) {
  const access = assertSupervisorSession();
  userName = sanitizeText(userName || access.userName || 'Supervisor', 80);
  const ref = workCellDoc(pressId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Equipment not found.');
  }

  assertPlantMatch(snap.data(), access.plantId, 'This equipment does not belong to the active plant.');

  const now = new Date().toISOString();

  const emptySlots = [1, 2, 3, 4].map(() => ({
    partNumber: '',
    qtyRemaining: 0,
    status: 'next',
    notes: '',
    updatedAt: now,
    lastUpdatedBy: userName || 'Admin'
  }));

  await updateDoc(ref, {
    slots: emptySlots,
    updatedAt: now,
    lastUpdatedBy: userName || 'Admin'
  });
}

export async function updatePressInFirestore(pressId, updates) {
  const access = assertSupervisorSession();
  const ref = workCellDoc(pressId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Equipment not found.');
  assertPlantMatch(snap.data(), access.plantId, 'This equipment does not belong to the active plant.');

  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}