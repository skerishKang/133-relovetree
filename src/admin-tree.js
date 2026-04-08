(function () {
    const TREE_ADMIN_API_BASE = '/api/admin/trees';
    const TREE_AI_API_PATH = '/api/admin/tree-ai';
    let treeListCache = [];
    let currentTreeDetail = null;
    let currentTreeNodeIndex = null;

    async function callTreeAdminApi(path, options = {}) {
        const user = window.getCurrentAdminUser();
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

    async function initTreeManager() {
        try {
            await loadTreeList();
        } catch (e) {
            console.error('트리 리스트 초기화 오류:', e);
        }

        const ownerFilterInput = document.getElementById('treeOwnerFilter');
        if (ownerFilterInput && !ownerFilterInput.dataset.adminTreeBound) {
            ownerFilterInput.dataset.adminTreeBound = '1';
            ownerFilterInput.addEventListener('input', () => {
                applyTreeFiltersAndRender();
            });
        }

        const searchInput = document.getElementById('treeSearchInput');
        if (searchInput && !searchInput.dataset.adminTreeBound) {
            searchInput.dataset.adminTreeBound = '1';
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

        if (typeof value === 'string' || value instanceof Date) {
            const d = new Date(value);
            if (!Number.isNaN(d.getTime())) {
                return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
            }
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
        if (saveBtn && !saveBtn.dataset.adminTreeBound) {
            saveBtn.dataset.adminTreeBound = '1';
            saveBtn.addEventListener('click', () => {
                saveCurrentNodeEdits();
            });
        }

        const resetBtn = document.getElementById('treeNodeResetBtn');
        if (resetBtn && !resetBtn.dataset.adminTreeBound) {
            resetBtn.dataset.adminTreeBound = '1';
            resetBtn.addEventListener('click', () => {
                if (currentTreeDetail && Array.isArray(currentTreeDetail.nodes) && currentTreeNodeIndex != null) {
                    selectTreeNode(currentTreeNodeIndex);
                } else {
                    resetTreeNodeEditor();
                }
            });
        }

        const aiBtn = document.getElementById('treeNodeAiBtn');
        if (aiBtn && !aiBtn.dataset.adminTreeBound) {
            aiBtn.dataset.adminTreeBound = '1';
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

    window.AdminTree = {
        callTreeAdminApi,
        initTreeManager,
        loadTreeList,
        applyTreeFiltersAndRender,
        loadTreeDetail,
        renderTreeDetail,
        renderTreeNodes,
        setupTreeNodeEditor,
        resetTreeNodeEditor,
        selectTreeNode,
        requestAiDescriptionForCurrentNode,
        saveCurrentNodeEdits
    };
    window.initTreeManager = initTreeManager;
})();
