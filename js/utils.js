/* ==========================================================================
   utils.js — shared helpers used across every module
   ========================================================================== */

const Utils = {
  /** Simple, sufficiently-unique local ID (no network / uuid lib needed). */
  uid(prefix = '') {
    const rand = Math.random().toString(36).slice(2, 9);
    const time = Date.now().toString(36);
    return `${prefix}${time}${rand}`;
  },

  /** Format a number as Philippine peso currency, e.g. ₱1,800.00 */
  money(n) {
    const num = Number(n) || 0;
    return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /** Parse a possibly-empty input into a safe non-negative number. */
  num(v) {
    const n = parseFloat(v);
    return isNaN(n) || n < 0 ? 0 : n;
  },

  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },

  nowISO() {
    return new Date().toISOString();
  },

  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  /** Toast notification, bottom of screen, auto-dismiss. */
  toast(message, type = 'info') {
    const host = document.getElementById('toastHost');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2800);
  },

  /** Generic confirm dialog. Returns a Promise<boolean>. */
  confirmDialog(message, opts = {}) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modalOverlay');
      overlay.innerHTML = `
        <div class="modal modal-sm">
          <div class="modal-body">
            <p class="confirm-text">${Utils.escapeHtml(message)}</p>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" id="confirmCancel">${opts.cancelLabel || 'Cancel'}</button>
            <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">${opts.okLabel || 'Confirm'}</button>
          </div>
        </div>`;
      overlay.classList.add('open');
      document.getElementById('confirmCancel').onclick = () => { overlay.classList.remove('open'); resolve(false); };
      document.getElementById('confirmOk').onclick = () => { overlay.classList.remove('open'); resolve(true); };
    });
  },

  /** Open a modal with arbitrary HTML content. */
  openModal(html, extraClass = '') {
    const overlay = document.getElementById('modalOverlay');
    overlay.innerHTML = `<div class="modal ${extraClass}">${html}</div>`;
    overlay.classList.add('open');
  },

  closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('open');
    overlay.innerHTML = '';
  },

  statusBadgeClass(status) {
    const map = {
      'Pending': 'badge-pending',
      'In Progress': 'badge-progress',
      'Waiting for Parts': 'badge-waiting',
      'Done': 'badge-done',
      'Released': 'badge-released',
      'Cancelled': 'badge-cancelled'
    };
    return map[status] || 'badge-pending';
  },

  paymentBadgeClass(status) {
    const map = {
      'Fully Paid': 'badge-done',
      'Partially Paid': 'badge-waiting',
      'Balance Due': 'badge-cancelled'
    };
    return map[status] || 'badge-cancelled';
  },

  paymentStatusFor(total, paid) {
    if (paid <= 0) return 'Balance Due';
    if (paid >= total) return 'Fully Paid';
    return 'Partially Paid';
  },

  async logActivity(action, details = '') {
    try {
      await DB.add('activityLogs', {
        id: Utils.uid('log_'),
        timestamp: Utils.nowISO(),
        action,
        details
      });
    } catch (e) { /* non-critical */ }
  },

  /** Generate the next Job Order Number, e.g. JO-2026-0001, unique per year. */
  async nextJobOrderNumber() {
    const year = new Date().getFullYear();
    const all = await DB.getAll('jobOrders');
    const thisYear = all.filter(j => j.jobOrderNumber && j.jobOrderNumber.includes(`JO-${year}-`));
    let max = 0;
    thisYear.forEach(j => {
      const n = parseInt(j.jobOrderNumber.split('-')[2], 10);
      if (!isNaN(n) && n > max) max = n;
    });
    const next = (max + 1).toString().padStart(4, '0');
    return `JO-${year}-${next}`;
  }
};

window.Utils = Utils;
