/**
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * Relovetree Memory Detail View
 */
(function () {
    var F = window.FlowShared;
    var currentUser = null;
    var treeId = '';
    var nodeId = '';
    var treeData = null;
    var currentNode = null;

    function init() {
        treeId = F.getQueryParam('treeId');
        nodeId = F.getQueryParam('nodeId');

        if (!treeId || !nodeId) {
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
            var parsedNodeId = parseInt(nodeId, 10) || nodeId;
            currentNode = (data.nodes || []).find(function (n) { return n.id === parsedNodeId; });

            if (!currentNode) {
                alert('순간을 찾을 수 없습니다.');
                window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);
                return;
            }

            renderDetail();
        });
    }

    function renderDetail() {
        document.getElementById('detail-content').style.display = 'block';

        renderVideo();
        renderTitle();
        renderTags();
        renderMemo();
        renderConnected();
    }

    function renderVideo() {
        var videoArea = document.getElementById('video-area');
        var videoId = currentNode.videoId || '';
        var sourceUrl = currentNode.sourceUrl || '';

        if (videoId) {
            var timestamp = '';
            if (currentNode.moments && currentNode.moments.length > 0 && currentNode.moments[0].time) {
                var secs = timeToSeconds(currentNode.moments[0].time);
                if (secs > 0) timestamp = '&start=' + secs;
            }
            videoArea.innerHTML = '<iframe src="https://www.youtube.com/embed/' + videoId + '?playsinline=1&rel=0' + timestamp + '" allowfullscreen style="width:100%;height:100%;border:none;border-radius:16px;"></iframe>';
        } else if (sourceUrl) {
            videoArea.innerHTML = '<a href="' + escapeHtml(sourceUrl) + '" target="_blank" rel="noopener" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--color-bg-surface);border-radius:16px;text-decoration:none;color:var(--color-text-muted);"><div style="text-align:center;"><span style="font-size:2rem;">🔗</span><p style="font-size:0.9rem;font-weight:700;margin-top:8px;">영상 보러가기</p></div></a>';
        } else {
            videoArea.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--color-bg-surface);border-radius:16px;color:var(--color-text-muted);"><div style="text-align:center;"><span style="font-size:2rem;">🌱</span><p style="font-size:0.9rem;margin-top:8px;">영상 없음</p></div></div>';
        }
    }

    function renderTitle() {
        document.getElementById('detail-title').textContent = currentNode.title || '이름 없는 순간';
        document.getElementById('detail-date').textContent = F.formatKoreanDate(currentNode.date);
    }

    function renderTags() {
        var container = document.getElementById('detail-tags');
        container.innerHTML = '';

        if (currentNode.moments && currentNode.moments.length > 0) {
            currentNode.moments.forEach(function (m) {
                var tag = document.createElement('span');
                tag.style.cssText = 'background:rgba(181,110,110,0.1);color:var(--color-text-sub);padding:4px 12px;border-radius:12px;font-size:0.8rem;font-weight:700;';
                var label = F.feelingToTag(m.feeling);
                var emoji = F.getEmotionEmoji(m.feeling);
                tag.textContent = (emoji ? emoji + ' ' : '') + label;
                container.appendChild(tag);
            });
        }
    }

    function renderMemo() {
        var memoCard = document.getElementById('memo-card');
        var memoText = '';

        if (currentNode.description) {
            memoText = currentNode.description;
        } else if (currentNode.moments && currentNode.moments.length > 0) {
            var allTexts = currentNode.moments
                .map(function (m) { return m.text; })
                .filter(function (t) { return t && t.trim(); });
            memoText = allTexts.join('\n');
        }

        if (memoText) {
            memoCard.style.display = 'block';
            document.getElementById('detail-memo').textContent = memoText;
        }
    }

    function renderConnected() {
        var container = document.getElementById('connected-list');
        container.innerHTML = '';

        var connected = F.getConnectedNodes(treeData, currentNode.id);

        if (connected.length === 0) {
            var empty = document.createElement('p');
            empty.style.cssText = 'font-size:0.85rem;color:var(--color-text-muted);';
            empty.textContent = '아직 연결된 순간이 없습니다';
            container.appendChild(empty);
            return;
        }

        connected.forEach(function (node) {
            var item = document.createElement('div');
            item.className = 'card';
            item.style.cssText = 'min-width:180px;padding:8px;display:flex;gap:12px;align-items:center;cursor:pointer;';

            var thumbUrl = node.videoId ? F.getYouTubeThumb(node.videoId) : '';

            item.innerHTML =
                (thumbUrl ?
                    '<img src="' + thumbUrl + '" style="width:44px;height:44px;border-radius:8px;object-fit:cover;">' :
                    '<div style="width:44px;height:44px;border-radius:8px;background:var(--color-bg-surface);display:flex;align-items:center;justify-content:center;">🌱</div>'
                ) +
                '<div>' +
                    '<h5 style="font-size:0.8rem;font-weight:700;margin-bottom:2px;">' + escapeHtml(node.title || '순간') + '</h5>' +
                    '<p style="font-size:0.7rem;color:var(--color-text-muted);">' + F.formatKoreanDate(node.date) + '</p>' +
                '</div>';

            item.addEventListener('click', function () {
                window.location.href = '/pages/memory-detail.html?treeId=' + encodeURIComponent(treeId) + '&nodeId=' + encodeURIComponent(node.id);
            });

            container.appendChild(item);
        });
    }

    function timeToSeconds(timeString) {
        if (!timeString) return 0;
        var parts = timeString.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function bindEvents() {
        document.getElementById('btn-back').addEventListener('click', function () {
            window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);
        });

        document.getElementById('footer-edit').addEventListener('click', function () {
            window.location.href = '/pages/editor.html?id=' + encodeURIComponent(treeId);
        });

        document.getElementById('footer-share').addEventListener('click', function () {
            var url = window.location.origin + '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);
            if (navigator.share) {
                navigator.share({ title: treeData ? treeData.name : '러브트리', url: url }).catch(function () {});
            } else {
                navigator.clipboard.writeText(url).then(function () {
                    showToast('링크가 복사되었습니다');
                });
            }
        });
    }

    function showToast(msg) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add('show');
        });
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 300);
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
