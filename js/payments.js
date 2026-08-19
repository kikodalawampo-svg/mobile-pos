/* ==========================================================================
   payments.js — Payment recording & list
   ========================================================================== */

const PaymentsModule = {
  async render() {
    const payments = (await DB.getAll('payments')).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return `
      <div class="view-header">
        <h1>Payments</h1>
        <button class="btn btn-primary" id="btnRecordPaymentGeneral">+ Record Payment</button>
      </div>
      <div class="list">
        ${payments.length === 0 ? '<p class="empty-state">No payments recorded yet.</p>' : payments.map(p => `
          <div class="list-card" data-job-id="${p.jobOrderId}">
            <div class="list-card-main">
              <div class="list-card-title">${Utils.money(p.amount)} — ${Utils.escapeHtml(p.customerName)}</div>
              <div class="list-card-sub">${Utils.escapeHtml(p.jobOrderNumber)} · ${Utils.escapeHtml(p.method)}</div>
              <div class="list-card-sub muted">${Utils.formatDateTime(p.date)}</div>
            </div>
            <button class="btn btn-ghost btn-sm print-receipt-btn" data-payment-id="${p.id}">Receipt</button>
          </div>`).join('')}
      </div>
    `;
  },

  async afterRender() {
    document.getElementById('btnRecordPaymentGeneral').addEventListener('click', () => this.openJobPicker());
    document.querySelectorAll('.list-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.print-receipt-btn')) return;
        location.hash = `#/joborders/${card.dataset.jobId}`;
      });
    });
    document.querySelectorAll('.print-receipt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        PrintModule.printPaymentReceipt(btn.dataset.paymentId);
      });
    });
  },

  async openJobPicker() {
    const jobs = (await DB.getAll('jobOrders')).filter(j => (j.totalAmount - j.amountPaid) > 0.004);
    if (jobs.length === 0) {
      Utils.toast('No job orders currently have a balance due', 'info');
      return;
    }
    const html = `
      <div class="modal-header">
        <h2>Select Job Order</h2>
        <button class="icon-btn" id="modalClose">✕</button>
      </div>
      <div class="modal-body">
        <div class="list">
          ${jobs.map(j => `
            <div class="list-card" data-id="${j.id}">
              <div class="list-card-main">
                <div class="list-card-title">${Utils.escapeHtml(j.jobOrderNumber)} — ${Utils.escapeHtml(j.customerName)}</div>
                <div class="list-card-sub">Balance Due: ${Utils.money(j.totalAmount - j.amountPaid)}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    `;
    Utils.openModal(html);
    document.getElementById('modalClose').onclick = Utils.closeModal;
    document.querySelectorAll('.list-card').forEach(card => {
      card.addEventListener('click', () => {
        Utils.closeModal();
        this.openRecordPaymentForm(card.dataset.id);
      });
    });
  },

  async openRecordPaymentForm(jobOrderId) {
    const job = await DB.get('jobOrders', jobOrderId);
    if (!job) return;
    const balance = (job.totalAmount || 0) - (job.amountPaid || 0);

    const html = `
      <div class="modal-header">
        <h2>Record Payment — ${Utils.escapeHtml(job.jobOrderNumber)}</h2>
        <button class="icon-btn" id="modalClose">✕</button>
      </div>
      <form id="paymentForm" class="modal-body form-grid">
        <div class="calc-row"><span>Total Amount</span><span>${Utils.money(job.totalAmount)}</span></div>
        <div class="calc-row"><span>Already Paid</span><span>${Utils.money(job.amountPaid)}</span></div>
        <div class="calc-row calc-row-balance"><span>Balance Due</span><span>${Utils.money(balance)}</span></div>

        <label class="field">
          <span>Amount *</span>
          <input type="number" name="amount" min="0.01" step="0.01" max="${balance}" value="${balance.toFixed(2)}" required>
        </label>
        <label class="field">
          <span>Payment Method</span>
          <select name="method">
            <option>Cash</option>
            <option>GCash</option>
            <option>Bank Transfer</option>
            <option>Other</option>
          </select>
        </label>
        <label class="field">
          <span>Reference / Notes</span>
          <input type="text" name="notes" placeholder="e.g. GCash ref #">
        </label>
        <label class="field">
          <span>Recorded By</span>
          <input type="text" name="recordedBy" placeholder="Staff name" value="Shop Owner">
        </label>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Payment</button>
        </div>
      </form>
    `;
    Utils.openModal(html);
    document.getElementById('modalClose').onclick = Utils.closeModal;
    document.getElementById('cancelBtn').onclick = Utils.closeModal;
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = Utils.num(fd.get('amount'));
      if (amount <= 0) { Utils.toast('Enter a valid payment amount', 'error'); return; }

      const previousBalance = balance;
      const newAmountPaid = (job.amountPaid || 0) + amount;
      const newBalance = job.totalAmount - newAmountPaid;

      const payment = {
        id: Utils.uid('pay_'),
        jobOrderId: job.id,
        jobOrderNumber: job.jobOrderNumber,
        customerName: job.customerName,
        amount,
        method: fd.get('method'),
        notes: fd.get('notes').trim(),
        recordedBy: fd.get('recordedBy').trim() || 'Shop Owner',
        date: Utils.nowISO(),
        previousBalance,
        newBalance
      };
      await DB.add('payments', payment);

      job.amountPaid = newAmountPaid;
      job.paymentStatus = Utils.paymentStatusFor(job.totalAmount, newAmountPaid);
      job.updatedAt = Utils.nowISO();
      await DB.put('jobOrders', job);

      await Utils.logActivity('Payment recorded', `${job.jobOrderNumber}: ${Utils.money(amount)}`);
      Utils.closeModal();
      Utils.toast('Payment recorded', 'success');
      Router.render();
    });
  }
};

window.PaymentsModule = PaymentsModule;
