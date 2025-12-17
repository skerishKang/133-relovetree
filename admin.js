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
        const data = doc.exists ? (doc.data() || {}) : {};

        let currentProfile = '';
        if (data.botProfile) {
            currentProfile = String(data.botProfile);
        }

        const settings = data.botSettings || {};
        let tone = settings.tone || '';
        let fanType = settings.fanType || '';
        let length = settings.length || '';
        let emoji = settings.emoji || '';
        let extraNote = settings.extraNote || '';

        const profileInput = window.prompt('이 사용자를 AI 봇으로 사용할 때의 전체적인 말투/설명을 입력하세요.\n예: 과몰입 여돌 덕후, 항상 감탄사 많이 씀', currentProfile);
        if (profileInput === null) return;
        const profileTrimmed = profileInput.trim();

        if (window.confirm('톤, 팬 타입, 문장 길이, 이모지 사용량 같은 고급 설정도 함께 편집할까요?')) {
            const toneLabel = tone === 'over_reactive' ? '과몰입' :
                tone === 'friendly' ? '친근' :
                    tone === 'calm' ? '차분' :
                        tone === 'formal' ? '공식' : '';
            const toneInput = window.prompt('톤을 선택해 주세요. (숫자 또는 한글)\n1) 과몰입\n2) 친근\n3) 차분\n4) 공식', toneLabel);
            if (toneInput !== null) {
                const v = toneInput.trim();
                if (v === '1' || v === '과몰입') tone = 'over_reactive';
                else if (v === '2' || v === '친근') tone = 'friendly';
                else if (v === '3' || v === '차분') tone = 'calm';
                else if (v === '4' || v === '공식') tone = 'formal';
            }

            const fanLabel = fanType === 'fresh' ? '입덕러' :
                fanType === 'core' ? '고인물' :
                    fanType === 'light' ? '라이트팬' : '';
            const fanInput = window.prompt('팬 타입을 선택해 주세요.\n1) 입덕러\n2) 고인물\n3) 라이트팬', fanLabel);
            if (fanInput !== null) {
                const v = fanInput.trim();
                if (v === '1' || v === '입덕러') fanType = 'fresh';
                else if (v === '2' || v === '고인물') fanType = 'core';
                else if (v === '3' || v === '라이트팬') fanType = 'light';
            }

            const lengthLabel = length === 'short' ? '짧게' :
                length === 'medium' ? '보통' :
                    length === 'long' ? '길게' : '';
            const lengthInput = window.prompt('문장 길이를 선택해 주세요.\n1) 짧게\n2) 보통\n3) 길게', lengthLabel);
            if (lengthInput !== null) {
                const v = lengthInput.trim();
                if (v === '1' || v === '짧게') length = 'short';
                else if (v === '2' || v === '보통') length = 'medium';
                else if (v === '3' || v === '길게') length = 'long';
            }

            const emojiLabel = emoji === 'few' ? '거의 안씀' :
                emoji === 'normal' ? '적당히' :
                    emoji === 'many' ? '많이' : '';
            const emojiInput = window.prompt('이모지 사용량을 선택해 주세요.\n1) 거의 안씀\n2) 적당히\n3) 많이', emojiLabel);
            if (emojiInput !== null) {
                const v = emojiInput.trim();
                if (v === '1' || v === '거의 안씀') emoji = 'few';
                else if (v === '2' || v === '적당히') emoji = 'normal';
                else if (v === '3' || v === '많이') emoji = 'many';
            }

            const extraInput = window.prompt('추가 설명이 있다면 입력해 주세요. (선택 사항)', extraNote);
            if (extraInput !== null) {
                extraNote = extraInput.trim();
            }
        }

        const updatePayload = {};
        if (profileTrimmed) {
            updatePayload.botProfile = profileTrimmed;
        } else {
            updatePayload.botProfile = firebase.firestore.FieldValue.delete();
        }

        const hasSettings = tone || fanType || length || emoji || extraNote;
        if (hasSettings) {
            updatePayload.botSettings = { tone, fanType, length, emoji, extraNote };
        } else {
            updatePayload.botSettings = firebase.firestore.FieldValue.delete();
        }

        await db.collection('users').doc(uid).update(updatePayload);
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
            try {
                if (typeof provider.setCustomParameters === 'function') {
                    provider.setCustomParameters({ prompt: 'select_account' });
                }
            } catch (e) {
                console.warn('Admin Google Provider custom parameters 설정 실패:', e);
            }
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

    // 공통 '마이' 모달(settings-modal) 열기
    const adminMyBtn = document.getElementById('adminMyBtn');
    if (adminMyBtn) {
        adminMyBtn.addEventListener('click', () => {
            try {
                let modal = document.getElementById('settings-modal');
                if (!modal) {
                    if (typeof buildGlobalMyModalHTML === 'function') {
                        const wrap = document.createElement('div');
                        wrap.innerHTML = buildGlobalMyModalHTML();
                        const el = wrap.firstElementChild;
                        if (el) document.body.appendChild(el);
                    }
                    modal = document.getElementById('settings-modal');
                }

                if (!modal) {
                    alert('마이 메뉴를 열 수 없습니다.');
                    return;
                }

                if (!modal.dataset.outsideClickBound) {
                    modal.dataset.outsideClickBound = '1';
                    modal.addEventListener('click', function (e) {
                        try {
                            const rect = modal.getBoundingClientRect();
                            const x = e.clientX;
                            const y = e.clientY;
                            const isOutside = x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
                            if (isOutside) {
                                if (typeof modal.close === 'function') modal.close();
                                else modal.removeAttribute('open');
                            }
                        } catch (err) {
                        }
                    });
                }

                if (typeof modal.showModal === 'function') modal.showModal();
                else modal.setAttribute('open', 'open');
            } catch (e) {
                console.warn('adminMyBtn open settings-modal 실패:', e);
            }
        });
    }

    // AI 로그 새로고침 버튼
    const refreshAiLogsBtn = document.getElementById('refreshAiLogsBtn');
    if (refreshAiLogsBtn) {
        refreshAiLogsBtn.addEventListener('click', () => {
            loadAiLogs();
        });
    }

    const seedDemoCommunityBtn = document.getElementById('seedDemoCommunityBtn');
    if (seedDemoCommunityBtn) {
        seedDemoCommunityBtn.addEventListener('click', () => {
            openDemoSeedModal('community');
        });
    }

    const seedDemoUsersBtn = document.getElementById('seedDemoUsersBtn');
    if (seedDemoUsersBtn) {
        seedDemoUsersBtn.addEventListener('click', () => {
            openDemoSeedModal('users');
        });
    }

    const seedDemoTreesBtn = document.getElementById('seedDemoTreesBtn');
    if (seedDemoTreesBtn) {
        seedDemoTreesBtn.addEventListener('click', () => {
            openDemoSeedModal('trees');
        });
    }

    const recalcNodeCountBtn = document.getElementById('recalcNodeCountBtn');
    if (recalcNodeCountBtn) {
        recalcNodeCountBtn.addEventListener('click', async () => {
            if (!window.confirm('모든 트리의 노드 수(nodeCount)를 다시 계산하시겠습니까?')) return;
            await recalcAllTreesNodeCount();
        });
    }

    const demoSeedCancel = document.getElementById('demoSeedCancel');
    if (demoSeedCancel) {
        demoSeedCancel.addEventListener('click', () => {
            closeDemoSeedModal();
        });
    }

    const demoSeedConfirm = document.getElementById('demoSeedConfirm');
    if (demoSeedConfirm) {
        demoSeedConfirm.addEventListener('click', async () => {
            const inputEl = document.getElementById('demoSeedCount');
            let count = inputEl ? parseInt(inputEl.value, 10) : NaN;
            if (!Number.isFinite(count) || count <= 0) {
                count = null; // 입력 없으면 기본값 사용
            }

            const mode = currentDemoSeedMode;
            closeDemoSeedModal();

            if (mode === 'users') {
                await seedDemoUsers(count);
            } else if (mode === 'trees') {
                await seedDemoTrees(count);
            } else if (mode === 'community') {
                await seedDemoCommunityPosts(count);
            }
        });
    }

    // Navigation
    setupNavigation();

    // User search & filter
    const userSearchInput = document.getElementById('userSearch');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', () => {
            applyUserFiltersAndRender();
        });
    }

    const userFilterSelect = document.getElementById('userFilter');
    if (userFilterSelect) {
        userFilterSelect.addEventListener('change', () => {
            applyUserFiltersAndRender();
        });
    }
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
    loadAiLogs();
    initTreeManager(user);
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    console.log('[Admin] setupNavigation called:', {
        navCount: navItems.length,
        sectionCount: sections.length
    });

    navItems.forEach(item => {
        const target = item.dataset.target;
        console.log('[Admin] nav item found:', target);

        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.dataset.target;
            console.log('[Admin] nav click:', targetId);

            navItems.forEach(nav => {
                nav.classList.remove('active', 'bg-slate-800', 'text-white');
                if (!nav.classList.contains('hover:text-white')) {
                    nav.classList.add('text-slate-300');
                }
            });

            item.classList.add('active', 'bg-slate-800', 'text-white');
            item.classList.remove('text-slate-300');

            sections.forEach(section => {
                const isTarget = section.id === targetId;
                section.classList.toggle('hidden', !isTarget);
                section.classList.toggle('active', isTarget);
            });
        });
    });
}

