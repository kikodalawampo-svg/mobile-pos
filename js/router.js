/* ==========================================================================
   router.js — simple hash router
   ========================================================================== */

const Router = {
  routes: {
    dashboard: DashboardModule,
    customers: CustomersModule,
    joborders: JobOrdersModule,
    parts: PartsModule,
    suppliers: SuppliersModule,
    payments: PaymentsModule,
    reports: ReportsModule,
    settings: SettingsModule,
    backup: BackupModule
  },

  navLabels: {
    dashboard: 'Dashboard',
    joborders: 'Job Orders',
    customers: 'Customers',
    parts: 'Parts',
    suppliers: 'Suppliers',
    payments: 'Payments',
    reports: 'Reports',
    settings: 'Settings'
  },

  parseHash() {
    const hash = location.hash.replace(/^#\//, '') || 'dashboard';
    const parts = hash.split('/').filter(Boolean);
    const view = parts[0] || 'dashboard';
    const id = parts[1] || null;
    return { view, params: id ? { id } : {} };
  },

  async render() {
    const { view, params } = this.parseHash();
    const module = this.routes[view] || DashboardModule;
    const content = document.getElementById('appContent');

    content.classList.add('loading');
    const html = await module.render(params);
    content.innerHTML = html;
    content.classList.remove('loading');
    content.scrollTop = 0;

    if (module.afterRender) await module.afterRender(params);

    this.updateActiveNav(view);
    this.updatePageTitle(view);
  },

  updateActiveNav(view) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('nav-item-active', el.dataset.view === view);
    });
  },

  updatePageTitle(view) {
    const label = this.navLabels[view] || 'Repair POS';
    document.title = `${label} — Mobile Repair POS`;
  },

  init() {
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }
};

window.Router = Router;
