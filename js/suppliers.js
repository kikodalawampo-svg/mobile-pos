/* ==========================================================================
   suppliers.js — Supplier Management
   ========================================================================== */

const SuppliersModule = {
  async render(params = {}) {
    if (params.id) return this.renderProfile(params.id);

    const suppliers = (await DB.getAll('suppliers')).sort((a, b) => a.name.localeCompare(b.name));
    return `
      <div class="view-header">
        <h1>Suppliers</h1>
        <button class="btn btn-primary" id="btnAddSupplier">+ New Supplier</button>
      </div>
      <div class="list">
        ${suppliers.length === 0 ? '<p class="empty-state">No suppliers yet.</p>' : suppliers.map(s => `
          <div class="list-card" data-id="${s.id}">
            <div class="list-card-main">
              <div class="list-card-title">${Utils.escapeHtml(s.name)}</div>
              <div class="list-card-sub">${Utils.escapeHtml(s.contact || 'No contact number')}</div>
            </div>
            <div class="list-card-chevron">›</div>
          </div>`).join('')}
      </div>
    `;
  },

  async afterRender(params = {}) {
    if (params.id) return this.afterRenderProfile(params.id);
    document.getElementById('btnAddSupplier').addEventListener('click', () => this.openForm());
    document.querySelectorAll('.list-card').forEach(card => {
      card.addEventListener('click', () => { location.hash = `#/suppliers/${card.dataset.id}`; });
    });
  },

  openForm(supplier = null) {
    const isEdit = !!supplier;
    const html = `
      <div class="modal-header">
        <h2>${isEdit ? 'Edit Supplier' : 'New Supplier'}</h2>
        <button class="icon-btn" id="modalClose">✕</button>
      </div>
      <form id="supplierForm" class="modal-body form-grid">
        <label class="field">
          <span>Supplier Name *</span>
          <input type="text" name="name" value="${isEdit ? Utils.escapeHtml(supplier.name) : ''}" required>
        </label>
        <label class="field">
          <span>Contact Number</span>
          <input type="tel" name="contact" value="${isEdit ? Utils.escapeHtml(supplier.contact || '') : ''}">
        </label>
        <label class="field">
          <span>Address</span>
          <input type="text" name="address" value="${isEdit ? Utils.escapeHtml(supplier.address || '') : ''}">
        </label>
        <label class="field">
          <span>Notes</span>
          <textarea name="notes" rows="2">${isEdit ? Utils.escapeHtml(supplier.notes || '') : ''}</textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Supplier'}</button>
        </div>
      </form>
    `;
    Utils.openModal(html);
    document.getElementById('modalClose').onclick = Utils.closeModal;
    document.getElementById('cancelBtn').onclick = Utils.closeModal;
    document.getElementById('supplierForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = fd.get('name').trim();
      if (!name) { Utils.toast('Supplier name is required', 'error'); return; }
      const record = {
        id: isEdit ? supplier.id : Utils.uid('supp_'),
        name,
        contact: fd.get('contact').trim(),
        address: fd.get('address').trim(),
        notes: fd.get('notes').trim(),
        createdAt: isEdit ? supplier.createdAt : Utils.nowISO()
      };
      await DB.put('suppliers', record);
      Utils.closeModal();
      Utils.toast(isEdit ? 'Supplier updated' : 'Supplier added', 'success');
      Router.render();
    });
  },

  async renderProfile(id) {
    const supplier = await DB.get('suppliers', id);
    if (!supplier) return '<p class="empty-state">Supplier not found.</p>';
    const parts = (await DB.getAll('parts')).filter(p => p.supplierId === id);

    return `
      <div class="view-header">
        <button class="btn btn-ghost btn-back" id="btnBack">‹ Suppliers</button>
      </div>
      <section class="card profile-card">
        <h1>${Utils.escapeHtml(supplier.name)}</h1>
        <p class="muted">${Utils.escapeHtml(supplier.contact || 'No contact number')}</p>
        ${supplier.address ? `<p class="muted">${Utils.escapeHtml(supplier.address)}</p>` : ''}
        ${supplier.notes ? `<p class="notes-block">${Utils.escapeHtml(supplier.notes)}</p>` : ''}
        <div class="btn-row">
          <button class="btn btn-secondary" id="btnEditSupplier">Edit</button>
        </div>
      </section>
      <section class="card">
        <h2 class="card-title">Parts Supplied</h2>
        <div class="list">
          ${parts.length === 0 ? '<p class="empty-state">No parts linked to this supplier yet.</p>' : parts.map(p => `
            <div class="list-card">
              <div class="list-card-main">
                <div class="list-card-title">${Utils.escapeHtml(p.name)}</div>
                <div class="list-card-sub">Stock: ${p.quantity} · Cost ${Utils.money(p.cost)}</div>
              </div>
            </div>`).join('')}
        </div>
      </section>
    `;
  },

  async afterRenderProfile(id) {
    document.getElementById('btnBack').addEventListener('click', () => { location.hash = '#/suppliers'; });
    const supplier = await DB.get('suppliers', id);
    document.getElementById('btnEditSupplier').addEventListener('click', () => this.openForm(supplier));
  }
};

window.SuppliersModule = SuppliersModule;
