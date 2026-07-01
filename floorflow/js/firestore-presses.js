import { db } from './firebase-config.js';
import {requireActivePlantId, workCellDoc, workCellsCollection} from './firestore-paths.js';
import { normalizeWorkCell, normalizeWorkCells } from './workcell-alias.js';
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { requirePlantId } from './plant-session.js';

export async function fetchPressesFromFirestore() {
  const plantId = requirePlantId();

  const snapshot = await getDocs(
    query(workCellsCollection(), where('plantId', '==', plantId))
  );

  const presses = [];

  snapshot.forEach((doc) => {
    presses.push({
      id: doc.id,
      ...doc.data()
    });
  });

  presses.sort((a, b) => Number(a.pressNumber || 0) - Number(b.pressNumber || 0));

  return normalizeWorkCells(presses);
}

export function watchPressesFromFirestore(callback) {
  const plantId = requirePlantId();

  const pressesQuery = query(
    workCellsCollection(),
    where('plantId', '==', plantId)
  );

  return onSnapshot(pressesQuery, (snapshot) => {
    const presses = [];

    snapshot.forEach((doc) => {
      presses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    presses.sort((a, b) => Number(a.pressNumber || 0) - Number(b.pressNumber || 0));

    callback(normalizeWorkCells(presses));
  });
}