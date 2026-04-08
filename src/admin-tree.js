(function () {
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

        tbody.innerHTML = AdminTreeRender.renderTreeListLoading();

        try {
            const ownerFilterInput = document.getElementById('treeOwnerFilter');
            const ownerIdRaw = ownerFilterInput ? ownerFilterInput.value.trim() : '';

            const params = new URLSearchParams();
            params.set('limit', '100');
            if (ownerIdRaw) {
                params.set('ownerId', ownerIdRaw);
            }

            const data = await AdminTreeApi.callTreeAdminApi(AdminTreeApi.getTreeAdminApiBase() + '?' + params.toString(), { method: 'GET' });
            const items = data && Array.isArray(data.items) ? data.items : (data && data.items ? data.items : []);

            AdminTreeApi.setTreeListCache(items);
            applyTreeFiltersAndRender();
        } catch (e) {
            console.error('트리 리스트 로드 오류:', e);
            tbody.innerHTML = AdminTreeRender.renderTreeListError('트리 리스트를 불러오는 중 오류가 발생했습니다.');
        }
    }

    function applyTreeFiltersAndRender() {
        const tbody = document.getElementById('treeListTable');
        if (!tbody) return;

        let items = AdminTreeApi.getTreeListCache().slice();

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
            tbody.innerHTML = AdminTreeRender.renderTreeListEmpty();
            return;
        }

        items.forEach((item) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 cursor-pointer';
            tr.dataset.treeId = item.id;
            tr.innerHTML = AdminTreeRender.renderTreeListItem(item);

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
            nodesTbody.innerHTML = AdminTreeRender.renderTreeNodesLoading();
        }

        try {
            const data = await AdminTreeApi.callTreeAdminApi(AdminTreeApi.getTreeAdminApiBase() + '/' + encodeURIComponent(treeId), {
                method: 'GET'
            });
            if (!data) {
                throw new Error('빈 응답');
            }
            AdminTreeApi.setCurrentTreeDetail(data);
            AdminTreeApi.setCurrentTreeNodeIndex(null);
            AdminTreeRender.renderTreeDetail(data);
            renderTreeNodes(Array.isArray(data.nodes) ? data.nodes : []);
            AdminTreeNodeEditor.resetNodeEditor();
        } catch (e) {
            console.error('트리 상세 로드 오류:', e);
            if (nodesTbody) {
                nodesTbody.innerHTML = AdminTreeRender.renderTreeNodesError('트리 정보를 불러오는 중 오류가 발생했습니다.');
            }
        }
    }

    function renderTreeNodes(nodes) {
        const tbody = document.getElementById('treeNodesTable');
        if (!tbody) return;

        if (!Array.isArray(nodes) || !nodes.length) {
            tbody.innerHTML = AdminTreeRender.renderTreeNodesEmpty();
            return;
        }

        tbody.innerHTML = '';

        nodes.forEach((node, index) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 cursor-pointer';
            tr.dataset.nodeIndex = String(index);
            tr.innerHTML = AdminTreeRender.renderTreeNodesItem(node, index);

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
                const detail = AdminTreeApi.getCurrentTreeDetail();
                const index = AdminTreeApi.getCurrentTreeNodeIndex();
                if (detail && Array.isArray(detail.nodes) && index != null) {
                    selectTreeNode(index);
                } else {
                    AdminTreeNodeEditor.resetNodeEditor();
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

        AdminTreeNodeEditor.resetNodeEditor();
    }

    function selectTreeNode(index) {
        const detail = AdminTreeApi.getCurrentTreeDetail();
        if (!detail || !Array.isArray(detail.nodes)) {
            return;
        }

        const nodes = detail.nodes;
        if (index < 0 || index >= nodes.length) {
            return;
        }

        AdminTreeApi.setCurrentTreeNodeIndex(index);
        const node = nodes[index];

        AdminTreeNodeEditor.fillNodeEditor(node);
        AdminTreeNodeEditor.highlightSelectedNodeRow(index);
    }

    async function requestAiDescriptionForCurrentNode() {
        const detail = AdminTreeApi.getCurrentTreeDetail();
        if (!detail || !Array.isArray(detail.nodes)) {
            alert('트리 정보가 없습니다.');
            return;
        }

        const index = AdminTreeApi.getCurrentTreeNodeIndex();
        if (index == null) {
            alert('먼저 설명을 채울 노드를 선택해 주세요.');
            return;
        }

        const treeId = detail.id;
        if (!treeId) {
            alert('트리 ID가 없습니다.');
            return;
        }

        AdminTreeNodeEditor.setAiButtonState(true);

        try {
            const data = await AdminTreeApi.callTreeAdminApi(AdminTreeApi.getTreeAiApiPath(), {
                method: 'POST',
                body: JSON.stringify({
                    mode: 'node_description_v1',
                    treeId,
                    nodeIndex: index
                })
            });

            if (data && data.suggested && typeof data.suggested.description === 'string') {
                const els = AdminTreeNodeEditor.getNodeEditorElements();
                if (els.description) {
                    els.description.value = data.suggested.description;
                }
            } else {
                alert('AI가 유효한 설명을 반환하지 않았습니다.');
            }
        } catch (e) {
            console.error('AI 설명 생성 오류:', e);
            alert('AI 설명 생성 중 오류가 발생했습니다: ' + e.message);
        } finally {
            AdminTreeNodeEditor.setAiButtonState(false);
        }
    }

    async function saveCurrentNodeEdits() {
        const detail = AdminTreeApi.getCurrentTreeDetail();
        if (!detail || !Array.isArray(detail.nodes)) {
            alert('트리 정보가 없습니다.');
            return;
        }

        const index = AdminTreeApi.getCurrentTreeNodeIndex();
        if (index == null) {
            alert('먼저 편집할 노드를 선택해 주세요.');
            return;
        }

        const treeId = detail.id;
        if (!treeId) {
            alert('트리 ID가 없습니다.');
            return;
        }

        AdminTreeNodeEditor.setSaveButtonState(true);

        try {
            const nodes = detail.nodes.slice();
            const existingNode = nodes[index];
            const updatedNode = AdminTreeNodeEditor.buildNodeFromEditor(existingNode);
            nodes[index] = updatedNode;

            await AdminTreeApi.callTreeAdminApi(AdminTreeApi.getTreeAdminApiBase() + '/' + encodeURIComponent(treeId), {
                method: 'PATCH',
                body: JSON.stringify({
                    nodes,
                    nodeCount: nodes.length
                })
            });

            detail.nodes = nodes;
            AdminTreeApi.setCurrentTreeDetail(detail);
            renderTreeNodes(nodes);
            selectTreeNode(index);
            alert('노드가 저장되었습니다.');
        } catch (e) {
            console.error('노드 저장 오류:', e);
            alert('노드 저장 중 오류가 발생했습니다: ' + e.message);
        } finally {
            AdminTreeNodeEditor.setSaveButtonState(false);
        }
    }

    window.AdminTree = {
        initTreeManager,
        loadTreeList,
        applyTreeFiltersAndRender,
        loadTreeDetail,
        renderTreeNodes,
        setupTreeNodeEditor,
        selectTreeNode,
        requestAiDescriptionForCurrentNode,
        saveCurrentNodeEdits
    };
    window.initTreeManager = initTreeManager;
})();