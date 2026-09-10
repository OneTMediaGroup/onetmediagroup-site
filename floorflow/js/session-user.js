import { getActivePlantId } from './plant-session.js';
const SESSION_USER_KEY = 'die_set_up_session_user';

export function getStoredSessionUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_USER_KEY) || 'null');
    return user?.plantId === getActivePlantId() ? user : null;
  } catch {
    return null;
  }
}

export function setStoredSessionUser(user) {
  if (!user) {
    clearStoredSessionUser();
    return;
  }

  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify({ ...user, pin: undefined, plantId: getActivePlantId() }));
}

export function clearStoredSessionUser() {
  sessionStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
}