import { addDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { requirePlantId } from './plant-session.js';
import { activityLogsCollection } from './firestore-paths.js';
import { assertAdminSession, sanitizeText } from './security-guard.js';

export function equipmentLabel(press) {
  return press?.equipmentName || `Press ${press?.pressNumber || ''}`.trim();
}

export function emptySlots() {
  return [1, 2, 3, 4].map(() => ({
    partNumber: '',
    qtyRemaining: 0,
    status: 'next',
    notes: '',
    updatedAt: new Date().toISOString(),
    lastUpdatedBy: ''
  }));
}

export async function addAdminLog(message) {
  const access = assertAdminSession();
  const plantId = requirePlantId();

  try {
    await addDoc(activityLogsCollection(), {
      plantId,
      user: access.userName || 'Admin',
      message: sanitizeText(message, 300),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Admin log failed:', error);
  }
}