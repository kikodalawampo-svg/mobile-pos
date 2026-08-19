/* ==========================================================================
   print.js — Printable Job Order Ticket & Payment Receipt
   RULE: customer-facing prints NEVER show parts cost, labor cost, or profit.
   Only TOTAL AMOUNT, AMOUNT PAID, and BALANCE DUE are shown.
   ========================================================================== */

const PrintModule = {
  async printJobTicket(jobId) {
    const job = await DB.get('jobOrders', jobId);
    if (!job) return;
    const s = await SettingsModule.get();
    const balance = (job.totalAmount || 0) - (job.amountPaid || 0);

    const html = `
      <div class="ticket paper-${s.paperSize}">
        ${s.logo ? `<img src="${s.logo}" class="ticket-logo" alt="logo">` : ''}
        <h2 class="ticket-shop-name">${Utils.escapeHtml(s.shopName)}</h2>
        ${s.showAddressOnReceipt && s.address ? `<p class="ticket-line">${Utils.escapeHtml(s.address)}</p>` : ''}
        ${s.showContactOnReceipt && s.contact ? `<p class="ticket-line">${Utils.escapeHtml(s.contact)}</p>` : ''}
        <hr>
        <h3 class="ticket-title">JOB ORDER TICKET</h3>
        <p class="ticket-line"><strong>Job Order #:</strong> ${Utils.escapeHtml(job.jobOrderNumber)}</p>
        <p class="ticket-line"><strong>Date:</strong> ${Utils.formatDateTime(job.createdAt)}</p>
        <hr>
        <p class="ticket-line"><strong>Customer:</strong> ${Utils.escapeHtml(job.customerName)}</p>
        <p class="ticket-line"><strong>Mobile:</strong> ${Utils.escapeHtml(job.customerMobile || '—')}</p>
        <hr>
        <p class="ticket-line"><strong>Device:</strong> ${Utils.escapeHtml(job.deviceBrand)} ${Utils.escapeHtml(job.deviceModel)}</p>
        <p class="ticket-line"><strong>IMEI/Serial:</strong> ${Utils.escapeHtml(job.imei || '—')}</p>
        <p class="ticket-line"><strong>Reported Problem:</strong> ${Utils.escapeHtml(job.reportedProblem || '—')}</p>
        <p class="ticket-line"><strong>Diagnosis:</strong> ${Utils.escapeHtml(job.diagnosis || '—')}</p>
        <p class="ticket-line"><strong>Job Description:</strong> ${Utils.escapeHtml(job.jobDescription || '—')}</p>
        <p class="ticket-line"><strong>Technician:</strong> ${Utils.escapeHtml(job.technicianName || '—')}</p>
        <p class="ticket-line"><strong>Status:</strong> ${Utils.escapeHtml(job.status)}</p>
        <hr>
        <p class="ticket-line ticket-total"><strong>TOTAL AMOUNT:</strong> ${Utils.money(job.totalAmount)}</p>
        <p class="ticket-line"><strong>AMOUNT PAID:</strong> ${Utils.money(job.amountPaid)}</p>
        <p class="ticket-line ticket-balance"><strong>BALANCE DUE:</strong> ${Utils.money(balance)}</p>
        <hr>
        <p class="ticket-footer">Please keep this ticket. Present it when claiming your device.</p>
      </div>
    `;
    this._print(html);
  },

  async printPaymentReceipt(paymentId) {
    const payment = await DB.get('payments', paymentId);
    if (!payment) return;
    const s = await SettingsModule.get();

    const html = `
      <div class="ticket paper-${s.paperSize}">
        ${s.logo ? `<img src="${s.logo}" class="ticket-logo" alt="logo">` : ''}
        <h2 class="ticket-shop-name">${Utils.escapeHtml(s.shopName)}</h2>
        ${s.showAddressOnReceipt && s.address ? `<p class="ticket-line">${Utils.escapeHtml(s.address)}</p>` : ''}
        ${s.showContactOnReceipt && s.contact ? `<p class="ticket-line">${Utils.escapeHtml(s.contact)}</p>` : ''}
        <hr>
        <h3 class="ticket-title">PAYMENT RECEIPT</h3>
        <p class="ticket-line"><strong>Job Order #:</strong> ${Utils.escapeHtml(payment.jobOrderNumber)}</p>
        <p class="ticket-line"><strong>Customer:</strong> ${Utils.escapeHtml(payment.customerName)}</p>
        <p class="ticket-line"><strong>Date:</strong> ${Utils.formatDateTime(payment.date)}</p>
        <hr>
        <p class="ticket-line ticket-total"><strong>AMOUNT PAID:</strong> ${Utils.money(payment.amount)}</p>
        <p class="ticket-line"><strong>Payment Method:</strong> ${Utils.escapeHtml(payment.method)}</p>
        ${payment.notes ? `<p class="ticket-line"><strong>Reference/Notes:</strong> ${Utils.escapeHtml(payment.notes)}</p>` : ''}
        <hr>
        <p class="ticket-line"><strong>Previous Balance Due:</strong> ${Utils.money(payment.previousBalance)}</p>
        <p class="ticket-line ticket-balance"><strong>New Balance Due:</strong> ${Utils.money(payment.newBalance)}</p>
        <hr>
        <p class="ticket-footer">Thank you!</p>
      </div>
    `;
    this._print(html);
  },

  _print(html) {
    const area = document.getElementById('printArea');
    area.innerHTML = html;
    setTimeout(() => window.print(), 50);
  }
};

window.PrintModule = PrintModule;
