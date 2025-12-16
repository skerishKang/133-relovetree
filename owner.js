let ownerUser = null;
let ownerTreesCache = [];

let ownerUiState = {
    pageIndex: 0,
    pageSize: 20,
    sortKey: 'updated_desc',
    query: ''
};

let renameTargetTreeId = '';
let deleteTargetTreeId = '';

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

    tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-slate-400 text-sm">불러오는 중...</td></tr>';

    if (!ownerUser) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-slate-400 text-sm">로그인 후 이용해 주세요.</td></tr>';
        updateResultsSummary(0, 0);
        updatePagination(0);
        updateCreateUi();
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
        ownerUiState.pageIndex = 0;
        renderOwnerTrees();
    } catch (e) {
        console.error('loadOwnerTrees failed:', e);
        tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-red-500 text-sm">불러오기 실패</td></tr>';
        updateResultsSummary(0, 0);
        updatePagination(0);
    }
}

function renderOwnerTrees() {
    const tbody = document.getElementById('owner-tree-tbody');
    if (!tbody) return;

    const searchInput = document.getElementById('tree-search');
    const q = searchInput ? String(searchInput.value || '').trim().toLowerCase() : '';
    ownerUiState.query = q;

    const sortSelect = document.getElementById('sort-select');
    const sortKey = sortSelect ? String(sortSelect.value || 'updated_desc') : 'updated_desc';
    ownerUiState.sortKey = sortKey;

    const pageSizeSelect = document.getElementById('page-size');
    const parsedPageSize = pageSizeSelect ? parseInt(String(pageSizeSelect.value || '20'), 10) : 20;
    ownerUiState.pageSize = (!isNaN(parsedPageSize) && parsedPageSize > 0) ? parsedPageSize : 20;

    let items = Array.isArray(ownerTreesCache) ? ownerTreesCache.slice() : [];
    const totalCount = items.length;
    if (q) {
        items = items.filter((t) => {
            const id = (t.id || '').toLowerCase();
            const name = (t.name || '').toLowerCase();
            return id.includes(q) || name.includes(q);
        });
    }

    items = applyOwnerSort(items, sortKey);

    const filteredCount = items.length;
    const totalPages = Math.max(1, Math.ceil(filteredCount / ownerUiState.pageSize));
    if (ownerUiState.pageIndex < 0) ownerUiState.pageIndex = 0;
    if (ownerUiState.pageIndex > totalPages - 1) ownerUiState.pageIndex = totalPages - 1;

    const start = ownerUiState.pageIndex * ownerUiState.pageSize;
    const end = start + ownerUiState.pageSize;
    const pageItems = items.slice(start, end);

    tbody.innerHTML = '';

    if (!pageItems.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-slate-400 text-sm">표시할 트리가 없습니다.</td></tr>';
        updateResultsSummary(totalCount, filteredCount);
        updatePagination(filteredCount);
        updateCreateUi();
        return;
    }

    pageItems.forEach((t) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';

        const editorUrl = 'editor.html?id=' + encodeURIComponent(t.id);
        const viewText = (t.viewCount || 0) + ' / ' + (t.likeCount || 0) + ' / ' + (t.shareCount || 0);
        const updatedFull = formatDateTimeFull(t.lastUpdated);
        const updatedRel = formatRelativeTime(t.lastUpdated);

        tr.innerHTML = `
            <td class="px-5 py-3">
                <div class="flex flex-col">
                    <span class="text-sm font-black text-slate-900 truncate">${escapeHtml(String(t.name || ''))}</span>
                    <a class="text-[11px] text-slate-400 truncate hover:underline" href="${editorUrl}">${escapeHtml(String(t.id || ''))}</a>
                </div>
            </td>
            <td class="px-5 py-3 text-[11px] text-slate-600" title="${escapeHtml(updatedFull)}">${escapeHtml(updatedRel)}</td>
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

    updateResultsSummary(totalCount, filteredCount);
    updatePagination(filteredCount);
    updateCreateUi();
}

function applyOwnerSort(items, sortKey) {
    const list = Array.isArray(items) ? items.slice() : [];

    function byUpdatedDesc(a, b) { return new Date(b.lastUpdated) - new Date(a.lastUpdated); }
    function byUpdatedAsc(a, b) { return new Date(a.lastUpdated) - new Date(b.lastUpdated); }
    function byNameAsc(a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'ko'); }
    function byNameDesc(a, b) { return String(b.name || '').localeCompare(String(a.name || ''), 'ko'); }
    function byNodesDesc(a, b) { return (b.nodeCount || 0) - (a.nodeCount || 0); }
    function byLikesDesc(a, b) { return (b.likeCount || 0) - (a.likeCount || 0); }
    function byViewsDesc(a, b) { return (b.viewCount || 0) - (a.viewCount || 0); }

    if (sortKey === 'updated_asc') list.sort(byUpdatedAsc);
    else if (sortKey === 'name_asc') list.sort(byNameAsc);
    else if (sortKey === 'name_desc') list.sort(byNameDesc);
    else if (sortKey === 'nodes_desc') list.sort(byNodesDesc);
    else if (sortKey === 'likes_desc') list.sort(byLikesDesc);
    else if (sortKey === 'views_desc') list.sort(byViewsDesc);
    else list.sort(byUpdatedDesc);

    return list;
}

function formatDateTimeFull(value) {
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('ko-KR');
    } catch (e) {
        return '';
    }
}

function formatRelativeTime(value) {
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        const diffMs = Date.now() - d.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return diffSec + '초 전';
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return diffMin + '분 전';
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return diffHour + '시간 전';
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 30) return diffDay + '일 전';
        const diffMonth = Math.floor(diffDay / 30);
        if (diffMonth < 12) return diffMonth + '개월 전';
        const diffYear = Math.floor(diffMonth / 12);
        return diffYear + '년 전';
    } catch (e) {
        return '';
    }
}

function updateResultsSummary(totalCount, filteredCount) {
    const el = document.getElementById('results-summary');
    if (!el) return;
    if (!ownerUser) {
        el.textContent = '';
        return;
    }
    if (ownerUiState.query) {
        el.textContent = '검색 결과 ' + filteredCount + '개 / 전체 ' + totalCount + '개';
    } else {
        el.textContent = '총 ' + totalCount + '개';
    }
}

function updatePagination(filteredCount) {
    const label = document.getElementById('pagination-label');
    const firstBtn = document.getElementById('page-first');
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    const lastBtn = document.getElementById('page-last');

    const pageSize = ownerUiState.pageSize || 20;
    const totalPages = Math.max(1, Math.ceil((filteredCount || 0) / pageSize));
    const pageIndex = ownerUiState.pageIndex || 0;

    if (label) {
        if (!ownerUser) {
            label.textContent = '';
        } else {
            label.textContent = '페이지 ' + (pageIndex + 1) + ' / ' + totalPages;
        }
    }

    const disableAll = !ownerUser || (filteredCount || 0) === 0;
    const isFirst = pageIndex <= 0;
    const isLast = pageIndex >= totalPages - 1;

    if (firstBtn) firstBtn.disabled = disableAll || isFirst;
    if (prevBtn) prevBtn.disabled = disableAll || isFirst;
    if (nextBtn) nextBtn.disabled = disableAll || isLast;
    if (lastBtn) lastBtn.disabled = disableAll || isLast;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function openRenameDialog(treeId) {
    if (!ownerUser) return;
    const dlg = document.getElementById('rename-dialog');
    const subtitle = document.getElementById('rename-dialog-subtitle');
    const input = document.getElementById('rename-input');
    if (!dlg || !input) return;

    const item = ownerTreesCache.find((t) => t.id === treeId);
    const currentName = item ? String(item.name || '') : '';
    renameTargetTreeId = treeId;
    if (subtitle) subtitle.textContent = treeId;
    input.value = currentName;

    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
    }

    setTimeout(() => {
        try {
            input.focus();
            input.select();
        } catch (e) {
        }
    }, 30);
}

async function saveRenameDialog() {
    if (!ownerUser) return;
    const treeId = renameTargetTreeId;
    if (!treeId) return;

    const input = document.getElementById('rename-input');
    const dlg = document.getElementById('rename-dialog');
    const nextName = input ? String(input.value || '').trim() : '';
    if (!nextName) return;

    try {
        const db = firebase.firestore();
        await db.collection('trees').doc(treeId).set({
            name: nextName,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        ownerShowToast('저장되었습니다');
        if (dlg && typeof dlg.close === 'function') dlg.close();
        renameTargetTreeId = '';
        await loadOwnerTrees();
    } catch (e) {
        console.error('saveRenameDialog failed:', e);
        ownerShowToast('저장 실패');
    }
}

function closeRenameDialog() {
    const dlg = document.getElementById('rename-dialog');
    if (dlg && typeof dlg.close === 'function') dlg.close();
    renameTargetTreeId = '';
}

function openDeleteDialog(treeId) {
    if (!ownerUser) return;
    const dlg = document.getElementById('delete-dialog');
    const subtitle = document.getElementById('delete-dialog-subtitle');
    const input = document.getElementById('delete-confirm-input');
    const confirmBtn = document.getElementById('delete-confirm');
    if (!dlg || !input || !confirmBtn) return;

    const item = ownerTreesCache.find((t) => t.id === treeId);
    const name = item ? String(item.name || '') : '';

    deleteTargetTreeId = treeId;
    if (subtitle) subtitle.textContent = name ? (name + ' · ' + treeId) : treeId;
    input.value = '';
    confirmBtn.disabled = true;

    try {
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    } catch (e) {
    }

    setTimeout(() => {
        try {
            input.focus();
        } catch (e) {
        }
    }, 30);
}

function closeDeleteDialog() {
    const dlg = document.getElementById('delete-dialog');
    if (dlg && typeof dlg.close === 'function') dlg.close();
    deleteTargetTreeId = '';
    const input = document.getElementById('delete-confirm-input');
    if (input) input.value = '';
}

function updateDeleteConfirmUi() {
    const input = document.getElementById('delete-confirm-input');
    const btn = document.getElementById('delete-confirm');
    if (!input || !btn) return;
    const typed = String(input.value || '').trim();
    btn.disabled = !deleteTargetTreeId || typed !== deleteTargetTreeId;
}

async function confirmDeleteDialog() {
    if (!ownerUser) return;
    const treeId = deleteTargetTreeId;
    if (!treeId) return;

    const input = document.getElementById('delete-confirm-input');
    const typed = input ? String(input.value || '').trim() : '';
    if (typed !== treeId) return;

    try {
        const db = firebase.firestore();
        await db.collection('trees').doc(treeId).delete();
        ownerShowToast('삭제되었습니다');
        closeDeleteDialog();
        await loadOwnerTrees();
    } catch (e) {
        console.error('confirmDeleteDialog failed:', e);
        ownerShowToast('삭제 실패');
    }
}

function updateCreateUi() {
    const createBtn = document.getElementById('create-tree-btn');
    const input = document.getElementById('new-tree-name');
    if (!createBtn) return;

    const name = input ? String(input.value || '').trim() : '';
    createBtn.disabled = !ownerUser || !name;
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
            ownerUiState.pageIndex = 0;
            renderOwnerTrees();
        });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            ownerUiState.pageIndex = 0;
            renderOwnerTrees();
        });
    }

    const pageSizeSelect = document.getElementById('page-size');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', () => {
            ownerUiState.pageIndex = 0;
            renderOwnerTrees();
        });
    }

    const pageFirst = document.getElementById('page-first');
    if (pageFirst) {
        pageFirst.addEventListener('click', () => {
            ownerUiState.pageIndex = 0;
            renderOwnerTrees();
        });
    }

    const pagePrev = document.getElementById('page-prev');
    if (pagePrev) {
        pagePrev.addEventListener('click', () => {
            ownerUiState.pageIndex = Math.max(0, (ownerUiState.pageIndex || 0) - 1);
            renderOwnerTrees();
        });
    }

    const pageNext = document.getElementById('page-next');
    if (pageNext) {
        pageNext.addEventListener('click', () => {
            ownerUiState.pageIndex = (ownerUiState.pageIndex || 0) + 1;
            renderOwnerTrees();
        });
    }

    const pageLast = document.getElementById('page-last');
    if (pageLast) {
        pageLast.addEventListener('click', () => {
            const total = Array.isArray(ownerTreesCache) ? ownerTreesCache.length : 0;
            const sizeEl = document.getElementById('page-size');
            const parsed = sizeEl ? parseInt(String(sizeEl.value || '20'), 10) : 20;
            const size = (!isNaN(parsed) && parsed > 0) ? parsed : 20;

            const qEl = document.getElementById('tree-search');
            const q = qEl ? String(qEl.value || '').trim().toLowerCase() : '';
            let filtered = total;
            if (q) {
                const list = Array.isArray(ownerTreesCache) ? ownerTreesCache : [];
                filtered = list.filter((t) => {
                    const id = (t.id || '').toLowerCase();
                    const name = (t.name || '').toLowerCase();
                    return id.includes(q) || name.includes(q);
                }).length;
            }
            const totalPages = Math.max(1, Math.ceil(filtered / size));
            ownerUiState.pageIndex = totalPages - 1;
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

    const createNameInput = document.getElementById('new-tree-name');
    if (createNameInput) {
        createNameInput.addEventListener('input', () => {
            updateCreateUi();
        });
        createNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const btn = document.getElementById('create-tree-btn');
                if (btn && !btn.disabled) btn.click();
            }
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
                openRenameDialog(id);
            } else if (action === 'delete') {
                openDeleteDialog(id);
            }
        });
    }

    const renameCancel = document.getElementById('rename-cancel');
    if (renameCancel) renameCancel.addEventListener('click', closeRenameDialog);
    const renameCancelX = document.getElementById('rename-cancel-x');
    if (renameCancelX) renameCancelX.addEventListener('click', closeRenameDialog);
    const renameSave = document.getElementById('rename-save');
    if (renameSave) renameSave.addEventListener('click', saveRenameDialog);
    const renameInput = document.getElementById('rename-input');
    if (renameInput) {
        renameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveRenameDialog();
            }
        });
    }

    const deleteCancel = document.getElementById('delete-cancel');
    if (deleteCancel) deleteCancel.addEventListener('click', closeDeleteDialog);
    const deleteCancelX = document.getElementById('delete-cancel-x');
    if (deleteCancelX) deleteCancelX.addEventListener('click', closeDeleteDialog);
    const deleteConfirm = document.getElementById('delete-confirm');
    if (deleteConfirm) deleteConfirm.addEventListener('click', confirmDeleteDialog);
    const deleteInput = document.getElementById('delete-confirm-input');
    if (deleteInput) {
        deleteInput.addEventListener('input', updateDeleteConfirmUi);
        deleteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const btn = document.getElementById('delete-confirm');
                if (btn && !btn.disabled) confirmDeleteDialog();
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
    updateCreateUi();

    if (firebase && firebase.auth && firebase.auth()) {
        firebase.auth().onAuthStateChanged(async (user) => {
            ownerUser = user;
            setOwnerAuthUi(ownerUser);
            await loadOwnerTrees();
            updateCreateUi();
        });
    }
});
