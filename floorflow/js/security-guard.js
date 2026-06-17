import { getSession } from './store.js';
import { requirePlantId } from './plant-session.js';

export const ROLES = Object.freeze(['operator', 'dieSetter', 'supervisor', 'admin']);
export const SETUP_WRITE_ROLES = Object.freeze(['operator', 'dieSetter', 'supervisor', 'admin']);
export const SUPERVISOR_WRITE_ROLES = Object.freeze(['supervisor', 'admin']);
export const ADMIN_WRITE_ROLES = Object.freeze(['admin']);

export function makeAccessError(message = 'Access denied.') {
  const error = new Error(message);
  error.code = 'permission-denied';
  return error;
}

export function getActiveSession() {
  return getSession();
}

export function sessionDisplayName(session, fallback = '') {
  return sanitizeText(session?.name || session?.displayName || session?.employeeName || fallback || 'Unknown User', 80);
}

export function assertRoleSession(allowedRoles = [], message = 'You do not have permission for this action.') {
  const session = getActiveSession();

  if (!session) {
    throw makeAccessError('Login required before this action.');
  }

  if (session.status === 'inactive' || session.isActive === false) {
    throw makeAccessError('This user is inactive.');
  }

  if (!allowedRoles.includes(session.role)) {
    throw makeAccessError(message);
  }

  return {
    session,
    role: session.role,
    userName: sessionDisplayName(session),
    plantId: requirePlantId()
  };
}

export function assertSetupWriteSession() {
  return assertRoleSession(SETUP_WRITE_ROLES, 'Your role cannot update setup records.');
}

export function assertSupervisorSession() {
  return assertRoleSession(SUPERVISOR_WRITE_ROLES, 'Supervisor access required.');
}

export function assertAdminSession() {
  return assertRoleSession(ADMIN_WRITE_ROLES, 'Admin access required.');
}

export function assertPlantMatch(record = {}, activePlantId = requirePlantId(), message = 'This record does not belong to the active plant.') {
  if (!activePlantId) throw makeAccessError('No active plant selected.');
  if (record?.plantId && record.plantId !== activePlantId) throw makeAccessError(message);
  return true;
}

export function sanitizeText(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultiline(value, maxLength = 1000) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeNumber(value, fallback = 0, min = 0, max = 999999999) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function sanitizeRole(value) {
  return ROLES.includes(value) ? value : 'operator';
}

export function sanitizeUserStatus(value) {
  return value === 'inactive' ? 'inactive' : 'active';
}

export function sanitizeColor(value, fallback = '#3b82f6') {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

export function sanitizeSetupPayload(setup = {}) {
  return {
    ...setup,
    partNumber: sanitizeText(setup.partNumber || '', 80),
    qtyRemaining: sanitizeNumber(setup.qtyRemaining, 0, 0, 999999999),
    status: sanitizeText(setup.status || '', 40),
    notes: sanitizeMultiline(setup.notes || '', 1000),
    expectedUpdatedAt: sanitizeText(setup.expectedUpdatedAt || '', 80),
    previousSetup: setup.previousSetup || null
  };
}
