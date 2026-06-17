export function normalizeSlotStatus(status) {
  const value = String(status || 'next').toLowerCase();

  if (value === 'running') return 'current';
  if (['current', 'next', 'ready', 'blocked', 'complete'].includes(value)) return value;

  return 'next';
}

export function labelForSlotStatus(status) {
  const value = normalizeSlotStatus(status);

  const labels = {
    current: 'Running',
    next: 'Next',
    ready: 'Ready',
    blocked: 'Hold',
    complete: 'Complete'
  };

  return labels[value] || 'Next';
}
