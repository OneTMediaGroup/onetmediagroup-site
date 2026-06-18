import {
  UNIT_OPTIONS,
  loadPartLibrary,
  savePart,
  deletePart,
  importPartsCsv,
  downloadPartsCsv,
  downloadPartsTemplate
} from './part-library.js';
import { requireActiveBillingAccess } from './billing-guard.js';





const state = {
  parts: [],
  search: '',
  editing: null
};

const root = document.getElementById('partsLibraryApp');

await requireActiveBillingAccess();
init();

async function init() {
  if (!root) return;
  await refreshParts();
  render();
}

async function refreshParts() {
  state.parts = await loadPartLibrary({ limit: 1000 });
}

function render() {
  const filtered = getFilteredParts();

  root.innerHTML = `
    <section class="parts-page">
      <header class="parts-hero">
  <div>
    <p class="eyebrow">Floor Flow</p>
    <h1>Parts Library</h1>
    <p>
      Upload, edit, and search the plant master parts list.
      Supervisors use this library for fast part entry and unit auto-fill.
    </p>
  </div>

  <div class="parts-actions">
    <label class="parts-upload">
      Import CSV
      <input
        type="file"
        accept=".csv,text/csv"
        data-import-parts
        hidden
      />
    </label>

    <button type="button" data-download-template>
      Template
    </button>

    <button type="button" data-export-parts>
      Export CSV
    </button>
  </div>
</header>

      <div class="parts-grid">
        ${renderForm()}
        <section class="parts-card parts-list-card">
          <div class="parts-list-head">
            <div>
              <h2>Master Parts</h2>
              <p data-parts-count>${filtered.length} shown / ${state.parts.length} total</p>
            </div>
            <input data-search-parts value="${escapeAttr(state.search)}" placeholder="Search part number or description..." />
          </div>

          <div class="parts-table">
            <div class="parts-table-head">
              <span>Part Number</span>
              <span>Description</span>
              <span>Unit</span>
              <span>Actions</span>
            </div>
            <div data-parts-table-body>
              ${filtered.length ? filtered.map(renderPartRow).join('') : '<div class="parts-empty">No parts found yet.</div>'}
            </div>
          </div>
        </section>
      </div>
    </section>
  `;

  bindEvents();
}

function renderForm() {
  const edit = state.editing;

  return `
    <section class="parts-card parts-form-card">
      <h2>${edit ? 'Edit Part' : 'Add Part'}</h2>
      <form data-part-form>
        <label>
          <span>Part Number</span>
          <input name="partNumber" value="${escapeAttr(edit?.partNumber || '')}" ${edit ? 'readonly' : ''} required />
        </label>

        <label>
          <span>Description</span>
          <input name="description" value="${escapeAttr(edit?.description || '')}" placeholder="Optional description" />
        </label>

        <label>
          <span>Default Unit</span>
          <select name="unit">
            ${UNIT_OPTIONS.map((unit) => `<option value="${escapeAttr(unit)}" ${(edit?.unit || 'Pcs') === unit ? 'selected' : ''}>${escapeHtml(unit)}</option>`).join('')}
          </select>
        </label>

        <div class="parts-form-actions">
          <button type="submit">${edit ? 'Save Changes' : 'Add Part'}</button>
          ${edit ? '<button type="button" data-cancel-edit>Cancel</button>' : ''}
        </div>
      </form>
    </section>
  `;
}

function renderPartRow(part) {
  return `
    <div class="parts-table-row">
      <strong>${escapeHtml(part.partNumber)}</strong>
      <span>${escapeHtml(part.description || '—')}</span>
      <span class="unit-pill">${escapeHtml(part.unit || 'Pcs')}</span>
      <span class="parts-row-actions">
        <button type="button" data-edit-part="${escapeAttr(part.partNumber)}">Edit</button>
        <button type="button" data-delete-part="${escapeAttr(part.partNumber)}">Delete</button>
      </span>
    </div>
  `;
}

function refreshPartsListOnly() {
  if (!root) return;

  const filtered = getFilteredParts();
  const countEl = root.querySelector('[data-parts-count]');
  const tableEl = root.querySelector('[data-parts-table-body]');

  if (countEl) {
    countEl.textContent = `${filtered.length} shown / ${state.parts.length} total`;
  }

  if (tableEl) {
    tableEl.innerHTML = filtered.length
      ? filtered.map(renderPartRow).join('')
      : '<div class="parts-empty">No parts found yet.</div>';
  }

  bindPartRowEvents();
}

function bindPartRowEvents() {
  root.querySelectorAll('[data-edit-part]').forEach((button) => {
    button.addEventListener('click', () => {
      state.editing = state.parts.find((part) => part.partNumber === button.dataset.editPart);
      render();
    });
  });

  root.querySelectorAll('[data-delete-part]').forEach((button) => {
    button.addEventListener('click', async () => {
      const partNumber = button.dataset.deletePart;
      if (!confirm(`Delete ${partNumber} from the parts library?`)) return;
      await deletePart(partNumber);
      await refreshParts();
      render();
    });
  });
}


function bindEvents() {
  const form = root.querySelector('[data-part-form]');
  if (form) {
    form.addEventListener('submit', saveForm);

  }

  const search = root.querySelector('[data-search-parts]');
  if (search) {
    search.addEventListener('input', () => {
      state.search = search.value || '';
      refreshPartsListOnly();
    });
  }

  bindPartRowEvents();

  const cancel = root.querySelector('[data-cancel-edit]');
  if (cancel) {
    cancel.addEventListener('click', () => {
      state.editing = null;
      render();
    });
  }

  const importInput = root.querySelector('[data-import-parts]');
  if (importInput) {
    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      const result = await importPartsCsv(file);
      alert(`Import complete. Imported: ${result.imported}. Updated: ${result.updated}. Skipped: ${result.skipped}.`);
      state.editing = null;
      await refreshParts();
      render();
    });
  }




 const templateButton = root.querySelector('[data-download-template]');

if (templateButton) {
  templateButton.addEventListener('click', () => {
    downloadPartsTemplate();
  });
}

const exportButton = root.querySelector('[data-export-parts]');
  if (exportButton) {
    exportButton.addEventListener('click', () => downloadPartsCsv());
  }
}

async function saveForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  await savePart({
    partNumber: formData.get('partNumber'),
    description: formData.get('description'),
    unit: formData.get('unit')
  });

  state.editing = null;
  await refreshParts();
  render();
}

function getFilteredParts() {
  const query = state.search.trim().toLowerCase();

  if (!query) return state.parts;

  return state.parts.filter((part) => {
    return String(part.partNumber || '').toLowerCase().includes(query) ||
      String(part.description || '').toLowerCase().includes(query);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
