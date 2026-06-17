export const demoUsers = [
  { id: 'u1', name: 'Mike Supervisor', role: 'supervisor' },
  { id: 'u2', name: 'Olivia Operator', role: 'operator' },
  { id: 'u3', name: 'Chris Operator', role: 'operator' },
  { id: 'u4', name: 'Ryan Operator', role: 'operator' },
  { id: 'u5', name: 'Sarah Quality', role: 'operator' },
  { id: 'u6', name: 'Alex Maintenance', role: 'maintenance' },
  { id: 'u7', name: 'Scot Admin', role: 'admin' }
];

export const demoStatuses = [
  { id: 'current', label: 'Running', color: 'blue' },
  { id: 'next', label: 'Next', color: 'grey' },
  { id: 'ready', label: 'Ready for Next Job', color: 'green' },
  { id: 'blocked', label: 'Blocked', color: 'red' }
];

export const demoPresses = [
  { id: 'p1', pressNumber: 1, equipmentName: 'Press 1', area: 'Stamping', shift: '1', slots: [
    { partNumber: 'ST-1042', qtyRemaining: 420, status: 'current', notes: 'Material staged. First-off approved.', updatedAt: nowMinus(16), lastUpdatedBy: 'Mike Supervisor' },
    { partNumber: 'ST-2218', qtyRemaining: 650, status: 'ready', notes: 'Tooling verified. Ready for Next Job.', updatedAt: nowMinus(7), lastUpdatedBy: 'Olivia Operator' },
    { partNumber: 'ST-3304', qtyRemaining: 300, status: 'next', notes: 'Awaiting forklift delivery.', updatedAt: nowMinus(38), lastUpdatedBy: 'Chris Operator' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' }
  ]},
  { id: 'p22', pressNumber: 22, equipmentName: 'Press 22', area: 'Stamping', shift: '1', slots: [
    { partNumber: 'BR-7712', qtyRemaining: 180, status: 'current', notes: 'Running production schedule.', updatedAt: nowMinus(12), lastUpdatedBy: 'Ryan Operator' },
    { partNumber: 'BR-8840', qtyRemaining: 240, status: 'next', notes: 'Coils staged at south aisle.', updatedAt: nowMinus(25), lastUpdatedBy: 'Mike Supervisor' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' }
  ]},
  { id: 'cnc3', pressNumber: 3, equipmentName: 'CNC Cell 3', area: 'CNC', shift: '2', slots: [
    { partNumber: 'CNC-5510', qtyRemaining: 95, status: 'current', notes: 'Program loaded. Tool life checked.', updatedAt: nowMinus(21), lastUpdatedBy: 'Chris Operator' },
    { partNumber: 'CNC-5525', qtyRemaining: 120, status: 'ready', notes: 'Material cart staged.', updatedAt: nowMinus(5), lastUpdatedBy: 'Olivia Operator' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' }
  ]},
  { id: 'mill7', pressNumber: 7, equipmentName: 'CNC Mill 7', area: 'CNC', shift: '2', slots: [
    { partNumber: 'ML-7204', qtyRemaining: 60, status: 'current', notes: 'Inspection required after first ten pieces.', updatedAt: nowMinus(18), lastUpdatedBy: 'Sarah Quality' },
    { partNumber: 'ML-7310', qtyRemaining: 80, status: 'blocked', notes: 'Waiting on revised drawing approval.', updatedAt: nowMinus(11), lastUpdatedBy: 'Sarah Quality' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' }
  ]},
  { id: 'robotA', pressNumber: 11, equipmentName: 'Robot Cell A', area: 'Automation', shift: '3', slots: [
    { partNumber: 'RB-9001', qtyRemaining: 300, status: 'current', notes: 'Vision check passed.', updatedAt: nowMinus(29), lastUpdatedBy: 'Alex Maintenance' },
    { partNumber: 'RB-9020', qtyRemaining: 280, status: 'next', notes: 'Gripper change scheduled.', updatedAt: nowMinus(34), lastUpdatedBy: 'Mike Supervisor' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' }
  ]},
  { id: 'assembly1', pressNumber: 21, equipmentName: 'Assembly Line 1', area: 'Assembly', shift: '1', slots: [
    { partNumber: 'ASM-6100', qtyRemaining: 500, status: 'current', notes: 'Operator confirmed ready.', updatedAt: nowMinus(15), lastUpdatedBy: 'Olivia Operator' },
    { partNumber: 'ASM-6125', qtyRemaining: 450, status: 'ready', notes: 'Kits staged at line.', updatedAt: nowMinus(3), lastUpdatedBy: 'Mike Supervisor' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' },
    { partNumber: '', qtyRemaining: 0, status: 'next', notes: '', updatedAt: '', lastUpdatedBy: '' }
  ]}
];

export const demoAuditLog = [
  log('Mike Supervisor', 'Reviewed mixed production queue'),
  log('Olivia Operator', 'Marked Press 1 ready for next job'),
  log('Chris Operator', 'Confirmed CNC Cell 3 material staged'),
  log('Sarah Quality', 'Placed CNC Mill 7 on hold for drawing approval'),
  log('Alex Maintenance', 'Reviewed Robot Cell A gripper change')
];

function nowMinus(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

function log(user, message) {
  return {
    id: crypto.randomUUID(),
    user,
    message,
    createdAt: new Date().toISOString()
  };
}
