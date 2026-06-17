import {
  loadReportData,
  buildSnapshotRows,
  buildHistoryRows,
  summarizeReports,
  rowsToCsv
} from './reports-data.js';

const SNAPSHOT_HEADERS = [
  { key: 'workCell', label: 'Work Cell' },
  { key: 'area', label: 'Area' },
  { key: 'currentPart', label: 'Current Part' },
  { key: 'currentQty', label: 'Current Qty' },
  { key: 'nextPart', label: 'Next Part' },
  { key: 'nextQty', label: 'Next Qty' },
  { key: 'status', label: 'Status' }
];

const HISTORY_HEADERS = [
  { key: 'date', label: 'Date' },
  { key: 'user', label: 'User' },
  { key: 'workCell', label: 'Work Cell' },
  { key: 'area', label: 'Area' },
  { key: 'partNumber', label: 'Part' },
  { key: 'qty', label: 'Qty' },
  { key: 'unit', label: 'Unit' },
  { key: 'action', label: 'Action' },
  { key: 'message', label: 'Message' }
];



export async function mountReportsTool(container) {
  const state = {
    activeTab: 'snapshot',
    loading: true,
    snapshotRows: [],
    historyRows: [],
    summary: {},
    filters: {
      search: '',
      action: 'all'
    }
  };

  let disposed = false;

  renderLoading();
  await refresh();

  return () => {
    disposed = true;
  };

  async function refresh() {
    state.loading = true;
    render();

    const data = await loadReportData();
    state.snapshotRows = buildSnapshotRows(data.workCells);
    state.historyRows = buildHistoryRows(data.activityLogs, data.workCells);
    state.summary = summarizeReports(
  state.snapshotRows,
  state.historyRows
);
    state.loading = false;

    render();
  }

  function renderLoading() {
    container.innerHTML = `<div class="admin-loading">Loading reports...</div>`;
  }

  function render() {
    if (disposed || !container) return;
    if (state.loading) {
      renderLoading();
      return;
    }

    container.innerHTML = `
      <section class="reports-tool">
        <div class="admin-tool-header-row">
          <div>
            <h1>Reports</h1>
            <p class="muted">
  Live floor snapshot, setup history, and CSV exports.
</p>
          </div>
          <div class="report-actions">
            <button class="button secondary" type="button" data-refresh-reports>Refresh</button>
            <button class="button secondary" type="button" data-print-reports>Print</button>
            <button class="button primary" type="button" data-export-current>Export CSV</button>
          </div>
        </div>

        <div class="report-summary-grid">
          <div class="report-summary-card"><span>Active Work Cells</span><strong>${state.summary.workCells || 0}</strong></div>
          <div class="report-summary-card"><span>Running</span><strong>${state.summary.running || 0}</strong></div>
          <div class="report-summary-card"><span>Paused</span><strong>${state.summary.paused || 0}</strong></div>
          
        </div>

        <div class="reports-tabs">
          ${tabButton('snapshot', 'Current Floor Snapshot')}
${tabButton('history', 'Setup History')}
        </div>

        ${renderFilters()}
        ${renderActiveReport()}
      </section>
    `;

    bindEvents();
  }

  function tabButton(tab, label) {
    return `<button type="button" class="${state.activeTab === tab ? 'active' : ''}" data-report-tab="${tab}">${label}</button>`;
  }

  function renderFilters() {
    const actionFilter = state.activeTab === 'history'
      ? `
        <select data-report-action>
          <option value="all" ${state.filters.action === 'all' ? 'selected' : ''}>All Actions</option>
          <option value="Ready" ${state.filters.action === 'Ready' ? 'selected' : ''}>Ready</option>
          <option value="Running" ${state.filters.action === 'Running' ? 'selected' : ''}>Running</option>
          <option value="Paused" ${state.filters.action === 'Paused' ? 'selected' : ''}>Paused</option>
          <option value="Saved" ${state.filters.action === 'Saved' ? 'selected' : ''}>Saved</option>
          <option value="Cleared" ${state.filters.action === 'Cleared' ? 'selected' : ''}>Cleared</option>
          <option value="Complete + Shift" ${state.filters.action === 'Complete + Shift' ? 'selected' : ''}>Complete + Shift</option>
        </select>
      `
      : '';

    return `
      <div class="report-filter-row">
        <input data-report-search value="${escapeAttr(state.filters.search)}" placeholder="Search reports..." />
        ${actionFilter}
      </div>
    `;
  }

  function renderActiveReport() {
    if (state.activeTab === 'history') return renderHistory();
  
    return renderSnapshot();
  }

  function renderSnapshot() {
    const rows = filterRows(state.snapshotRows);

    return `
      <section class="admin-card report-card">
        <h2>Current Floor Snapshot</h2>
        <div class="report-table report-table-snapshot">
          <div class="report-head">
            <span>Work Cell</span><span>Area</span><span>Current</span><span>Current Qty</span><span>Next</span><span>Next Qty</span><span>Status</span>
          </div>
          ${rows.length ? rows.map((row) => `
            <div class="report-row">
              <strong>${escapeHtml(row.workCell)}</strong>
              <span>${escapeHtml(row.area)}</span>
              <span>${escapeHtml(row.currentPart || '—')}</span>
              <span>${escapeHtml(row.currentQty || '—')}</span>
              <span>${escapeHtml(row.nextPart || '—')}</span>
              <span>${escapeHtml(row.nextQty || '—')}</span>
              <span class="report-status report-status-${escapeAttr(String(row.status || '').toLowerCase().replaceAll(' ', '-'))}">${escapeHtml(row.status || '—')}</span>
            </div>
          `).join('') : emptyRow('No active work cells found.')}
        </div>
      </section>
    `;
  }

  function renderHistory() {
    const rows = currentHistoryRows();

    return `
      <section class="admin-card report-card">
        <h2>Setup History</h2>
        <div class="report-table report-table-history">
          <div class="report-head">
            <span>Date</span><span>User</span><span>Cell</span><span>Part</span><span>Qty</span><span>Unit</span><span>Action</span>
          </div>
          ${rows.length ? rows.map((row) => `
            <div class="report-row">
              <span>${escapeHtml(row.date || '—')}</span>
              <span>${escapeHtml(row.user || '—')}</span>
              <strong>${escapeHtml(row.workCell || '—')}</strong>
              <span>${escapeHtml(row.partNumber || '—')}</span>
              <span>${escapeHtml(row.qty || '—')}</span>
              <span>${escapeHtml(row.unit || '—')}</span>
              <span class="report-status report-status-${escapeAttr(String(row.action || '').toLowerCase().replaceAll(' ', '-'))}">${escapeHtml(row.action || '—')}</span>
            </div>
          `).join('') : emptyRow('No history found.')}
        </div>
      </section>
    `;
  }

  

  function emptyRow(text) {
    return `<div class="report-empty">${escapeHtml(text)}</div>`;
  }

  function renderReportOnly() {
    const currentReport = container.querySelector('.report-card');
    if (!currentReport) return;
    currentReport.outerHTML = renderActiveReport();
  }

  function bindEvents() {
    container.querySelectorAll('[data-report-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        state.activeTab = button.dataset.reportTab;
        if (state.activeTab !== 'history') state.filters.action = 'all';
        render();
      });
    });

    container.querySelector('[data-refresh-reports]')?.addEventListener('click', refresh);
    container.querySelector('[data-print-reports]')?.addEventListener('click', printCurrentReport);

    container.querySelector('[data-export-current]')?.addEventListener('click', () => {
      const { headers, rows, filename } = currentExport();
      downloadCsv(rowsToCsv(headers, rows), filename);
    });

    container.querySelector('[data-report-search]')?.addEventListener('input', (event) => {
      state.filters.search = event.currentTarget.value || '';
      renderReportOnly();
    });

    container.querySelector('[data-report-action]')?.addEventListener('change', (event) => {
      state.filters.action = event.currentTarget.value || 'all';
      renderReportOnly();
    });
  }

  function filterRows(rows) {
    const query = state.filters.search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(query));
  }

  function currentHistoryRows() {
    return filterRows(state.historyRows)
      .filter((row) => {
        if (state.filters.action === 'all') return true;
        return String(row.action || '').toLowerCase() === String(state.filters.action || '').toLowerCase();
      });
  }

  function currentExport() {
    if (state.activeTab === 'history') {
      return {
        headers: HISTORY_HEADERS,
        rows: currentHistoryRows(),
        filename: 'floorflow-setup-history.csv'
      };
    }

    

    return {
      headers: SNAPSHOT_HEADERS,
      rows: filterRows(state.snapshotRows),
      filename: 'floorflow-current-snapshot.csv'
    };
  }

  function printCurrentReport() {
    const { headers, rows } = currentExport();
    const title = state.activeTab === 'history'
      ? 'Setup History'
      
        : 'Current Floor Snapshot';

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) {
      window.print();
      return;
    }

    win.document.open();
    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Floor Flow - ${escapeHtml(title)}</title>
  <style>
    *{box-sizing:border-box;}
    body{font-family:Arial,sans-serif;color:#111827;margin:28px;background:#fff;}
    .print-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #111827;padding-bottom:12px;}
    h1{margin:0;font-size:26px;}
    .muted{color:#64748b;font-size:12px;margin-top:4px;}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0 20px;}
    .summary div{border:1px solid #d1d5db;border-radius:10px;padding:10px;}
    .summary span{display:block;color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;}
    .summary strong{display:block;margin-top:4px;font-size:18px;}
    table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;}
    th{background:#111827;color:#fff;text-align:left;padding:8px 7px;font-size:10px;text-transform:uppercase;}
    td{border-bottom:1px solid #e5e7eb;padding:8px 7px;vertical-align:top;word-break:break-word;}
    tr:nth-child(even) td{background:#f9fafb;}
    @media print{body{margin:16px;} .summary{break-inside:avoid;} table{page-break-inside:auto;} tr{page-break-inside:avoid;}}
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <h1>Floor Flow</h1>
      <div class="muted">${escapeHtml(title)}</div>
    </div>
    <div class="muted">${new Date().toLocaleString()}</div>
  </div>

  <div class="summary">
    <div><span>Active Work Cells</span><strong>${state.summary.workCells || 0}</strong></div>
    <div><span>Running</span><strong>${state.summary.running || 0}</strong></div>
    <div><span>Paused</span><strong>${state.summary.paused || 0}</strong></div>
  </div>

  <table>
    <thead><tr>${headers.map((header) => `<th>${escapeHtml(header.label)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.length ? rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header.key] || '—')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">No rows found.</td></tr>`}
    </tbody>
  </table>
</body>
</html>`);
    win.document.close();
    win.focus();
    window.setTimeout(() => {
      win.print();
    }, 300);
  }
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
