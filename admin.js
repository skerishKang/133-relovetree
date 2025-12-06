/**
 * Relovetree - Admin Dashboard Logic
 */

// Configuration
const ADMIN_EMAILS = ['padiemipu@gmail.com', 'limone@example.com'];
const AI_HELPER_ENDPOINT = 'https://lovetree.limone.dev/.netlify/functions/ai-helper';

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

window.editBotProfile = async function (uid) {
    const db = firebase.firestore();
    try {
        const doc = await db.collection('users').doc(uid).get();
        let current = '';
        if (doc.exists) {
            const data = doc.data() || {};
            if (data.botProfile) {
                current = String(data.botProfile);
            }
        }

        const input = window.prompt('이 사용자를 AI 봇으로 사용할 때의 말투/설명을 입력하세요.\n예: 과몰입 여돌 덕후, 항상 감탄사 많이 씀', current);
        if (input === null) return;

        const trimmed = input.trim();
        if (trimmed) {
            await db.collection('users').doc(uid).update({ botProfile: trimmed });
        } else {
            await db.collection('users').doc(uid).update({ botProfile: firebase.firestore.FieldValue.delete() });
        }

        alert('AI 프로필이 업데이트되었습니다.');
    } catch (e) {
        alert('AI 프로필 업데이트 중 오류: ' + e.message);
    }
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
                    <div class="flex gap-2">
                        <button onclick="editBotProfile('${doc.id}')" class="text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                            AI 프로필
                        </button>
                        <button onclick="createAiDemoTree('${doc.id}')" class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                            AI 트리
                        </button>
                        <button onclick="createAiReactions('${doc.id}')" class="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                            AI 반응
                        </button>
                        <button onclick="deleteUser('${doc.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                            삭제
                        </button>
                    </div>
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

window.createAiDemoTree = async function (uid) {
    const db = firebase.firestore();
    const defaultPrompt = '플레이브 활동을 입덕부터 최근까지 4단계로 정리해줘';
    const promptText = window.prompt('이 사용자의 트리를 어떤 주제로 만들까요?', defaultPrompt);
    if (promptText === null) return;

    const count = 4;

    let botProfileSuffix = '';
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const u = userDoc.data() || {};
            if (u.botProfile) {
                botProfileSuffix = '\n\n[봇 프로필]\n' + String(u.botProfile);
            }
        }
    } catch (e) {
        console.warn('AI 트리용 봇 프로필 조회 실패:', e);
    }

    const finalPrompt = (promptText || defaultPrompt) + botProfileSuffix;

    let suggestions = [];
    try {
        const res = await fetch(AI_HELPER_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'tree', payload: { prompt: finalPrompt, count: count } })
        });
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.result)) {
                suggestions = data.result;
            }
        }
    } catch (e) {
        console.error('AI helper error:', e);
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
        const now = new Date();
        const base = promptText || 'AI 러브트리';
        suggestions = [];
        for (let i = 0; i < count; i++) {
            const d = new Date(now.getTime() - (count - 1 - i) * 7 * 24 * 60 * 60 * 1000);
            const date = d.toISOString().split('T')[0];
            suggestions.push({
                title: base + ' - 순간 ' + (i + 1),
                date: date,
                description: ''
            });
        }
    }

    const nodes = [];
    const edges = [];
    suggestions.forEach((item, index) => {
        const id = index + 1;
        nodes.push({
            id: id,
            x: 200 + index * 320,
            y: 200,
            title: item.title || '새 순간',
            date: item.date || new Date().toISOString().split('T')[0],
            videoId: '',
            moments: []
        });
        if (index > 0) {
            edges.push({ from: id - 1, to: id });
        }
    });

    const treeId = 'ai-' + uid + '-' + Date.now();
    const name = '[AI] ' + (promptText || '데모 트리');

    const dataToSave = {
        name: name,
        nodes: nodes,
        edges: edges,
        likes: [],
        comments: [],
        ownerId: uid,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('trees').doc(treeId).set(dataToSave, { merge: true });
        const url = 'editor.html?id=' + encodeURIComponent(treeId);
        alert('AI 트리가 생성되었습니다. 에디터에서 확인해 보세요.\n' + url);
        if (window.confirm('지금 바로 에디터에서 열어볼까요?')) {
            window.open(url, '_blank');
        }
    } catch (e) {
        console.error('AI 트리 생성 오류:', e);
        alert('AI 트리 생성 중 오류가 발생했습니다: ' + e.message);
    }
};

