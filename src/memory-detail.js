/**
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * Lovetree Memory Detail View
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
        if (!container) return;
        container.innerHTML = '';

        if (currentNode.emotionTag) {
            var tag = document.createElement('span');
            tag.className = 'mem-tag-v3';
            tag.textContent = currentNode.emotionTag;
            container.appendChild(tag);
        } else if (currentNode.moments && currentNode.moments.length > 0) {
            currentNode.moments.forEach(function (m) {
                var tag = document.createElement('span');
                tag.className = 'mem-tag-v3';
                var label = F.feelingToTag(m.feeling);
                var emoji = F.getEmotionEmoji(m.feeling);
                tag.textContent = (emoji ? emoji + ' ' : '') + label;
                container.appendChild(tag);
            });
        }
    }

    function renderMemo() {
        var memoCard = document.getElementById('memo-card');
        var memoEl = document.getElementById('detail-memo');
        if (!memoCard || !memoEl) return;
        
        var memoText = currentNode.memo || currentNode.description || '';

        if (!memoText && currentNode.moments && currentNode.moments.length > 0) {
            var allTexts = currentNode.moments
                .map(function (m) { return m.text; })
                .filter(function (t) { return t && t.trim(); });
            memoText = allTexts.join('\n');
        }

        if (memoText) {
            memoEl.textContent = memoText;
        } else {
            memoEl.textContent = '기록된 감정 메모가 없습니다.';
        }
    }

    function renderConnected() {
        var container = document.getElementById('connected-list');
        if (!container) return;
        container.innerHTML = '';

        var connected = F.getConnectedNodes(treeData, currentNode.id);

        if (connected.length === 0) {
            container.innerHTML = '<p style="font-size:0.85rem;color:#64748b;padding:20px;">이어진 다른 기억이 아직 없습니다.</p>';
            return;
        }

        connected.forEach(function (node) {
            var item = document.createElement('a');
            item.href = 'javascript:void(0)';
            item.className = 'rel-item-v3';

            var thumbUrl = node.videoId ? F.getYouTubeThumb(node.videoId) : '';

            item.innerHTML =
                '<div class="rel-thumb-v3">' +
                (thumbUrl ? '<img src="' + thumbUrl + '" style="width:100%;height:100%;object-fit:cover;">' : '🌱') +
                '</div>' +
                '<div class="rel-text-v3">' +
                '    <h5>' + escapeHtml(node.title || '이전/다음 기억') + '</h5>' +
                '    <span>' + F.formatKoreanDate(node.date) + '</span>' +
                '</div>';

            item.addEventListener('click', function () {
                window.location.href = '/pages/memory-detail.html?treeId=' + encodeURIComponent(treeId) + '&nodeId=' + encodeURIComponent(node.id);
            });

            container.appendChild(item);
        });
    }

    function timeToSeconds(timeString) {
        if (!timeString) return 0;
        if (typeof timeString === 'number') return timeString;
        var parts = String(timeString).split(':').map(Number);
        if (parts.length === 1) return parts[0];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function bindEvents() {
        var btnBack = document.getElementById('btn-back');
        if (btnBack) {
            btnBack.addEventListener('click', function () {
                window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);
            });
        }

        var btnEdit = document.getElementById('footer-edit');
        if (btnEdit) {
            btnEdit.addEventListener('click', function () {
                window.location.href = '/pages/mobile-add-memory.html?treeId=' + encodeURIComponent(treeId) + '&editNodeId=' + encodeURIComponent(nodeId);
            });
        }

        var btnShare = document.getElementById('footer-share');
        if (btnShare) {
            btnShare.addEventListener('click', function () {
                var url = window.location.href;
                if (navigator.share) {
                    navigator.share({ title: (currentNode ? currentNode.title : '러브트리 기억'), url: url }).catch(function () {});
                } else {
                    navigator.clipboard.writeText(url).then(function () {
                        alert('링크가 복사되었습니다');
                    });
                }
            });
        }
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
