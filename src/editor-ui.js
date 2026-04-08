(function () {
    function runtime() {
        return window.__editorRuntime;
    }

    function applyBackgroundConfig(runtime, config) {
        const body = document.body;
        if (!body || !config) return;

        if (config.type === 'image' && config.value) {
            body.style.backgroundImage = "url('" + config.value + "')";
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
            body.style.backgroundRepeat = 'no-repeat';
            body.style.backgroundColor = '';
        } else if (config.type === 'color' && config.value) {
            body.style.backgroundImage = '';
            body.style.backgroundColor = config.value;
        }
    }

    function loadBackgroundPreference(runtime) {
        const saved = typeof safeLocalStorageGet === 'function'
            ? safeLocalStorageGet(runtime.BG_STORAGE_KEY, null)
            : null;
        if (saved && (saved.type === 'image' || saved.type === 'color')) {
            applyBackgroundConfig(runtime, saved);
        }
    }

    function updateTreeStatsBanner(runtime) {
        const banner = document.getElementById('tree-stats-banner');
        const textEl = document.getElementById('tree-stats-text');
        if (!banner || !textEl) return;

        const nodeCount = Array.isArray(runtime.state.nodes) ? runtime.state.nodes.length : 0;

        let momentsTotal = 0;
        if (Array.isArray(runtime.state.nodes)) {
            runtime.state.nodes.forEach(function (node) {
                if (Array.isArray(node.moments)) {
                    momentsTotal += node.moments.length;
                }
            });
        }

        const likeCount = Array.isArray(runtime.state.likes) ? runtime.state.likes.length : 0;
        const viewCount = (window.treeStats && typeof window.treeStats.viewCount === 'number')
            ? window.treeStats.viewCount
            : 0;
        const shareCount = (window.treeStats && typeof window.treeStats.shareCount === 'number')
            ? window.treeStats.shareCount
            : 0;

        textEl.textContent = '노드 ' + nodeCount +
            ' · 순간 ' + momentsTotal +
            ' · 조회 ' + viewCount +
            ' · 좋아요 ' + likeCount +
            ' · 공유 ' + shareCount;
    }

    function showToast(runtime, message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm opacity-0 transition-opacity duration-300 z-50';
        toast.innerText = message;
        document.body.appendChild(toast);
        requestAnimationFrame(function () {
            toast.classList.remove('opacity-0');
        });
        setTimeout(function () {
            toast.classList.add('opacity-0');
            setTimeout(function () {
                toast.remove();
            }, 300);
        }, 2000);
    }

    function setEditorMode(runtime, mode) {
        if (mode !== 'tree' && mode !== 'timeline') return;
        runtime.editorMode = mode;

        const bodyEl = document.body;
        if (bodyEl) {
            if (mode === 'timeline') {
                bodyEl.classList.add('editor-timeline');
            } else {
                bodyEl.classList.remove('editor-timeline');
            }
        }

        if (window.EditorHeaderHelpers && typeof window.EditorHeaderHelpers.syncModeButtons === 'function') {
            window.EditorHeaderHelpers.syncModeButtons(runtime);
        }

        runtime.render();
    }

    window.EditorUiHelpers = {
        applyBackgroundConfig: applyBackgroundConfig,
        loadBackgroundPreference: loadBackgroundPreference,
        updateTreeStatsBanner: updateTreeStatsBanner,
        showToast: showToast,
        setEditorMode: setEditorMode
    };
    window.setEditorMode = function (mode) {
        return setEditorMode(runtime(), mode);
    };
    window.applyBackgroundConfig = function (config) {
        return applyBackgroundConfig(runtime(), config);
    };
    window.loadBackgroundPreference = function () {
        return loadBackgroundPreference(runtime());
    };
    window.updateTreeStatsBanner = function () {
        return updateTreeStatsBanner(runtime());
    };
    window.showToast = function (message) {
        return showToast(runtime(), message);
    };
})();
