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

  function ensureCompatLoaded() {
    if (window.postgresDB || (window.firebase && typeof window.firebase.firestore === 'function')) {
      return;
    }

    const existing = document.querySelector('script[data-relovetree-compat="true"]');
    if (existing) return;

    document.write('<script src="/src/firebase-firestore-compat.js" data-relovetree-compat="true"><\\/script>');
  }

  ensureCompatLoaded();

  if (!window.postgresDB && window.firebase && typeof window.firebase.firestore === 'function') {
    window.postgresDB = window.firebase.firestore();
  }

  window.LovetreeDataLayer = Object.assign({}, window.LovetreeDataLayer, {
    auth: 'firebase',
    data: 'neon-postgres',
    transport: 'compat-layer',
  });
})();
