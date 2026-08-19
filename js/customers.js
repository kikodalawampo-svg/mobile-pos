/* ==========================================================================
   customers.js — Customer Management
   ========================================================================== */

const CustomersModule = {
  searchTerm: '',

  async render(params = {}) {
    if (params.id) return this.renderProfile(params.id);

    const customers = await DB.getAll('customers');
    customers.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const term = this.searchTerm.trim().toLowerCase();
    const filtered = term
      ? customers.filter(c => c.name.toLowerCase().includes(term) || (c.mobile || '').includes(term))
      : customers;

    return `
      <div class="view-header">
        <h1>Customers</h1>
        <button class="btn btn-primary" id="btnAddCustomer">+ New Customer</button>
      </div>

      <div class="search-bar">
        <input type="search" id="customerSearch" placeholder="Search by name or mobile number" value="${Utils.escapeHtml(this.searchTerm)}">
      </div>

      <div class="list">
        ${filtered.length === 0 ? '<p class="empty-state">No customers found. Tap "+ New Customer" to add one.</p>' : filtered.map(c => `
          <div class="list-card" data-id="${c.id}">
            <div class="list-card-main">
              <div class="list-card-title">${Utils.escapeHtml(c.name)}</div>
              <div class="list-card-sub">${Utils.escapeHtml(c.mobile || 'No number')}</div>
            </div>
            <div class="list-card-chevron">›</div>
          </div>`).join('')}
      </div>
    `;
  },

  async afterRender(params = {}) {
    if (params.id) return this.afterRenderProfile(params.id);

    document.getElementById('btnAddCustomer').addEventListener('click', () => this.openForm());

    document.getElementById('customerSearch').addEventListener('input', Utils.debounce((e) => {
      this.searchTerm = e.target.value;
      Router.render();
    }, 200));

    document.querySelectorAll('.list-card').forEach(card => {
      card.addEventListener('click', () => {
        location.hash = `#/customers/${card.dataset.id}`;
      });
    });
  },

  openForm(customer = null) {
    const isEdit = !!customer;
    const html = `
      <div class="modal-header">
        <h2>${isEdit ? 'Edit Customer' : 'New Customer'}</h2>
        <button class="icon-btn" id="modalClose">✕</button>
      </div>
      <form id="customerForm" class="modal-body form-grid">
        <label class="field">
          <span>Customer Name *</span>
          <input type="text" name="name" value="${isEdit ? Utils.escapeHtml(customer.name) : ''}" required>
        </label>
        <label class="field">
          <span>Mobile Number</span>
          <input type="tel" name="mobile" value="${isEdit ? Utils.escapeHtml(customer.mobile || '') : ''}">
        </label>
        <label class="field">
          <span>Address</span>
          <input type="text" name="address" value="${isEdit ? Utils.escapeHtml(customer.address || '') : ''}">
        </label>
        <label class="field">
          <span>Notes</span>
          <textarea name="notes" rows="2">${isEdit ? Utils.escapeHtml(customer.notes || '') : ''}</textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Customer'}</button>
        </div>
      </form>
    `;
    Utils.openModal(html);
    document.getElementById('modalClose').onclick = Utils.closeModal;
    document.getElementById('cancelBtn').onclick = Utils.closeModal;
    document.getElementById('customerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = fd.get('name').trim();
      if (!name) { Utils.toast('Customer name is required', 'error'); return; }
      const record = {
        id: isEdit ? customer.id : Utils.uid('cust_'),
        name,
        mobile: fd.get('mobile').trim(),
        address: fd.get('address').trim(),
        notes: fd.get('notes').trim(),
        createdAt: isEdit ? customer.createdAt : Utils.nowISO()
      };
      await DB.put('customers', record);
      await Utils.logActivity(isEdit ? 'Customer updated' : 'Customer added', record.name);
      Utils.closeModal();
      Utils.toast(isEdit ? 'Customer updated' : 'Customer added', 'success');
      Router.render();
    });
  },

  async renderProfile(id) {
    const customer = await DB.get('customers', id);
    if (!customer) return '<p class="empty-state">Customer not found.</p>';
    const jobs = (await DB.getByIndex('jobOrders', 'customerId', id))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    let totalAmount = 0, totalPaid = 0;
    jobs.forEach(j => { totalAmount += j.totalAmount || 0; totalPaid += j.amountPaid || 0; });
    const balance = totalAmount - totalPaid;

    return `
      <div class="view-header">
        <button class="btn btn-ghost btn-back" id="btnBack">‹ Customers</button>
      </div>
      <section class="card profile-card">
        <h1>${Utils.escapeHtml(customer.name)}</h1>
        <p class="muted">${Utils.escapeHtml(customer.mobile || 'No mobile number')}</p>
        ${customer.address ? `<p class="muted">${Utils.escapeHtml(customer.address)}</p>` : ''}
        ${customer.notes ? `<p class="notes-block">${Utils.escapeHtml(customer.notes)}</p>` : ''}
        <div class="btn-row">
          <button class="btn btn-secondary" id="btnEditCustomer">Edit</button>
          <button class="btn btn-primary" id="btnNewJobForCustomer">+ New Job Order</button>
        </div>
      </section>

      <section class="stat-row">
        <div class="stat-box"><div class="stat-value">${jobs.length}</div><div class="stat-label">Total Jobs</div></div>
        <div class="stat-box"><div class="stat-value">${Utils.money(totalPaid)}</div><div class="stat-label">Total Paid</div></div>
        <div class="stat-box"><div class="stat-value">${Utils.money(balance)}</div><div class="stat-label">Balance Due</div></div>
      </section>

      <section class="card">
        <h2 class="card-title">Repair History</h2>
        <div class="list">
          ${jobs.length === 0 ? '<p class="empty-state">No job orders yet.</p>' : jobs.map(j => `
            <div class="list-card" data-id="${j.id}">
              <div class="list-card-main">
                <div class="list-card-title">${Utils.escapeHtml(j.jobOrderNumber)} — ${Utils.escapeHtml(j.deviceBrand)} ${Utils.escapeHtml(j.deviceModel)}</div>
                <div class="list-card-sub">${Utils.formatDate(j.createdAt)} · ${Utils.money(j.totalAmount)}</div>
              </div>
              <span class="badge ${Utils.statusBadgeClass(j.status)}">${j.status}</span>
            </div>`).join('')}
        </div>
      </section>
    `;
  },

  async afterRenderProfile(id) {
    document.getElementById('btnBack').addEventListener('click', () => { location.hash = '#/customers'; });
    const customer = await DB.get('customers', id);
    document.getElementById('btnEditCustomer').addEventListener('click', () => this.openForm(customer));
    document.getElementById('btnNewJobForCustomer').addEventListener('click', () => {
      JobOrdersModule.openForm(null, customer);
    });
    document.querySelectorAll('.list-card').forEach(card => {
      card.addEventListener('click', () => { location.hash = `#/joborders/${card.dataset.id}`; });
    });
  }
};

window.CustomersModule = CustomersModule;
