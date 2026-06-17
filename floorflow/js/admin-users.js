import { db } from './firebase-config.js';
import { usersCollection, userDoc, settingsDocRef } from './firestore-paths.js';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { fetchUsersFromFirestore, updateUserInFirestore } from './firestore-users.js';
import { getSession, setSession } from './store.js';
import { getStoredSessionUser, setStoredSessionUser } from './session-user.js';
import { addAdminLog } from './admin-helpers.js';
import { requirePlantId } from './plant-session.js';
import { assertAdminSession, sanitizeText, sanitizeRole, sanitizeUserStatus } from './security-guard.js';

let root = null;
let users = [];
let editingUserId = null;
let searchText = '';
let roleFilter = 'all';

const ROLES = [
  { value: 'operator', label: 'Operator' },
  { value: 'dieSetter', label: 'Authorized Staff' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Admin' }
];

const ROLE_ORDER = {
  operator: 0,
  dieSetter: 1,
  supervisor: 2,
  admin: 3
};

export async function mountUsersTool(container) {
  root = container;
  await loadAndRender();
  return () => {};
}

async function loadAndRender() {
  try {
    users = await fetchUsersFromFirestore();
    sortUsers();
    render();
  } catch (error) {
    console.error('❌ Failed to load users:', error);
    root.innerHTML = `<h2>Users</h2><div class="muted">Could not load users.</div>`;
  }
}

function sortUsers() {
  users = [...users].sort((a, b) => {
    const roleA = ROLE_ORDER[a.role] ?? 99;
    const roleB = ROLE_ORDER[b.role] ?? 99;
    if (roleA !== roleB) return roleA - roleB;
    return displayNameFor(a).localeCompare(displayNameFor(b), undefined, { numeric: true });
  });
}

function roleLabel(role) {
  return ROLES.find((item) => item.value === role)?.label || role || 'No Role';
}

function statusFor(user) {
  return user.status || (user.isActive === false ? 'inactive' : 'active');
}

function splitLegacyName(name = '') {
  const clean = String(name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { firstName: '', lastName: '' };

  const parts = clean.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.slice(-1).join(' ')
  };
}

function firstNameFor(user = {}) {
  return String(user.firstName || splitLegacyName(user.name).firstName || '').trim();
}

function lastNameFor(user = {}) {
  return String(user.lastName || splitLegacyName(user.name).lastName || '').trim();
}

function displayNameFor(user = {}) {
  const firstName = firstNameFor(user);
  const lastName = lastNameFor(user);
  const generated = [firstName, lastName].filter(Boolean).join(' ').trim();
  return generated || String(user.name || '').trim();
}

function buildFullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function filteredUsers() {
  return users.filter((user) => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const search = searchText.trim().toLowerCase();
    const matchesSearch = !search ||
      displayNameFor(user).toLowerCase().includes(search) ||
      String(user.firstName || '').toLowerCase().includes(search) ||
      String(user.lastName || '').toLowerCase().includes(search) ||
      String(user.role || '').toLowerCase().includes(search) ||
      String(user.pin || '').toLowerCase().includes(search) ||
      String(user.employeeId || '').toLowerCase().includes(search) ||
      String(user.badgeCode || '').toLowerCase().includes(search) ||
      String(user.id || '').toLowerCase().includes(search);

    return matchesRole && matchesSearch;
  });
}

function roleCount(role) {
  return users.filter((user) => user.role === role).length;
}

