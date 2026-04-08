(function () {
    const NODE_EDITOR_IDS = {
        id: 'treeNodeIdDisplay',
        title: 'treeNodeTitleInput',
        date: 'treeNodeDateInput',
        video: 'treeNodeVideoInput',
        description: 'treeNodeDescriptionInput',
        hint: 'treeNodeEditorHint'
    };

    function getNodeEditorElements() {
        return {
            id: document.getElementById(NODE_EDITOR_IDS.id),
            title: document.getElementById(NODE_EDITOR_IDS.title),
            date: document.getElementById(NODE_EDITOR_IDS.date),
            video: document.getElementById(NODE_EDITOR_IDS.video),
            description: document.getElementById(NODE_EDITOR_IDS.description),
            hint: document.getElementById(NODE_EDITOR_IDS.hint)
        };
    }

    function resetNodeEditor() {
        const els = getNodeEditorElements();
        
        if (els.id) els.id.value = '';
        if (els.title) els.title.value = '';
        if (els.date) els.date.value = '';
        if (els.video) els.video.value = '';
        if (els.description) els.description.value = '';
        if (els.hint) {
            els.hint.textContent = '왼쪽 노드 목록에서 노드를 선택하면 여기에서 수정할 수 있습니다.';
        }
    }

    function fillNodeEditor(node) {
        const els = getNodeEditorElements();

        if (els.id) els.id.value = node.id != null ? String(node.id) : '';
        if (els.title) els.title.value = node.title || '';
        if (els.date) els.date.value = node.date || '';
        if (els.video) els.video.value = node.videoId || '';
        if (els.description) els.description.value = node.description || '';
        if (els.hint) {
            els.hint.textContent = '선택된 노드 ID: ' + (node.id != null ? String(node.id) : '');
        }
    }

    function getNodeEditorValues() {
        const els = getNodeEditorElements();
        return {
            title: els.title ? els.title.value.trim() : '',
            date: els.date ? els.date.value.trim() : '',
            videoId: els.video ? els.video.value.trim() : '',
            description: els.description ? els.description.value.trim() : ''
        };
    }

    function buildNodeFromEditor(existingNode) {
        const values = getNodeEditorValues();
        const node = { ...(existingNode || {}) };

        if (values.title) {
            node.title = values.title;
        } else {
            delete node.title;
        }

        node.date = values.date || '';
        node.videoId = values.videoId || '';
        node.description = values.description || '';

        return node;
    }

    function highlightSelectedNodeRow(index) {
        const tbody = document.getElementById('treeNodesTable');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach((tr) => {
            tr.classList.remove('bg-blue-50');
        });
        const selectedRow = tbody.querySelector('tr[data-node-index="' + index + '"]');
        if (selectedRow) {
            selectedRow.classList.add('bg-blue-50');
        }
    }

    function getButtons() {
        return {
            save: document.getElementById('treeNodeSaveBtn'),
            reset: document.getElementById('treeNodeResetBtn'),
            ai: document.getElementById('treeNodeAiBtn')
        };
    }

    function setSaveButtonState(saving) {
        const btn = getButtons().save;
        if (!btn) return;
        
        if (saving) {
            btn.disabled = true;
            btn.textContent = '저장 중...';
        } else {
            btn.disabled = false;
            btn.textContent = '변경 내용 저장';
        }
    }

    function setAiButtonState(generating) {
        const btn = getButtons().ai;
        if (!btn) return;

        if (generating) {
            btn.disabled = true;
            btn.textContent = 'AI 생성 중...';
        } else {
            btn.disabled = false;
            btn.textContent = 'AI로 설명 채우기';
        }
    }

    window.AdminTreeNodeEditor = {
        getNodeEditorElements,
        resetNodeEditor,
        fillNodeEditor,
        getNodeEditorValues,
        buildNodeFromEditor,
        highlightSelectedNodeRow,
        getButtons,
        setSaveButtonState,
        setAiButtonState
    };
})();