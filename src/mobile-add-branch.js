/**
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * Relovetree Mobile Add Branch
 */
(function () {
    var F = window.FlowShared;
    var currentUser = null;
    var treeId = '';
    var treeData = null;
    var selectedNodeId = null;

    function init() {
        treeId = F.getQueryParam('treeId');

        if (!treeId) {
            window.location.href = '/pages/my-trees.html';
            return;
        }

        F.requireAuth(function (user) {
            currentUser = user;
            loadTree();
            bindEvents();
        });
    }

    function loadTree() {
        F.loadTree(treeId).then(function (data) {
            document.getElementById('loading-area').style.display = 'none';

            if (!data || !(data.nodes || []).length) {
                window.location.href = '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId);
                return;
            }

            treeData = data;
            document.getElementById('branch-list').style.display = 'block';
            document.getElementById('branch-footer').style.display = 'block';
            renderNodeCards(data);
        });
    }

    function renderNodeCards(data) {
        var nodes = data.nodes || [];
        var edges = data.edges || [];
        var container = document.getElementById('node-cards');
        container.innerHTML = '';

        var root = F.getRootNode(data);
        if (!root) return;

        var ordered = traverseBFS(data, root.id);

        ordered.forEach(function (node, index) {
            var card = document.createElement('div');
            card.className = 'branch-node-card';
            card.setAttribute('data-node-id', node.id);
            card.style.cssText = 'position:relative;z-index:10;margin:0 auto 24px;max-width:300px;background:white;border-radius:16px;padding:12px;box-shadow:var(--shadow-soft);border:2px solid var(--color-border);cursor:pointer;transition:border-color 0.2s;';

            var thumbUrl = node.videoId ? F.getYouTubeThumb(node.videoId) : '';
            var emotionLabel = '';
            if (node.moments && node.moments.length > 0) {
                emotionLabel = F.feelingToTag(node.moments[0].feeling);
            }

            card.innerHTML =
                '<div style="display:flex;gap:12px;align-items:center;">' +
                    (thumbUrl ?
                        '<img src="' + thumbUrl + '" style="width:56px;height:56px;border-radius:10px;object-fit:cover;">' :
                        '<div style="width:56px;height:56px;border-radius:10px;background:var(--color-bg-surface);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">🌱</div>'
                    ) +
                    '<div style="flex:1;min-width:0;">' +
                        '<h4 style="font-size:0.9rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(node.title || '이름 없는 순간') + '</h4>' +
                        '<p style="font-size:0.75rem;color:var(--color-text-muted);">' + F.formatKoreanDate(node.date) + (emotionLabel ? ' · #' + emotionLabel : '') + '</p>' +
                    '</div>' +
                '</div>';

            card.addEventListener('click', function () {
                document.querySelectorAll('.branch-node-card').forEach(function (c) {
                    c.style.borderColor = 'var(--color-border)';
                });
                card.style.borderColor = 'var(--color-primary-brick)';
                selectedNodeId = node.id;
                document.getElementById('btn-connect').disabled = false;
            });

            container.appendChild(card);
        });

        var placeholder = document.createElement('div');
        placeholder.style.cssText = 'max-width:300px;margin:0 auto 80px;padding:20px;border:2.5px dashed var(--color-primary-brick);background:rgba(255,255,255,0.8);border-radius:16px;text-align:center;';
        placeholder.innerHTML = '<span style="font-size:1.5rem;color:var(--color-primary-brick);display:block;margin-bottom:4px;">+</span><p style="font-size:0.85rem;color:var(--color-primary-brick);font-weight:700;">새 순간이 여기에 연결됩니다</p>';
        container.appendChild(placeholder);
    }

    function traverseBFS(data, startId) {
        var result = [];
        var visited = new Set();
        var queue = [startId];

        while (queue.length > 0) {
            var currentId = queue.shift();
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            var node = (data.nodes || []).find(function (n) { return n.id === currentId; });
            if (node) {
                result.push(node);
                var children = F.getChildrenOf(data, currentId);
                children.forEach(function (c) { queue.push(c.id); });
            }
        }

        (data.nodes || []).forEach(function (n) {
            if (!visited.has(n.id)) result.push(n);
        });

        return result;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function bindEvents() {
        document.getElementById('btn-back').addEventListener('click', function () {
            window.location.href = '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId);
        });

        document.getElementById('btn-connect').addEventListener('click', function () {
            if (selectedNodeId === null) return;
            window.location.href = '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId) + '&parentId=' + encodeURIComponent(selectedNodeId);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