function render() {
  const visibleUsers = filteredUsers();

  root.innerHTML = `
    <div class="admin-content-header">
      <div>
        <h2>Users</h2>
        <p class="muted">Add users, set roles, manage IDs, badges, and access.</p>
      </div>
      <div class="topbar-right">
        <div class="header-stat"><span>Total</span><strong>${users.length}</strong></div>
        <div class="header-stat"><span>Active</span><strong>${users.filter((user) => statusFor(user) === 'active').length}</strong></div>
      </div>
    </div>

    <div class="admin-card user-add-panel">
      <div class="section-header">
        <div>
          <h2>Add User</h2>
          <div class="muted">Employee ID is required. Badge Code auto-fills from Employee ID and can be changed for scanner systems.</div>
        </div>
      </div>

      <div class="user-add-grid">
        <label>
          <span>First Name</span>
          <input id="newUserFirstName" placeholder="Example: Bob" autocomplete="given-name" />
        </label>

        <label>
          <span>Last Name</span>
          <input id="newUserLastName" placeholder="Example: Smith" autocomplete="family-name" />
        </label>

        <label>
          <span>Role</span>
          <select id="newUserRole">
            ${ROLES.map((role) => `<option value="${role.value}" ${role.value === 'operator' ? 'selected' : ''}>${role.label}</option>`).join('')}
          </select>
        </label>

        <label>
          <span>Employee ID *</span>
          <input id="newUserEmployeeId" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="10" placeholder="Required (e.g. 331)" />
        </label>

        <label>
          <span>Badge Code</span>
          <input id="newUserBadgeCode" placeholder="Auto-fills from Employee ID" />
        </label>

        <label>
          <span>Status</span>
          <select id="newUserStatus">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <button id="addUserBtn" class="button primary user-add-button">+ Add User</button>
      </div>
    </div>

    <div class="admin-card user-add-panel" style="margin-top:16px;">
      <div class="section-header">
        <div>
          <h2>Import Users</h2>
          <div class="muted">Upload CSV: firstName, lastName, role, employeeId, badgeCode, status.</div>
        </div>
      </div>

      <div class="user-add-grid">
        <label class="full-span">
          <span>CSV File</span>
          <input id="userImportFile" type="file" accept=".csv,text/csv" />
        </label>

        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:end;">
          <button id="downloadUserTemplateBtn" class="button user-add-button">Download Template</button>
          <button id="importUsersBtn" class="button primary user-add-button">Import CSV</button>
        </div>
      </div>

      <div class="muted" style="margin-top:12px;">
        Example: <code>firstName,lastName,role,employeeId,badgeCode,status</code><br />
        <code>Sally,Smith,operator,331,,active</code>
      </div>

      <div id="importUsersResult" class="muted" style="margin-top:12px;"></div>
    </div>

    <div class="admin-card user-management-panel" style="margin-top:16px;">
      <div class="section-header">
        <div>
          <h2>User List</h2>
          <div class="muted">Single-line rows. Click Edit only when you need to change details.</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <label style="display:flex; align-items:center; gap:6px; font-size:13px;">
            <input type="checkbox" id="selectAllUsers" />
            Select All
          </label>

          <button id="refreshUsersBtn" class="button">Refresh</button>
          <button id="exportUsersBtn" class="button">Export CSV</button>
          <button id="printSelectedBadgesBtn" class="button primary">Print Selected</button>
          <button id="printAllBadgesBtn" class="button">Print All</button>
        </div>
      </div>

      <div class="user-toolbar">
        <input id="userSearchInput" value="${escapeAttr(searchText)}" placeholder="Search users, roles, employee ID, or badge." />
        <select id="userRoleFilter">
          <option value="all" ${roleFilter === 'all' ? 'selected' : ''}>All roles (${users.length})</option>
          ${ROLES.map((role) => `<option value="${role.value}" ${roleFilter === role.value ? 'selected' : ''}>${role.label} (${roleCount(role.value)})</option>`).join('')}
        </select>
      </div>

      <div class="user-row-list">
        ${visibleUsers.length ? visibleUsers.map(renderUserRow).join('') : `<div class="muted user-empty-state">No users match this search.</div>`}
      </div>
    </div>
  `;

  wireEvents();
}