// 특정 사용자를 AI 봇처럼 사용해 여러 트리에 자동으로 좋아요/댓글을 생성하는 함수
window.createAiReactions = async function (uid) {
    const db = firebase.firestore();

    // 몇 개의 트리에 반응을 남길지 입력 받기
    const countInput = window.prompt('이 사용자가 AI처럼 반응할 트리 개수를 입력하세요. (기본 3)', '3');
    if (countInput === null) return;

    const reactionCount = parseInt(countInput, 10);
    if (!reactionCount || reactionCount <= 0) {
        alert('1 이상의 숫자를 입력해 주세요.');
        return;
    }

    try {
        // 사용자 정보에서 닉네임/표시 이름 가져오기
        let userName = '익명';
        let botProfile = '';
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const u = userDoc.data() || {};
                if (u.displayName) userName = u.displayName;
                else if (u.email) userName = u.email.split('@')[0];
                if (u.botProfile) botProfile = String(u.botProfile);
            }
        } catch (e) {
            console.warn('AI 반응용 사용자 정보 조회 실패:', e);
        }

        // 최근 트리 몇 개 가져오기 (본인 소유/타인 소유 모두 포함)
        const snapshot = await db.collection('trees')
            .orderBy('lastUpdated', 'desc')
            .limit(30)
            .get();

        const candidates = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};

            // 이미 이 사용자가 좋아요를 누른 트리는 건너뛴다
            const likes = Array.isArray(data.likes) ? data.likes : [];
            if (likes.includes(uid)) return;

            candidates.push({ id: doc.id, data });
        });

        if (candidates.length === 0) {
            alert('AI가 반응할 수 있는 트리가 없습니다. (이미 좋아요를 눌렀거나 트리가 없습니다)');
            return;
        }

        // 무작위로 reactionCount 개까지 선택
        const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
        const targets = shuffled.slice(0, Math.min(reactionCount, shuffled.length));

        const reactedTrees = [];

        for (const item of targets) {
            const treeId = item.id;
            const treeData = item.data;
            const treeName = treeData.name || '이 트리';

            // AI에게 댓글 문장 한 줄 생성 요청
            let commentText = '';
            let basePrompt = `${treeName} 트리를 본 팬이 남길만한 한 줄 감상평을 한국어로 짧게 써줘. 최대 1문장.`;
            if (botProfile) {
                basePrompt += `\n\n이 계정의 말투: ${botProfile}`;
            }
            try {
                const res = await fetch(AI_HELPER_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'comment',
                        payload: {
                            prompt: basePrompt,
                            nodeTitle: treeName
                        }
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.result) && data.result.length > 0) {
                        commentText = String(data.result[0]);
                    }
                }
            } catch (e) {
                console.warn('AI 반응 생성 중 오류:', e);
            }

            // AI 호출이 실패했거나 결과가 비어 있으면 기본 문장 사용
            if (!commentText) {
                commentText = `${treeName}를 보면 다시 입덕하는 느낌이에요.`;
            }

            // 좋아요 추가
            try {
                await db.collection('trees').doc(treeId).update({
                    likes: firebase.firestore.FieldValue.arrayUnion(uid)
                });
            } catch (e) {
                console.warn('AI 좋아요 업데이트 실패:', e);
            }

            // 댓글 추가
            try {
                await db.collection('trees').doc(treeId).collection('comments').add({
                    text: commentText,
                    userId: uid,
                    userName: userName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isAiBot: true
                });
            } catch (e) {
                console.warn('AI 댓글 생성 실패:', e);
            }

            reactedTrees.push(treeName);
        }

        if (reactedTrees.length > 0) {
            alert(`총 ${reactedTrees.length}개의 트리에 AI 반응이 생성되었습니다.\n\n- ` + reactedTrees.join('\n- '));
        } else {
            alert('실제로 반응이 생성된 트리가 없습니다. (모든 시도가 실패했습니다)');
        }
    } catch (e) {
        console.error('AI 반응 생성 중 오류:', e);
        alert('AI 반응 생성 중 오류가 발생했습니다: ' + e.message);
    }
};
