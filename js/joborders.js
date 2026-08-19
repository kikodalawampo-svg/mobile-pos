/* ==========================================================================
   joborders.js — Job Order System (the heart of the app)
   ========================================================================== */

const STATUSES = ['Pending', 'In Progress', 'Waiting for Parts', 'Done', 'Released', 'Cancelled'];

const JobOrdersModule = {
  searchTerm: '',
  statusFilter: '',
  _draftItems: [], // Parts / Item rows attached while building a new/edit job order form

  async render(params = {}) {
    if (params.id) return this.renderDetail(params.id);

    const jobs = (await DB.getAll('jobOrders')).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const term = this.searchTerm.trim().toLowerCase();

    let filtered = jobs;
    if (this.statusFilter) filtered = filtered.filter(j => j.status === this.statusFilter);
    if (term) {
      filtered = filtered.filter(j =>
        (j.jobOrderNumber || '').toLowerCase().includes(term) ||
        (j.customerName || '').toLowerCase().includes(term) ||
        (j.customerMobile || '').includes(term) ||
        (j.deviceBrand || '').toLowerCase().includes(term) ||
        (j.deviceModel || '').toLowerCase().includes(term) ||
        (j.imei || '').toLowerCase().includes(term)
      );
    }

    return `
      <div class="view-header">
        <h1>Job Orders</h1>
        <button class="btn btn-primary" id="btnNewJob">+ New Job Order</button>
      </div>

      <div class="search-bar">
        <input type="search" id="jobSearch" placeholder="Search Job #, customer, mobile, device, IMEI" value="${Utils.escapeHtml(this.searchTerm)}">
      </div>

      <div class="chip-row" id="statusFilterRow">
        <button class="chip ${this.statusFilter === '' ? 'chip-active' : ''}" data-status="">All</button>
        ${STATUSES.map(s => `<button class="chip ${this.statusFilter === s ? 'chip-active' : ''}" data-status="${s}">${s}</button>`).join('')}
      </div>

      <div class="list">
        ${filtered.length === 0 ? '<p class="empty-state">No job orders found.</p>' : filtered.map(j => `
          <div class="list-card" data-id="${j.id}">
            <div class="list-card-main">
              <div class="list-card-title">${Utils.escapeHtml(j.jobOrderNumber)}</div>
              <div class="list-card-sub">${Utils.escapeHtml(j.customerName)} · ${Utils.escapeHtml(j.deviceBrand)} ${Utils.escapeHtml(j.deviceModel)}</div>
              <div class="list-card-sub muted">${Utils.formatDate(j.createdAt)}</div>
            </div>
            <div class="list-card-end">
              <span class="badge ${Utils.statusBadgeClass(j.status)}">${j.status}</span>
              <span class="badge ${Utils.paymentBadgeClass(j.paymentStatus)}">${j.paymentStatus}</span>
            </div>
          </div>`).join('')}
      </div>
    `;
  },

  async afterRender(params = {}) {
    if (params.id) return this.afterRenderDetail(params.id);

    document.getElementById('btnNewJob').addEventListener('click', () => this.openForm());
    document.getElementById('jobSearch').addEventListener('input', Utils.debounce((e) => {
      this.searchTerm = e.target.value;
      Router.render();
    }, 200));
    document.querySelectorAll('#statusFilterRow .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.statusFilter = chip.dataset.status;
        Router.render();
      });
    });
    document.querySelectorAll('.list-card').forEach(card => {
      card.addEventListener('click', () => { location.hash = `#/joborders/${card.dataset.id}`; });
    });
  },

  /* --------------------------- New / Edit Job Order --------------------------- */

  async openForm(job = null, presetCustomer = null) {
    const isEdit = !!job;
    this._draftItems = this._loadDraftItems(job);

    const customers = await DB.getAll('customers');
    const technicians = await DB.getAll('technicians');

    const html = `
      <div class="modal-header">
        <h2>${isEdit ? 'Edit Job Order — ' + Utils.escapeHtml(job.jobOrderNumber) : 'New Job Order'}</h2>
        <button class="icon-btn" id="modalClose">✕</button>
      </div>
      <form id="jobOrderForm" class="modal-body form-grid">

        <h3 class="form-section-title">Customer</h3>
        <label class="field">
          <span>Existing Customer</span>
          <select id="customerSelect">
            <option value="">— Select existing customer —</option>
            ${customers.map(c => `<option value="${c.id}" ${presetCustomer && presetCustomer.id === c.id ? 'selected' : ''} ${isEdit && job.customerId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.name)} (${Utils.escapeHtml(c.mobile || 'no #')})</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Customer Name *</span>
          <input type="text" name="customerName" id="customerNameInput" value="${isEdit ? Utils.escapeHtml(job.customerName) : (presetCustomer ? Utils.escapeHtml(presetCustomer.name) : '')}" required>
        </label>
        <label class="field">
          <span>Mobile Number</span>
          <input type="tel" name="customerMobile" id="customerMobileInput" value="${isEdit ? Utils.escapeHtml(job.customerMobile || '') : (presetCustomer ? Utils.escapeHtml(presetCustomer.mobile || '') : '')}">
        </label>

        <h3 class="form-section-title">Device Information</h3>
        <label class="field">
          <span>Brand *</span>
          <input type="text" name="deviceBrand" value="${isEdit ? Utils.escapeHtml(job.deviceBrand || '') : ''}" required placeholder="e.g. Samsung">
        </label>
        <label class="field">
          <span>Model *</span>
          <input type="text" name="deviceModel" value="${isEdit ? Utils.escapeHtml(job.deviceModel || '') : ''}" required placeholder="e.g. Galaxy A14">
        </label>
        <label class="field">
          <span>IMEI / Serial Number</span>
          <input type="text" name="imei" value="${isEdit ? Utils.escapeHtml(job.imei || '') : ''}">
        </label>
        <label class="field">
          <span>Device Color</span>
          <input type="text" name="deviceColor" value="${isEdit ? Utils.escapeHtml(job.deviceColor || '') : ''}">
        </label>
        <label class="field">
          <span>Device Condition</span>
          <input type="text" name="deviceCondition" value="${isEdit ? Utils.escapeHtml(job.deviceCondition || '') : ''}" placeholder="e.g. cracked screen, scratches">
        </label>
        <label class="field">
          <span>Accessories Received</span>
          <input type="text" name="accessories" value="${isEdit ? Utils.escapeHtml(job.accessories || '') : ''}" placeholder="e.g. charger, SIM card">
        </label>

        <h3 class="form-section-title">Repair Information</h3>
        <label class="field">
          <span>Customer Reported Problem *</span>
          <textarea name="reportedProblem" rows="2" required>${isEdit ? Utils.escapeHtml(job.reportedProblem || '') : ''}</textarea>
        </label>
        <label class="field">
          <span>Diagnosis</span>
          <textarea name="diagnosis" rows="2">${isEdit ? Utils.escapeHtml(job.diagnosis || '') : ''}</textarea>
        </label>
        <label class="field">
          <span>Job Description *</span>
          <textarea name="jobDescription" rows="2" required placeholder="e.g. Replace LCD, Charging problem, Battery replacement">${isEdit ? Utils.escapeHtml(job.jobDescription || '') : ''}</textarea>
        </label>
        <label class="field">
          <span>Technician</span>
          <select name="technicianId">
            <option value="">— Unassigned —</option>
            ${technicians.map(t => `<option value="${t.id}" ${isEdit && job.technicianId === t.id ? 'selected' : ''}>${Utils.escapeHtml(t.name)}</option>`).join('')}
          </select>
        </label>
        <h3 class="form-section-title">Parts / Item</h3>
        <div id="itemsList" class="draft-parts-list"></div>
        <button type="button" class="btn btn-secondary" id="btnAddItemRow">+ Add Another Part / Item</button>

        <h3 class="form-section-title">Labor / Service</h3>
        <label class="field">
          <span>Labor / Service</span>
          <input type="text" id="laborDescription" placeholder="Enter labor or service description" value="${isEdit ? Utils.escapeHtml((job.labor && job.labor.description) || '') : ''}">
        </label>
        <label class="field">
          <span>Amount</span>
          <input type="number" id="laborAmount" min="0" step="0.01" value="${isEdit ? (job.labor ? job.labor.amount : (job.laborCharge || 0)) : 0}">
        </label>

        <label class="field">
          <span>Discount (optional)</span>
          <input type="number" id="discount" min="0" step="0.01" value="${isEdit ? job.discount || 0 : 0}">
        </label>

        <h3 class="form-section-title">Total Amount</h3>
        <div class="total-amount-box">
          <label class="field">
            <span>Total Amount (editable by owner) *</span>
            <input type="number" id="totalAmountOverride" min="0" step="0.01" value="${isEdit ? job.totalAmount || 0 : ''}" placeholder="auto-calculated, adjust if needed" required>
          </label>
        </div>

        <h3 class="form-section-title">Payment</h3>
        <label class="field">
          <span>Amount Paid Now</span>
          <input type="number" id="amountPaidNow" min="0" step="0.01" value="${isEdit ? '' : 0}" placeholder="0.00">
        </label>
        <label class="field">
          <span>Payment Method</span>
          <select id="paymentMethod">
            <option>Cash</option>
            <option>GCash</option>
            <option>Bank Transfer</option>
            <option>Other</option>
          </select>
        </label>

        <label class="field">
          <span>Status</span>
          <select name="status">
            ${STATUSES.map(s => `<option value="${s}" ${isEdit && job.status === s ? 'selected' : (!isEdit && s === 'Pending' ? 'selected' : '')}>${s}</option>`).join('')}
          </select>
        </label>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Job Order' : 'Save Job Order'}</button>
        </div>
      </form>
    `;

    Utils.openModal(html, 'modal-lg');
    document.getElementById('modalClose').onclick = Utils.closeModal;
    document.getElementById('cancelBtn').onclick = Utils.closeModal;

    // Autofill from existing customer
    document.getElementById('customerSelect').addEventListener('change', async (e) => {
      if (!e.target.value) return;
      const c = await DB.get('customers', e.target.value);
      if (c) {
        document.getElementById('customerNameInput').value = c.name;
        document.getElementById('customerMobileInput').value = c.mobile || '';
      }
    });

    this._renderItems();

    document.getElementById('btnAddItemRow').addEventListener('click', () => {
      this._draftItems.push({ id: Utils.uid('item_'), name: '', supplier: '', qty: 1, amount: 0 });
      this._renderItems();
      this._recalc();
    });

    document.getElementById('laborAmount').addEventListener('input', () => this._recalc());
    document.getElementById('discount').addEventListener('input', () => this._recalc());

    // If the owner manually edits the total, stop auto-recalculating it.
    document.getElementById('totalAmountOverride').addEventListener('input', (e) => {
      e.target.dataset.auto = 'false';
    });

    this._recalc(isEdit ? job.totalAmount : null);

    document.getElementById('jobOrderForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._submitForm(e.target, job, isEdit);
    });
  },

  /** Build the initial Parts / Item draft array — reads new-style job.items,
   *  or falls back to converting a legacy job.partsUsed record for editing. */
  _loadDraftItems(job) {
    if (!job) return [{ id: Utils.uid('item_'), name: '', supplier: '', qty: 1, amount: 0 }];
    if (Array.isArray(job.items) && job.items.length > 0) {
      return job.items.map(it => ({ ...it }));
    }
    if (Array.isArray(job.partsUsed) && job.partsUsed.length > 0) {
      // Legacy record — convert for display/editing only, original data is untouched on disk
      // unless the owner saves changes.
      return job.partsUsed.map(p => ({
        id: Utils.uid('item_'),
        name: p.name || '',
        supplier: job.supplierName || '',
        qty: p.quantity || 1,
        amount: (p.unitCharge || 0) * (p.quantity || 1)
      }));
    }
    return [{ id: Utils.uid('item_'), name: '', supplier: '', qty: 1, amount: 0 }];
  },

  _renderItems() {
    const host = document.getElementById('itemsList');
    host.innerHTML = this._draftItems.map((item, idx) => `
      <div class="item-row" data-idx="${idx}">
        <label class="field">
          <span>Part / Item Name</span>
          <input type="text" class="item-name-input" data-idx="${idx}" placeholder="Enter part or item name" value="${Utils.escapeHtml(item.name)}">
        </label>
        <label class="field">
          <span>Supplier</span>
          <input type="text" class="item-supplier-input" data-idx="${idx}" placeholder="Enter supplier name (optional)" value="${Utils.escapeHtml(item.supplier)}">
        </label>
        <div class="item-row-numbers">
          <label class="field">
            <span>PCS / Qty</span>
            <input type="number" class="item-qty-input" data-idx="${idx}" min="1" value="${item.qty}">
          </label>
          <label class="field">
            <span>Amount</span>
            <input type="number" class="item-amount-input" data-idx="${idx}" min="0" step="0.01" placeholder="0.00" value="${item.amount}">
          </label>
          ${this._draftItems.length > 1 ? `<button type="button" class="icon-btn remove-item-row" data-idx="${idx}" title="Remove">🗑️</button>` : ''}
        </div>
      </div>`).join('');

    host.querySelectorAll('.item-name-input').forEach(el => {
      el.addEventListener('input', (e) => { this._draftItems[+e.target.dataset.idx].name = e.target.value; });
    });
    host.querySelectorAll('.item-supplier-input').forEach(el => {
      el.addEventListener('input', (e) => { this._draftItems[+e.target.dataset.idx].supplier = e.target.value; });
    });
    host.querySelectorAll('.item-qty-input').forEach(el => {
      el.addEventListener('input', (e) => { this._draftItems[+e.target.dataset.idx].qty = Math.max(1, parseInt(e.target.value, 10) || 1); });
    });
    host.querySelectorAll('.item-amount-input').forEach(el => {
      el.addEventListener('input', (e) => {
        this._draftItems[+e.target.dataset.idx].amount = Utils.num(e.target.value);
        this._recalc();
      });
    });
    host.querySelectorAll('.remove-item-row').forEach(btn => {
      btn.addEventListener('click', () => {
        this._draftItems.splice(parseInt(btn.dataset.idx, 10), 1);
        this._renderItems();
        this._recalc();
      });
    });
  },

  /** Total Amount = Total Parts/Items Amount + Labor/Service Amount − Discount.
   *  No breakdown is shown to match the simplified UI — only the final total. */
  _recalc(overrideTotal = null) {
    const itemsTotal = this._draftItems.reduce((sum, it) => sum + (Utils.num(it.amount)), 0);
    const laborAmount = Utils.num(document.getElementById('laborAmount').value);
    const discount = Utils.num(document.getElementById('discount').value);
    const calcTotal = Math.max(0, itemsTotal + laborAmount - discount);

    const totalInput = document.getElementById('totalAmountOverride');
    if (overrideTotal === null && (totalInput.value === '' || totalInput.dataset.auto === 'true')) {
      totalInput.value = calcTotal.toFixed(2);
      totalInput.dataset.auto = 'true';
    }
  },

  async _submitForm(form, job, isEdit) {
    const fd = new FormData(form);
    const customerName = fd.get('customerName').trim();
    const customerMobile = fd.get('customerMobile').trim();
    if (!customerName) { Utils.toast('Customer name is required', 'error'); return; }

    // Resolve or create customer record
    let customerId = document.getElementById('customerSelect').value;
    if (!customerId) {
      const matches = await DB.getByIndex('customers', 'name', customerName);
      const match = matches.find(c => (c.mobile || '') === customerMobile);
      if (match) {
        customerId = match.id;
      } else {
        const newCust = {
          id: Utils.uid('cust_'),
          name: customerName,
          mobile: customerMobile,
          address: '',
          notes: '',
          createdAt: Utils.nowISO()
        };
        await DB.add('customers', newCust);
        customerId = newCust.id;
      }
    }

    const totalAmount = Utils.num(document.getElementById('totalAmountOverride').value);
    if (totalAmount < 0) { Utils.toast('Total amount cannot be negative', 'error'); return; }

    const discount = Utils.num(document.getElementById('discount').value);
    const amountPaidNow = Utils.num(document.getElementById('amountPaidNow').value);
    const paymentMethod = document.getElementById('paymentMethod').value;

    // Parts / Item rows — drop fully-empty rows (no name and no amount) before saving
    const items = this._draftItems
      .filter(it => (it.name && it.name.trim()) || Utils.num(it.amount) > 0)
      .map(it => ({
        id: it.id || Utils.uid('item_'),
        name: (it.name || '').trim(),
        supplier: (it.supplier || '').trim(),
        qty: Math.max(1, parseInt(it.qty, 10) || 1),
        amount: Utils.num(it.amount)
      }));

    const laborDescription = document.getElementById('laborDescription').value.trim();
    const laborAmount = Utils.num(document.getElementById('laborAmount').value);

    const priorPaid = isEdit ? (job.amountPaid || 0) : 0;
    const amountPaid = priorPaid + amountPaidNow;
    if (amountPaid > totalAmount) {
      const ok = await Utils.confirmDialog('Amount paid exceeds the total amount. Continue anyway?');
      if (!ok) return;
    }
    const paymentStatus = Utils.paymentStatusFor(totalAmount, amountPaid);

    const technicianId = fd.get('technicianId') || '';
    const technicians = await DB.getAll('technicians');
    const technician = technicians.find(t => t.id === technicianId);

    const record = {
      id: isEdit ? job.id : Utils.uid('job_'),
      jobOrderNumber: isEdit ? job.jobOrderNumber : await Utils.nextJobOrderNumber(),
      customerId, customerName, customerMobile,
      deviceBrand: fd.get('deviceBrand').trim(),
      deviceModel: fd.get('deviceModel').trim(),
      imei: fd.get('imei').trim(),
      deviceColor: fd.get('deviceColor').trim(),
      deviceCondition: fd.get('deviceCondition').trim(),
      accessories: fd.get('accessories').trim(),
      reportedProblem: fd.get('reportedProblem').trim(),
      diagnosis: fd.get('diagnosis').trim(),
      jobDescription: fd.get('jobDescription').trim(),
      technicianId, technicianName: technician ? technician.name : '',
      items,
      labor: { description: laborDescription, amount: laborAmount },
      discount,
      totalAmount, amountPaid, paymentStatus,
      status: fd.get('status'),
      statusHistory: isEdit ? (job.statusHistory || []) : [],
      createdAt: isEdit ? job.createdAt : Utils.nowISO(),
      updatedAt: Utils.nowISO(),
      releasedAt: isEdit ? job.releasedAt || null : null,
      releasedBy: isEdit ? job.releasedBy || '' : ''
    };

    if (!isEdit || job.status !== record.status) {
      record.statusHistory.push({ status: record.status, at: Utils.nowISO() });
    }

    await DB.put('jobOrders', record);

    if (amountPaidNow > 0) {
      await DB.add('payments', {
        id: Utils.uid('pay_'),
        jobOrderId: record.id,
        jobOrderNumber: record.jobOrderNumber,
        customerName: record.customerName,
        amount: amountPaidNow,
        method: paymentMethod,
        notes: isEdit ? 'Additional payment on edit' : 'Initial payment',
        recordedBy: 'Shop Owner',
        date: Utils.nowISO(),
        previousBalance: totalAmount - priorPaid,
        newBalance: totalAmount - amountPaid
      });
    }

    await Utils.logActivity(isEdit ? 'Job order updated' : 'Job order created', record.jobOrderNumber);
    Utils.closeModal();
    Utils.toast(isEdit ? 'Job order updated' : `Job order ${record.jobOrderNumber} created`, 'success');
    location.hash = `#/joborders/${record.id}`;
  },

  /* --------------------------------- Detail --------------------------------- */

  async renderDetail(id) {
    const job = await DB.get('jobOrders', id);
    if (!job) return '<p class="empty-state">Job order not found.</p>';
    const payments = (await DB.getByIndex('payments', 'jobOrderId', id)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const balance = (job.totalAmount || 0) - (job.amountPaid || 0);

    return `
      <div class="view-header">
        <button class="btn btn-ghost btn-back" id="btnBack">‹ Job Orders</button>
      </div>

      <section class="card">
        <div class="job-detail-header">
          <div>
            <h1>${Utils.escapeHtml(job.jobOrderNumber)}</h1>
            <p class="muted">${Utils.formatDateTime(job.createdAt)}</p>
          </div>
          <div class="badges-col">
            <span class="badge ${Utils.statusBadgeClass(job.status)}">${job.status}</span>
            <span class="badge ${Utils.paymentBadgeClass(job.paymentStatus)}">${job.paymentStatus}</span>
          </div>
        </div>

        <div class="detail-grid">
          <div><span class="detail-label">Customer</span><span>${Utils.escapeHtml(job.customerName)}</span></div>
          <div><span class="detail-label">Mobile</span><span>${Utils.escapeHtml(job.customerMobile || '—')}</span></div>
          <div><span class="detail-label">Device</span><span>${Utils.escapeHtml(job.deviceBrand)} ${Utils.escapeHtml(job.deviceModel)}</span></div>
          <div><span class="detail-label">IMEI / Serial</span><span>${Utils.escapeHtml(job.imei || '—')}</span></div>
          <div><span class="detail-label">Color</span><span>${Utils.escapeHtml(job.deviceColor || '—')}</span></div>
          <div><span class="detail-label">Condition</span><span>${Utils.escapeHtml(job.deviceCondition || '—')}</span></div>
          <div><span class="detail-label">Accessories</span><span>${Utils.escapeHtml(job.accessories || '—')}</span></div>
          <div><span class="detail-label">Technician</span><span>${Utils.escapeHtml(job.technicianName || 'Unassigned')}</span></div>
          ${job.supplierName ? `<div><span class="detail-label">Supplier</span><span>${Utils.escapeHtml(job.supplierName)}</span></div>` : ''}
        </div>

        <div class="detail-block">
          <span class="detail-label">Reported Problem</span>
          <p>${Utils.escapeHtml(job.reportedProblem || '—')}</p>
        </div>
        <div class="detail-block">
          <span class="detail-label">Diagnosis</span>
          <p>${Utils.escapeHtml(job.diagnosis || '—')}</p>
        </div>
        <div class="detail-block">
          <span class="detail-label">Job Description</span>
          <p>${Utils.escapeHtml(job.jobDescription || '—')}</p>
        </div>

        ${job.items && job.items.length > 0 ? `
        <div class="detail-block">
          <span class="detail-label">Parts / Item (internal)</span>
          <table class="mini-table">
            <thead><tr><th>Name</th><th>Supplier</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>
              ${job.items.map(it => `<tr><td>${Utils.escapeHtml(it.name)}</td><td>${Utils.escapeHtml(it.supplier || '—')}</td><td>${it.qty}</td><td>${Utils.money(it.amount)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>` : (job.partsUsed && job.partsUsed.length > 0 ? `
        <div class="detail-block">
          <span class="detail-label">Parts Used (internal — legacy record)</span>
          <table class="mini-table">
            <thead><tr><th>Part</th><th>Qty</th><th>Cost</th><th>Charge</th></tr></thead>
            <tbody>
              ${job.partsUsed.map(p => `<tr><td>${Utils.escapeHtml(p.name)}</td><td>${p.quantity}</td><td>${Utils.money(p.unitCost * p.quantity)}</td><td>${Utils.money(p.unitCharge * p.quantity)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>` : '')}

        ${job.labor && (job.labor.description || job.labor.amount) ? `
        <div class="detail-block internal-money">
          <span class="detail-label">Labor / Service (internal)</span>
          <div class="calc-row"><span>${Utils.escapeHtml(job.labor.description || '—')}</span><span>${Utils.money(job.labor.amount)}</span></div>
          ${job.discount ? `<div class="calc-row"><span>Discount</span><span>−${Utils.money(job.discount)}</span></div>` : ''}
        </div>` : ((job.laborCost || job.laborCharge) ? `
        <div class="detail-block internal-money">
          <span class="detail-label">Labor / Service (internal — legacy record)</span>
          <div class="calc-row"><span>Labor cost</span><span>${Utils.money(job.laborCost)}</span></div>
          <div class="calc-row"><span>Labor charge</span><span>${Utils.money(job.laborCharge)}</span></div>
          ${job.discount ? `<div class="calc-row"><span>Discount</span><span>−${Utils.money(job.discount)}</span></div>` : ''}
        </div>` : '')}

        <div class="detail-block money-summary">
          <div class="calc-row calc-row-total"><span>Total Amount</span><span>${Utils.money(job.totalAmount)}</span></div>
          <div class="calc-row"><span>Amount Paid</span><span>${Utils.money(job.amountPaid)}</span></div>
          <div class="calc-row calc-row-balance"><span>Balance Due</span><span>${Utils.money(balance)}</span></div>
        </div>

        <div class="btn-row">
          <button class="btn btn-secondary" id="btnEditJob">Edit</button>
          <button class="btn btn-secondary" id="btnPrintTicket">🖨️ Print Ticket</button>
          ${balance > 0.004 ? `<button class="btn btn-primary" id="btnRecordPayment">Record Payment</button>` : ''}
          ${job.status !== 'Released' && job.status !== 'Cancelled' ? `<button class="btn btn-primary" id="btnRelease">Release Device</button>` : ''}
        </div>

        <div class="field">
          <span class="detail-label">Change Status</span>
          <div class="chip-row">
            ${STATUSES.map(s => `<button class="chip status-chip ${job.status === s ? 'chip-active' : ''}" data-status="${s}">${s}</button>`).join('')}
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">Status History</h2>
        <ul class="simple-list">
          ${(job.statusHistory || []).slice().reverse().map(h => `<li>${h.status} — <span class="muted">${Utils.formatDateTime(h.at)}</span></li>`).join('') || '<li class="empty-row">No history yet.</li>'}
        </ul>
      </section>

      <section class="card">
        <h2 class="card-title">Payment History</h2>
        <div class="list">
          ${payments.length === 0 ? '<p class="empty-state">No payments recorded yet.</p>' : payments.map(p => `
            <div class="list-card" data-payment-id="${p.id}">
              <div class="list-card-main">
                <div class="list-card-title">${Utils.money(p.amount)} · ${Utils.escapeHtml(p.method)}</div>
                <div class="list-card-sub">${Utils.formatDateTime(p.date)}</div>
              </div>
              <button class="btn btn-ghost btn-sm print-receipt-btn" data-payment-id="${p.id}">Receipt</button>
            </div>`).join('')}
        </div>
      </section>
    `;
  },

  async afterRenderDetail(id) {
    document.getElementById('btnBack').addEventListener('click', () => { location.hash = '#/joborders'; });
    const job = await DB.get('jobOrders', id);

    document.getElementById('btnEditJob').addEventListener('click', () => this.openForm(job));
    document.getElementById('btnPrintTicket').addEventListener('click', () => PrintModule.printJobTicket(job.id));

    const payBtn = document.getElementById('btnRecordPayment');
    if (payBtn) payBtn.addEventListener('click', () => PaymentsModule.openRecordPaymentForm(job.id));

    const releaseBtn = document.getElementById('btnRelease');
    if (releaseBtn) releaseBtn.addEventListener('click', () => this.openReleaseForm(job));

    document.querySelectorAll('.status-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const newStatus = chip.dataset.status;
        if (newStatus === job.status) return;
        await this.changeStatus(job.id, newStatus);
        Router.render();
      });
    });

    document.querySelectorAll('.print-receipt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        PrintModule.printPaymentReceipt(btn.dataset.paymentId);
      });
    });
  },

  async changeStatus(jobId, newStatus) {
    const job = await DB.get('jobOrders', jobId);
    if (!job) return;
    job.status = newStatus;
    job.statusHistory = job.statusHistory || [];
    job.statusHistory.push({ status: newStatus, at: Utils.nowISO() });
    job.updatedAt = Utils.nowISO();
    await DB.put('jobOrders', job);
    await Utils.logActivity('Status changed', `${job.jobOrderNumber} → ${newStatus}`);
    Utils.toast(`Status updated to ${newStatus}`, 'success');
  },

  async openReleaseForm(job) {
    const balance = (job.totalAmount || 0) - (job.amountPaid || 0);
    const canBlockRelease = balance > 0.004;
    const settings = await SettingsModule.get();

    const html = `
      <div class="modal-header">
        <h2>Release Device</h2>
        <button class="icon-btn" id="modalClose">✕</button>
      </div>
      <div class="modal-body">
        <div class="release-summary">
          <div class="calc-row"><span>Job Order</span><span>${Utils.escapeHtml(job.jobOrderNumber)}</span></div>
          <div class="calc-row"><span>Customer</span><span>${Utils.escapeHtml(job.customerName)}</span></div>
          <div class="calc-row"><span>Total Amount</span><span>${Utils.money(job.totalAmount)}</span></div>
          <div class="calc-row"><span>Amount Paid</span><span>${Utils.money(job.amountPaid)}</span></div>
          <div class="calc-row calc-row-balance"><span>Balance Due</span><span>${Utils.money(balance)}</span></div>
          <div class="calc-row"><span>Payment Status</span><span class="badge ${Utils.paymentBadgeClass(job.paymentStatus)}">${job.paymentStatus}</span></div>
        </div>
        ${canBlockRelease ? `<p class="warning-text">This device has a balance due. As the shop owner, confirm you want to allow release with an unpaid balance.</p>` : ''}
        <label class="field">
          <span>Released By *</span>
          <input type="text" id="releasedByInput" value="${Utils.escapeHtml(settings.shopName || '')}" required>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmReleaseBtn">Confirm Release</button>
        </div>
      </div>
    `;
    Utils.openModal(html);
    document.getElementById('modalClose').onclick = Utils.closeModal;
    document.getElementById('cancelBtn').onclick = Utils.closeModal;
    document.getElementById('confirmReleaseBtn').addEventListener('click', async () => {
      const releasedBy = document.getElementById('releasedByInput').value.trim() || 'Shop Owner';
      job.status = 'Released';
      job.releasedAt = Utils.nowISO();
      job.releasedBy = releasedBy;
      job.statusHistory = job.statusHistory || [];
      job.statusHistory.push({ status: 'Released', at: Utils.nowISO() });
      job.updatedAt = Utils.nowISO();
      await DB.put('jobOrders', job);
      await Utils.logActivity('Device released', `${job.jobOrderNumber} by ${releasedBy}`);
      Utils.closeModal();
      Utils.toast('Device released', 'success');
      Router.render();
    });
  }
};

window.JobOrdersModule = JobOrdersModule;