// --- Tree Management (트리 관리) ---

const TREE_ADMIN_API_BASE = '/api/admin/trees';
const TREE_AI_API_PATH = '/api/admin/tree-ai';
let treeListCache = [];
let currentTreeDetail = null;
let currentTreeNodeIndex = null;

async function callTreeAdminApi(path, options = {}) {
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error('로그인이 필요합니다.');
    }

    const token = await user.getIdToken();
    const headers = options.headers ? { ...options.headers } : {};
    headers['Authorization'] = 'Bearer ' + token;
    if (!headers['Content-Type'] && options.method && options.method !== 'GET') {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(path, { ...options, headers });
    if (!response.ok) {
        const text = await response.text();
        console.error('TreeAdmin API 오류:', response.status, text);
        throw new Error('TreeAdmin API 오류: ' + response.status);
    }

    if (response.status === 204) return null;
    return response.json();
}

async function initTreeManager(user) {
    try {
        await loadTreeList();
    } catch (e) {
        console.error('트리 리스트 초기화 오류:', e);
    }

    const ownerFilterInput = document.getElementById('treeOwnerFilter');
    if (ownerFilterInput) {
        ownerFilterInput.addEventListener('input', () => {
            applyTreeFiltersAndRender();
        });
    }

    const searchInput = document.getElementById('treeSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            applyTreeFiltersAndRender();
        });
    }

    setupTreeNodeEditor();
}

async function loadTreeList() {
    const tbody = document.getElementById('treeListTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">트리 목록을 불러오는 중...</td></tr>';

    try {
        const ownerFilterInput = document.getElementById('treeOwnerFilter');
        const ownerIdRaw = ownerFilterInput ? ownerFilterInput.value.trim() : '';

        const params = new URLSearchParams();
        params.set('limit', '100');
        if (ownerIdRaw) {
            params.set('ownerId', ownerIdRaw);
        }

        const data = await callTreeAdminApi(`${TREE_ADMIN_API_BASE}?${params.toString()}`, { method: 'GET' });
        const items = data && Array.isArray(data.items) ? data.items : (data && data.items ? data.items : []);

        treeListCache = items;
        applyTreeFiltersAndRender();
    } catch (e) {
        console.error('트리 리스트 로드 오류:', e);
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-red-500">트리 리스트를 불러오는 중 오류가 발생했습니다.</td></tr>';
    }
}

function applyTreeFiltersAndRender() {
    const tbody = document.getElementById('treeListTable');
    if (!tbody) return;

    let items = Array.isArray(treeListCache) ? treeListCache.slice() : [];

    const ownerFilterInput = document.getElementById('treeOwnerFilter');
    const ownerQuery = ownerFilterInput ? ownerFilterInput.value.trim().toLowerCase() : '';
    const searchInput = document.getElementById('treeSearchInput');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (ownerQuery) {
        items = items.filter((item) => {
            const ownerId = (item.ownerId || '').toLowerCase();
            return ownerId.includes(ownerQuery);
        });
    }

    if (searchQuery) {
        items = items.filter((item) => {
            const name = (item.name || '').toLowerCase();
            const id = (item.id || '').toLowerCase();
            return name.includes(searchQuery) || id.includes(searchQuery);
        });
    }

    tbody.innerHTML = '';

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">조건에 맞는 트리가 없습니다.</td></tr>';
        return;
    }

    items.forEach((item) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 cursor-pointer';
        tr.dataset.treeId = item.id;

        const demoBadge = item.isDemo ? ' <span class="ml-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold">DEMO</span>' : '';
        const aiBadge = item.isAiBot ? ' <span class="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-semibold">AI</span>' : '';

        tr.innerHTML = `
            <td class="px-4 py-2">
                <div class="flex flex-col">
                    <span class="text-xs font-semibold text-slate-900 truncate">${item.name || '(이름 없음)'}</span>
                    <span class="text-[11px] text-slate-400 truncate">${item.id || ''}${demoBadge}${aiBadge}</span>
                </div>
            </td>
            <td class="px-4 py-2 text-[11px] text-slate-500">${item.ownerId || '—'}</td>
            <td class="px-4 py-2 text-[11px] text-slate-500">${item.nodeCount || 0}</td>
            <td class="px-4 py-2 text-[11px] text-slate-500">${item.viewCount || 0} / ${item.likeCount || 0} / ${item.shareCount || 0}</td>
        `;

        tr.addEventListener('click', () => {
            if (item.id) {
                loadTreeDetail(item.id);
            }
        });

        tbody.appendChild(tr);
    });
}

