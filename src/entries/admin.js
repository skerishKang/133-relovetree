/**
 * Relovetree - Admin Dashboard Logic
 */

// Configuration
const AI_HELPER_ENDPOINT = 'https://lovetree.limone.dev/.netlify/functions/ai-helper';
window.AI_HELPER_ENDPOINT = AI_HELPER_ENDPOINT;

function getAdminDb() {
    return firebase.firestore();
}

function getCurrentAdminUser() {
    return firebase.auth().currentUser;
}

async function fetchManagedUserData(uid) {
    const doc = await getAdminDb().collection('users').doc(uid).get();
    return doc.exists ? (doc.data() || {}) : null;
}

window.getAdminDb = getAdminDb;
window.getCurrentAdminUser = getCurrentAdminUser;
window.fetchManagedUserData = fetchManagedUserData;

if (window.AdminBootstrap && typeof window.AdminBootstrap.bootAdminPage === 'function') {
    window.AdminBootstrap.bootAdminPage([]);
}
