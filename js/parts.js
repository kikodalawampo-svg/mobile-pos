/* ==========================================================================
   parts.js — Parts inventory
   ========================================================================== */

const PartsModule = {
  searchTerm: '',

  async render() {
    const parts = (await DB.getAll('parts')).sort((a, b) => a.name.localeCompare(b.name));
    const term = this.searchTerm.trim().toLowerCase();
    const filtered = term ? parts.filter(p => p.name.toLowerCase().includes(term)) : parts;

    return `
      <div class="view-header">
        <h1>Parts</h1>
        <button class="btn btn-primary" id="btnAddPart">+ New Part</button>
      </div>
      <div class="search-bar">
        <input type="search" id="partSearch" placeholder="Search parts" value="${Utils.escapeHtml(this.searchTerm)}">
      </div>
      <div class="list">
        ${filtered.length === 0 ? '<p class="empty-state">No parts yet. Tap "+ New Part" to add stock.</p>' : filtered.map(p => `
          <div class="list-card" data-id="${p.id}">
            <div class="list-card-main">
              <div class="list-card-title">${Utils.escapeHtml(p.name)}</div>
              <div class="list-card-sub">${Utils.escapeHtml(p.compatibleModel || 'Any model')} · Stock: ${p.quantity}</div>
              <div class="list-card-sub muted">Cost ${Utils.money(p.cost)} · Charge ${Utils.money(p.sellingPrice)}</div>
            </div>
            <div class="row-actions">
              <button class="icon-btn edit-part" data-id="${p.id}" title="Edit">✏️</button>
              <button class="icon-btn delete-part" data-id="${p.id}" title="Delete">🗑️</button>
            </div>
          </div>`).join('')}
      </div>
    `;
  },

  async afterRender() {
    document.getElementById('btnAddPart').addEventListener('click', () => this.openForm());
    document.getElementById('partSearch').addEventListener('input', Utils.debounce((e) => {
      this.searchTerm = e.target.value;
      Router.render();
    }, 200));
    document.querySelectorAll('.edit-part').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const part = await DB.get('parts', btn.dataset.id);
        this.openForm(part);
      });
    });
    document.querySelectorAll('.delete-part').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await Utils.confirmDialog('Delete this part? This will not affect past job orders.', { danger: true, okLabel: 'Delete' });
        if (!ok) return;
        await DB.delete('parts', btn.dataset.id);
        Utils.toast('Part deleted', 'success');
        Router.render();
      });
    });
  },

  async openForm(part = null) {
    const isEdit = !!part;
    const suppliers = await DB.getAll('suppliers');
    const html = `
      <div class="modal-header">
        <h2>${isEdit ? 'Edit Part' : 'New Part'}</h2>
        <button class="icon-btn" id="modalClose">✕</button>
      </div>
      <form id="partForm" class="modal-body form-grid">
        <label class="field">
          <span>Part Name *</span>
          <input type="text" name="name" value="${isEdit ? Utils.escapeHtml(part.name) : ''}" required placeholder="e.g. LCD Screen">
        </label>
        <label class="field">
          <span>Compatible Device / Model</span>
          <input type="text" name="compatibleModel" value="${isEdit ? Utils.escapeHtml(part.compatibleModel || '') : ''}" placeholder="e.g. iPhone 11">
        </label>
        <label class="field">
          <span>Supplier</span>
          <select name="supplierId">
            <option value="">— None —</option>
            ${suppliers.map(s => `<option value="${s.id}" ${isEdit && part.supplierId === s.id ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Quantity in Stock *</span>
          <input type="number" name="quantity" min="0" value="${isEdit ? part.quantity : 0}" required>
        </label>
        <label class="field">
          <span>Cost (internal) *</span>
          <input type="number" name="cost" min="0" step="0.01" value="${isEdit ? part.cost : ''}" required>
        </label>
        <label class="field">
          <span>Selling / Charge Amount *</span>
          <input type="number" name="sellingPrice" min="0" step="0.01" value="${isEdit ? part.sellingPrice : ''}" required>
        </label>
        <label class="field">
          <span>Notes</span>
          <textarea name="notes" rows="2">${isEdit ? Utils.escapeHtml(part.notes || '') : ''}</textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Part'}</button>
        </div>
      </form>
    `;
    Utils.openModal(html);
    document.getElementById('modalClose').onclick = Utils.closeModal;
    document.getElementById('cancelBtn').onclick = Utils.closeModal;
    document.getElementById('partForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = fd.get('name').trim();
      if (!name) { Utils.toast('Part name is required', 'error'); return; }
      const supplierId = fd.get('supplierId') || '';
      const suppliers2 = await DB.getAll('suppliers');
      const supplier = suppliers2.find(s => s.id === supplierId);
      const record = {
        id: isEdit ? part.id : Utils.uid('part_'),
        name,
        compatibleModel: fd.get('compatibleModel').trim(),
        supplierId, supplierName: supplier ? supplier.name : '',
        quantity: Math.max(0, parseInt(fd.get('quantity'), 10) || 0),
        cost: Utils.num(fd.get('cost')),
        sellingPrice: Utils.num(fd.get('sellingPrice')),
        notes: fd.get('notes').trim(),
        dateAdded: isEdit ? part.dateAdded : Utils.nowISO()
      };
      await DB.put('parts', record);
      Utils.closeModal();
      Utils.toast(isEdit ? 'Part updated' : 'Part added', 'success');
      Router.render();
    });
  }
};

window.PartsModule = PartsModule;