async function loadTreeDetail(treeId) {
    const nodesTbody = document.getElementById('treeNodesTable');
    if (nodesTbody) {
        nodesTbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">트리 정보를 불러오는 중...</td></tr>';
    }

    try {
        const data = await callTreeAdminApi(`${TREE_ADMIN_API_BASE}/${encodeURIComponent(treeId)}`, {
            method: 'GET'
        });
        if (!data) {
            throw new Error('빈 응답');
        }
        currentTreeDetail = data;
        currentTreeNodeIndex = null;
        renderTreeDetail(data);
        renderTreeNodes(Array.isArray(data.nodes) ? data.nodes : []);
        resetTreeNodeEditor();
    } catch (e) {
        console.error('트리 상세 로드 오류:', e);
        if (nodesTbody) {
            nodesTbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-red-500">트리 정보를 불러오는 중 오류가 발생했습니다.</td></tr>';
        }
    }
}

function formatServerTimestamp(value) {
    if (!value) return '-';

    if (typeof value.toDate === 'function') {
        const d = value.toDate();
        return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    }

    const seconds = value._seconds || value.seconds;
    if (typeof seconds === 'number') {
        const d = new Date(seconds * 1000);
        return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    }

    return '-';
}

function renderTreeDetail(tree) {
    const titleEl = document.getElementById('treeDetailTitle');
    const subtitleEl = document.getElementById('treeDetailSubtitle');
    const statsEl = document.getElementById('treeDetailStats');
    const metaEl = document.getElementById('treeMetaSummary');

    if (titleEl) {
        titleEl.textContent = tree.name || tree.id || '이름 없는 트리';
    }
    if (subtitleEl) {
        subtitleEl.textContent = tree.id ? `트리 ID: ${tree.id}` : '트리 ID 없음';
    }
    if (statsEl) {
        const nodeCount = typeof tree.nodeCount === 'number'
            ? tree.nodeCount
            : (Array.isArray(tree.nodes) ? tree.nodes.length : 0);
        const viewCount = typeof tree.viewCount === 'number' ? tree.viewCount : 0;
        const likeCount = typeof tree.likeCount === 'number'
            ? tree.likeCount
            : (Array.isArray(tree.likes) ? tree.likes.length : 0);
        const shareCount = typeof tree.shareCount === 'number' ? tree.shareCount : 0;

        statsEl.innerHTML =
            `<span>노드 ${nodeCount}</span>` +
            `<span> · 조회 ${viewCount}</span>` +
            `<span> · 좋아요 ${likeCount}</span>` +
            `<span> · 공유 ${shareCount}</span>`;
    }

    if (metaEl) {
        const owner = tree.ownerId || '—';
        const lastUpdatedText = formatServerTimestamp(tree.lastUpdated);
        const lastOpenedText = formatServerTimestamp(tree.lastOpened);
        metaEl.textContent = `소유자: ${owner} · 마지막 수정: ${lastUpdatedText} · 마지막 열람: ${lastOpenedText}`;
    }
}

function renderTreeNodes(nodes) {
    const tbody = document.getElementById('treeNodesTable');
    if (!tbody) return;

    if (!Array.isArray(nodes) || !nodes.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400">이 트리에 등록된 노드가 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    nodes.forEach((node, index) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 cursor-pointer';
        tr.dataset.nodeIndex = String(index);

        const momentsCount = Array.isArray(node.moments) ? node.moments.length : 0;
        const videoText = node.videoId ? `영상: ${node.videoId}` : '영상 없음';
        const momentsText = `모먼트 ${momentsCount}개`;

        tr.innerHTML = `
            <td class="px-4 py-2 text-[11px] text-slate-500">${node.id != null ? node.id : ''}</td>
            <td class="px-4 py-2 text-[11px] text-slate-900 truncate">${node.title || '(제목 없음)'}</td>
            <td class="px-4 py-2 text-[11px] text-slate-500">${node.date || ''}</td>
            <td class="px-4 py-2 text-[11px] text-slate-500">${videoText} · ${momentsText}</td>
        `;

        tr.addEventListener('click', () => {
            selectTreeNode(index);
        });

        tbody.appendChild(tr);
    });
}

function setupTreeNodeEditor() {
    const saveBtn = document.getElementById('treeNodeSaveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveCurrentNodeEdits();
        });
    }

    const resetBtn = document.getElementById('treeNodeResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (currentTreeDetail && Array.isArray(currentTreeDetail.nodes) && currentTreeNodeIndex != null) {
                selectTreeNode(currentTreeNodeIndex);
            } else {
                resetTreeNodeEditor();
            }
        });
    }

    const aiBtn = document.getElementById('treeNodeAiBtn');
    if (aiBtn) {
        aiBtn.addEventListener('click', () => {
            requestAiDescriptionForCurrentNode();
        });
    }

    resetTreeNodeEditor();
}

function resetTreeNodeEditor() {
    currentTreeNodeIndex = null;

    const idInput = document.getElementById('treeNodeIdDisplay');
    const titleInput = document.getElementById('treeNodeTitleInput');
    const dateInput = document.getElementById('treeNodeDateInput');
    const videoInput = document.getElementById('treeNodeVideoInput');
    const descInput = document.getElementById('treeNodeDescriptionInput');
    const hintEl = document.getElementById('treeNodeEditorHint');

    if (idInput) idInput.value = '';
    if (titleInput) titleInput.value = '';
    if (dateInput) dateInput.value = '';
    if (videoInput) videoInput.value = '';
    if (descInput) descInput.value = '';
    if (hintEl) {
        hintEl.textContent = '왼쪽 노드 목록에서 노드를 선택하면 여기에서 수정할 수 있습니다.';
    }
}

function selectTreeNode(index) {
    if (!currentTreeDetail || !Array.isArray(currentTreeDetail.nodes)) {
        return;
    }

    const nodes = currentTreeDetail.nodes;
    if (index < 0 || index >= nodes.length) {
        return;
    }

    currentTreeNodeIndex = index;
    const node = nodes[index];

    const idInput = document.getElementById('treeNodeIdDisplay');
    const titleInput = document.getElementById('treeNodeTitleInput');
    const dateInput = document.getElementById('treeNodeDateInput');
    const videoInput = document.getElementById('treeNodeVideoInput');
    const descInput = document.getElementById('treeNodeDescriptionInput');
    const hintEl = document.getElementById('treeNodeEditorHint');

    if (idInput) idInput.value = node.id != null ? String(node.id) : '';
    if (titleInput) titleInput.value = node.title || '';
    if (dateInput) dateInput.value = node.date || '';
    if (videoInput) videoInput.value = node.videoId || '';
    if (descInput) descInput.value = node.description || '';
    if (hintEl) {
        hintEl.textContent = '선택된 노드 ID: ' + (node.id != null ? String(node.id) : '');
    }

    const tbody = document.getElementById('treeNodesTable');
    if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((tr) => {
            tr.classList.remove('bg-blue-50');
        });
        const selectedRow = tbody.querySelector('tr[data-node-index="' + index + '"]');
        if (selectedRow) {
            selectedRow.classList.add('bg-blue-50');
        }
    }
}

