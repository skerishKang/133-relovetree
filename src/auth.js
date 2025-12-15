/**
 * Relovetree - Authentication Module
 * Handles Google Login/Logout and User Session
 */

// Configuration
const AUTH_CONFIG = {
    adminEmails: ['padiemipu@gmail.com', 'limone@example.com', 'admin.test@lovetree.dev'] // Replace with actual admin emails
};

let EMAIL_AUTH_MODE = 'login';

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
    const emailLoginLink = document.getElementById('email-login-link');

    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (emailLoginLink) emailLoginLink.classList.add('hidden');
        if (userMenu) userMenu.classList.remove('hidden');
        if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        if (userName) userName.textContent = user.displayName;

        // Check Admin Role (Client-side check for UI only, secured by Rules/Backend)
        checkAdminRole(user).then(isAdmin => {
            if (isAdmin && adminLink) adminLink.classList.remove('hidden');
        });

    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (emailLoginLink) emailLoginLink.classList.remove('hidden');
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

            window.location.href = 'index.html';
        } catch (error) {
            console.error('Email auth error:', error);
            alert('이메일 인증 중 오류가 발생했습니다: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}
