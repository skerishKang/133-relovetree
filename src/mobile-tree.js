/**
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * Lovetree Mobile Tree View
 */
(function () {
    var F = window.FlowShared;
    var currentUser = null;
    var treeId = '';
    var treeData = null;

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

            if (!data) {
                alert('트리를 찾을 수 없습니다.');
                window.location.href = '/pages/my-trees.html';
                return;
            }

            treeData = data;
            document.getElementById('tree-title').textContent = data.name || '러브트리';

            var nodes = data.nodes || [];
            if (nodes.length === 0) {
                document.getElementById('tree-empty').style.display = 'block';
                document.getElementById('tree-view').style.display = 'none';
            } else {
                document.getElementById('tree-empty').style.display = 'none';
                document.getElementById('tree-view').style.display = 'block';
                document.getElementById('tree-subtitle').textContent = nodes.length + '개의 순간이 이어져 있습니다';
                renderNodeList(data);
            }
        });
    }

    function renderNodeList(data) {
        var nodes = data.nodes || [];
        var container = document.getElementById('node-list');
        container.innerHTML = '<div id="center-line" style="position:absolute;left:50%;top:16px;bottom:100px;width:2px;background:var(--color-border);transform:translateX(-50%);z-index:1;"></div>';

        var root = F.getRootNode(data);
        var ordered = root ? traverseBFS(data, root.id) : nodes;

        ordered.forEach(function (node, index) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:' + (index % 2 === 0 ? 'flex-start' : 'flex-end') + ';position:relative;z-index:2;margin-bottom:24px;';

            var card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'width:calc(50% - 16px);padding:10px;cursor:pointer;overflow:hidden;';

            var thumbUrl = node.videoId ? F.getYouTubeThumb(node.videoId) : '';
            var emotionLabel = '';
            if (node.moments && node.moments.length > 0) {
                emotionLabel = F.feelingToTag(node.moments[0].feeling);
            }

            card.innerHTML =
                (thumbUrl ?
                    '<img src="' + thumbUrl + '" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;margin-bottom:8px;">' :
                    '<div style="width:100%;aspect-ratio:16/9;border-radius:10px;background:var(--color-bg-surface);display:flex;align-items:center;justify-content:center;margin-bottom:8px;">🌱</div>'
                ) +
                '<h4 style="font-size:0.85rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">' + escapeHtml(node.title || '순간') + '</h4>' +
                '<span style="font-size:0.72rem;color:var(--color-text-muted);">' + F.formatKoreanDate(node.date) + '</span>' +
                (emotionLabel ? '<div style="margin-top:4px;"><span style="font-size:0.7rem;background:rgba(181,110,110,0.1);color:var(--color-primary-brick);padding:2px 8px;border-radius:4px;font-weight:700;">#' + emotionLabel + '</span></div>' : '');

            card.addEventListener('click', function () {
                window.location.href = '/pages/memory-detail.html?treeId=' + encodeURIComponent(treeId) + '&nodeId=' + encodeURIComponent(node.id);
            });

            row.appendChild(card);
            container.appendChild(row);
        });
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

    function getAddMemoryUrl() {
        return '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId);
    }

    function bindEvents() {
        document.getElementById('btn-add').addEventListener('click', function () {
            window.location.href = getAddMemoryUrl();
        });

        document.getElementById('btn-first-memory').addEventListener('click', function () {
            window.location.href = getAddMemoryUrl();
        });

        document.getElementById('nav-add').addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = getAddMemoryUrl();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
