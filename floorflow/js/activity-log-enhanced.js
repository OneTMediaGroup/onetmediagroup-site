
// Audit + Activity Reliability Pass 1

export function createActivityLog({
  severity = 'info',
  action = '',
  equipment = '',
  slot = '',
  user = '',
  oldValue = '',
  newValue = '',
  details = ''
} = {}) {

  const entry = {
    severity,
    action,
    equipment,
    slot,
    user,
    oldValue,
    newValue,
    details,
    createdAt: new Date().toISOString()
  };

  const existing = loadActivityLogs();
  existing.unshift(entry);

  localStorage.setItem(
    'floorflow_activity_logs',
    JSON.stringify(existing.slice(0, 500))
  );

  return entry;
}

export function loadActivityLogs() {
  try {
    return JSON.parse(localStorage.getItem('floorflow_activity_logs') || '[]');
  } catch {
    return [];
  }
}

export function readableLogMessage(entry = {}) {
  const equipment = entry.equipment || 'Equipment';
  const slot = entry.slot ? ` · ${entry.slot}` : '';
  const user = entry.user ? ` by ${entry.user}` : '';

  return `${equipment}${slot} ${entry.action}${user}`;
}
