import { saveServerUser } from './server-access.js';
import { db } from './firebase-config.js';
import { usersCollection, userDoc } from './firestore-paths.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { requirePlantId } from './plant-session.js';
import { assertAdminSession, assertPlantMatch, sanitizeText, sanitizeRole, sanitizeUserStatus } from './security-guard.js';

export async function fetchUsersFromFirestore() {
  const plantId = requirePlantId();

  const snapshot = await getDocs(
    query(usersCollection(), where('plantId', '==', plantId))
  );

  const users = [];

  snapshot.forEach((item) => {
    const data = item.data();

    users.push({
      id: item.id,
      ...data,
      status: data.status || (data.isActive === false ? 'inactive' : 'active')
    });
  });

  return users.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export async function fetchActiveUsersFromFirestore() {
  const users = await fetchUsersFromFirestore();
  return users.filter((user) => user.status === 'active');
}

export async function updateUserInFirestore(userId, updates) {
  const access = assertAdminSession();
  const ref = userDoc(userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error('User not found.');
  assertPlantMatch(snap.data(), access.plantId, 'This user does not belong to the active plant.');

  const result = await saveServerUser(updates, userId);
  if (result.reauthenticate) { location.reload(); }
}
