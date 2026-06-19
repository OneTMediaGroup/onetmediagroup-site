import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getActivePlantId, requirePlantId } from './plant-session.js';

let cachedPlantId = '';
let cachedPlant = null;

export const DEMO_RESTRICTION_MESSAGE =
  'Demo Plants are for evaluation and training only. Create a Pro Plant to build a full production system.';

export async function getActivePlantInfo() {
  const plantId = getActivePlantId() || requirePlantId();
  if (!plantId) return { plantId: '', plant: null, isDemo: false };

  if (cachedPlantId === plantId && cachedPlant) {
    return { plantId, plant: cachedPlant, isDemo: isDemoPlant(cachedPlant) };
  }

  const snap = await getDoc(doc(db, 'plants', plantId));
  cachedPlantId = plantId;
  cachedPlant = snap.exists() ? snap.data() || {} : null;

  return { plantId, plant: cachedPlant, isDemo: isDemoPlant(cachedPlant || {}) };
}

export function isDemoPlant(plant = {}) {
  return plant.isDemo === true ||
    plant.mode === 'demo' ||
    plant.environment === 'demo';
}

export async function isActiveDemoPlant() {
  const info = await getActivePlantInfo();
  return info.isDemo === true;
}

export async function blockDemoProductionAction(actionLabel = 'This action') {
  const info = await getActivePlantInfo();
  if (!info.isDemo) return false;

  alert(`${actionLabel} is disabled in Demo Plants.\n\n${DEMO_RESTRICTION_MESSAGE}`);
  return true;
}

export function demoNoticeHtml() {
  return `
    <div class="demo-restriction-notice" style="
      margin: 0 0 16px;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1e3a8a;
      box-shadow: 0 8px 22px rgba(37,99,235,.08);
    ">
      <strong>Demo Plant</strong>
      <span style="display:block; margin-top:4px; color:#334155;">
        Evaluation mode is active. You can explore Floor Flow, but building a full production plant,
        importing large lists, or creating new plant structure requires a Pro Plant.
      </span>
      <a href="onboarding.html?mode=production" style="
        display:inline-flex;
        margin-top:10px;
        min-height:36px;
        align-items:center;
        padding:0 12px;
        border-radius:10px;
        background:#2563eb;
        color:#fff;
        text-decoration:none;
        font-weight:900;
      ">Create Pro Plant</a>
    </div>
  `;
}
