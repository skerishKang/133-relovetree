let ownerUser = null;
let ownerTreesCache = [];

function ownerShowToast(message) {
    try {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm opacity-0 transition-opacity duration-300 z-50';
        toast.innerText = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('opacity-100'));
        setTimeout(() => {
            toast.classList.remove('opacity-100');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    } catch (e) {
        alert(message);
    }
}

function setOwnerAuthUi(user) {
    const loginBtn = document.getElementById('owner-login-btn');
    const logoutBtn = document.getElementById('owner-logout-btn');
    const subtitle = document.getElementById('owner-subtitle');

    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (subtitle) subtitle.textContent = user.email ? ('로그인됨: ' + user.email) : '로그인됨';
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (subtitle) subtitle.textContent = '로그인이 필요합니다. (본인 트리만 표시)';
    }
}

function normalizeTreeItem(doc) {
    const data = doc && typeof doc.data === 'function' ? (doc.data() || {}) : {};

    let lastUpdated = data.lastUpdated;
    if (lastUpdated && typeof lastUpdated.toDate === 'function') {
        lastUpdated = lastUpdated.toDate().toISOString();
    } else if (!lastUpdated) {
        lastUpdated = new Date().toISOString();
    }

    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    const nodeCount = typeof data.nodeCount === 'number' ? data.nodeCount : nodes.length;

    const likeCount = typeof data.likeCount === 'number'
        ? data.likeCount
        : (Array.isArray(data.likes) ? data.likes.length : 0);

    const viewCount = typeof data.viewCount === 'number' ? data.viewCount : 0;
    const shareCount = typeof data.shareCount === 'number' ? data.shareCount : 0;

    return {
        id: doc && doc.id ? doc.id : '',
        name: data.name || (doc && doc.id ? decodeURIComponent(doc.id) : ''),
        ownerId: data.ownerId || null,
        lastUpdated,
        nodeCount,
        likeCount,
        viewCount,
        shareCount
    };
}

async function loadOwnerTrees() {
    const tbody = document.getElementById('owner-tree-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="px-5 py-6 text-center text-slate-400 text-sm">불러오는 중...</td></tr>';

    if (!ownerUser) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-5 py-6 text-center text-slate-400 text-sm">로그인 후 이용해 주세요.</td></tr>';
        return;
    }

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('trees')
            .where('ownerId', '==', ownerUser.uid)
            .limit(100)
            .get();

        const items = [];
        snapshot.forEach((doc) => {
            items.push(normalizeTreeItem(doc));
        });

        items.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
        ownerTreesCache = items;
        renderOwnerTrees();
    } catch (e) {
        console.error('loadOwnerTrees failed:', e);
        tbody.innerHTML = '<tr><td colspan="4" class="px-5 py-6 text-center text-red-500 text-sm">불러오기 실패</td></tr>';
    }
}

