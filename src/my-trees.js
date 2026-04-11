/**
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * Relovetree My Trees Dashboard
 */
(function () {
    var F = window.FlowShared;
    var currentUser = null;

    function init() {
        F.requireAuth(function (user) {
            currentUser = user;
            showUserAvatar(user);
            loadTrees();
        });
    }

    function showUserAvatar(user) {
        var img = document.getElementById('user-avatar');
        if (img && user.photoURL) {
            img.src = user.photoURL;
            img.style.display = 'block';
        }
    }

    function loadTrees() {
        F.loadUserTrees(currentUser).then(function (trees) {
            document.getElementById('loading-area').style.display = 'none';
            document.getElementById('content-area').style.display = 'block';

            if (!trees || trees.length === 0) {
                document.getElementById('empty-state').style.display = 'block';
                document.getElementById('tree-list').style.display = 'none';
            } else {
                document.getElementById('empty-state').style.display = 'none';
                document.getElementById('tree-list').style.display = 'block';
                renderTreeList(trees);
            }
        }).catch(function (err) {
            console.error('Failed to load trees:', err);
            document.getElementById('loading-area').style.display = 'none';
            document.getElementById('content-area').style.display = 'block';
            document.getElementById('empty-state').style.display = 'block';
        });
    }

    function renderTreeList(trees) {
        var list = document.getElementById('tree-list');
        list.innerHTML = '';

        trees.forEach(function (tree) {
            var nodeCount = (tree.nodes || []).length;
            var lastUpdated = tree.lastUpdated || tree.updatedAt || '';
            var dateStr = F.formatKoreanDate(lastUpdated);

            var card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'margin-bottom:16px;overflow:hidden;cursor:pointer;';

            var firstThumb = '';
            var nodes = tree.nodes || [];
            if (nodes.length > 0 && nodes[0].videoId) {
                firstThumb = F.getYouTubeThumb(nodes[0].videoId);
            }

            card.innerHTML =
                '<div style="padding:20px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:start;">' +
                        '<div>' +
                            '<h3 style="font-size:1.1rem;font-weight:800;margin-bottom:4px;">' + escapeHtml(tree.name || '이름 없는 트리') + '</h3>' +
                            '<p style="font-size:0.8rem;color:var(--color-text-muted);">' + dateStr + '</p>' +
                        '</div>' +
                        '<span style="font-size:0.8rem;font-weight:700;padding:3px 10px;border-radius:20px;background:' + (tree.visibility === 'public' ? '#4a5a6a' : '#b0bec5') + ';color:white;">' + (tree.visibility === 'public' ? 'Public' : 'Private') + '</span>' +
                    '</div>' +
                    '<div style="margin-top:12px;display:flex;align-items:center;gap:8px;">' +
                        (firstThumb ? '<img src="' + firstThumb + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;">' : '<div style="width:48px;height:48px;border-radius:8px;background:var(--color-bg-surface);display:flex;align-items:center;justify-content:center;">🌱</div>') +
                        '<div>' +
                            '<p style="font-size:0.9rem;font-weight:700;">' + nodeCount + '개의 순간</p>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--color-border);">' +
                    '<button class="tree-action-btn" data-action="add" data-tree-id="' + tree._id + '" style="padding:14px;font-size:0.85rem;font-weight:700;border:none;background:white;color:var(--color-primary-brick);cursor:pointer;border-bottom-left-radius:20px;">✏️ 순간 추가</button>' +
                    '<button class="tree-action-btn" data-action="view" data-tree-id="' + tree._id + '" style="padding:14px;font-size:0.85rem;font-weight:700;border:none;background:white;color:var(--color-text-sub);cursor:pointer;border-bottom-right-radius:20px;border-left:1px solid var(--color-border);">🌳 트리 보기</button>' +
                '</div>';

            list.appendChild(card);
        });

        list.addEventListener('click', function (e) {
            var btn = e.target.closest('.tree-action-btn');
            if (!btn) return;
            var action = btn.getAttribute('data-action');
            var treeId = btn.getAttribute('data-tree-id');
            if (action === 'add') {
                window.location.href = '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId);
            } else if (action === 'view') {
                window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);
            }
        });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showNewTreeModal() {
        var modal = document.getElementById('new-tree-modal');
        modal.style.display = 'flex';
        document.getElementById('new-tree-name').value = '';
        document.getElementById('new-tree-name').focus();
    }

    function hideNewTreeModal() {
        document.getElementById('new-tree-modal').style.display = 'none';
    }

    function createNewTree() {
        var nameInput = document.getElementById('new-tree-name');
        var name = (nameInput.value || '').trim() || '나의 러브트리';

        var btn = document.getElementById('btn-create-tree');
        btn.disabled = true;
        btn.textContent = '만드는 중...';

        F.createTree(currentUser, name).then(function (docRef) {
            hideNewTreeModal();
            var treeId = docRef.id || docRef;
            window.location.href = '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId) + '&isNew=1';
        }).catch(function (err) {
            console.error('Failed to create tree:', err);
            btn.disabled = false;
            btn.textContent = '만들기';
            alert('트리 생성에 실패했습니다.');
        });
    }

    document.getElementById('btn-new-tree').addEventListener('click', showNewTreeModal);
    document.getElementById('btn-first-tree').addEventListener('click', showNewTreeModal);
    document.getElementById('btn-cancel-tree').addEventListener('click', hideNewTreeModal);
    document.getElementById('btn-create-tree').addEventListener('click', createNewTree);
    document.getElementById('new-tree-modal').addEventListener('click', function (e) {
        if (e.target === this) hideNewTreeModal();
    });
    document.getElementById('new-tree-name').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') createNewTree();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
