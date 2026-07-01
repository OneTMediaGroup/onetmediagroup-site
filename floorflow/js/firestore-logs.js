import { db } from './firebase-config.js';
import { activityLogsCollection } from './firestore-paths.js';
import {
  collection,
  addDoc,
  query,
  where,
  limit,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { requirePlantId } from './plant-session.js';

export async function addLogToFirestore({ user, message }) {
  const plantId = requirePlantId();

  await addDoc(activityLogsCollection(), {
    plantId,
    user,
    message,
    createdAt: new Date().toISOString()
  });
}

export function watchLogsFromFirestore(callback) {
  const plantId = requirePlantId();

  const logsQuery = query(
    activityLogsCollection(),
    where('plantId', '==', plantId),
    limit(50)
  );

  return onSnapshot(logsQuery, (snapshot) => {
    const logs = [];

    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    logs.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    callback(logs.slice(0, 25));
  });
}