/* ==========================================================================
   dashboard.js — Home screen overview
   ========================================================================== */

const DashboardModule = {
  async render() {
    const jobs = await DB.getAll('jobOrders');
    const payments = await DB.getAll('payments');

    const counts = {};
    STATUSES.forEach(s => counts[s] = 0);
    jobs.forEach(j => { counts[j.status] = (counts[j.status] || 0) + 1; });

    const today = Utils.todayISO();
    const todayIncome = payments
      .filter(p => (p.date || '').slice(0, 10) === today)
      .reduce((s, p) => s + (p.amount || 0), 0);

    const outstanding = jobs.reduce((s, j) => s + Math.max(0, (j.totalAmount || 0) - (j.amountPaid || 0)), 0);

    const recentJobs = jobs
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 5);

    return `
      <div class="view-header">
        <h1>Dashboard</h1>
      </div>

      <section class="stat-grid">
        <div class="stat-box stat-box-primary"><div class="stat-value">${jobs.length}</div><div class="stat-label">Total Repair Jobs</div></div>
        <div class="stat-box"><div class="stat-value">${counts['Pending']}</div><div class="stat-label">Pending</div></div>
        <div class="stat-box"><div class="stat-value">${counts['In Progress']}</div><div class="stat-label">In Progress</div></div>
        <div class="stat-box"><div class="stat-value">${counts['Waiting for Parts']}</div><div class="stat-label">Waiting for Parts</div></div>
        <div class="stat-box"><div class="stat-value">${counts['Done']}</div><div class="stat-label">Done</div></div>
        <div class="stat-box"><div class="stat-value">${counts['Released']}</div><div class="stat-label">Released</div></div>
      </section>

      <section class="stat-row">
        <div class="stat-box stat-box-accent"><div class="stat-value">${Utils.money(todayIncome)}</div><div class="stat-label">Today's Repair Income</div></div>
        <div class="stat-box stat-box-warn"><div class="stat-value">${Utils.money(outstanding)}</div><div class="stat-label">Outstanding Balance Due</div></div>
      </section>

      <section class="card">
        <h2 class="card-title">Quick Actions</h2>
        <div class="quick-actions-grid">
          <button class="quick-action" id="qaNewJob">
            <span class="qa-icon">🧾</span><span>New Job Order</span>
          </button>
          <button class="quick-action" id="qaJobOrders">
            <span class="qa-icon">🔧</span><span>Job Orders</span>
          </button>
          <button class="quick-action" id="qaCustomers">
            <span class="qa-icon">👤</span><span>Customers</span>
          </button>
          <button class="quick-action" id="qaPayment">
            <span class="qa-icon">💵</span><span>Record Payment</span>
          </button>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">Recent Job Orders</h2>
        <div class="list">
          ${recentJobs.length === 0 ? '<p class="empty-state">No job orders yet. Create your first one!</p>' : recentJobs.map(j => `
            <div class="list-card" data-id="${j.id}">
              <div class="list-card-main">
                <div class="list-card-title">${Utils.escapeHtml(j.jobOrderNumber)} — ${Utils.escapeHtml(j.customerName)}</div>
                <div class="list-card-sub">${Utils.escapeHtml(j.deviceBrand)} ${Utils.escapeHtml(j.deviceModel)}</div>
              </div>
              <span class="badge ${Utils.statusBadgeClass(j.status)}">${j.status}</span>
            </div>`).join('')}
        </div>
      </section>
    `;
  },

  async afterRender() {
    document.getElementById('qaNewJob').addEventListener('click', () => JobOrdersModule.openForm());
    document.getElementById('qaJobOrders').addEventListener('click', () => { location.hash = '#/joborders'; });
    document.getElementById('qaCustomers').addEventListener('click', () => { location.hash = '#/customers'; });
    document.getElementById('qaPayment').addEventListener('click', () => PaymentsModule.openJobPicker());
    document.querySelectorAll('.list-card').forEach(card => {
      card.addEventListener('click', () => { location.hash = `#/joborders/${card.dataset.id}`; });
    });
  }
};

window.DashboardModule = DashboardModule;
