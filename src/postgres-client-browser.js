/**
 * ⚠️ OFFICIAL BROWSER ENTRY point.
 * This initializes window.postgresDB which maps to Neon PostgreSQL via a compat layer.
 * 
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * 
 * IMPORTANT: This is the PRIMARY entry point for browser (non-module) code.
 * 
 * Why this file exists:
 * - `postgres-client.js` is an ES module alias for new code
 * - Flow A pages still use plain `<script>` tags
 * - `firebase-firestore-compat.js` is the legacy runtime shim (do not use directly)
 * 
 * This loader keeps runtime behavior unchanged while giving new pages
 * a Postgres-oriented entry point.
 * 
 * For new browser code:
 *   <script src="/src/postgres-client-browser.js"></script>
 *   // Then use window.postgresDB
 * 
 * ⚠️ DO NOT USE for new code:
 *   <script src="/src/firebase-firestore-compat.js"></script> // LEGACY SHIM
 * 
 * Architecture:
 *   Browser → postgres-client-browser.js → firebase-firestore-compat.js → /api/firestore → Neon/Postgres
 * 
 * @see docs/product/DATA_NAMING_RULE.md
 */
(function () {
  if (typeof window === 'undefined') return;

  // Initialize a global promise for other scripts to wait on
  let resolveDB;
  window.postgresDBReady = new Promise(resolve => {
    resolveDB = resolve;
  });

  function initDB() {
    if (window.postgresDB) {
      resolveDB(window.postgresDB);
      return;
    }

    if (window.firebase && typeof window.firebase.firestore === 'function') {
      window.postgresDB = window.firebase.firestore();
      
      window.LovetreeDataLayer = Object.assign({}, window.LovetreeDataLayer, {
        auth: 'firebase',
        data: 'neon-postgres',
        transport: 'compat-layer',
        initializedAt: new Date().toISOString()
      });

      console.log('[Lovetree] PostgresDB Initialized.');
      window.dispatchEvent(new CustomEvent('lovetree-db-ready', { detail: window.postgresDB }));
      resolveDB(window.postgresDB);
    }
  }

  function loadCompat() {
    if (window.postgresDB || (window.firebase && typeof window.firebase.firestore === 'function')) {
      initDB();
      return;
    }

    const script = document.createElement('script');
    script.src = '/src/firebase-firestore-compat.js?v=20260414_v3';
    script.dataset.relovetreeCompat = 'true';
    script.onload = initDB;
    document.head.appendChild(script);
  }

  // Handle case where it might already be loaded (DOMContentLoaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCompat);
  } else {
    loadCompat();
  }
})();