function renderOwnerTrees() {
    const tbody = document.getElementById('owner-tree-tbody');
    if (!tbody) return;

    const searchInput = document.getElementById('tree-search');
    const q = searchInput ? String(searchInput.value || '').trim().toLowerCase() : '';

    let items = Array.isArray(ownerTreesCache) ? ownerTreesCache.slice() : [];
    if (q) {
        items = items.filter((t) => {
            const id = (t.id || '').toLowerCase();
            const name = (t.name || '').toLowerCase();
            return id.includes(q) || name.includes(q);
        });
    }

    tbody.innerHTML = '';

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-5 py-6 text-center text-slate-400 text-sm">표시할 트리가 없습니다.</td></tr>';
        return;
    }

    items.forEach((t) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';

        const editorUrl = 'editor.html?id=' + encodeURIComponent(t.id);
        const viewText = (t.viewCount || 0) + ' / ' + (t.likeCount || 0) + ' / ' + (t.shareCount || 0);

        tr.innerHTML = `
            <td class="px-5 py-3">
                <div class="flex flex-col">
                    <span class="text-sm font-black text-slate-900 truncate">${escapeHtml(String(t.name || ''))}</span>
                    <a class="text-[11px] text-slate-400 truncate hover:underline" href="${editorUrl}">${escapeHtml(String(t.id || ''))}</a>
                </div>
            </td>
            <td class="px-5 py-3 text-[11px] text-slate-600">${t.nodeCount || 0}</td>
            <td class="px-5 py-3 text-[11px] text-slate-600">${viewText}</td>
            <td class="px-5 py-3">
                <div class="flex flex-wrap gap-2">
                    <a href="${editorUrl}" class="px-3 py-1.5 rounded-lg text-[11px] font-black bg-brand-500 text-white hover:bg-brand-600">열기</a>
                    <button type="button" class="px-3 py-1.5 rounded-lg text-[11px] font-black bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" data-action="rename" data-id="${escapeHtml(String(t.id || ''))}">이름 변경</button>
                    <button type="button" class="px-3 py-1.5 rounded-lg text-[11px] font-black bg-white border border-slate-200 text-red-600 hover:bg-red-50" data-action="delete" data-id="${escapeHtml(String(t.id || ''))}">삭제</button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function renameTree(treeId) {
    if (!ownerUser) return;
    const item = ownerTreesCache.find((t) => t.id === treeId);
    const currentName = item ? item.name : '';

    const nextName = prompt('새 트리 이름을 입력하세요.', currentName || '');
    if (nextName == null) return;
    const trimmed = String(nextName).trim();
    if (!trimmed) return;

    try {
        const db = firebase.firestore();
        await db.collection('trees').doc(treeId).set({
            name: trimmed,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        ownerShowToast('저장되었습니다');
        await loadOwnerTrees();
    } catch (e) {
        console.error('renameTree failed:', e);
        ownerShowToast('저장 실패');
    }
}

async function deleteTree(treeId) {
    if (!ownerUser) return;
    const ok = confirm('정말 삭제할까요? 삭제하면 되돌릴 수 없습니다.');
    if (!ok) return;

    try {
        const db = firebase.firestore();
        await db.collection('trees').doc(treeId).delete();
        ownerShowToast('삭제되었습니다');
        await loadOwnerTrees();
    } catch (e) {
        console.error('deleteTree failed:', e);
        ownerShowToast('삭제 실패');
    }
}

function bindOwnerEvents() {
    const loginBtn = document.getElementById('owner-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (typeof signInWithGoogle === 'function') {
                signInWithGoogle();
            }
        });
    }

    const logoutBtn = document.getElementById('owner-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (typeof signOut === 'function') {
                signOut();
            }
        });
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadOwnerTrees();
        });
    }

    const searchInput = document.getElementById('tree-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderOwnerTrees();
        });
    }

    const createBtn = document.getElementById('create-tree-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            if (!ownerUser) {
                ownerShowToast('로그인이 필요합니다.');
                return;
            }
            const input = document.getElementById('new-tree-name');
            const name = input ? String(input.value || '').trim() : '';
            if (!name) return;
            const treeId = encodeURIComponent(name);
            window.location.href = 'editor.html?id=' + treeId;
        });
    }

    const tbody = document.getElementById('owner-tree-tbody');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            if (!action || !id) return;

            if (action === 'rename') {
                renameTree(id);
            } else if (action === 'delete') {
                deleteTree(id);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof initApp === 'function') {
        initApp();
    }
    if (typeof initAuth === 'function') {
        initAuth();
    }

    bindOwnerEvents();

    try {
        ownerUser = await (typeof waitForAuth === 'function' ? waitForAuth() : Promise.resolve(null));
    } catch (e) {
        ownerUser = null;
    }

    setOwnerAuthUi(ownerUser);
    await loadOwnerTrees();

    if (firebase && firebase.auth && firebase.auth()) {
        firebase.auth().onAuthStateChanged(async (user) => {
            ownerUser = user;
            setOwnerAuthUi(ownerUser);
            await loadOwnerTrees();
        });
    }
});
