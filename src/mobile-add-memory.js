/**
 * Auth: Firebase / Data: Neon Postgres via compat layer
 * Relovetree Mobile Add Memory
 */
(function () {
    var F = window.FlowShared;
    var currentUser = null;
    var treeId = '';
    var treeData = null;
    var selectedEmotionTag = '';
    var selectedParentId = null;
    var isNewTree = false;

    function init() {
        treeId = F.getQueryParam('treeId');
        isNewTree = F.getQueryParam('isNew') === '1';
        var parentIdParam = F.getQueryParam('parentId');
        if (parentIdParam) {
            selectedParentId = parseInt(parentIdParam, 10) || parentIdParam;
        }

        if (!treeId) {
            window.location.href = '/pages/my-trees.html';
            return;
        }

        F.requireAuth(function (user) {
            currentUser = user;
            initDateInput();
            renderEmotionTags();
            loadTree();
            bindEvents();
        });
    }

    function initDateInput() {
        var dateInput = document.getElementById('input-date');
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    function renderEmotionTags() {
        var container = document.getElementById('emotion-tags');
        var tags = F.getEmotionTags();
        container.innerHTML = '';
        tags.forEach(function (tag) {
            var pill = document.createElement('button');
            pill.className = 'tag-pill';
            pill.setAttribute('data-tag-id', tag.id);
            pill.textContent = tag.emoji + ' ' + tag.label;
            pill.addEventListener('click', function () {
                document.querySelectorAll('.tag-pill').forEach(function (p) { p.classList.remove('active'); });
                pill.classList.add('active');
                selectedEmotionTag = tag.id;
                validateForm();
            });
            container.appendChild(pill);
        });
    }

    function loadTree() {
        F.loadTree(treeId).then(function (data) {
            if (!data) {
                alert('트리를 찾을 수 없습니다.');
                window.location.href = '/pages/my-trees.html';
                return;
            }
            treeData = data;
            onTreeLoaded();
        }).catch(function (err) {
            console.error('Failed to load tree:', err);
        });
    }

    function onTreeLoaded() {
        var nodes = treeData.nodes || [];
        var connSection = document.getElementById('connection-section');

        if (nodes.length === 0) {
            selectedParentId = null;
            document.getElementById('connection-label').textContent = '첫 번째 순간 (루트)';
            connSection.style.display = 'block';
            document.getElementById('btn-select-connection').disabled = true;
        } else {
            connSection.style.display = 'block';
            if (selectedParentId !== null) {
                var parentNode = nodes.find(function (n) { return n.id === selectedParentId; });
                if (parentNode) {
                    document.getElementById('connection-label').textContent = '"' + (parentNode.title || '이전 순간') + '" 뒤에 연결';
                }
            }
        }
    }

    function bindEvents() {
        document.getElementById('btn-back').addEventListener('click', function () {
            if (treeId) {
                window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);
            } else {
                window.location.href = '/pages/my-trees.html';
            }
        });

        var urlInput = document.getElementById('input-url');
        var debounceTimer = null;
        urlInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                updateVideoPreview(urlInput.value);
                validateForm();
            }, 500);
        });

        ['input-title', 'input-memo', 'input-timestamp', 'input-date'].forEach(function (id) {
            document.getElementById(id).addEventListener('input', validateForm);
        });

        document.getElementById('btn-select-connection').addEventListener('click', function () {
            if (!treeData || !(treeData.nodes || []).length) return;
            window.location.href = '/pages/mobile-add-branch.html?treeId=' + encodeURIComponent(treeId);
        });

        document.getElementById('btn-submit').addEventListener('click', submitMemory);
    }

    function updateVideoPreview(url) {
        var previewEl = document.getElementById('video-preview');
        var videoId = F.parseYouTubeId(url);

        if (videoId) {
            previewEl.style.display = 'block';
            previewEl.innerHTML = '<iframe src="https://www.youtube.com/embed/' + videoId + '?playsinline=1&rel=0" allowfullscreen allow="autoplay"></iframe>';
        } else if (url.trim()) {
            previewEl.style.display = 'block';
            previewEl.innerHTML = '<div class="preview-placeholder"><span>🔗</span><p>영상 미리보기</p></div>';
        } else {
            previewEl.style.display = 'none';
        }
    }

    function validateForm() {
        var url = document.getElementById('input-url').value.trim();
        var title = document.getElementById('input-title').value.trim();
        var btn = document.getElementById('btn-submit');

        var valid = url.length > 0 && title.length > 0;
        btn.disabled = !valid;
        return valid;
    }

    function submitMemory() {
        if (!validateForm()) return;

        var url = document.getElementById('input-url').value.trim();
        var title = document.getElementById('input-title').value.trim();
        var date = document.getElementById('input-date').value;
        var timestamp = document.getElementById('input-timestamp').value.trim();
        var memo = document.getElementById('input-memo').value.trim();
        var videoId = F.parseYouTubeId(url);

        var memoryData = {
            sourceUrl: url,
            videoId: videoId,
            title: title,
            date: date,
            timestamp: timestamp,
            emotionTag: selectedEmotionTag || 'love',
            memo: memo
        };

        var btn = document.getElementById('btn-submit');
        btn.disabled = true;
        btn.textContent = '저장 중...';

        F.addMemoryToTree(treeId, treeData, selectedParentId, memoryData).then(function (newNode) {
            showToast('순간이 추가되었습니다!');
            setTimeout(function () {
                window.location.href = '/pages/mobile-tree.html?treeId=' + encodeURIComponent(treeId);
            }, 800);
        }).catch(function (err) {
            console.error('Failed to add memory:', err);
            btn.disabled = false;
            btn.textContent = '러브트리에 추가';
            alert('저장에 실패했습니다: ' + err.message);
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
