/**
 * Relovetree - Authentication Module
 * Handles Google Login/Logout and User Session
 */

// Configuration
const AUTH_CONFIG = {
    adminEmails: ['padiemipu@gmail.com', 'limone@example.com'] // Replace with actual admin emails
};

/**
 * Initialize Authentication
 */
function initAuth() {
    if (!firebase.auth()) {
        console.error('Firebase Auth not initialized');
        return;
    }

    // Auth State Observer
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User signed in:', user.email);
            updateLoginUI(user);
            await saveUserToFirestore(user);
        } else {
            console.log('User signed out');
            updateLoginUI(null);
        }

        // 각 페이지에 인증 완료 상태를 알려주기 위한 훅
        try {
            if (typeof window.onAuthReady === 'function') {
                window.onAuthReady(user);
            }
        } catch (e) {
            console.error('onAuthReady callback failed:', e);
        }
    });

    // Attach Event Listeners
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) loginBtn.addEventListener('click', signInWithGoogle);
    if (logoutBtn) logoutBtn.addEventListener('click', signOut);
}

/**
 * Sign In with Google
 */
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await firebase.auth().signInWithPopup(provider);
    } catch (error) {
        console.error('Login failed:', error);
        alert('로그인에 실패했습니다: ' + error.message);
    }
}

/**
 * Sign Out
 */
async function signOut() {
    try {
        await firebase.auth().signOut();
        window.location.reload();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

/**
 * Save or Update User in Firestore
 */
async function saveUserToFirestore(user) {
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(user.uid);

    try {
        const doc = await userRef.get();
        if (!doc.exists) {
            // New User
            await userRef.set({
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'free', // Default role
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Existing User - Update last login
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                photoURL: user.photoURL, // Update photo if changed
                displayName: user.displayName
            });
        }
    } catch (error) {
        console.error('Error saving user:', error);
    }
}

/**
 * Update UI based on Auth State
 */
function updateLoginUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const adminLink = document.getElementById('admin-link');

    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userMenu) userMenu.classList.remove('hidden');
        if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        if (userName) userName.textContent = user.displayName;

        // Check Admin Role (Client-side check for UI only, secured by Rules/Backend)
        checkAdminRole(user).then(isAdmin => {
            if (isAdmin && adminLink) adminLink.classList.remove('hidden');
        });

    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
        if (adminLink) adminLink.classList.add('hidden');
    }
}

/**
 * Check if user is admin
 */
async function checkAdminRole(user) {
    if (AUTH_CONFIG.adminEmails.includes(user.email)) return true;

    try {
        const doc = await firebase.firestore().collection('users').doc(user.uid).get();
        return doc.exists && doc.data().role === 'admin';
    } catch (e) {
        return false;
    }
}

// Export
window.initAuth = initAuth;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.waitForAuth = waitForAuth;

/**
 * Wait for Auth State
 * @returns {Promise<firebase.User|null>}
 */
function waitForAuth() {
    return new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// Auto-init
document.addEventListener('DOMContentLoaded', initAuth);
