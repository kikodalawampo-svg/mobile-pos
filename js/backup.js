/* ==========================================================================
   backup.js — Export/Import backup (JSON) and CSV export
   ========================================================================== */

const BackupModule = {
  async render() {
    return `
      <div class="view-header">
        <button class="btn btn-ghost btn-back" id="btnBack">‹ Settings</button>
      </div>
      <h1>Backup &amp; Restore</h1>

      <section class="card">
        <h2 class="card-title">Export Backup</h2>
        <p class="muted">Save a full copy of your shop's data (customers, job orders, parts, payments, and more) as a single file you can keep safe or move to another device.</p>
        <button class="btn btn-primary" id="btnExportBackup">Export Backup (.json)</button>
      </section>

      <section class="card">
        <h2 class="card-title">Import Backup</h2>
        <p class="muted warning-text">Importing will replace all current data in the app with the contents of the backup file. This cannot be undone.</p>
        <input type="file" id="importFile" accept="application/json">
        <button class="btn btn-danger" id="btnImportBackup">Import Backup</button>
      </section>

      <section class="card">
        <h2 class="card-title">Export CSV</h2>
        <p class="muted">Export individual data tables as CSV files for spreadsheets.</p>
        <div class="btn-row">
          <button class="btn btn-secondary" data-csv="jobOrders">Job Orders</button>
          <button class="btn btn-secondary" data-csv="customers">Customers</button>
          <button class="btn btn-secondary" data-csv="payments">Payments</button>
          <button class="btn btn-secondary" data-csv="parts">Parts</button>
        </div>
      </section>
    `;
  },

  afterRender() {
    document.getElementById('btnBack').addEventListener('click', () => { location.hash = '#/settings'; });
    document.getElementById('btnExportBackup').addEventListener('click', () => this.exportBackup());
    document.getElementById('btnImportBackup').addEventListener('click', () => this.importBackup());
    document.querySelectorAll('[data-csv]').forEach(btn => {
      btn.addEventListener('click', () => this.exportCSV(btn.dataset.csv));
    });
  },

  async exportBackup() {
    const data = { exportedAt: Utils.nowISO(), version: 1, stores: {} };
    for (const name of DB.storeNames()) {
      data.stores[name] = await DB.getAll(name);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-repair-pos-backup-${Utils.todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    await Utils.logActivity('Backup exported');
    Utils.toast('Backup exported', 'success');
  },

  async importBackup() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    if (!file) { Utils.toast('Choose a backup file first', 'error'); return; }

    const ok = await Utils.confirmDialog('This will replace ALL current data with the backup file. Continue?', { danger: true, okLabel: 'Replace All Data' });
    if (!ok) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.stores) throw new Error('Invalid backup file format');
      for (const name of DB.storeNames()) {
        if (data.stores[name]) {
          await DB.replaceAll(name, data.stores[name]);
        }
      }
      SettingsModule._cache = null;
      await Utils.logActivity('Backup restored');
      Utils.toast('Backup restored successfully', 'success');
      location.hash = '#/dashboard';
      Router.render();
    } catch (err) {
      Utils.toast('Could not read backup file: ' + err.message, 'error');
    }
  },

  async exportCSV(storeName) {
    const rows = await DB.getAll(storeName);
    if (rows.length === 0) { Utils.toast('No data to export', 'info'); return; }

    // Flatten: drop nested arrays/objects to keep CSV simple and readable
    const keys = Array.from(rows.reduce((set, r) => {
      Object.keys(r).forEach(k => { if (typeof r[k] !== 'object') set.add(k); });
      return set;
    }, new Set()));

    const escapeCsv = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    const lines = [keys.join(',')];
    rows.forEach(r => {
      lines.push(keys.map(k => escapeCsv(r[k])).join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storeName}-${Utils.todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    Utils.toast(`${storeName} exported as CSV`, 'success');
  }
};

window.BackupModule = BackupModule;
