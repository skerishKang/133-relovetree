/**
 * Relovetree - Authentication Module
 * 
 * Handles Google Login/Logout and User Session via Firebase Auth.
 * 
 * Architecture note:
 *   - Firebase Auth = login/session ONLY (ID token provider)
 *   - App CRUD (trees, moments, etc.) → firestore-compat layer → Netlify Functions → Neon/Postgres
 *   - This module does NOT interact with Firestore directly for data storage
 */

// Configuration
const AUTH_CONFIG = {
    // Admin emails removed - use Firestore 'role:admin' in users collection
};

let EMAIL_AUTH_MODE = 'login';
const AUTH_INIT_FLAG = '__relovetreeAuthInitialized';

function isInvalidAuthSessionError(error) {
    const message = String((error && (error.code || error.message)) || '');
    return /USER_NOT_FOUND|user-not-found|invalid-user-token|token.*expired|user token/i.test(message);
}

function clearStaleFirebaseAuthState() {
    const prefixes = ['firebase:authUser:', 'firebase:pendingRedirect:', 'firebase:redirectUser:'];

    function clearStorage(storage) {
        if (!storage) return;
        const keys = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && prefixes.some(function (prefix) { return key.indexOf(prefix) === 0; })) {
                keys.push(key);
            }
        }
        keys.forEach(function (key) {
            try {
                storage.removeItem(key);
            } catch (e) {
            }
        });
    }

    try {
        clearStorage(window.localStorage);
    } catch (e) {
    }

    try {
        clearStorage(window.sessionStorage);
    } catch (e) {
    }
}

/**
 * Initialize Authentication
 */
function initAuth() {
    if (typeof window !== 'undefined' && window[AUTH_INIT_FLAG]) {
        return;
    }
    if (!firebase.auth()) {
        console.error('Firebase Auth not initialized');
        return;
    }
    if (typeof window !== 'undefined') {
        window[AUTH_INIT_FLAG] = true;
    }

    // Auth State Observer
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User signed in:', user.email);
            try {
                if (typeof user.reload === 'function') {
                    await user.reload();
                }
            } catch (error) {
                if (isInvalidAuthSessionError(error)) {
                    console.warn('Invalid Firebase session detected. Signing out stale user.');
                    await firebase.auth().signOut().catch(function () {});
                    clearStaleFirebaseAuthState();
                    return;
                }
                console.warn('User reload skipped:', error);
            }
updateLoginUI(user);
await syncUserToDatabase(user); // Saves to Neon PostgreSQL via compat layer, NOT Firestore
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

    setupEmailAuthForm();
}

/**
 * Sign In with Google
 */
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    // 항상 계정 선택 창이 뜨도록 설정 (기존 로그인 계정이 있어도 선택 가능)
    try {
        if (typeof provider.setCustomParameters === 'function') {
            provider.setCustomParameters({ prompt: 'select_account' });
        }
    } catch (e) {
        console.warn('Google Provider custom parameters 설정 실패:', e);
    }
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
        clearStaleFirebaseAuthState();
        window.location.reload();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

/**
 * Sync user profile to database
 * 
 * ⚠️ IMPORTANT: Despite the Firestore-style API, this saves to Neon PostgreSQL!
 * 
 * Flow: firebase.firestore() → firebase-firestore-compat.js → /api/firestore → PostgreSQL
 * 
 * What happens:
 *   - Gets called on Auth state change (login)
 *   - Creates/updates user document in 'users' collection
 *   - Data goes to Neon PostgreSQL 'users' table, NOT Firestore
 * 
 * @param {firebase.User} user - Firebase Auth user object (real Firebase)
 * @param {number} retryCount - Current retry attempt
 * @param {number} maxRetries - Maximum retry attempts
 */
