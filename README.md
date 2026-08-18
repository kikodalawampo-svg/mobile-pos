# Mobile Repair Shop POS

An offline-first job-order management app for a mobile phone repair shop.
Built with plain HTML, CSS, and JavaScript — no frameworks, no build step,
no required cloud account. All data is stored locally on the device using
IndexedDB.

## Running it

Service workers (needed for offline caching and installability) only work
when the app is served over `http://` or `https://` — not when you double-click
`index.html` and open it as a `file://` page. To try it locally:

```bash
cd mobile-repair-pos
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

Any static file server works (Python, `npx serve`, nginx, GitHub Pages, a
shared-hosting account, etc.). Once it's hosted somewhere reachable from your
Android phone (or copied onto a local network), open it in Chrome on Android
and use the browser menu → **Add to Home screen / Install app** to install it
as a standalone PWA.

Without a server, the app will still mostly work (IndexedDB works from
`file://` in most desktop browsers), but the service worker won't register,
so true offline reloading and Android installability won't be available.

## What's included

```
index.html            App shell (nav, modal host, print area)
manifest.json          PWA manifest (installable, standalone, icons)
service-worker.js       Caches the app shell for offline use
css/style.css           All styling, mobile-first + responsive
js/db.js                IndexedDB wrapper (generic CRUD helpers)
js/utils.js             Formatting, IDs, toasts, modals, confirm dialogs
js/settings.js          Shop info, technicians, receipt & PIN settings
js/dashboard.js         Dashboard view
js/customers.js         Customer management + profile/history
js/joborders.js         Job Order system (the core workflow)
js/parts.js             Parts inventory
js/suppliers.js         Supplier directory
js/payments.js          Payment recording
js/reports.js           Repair / income / balance / parts / profit / technician reports
js/print.js             Customer ticket + payment receipt (cost-hiding enforced)
js/backup.js            JSON backup/restore + CSV export
js/seed.js              Sample/demo data (tagged sample:true, removable from Settings)
js/router.js            Hash-based view router
js/main.js              Bootstrap: DB init, seeding, PIN lock, nav wiring, SW registration
icons/                  Generated app icons (192/512, regular + maskable)
```

## Notes on the customer-facing ticket rule

The Job Order Ticket and Payment Receipt (`js/print.js`) deliberately only
ever render `TOTAL AMOUNT`, `AMOUNT PAID`, and `BALANCE DUE`. Parts cost,
labor cost, and supplier cost are never included in the strings sent to the
print area, even though they're stored and used internally (job order detail
screen, and the Profit Report) for the shop owner's own reference.

## Data & backup

- All records are stored in IndexedDB in the browser/device (database
  `mobileRepairPOS`). Nothing leaves the device unless you export it.
- Settings → Backup & Restore lets you export a single `.json` file with
  everything, or export individual tables as `.csv`.
- Restoring a backup replaces all current data — the app warns before doing
  this.
- Sample data (a couple of demo customers, parts, and job orders) is loaded
  automatically the first time the app runs on an empty database, and is
  tagged so it can be removed later from Settings → "Remove Sample Data"
  without touching your real records.

## Known simplifications

- Editing an existing job order's parts list does not re-adjust part stock
  quantities (stock is deducted only when parts are first added on a new job
  order). Deleting/adding parts stock is otherwise fully manual and editable
  in the Parts screen at any time.
- The PIN lock is a simple on-device screen lock, not encryption — anyone
  with direct access to the browser's storage could still read the data.
