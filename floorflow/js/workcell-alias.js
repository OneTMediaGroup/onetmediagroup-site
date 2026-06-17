export function workCellLabel(workCell) {
  return workCell.equipmentName || workCell.workCellName || `Work Cell ${workCell.pressNumber || ''}`.trim();
}

export function normalizeWorkCell(raw = {}) {
  return {
    ...raw,
    workCellName: raw.workCellName || raw.equipmentName || '',
    equipmentName: raw.equipmentName || raw.workCellName || '',
    type: raw.type || raw.equipmentType || 'workCell'
  };
}

export function normalizeWorkCells(items = []) {
  return items.map(normalizeWorkCell);
}
