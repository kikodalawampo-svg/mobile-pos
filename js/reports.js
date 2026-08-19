/* ==========================================================================
   reports.js — All reports, calculated live from real data
   ========================================================================== */

const ReportsModule = {
  activeTab: 'repair',
  dateFrom: '',
  dateTo: '',

  async render() {
    const tabs = [
      { id: 'repair', label: 'Repair' },
      { id: 'income', label: 'Income' },
      { id: 'balance', label: 'Balance Due' },
      { id: 'parts', label: 'Parts' },
      { id: 'profit', label: 'Profit' },
      { id: 'technician', label: 'Technician' }
    ];

    return `
      <div class="view-header">
        <h1>Reports</h1>
        <button class="btn btn-secondary" id="btnPrintReport">🖨️ Print</button>
      </div>
      <div class="chip-row">
        ${tabs.map(t => `<button class="chip ${this.activeTab === t.id ? 'chip-active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>
      <div class="date-range-row">
        <label class="field"><span>From</span><input type="date" id="dateFrom" value="${this.dateFrom}"></label>
        <label class="field"><span>To</span><input type="date" id="dateTo" value="${this.dateTo}"></label>
        <button class="btn btn-ghost btn-sm" id="btnClearDates">Clear</button>
      </div>
      <div id="reportContent">${await this._renderTab()}</div>
    `;
  },

  async afterRender() {
    document.querySelectorAll('.chip[data-tab]').forEach(chip => {
      chip.addEventListener('click', async () => {
        this.activeTab = chip.dataset.tab;
        Router.render();
      });
    });
    document.getElementById('dateFrom').addEventListener('change', async (e) => { this.dateFrom = e.target.value; Router.render(); });
    document.getElementById('dateTo').addEventListener('change', async (e) => { this.dateTo = e.target.value; Router.render(); });
    document.getElementById('btnClearDates').addEventListener('click', () => { this.dateFrom = ''; this.dateTo = ''; Router.render(); });
    document.getElementById('btnPrintReport').addEventListener('click', () => window.print());
  },

  _inRange(iso) {
    if (!iso) return false;
    const d = iso.slice(0, 10);
    if (this.dateFrom && d < this.dateFrom) return false;
    if (this.dateTo && d > this.dateTo) return false;
    return true;
  },

  async _renderTab() {
    const jobs = await DB.getAll('jobOrders');
    const scoped = (this.dateFrom || this.dateTo) ? jobs.filter(j => this._inRange(j.createdAt)) : jobs;

    if (this.activeTab === 'repair') return this._repairReport(scoped);
    if (this.activeTab === 'income') return this._incomeReport();
    if (this.activeTab === 'balance') return this._balanceReport(jobs);
    if (this.activeTab === 'parts') return this._partsReport(scoped);
    if (this.activeTab === 'profit') return this._profitReport(scoped);
    if (this.activeTab === 'technician') return this._technicianReport(scoped);
    return '';
  },

  _repairReport(jobs) {
    const counts = {};
    STATUSES.forEach(s => counts[s] = 0);
    jobs.forEach(j => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return `
      <section class="card">
        <h2 class="card-title">Repair Report</h2>
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-value">${jobs.length}</div><div class="stat-label">Total Jobs</div></div>
          ${STATUSES.map(s => `<div class="stat-box"><div class="stat-value">${counts[s]}</div><div class="stat-label">${s}</div></div>`).join('')}
        </div>
      </section>
    `;
  },

  async _incomeReport() {
    const payments = await DB.getAll('payments');
    const today = Utils.todayISO();
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sum = (arr) => arr.reduce((s, p) => s + (p.amount || 0), 0);
    const todayIncome = sum(payments.filter(p => (p.date || '').slice(0, 10) === today));
    const weekIncome = sum(payments.filter(p => new Date(p.date) >= weekAgo));
    const monthIncome = sum(payments.filter(p => new Date(p.date) >= monthStart));
    const customIncome = (this.dateFrom || this.dateTo) ? sum(payments.filter(p => this._inRange(p.date))) : null;

    return `
      <section class="card">
        <h2 class="card-title">Income Report</h2>
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-value">${Utils.money(todayIncome)}</div><div class="stat-label">Today</div></div>
          <div class="stat-box"><div class="stat-value">${Utils.money(weekIncome)}</div><div class="stat-label">Last 7 Days</div></div>
          <div class="stat-box"><div class="stat-value">${Utils.money(monthIncome)}</div><div class="stat-label">This Month</div></div>
          ${customIncome !== null ? `<div class="stat-box"><div class="stat-value">${Utils.money(customIncome)}</div><div class="stat-label">Selected Range</div></div>` : ''}
        </div>
      </section>
    `;
  },

  _balanceReport(jobs) {
    const withBalance = jobs.filter(j => (j.totalAmount - j.amountPaid) > 0.004);
    const totalBalance = withBalance.reduce((s, j) => s + (j.totalAmount - j.amountPaid), 0);
    return `
      <section class="card">
        <h2 class="card-title">Balance Due Report</h2>
        <p class="muted">Total outstanding: <strong>${Utils.money(totalBalance)}</strong></p>
        <table class="mini-table">
          <thead><tr><th>Customer</th><th>Job Order</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead>
          <tbody>
            ${withBalance.length === 0 ? '<tr><td colspan="5">No outstanding balances 🎉</td></tr>' : withBalance.map(j => `
              <tr><td>${Utils.escapeHtml(j.customerName)}</td><td>${Utils.escapeHtml(j.jobOrderNumber)}</td><td>${Utils.money(j.totalAmount)}</td><td>${Utils.money(j.amountPaid)}</td><td>${Utils.money(j.totalAmount - j.amountPaid)}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `;
  },

  _partsReport(jobs) {
    const map = {};
    jobs.forEach(j => {
      // New-style records: job.items (name, supplier, qty, amount — a single internal amount, no separate cost/charge split)
      (j.items || []).forEach(it => {
        if (!it.name) return;
        if (!map[it.name]) map[it.name] = { name: it.name, qty: 0, cost: null, charge: 0 };
        map[it.name].qty += it.qty || 1;
        map[it.name].charge += it.amount || 0;
      });
      // Legacy records: job.partsUsed (unitCost vs unitCharge tracked separately)
      (j.partsUsed || []).forEach(p => {
        if (!map[p.name]) map[p.name] = { name: p.name, qty: 0, cost: 0, charge: 0 };
        map[p.name].qty += p.quantity;
        map[p.name].cost = (map[p.name].cost || 0) + p.unitCost * p.quantity;
        map[p.name].charge += p.unitCharge * p.quantity;
      });
    });
    const rows = Object.values(map).sort((a, b) => b.qty - a.qty);
    return `
      <section class="card">
        <h2 class="card-title">Parts Report</h2>
        <p class="muted">"Parts Cost" is only available for older records that tracked it separately. Newer Parts/Item entries only track one internal amount, shown under "Parts Amount."</p>
        <table class="mini-table">
          <thead><tr><th>Part</th><th>Qty Used</th><th>Parts Cost</th><th>Parts Amount</th></tr></thead>
          <tbody>
            ${rows.length === 0 ? '<tr><td colspan="4">No parts used in this range.</td></tr>' : rows.map(r => `
              <tr><td>${Utils.escapeHtml(r.name)}</td><td>${r.qty}</td><td>${r.cost === null ? '—' : Utils.money(r.cost)}</td><td>${Utils.money(r.charge)}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `;
  },

  _profitReport(jobs) {
    let charges = 0, partsCost = 0, laborCost = 0, untracked = 0;
    jobs.forEach(j => {
      charges += j.totalAmount || 0;
      if (Array.isArray(j.items) && j.items.length > 0) {
        // New-style records don't track a separate internal cost, only the amount
        // that's already folded into totalAmount — so it can't be subtracted again here.
        untracked += 1;
      } else {
        partsCost += (j.partsUsed || []).reduce((s, p) => s + p.unitCost * p.quantity, 0);
        laborCost += j.laborCost || 0;
      }
    });
    const profit = charges - partsCost - laborCost;
    return `
      <section class="card">
        <h2 class="card-title">Profit Report (internal — owner only)</h2>
        <div class="calc-row"><span>Total Customer Charges</span><span>${Utils.money(charges)}</span></div>
        <div class="calc-row"><span>Parts Cost (legacy records only)</span><span>−${Utils.money(partsCost)}</span></div>
        <div class="calc-row"><span>Labor Cost (legacy records only)</span><span>−${Utils.money(laborCost)}</span></div>
        <div class="calc-row calc-row-total"><span>Estimated Profit</span><span>${Utils.money(profit)}</span></div>
        ${untracked > 0 ? `<p class="muted" style="margin-top:8px;">${untracked} job order(s) use the simplified Parts/Item form, which doesn't track a separate internal cost — so this estimate treats their charges as pure profit. Add a Labor/Service amount there if you want it reflected here.</p>` : ''}
      </section>
    `;
  },

  async _technicianReport(jobs) {
    const technicians = await DB.getAll('technicians');
    const rows = technicians.map(t => {
      const tJobs = jobs.filter(j => j.technicianId === t.id);
      return {
        name: t.name,
        total: tJobs.length,
        completed: tJobs.filter(j => j.status === 'Done' || j.status === 'Released').length,
        released: tJobs.filter(j => j.status === 'Released').length
      };
    });
    return `
      <section class="card">
        <h2 class="card-title">Technician Report</h2>
        <table class="mini-table">
          <thead><tr><th>Technician</th><th>Jobs</th><th>Completed</th><th>Released</th></tr></thead>
          <tbody>
            ${rows.length === 0 ? '<tr><td colspan="4">No technicians yet.</td></tr>' : rows.map(r => `
              <tr><td>${Utils.escapeHtml(r.name)}</td><td>${r.total}</td><td>${r.completed}</td><td>${r.released}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `;
  }
};

window.ReportsModule = ReportsModule;
