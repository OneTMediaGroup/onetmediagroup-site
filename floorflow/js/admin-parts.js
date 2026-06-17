import {
  UNIT_OPTIONS,
  loadPartLibrary,
  savePart,
  deletePart,
  importPartsCsv,
  downloadPartsCsv,
  downloadPartsTemplate
} from './part-library.js';

export async function mountPartsTool(container) {
  const state = {
    parts: [],
    search: '',
    editing: null
  };

  let disposed = false;

  await refreshParts();
  render();

  return () => {
    disposed = true;
  };

  async function refreshParts() {
    state.parts = await loadPartLibrary({ limit: 1000 });
  }

  function render() {
    if (disposed || !container) return;

    const filtered = getFilteredParts();

    container.innerHTML = `
      <section class="admin-parts-tool">
        <div class="admin-tool-header-row">
          <div>
            <h1>Parts Library</h1>
            <p class="muted">Upload, edit, and search the plant master parts list. Supervisors use this for fast part entry and unit auto-fill.</p>
          </div>
          <div class="admin-parts-actions">
            <label class="button primary admin-import-label">
              Import CSV
              <input type="file" accept=".csv,text/csv" data-import-parts hidden />
            </label>

            <button type="button" class="button secondary" data-template-parts>Template</button>

            <button type="button" class="button secondary" data-export-parts>Export CSV</button>
          </div>
        </div>

        <div class="admin-parts-grid">
          ${renderForm()}

          <section class="admin-card admin-parts-list-card">
            <div class="admin-parts-list-head">
              <div>
                <h2>Master Parts</h2>
                <p class="muted" data-parts-count>${filtered.length} shown · ${state.parts.length} total</p>
              </div>
              <input data-search-parts value="${escapeAttr(state.search)}" placeholder="Search part number or description..." />
            </div>

            <div class="admin-parts-table">
              <div class="admin-parts-table-head">
                <span>Part Number</span>
                <span>Description</span>
                <span>Unit</span>
                <span>Actions</span>
              </div>
              <div data-parts-table-body>
                ${filtered.length ? filtered.map(renderPartRow).join('') : '<div class="admin-parts-empty">No parts found yet.</div>'}
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
      <section class="admin-card admin-parts-form-card">
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

          <div class="admin-parts-form-actions">
            <button class="button primary" type="submit">${edit ? 'Save Changes' : 'Add Part'}</button>
            ${edit ? '<button class="button secondary" type="button" data-cancel-edit>Cancel</button>' : ''}
          </div>
        </form>
      </section>
    `;
  }

  function renderPartRow(part) {
    return `
      <div class="admin-parts-table-row">
        <strong>${escapeHtml(part.partNumber)}</strong>
        <span>${escapeHtml(part.description || '—')}</span>
        <span class="unit-pill">${escapeHtml(part.unit || 'Pcs')}</span>
        <span class="admin-parts-row-actions">
          <button type="button" class="button secondary" data-edit-part="${escapeAttr(part.partNumber)}">Edit</button>
          <button type="button" class="button danger-outline" data-delete-part="${escapeAttr(part.partNumber)}">Delete</button>
        </span>
      </div>
    `;
  }

  function refreshPartsListOnly() {
    if (disposed || !container) return;

    const filtered = getFilteredParts();
    const countEl = container.querySelector('[data-parts-count]');
    const tableEl = container.querySelector('[data-parts-table-body]');

    if (countEl) {
      countEl.textContent = `${filtered.length} shown · ${state.parts.length} total`;
    }

    if (tableEl) {
      tableEl.innerHTML = filtered.length
        ? filtered.map(renderPartRow).join('')
        : '<div class="admin-parts-empty">No parts found yet.</div>';
    }

    bindPartRowEvents();
  }

  function bindPartRowEvents() {
    container.querySelectorAll('[data-edit-part]').forEach((button) => {
      button.addEventListener('click', () => {
        state.editing = state.parts.find((part) => part.partNumber === button.dataset.editPart);
        render();
      });
    });

    container.querySelectorAll('[data-delete-part]').forEach((button) => {
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
    container.querySelector('[data-part-form]')?.addEventListener('submit', saveForm);

    container.querySelector('[data-search-parts]')?.addEventListener('input', (event) => {
      state.search = event.currentTarget.value || '';
      refreshPartsListOnly();
    });

    bindPartRowEvents();

    container.querySelector('[data-cancel-edit]')?.addEventListener('click', () => {
      state.editing = null;
      render();
    });

    container.querySelector('[data-import-parts]')?.addEventListener('change', async (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;

      const result = await importPartsCsv(file);
      alert(`Import complete. Imported: ${result.imported}. Updated: ${result.updated}. Skipped: ${result.skipped}.`);

      state.editing = null;
      await refreshParts();
      render();
    });

    container.querySelector('[data-template-parts]')?.addEventListener('click', () => {
      downloadPartsTemplate();
    });

    container.querySelector('[data-export-parts]')?.addEventListener('click', () => {
      downloadPartsCsv();
    });
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