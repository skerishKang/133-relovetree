/**
 * Relovetree - Admin Dashboard Logic
 */

// Configuration
const ADMIN_EMAILS = ['padiemipu@gmail.com', 'limone@example.com'];

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase (if not already initialized in shared.js, but shared.js might not auto-init if config is in index.js)
    // We need to ensure Firebase is ready. Since we included SDKs in admin.html, we need to init app.
    // However, shared.js or index.js usually holds the config.
    // For Admin, we'll duplicate config or rely on shared.js if it exposes init.
    // Assuming shared.js exposes 'APP_CONFIG' but maybe not firebase init if it was in index.js.
    // Let's grab config from index.js logic or re-declare it here for safety as admin is separate.

    const firebaseConfig = {
        apiKey: "AIzaSyDQNR8bNIp4LG4EGNwl1ew8B7Har-KJC90",
        authDomain: "relovetree.firebaseapp.com",
        projectId: "relovetree",
        storageBucket: "relovetree.firebasestorage.app",
        messagingSenderId: "1091063063536",
        appId: "1:1091063063536:web:065a746e2578c47dd7b335",
        measurementId: "G-D4R5XMGFK5"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const loginOverlay = document.getElementById('loginOverlay');
    const loginStatus = document.getElementById('loginStatus');

    function setStatus(msg) {
        if (loginStatus) loginStatus.textContent = msg;
    }

    // 1. Check Admin Auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            if (loginOverlay) loginOverlay.classList.remove('hidden');
            setStatus('로그인이 필요합니다.');
            return;
        }

        setStatus('권한 확인 중...');

        const isAdmin = ADMIN_EMAILS.includes(user.email) || await checkAdminRole(user.uid);

        if (!isAdmin) {
            setStatus('관리자 권한이 없습니다. (' + user.email + ')');
            if (loginOverlay) loginOverlay.classList.remove('hidden');
            return;
        }

        if (loginOverlay) loginOverlay.classList.add('hidden');
        initDashboard(user);
    });

    // Login Button
    const loginBtn = document.getElementById('adminLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider).catch(e => setStatus(e.message));
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            firebase.auth().signOut().then(() => window.location.reload());
        });
    }

    // Navigation
    setupNavigation();
});

async function checkAdminRole(uid) {
    try {
        const doc = await firebase.firestore().collection('users').doc(uid).get();
        return doc.exists && doc.data().role === 'admin';
    } catch (e) {
        return false;
    }
}

function initDashboard(user) {
    const emailEl = document.getElementById('adminEmail');
    if (emailEl) emailEl.textContent = user.email;

    // Set Date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString();

    loadStats();
    loadUsers();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active', 'bg-slate-800', 'text-white'));
            item.classList.add('active', 'bg-slate-800', 'text-white');
            item.classList.remove('text-slate-300');

            const target = item.dataset.target;
            sections.forEach(section => {
                if (section.id === target) section.classList.remove('hidden');
                else section.classList.add('hidden');
            });
        });
    });
}

// --- Data Loading ---

async function loadStats() {
    const db = firebase.firestore();
    try {
        const snapshot = await db.collection('users').get();
        const total = snapshot.size;

        let active = 0;
        let pro = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const recentUsers = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const lastLogin = data.lastLogin ? data.lastLogin.toDate() : new Date(0);

            if (lastLogin >= today) active++;
            if (data.role === 'pro') pro++;

            recentUsers.push({ id: doc.id, ...data });
        });

        document.getElementById('totalUsers').textContent = total;
        document.getElementById('activeUsers').textContent = active;
        document.getElementById('proUsers').textContent = pro;

        // Recent Users Table
        recentUsers.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        renderRecentUsers(recentUsers.slice(0, 5));

    } catch (e) {
        console.error('Stats error:', e);
    }
}

function renderRecentUsers(users) {
    const tbody = document.getElementById('recentUsersTable');
    if (!tbody) return;
    tbody.innerHTML = users.map(user => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4 flex items-center gap-3">
                <img src="${user.photoURL || 'https://via.placeholder.com/32'}" class="w-8 h-8 rounded-full">
                <span class="font-medium text-slate-900">${user.displayName || 'No Name'}</span>
            </td>
            <td class="px-6 py-4">${user.email}</td>
            <td class="px-6 py-4 text-slate-500">${user.createdAt ? user.createdAt.toDate().toLocaleDateString() : '-'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs font-bold ${user.role === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">
                    ${(user.role || 'free').toUpperCase()}
                </span>
            </td>
        </tr>
    `).join('');
}

async function loadUsers() {
    const db = firebase.firestore();
    const tbody = document.getElementById('allUsersTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">로딩 중...</td></tr>';

    try {
        const snapshot = await db.collection('users').orderBy('lastLogin', 'desc').get();

        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 border-b border-slate-50 last:border-0';
            tr.innerHTML = `
                <td class="px-6 py-4 flex items-center gap-3">
                    <img src="${user.photoURL || 'https://via.placeholder.com/32'}" class="w-8 h-8 rounded-full">
                    <span class="font-medium text-slate-900">${user.displayName || 'No Name'}</span>
                </td>
                <td class="px-6 py-4">${user.email}</td>
                <td class="px-6 py-4">
                    <select onchange="updateUserRole('${doc.id}', this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-brand-500">
                        <option value="free" ${user.role === 'free' || !user.role ? 'selected' : ''}>Free</option>
                        <option value="pro" ${user.role === 'pro' ? 'selected' : ''}>Pro</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td class="px-6 py-4 text-slate-500">${user.lastLogin ? user.lastLogin.toDate().toLocaleDateString() : '-'}</td>
                <td class="px-6 py-4">
                    <button onclick="deleteUser('${doc.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        삭제
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Load users error:', e);
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">데이터 로드 실패</td></tr>';
    }
}

// --- Actions ---

window.updateUserRole = async function (uid, newRole) {
    if (!confirm(`등급을 ${newRole}(으)로 변경하시겠습니까?`)) {
        loadUsers();
        return;
    }
    try {
        await firebase.firestore().collection('users').doc(uid).update({ role: newRole });
        alert('등급이 변경되었습니다.');
    } catch (e) {
        alert('오류: ' + e.message);
    }
};

window.deleteUser = async function (uid) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
        await firebase.firestore().collection('users').doc(uid).delete();
        alert('삭제되었습니다.');
        loadUsers();
    } catch (e) {
        alert('오류: ' + e.message);
    }
};
