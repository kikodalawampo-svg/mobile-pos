/* ==========================================================================
   main.js — App bootstrap
   ========================================================================== */

(async function () {
  await DB.init();
  await Seed.seedIfEmpty();

  const settings = await SettingsModule.get();

  async function startApp() {
    document.getElementById('appShell').classList.remove('hidden');
    document.getElementById('pinLockScreen').classList.add('hidden');
    Router.init();
    wireNav();
    watchOffline();
  }

  if (settings.pinEnabled && settings.pin) {
    showPinLock(settings.pin, startApp);
  } else {
    startApp();
  }

  function showPinLock(correctPin, onSuccess) {
    const screen = document.getElementById('pinLockScreen');
    screen.classList.remove('hidden');
    const input = document.getElementById('pinInput');
    const error = document.getElementById('pinError');
    const submit = document.getElementById('pinSubmit');
    input.focus();

    function tryUnlock() {
      if (input.value === correctPin) {
        error.classList.add('hidden');
        onSuccess();
      } else {
        error.classList.remove('hidden');
        input.value = '';
        input.focus();
      }
    }
    submit.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
  }

  function wireNav() {
    const sideNav = document.getElementById('sideNav');
    const scrim = document.getElementById('navScrim');
    const menuToggle = document.getElementById('menuToggle');
    const bottomMore = document.getElementById('bottomNavMore');

    function openNav() {
      sideNav.classList.add('open');
      scrim.classList.add('open');
    }
    function closeNav() {
      sideNav.classList.remove('open');
      scrim.classList.remove('open');
    }

    menuToggle.addEventListener('click', openNav);
    bottomMore.addEventListener('click', openNav);
    scrim.addEventListener('click', closeNav);

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', closeNav);
    });

    // Keep bottom nav active state in sync
    window.addEventListener('hashchange', updateBottomNav);
    updateBottomNav();

    function updateBottomNav() {
      const { view } = Router.parseHash();
      document.querySelectorAll('.bottom-nav-item[data-view]').forEach(el => {
        el.classList.toggle('bottom-nav-item-active', el.dataset.view === view);
      });
    }
  }

  function watchOffline() {
    const pill = document.getElementById('offlineIndicator');
    function update() {
      pill.classList.toggle('hidden', navigator.onLine);
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  // Register service worker for offline support & installability
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {
        // Silently ignore — app still works without SW (e.g. when opened via file://)
      });
    });
  }
})();