async function requestAiDescriptionForCurrentNode() {
    if (!currentTreeDetail || !Array.isArray(currentTreeDetail.nodes)) {
        alert('트리 정보가 없습니다.');
        return;
    }

    if (currentTreeNodeIndex == null) {
        alert('먼저 설명을 채울 노드를 선택해 주세요.');
        return;
    }

    const treeId = currentTreeDetail.id;
    if (!treeId) {
        alert('트리 ID가 없습니다.');
        return;
    }

    const aiBtn = document.getElementById('treeNodeAiBtn');
    const descInput = document.getElementById('treeNodeDescriptionInput');

    if (aiBtn) {
        aiBtn.disabled = true;
        aiBtn.textContent = 'AI 생성 중...';
    }

    try {
        const data = await callTreeAdminApi(TREE_AI_API_PATH, {
            method: 'POST',
            body: JSON.stringify({
                mode: 'node_description_v1',
                treeId,
                nodeIndex: currentTreeNodeIndex
            })
        });

        if (data && data.suggested && typeof data.suggested.description === 'string') {
            if (descInput) {
                descInput.value = data.suggested.description;
            }
        } else {
            alert('AI가 유효한 설명을 반환하지 않았습니다.');
        }
    } catch (e) {
        console.error('AI 설명 생성 오류:', e);
        alert('AI 설명 생성 중 오류가 발생했습니다: ' + e.message);
    } finally {
        if (aiBtn) {
            aiBtn.disabled = false;
            aiBtn.textContent = 'AI로 설명 채우기';
        }
    }
}

async function saveCurrentNodeEdits() {
    if (!currentTreeDetail || !Array.isArray(currentTreeDetail.nodes)) {
        alert('트리 정보가 없습니다.');
        return;
    }

    if (currentTreeNodeIndex == null) {
        alert('먼저 편집할 노드를 선택해 주세요.');
        return;
    }

    const idInput = document.getElementById('treeNodeIdDisplay');
    const titleInput = document.getElementById('treeNodeTitleInput');
    const dateInput = document.getElementById('treeNodeDateInput');
    const videoInput = document.getElementById('treeNodeVideoInput');
    const descInput = document.getElementById('treeNodeDescriptionInput');
    const saveBtn = document.getElementById('treeNodeSaveBtn');

    const nodes = currentTreeDetail.nodes.slice();
    const node = { ...(nodes[currentTreeNodeIndex] || {}) };

    const newTitle = titleInput ? titleInput.value.trim() : '';
    const newDate = dateInput ? dateInput.value.trim() : '';
    const newVideo = videoInput ? videoInput.value.trim() : '';
    const newDesc = descInput ? descInput.value.trim() : '';

    if (newTitle) {
        node.title = newTitle;
    } else {
        delete node.title;
    }

    node.date = newDate || '';
    node.videoId = newVideo || '';
    node.description = newDesc || '';

    nodes[currentTreeNodeIndex] = node;

    const treeId = currentTreeDetail.id;
    if (!treeId) {
        alert('트리 ID가 없습니다.');
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';
    }

    try {
        await callTreeAdminApi(TREE_ADMIN_API_BASE + '/' + encodeURIComponent(treeId), {
            method: 'PATCH',
            body: JSON.stringify({
                nodes,
                nodeCount: nodes.length
            })
        });

        currentTreeDetail.nodes = nodes;
        renderTreeNodes(nodes);
        selectTreeNode(currentTreeNodeIndex);
        alert('노드가 저장되었습니다.');
    } catch (e) {
        console.error('노드 저장 오류:', e);
        alert('노드 저장 중 오류가 발생했습니다: ' + e.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '변경 내용 저장';
        }
    }
}

// --- Data Loading ---

let currentDemoSeedMode = null;

function openDemoSeedModal(mode) {
    currentDemoSeedMode = mode;
    const modal = document.getElementById('demoSeedModal');
    const titleEl = document.getElementById('demoSeedTitle');
    const descEl = document.getElementById('demoSeedDescription');
    const inputEl = document.getElementById('demoSeedCount');

    if (!modal || !titleEl || !descEl || !inputEl) return;

    let title = '데모 데이터 생성';
    let desc = '생성할 개수를 입력하세요. 비워두면 기본 개수로 생성됩니다.';

    if (mode === 'users') {
        title = '데모 사용자 생성';
        desc = '대시보드와 사용자 관리 화면에 표시할 데모 사용자를 몇 명까지 생성할지 입력하세요. 비워두면 기본 개수로 생성됩니다.';
    } else if (mode === 'trees') {
        title = '데모 러브트리 생성';
        desc = '홈과 에디터에서 사용할 데모 러브트리를 몇 개까지 생성할지 입력하세요. 비워두면 기본 개수로 생성됩니다.';
    } else if (mode === 'community') {
        title = '커뮤니티 데모 글 생성';
        desc = '커뮤니티 목록에 표시할 데모 글을 몇 개까지 생성할지 입력하세요. 비워두면 기본 개수로 생성됩니다.';
    }

    titleEl.textContent = title;
    descEl.textContent = desc;
    inputEl.value = '';
    modal.classList.remove('hidden');
}

function closeDemoSeedModal() {
    const modal = document.getElementById('demoSeedModal');
    if (!modal) return;
    modal.classList.add('hidden');
}

let allUsersCache = [];

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

function getUserAvatarHTML(user, size) {
    const baseName = user.displayName || user.email || 'U';
    const initial = String(baseName).charAt(0).toUpperCase();
    const dimClass = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';

    if (user.photoURL) {
        return `<img src="${user.photoURL}" alt="avatar" class="${dimClass} rounded-full object-cover">`;
    }

    return `
        <div class="${dimClass} rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
            ${initial}
        </div>
    `;
}

function getUserDisplayName(user, uid) {
    if (user.displayName) return user.displayName;
    if (user.email) return String(user.email).split('@')[0];
    const shortId = uid ? String(uid).slice(0, 6) : '';
    return shortId ? `익명 사용자 (${shortId})` : '익명 사용자';
}

function getUserType(user) {
    if (user.isAiBot) return 'ai';
    if (user.isDemo || !user.email || (user.email && String(user.email).endsWith('@demo.local'))) return 'demo';
    return 'normal';
}

function getUserTypeLabel(user) {
    const type = getUserType(user);
    if (type === 'ai') return 'AI 유저';
    if (type === 'demo') return '데모 유저';
    return '일반 유저';
}

function getUserCategory(user) {
    const type = getUserType(user);
    if (type === 'ai') return 'ai';
    if (type === 'demo') return 'demo';
    if (user.role === 'admin') return 'admin';
    if (user.role === 'pro') return 'pro';
    return 'free';
}

function getUserIdForDisplay(user, uid) {
    if (user.userId) return String(user.userId);
    if (user.email) return String(user.email).split('@')[0];
    if (uid) return String(uid).slice(0, 8);
    return '';
}