async function syncUserToDatabase(user, retryCount = 0, maxRetries = 2) {
  const db = firebase.firestore();
  const userRef = db.collection('users').doc(user.uid);
  const fallbackDisplayName = user.displayName || user.email || '사용자';

  try {
    await userRef.set({
      email: user.email || '',
      displayName: fallbackDisplayName,
      photoURL: user.photoURL || '',
      role: 'free',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user (attempt ' + (retryCount + 1) + '):', error.message);

    if (retryCount < maxRetries && (error.message.includes('Failed to fetch') || error.message.includes('network') || error.message.includes('500'))) {
      console.log('Retrying user save... (' + (retryCount + 1) + '/' + maxRetries + ')');
      await new Promise(r => setTimeout(r, 500 * (retryCount + 1)));
      return syncUserToDatabase(user, retryCount + 1, maxRetries);
    }

    console.warn('User save failed after ' + (retryCount + 1) + ' attempt(s). User may exist or service temporarily unavailable.');
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
    const emailLoginLink = document.getElementById('email-login-link');
    const settingsBtn = document.getElementById('settings-btn');
    const globalSettingsBtn = document.getElementById('global-settings-btn');

    const updateSettingsButton = (button, loggedIn) => {
        if (!button) return;
        const label = loggedIn ? '마이' : '로그인';
        const title = loggedIn ? '마이페이지 및 설정' : '로그인 및 설정';
        button.title = title;
        button.setAttribute('aria-label', title);
        const textEl = button.querySelector('span');
        if (textEl) {
            textEl.textContent = label;
        }
    };

    if (user) {
        if (loginBtn) loginBtn.classList.add('is-hidden');
        if (emailLoginLink) emailLoginLink.classList.add('is-hidden');
        if (userMenu) userMenu.classList.remove('is-hidden');
        if (userAvatar) {
            userAvatar.src = user.photoURL || ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.defaultAvatar) ? APP_CONFIG.defaultAvatar : '');
        }
        if (userName) userName.textContent = user.displayName || user.email || '사용자';
        updateSettingsButton(settingsBtn, true);
        updateSettingsButton(globalSettingsBtn, true);

        // Check Admin Role (Client-side check for UI only, secured by Rules/Backend)
        checkAdminRole(user).then(isAdmin => {
            if (isAdmin && adminLink) adminLink.classList.remove('is-hidden');
        });

    } else {
        if (loginBtn) loginBtn.classList.remove('is-hidden');
        if (emailLoginLink) emailLoginLink.classList.remove('is-hidden');
        if (userMenu) userMenu.classList.add('is-hidden');
        if (adminLink) adminLink.classList.add('is-hidden');
        updateSettingsButton(settingsBtn, false);
        updateSettingsButton(globalSettingsBtn, false);
    }
}

/**
 * Check if user is admin
 */
async function checkAdminRole(user) {
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
window.clearStaleFirebaseAuthState = clearStaleFirebaseAuthState;

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

function setupEmailAuthForm() {
    const form = document.getElementById('email-auth-form');
    if (!form || !firebase.auth) return;

    const emailInput = document.getElementById('email-auth-email');
    const passwordInput = document.getElementById('email-auth-password');
    const submitBtn = document.getElementById('email-auth-submit');
    const toggleBtn = document.getElementById('email-auth-toggle');
    const titleEl = document.getElementById('email-auth-title');
    const helperEl = document.getElementById('email-auth-helper');

    function updateUi() {
        if (!submitBtn || !toggleBtn || !titleEl || !helperEl) return;
        if (EMAIL_AUTH_MODE === 'login') {
            titleEl.textContent = '이메일로 로그인';
            submitBtn.textContent = '로그인';
            toggleBtn.textContent = '계정이 없나요? 회원가입으로 전환';
            helperEl.textContent = '이미 만든 이메일 계정으로 로그인합니다.';
        } else {
            titleEl.textContent = '이메일로 회원가입';
            submitBtn.textContent = '회원가입';
            toggleBtn.textContent = '이미 계정이 있나요? 로그인으로 전환';
            helperEl.textContent = '새 이메일 계정을 만들고 로그인합니다.';
        }
    }

    updateUi();

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            EMAIL_AUTH_MODE = EMAIL_AUTH_MODE === 'login' ? 'signup' : 'login';
            updateUi();
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!emailInput || !passwordInput || !submitBtn) return;

        const email = String(emailInput.value || '').trim();
        const password = String(passwordInput.value || '');

        if (!email || !password) {
            alert('이메일과 비밀번호를 모두 입력해 주세요.');
            return;
        }

        if (password.length < 6) {
            alert('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = EMAIL_AUTH_MODE === 'login' ? '로그인 중...' : '가입 중...';

        try {
            if (EMAIL_AUTH_MODE === 'login') {
                await firebase.auth().signInWithEmailAndPassword(email, password);
            } else {
                await firebase.auth().createUserWithEmailAndPassword(email, password);
            }

            window.location.href = '/index.html';
        } catch (error) {
            console.error('Email auth error:', error);
            if (isInvalidAuthSessionError(error)) {
                await firebase.auth().signOut().catch(function () {});
                clearStaleFirebaseAuthState();
            }
            alert('이메일 인증 중 오류가 발생했습니다: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}