function renderUserRow(user) {
  const status = statusFor(user);
  const isEditing = editingUserId === user.id;
  const roleClass = `role-${String(user.role || 'none').toLowerCase()}`;

  if (!isEditing) {
    return `
      <div class="user-row compact-user-row">
        <div class="user-main-line" style="display:grid; grid-template-columns: 28px minmax(180px, 1fr) 130px 120px; align-items:center; gap:14px;">
          <input type="checkbox" class="user-select" data-user-id="${user.id}" />

          <strong title="ID: ${escapeHtml(user.employeeId || '—')} | Badge: ${escapeHtml(user.badgeCode || '—')}">
            ${escapeHtml(displayNameFor(user) || 'Unnamed User')}
          </strong>

          <span class="user-role-pill ${roleClass}">${roleLabel(user.role)}</span>

          <span class="status-pill ${status === 'active' ? 'running' : 'blocked'}">
            ${status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div class="user-row-actions">
          <button data-print-badge="${user.id}" class="button">Print Badge</button>
          <button data-edit-user="${user.id}" class="button">Edit</button>
          <button data-delete-user="${user.id}" class="button danger-outline">Delete</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="user-row user-edit-row">
      <div class="section-header">
        <div>
          <h2>Edit ${escapeHtml(displayNameFor(user) || 'User')}</h2>
          <div class="muted">User ID: ${escapeHtml(user.id)}</div>
        </div>
      </div>

      <div class="user-edit-grid">
        <label>
          <span>First Name</span>
          <input data-user-first-name="${user.id}" value="${escapeAttr(firstNameFor(user))}" />
        </label>

        <label>
          <span>Last Name</span>
          <input data-user-last-name="${user.id}" value="${escapeAttr(lastNameFor(user))}" />
        </label>

        <label>
          <span>Role</span>
          <select data-user-role="${user.id}">
            ${ROLES.map(r => `<option value="${r.value}" ${user.role === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
          </select>
        </label>

        <label>
          <span>Employee ID *</span>
          <input data-user-pin="${user.id}" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="10" value="${escapeAttr(user.employeeId || user.pin || '')}" />
        </label>

        <label>
          <span>Badge Code</span>
          <input data-user-badge-code="${user.id}" value="${escapeAttr(user.badgeCode || user.employeeId || user.pin || '')}" />
        </label>

        <label>
          <span>Status</span>
          <select data-user-status="${user.id}">
            <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </label>
      </div>

      <div class="user-edit-actions">
        <button data-save-user="${user.id}" class="button primary">Save Changes</button>
        <button data-cancel-edit class="button">Cancel</button>
        <button data-delete-user="${user.id}" class="button danger-outline">Delete User</button>
      </div>
    </div>
  `;
}

function wireEvents() {
  root.querySelector('#addUserBtn')?.addEventListener('click', handleAddUser);
  root.querySelector('#importUsersBtn')?.addEventListener('click', handleImportUsers);
  root.querySelector('#downloadUserTemplateBtn')?.addEventListener('click', downloadUserTemplateCsv);
  root.querySelector('#refreshUsersBtn')?.addEventListener('click', loadAndRender);
  root.querySelector('#exportUsersBtn')?.addEventListener('click', exportUsersCSV);
  root.querySelector('#printAllBadgesBtn')?.addEventListener('click', printAllBadges);
  root.querySelector('#printSelectedBadgesBtn')?.addEventListener('click', printSelectedBadges);

  wireBadgeAutoFill();

  const selectAll = root.querySelector('#selectAllUsers');

  selectAll?.addEventListener('change', () => {
    root.querySelectorAll('.user-select').forEach((checkbox) => {
      checkbox.checked = selectAll.checked;
      const row = checkbox.closest('.user-row');
      if (row) row.classList.toggle('selected', checkbox.checked);
    });
  });

  root.querySelectorAll('.user-select').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const row = checkbox.closest('.user-row');
      if (row) row.classList.toggle('selected', checkbox.checked);

      const all = root.querySelectorAll('.user-select');
      const checked = root.querySelectorAll('.user-select:checked');
      const selectAllBox = root.querySelector('#selectAllUsers');

      if (!selectAllBox) return;

      selectAllBox.checked = all.length > 0 && checked.length === all.length;
      selectAllBox.indeterminate = checked.length > 0 && checked.length < all.length;
    });
  });

  root.querySelector('#userSearchInput')?.addEventListener('input', (event) => {
    searchText = event.target.value;
    editingUserId = null;
    render();

    const searchInput = root.querySelector('#userSearchInput');
    if (searchInput) {
      searchInput.focus();
      searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
  });

  root.querySelector('#userRoleFilter')?.addEventListener('change', (event) => {
    roleFilter = event.target.value;
    editingUserId = null;
    render();
  });

  root.querySelectorAll('[data-edit-user]').forEach((button) => {
    button.addEventListener('click', () => {
      editingUserId = button.dataset.editUser;
      render();
    });
  });

  root.querySelectorAll('[data-cancel-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      editingUserId = null;
      render();
    });
  });

  root.querySelectorAll('[data-print-badge]').forEach((button) => {
    button.addEventListener('click', () => {
      printBadge(button.dataset.printBadge);
    });
  });

  root.querySelectorAll('[data-save-user]').forEach((button) => {
    button.addEventListener('click', async () => {
      await handleSaveUser(button.dataset.saveUser);
    });
  });

  root.querySelectorAll('[data-delete-user]').forEach((button) => {
    button.addEventListener('click', async () => {
      await handleDeleteUser(button.dataset.deleteUser);
    });
  });
}

function wireBadgeAutoFill() {
  const addEmployeeIdInput = root.querySelector('#newUserEmployeeId');
  const addBadgeInput = root.querySelector('#newUserBadgeCode');

  attachBadgeAutoFill(addEmployeeIdInput, addBadgeInput);

  root.querySelectorAll('[data-user-pin]').forEach((employeeInput) => {
    const userId = employeeInput.dataset.userPin;
    const badgeInput = root.querySelector(`[data-user-badge-code="${userId}"]`);
    attachBadgeAutoFill(employeeInput, badgeInput);
  });
}

function attachBadgeAutoFill(employeeInput, badgeInput) {
  if (!employeeInput || !badgeInput) return;

  let previousEmployeeId = String(employeeInput.value || '').trim();

  employeeInput.addEventListener('input', () => {
    const nextEmployeeId = String(employeeInput.value || '').trim();
    const currentBadge = String(badgeInput.value || '').trim();

    if (!currentBadge || currentBadge === previousEmployeeId) {
      badgeInput.value = nextEmployeeId;
    }

    previousEmployeeId = nextEmployeeId;
  });
}

async function handleAddUser() {
  assertAdminSession();
  const plantId = requirePlantId();

  const firstNameInput = root.querySelector('#newUserFirstName');
  const lastNameInput = root.querySelector('#newUserLastName');
  const employeeIdInput = root.querySelector('#newUserEmployeeId');
  const badgeCodeInput = root.querySelector('#newUserBadgeCode');
  const roleInput = root.querySelector('#newUserRole');
  const statusInput = root.querySelector('#newUserStatus');

  const firstName = sanitizeText(firstNameInput?.value, 40);
  const lastName = sanitizeText(lastNameInput?.value, 40);
  const name = buildFullName(firstName, lastName);
  const employeeId = sanitizeText(employeeIdInput?.value, 40);

  if (!employeeId) {
    alert('Employee ID is required.');
    employeeIdInput?.focus();
    return;
  }

  if (!/^[0-9]+$/.test(employeeId)) {
    alert('Employee ID must contain numbers only.');
    employeeIdInput?.focus();
    return;
  }

  const badgeCode = sanitizeText(badgeCodeInput?.value, 120) || employeeId;
  const role = sanitizeRole(roleInput?.value || 'operator');
  const status = sanitizeUserStatus(statusInput?.value || 'active');
  const pin = employeeId;

  if (!firstName || !lastName) {
    alert('First name and last name are required.');
    (!firstName ? firstNameInput : lastNameInput)?.focus();
    return;
  }

  if (employeeId && users.some((user) => String(user.employeeId || user.pin || '') === employeeId)) {
    alert('That Employee ID is already assigned.');
    employeeIdInput?.focus();
    return;
  }

  if (badgeCode && users.some((user) => String(user.badgeCode || '') === badgeCode)) {
    alert('That Badge Code is already assigned.');
    badgeCodeInput?.focus();
    return;
  }

  try {
    await addDoc(usersCollection(), {
      plantId,
      firstName,
      lastName,
      name,
      employeeId,
      pin,
      badgeCode,
      role,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await addAdminLog(`Created user ${name} as ${roleLabel(role)}`);
    searchText = '';
    roleFilter = 'all';
    await loadAndRender();
  } catch (error) {
    console.error('❌ Add user failed:', error);
    alert('Add user failed.');
  }
}

async function handleImportUsers() {
  assertAdminSession();
  const plantId = requirePlantId();

  const fileInput = root.querySelector('#userImportFile');
  const result = root.querySelector('#importUsersResult');
  const file = fileInput?.files?.[0];

  if (!file) {
    alert('Choose a CSV file first.');
    return;
  }

  try {
    if (result) result.textContent = 'Reading CSV...';

    const text = await readFileAsText(file);
    const rows = parseCsv(text);

    if (!rows.length) {
      if (result) result.textContent = 'No rows found.';
      return;
    }

    if (!confirm(`Import ${rows.length} users?\n\nDuplicates and bad rows will be skipped.`)) {
      if (result) result.textContent = 'Import cancelled.';
      return;
    }

    const existingEmployeeIds = new Set(users.map((user) => String(user.employeeId || user.pin || '').trim()).filter(Boolean));
    const existingBadges = new Set(users.map((user) => String(user.badgeCode || '').trim()).filter(Boolean));
    const incomingEmployeeIds = new Set();
    const incomingBadges = new Set();

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
      const user = normalizeImportRow(row);

      if (!user.name) {
        skipped += 1;
        errors.push('Skipped row: missing name.');
        continue;
      }

      if (!user.employeeId) {
        skipped += 1;
        errors.push(`Skipped ${user.name}: missing Employee ID.`);
        continue;
      }

      if (!user.badgeCode) user.badgeCode = user.employeeId;

      if (user.employeeId && (existingEmployeeIds.has(user.employeeId) || incomingEmployeeIds.has(user.employeeId))) {
        skipped += 1;
        errors.push(`Skipped ${user.name}: duplicate Employee ID ${user.employeeId}.`);
        continue;
      }

      if (user.badgeCode && (existingBadges.has(user.badgeCode) || incomingBadges.has(user.badgeCode))) {
        skipped += 1;
        errors.push(`Skipped ${user.name}: duplicate Badge Code.`);
        continue;
      }

      if (user.employeeId) incomingEmployeeIds.add(user.employeeId);
      if (user.badgeCode) incomingBadges.add(user.badgeCode);

      await addDoc(usersCollection(), {
        plantId,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        employeeId: user.employeeId,
        pin: user.employeeId,
        badgeCode: user.badgeCode,
        role: user.role,
        status: user.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      imported += 1;
    }

    await addAdminLog(`Imported ${imported} users from CSV`);

    if (result) {
      result.innerHTML = `
        <strong>Import complete:</strong> ${imported} added, ${skipped} skipped.
        ${errors.length ? `<br>${errors.slice(0, 6).map(escapeHtml).join('<br>')}${errors.length > 6 ? '<br>More skipped rows were hidden.' : ''}` : ''}
      `;
    }

    await loadAndRender();
  } catch (error) {
    console.error('❌ Import users failed:', error);
    if (result) result.textContent = 'Import failed. Check the CSV format.';
    alert('Import failed.');
  }
}

async function handleSaveUser(userId) {
  assertAdminSession();
  const firstNameInput = root.querySelector(`[data-user-first-name="${userId}"]`);
  const lastNameInput = root.querySelector(`[data-user-last-name="${userId}"]`);
  const pinInput = root.querySelector(`[data-user-pin="${userId}"]`);
  const badgeCodeInput = root.querySelector(`[data-user-badge-code="${userId}"]`);
  const roleInput = root.querySelector(`[data-user-role="${userId}"]`);
  const statusInput = root.querySelector(`[data-user-status="${userId}"]`);

  const firstName = sanitizeText(firstNameInput?.value, 40);
  const lastName = sanitizeText(lastNameInput?.value, 40);
  const name = buildFullName(firstName, lastName);
  const employeeId = sanitizeText(pinInput?.value, 40);

  if (!employeeId) {
    alert('Employee ID is required.');
    pinInput?.focus();
    return;
  }

  if (!/^[0-9]+$/.test(employeeId)) {
    alert('Employee ID must contain numbers only.');
    pinInput?.focus();
    return;
  }

  const pin = employeeId;
  const badgeCode = sanitizeText(badgeCodeInput?.value, 120) || employeeId;
  const role = sanitizeRole(roleInput?.value || 'operator');
  const status = sanitizeUserStatus(statusInput?.value || 'active');

  if (!firstName || !lastName) {
    alert('First name and last name are required.');
    (!firstName ? firstNameInput : lastNameInput)?.focus();
    return;
  }

  const duplicateId = employeeId && users.some(
    (user) => user.id !== userId && String(user.employeeId || user.pin || '') === employeeId
  );

  if (duplicateId) {
    alert('That Employee ID is already assigned.');
    pinInput?.focus();
    return;
  }

  const duplicateBadge = badgeCode && users.some(
    (user) => user.id !== userId && String(user.badgeCode || '') === badgeCode
  );

  if (duplicateBadge) {
    alert('That Badge Code is already assigned.');
    badgeCodeInput?.focus();
    return;
  }

  try {
    await updateUserInFirestore(userId, {
      firstName,
      lastName,
      name,
      employeeId,
      pin,
      badgeCode,
      role,
      status
    });

    handleLiveSessionUpdate(userId, { firstName, lastName, name, employeeId, pin, badgeCode, role, status });
    await addAdminLog(`Updated user ${name}`);
    editingUserId = null;
    await loadAndRender();
  } catch (error) {
    console.error('❌ Save user failed:', error);
    alert('Save failed.');
  }
}

async function handleDeleteUser(userId) {
  assertAdminSession();
  const user = users.find((item) => item.id === userId);
  if (!user) return alert('User not found in active plant.');
  const name = displayNameFor(user) || userId;
  const current = getSession() || getStoredSessionUser();

  if (current?.id === userId) {
    alert('You cannot delete the currently selected session user. Switch to another admin first.');
    return;
  }

  if (!confirm(`Delete user "${name}"?\n\nThis cannot be undone.`)) return;

  try {
    await deleteDoc(userDoc(userId));
    await addAdminLog(`Deleted user ${name}`);
    editingUserId = null;
    await loadAndRender();
  } catch (error) {
    console.error('❌ Delete user failed:', error);
    alert('Delete failed.');
  }
}

function normalizeImportRow(row) {
  const rawRole = String(row.role || row.Role || 'operator').trim();
  const normalizedRole = normalizeRole(rawRole);
  const rawStatus = String(row.status || row.Status || 'active').trim();

  const employeeId = String(
    row.employeeId ||
    row.EmployeeID ||
    row.employeeID ||
    row.employee_id ||
    row.clockNumber ||
    row.ClockNumber ||
    row.clock ||
    row.Clock ||
    row.pin ||
    row.PIN ||
    ''
  ).trim();

  const badgeCode = String(
    row.badgeCode ||
    row.BadgeCode ||
    row.badge ||
    row.Badge ||
    row.scanCode ||
    row.ScanCode ||
    row.barcode ||
    row.Barcode ||
    ''
  ).trim();

  const fullName = String(row.name || row.Name || '').trim();
  const split = splitLegacyName(fullName);
  const firstName = String(row.firstName || row.FirstName || row.first_name || split.firstName || '').trim();
  const lastName = String(row.lastName || row.LastName || row.last_name || split.lastName || '').trim();
  const name = buildFullName(firstName, lastName) || fullName;

  return {
    firstName,
    lastName,
    name,
    employeeId,
    badgeCode: badgeCode || employeeId,
    role: normalizedRole,
    status: normalizeStatus(rawStatus)
  };
}

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase().replaceAll(' ', '').replaceAll('_', '');

  if (role === 'operator' || role === 'op') return 'operator';
  if (role === 'diesetter' || role === 'die' || role === 'authorizedstaff' || role === 'authorized') return 'dieSetter';
  if (role === 'supervisor' || role === 'super') return 'supervisor';
  if (role === 'admin' || role === 'administrator') return 'admin';

  return 'operator';
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return status === 'inactive' || status === 'disabled' ? 'inactive' : 'active';
}

function parseCsv(text) {
  const rows = [];
  const lines = String(text || '').replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n').filter((line) => line.trim());

  if (lines.length < 2) return rows;

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function downloadUserTemplateCsv() {
  const csv = [
    'firstName,lastName,role,employeeId,badgeCode,status',
    'Sally,Smith,operator,331,,active',
    'Bob,Jones,Authorized Staff,442,A123-567B-6754,active',
    'Mike,Carter,supervisor,553,,active',
    'Lisa,Brown,admin,664,,active'
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'user-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleLiveSessionUpdate(userId, updates) {
  const current = getSession() || getStoredSessionUser();
  if (!current || current.id !== userId) return;

  const updatedUser = { ...current, ...updates };
  setSession(updatedUser);
  setStoredSessionUser(updatedUser);
}

function exportUsersCSV() {
  if (!users.length) {
    alert('No users to export.');
    return;
  }

  const headers = ['firstName', 'lastName', 'name', 'role', 'employeeId', 'badgeCode', 'status'];

  const rows = users.map(u => [
    firstNameFor(u),
    lastNameFor(u),
    displayNameFor(u),
    u.role || '',
    u.employeeId || u.pin || '',
    u.badgeCode || '',
    statusFor(u)
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${String(val).replaceAll('"', '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `users_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function getBadgeBranding() {
  const fallback = {
    brandingMode: 'text',
    brandText: 'Floor Flow',
    logoUrl: ''
  };

  try {
    const snap = await getDoc(settingsDocRef());
    if (!snap.exists()) return fallback;

    const data = snap.data();
    const nestedBranding = data.branding || {};
    const brandingMode = data.brandingMode || nestedBranding.brandingMode || nestedBranding.mode || fallback.brandingMode;
    const brandText = data.brandText || nestedBranding.brandText || data.plantName || nestedBranding.plantName || fallback.brandText;
    const logoUrl = data.logoUrl || nestedBranding.logoUrl || '';

    return {
      ...fallback,
      ...data,
      brandingMode,
      brandText,
      logoUrl
    };
  } catch (error) {
    console.error('Badge branding load failed:', error);
  }

  return fallback;
}

async function printAllBadges() {
  const activeUsers = users.filter((user) => statusFor(user) === 'active');
  if (!activeUsers.length) {
    alert('No active users to print.');
    return;
  }

  await printBadgeSheet(activeUsers);
}

async function printSelectedBadges() {
  const selectedIds = Array.from(
    root.querySelectorAll('.user-select:checked')
  ).map(cb => cb.dataset.userId);

  if (!selectedIds.length) {
    alert('Select at least one user.');
    return;
  }

  const selectedUsers = users.filter(u => selectedIds.includes(u.id));
  await printBadgeSheet(selectedUsers);
}

async function printBadge(userId) {
  const user = users.find(u => u.id === userId);

  if (!user) {
    alert('User not found.');
    return;
  }

  await printBadgeSheet([user]);
}

async function printBadgeSheet(activeUsers) {
  if (!activeUsers.length) {
    alert('No active users to print.');
    return;
  }

  if (!confirm(`Print ${activeUsers.length} active user badge${activeUsers.length === 1 ? '' : 's'} on one sheet?`)) return;

  const settings = await getBadgeBranding();
  const brandText = settings.brandText || 'Floor Flow';
  const logoUrl = settings.brandingMode === 'logo' ? settings.logoUrl || '' : '';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup blocked. Allow popups to print badges.');
    return;
  }

  const badgeCards = activeUsers.map((user, index) => {
    const name = escapeHtml(displayNameFor(user) || 'Unnamed');
    const id = escapeHtml(user.employeeId || user.pin || '');
    const role = escapeHtml(roleLabel(user.role));
    const brandHtml = logoUrl
      ? `<img class="plant-logo" src="${escapeAttr(logoUrl)}" alt="${escapeAttr(brandText)}" onerror="this.style.display='none'; this.parentElement.textContent='${escapeAttr(brandText)}';" />`
      : escapeHtml(brandText);

    return `
      <div class="badge">
        <div class="badge-top">
          <div class="top-brand">${brandHtml}</div>
        </div>

        <div class="name-band">
          <div class="name">${name}</div>
          <div class="role">${role}</div>
        </div>

        <div class="id">ID: ${id}</div>

        <div class="codes">
          <canvas id="qrcode-${index}"></canvas>
          <svg id="barcode-${index}"></svg>
        </div>

        <div class="footer">Powered by One T Media Group</div>
      </div>
    `;
  }).join('');

  const codeValues = activeUsers.map((user) => user.badgeCode || user.employeeId || user.pin || '');

  printWindow.document.write(`
<html>
<head>
<title>Badge Sheet</title>
<style>
  @page { size: letter; margin: 0.5in; }

  body {
    margin: 0;
    font-family: Arial, sans-serif;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .sheet {
    display: grid;
    grid-template-columns: repeat(2, 3.375in);
    grid-auto-rows: 2.125in;
    gap: 0.25in;
    justify-content: center;
  }

  .badge {
    width: 3.375in;
    height: 2.125in;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    background: white;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .badge-top {
    height: 0.48in;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 10px;
    background: white;
  }

  .top-brand {
    font-weight: 900;
    font-size: 18px;
    color: #0b63ce;
    text-align: center;
  }

  .plant-logo {
    max-height: 32px;
    max-width: 190px;
    object-fit: contain;
  }

  .name-band {
    background: #0b63ce;
    color: white;
    text-align: center;
    padding: 8px 6px;
  }

  .name {
    font-size: 20px;
    font-weight: 900;
    line-height: 1;
  }

  .role {
    font-size: 11px;
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .id {
    font-size: 14px;
    font-weight: 800;
    text-align: center;
    padding: 7px 0 3px;
    color: #111827;
  }

  .codes {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex: 1;
    padding: 0 12px 4px;
  }

  canvas {
    width: 46px;
    height: 46px;
  }

  svg {
    width: 145px;
    height: 42px;
  }

  .footer {
    font-size: 7px;
    text-align: center;
    color: #6b7280;
    padding-bottom: 3px;
  }
</style>

<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
</head>

<body>
  <div class="sheet">
    ${badgeCards}
  </div>

  <script>
    const values = ${JSON.stringify(codeValues)};

    window.onload = function() {
      values.forEach((value, index) => {
        try {
          JsBarcode("#barcode-" + index, value, {
            format: "CODE128",
            displayValue: false,
            height: 42,
            margin: 0
          });

          QRCode.toCanvas(document.getElementById("qrcode-" + index), value, {
            width: 42,
            margin: 0
          });
        } catch (error) {
          console.error("Badge code failed", error);
        }
      });

      setTimeout(() => {
        window.print();
        window.close();
      }, 1200);
    };
  <\/script>
</body>
</html>
`);

  printWindow.document.close();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}