function getProfileSubLabel(user, uid) {
    const idLabel = getUserIdForDisplay(user, uid);
    const typeLabel = getUserTypeLabel(user);
    if (idLabel && typeLabel) return `${idLabel} · ${typeLabel}`;
    if (idLabel) return idLabel;
    return typeLabel;
}

function getUserStatusBadgeClass(user) {
    if (user.isAiBot) return 'bg-cyan-100 text-cyan-700';
    if (user.isDemo) return 'bg-amber-100 text-amber-700';
    if (user.role === 'admin') return 'bg-rose-100 text-rose-700';
    if (user.role === 'pro') return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
}

function getUserStatusLabel(user) {
    if (user.isAiBot) return 'AI';
    if (user.isDemo) return 'DEMO';
    return (user.role || 'free').toUpperCase();
}

function formatKoreanDateTime(ts) {
    if (!ts || typeof ts.toDate !== 'function') return '-';
    const d = ts.toDate();
    const formatted = d.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    return formatted + ' (KST)';
}

function renderRecentUsers(users) {
    const tbody = document.getElementById('recentUsersTable');
    if (!tbody) return;
    tbody.innerHTML = users.map(user => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4 flex items-center gap-3">
                ${getUserAvatarHTML(user, 'sm')}
                <div class="flex flex-col">
                    <span class="font-medium text-slate-900">${getUserDisplayName(user, user.id)}</span>
                    <span class="text-xs text-slate-400">${getUserTypeLabel(user)}</span>
                </div>
            </td>
            <td class="px-6 py-4">${user.email || '—'}</td>
            <td class="px-6 py-4 text-slate-500">${user.createdAt ? formatKoreanDateTime(user.createdAt) : '-'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs font-bold ${getUserStatusBadgeClass(user)}">
                    ${getUserStatusLabel(user)}
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

        allUsersCache = [];
        snapshot.forEach(doc => {
            const data = doc.data() || {};
            allUsersCache.push({ id: doc.id, ...data });
        });

        applyUserFiltersAndRender();
    } catch (e) {
        console.error('Load users error:', e);
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">데이터 로드 실패</td></tr>';
    }
}

function applyUserFiltersAndRender() {
    const tbody = document.getElementById('allUsersTable');
    if (!tbody) return;

    const searchInput = document.getElementById('userSearch');
    const filterSelect = document.getElementById('userFilter');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filter = filterSelect ? filterSelect.value : 'all';

    let users = Array.isArray(allUsersCache) ? allUsersCache.slice() : [];

    // 검색: 이름/이메일
    if (query) {
        users = users.filter((user) => {
            const name = getUserDisplayName(user, user.id || '');
            const email = (user.email || '').toLowerCase();
            const lowerName = name.toLowerCase();
            return lowerName.includes(query) || email.includes(query);
        });
    }

    // 필터: 일반/데모/AI/관리자/Pro
    if (filter && filter !== 'all') {
        users = users.filter((user) => {
            const type = getUserType(user);
            if (filter === 'normal') return type === 'normal';
            if (filter === 'demo') return type === 'demo';
            if (filter === 'ai') return type === 'ai';
            if (filter === 'admin') return user.role === 'admin';
            if (filter === 'pro') return user.role === 'pro';
            return true;
        });
    }

    tbody.innerHTML = '';

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-slate-400">해당 조건에 맞는 사용자가 없습니다.</td></tr>';
        return;
    }

    users.forEach((user) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b border-slate-50 last:border-0';
        const category = getUserCategory(user);
        tr.innerHTML = `
            <td class="px-6 py-4 flex items-center gap-3">
                ${getUserAvatarHTML(user, 'sm')}
                <div class="flex flex-col">
                    <span class="font-medium text-slate-900">${getUserDisplayName(user, user.id)}</span>
                    <span class="text-xs text-slate-400">${getProfileSubLabel(user, user.id)}</span>
                </div>
            </td>
            <td class="px-6 py-4">${user.email || '—'}</td>
            <td class="px-6 py-4">
                <select onchange="updateUserRole('${user.id}', this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-brand-500">
                    <option value="free" ${category === 'free' ? 'selected' : ''}>일반</option>
                    <option value="demo" ${category === 'demo' ? 'selected' : ''}>데모</option>
                    <option value="ai" ${category === 'ai' ? 'selected' : ''}>AI</option>
                    <option value="pro" ${category === 'pro' ? 'selected' : ''}>Pro</option>
                    <option value="admin" ${category === 'admin' ? 'selected' : ''}>관리자</option>
                </select>
            </td>
            <td class="px-6 py-4 text-slate-500">${user.lastLogin && typeof user.lastLogin.toDate === 'function' ? user.lastLogin.toDate().toLocaleDateString() : '-'}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="editBotProfile('${user.id}')" class="text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        AI 프로필
                    </button>
                    <button onclick="createAiDemoTree('${user.id}')" class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        AI 트리
                    </button>
                    <button onclick="createAiReactions('${user.id}')" class="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        AI 반응
                    </button>
                    <button onclick="createAiCommunityComments('${user.id}')" class="text-violet-600 hover:text-violet-800 hover:bg-violet-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        AI 커뮤댓글
                    </button>
                    <button onclick="deleteUser('${user.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium">
                        삭제
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function seedDemoUsers(requestCount) {
    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const templates = [
        {
            uid: 'demo-user-01',
            email: 'demo-army@demo.local',
            displayName: '데모 아미',
            userId: 'demo_army',
            role: 'free',
            isDemo: true
        },
        {
            uid: 'demo-user-02',
            email: 'demo-carat@demo.local',
            displayName: '데모 캐럿',
            userId: 'demo_carat',
            role: 'pro',
            isDemo: true
        },
        {
            uid: 'demo-user-03',
            email: 'demo-stay@demo.local',
            displayName: '데모 스테이',
            userId: 'demo_stay',
            role: 'free',
            isDemo: true
        },
        {
            uid: 'demo-user-04',
            email: 'demo-diver@demo.local',
            displayName: '데모 다이브',
            userId: 'demo_diver',
            role: 'free',
            isDemo: true
        },
        {
            uid: 'ai-user-01',
            email: 'ai-bot@demo.local',
            displayName: 'Relovetree AI',
            userId: 'relovetree_ai',
            role: 'free',
            isDemo: false,
            isAiBot: true
        }
    ];

    const defaultCount = templates.length;
    const maxCount = typeof requestCount === 'number' && requestCount > 0
        ? Math.min(requestCount, templates.length)
        : defaultCount;

    let createdCount = 0;

    try {
        for (let i = 0; i < maxCount; i++) {
            const tpl = templates[i];
            const ref = db.collection('users').doc(tpl.uid);
            const snap = await ref.get();

            await ref.set({
                email: tpl.email,
                displayName: tpl.displayName,
                photoURL: '',
                role: tpl.role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                isDemo: tpl.isDemo !== undefined ? tpl.isDemo : true,
                isAiBot: !!tpl.isAiBot,
                userId: tpl.userId || firebase.firestore.FieldValue.delete()
            }, { merge: true });

            if (!snap.exists) {
                createdCount++;
            }
        }

        if (createdCount > 0) {
            alert(`데모 사용자 ${createdCount}명을 생성했습니다.`);
            await loadStats();
            await loadUsers();
        } else {
            alert('새로 생성된 데모 사용자가 없습니다. (이미 같은 ID의 데모 사용자가 있습니다)');
        }
    } catch (e) {
        console.error('데모 사용자 생성 오류:', e);
        alert('데모 사용자 생성 중 오류가 발생했습니다: ' + e.message);
    }
}

async function seedDemoTrees(requestCount) {
    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const owners = [];

    try {
        const demoSnap = await db.collection('users').where('isDemo', '==', true).limit(10).get();
        demoSnap.forEach((doc) => {
            const data = doc.data() || {};
            owners.push({ uid: doc.id, name: data.displayName || data.email || doc.id });
        });
    } catch (e) {
    }

    if (!owners.length) {
        owners.push({ uid: currentUser.uid, name: currentUser.displayName || currentUser.email || '관리자' });
    }

    const templates = [
        {
            id: 'demo-tree-bts',
            name: '방탄소년단 타임라인 데모',
            baseTitle: 'BTS 활동 정리'
        },
        {
            id: 'demo-tree-svt',
            name: '세븐틴 투어 히스토리 데모',
            baseTitle: '세븐틴 투어 기록'
        },
        {
            id: 'demo-tree-skz',
            name: '스트레이 키즈 컴백 타임라인 데모',
            baseTitle: '스트레이 키즈 컴백 정리'
        },
        {
            id: 'demo-tree-newjeans',
            name: '뉴진스 활동 모먼트 데모',
            baseTitle: '뉴진스 활동 정리'
        },
        {
            id: 'demo-tree-illit',
            name: '아일릿 성장기 데모',
            baseTitle: '아일릿 활동 타임라인'
        },
        {
            id: 'demo-tree-ive',
            name: '아이브 모먼트 데모',
            baseTitle: '아이브 활동 기록'
        },
        {
            id: 'demo-tree-leserafim',
            name: '르세라핌 모먼트 데모',
            baseTitle: '르세라핌 활동 기록'
        },
        {
            id: 'demo-tree-aespa',
            name: '에스파 모먼트 데모',
            baseTitle: '에스파 컴백 기록'
        },
        {
            id: 'demo-tree-riize',
            name: '라이즈 모먼트 데모',
            baseTitle: '라이즈 활동 기록'
        },
        {
            id: 'demo-tree-iu',
            name: '아이유 모먼트 데모',
            baseTitle: '아이유 활동 기록'
        }
    ];

    const defaultCount = templates.length;
    const maxCount = typeof requestCount === 'number' && requestCount > 0
        ? Math.min(requestCount, templates.length)
        : defaultCount;

    let createdCount = 0;

    try {
        for (let i = 0; i < maxCount; i++) {
            const tpl = templates[i];
            const ref = db.collection('trees').doc(tpl.id);
            const snap = await ref.get();
            if (snap.exists) continue;

            const owner = owners[i % owners.length];

            const now = new Date();
            const nodes = [];
            const edges = [];

            for (let step = 0; step < 4; step++) {
                const id = step + 1;
                const d = new Date(now.getTime() - (3 - step) * 30 * 24 * 60 * 60 * 1000);
                const date = d.toISOString().split('T')[0];
                nodes.push({
                    id: id,
                    x: 200 + step * 260,
                    y: 200,
                    title: tpl.baseTitle + ' - 단계 ' + (step + 1),
                    date: date,
                    videoId: '',
                    moments: []
                });
                if (step > 0) {
                    edges.push({ from: id - 1, to: id });
                }
            }

            const likeCount = 50 - i * 3;
            const viewCount = 200 + i * 25;
            const shareCount = 20 + i * 2;

            await ref.set({
                name: tpl.name,
                ownerId: owner.uid,
                nodes: nodes,
                edges: edges,
                likes: [],
                likeCount: Math.max(0, likeCount),
                viewCount: Math.max(0, viewCount),
                shareCount: Math.max(0, shareCount),
                nodeCount: nodes.length,
                comments: [],
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                isDemo: true
            }, { merge: true });

            createdCount++;
        }

        if (createdCount > 0) {
            alert(`데모 러브트리 ${createdCount}개를 생성했습니다.`);
        } else {
            alert('새로 생성된 데모 러브트리가 없습니다. (이미 같은 ID의 트리가 있습니다)');
        }
    } catch (e) {
        console.error('데모 러브트리 생성 오류:', e);
        alert('데모 러브트리 생성 중 오류가 발생했습니다: ' + e.message);
    }
}

// 모든 트리의 nodeCount를 nodes.length 기준으로 재계산하는 유틸리티
async function recalcAllTreesNodeCount() {
    const db = firebase.firestore();

    try {
        const snapshot = await db.collection('trees').get();

        if (snapshot.empty) {
            alert('재계산할 트리가 없습니다.');
            return;
        }

        let updatedCount = 0;
        const batch = db.batch();

        snapshot.forEach((doc) => {
            const data = doc.data() || {};
            const nodes = Array.isArray(data.nodes) ? data.nodes : [];
            const nodeCount = nodes.length;
            batch.update(doc.ref, { nodeCount });
            updatedCount++;
        });

        await batch.commit();
        alert(`총 ${updatedCount}개의 트리에 대해 nodeCount를 재계산했습니다.`);
    } catch (e) {
        console.error('nodeCount 재계산 오류:', e);
        alert('nodeCount 재계산 중 오류가 발생했습니다: ' + e.message);
    }
}

async function seedDemoCommunityPosts(requestCount) {
    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const authorId = currentUser.uid;
    const authorName = currentUser.displayName || currentUser.email || '관리자';

    const templates = [
        {
            title: 'Relovetree로 덕질 기록하는 법',
            content: '처음 오신 분들을 위해 Relovetree를 어떻게 쓰면 좋은지 간단히 정리해봤어요.\n1) 아티스트 러브트리를 만들고\n2) 입덕부터 최신 활동까지 순간들을 노드로 추가해 보세요.'
        },
        {
            title: '내 최애 무대 추천 스레드',
            content: '각자 최애 무대 하나씩만 링크와 함께 추천해 주세요!\n왜 이 무대를 좋아하는지도 한 줄로 적어주면 더 좋아요 :)'
        },
        {
            title: '덕질 루틴 공유해요',
            content: '출근길/등굣길, 퇴근 후, 주말에 어떻게 덕질하는지 루틴을 공유해 봅시다.\n러브트리를 어떻게 활용하고 있는지도 같이 써 주세요.'
        },
        {
            title: '입덕 계기 썰 풀어보기',
            content: '어떤 계기로 지금 최애를 좋아하게 되었나요? 음악, 무대, 예능, 혹은 친구의 추천 등 각자의 입덕 스토리를 자유롭게 공유해 주세요.'
        },
        {
            title: '최애 짤/움짤 자랑방',
            content: '요즘 계속 돌려보는 최애 짤이나 움짤이 있다면 여기에 공유해 주세요. 왜 좋아하는지도 한 줄 코멘트로 남겨주면 더 재밌어요.'
        }
    ];

    try {
        const existingSnap = await db.collection('community_posts')
            .where('authorId', '==', authorId)
            .get();

        const existingTitles = new Set();
        existingSnap.forEach((doc) => {
            const data = doc.data() || {};
            if (data.title) existingTitles.add(String(data.title));
        });

        const defaultCount = templates.length;
        const maxCount = typeof requestCount === 'number' && requestCount > 0
            ? Math.min(requestCount, templates.length)
            : defaultCount;

        let createdCount = 0;

        for (let i = 0; i < maxCount; i++) {
            const tpl = templates[i];
            if (existingTitles.has(tpl.title)) continue;

            await db.collection('community_posts').add({
                title: tpl.title,
                content: tpl.content,
                authorId,
                authorDisplayName: authorName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                likeCount: 0,
                commentCount: 0,
                isDeleted: false
            });

            createdCount++;
        }

        if (createdCount > 0) {
            alert(`커뮤니티 데모 글 ${createdCount}개를 생성했습니다.`);
        } else {
            alert('새로 생성된 데모 글이 없습니다. (이미 같은 제목의 글이 있습니다)');
        }
    } catch (e) {
        console.error('데모 커뮤니티 글 생성 오류:', e);
        alert('데모 커뮤니티 글 생성 중 오류가 발생했습니다: ' + e.message);
    }
}

// AI 봇 활동 로그 로드
async function loadAiLogs() {
    const db = firebase.firestore();
    const tbody = document.getElementById('aiLogsTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center">로딩 중...</td></tr>';

    try {
        const snapshot = await db.collection('ai_logs')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const rows = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};
            const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function'
                ? data.createdAt.toDate().toLocaleString()
                : '-';
            const type = data.type || '-';
            const bot = data.botName || data.botUid || '-';
            const summary = data.summary || '';

            rows.push(`
                <tr class="hover:bg-slate-50">
                    <td class="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">${createdAt}</td>
                    <td class="px-6 py-3 text-xs font-semibold text-slate-700">${type}</td>
                    <td class="px-6 py-3 text-xs text-slate-700">${bot}</td>
                    <td class="px-6 py-3 text-xs text-slate-600">${summary}</td>
                </tr>
            `);
        });

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-slate-400">아직 기록된 AI 로그가 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = rows.join('');
        }
    } catch (e) {
        console.error('AI 로그 로드 오류:', e);
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">AI 로그 로드 실패</td></tr>';
    }
}

// AI 봇 활동을 Firestore에 기록하는 헬퍼
async function logAiActivity(entry) {
    try {
        const db = firebase.firestore();
        const adminUser = firebase.auth().currentUser;
        const payload = {
            type: entry.type || 'unknown',
            botUid: entry.botUid || null,
            botName: entry.botName || null,
            targetType: entry.targetType || null,
            targetId: entry.targetId || null,
            count: typeof entry.count === 'number' ? entry.count : null,
            summary: entry.summary || '',
            meta: entry.meta || null,
            adminUid: adminUser ? adminUser.uid : null,
            adminEmail: adminUser ? adminUser.email : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('ai_logs').add(payload);
    } catch (e) {
        console.warn('AI 로그 기록 실패:', e);
    }
}

// 사용자 botSettings를 사람이 읽을 수 있는 설명 텍스트로 변환하는 헬퍼
function buildBotSettingsDescription(settings) {
    if (!settings) return '';
    const parts = [];

    if (settings.tone) {
        if (settings.tone === 'over_reactive') parts.push('- 톤: 과몰입 (감탄사와 리액션이 큰 스타일)');
        else if (settings.tone === 'friendly') parts.push('- 톤: 친근 (팬들끼리 편하게 대화하는 느낌)');
        else if (settings.tone === 'calm') parts.push('- 톤: 차분 (설명 위주, 담백한 스타일)');
        else if (settings.tone === 'formal') parts.push('- 톤: 공식 (존댓말, 공지문 같은 느낌)');
    }

    if (settings.fanType) {
        if (settings.fanType === 'fresh') parts.push('- 팬 타입: 입덕러 (최근에 좋아하게 된 팬)');
        else if (settings.fanType === 'core') parts.push('- 팬 타입: 고인물 (활동/정보를 잘 아는 오래된 팬)');
        else if (settings.fanType === 'light') parts.push('- 팬 타입: 라이트팬 (편하게 즐기는 가벼운 팬)');
    }

    if (settings.length) {
        if (settings.length === 'short') parts.push('- 문장 길이: 짧게 (한 문장 정도)');
        else if (settings.length === 'medium') parts.push('- 문장 길이: 보통 (두세 문장 이내)');
        else if (settings.length === 'long') parts.push('- 문장 길이: 길게 (조금 더 자세하게)');
    }

    if (settings.emoji) {
        if (settings.emoji === 'few') parts.push('- 이모지: 거의 사용하지 않음');
        else if (settings.emoji === 'normal') parts.push('- 이모지: 적당히 사용');
        else if (settings.emoji === 'many') parts.push('- 이모지: 자주 사용');
    }

    if (settings.extraNote) {
        parts.push('- 추가 설명: ' + String(settings.extraNote));
    }

    if (!parts.length) return '';

    return '\n\n[봇 설정]\n' + parts.join('\n');
}

// --- Actions ---

window.updateUserRole = async function (uid, category) {
    const labelMap = {
        free: '일반',
        demo: '데모',
        ai: 'AI',
        pro: 'Pro',
        admin: '관리자'
    };
    const label = labelMap[category] || category;

    if (!confirm(`등급을 ${label}(으)로 변경하시겠습니까?`)) {
        loadUsers();
        return;
    }

    try {
        const updates = {};

        if (category === 'demo') {
            updates.isDemo = true;
            updates.isAiBot = false;
            updates.role = 'free';
        } else if (category === 'ai') {
            updates.isAiBot = true;
            updates.isDemo = false;
            updates.role = 'free';
        } else if (category === 'pro') {
            updates.role = 'pro';
            updates.isDemo = false;
            updates.isAiBot = false;
        } else if (category === 'admin') {
            updates.role = 'admin';
            updates.isDemo = false;
            updates.isAiBot = false;
        } else {
            // free 또는 기타 값은 일반 유저로 처리
            updates.role = 'free';
            updates.isDemo = false;
            updates.isAiBot = false;
        }

        await firebase.firestore().collection('users').doc(uid).update(updates);
        alert('등급이 변경되었습니다.');
        await loadUsers();
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

    let userName = '';
    let botProfileSuffix = '';
    let botSettingsSuffix = '';
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const u = userDoc.data() || {};
            if (u.botProfile) {
                botProfileSuffix = '\n\n[봇 프로필]\n' + String(u.botProfile);
            }
            if (u.botSettings) {
                botSettingsSuffix = buildBotSettingsDescription(u.botSettings);
            }
            if (u.displayName) {
                userName = u.displayName;
            } else if (u.email) {
                userName = u.email.split('@')[0];
            }
        }
    } catch (e) {
        console.warn('AI 트리용 봇 프로필 조회 실패:', e);
    }

    const finalPrompt = (promptText || defaultPrompt) + botProfileSuffix + botSettingsSuffix;

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
        const title = item && item.title ? item.title : '새 순간';
        const date = item && item.date ? item.date : new Date().toISOString().split('T')[0];
        const description = item && item.description ? String(item.description).trim() : '';

        // 기본으로 한 개의 순간을 채워 넣어, 에디터에 들어갔을 때 완전히 비어 있지 않도록 처리
        const baseMomentText = description || `${title}에 대한 첫 순간을 여기에 기록해 보세요.`;
        const nodeMoments = [
            {
                time: '0:00',
                text: baseMomentText,
                feeling: 'love'
            }
        ];

        nodes.push({
            id: id,
            x: 200 + index * 320,
            y: 200,
            title: title,
            date: date,
            videoId: item && item.videoId ? item.videoId : '',
            moments: nodeMoments
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
        likeCount: 0,
        comments: [],
        ownerId: uid,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        nodeCount: nodes.length,
        viewCount: 0,
        shareCount: 0
    };

    try {
        await db.collection('trees').doc(treeId).set(dataToSave, { merge: true });
        // AI 활동 로그 기록
        logAiActivity({
            type: 'tree_create',
            botUid: uid,
            botName: userName || null,
            targetType: 'tree',
            targetId: treeId,
            count: nodes.length,
            summary: name
        });
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
        let botSettingsSuffix = '';
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const u = userDoc.data() || {};
                if (u.displayName) userName = u.displayName;
                else if (u.email) userName = u.email.split('@')[0];
                if (u.botProfile) botProfile = String(u.botProfile);
                if (u.botSettings) botSettingsSuffix = buildBotSettingsDescription(u.botSettings);
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
            if (botSettingsSuffix) {
                basePrompt += botSettingsSuffix;
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
                const likesArray = Array.isArray(treeData.likes) ? treeData.likes : [];
                const newLikeCount = likesArray.length + 1;

                await db.collection('trees').doc(treeId).update({
                    likes: firebase.firestore.FieldValue.arrayUnion(uid),
                    likeCount: newLikeCount
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
            // AI 활동 로그 기록
            logAiActivity({
                type: 'tree_reactions',
                botUid: uid,
                botName: userName || null,
                targetType: 'tree',
                targetId: null,
                count: reactedTrees.length,
                summary: `트리 ${reactedTrees.length}개에 AI 반응 생성`,
                meta: { treeNames: reactedTrees }
            });
            alert(`총 ${reactedTrees.length}개의 트리에 AI 반응이 생성되었습니다.\n\n- ` + reactedTrees.join('\n- '));
        } else {
            alert('실제로 반응이 생성된 트리가 없습니다. (모든 시도가 실패했습니다)');
        }
    } catch (e) {
        console.error('AI 반응 생성 중 오류:', e);
        alert('AI 반응 생성 중 오류가 발생했습니다: ' + e.message);
    }
};

// 특정 사용자를 AI 봇처럼 사용해 커뮤니티 글에 자동으로 댓글을 생성하는 함수
window.createAiCommunityComments = async function (uid) {
    const db = firebase.firestore();

    const countInput = window.prompt('이 사용자가 AI처럼 댓글을 남길 커뮤니티 글 개수를 입력하세요. (기본 3)', '3');
    if (countInput === null) return;

    const reactionCount = parseInt(countInput, 10);
    if (!reactionCount || reactionCount <= 0) {
        alert('1 이상의 숫자를 입력해 주세요.');
        return;
    }

    try {
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
            console.warn('AI 커뮤니티 댓글용 사용자 정보 조회 실패:', e);
        }

        const snapshot = await db.collection('community_posts')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const candidates = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};
            candidates.push({ id: doc.id, data });
        });

        if (candidates.length === 0) {
            alert('AI가 댓글을 남길 수 있는 커뮤니티 글이 없습니다.');
            return;
        }

        const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
        const targets = shuffled.slice(0, Math.min(reactionCount, shuffled.length));

        const reactedPosts = [];

        for (const item of targets) {
            const postId = item.id;
            const postData = item.data;
            const title = postData.title || '제목 없음';
            const content = postData.content || '';
            const snippet = content.length > 80 ? content.slice(0, 80) + '…' : content;

            let commentText = '';
            let basePrompt = `"${title}"라는 제목의 글과 다음 내용을 읽은 팬이 남길만한 한 줄 댓글을 한국어로 짧게 써줘. 최대 1문장.\n\n내용 요약: ${snippet}`;
            if (botProfile) {
                basePrompt += `\n\n이 계정의 말투: ${botProfile}`;
            }
            if (botSettingsSuffix) {
                basePrompt += botSettingsSuffix;
            }

            try {
                const res = await fetch(AI_HELPER_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'comment',
                        payload: {
                            prompt: basePrompt,
                            nodeTitle: title
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
                console.warn('AI 커뮤니티 댓글 생성 중 오류:', e);
            }

            if (!commentText) {
                commentText = `${title} 글 너무 공감돼요.`;
            }

            try {
                await db.collection('community_posts').doc(postId).collection('comments').add({
                    content: commentText,
                    authorId: uid,
                    authorDisplayName: userName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isDeleted: false,
                    isAiBot: true
                });

                await db.collection('community_posts').doc(postId).update({
                    commentCount: firebase.firestore.FieldValue.increment(1)
                });
            } catch (e) {
                console.warn('AI 커뮤니티 댓글 쓰기 실패:', e);
            }

            reactedPosts.push(title);
        }

        if (reactedPosts.length > 0) {
            // AI 활동 로그 기록
            logAiActivity({
                type: 'community_comments',
                botUid: uid,
                botName: userName || null,
                targetType: 'community_post',
                targetId: null,
                count: reactedPosts.length,
                summary: `커뮤니티 글 ${reactedPosts.length}개에 AI 댓글 생성`,
                meta: { postTitles: reactedPosts }
            });
            alert(`총 ${reactedPosts.length}개의 글에 AI 커뮤니티 댓글이 생성되었습니다.\n\n- ` + reactedPosts.join('\n- '));
        } else {
            alert('실제로 댓글이 생성된 글이 없습니다. (모든 시도가 실패했습니다)');
        }
    } catch (e) {
        console.error('AI 커뮤니티 댓글 생성 중 오류:', e);
        alert('AI 커뮤니티 댓글 생성 중 오류가 발생했습니다: ' + e.message);
    }
};
