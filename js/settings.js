/* ==========================================================================
   settings.js — shop settings, technicians, receipt preferences, PIN lock
   ========================================================================== */

const SettingsModule = {
  _cache: null,

  defaults() {
    return {
      key: 'shop',
      shopName: 'My Repair Shop',
      address: '',
      contact: '',
      facebook: '',
      logo: '', // base64 data URL
      paperSize: '58mm', // 58mm, 80mm, A4
      pinEnabled: false,
      pin: '',
      showAddressOnReceipt: true,
      showContactOnReceipt: true
    };
  },

  async get() {
    if (this._cache) return this._cache;
    let s = await DB.get('settings', 'shop');
    if (!s) {
      s = this.defaults();
      await DB.put('settings', s);
    }
    this._cache = s;
    return s;
  },

  async save(patch) {
    const current = await this.get();
    const updated = { ...current, ...patch, key: 'shop' };
    await DB.put('settings', updated);
    this._cache = updated;
    return updated;
  },

  async render() {
    const s = await this.get();
    const technicians = await DB.getAll('technicians');

    return `
      <div class="view-header">
        <h1>Settings</h1>
      </div>

      <section class="card">
        <h2 class="card-title">Shop Information</h2>
        <form id="shopInfoForm" class="form-grid">
          <label class="field">
            <span>Shop Name *</span>
            <input type="text" name="shopName" value="${Utils.escapeHtml(s.shopName)}" required>
          </label>
          <label class="field">
            <span>Address</span>
            <input type="text" name="address" value="${Utils.escapeHtml(s.address)}">
          </label>
          <label class="field">
            <span>Contact Number</span>
            <input type="text" name="contact" value="${Utils.escapeHtml(s.contact)}">
          </label>
          <label class="field">
            <span>Facebook / Page</span>
            <input type="text" name="facebook" value="${Utils.escapeHtml(s.facebook)}">
          </label>
          <label class="field">
            <span>Shop Logo</span>
            <input type="file" name="logo" accept="image/*">
            ${s.logo ? `<img src="${s.logo}" class="logo-preview" alt="Logo preview">` : ''}
          </label>
          <button type="submit" class="btn btn-primary">Save Shop Info</button>
        </form>
      </section>

      <section class="card">
        <h2 class="card-title">Receipt Settings</h2>
        <form id="receiptSettingsForm" class="form-grid">
          <label class="field">
            <span>Paper Size</span>
            <select name="paperSize">
              <option value="58mm" ${s.paperSize === '58mm' ? 'selected' : ''}>58mm Thermal</option>
              <option value="80mm" ${s.paperSize === '80mm' ? 'selected' : ''}>80mm Thermal</option>
              <option value="A4" ${s.paperSize === 'A4' ? 'selected' : ''}>A4 / Letter</option>
            </select>
          </label>
          <label class="field checkbox-field">
            <input type="checkbox" name="showAddressOnReceipt" ${s.showAddressOnReceipt ? 'checked' : ''}>
            <span>Show address on receipt</span>
          </label>
          <label class="field checkbox-field">
            <input type="checkbox" name="showContactOnReceipt" ${s.showContactOnReceipt ? 'checked' : ''}>
            <span>Show contact number on receipt</span>
          </label>
          <button type="submit" class="btn btn-primary">Save Receipt Settings</button>
        </form>
      </section>

      <section class="card">
        <h2 class="card-title">Technicians</h2>
        <form id="addTechForm" class="inline-form">
          <input type="text" id="newTechName" placeholder="Technician name" required>
          <button type="submit" class="btn btn-secondary">Add Technician</button>
        </form>
        <ul class="simple-list" id="techList">
          ${technicians.length === 0 ? '<li class="empty-row">No technicians yet.</li>' : technicians.map(t => `
            <li data-id="${t.id}">
              <span class="tech-name-display" data-id="${t.id}">${Utils.escapeHtml(t.name)}</span>
              <span class="row-actions">
                <button class="icon-btn edit-tech" data-id="${t.id}" title="Edit">✏️</button>
                <button class="icon-btn delete-tech" data-id="${t.id}" title="Delete">🗑️</button>
              </span>
            </li>`).join('')}
        </ul>
      </section>

      <section class="card">
        <h2 class="card-title">Security</h2>
        <form id="pinForm" class="form-grid">
          <label class="field checkbox-field">
            <input type="checkbox" name="pinEnabled" ${s.pinEnabled ? 'checked' : ''}>
            <span>Require PIN to open app</span>
          </label>
          <label class="field">
            <span>4-Digit PIN</span>
            <input type="password" name="pin" maxlength="4" inputmode="numeric" pattern="[0-9]{4}" value="${Utils.escapeHtml(s.pin)}" placeholder="e.g. 1234">
          </label>
          <button type="submit" class="btn btn-primary">Save Security Settings</button>
        </form>
      </section>

      <section class="card">
        <h2 class="card-title">Data Management</h2>
        <div class="btn-row">
          <button class="btn btn-secondary" id="btnGoBackup">Backup / Restore</button>
          <button class="btn btn-ghost" id="btnResetSample" >Remove Sample Data</button>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">About</h2>
        <p class="muted">Mobile Repair Shop POS — works fully offline. All data is stored on this device only.</p>
      </section>
    `;
  },

  async afterRender() {
    const shopForm = document.getElementById('shopInfoForm');
    shopForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(shopForm);
      const patch = {
        shopName: fd.get('shopName').trim() || 'My Repair Shop',
        address: fd.get('address').trim(),
        contact: fd.get('contact').trim(),
        facebook: fd.get('facebook').trim()
      };
      const file = fd.get('logo');
      if (file && file.size > 0) {
        patch.logo = await this._fileToDataURL(file);
      }
      await this.save(patch);
      Utils.toast('Shop information saved', 'success');
      Router.render();
    });

    const receiptForm = document.getElementById('receiptSettingsForm');
    receiptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(receiptForm);
      await this.save({
        paperSize: fd.get('paperSize'),
        showAddressOnReceipt: fd.get('showAddressOnReceipt') === 'on',
        showContactOnReceipt: fd.get('showContactOnReceipt') === 'on'
      });
      Utils.toast('Receipt settings saved', 'success');
    });

    const pinForm = document.getElementById('pinForm');
    pinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(pinForm);
      const pinEnabled = fd.get('pinEnabled') === 'on';
      const pin = (fd.get('pin') || '').trim();
      if (pinEnabled && !/^\d{4}$/.test(pin)) {
        Utils.toast('PIN must be exactly 4 digits', 'error');
        return;
      }
      await this.save({ pinEnabled, pin });
      Utils.toast('Security settings saved', 'success');
    });

    document.getElementById('addTechForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('newTechName');
      const name = input.value.trim();
      if (!name) return;
      await DB.add('technicians', { id: Utils.uid('tech_'), name, active: true, createdAt: Utils.nowISO() });
      Utils.toast('Technician added', 'success');
      Router.render();
    });

    document.querySelectorAll('.edit-tech').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const tech = await DB.get('technicians', id);
        const name = prompt('Edit technician name:', tech.name);
        if (name && name.trim()) {
          tech.name = name.trim();
          await DB.put('technicians', tech);
          Utils.toast('Technician updated', 'success');
          Router.render();
        }
      });
    });

    document.querySelectorAll('.delete-tech').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const ok = await Utils.confirmDialog('Delete this technician? Existing job orders will keep the technician name on record.', { danger: true, okLabel: 'Delete' });
        if (!ok) return;
        await DB.delete('technicians', id);
        Utils.toast('Technician deleted', 'success');
        Router.render();
      });
    });

    document.getElementById('btnGoBackup').addEventListener('click', () => {
      location.hash = '#/backup';
    });

    document.getElementById('btnResetSample').addEventListener('click', async () => {
      const ok = await Utils.confirmDialog('Remove all records marked as sample/demo data? Real data you entered will be kept.', { danger: true, okLabel: 'Remove Sample Data' });
      if (!ok) return;
      await Seed.removeSampleData();
      Utils.toast('Sample data removed', 'success');
      Router.render();
    });
  },

  _fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

window.SettingsModule = SettingsModule;
